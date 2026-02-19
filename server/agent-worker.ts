import { execFile } from "child_process";
import { promisify } from "util";
import {
  AgentCommandError,
  type AgentCommandRecord,
  type AgentCommandStore,
  type AgentCommandStoreMode,
  type FinishAgentCommandInput,
} from "./agent-commands";

const execFileAsync = promisify(execFile);

type WorkerRunner = "openclaw" | "noop";
type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high";

interface WorkerConfig {
  enabled: boolean;
  runner: WorkerRunner;
  actor: string;
  intervalMs: number;
  batchSize: number;
  execTimeoutMs: number;
  promptContextChars: number;
  openclawAgent: string;
  openclawThinking: ThinkingLevel;
  openclawLocal: boolean;
  openclawDeliver: boolean;
  openclawTo: string;
  openclawSessionId: string;
  openclawTimeoutSec: number;
}

interface WorkerRunResult {
  ok: boolean;
  result: string;
}

interface WorkerState {
  running: boolean;
  lastRunAt: string;
  lastFinishedAt: string;
  lastSeen: number;
  lastProcessed: number;
  processedTotal: number;
  lastError: string;
}

export interface AgentWorkerStatus {
  storeMode: AgentCommandStoreMode;
  enabled: boolean;
  runner: WorkerRunner;
  actor: string;
  intervalMs: number;
  batchSize: number;
  execTimeoutMs: number;
  promptContextChars: number;
  running: boolean;
  lastRunAt: string;
  lastFinishedAt: string;
  lastSeen: number;
  lastProcessed: number;
  processedTotal: number;
  lastError: string;
  openclaw: {
    agent: string;
    thinking: ThinkingLevel;
    local: boolean;
    deliver: boolean;
    to: string;
    sessionId: string;
    timeoutSec: number;
  };
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (typeof value !== "string") return fallback;
  const clean = value.trim().toLowerCase();
  if (!clean) return fallback;
  return !["0", "false", "off", "no"].includes(clean);
}

function parseIntSafe(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function sliceText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1))}…`;
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function resolveThinking(value: string | undefined): ThinkingLevel {
  const clean = String(value || "").trim().toLowerCase();
  if (clean === "off") return "off";
  if (clean === "minimal") return "minimal";
  if (clean === "medium") return "medium";
  if (clean === "high") return "high";
  return "low";
}

function parseRunner(value: string | undefined): WorkerRunner {
  const clean = String(value || "").trim().toLowerCase();
  if (clean === "noop") return "noop";
  return "openclaw";
}

function buildWorkerConfig(): WorkerConfig {
  return {
    enabled: parseBool(process.env.AGENT_WORKER_ENABLED, false),
    runner: parseRunner(process.env.AGENT_WORKER_RUNNER),
    actor: normalizeString(process.env.AGENT_WORKER_ACTOR || "openclaw-worker") || "openclaw-worker",
    intervalMs: parseIntSafe(process.env.AGENT_WORKER_INTERVAL_MS, 15_000, 1_000, 300_000),
    batchSize: parseIntSafe(process.env.AGENT_WORKER_BATCH_SIZE, 2, 1, 20),
    execTimeoutMs: parseIntSafe(process.env.AGENT_WORKER_EXEC_TIMEOUT_MS, 300_000, 5_000, 1_800_000),
    promptContextChars: parseIntSafe(process.env.AGENT_WORKER_PROMPT_CONTEXT_CHARS, 3_200, 400, 12_000),
    openclawAgent: normalizeString(process.env.AGENT_WORKER_OPENCLAW_AGENT || "main") || "main",
    openclawThinking: resolveThinking(process.env.AGENT_WORKER_OPENCLAW_THINKING),
    openclawLocal: parseBool(process.env.AGENT_WORKER_OPENCLAW_LOCAL, false),
    openclawDeliver: parseBool(process.env.AGENT_WORKER_OPENCLAW_DELIVER, false),
    openclawTo: normalizeString(process.env.AGENT_WORKER_OPENCLAW_TO),
    openclawSessionId: normalizeString(process.env.AGENT_WORKER_OPENCLAW_SESSION_ID || "dashboard-worker"),
    openclawTimeoutSec: parseIntSafe(process.env.AGENT_WORKER_OPENCLAW_TIMEOUT_SEC, 240, 10, 3_600),
  };
}

function buildOpenclawPrompt(command: AgentCommandRecord, contextChars: number): string {
  const chunks: string[] = [];
  chunks.push("Входящая команда из dashboard. Выполни её как агент и верни короткий практичный отчёт.");
  chunks.push(`Команда ID: ${command.id}`);
  chunks.push(`Заголовок: ${command.title}`);
  if (command.details) chunks.push(`Детали:\n${sliceText(command.details, 2000)}`);
  if (command.memosQuery) chunks.push(`MemOS query:\n${sliceText(command.memosQuery, 500)}`);
  if (command.memosContext) {
    chunks.push(`MemOS context:\n${sliceText(command.memosContext, contextChars)}`);
  }
  chunks.push(
    [
      "Формат ответа:",
      "1) Что сделал",
      "2) Результат (конкретно, без воды)",
      "3) Что нужно от пользователя (если нужно)",
    ].join("\n"),
  );
  return chunks.join("\n\n");
}

function buildFailureText(error: unknown): string {
  if (error instanceof Error) {
    return error.message || error.name || "Execution failed.";
  }
  return String(error || "Execution failed.");
}

function parseJsonLoose(raw: string): any | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function summarizeOpenclawOutput(stdout: string): string {
  const parsed = parseJsonLoose(stdout);
  if (!parsed || typeof parsed !== "object") {
    return sliceText(normalizeString(stdout) || "OpenClaw finished without JSON output.", 3800);
  }
  const runId = normalizeString((parsed as any).runId);
  const status = normalizeString((parsed as any).status);
  const summary = normalizeString((parsed as any).summary);
  const payloads = Array.isArray((parsed as any)?.result?.payloads)
    ? (parsed as any).result.payloads
    : [];
  const payloadText = payloads
    .map((item: any) => normalizeString(item?.text))
    .filter(Boolean)
    .join("\n");
  const header = `OpenClaw run ${runId || "n/a"} · status=${status || "n/a"} · summary=${summary || "n/a"}`;
  const body = payloadText || normalizeString(stdout);
  return sliceText(`${header}\n\n${body}`, 3800);
}

async function executeWithOpenclaw(
  command: AgentCommandRecord,
  config: WorkerConfig,
): Promise<WorkerRunResult> {
  const message = buildOpenclawPrompt(command, config.promptContextChars);
  const args = ["agent", "--json", "--agent", config.openclawAgent, "--message", message];

  args.push("--thinking", config.openclawThinking);
  args.push("--timeout", String(config.openclawTimeoutSec));
  if (config.openclawSessionId) args.push("--session-id", config.openclawSessionId);
  if (config.openclawLocal) args.push("--local");
  if (config.openclawDeliver) args.push("--deliver");
  if (config.openclawTo) args.push("--to", config.openclawTo);

  try {
    const { stdout, stderr } = await execFileAsync("openclaw", args, {
      timeout: config.execTimeoutMs,
      maxBuffer: 4 * 1024 * 1024,
      env: process.env,
    });
    if (stderr && stderr.trim()) {
      const withErr = `${summarizeOpenclawOutput(stdout)}\n\nstderr:\n${sliceText(stderr.trim(), 1200)}`;
      return { ok: true, result: sliceText(withErr, 3800) };
    }
    return { ok: true, result: summarizeOpenclawOutput(stdout) };
  } catch (error: any) {
    const stdout = normalizeString(error?.stdout);
    const stderr = normalizeString(error?.stderr);
    const code = normalizeString(String(error?.code ?? error?.signal ?? "unknown"));
    const details = [
      `OpenClaw execution failed: ${code}`,
      stdout ? `stdout:\n${sliceText(stdout, 1400)}` : "",
      stderr ? `stderr:\n${sliceText(stderr, 1400)}` : "",
      error?.killed ? "process killed by timeout" : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    return { ok: false, result: sliceText(details || buildFailureText(error), 3800) };
  }
}

async function executeCommand(command: AgentCommandRecord, config: WorkerConfig): Promise<WorkerRunResult> {
  if (config.runner === "noop") {
    return {
      ok: true,
      result: sliceText(
        `NOOP worker processed command ${command.id} (${command.title}). Set AGENT_WORKER_RUNNER=openclaw for live execution.`,
        3800,
      ),
    };
  }
  return executeWithOpenclaw(command, config);
}

export class AgentCommandWorker {
  private readonly state: WorkerState = {
    running: false,
    lastRunAt: "",
    lastFinishedAt: "",
    lastSeen: 0,
    lastProcessed: 0,
    processedTotal: 0,
    lastError: "",
  };
  private timer: NodeJS.Timeout | null = null;
  private readonly inFlight = new Set<string>();

  constructor(
    private readonly store: AgentCommandStore,
    private readonly mode: AgentCommandStoreMode,
    private readonly config: WorkerConfig,
  ) {}

  start(): void {
    if (!this.config.enabled || this.timer) return;
    void this.runTick();
    this.timer = setInterval(() => {
      void this.runTick();
    }, this.config.intervalMs);
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  async runOnce(): Promise<AgentWorkerStatus> {
    await this.runTick();
    return this.status();
  }

  status(): AgentWorkerStatus {
    return {
      storeMode: this.mode,
      enabled: this.config.enabled,
      runner: this.config.runner,
      actor: this.config.actor,
      intervalMs: this.config.intervalMs,
      batchSize: this.config.batchSize,
      execTimeoutMs: this.config.execTimeoutMs,
      promptContextChars: this.config.promptContextChars,
      running: this.state.running,
      lastRunAt: this.state.lastRunAt,
      lastFinishedAt: this.state.lastFinishedAt,
      lastSeen: this.state.lastSeen,
      lastProcessed: this.state.lastProcessed,
      processedTotal: this.state.processedTotal,
      lastError: this.state.lastError,
      openclaw: {
        agent: this.config.openclawAgent,
        thinking: this.config.openclawThinking,
        local: this.config.openclawLocal,
        deliver: this.config.openclawDeliver,
        to: this.config.openclawTo,
        sessionId: this.config.openclawSessionId,
        timeoutSec: this.config.openclawTimeoutSec,
      },
    };
  }

  private async runTick(): Promise<void> {
    if (!this.config.enabled) return;
    if (this.state.running) return;

    this.state.running = true;
    this.state.lastRunAt = new Date().toISOString();
    this.state.lastError = "";
    this.state.lastSeen = 0;
    this.state.lastProcessed = 0;

    try {
      const queue = await this.store.list({ status: "confirmed", limit: this.config.batchSize });
      queue.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
      this.state.lastSeen = queue.length;

      for (const item of queue) {
        if (this.inFlight.has(item.id)) continue;
        this.inFlight.add(item.id);
        try {
          const processed = await this.processSingle(item);
          if (processed) {
            this.state.lastProcessed += 1;
            this.state.processedTotal += 1;
          }
        } finally {
          this.inFlight.delete(item.id);
        }
      }
    } catch (error: any) {
      this.state.lastError = buildFailureText(error);
    } finally {
      this.state.lastFinishedAt = new Date().toISOString();
      this.state.running = false;
    }
  }

  private async processSingle(item: AgentCommandRecord): Promise<boolean> {
    let started: AgentCommandRecord;
    try {
      started = await this.store.start(item.id, { actor: this.config.actor });
    } catch (error) {
      if (
        error instanceof AgentCommandError &&
        (error.statusCode === 404 || error.statusCode === 409)
      ) {
        return false;
      }
      throw error;
    }

    const executed = await executeCommand(started, this.config);
    if (executed.ok) {
      await this.finishCommand("complete", started.id, {
        actor: this.config.actor,
        result: executed.result,
      });
    } else {
      await this.finishCommand("fail", started.id, {
        actor: this.config.actor,
        result: executed.result,
      });
    }
    return true;
  }

  private async finishCommand(
    kind: "complete" | "fail",
    commandId: string,
    input: FinishAgentCommandInput,
  ): Promise<void> {
    try {
      if (kind === "complete") {
        await this.store.complete(commandId, input);
      } else {
        await this.store.fail(commandId, input);
      }
    } catch (error: any) {
      this.state.lastError = buildFailureText(error);
    }
  }
}

export function createAgentCommandWorker(
  store: AgentCommandStore,
  mode: AgentCommandStoreMode,
): AgentCommandWorker {
  return new AgentCommandWorker(store, mode, buildWorkerConfig());
}
