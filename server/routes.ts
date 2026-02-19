import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { Client } from "ssh2";
import {
  AgentCommandError,
  createAgentCommandSchema,
  createAgentCommandStore,
  type AgentCommandStore,
  listAgentCommandsQuerySchema,
  actorSchema,
  rejectAgentCommandSchema,
  finishAgentCommandSchema,
  updateContextSchema,
  type AgentCommandStoreSetup,
} from "./agent-commands";
import { createAgentCommandWorker } from "./agent-worker";
import { createMemosAutoContextProvider } from "./memos-context";
import { ZodError } from "zod";

let sshConnection: Client | null = null;
let sshReady = false;
let reconnectTimer: NodeJS.Timeout | null = null;

function parseVpsCredentials() {
  const vps = process.env.VPS_VL;
  if (!vps) throw new Error("VPS_VL secret not configured");
  const atIdx = vps.indexOf("@");
  const colonIdx = vps.lastIndexOf(":");
  return {
    username: vps.substring(0, atIdx),
    host: vps.substring(atIdx + 1, colonIdx),
    password: vps.substring(colonIdx + 1),
  };
}

function getDashboardAuth(): string {
  const pwd = process.env.DASHBOARD_PASSWORD || "";
  return Buffer.from(`admin:${pwd}`).toString("base64");
}

function ensureSSHConnection(): Promise<Client> {
  return new Promise((resolve, reject) => {
    if (sshConnection && sshReady) {
      resolve(sshConnection);
      return;
    }

    const creds = parseVpsCredentials();
    const conn = new Client();

    conn.on("ready", () => {
      console.log("[SSH] Connection established");
      sshConnection = conn;
      sshReady = true;
      resolve(conn);
    });

    conn.on("error", (err: Error) => {
      console.error("[SSH] Connection error:", err.message);
      sshReady = false;
      sshConnection = null;
      reject(err);
    });

    conn.on("end", () => {
      console.log("[SSH] Connection ended");
      sshReady = false;
      sshConnection = null;
      scheduleReconnect();
    });

    conn.on("close", () => {
      sshReady = false;
      sshConnection = null;
      scheduleReconnect();
    });

    conn.connect({
      host: creds.host,
      port: 22,
      username: creds.username,
      password: creds.password,
      readyTimeout: 15000,
      keepaliveInterval: 30000,
      keepaliveCountMax: 5,
    });
  });
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    ensureSSHConnection().catch(() => {});
  }, 5000);
}

function proxyToVPS(
  method: string,
  path: string,
  body?: string
): Promise<{ status: number; data: any }> {
  return new Promise(async (resolve, reject) => {
    try {
      const conn = await ensureSSHConnection();
      const port = parseInt(process.env.VPS_API_PORT || "8080", 10);
      const basicAuth = getDashboardAuth();

      conn.forwardOut("127.0.0.1", 0, "127.0.0.1", port, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        let headers =
          `${method} ${path} HTTP/1.1\r\n` +
          `Host: 127.0.0.1:${port}\r\n` +
          `Authorization: Basic ${basicAuth}\r\n` +
          `Accept: application/json\r\n` +
          `Content-Type: application/json\r\n`;

        if (body) {
          const bodyBuf = Buffer.from(body, "utf-8");
          headers += `Content-Length: ${bodyBuf.length}\r\n`;
          headers += `Connection: close\r\n\r\n`;
          stream.write(headers);
          stream.write(bodyBuf);
        } else {
          headers += `Connection: close\r\n\r\n`;
          stream.write(headers);
        }

        const chunks: Buffer[] = [];
        stream.on("data", (chunk: Buffer) => chunks.push(chunk));
        stream.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf-8");
          const splitIdx = raw.indexOf("\r\n\r\n");
          if (splitIdx < 0) {
            reject(new Error("Invalid HTTP response from VPS"));
            return;
          }
          const headerSection = raw.substring(0, splitIdx);
          let responseBody = raw.substring(splitIdx + 4);
          const statusMatch = headerSection.match(/HTTP\/\d\.\d (\d+)/);
          const status = statusMatch ? parseInt(statusMatch[1], 10) : 500;

          const isChunked = /transfer-encoding:\s*chunked/i.test(headerSection);
          if (isChunked) {
            let decoded = "";
            let remaining = responseBody;
            while (remaining.length > 0) {
              const lineEnd = remaining.indexOf("\r\n");
              if (lineEnd < 0) break;
              const sizeHex = remaining.substring(0, lineEnd).trim();
              const chunkSize = parseInt(sizeHex, 16);
              if (isNaN(chunkSize) || chunkSize === 0) break;
              const chunkStart = lineEnd + 2;
              decoded += remaining.substring(chunkStart, chunkStart + chunkSize);
              remaining = remaining.substring(chunkStart + chunkSize + 2);
            }
            responseBody = decoded || responseBody;
          }

          try {
            const data = JSON.parse(responseBody);
            resolve({ status, data });
          } catch {
            resolve({ status, data: { ok: false, error: "Invalid JSON from VPS", raw: responseBody.substring(0, 500) } });
          }
        });

        stream.on("error", (e: Error) => reject(e));

        setTimeout(() => {
          stream.destroy();
          reject(new Error("VPS request timeout"));
        }, 30000);
      });
    } catch (e) {
      reject(e);
    }
  });
}

function sendAgentCommandError(res: Response, error: unknown) {
  if (error instanceof AgentCommandError) {
    res.status(error.statusCode).json({ ok: false, error: error.message });
    return;
  }
  if (error instanceof ZodError) {
    const message = error.issues.map((issue) => issue.message).join("; ");
    res.status(400).json({ ok: false, error: message || "Invalid payload." });
    return;
  }
  res.status(500).json({
    ok: false,
    error: error instanceof Error ? error.message : "Unexpected error",
  });
}

function resolveCommandId(req: Request): string {
  return String(req.params.id || "").trim();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const commandStoreSetup: AgentCommandStoreSetup = await createAgentCommandStore();
  const commandStore: AgentCommandStore = commandStoreSetup.store;
  const memosAutoContext = createMemosAutoContextProvider();
  const commandWorker = createAgentCommandWorker(commandStore, commandStoreSetup.mode);
  commandWorker.start();

  app.get("/api/agent/health", (_req: Request, res: Response) => {
    res.json({
      ok: true,
      data: {
        mode: commandStoreSetup.mode,
        reason: commandStoreSetup.reason || "",
        memos: memosAutoContext.status(),
        worker: commandWorker.status(),
      },
    });
  });

  app.get("/api/agent/worker", (_req: Request, res: Response) => {
    res.json({ ok: true, data: commandWorker.status() });
  });

  app.post("/api/agent/worker/run-once", async (_req: Request, res: Response) => {
    try {
      const data = await commandWorker.runOnce();
      res.json({ ok: true, data });
    } catch (error) {
      sendAgentCommandError(res, error);
    }
  });

  app.get("/api/agent/commands", async (req: Request, res: Response) => {
    try {
      const parsed = listAgentCommandsQuerySchema.parse({
        status: req.query.status,
        limit: req.query.limit,
      });
      const data = await commandStore.list(parsed);
      res.json({ ok: true, data });
    } catch (error) {
      sendAgentCommandError(res, error);
    }
  });

  app.post("/api/agent/commands", async (req: Request, res: Response) => {
    try {
      const payload = createAgentCommandSchema.parse(req.body || {});
      const enriched = await memosAutoContext.enrichCreatePayload(payload);
      const data = await commandStore.create(enriched.payload);
      res.status(201).json({ ok: true, data, meta: { memos: enriched.meta } });
    } catch (error) {
      sendAgentCommandError(res, error);
    }
  });

  app.post("/api/agent/memos/search", async (req: Request, res: Response) => {
    try {
      const query = String(req.body?.query || "").trim();
      if (!query) {
        res.status(400).json({ ok: false, error: "Query is required." });
        return;
      }
      const data = await memosAutoContext.searchToContext(query);
      res.json({ ok: true, data });
    } catch (error) {
      sendAgentCommandError(res, error);
    }
  });

  app.post("/api/agent/commands/:id/confirm", async (req: Request, res: Response) => {
    try {
      const input = actorSchema.parse(req.body || {});
      const data = await commandStore.confirm(resolveCommandId(req), input);
      res.json({ ok: true, data });
    } catch (error) {
      sendAgentCommandError(res, error);
    }
  });

  app.post("/api/agent/commands/:id/reject", async (req: Request, res: Response) => {
    try {
      const input = rejectAgentCommandSchema.parse(req.body || {});
      const data = await commandStore.reject(resolveCommandId(req), input);
      res.json({ ok: true, data });
    } catch (error) {
      sendAgentCommandError(res, error);
    }
  });

  app.post("/api/agent/commands/:id/start", async (req: Request, res: Response) => {
    try {
      const input = actorSchema.parse(req.body || {});
      const data = await commandStore.start(resolveCommandId(req), input);
      res.json({ ok: true, data });
    } catch (error) {
      sendAgentCommandError(res, error);
    }
  });

  app.post("/api/agent/commands/:id/complete", async (req: Request, res: Response) => {
    try {
      const input = finishAgentCommandSchema.parse(req.body || {});
      const data = await commandStore.complete(resolveCommandId(req), input);
      res.json({ ok: true, data });
    } catch (error) {
      sendAgentCommandError(res, error);
    }
  });

  app.post("/api/agent/commands/:id/fail", async (req: Request, res: Response) => {
    try {
      const input = finishAgentCommandSchema.parse(req.body || {});
      const data = await commandStore.fail(resolveCommandId(req), input);
      res.json({ ok: true, data });
    } catch (error) {
      sendAgentCommandError(res, error);
    }
  });

  app.post("/api/agent/commands/:id/context", async (req: Request, res: Response) => {
    try {
      const input = updateContextSchema.parse(req.body || {});
      const data = await commandStore.updateContext(resolveCommandId(req), input);
      res.json({ ok: true, data });
    } catch (error) {
      sendAgentCommandError(res, error);
    }
  });

  const GET_ROUTES = [
    "/api/state",
    "/api/order/catalog",
    "/api/salary/calculate",
    "/api/routines",
    "/api/overrides",
    "/api/journal",
    "/api/reports/daily",
  ];

  const POST_ROUTES = [
    "/api/checklist/complete",
    "/api/tasks/toggle",
    "/api/tasks/add",
    "/api/tasks/update",
    "/api/tasks/delete",
    "/api/ops/toggle",
    "/api/notes/add",
    "/api/draft-schedule/save",
    "/api/draft-schedule/apply-templates",
    "/api/draft-schedule/autofill",
    "/api/schedule-settings/save",
    "/api/employees/save",
    "/api/sync",
    "/api/events/ingest-telegram",
    "/api/task-routines/rollover",
    "/api/day/regenerate",
    "/api/concerts/log-alerts",
    "/api/routines",
    "/api/overrides",
    "/api/supplier-followup/resolve",
    "/api/order/preview",
    "/api/shifts/save",
    "/api/shifts/add-row",
    "/api/shifts/delete-row",
    "/api/grid/assign",
    "/api/grid/cell/save",
  ];

  for (const route of GET_ROUTES) {
    app.get(route, async (req: Request, res: Response) => {
      try {
        const fullPath = req.originalUrl;
        const { status, data } = await proxyToVPS("GET", fullPath);
        res.status(status).json(data);
      } catch (err: any) {
        console.error(`[Proxy] GET ${route} error:`, err.message);
        res.status(502).json({ ok: false, error: "VPS connection failed", details: err.message });
      }
    });
  }

  for (const route of POST_ROUTES) {
    app.post(route, async (req: Request, res: Response) => {
      try {
        const body = JSON.stringify(req.body || {});
        const fullPath = req.originalUrl;
        const { status, data } = await proxyToVPS("POST", fullPath, body);
        res.status(status).json(data);
      } catch (err: any) {
        console.error(`[Proxy] POST ${route} error:`, err.message);
        res.status(502).json({ ok: false, error: "VPS connection failed", details: err.message });
      }
    });
  }

  app.get("/api/health", async (_req: Request, res: Response) => {
    try {
      const { status, data } = await proxyToVPS("GET", "/healthz");
      res.json({ ok: true, vps: data, ssh: sshReady });
    } catch (err: any) {
      res.json({ ok: false, ssh: sshReady, error: err.message });
    }
  });

  ensureSSHConnection().catch((err) => {
    console.error("[SSH] Initial connection failed:", err.message);
  });

  return httpServer;
}
