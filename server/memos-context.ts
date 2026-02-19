import { z } from "zod";
import type { CreateAgentCommandInput } from "./agent-commands";

const memosSearchRequestSchema = z.object({
  query: z.string().trim().min(1).max(500),
});

type MemosHit = {
  id: string;
  cubeId: string;
  memory: string;
  relativity: number | null;
};

type MemosConfig = {
  enabled: boolean;
  baseUrl: string;
  userId: string;
  readableCubeIds: string[];
  topK: number;
  timeoutMs: number;
  reason: string;
};

export interface MemosAutoContextStatus {
  enabled: boolean;
  reason: string;
  baseUrl: string;
  userId: string;
  cubes: string[];
  topK: number;
}

export interface MemosAutoContextMeta {
  enabled: boolean;
  query: string;
  used: boolean;
  hitCount: number;
  error: string;
}

export interface MemosAutoContextProvider {
  status(): MemosAutoContextStatus;
  enrichCreatePayload(
    input: CreateAgentCommandInput,
  ): Promise<{ payload: CreateAgentCommandInput; meta: MemosAutoContextMeta }>;
  searchToContext(
    query: string,
  ): Promise<{ context: string; hitCount: number; query: string; error: string }>;
}

function envFlag(value: string | undefined, fallback: boolean): boolean {
  if (typeof value !== "string") return fallback;
  const clean = value.trim().toLowerCase();
  if (!clean) return fallback;
  return !["0", "false", "off", "no"].includes(clean);
}

function envInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function parseCubes(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeRelativity(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function sliceText(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 1))}…`;
}

function collectMemosHits(payload: unknown): MemosHit[] {
  const data = (payload as any)?.data;
  const textMem = Array.isArray(data?.text_mem) ? data.text_mem : [];
  const result: MemosHit[] = [];

  for (const group of textMem) {
    const cubeId = normalizeString(group?.cube_id);
    const memories = Array.isArray(group?.memories) ? group.memories : [];
    for (const item of memories) {
      const memory = normalizeString(item?.memory);
      if (!memory) continue;
      result.push({
        id: normalizeString(item?.id),
        cubeId,
        memory,
        relativity: normalizeRelativity(item?.metadata?.relativity),
      });
    }
  }

  return result;
}

function dedupeHits(hits: MemosHit[]): MemosHit[] {
  const seen = new Set<string>();
  const result: MemosHit[] = [];

  for (const hit of hits) {
    const key = hit.id || hit.memory;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(hit);
  }
  return result;
}

function sortHits(hits: MemosHit[]): MemosHit[] {
  return [...hits].sort((a, b) => {
    const aRel = a.relativity ?? -1;
    const bRel = b.relativity ?? -1;
    if (aRel !== bRel) return bRel - aRel;
    return a.memory.localeCompare(b.memory);
  });
}

function formatMemosContext(query: string, hits: MemosHit[]): string {
  if (hits.length === 0) {
    return `MemOS: по запросу "${sliceText(query, 160)}" релевантных воспоминаний не найдено.`;
  }

  const lines = hits.slice(0, 8).map((hit, index) => {
    const rel = hit.relativity === null ? "" : ` rel=${hit.relativity.toFixed(2)}`;
    const cube = hit.cubeId ? ` cube=${hit.cubeId}` : "";
    return `${index + 1}. ${sliceText(hit.memory, 420)}${cube}${rel}`;
  });

  const summary = `MemOS auto-context · query: "${sliceText(query, 240)}"`;
  return sliceText([summary, ...lines].join("\n"), 7900);
}

function buildConfig(): MemosConfig {
  const enabled = envFlag(process.env.MEMOS_AUTO_CONTEXT, true);
  if (!enabled) {
    return {
      enabled: false,
      baseUrl: "",
      userId: "",
      readableCubeIds: [],
      topK: 0,
      timeoutMs: 0,
      reason: "MEMOS_AUTO_CONTEXT is disabled.",
    };
  }

  const baseUrl = normalizeString(process.env.MEMOS_BASE_URL || "http://127.0.0.1:8000").replace(
    /\/+$/,
    "",
  );
  const userId = normalizeString(process.env.MEMOS_USER_ID || "openclaw-main");
  const readableCubeIds = parseCubes(
    process.env.MEMOS_READABLE_CUBES ||
      "openclaw-memory-operational,openclaw-memory-runtime-sync,openclaw-memory-session-reports,openclaw-memory-turn-reports,openclaw-memory-live",
  );
  const topK = envInt(process.env.MEMOS_TOP_K, 6, 1, 30);
  const timeoutMs = envInt(process.env.MEMOS_TIMEOUT_MS, 7000, 1000, 30_000);

  if (!baseUrl || !userId) {
    return {
      enabled: false,
      baseUrl,
      userId,
      readableCubeIds,
      topK,
      timeoutMs,
      reason: "MEMOS_BASE_URL or MEMOS_USER_ID is not configured.",
    };
  }

  return {
    enabled: true,
    baseUrl,
    userId,
    readableCubeIds,
    topK,
    timeoutMs,
    reason: "OK",
  };
}

class HttpMemosAutoContextProvider implements MemosAutoContextProvider {
  constructor(private readonly config: MemosConfig) {}

  status(): MemosAutoContextStatus {
    return {
      enabled: this.config.enabled,
      reason: this.config.reason,
      baseUrl: this.config.baseUrl,
      userId: this.config.userId,
      cubes: this.config.readableCubeIds,
      topK: this.config.topK,
    };
  }

  async enrichCreatePayload(
    input: CreateAgentCommandInput,
  ): Promise<{ payload: CreateAgentCommandInput; meta: MemosAutoContextMeta }> {
    const hasContext = Boolean(input.memosContext && input.memosContext.trim());
    const rawQuery =
      normalizeString(input.memosQuery) ||
      normalizeString(`${input.title}\n${input.details ?? ""}`).slice(0, 500);

    if (!this.config.enabled || hasContext || !rawQuery) {
      return {
        payload: input,
        meta: {
          enabled: this.config.enabled,
          query: rawQuery,
          used: false,
          hitCount: 0,
          error: "",
        },
      };
    }

    const { context, hitCount, query, error } = await this.searchToContext(rawQuery);
    return {
      payload: {
        ...input,
        memosQuery: input.memosQuery ?? query,
        memosContext: context || input.memosContext,
      },
      meta: {
        enabled: this.config.enabled,
        query,
        used: Boolean(context),
        hitCount,
        error,
      },
    };
  }

  async searchToContext(
    rawQuery: string,
  ): Promise<{ context: string; hitCount: number; query: string; error: string }> {
    const parsed = memosSearchRequestSchema.safeParse({ query: rawQuery });
    if (!parsed.success) {
      return { context: "", hitCount: 0, query: "", error: "Invalid MemOS query." };
    }
    if (!this.config.enabled) {
      return { context: "", hitCount: 0, query: parsed.data.query, error: this.config.reason };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const res = await fetch(`${this.config.baseUrl}/product/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: parsed.data.query,
          user_id: this.config.userId,
          readable_cube_ids: this.config.readableCubeIds.length
            ? this.config.readableCubeIds
            : undefined,
          top_k: this.config.topK,
          relativity: 0,
          dedup: "mmr",
          mode: "fast",
          include_preference: true,
          search_tool_memory: true,
          include_skill_memory: true,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        return {
          context: "",
          hitCount: 0,
          query: parsed.data.query,
          error: `MemOS request failed with ${res.status}.`,
        };
      }

      const payload = await res.json();
      const hits = sortHits(dedupeHits(collectMemosHits(payload)));

      return {
        context: formatMemosContext(parsed.data.query, hits),
        hitCount: hits.length,
        query: parsed.data.query,
        error: "",
      };
    } catch (error: any) {
      return {
        context: "",
        hitCount: 0,
        query: parsed.data.query,
        error: error?.name === "AbortError" ? "MemOS request timed out." : String(error?.message || error),
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

class DisabledMemosAutoContextProvider implements MemosAutoContextProvider {
  constructor(private readonly config: MemosConfig) {}

  status(): MemosAutoContextStatus {
    return {
      enabled: false,
      reason: this.config.reason,
      baseUrl: this.config.baseUrl,
      userId: this.config.userId,
      cubes: this.config.readableCubeIds,
      topK: this.config.topK,
    };
  }

  async enrichCreatePayload(
    input: CreateAgentCommandInput,
  ): Promise<{ payload: CreateAgentCommandInput; meta: MemosAutoContextMeta }> {
    return {
      payload: input,
      meta: {
        enabled: false,
        query: normalizeString(input.memosQuery),
        used: false,
        hitCount: 0,
        error: this.config.reason,
      },
    };
  }

  async searchToContext(
    rawQuery: string,
  ): Promise<{ context: string; hitCount: number; query: string; error: string }> {
    const query = normalizeString(rawQuery);
    return { context: "", hitCount: 0, query, error: this.config.reason };
  }
}

export function createMemosAutoContextProvider(): MemosAutoContextProvider {
  const config = buildConfig();
  if (!config.enabled) {
    return new DisabledMemosAutoContextProvider(config);
  }
  return new HttpMemosAutoContextProvider(config);
}

