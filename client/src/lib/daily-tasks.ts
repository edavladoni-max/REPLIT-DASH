import type { ChecklistItem, DashboardState } from "@/lib/api";

export type DailyTaskKind = "ops" | "checklist" | "supplier";

export interface DailyTaskView {
  id: string;
  text: string;
  time?: string;
  done: boolean;
  kind: DailyTaskKind;
  source: string;
}

const OPERATIONAL_SOURCES = new Set([
  "ops",
  "openclaw_jobs_json",
  "triggered",
  "tasks_today",
]);

const OPERATIONAL_KEYWORDS = [
  /открыт/i,
  /закрыт/i,
  /мусор/i,
  /заказ/i,
  /постав/i,
  /дедлайн/i,
  /флагшток/i,
];

const TIME_RE = /\b([01]?\d|2[0-3]):([0-5]\d)\b/;

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").replace(/[–—]/g, "-").trim();
}

function extractTime(value: string): string | undefined {
  const match = value.match(TIME_RE);
  if (!match) return undefined;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function timeToMinutes(value?: string): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const [h, m] = value.split(":").map((p) => Number.parseInt(p, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return Number.POSITIVE_INFINITY;
  return h * 60 + m;
}

function isOperationalChecklistItem(item: ChecklistItem): boolean {
  const source = String(item.source || "").toLowerCase();
  if (OPERATIONAL_SOURCES.has(source)) return true;
  return OPERATIONAL_KEYWORDS.some((re) => re.test(item.label));
}

function dedupeAndSort(items: DailyTaskView[]): DailyTaskView[] {
  const deduped = new Map<string, DailyTaskView>();

  for (const item of items) {
    const key = normalizeText(item.text);
    const prev = deduped.get(key);
    if (!prev) {
      deduped.set(key, item);
      continue;
    }

    deduped.set(key, {
      ...prev,
      done: prev.done || item.done,
      time: prev.time || item.time,
    });
  }

  return Array.from(deduped.values()).sort((a, b) => {
    if (a.done !== b.done) return Number(a.done) - Number(b.done);
    const byTime = timeToMinutes(a.time) - timeToMinutes(b.time);
    if (byTime !== 0) return byTime;
    return a.text.localeCompare(b.text, "ru");
  });
}

export function buildDailyFocusTasks(data: DashboardState): DailyTaskView[] {
  const items: DailyTaskView[] = [];

  for (const task of data.ops_checklist || []) {
    items.push({
      id: `ops:${task.id}`,
      text: task.text,
      time: task.deadline_at_msk || extractTime(task.text),
      done: !!task.done,
      kind: "ops",
      source: "ops_checklist",
    });
  }

  for (const item of data.daily_checklist || []) {
    if (!isOperationalChecklistItem(item)) continue;
    items.push({
      id: `checklist:${item.id}`,
      text: item.label,
      time: item.time || extractTime(item.label),
      done: !!item.done,
      kind: "checklist",
      source: item.source,
    });
  }

  for (const supplier of data.supplier_deadlines || []) {
    items.push({
      id: `supplier:${supplier.name}`,
      text: `Проверить заказ ${supplier.name}`,
      time: supplier.time || extractTime(supplier.note || ""),
      done: false,
      kind: "supplier",
      source: "supplier_deadlines",
    });
  }

  return dedupeAndSort(items);
}

export function buildOperationalChecklist(data: DashboardState): ChecklistItem[] {
  return (data.daily_checklist || [])
    .filter((item) => isOperationalChecklistItem(item))
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
}
