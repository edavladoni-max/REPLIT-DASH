export interface SyncMeta {
  last_sync_utc: string;
  age_minutes: number;
  level: string;
}

export interface Task {
  id: string;
  done: boolean;
  text: string;
  assignee: string | null;
  location: string | null;
  priority: string;
  deadline: string | null;
  created_at: string | null;
  repeat: string | null;
  is_overdue: boolean;
  is_stale: boolean;
  deadline_minutes_left: number | null;
  deadline_due_today: boolean;
  deadline_due_soon: boolean;
  deadline_at_msk: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  time: string;
  source: string;
  done?: boolean;
}

export interface SupplierDeadline {
  name: string;
  time: string;
  note: string;
}

export interface KeyDate {
  date: string;
  date_display: string;
  description: string;
}

export interface LocationStatus {
  name: string;
  status: string;
  note: string;
}

export interface JournalEntry {
  time: string;
  type: string;
  location: string;
  text: string;
  actor: string;
}

export interface WeekDate {
  date_iso: string;
  date_display: string;
  weekday_num: number;
  weekday_label: string;
  is_today: boolean;
  is_past: boolean;
}

export interface ShiftEmployee {
  name: string;
  name_key: string;
  start_time: string;
  end_time: string;
  hours: number;
  label: string;
  rate_rub: number;
  cost: number;
  week_shift_count: number;
}

export interface ShiftGridCell {
  date_iso: string;
  date_display: string;
  location: string;
  norm: number;
  assigned_count: number;
  status: string;
  employees: ShiftEmployee[];
  event: string;
  draft_row_index: number | null;
  source_rows: number;
}

export type AgentCommandStatus =
  | "pending_confirmation"
  | "confirmed"
  | "rejected"
  | "in_progress"
  | "completed"
  | "failed";

export interface AgentCommand {
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

export interface HotZone {
  overdue_tasks: Task[];
  stale_tasks: Task[];
  upcoming_deadlines: Task[];
  staffing_warnings: any[];
  triggered_alerts: { severity: string; text: string }[];
  total_count: number;
}

export interface DraftScheduleTable {
  headers: string[];
  rows: Record<string, string>[];
}

export interface DraftSchedule {
  week_title: string;
  table: DraftScheduleTable;
  warnings: any[];
}

export interface ShiftGrid {
  week_title: string;
  week_start_iso: string;
  week_end_iso: string;
  week_dates: WeekDate[];
  locations: string[];
  cells: Record<string, ShiftGridCell>;
  summary: {
    total_slots: number;
    filled: number;
    partial: number;
    empty: number;
    total_hours: number;
    estimated_payroll: number;
  };
}

export interface ConcertItem {
  date_iso: string;
  location: string;
  event: string;
  audience: number;
  assigned_count: number;
  target_staff: number;
  employees: string[];
  severity: string;
  reason: string;
  needs_second_staff: boolean;
}

export interface ConcertTomorrow {
  counters: Record<string, number>;
  items: ConcertItem[];
  tomorrow_date_iso: string;
  generated_at_utc: string;
}

export interface PriorityQueue {
  generated_at_utc: string;
  today_date_iso: string;
  counters: Record<string, number>;
  sections: any[];
  supplier_followups_path: string;
  supplier_followups_updated_at_utc: string;
}

export interface DashboardState {
  generated_at_utc: string;
  today_date_iso: string;
  today_weekday: number;
  today: string;
  sync_meta: SyncMeta;
  today_shifts: string[];
  tasks_today: Task[];
  daily_checklist: ChecklistItem[];
  daily_checklist_meta: any;
  daily_checklist_state: any;
  daily_events: any;
  ops_checklist: Task[];
  deliveries: Task[];
  shifts: Record<string, string>;
  priorities: any[];
  supplier_deadlines: SupplierDeadline[];
  supplier_followups: any;
  priority_queue: PriorityQueue;
  finance: any;
  key_dates: KeyDate[];
  upcoming_controls: any[];
  draft_schedule: DraftSchedule;
  draft_consistency_issues: any[];
  schedule_settings: any;
  employee_directory: any;
  employees: string[];
  location_statuses: LocationStatus[];
  partner_details: Record<string, any>;
  shift_grid: ShiftGrid;
  shift_completeness: any[];
  concert_tomorrow: ConcertTomorrow;
  hot_zone: HotZone;
  journal_today: JournalEntry[];
  task_routines_sync: any;
  telegram_ingest: any;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}
