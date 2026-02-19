import { randomUUID } from "crypto";
import { Pool } from "pg";
import { z } from "zod";

export const AGENT_COMMAND_STATUSES = [
  "pending_confirmation",
  "confirmed",
  "rejected",
  "in_progress",
  "completed",
  "failed",
] as const;

export type AgentCommandStatus = (typeof AGENT_COMMAND_STATUSES)[number];

export interface AgentCommandRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  source: string;
  title: string;
  details: string;
  status: AgentCommandStatus;
  requiresConfirmation: boolean;
  confirmationPrompt: string;
  memosQuery: string;
  memosContext: string;
  createdBy: string;
  confirmedBy: string;
  confirmedAt: string;
  startedBy: string;
  startedAt: string;
  finishedBy: string;
  finishedAt: string;
  result: string;
  error: string;
}

export const listAgentCommandsQuerySchema = z.object({
  status: z
    .string()
    .trim()
    .optional()
    .transform((value) =>
      value && AGENT_COMMAND_STATUSES.includes(value as AgentCommandStatus)
        ? (value as AgentCommandStatus)
        : undefined,
    ),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const createAgentCommandSchema = z.object({
  source: z.string().trim().min(1).max(64).default("manual"),
  title: z.string().trim().min(3).max(240),
  details: z.string().trim().max(4000).optional(),
  requiresConfirmation: z.boolean().default(true),
  confirmationPrompt: z.string().trim().max(500).optional(),
  memosQuery: z.string().trim().max(500).optional(),
  memosContext: z.string().trim().max(8000).optional(),
  createdBy: z.string().trim().max(120).optional(),
});

export const actorSchema = z.object({
  actor: z.string().trim().max(120).optional(),
});

export const rejectAgentCommandSchema = actorSchema.extend({
  reason: z.string().trim().max(2000).optional(),
});

export const finishAgentCommandSchema = actorSchema.extend({
  result: z.string().trim().max(4000).optional(),
});

export const updateContextSchema = z.object({
  memosQuery: z.string().trim().max(500).optional(),
  memosContext: z.string().trim().max(8000).optional(),
});

export type CreateAgentCommandInput = z.infer<typeof createAgentCommandSchema>;
export type ListAgentCommandsQuery = z.infer<typeof listAgentCommandsQuerySchema>;
export type ActorInput = z.infer<typeof actorSchema>;
export type RejectAgentCommandInput = z.infer<typeof rejectAgentCommandSchema>;
export type FinishAgentCommandInput = z.infer<typeof finishAgentCommandSchema>;
export type UpdateContextInput = z.infer<typeof updateContextSchema>;

export class AgentCommandError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "AgentCommandError";
    this.statusCode = statusCode;
  }
}

export interface AgentCommandStore {
  list(input: ListAgentCommandsQuery): Promise<AgentCommandRecord[]>;
  create(input: CreateAgentCommandInput): Promise<AgentCommandRecord>;
  confirm(id: string, input: ActorInput): Promise<AgentCommandRecord>;
  reject(id: string, input: RejectAgentCommandInput): Promise<AgentCommandRecord>;
  start(id: string, input: ActorInput): Promise<AgentCommandRecord>;
  complete(id: string, input: FinishAgentCommandInput): Promise<AgentCommandRecord>;
  fail(id: string, input: FinishAgentCommandInput): Promise<AgentCommandRecord>;
  updateContext(id: string, input: UpdateContextInput): Promise<AgentCommandRecord>;
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function validateCommandId(id: string): string {
  const clean = String(id || "").trim();
  if (!clean) throw new AgentCommandError("Command id is required.");
  return clean;
}

function ensureStatus(
  record: AgentCommandRecord | undefined,
  expected: AgentCommandStatus,
  action: string,
): AgentCommandRecord {
  if (!record) {
    throw new AgentCommandError("Command not found.", 404);
  }
  if (record.status !== expected) {
    throw new AgentCommandError(
      `Cannot ${action}: current status is '${record.status}', expected '${expected}'.`,
      409,
    );
  }
  return record;
}

class InMemoryAgentCommandStore implements AgentCommandStore {
  private readonly records = new Map<string, AgentCommandRecord>();

  async list(input: ListAgentCommandsQuery): Promise<AgentCommandRecord[]> {
    const values = Array.from(this.records.values()).sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
    const filtered = input.status
      ? values.filter((item) => item.status === input.status)
      : values;
    return filtered.slice(0, input.limit).map((item) => ({ ...item }));
  }

  async create(input: CreateAgentCommandInput): Promise<AgentCommandRecord> {
    const nowIso = new Date().toISOString();
    const id = randomUUID();
    const requiresConfirmation = Boolean(input.requiresConfirmation);
    const record: AgentCommandRecord = {
      id,
      createdAt: nowIso,
      updatedAt: nowIso,
      source: input.source,
      title: input.title,
      details: input.details ?? "",
      status: requiresConfirmation ? "pending_confirmation" : "confirmed",
      requiresConfirmation,
      confirmationPrompt:
        input.confirmationPrompt ??
        (requiresConfirmation ? "Подтвердите выполнение действия." : ""),
      memosQuery: input.memosQuery ?? "",
      memosContext: input.memosContext ?? "",
      createdBy: input.createdBy ?? "",
      confirmedBy: "",
      confirmedAt: "",
      startedBy: "",
      startedAt: "",
      finishedBy: "",
      finishedAt: "",
      result: "",
      error: "",
    };
    this.records.set(record.id, record);
    return { ...record };
  }

  async confirm(id: string, input: ActorInput): Promise<AgentCommandRecord> {
    const cleanId = validateCommandId(id);
    const record = ensureStatus(this.records.get(cleanId), "pending_confirmation", "confirm");
    const next: AgentCommandRecord = {
      ...record,
      status: "confirmed",
      updatedAt: new Date().toISOString(),
      confirmedAt: new Date().toISOString(),
      confirmedBy: input.actor ?? "unknown",
      error: "",
    };
    this.records.set(cleanId, next);
    return { ...next };
  }

  async reject(id: string, input: RejectAgentCommandInput): Promise<AgentCommandRecord> {
    const cleanId = validateCommandId(id);
    const record = ensureStatus(this.records.get(cleanId), "pending_confirmation", "reject");
    const next: AgentCommandRecord = {
      ...record,
      status: "rejected",
      updatedAt: new Date().toISOString(),
      confirmedAt: new Date().toISOString(),
      confirmedBy: input.actor ?? "unknown",
      error: input.reason ?? "Rejected by operator.",
    };
    this.records.set(cleanId, next);
    return { ...next };
  }

  async start(id: string, input: ActorInput): Promise<AgentCommandRecord> {
    const cleanId = validateCommandId(id);
    const record = ensureStatus(this.records.get(cleanId), "confirmed", "start");
    const nowIso = new Date().toISOString();
    const next: AgentCommandRecord = {
      ...record,
      status: "in_progress",
      updatedAt: nowIso,
      startedAt: nowIso,
      startedBy: input.actor ?? "agent",
      error: "",
    };
    this.records.set(cleanId, next);
    return { ...next };
  }

  async complete(id: string, input: FinishAgentCommandInput): Promise<AgentCommandRecord> {
    const cleanId = validateCommandId(id);
    const record = ensureStatus(this.records.get(cleanId), "in_progress", "complete");
    const nowIso = new Date().toISOString();
    const next: AgentCommandRecord = {
      ...record,
      status: "completed",
      updatedAt: nowIso,
      finishedAt: nowIso,
      finishedBy: input.actor ?? "agent",
      result: input.result ?? "",
      error: "",
    };
    this.records.set(cleanId, next);
    return { ...next };
  }

  async fail(id: string, input: FinishAgentCommandInput): Promise<AgentCommandRecord> {
    const cleanId = validateCommandId(id);
    const record = ensureStatus(this.records.get(cleanId), "in_progress", "fail");
    const nowIso = new Date().toISOString();
    const next: AgentCommandRecord = {
      ...record,
      status: "failed",
      updatedAt: nowIso,
      finishedAt: nowIso,
      finishedBy: input.actor ?? "agent",
      error: input.result ?? "Execution failed.",
    };
    this.records.set(cleanId, next);
    return { ...next };
  }

  async updateContext(id: string, input: UpdateContextInput): Promise<AgentCommandRecord> {
    const cleanId = validateCommandId(id);
    const record = this.records.get(cleanId);
    if (!record) throw new AgentCommandError("Command not found.", 404);
    const next: AgentCommandRecord = {
      ...record,
      updatedAt: new Date().toISOString(),
      memosQuery: input.memosQuery ?? record.memosQuery,
      memosContext: input.memosContext ?? record.memosContext,
    };
    this.records.set(cleanId, next);
    return { ...next };
  }
}

type AgentCommandRow = {
  id: string;
  created_at: Date;
  updated_at: Date;
  source: string;
  title: string;
  details: string | null;
  status: AgentCommandStatus;
  requires_confirmation: boolean;
  confirmation_prompt: string | null;
  memos_query: string | null;
  memos_context: string | null;
  created_by: string | null;
  confirmed_by: string | null;
  confirmed_at: Date | null;
  started_by: string | null;
  started_at: Date | null;
  finished_by: string | null;
  finished_at: Date | null;
  result: string | null;
  error: string | null;
};

function mapRow(row: AgentCommandRow): AgentCommandRecord {
  return {
    id: row.id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    source: normalizeText(row.source),
    title: normalizeText(row.title),
    details: normalizeText(row.details),
    status: row.status,
    requiresConfirmation: row.requires_confirmation,
    confirmationPrompt: normalizeText(row.confirmation_prompt),
    memosQuery: normalizeText(row.memos_query),
    memosContext: normalizeText(row.memos_context),
    createdBy: normalizeText(row.created_by),
    confirmedBy: normalizeText(row.confirmed_by),
    confirmedAt: row.confirmed_at ? row.confirmed_at.toISOString() : "",
    startedBy: normalizeText(row.started_by),
    startedAt: row.started_at ? row.started_at.toISOString() : "",
    finishedBy: normalizeText(row.finished_by),
    finishedAt: row.finished_at ? row.finished_at.toISOString() : "",
    result: normalizeText(row.result),
    error: normalizeText(row.error),
  };
}

class PostgresAgentCommandStore implements AgentCommandStore {
  private readonly pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 8,
      idleTimeoutMillis: 30_000,
    });
  }

  async init(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS agent_commands (
        id uuid PRIMARY KEY,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        source text NOT NULL,
        title text NOT NULL,
        details text,
        status text NOT NULL,
        requires_confirmation boolean NOT NULL DEFAULT true,
        confirmation_prompt text,
        memos_query text,
        memos_context text,
        created_by text,
        confirmed_by text,
        confirmed_at timestamptz,
        started_by text,
        started_at timestamptz,
        finished_by text,
        finished_at timestamptz,
        result text,
        error text
      )
    `);
    await this.pool.query(
      "CREATE INDEX IF NOT EXISTS idx_agent_commands_created_at ON agent_commands (created_at DESC)",
    );
    await this.pool.query(
      "CREATE INDEX IF NOT EXISTS idx_agent_commands_status ON agent_commands (status)",
    );
  }

  async list(input: ListAgentCommandsQuery): Promise<AgentCommandRecord[]> {
    const { status, limit } = input;
    const query = status
      ? {
          text: `
            SELECT * FROM agent_commands
            WHERE status = $1
            ORDER BY created_at DESC
            LIMIT $2
          `,
          values: [status, limit],
        }
      : {
          text: `
            SELECT * FROM agent_commands
            ORDER BY created_at DESC
            LIMIT $1
          `,
          values: [limit],
        };
    const res = await this.pool.query<AgentCommandRow>(query);
    return res.rows.map(mapRow);
  }

  async create(input: CreateAgentCommandInput): Promise<AgentCommandRecord> {
    const id = randomUUID();
    const requiresConfirmation = Boolean(input.requiresConfirmation);
    const status: AgentCommandStatus = requiresConfirmation
      ? "pending_confirmation"
      : "confirmed";
    const res = await this.pool.query<AgentCommandRow>(
      `
        INSERT INTO agent_commands (
          id, source, title, details, status, requires_confirmation,
          confirmation_prompt, memos_query, memos_context, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING *
      `,
      [
        id,
        input.source,
        input.title,
        input.details ?? null,
        status,
        requiresConfirmation,
        input.confirmationPrompt ??
          (requiresConfirmation ? "Подтвердите выполнение действия." : null),
        input.memosQuery ?? null,
        input.memosContext ?? null,
        input.createdBy ?? null,
      ],
    );
    return mapRow(res.rows[0]);
  }

  async confirm(id: string, input: ActorInput): Promise<AgentCommandRecord> {
    const cleanId = validateCommandId(id);
    const res = await this.pool.query<AgentCommandRow>(
      `
        UPDATE agent_commands
        SET status = 'confirmed',
            confirmed_by = $2,
            confirmed_at = now(),
            updated_at = now(),
            error = NULL
        WHERE id = $1 AND status = 'pending_confirmation'
        RETURNING *
      `,
      [cleanId, input.actor ?? "unknown"],
    );
    if (res.rows.length > 0) return mapRow(res.rows[0]);
    const current = await this.getById(cleanId);
    ensureStatus(current, "pending_confirmation", "confirm");
    throw new AgentCommandError("Unable to confirm command.");
  }

  async reject(id: string, input: RejectAgentCommandInput): Promise<AgentCommandRecord> {
    const cleanId = validateCommandId(id);
    const res = await this.pool.query<AgentCommandRow>(
      `
        UPDATE agent_commands
        SET status = 'rejected',
            confirmed_by = $2,
            confirmed_at = now(),
            updated_at = now(),
            error = $3
        WHERE id = $1 AND status = 'pending_confirmation'
        RETURNING *
      `,
      [cleanId, input.actor ?? "unknown", input.reason ?? "Rejected by operator."],
    );
    if (res.rows.length > 0) return mapRow(res.rows[0]);
    const current = await this.getById(cleanId);
    ensureStatus(current, "pending_confirmation", "reject");
    throw new AgentCommandError("Unable to reject command.");
  }

  async start(id: string, input: ActorInput): Promise<AgentCommandRecord> {
    const cleanId = validateCommandId(id);
    const res = await this.pool.query<AgentCommandRow>(
      `
        UPDATE agent_commands
        SET status = 'in_progress',
            started_by = $2,
            started_at = now(),
            updated_at = now(),
            error = NULL
        WHERE id = $1 AND status = 'confirmed'
        RETURNING *
      `,
      [cleanId, input.actor ?? "agent"],
    );
    if (res.rows.length > 0) return mapRow(res.rows[0]);
    const current = await this.getById(cleanId);
    ensureStatus(current, "confirmed", "start");
    throw new AgentCommandError("Unable to start command.");
  }

  async complete(id: string, input: FinishAgentCommandInput): Promise<AgentCommandRecord> {
    const cleanId = validateCommandId(id);
    const res = await this.pool.query<AgentCommandRow>(
      `
        UPDATE agent_commands
        SET status = 'completed',
            finished_by = $2,
            finished_at = now(),
            updated_at = now(),
            result = $3,
            error = NULL
        WHERE id = $1 AND status = 'in_progress'
        RETURNING *
      `,
      [cleanId, input.actor ?? "agent", input.result ?? null],
    );
    if (res.rows.length > 0) return mapRow(res.rows[0]);
    const current = await this.getById(cleanId);
    ensureStatus(current, "in_progress", "complete");
    throw new AgentCommandError("Unable to complete command.");
  }

  async fail(id: string, input: FinishAgentCommandInput): Promise<AgentCommandRecord> {
    const cleanId = validateCommandId(id);
    const res = await this.pool.query<AgentCommandRow>(
      `
        UPDATE agent_commands
        SET status = 'failed',
            finished_by = $2,
            finished_at = now(),
            updated_at = now(),
            error = $3
        WHERE id = $1 AND status = 'in_progress'
        RETURNING *
      `,
      [cleanId, input.actor ?? "agent", input.result ?? "Execution failed."],
    );
    if (res.rows.length > 0) return mapRow(res.rows[0]);
    const current = await this.getById(cleanId);
    ensureStatus(current, "in_progress", "fail");
    throw new AgentCommandError("Unable to fail command.");
  }

  async updateContext(id: string, input: UpdateContextInput): Promise<AgentCommandRecord> {
    const cleanId = validateCommandId(id);
    const existing = await this.getById(cleanId);
    if (!existing) throw new AgentCommandError("Command not found.", 404);

    const res = await this.pool.query<AgentCommandRow>(
      `
        UPDATE agent_commands
        SET memos_query = $2,
            memos_context = $3,
            updated_at = now()
        WHERE id = $1
        RETURNING *
      `,
      [
        cleanId,
        input.memosQuery ?? existing.memosQuery ?? null,
        input.memosContext ?? existing.memosContext ?? null,
      ],
    );
    return mapRow(res.rows[0]);
  }

  private async getById(id: string): Promise<AgentCommandRecord | undefined> {
    const res = await this.pool.query<AgentCommandRow>(
      "SELECT * FROM agent_commands WHERE id = $1 LIMIT 1",
      [id],
    );
    if (res.rows.length === 0) return undefined;
    return mapRow(res.rows[0]);
  }
}

export type AgentCommandStoreMode = "postgres" | "memory";

export interface AgentCommandStoreSetup {
  store: AgentCommandStore;
  mode: AgentCommandStoreMode;
  reason?: string;
}

export async function createAgentCommandStore(): Promise<AgentCommandStoreSetup> {
  const databaseUrl = String(process.env.DATABASE_URL || "").trim();
  if (!databaseUrl) {
    return {
      store: new InMemoryAgentCommandStore(),
      mode: "memory",
      reason: "DATABASE_URL is not set. Using in-memory storage.",
    };
  }

  try {
    const store = new PostgresAgentCommandStore(databaseUrl);
    await store.init();
    return { store, mode: "postgres" };
  } catch (error: any) {
    return {
      store: new InMemoryAgentCommandStore(),
      mode: "memory",
      reason: `Failed to initialize PostgreSQL store: ${error?.message ?? "unknown error"}`,
    };
  }
}

