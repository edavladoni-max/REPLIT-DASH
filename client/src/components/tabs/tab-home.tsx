import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock,
  AlertTriangle,
  AlertCircle,
  CalendarDays,
  CheckSquare,
  Circle,
  CheckCircle2,
} from "lucide-react";
import type { DashboardState } from "@/lib/api";
import { buildDailyFocusTasks } from "@/lib/daily-tasks";

function WeekShiftsCard({ data }: { data: DashboardState }) {
  const grid = data.shift_grid;
  if (!grid) {
    return (
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <CalendarDays className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Смены недели</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Данные недельных смен не доступны</p>
        </CardContent>
      </Card>
    );
  }

  const weekDates: any[] = Array.isArray(grid.week_dates) ? grid.week_dates : [];
  const locations: string[] = Array.isArray(grid.locations) ? grid.locations : [];
  const cells: Record<string, any> = grid.cells || {};

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">{grid.week_title || "Смены недели"}</CardTitle>
        </div>
        {grid.summary && (
          <Badge variant="secondary" className="text-xs">
            {grid.summary.filled}/{grid.summary.total_slots} заполнено
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-32 border-b border-border/50 bg-card p-2 text-left font-medium text-muted-foreground">
                  Локация
                </th>
                {weekDates.map((wd: any) => {
                  const dateIso = typeof wd === "string" ? wd : wd.date_iso;
                  const label = typeof wd === "string" ? "" : wd.weekday_label;
                  const display = typeof wd === "string" ? wd : wd.date_display;
                  const isToday = typeof wd === "object" && wd.is_today;
                  const isPast = typeof wd === "object" && wd.is_past;
                  const shortDisplay =
                    typeof display === "string" ? display.split(".").slice(0, 2).join(".") : "";
                  return (
                    <th
                      key={dateIso}
                      className={`border-b border-border/50 p-2 text-center font-medium ${
                        isToday
                          ? "text-primary"
                          : isPast
                            ? "text-muted-foreground/50"
                            : "text-muted-foreground"
                      }`}
                    >
                      <div className={`${isToday ? "rounded-md bg-primary/10 px-2 py-1" : ""}`}>
                        <div className="text-xs uppercase">{label}</div>
                        <div className="text-sm">{shortDisplay}</div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr key={loc}>
                  <td className="sticky left-0 z-10 whitespace-nowrap border-b border-border/30 bg-card p-2 text-sm font-medium">
                    {loc}
                  </td>
                  {weekDates.map((wd: any) => {
                    const dateIso = typeof wd === "string" ? wd : wd.date_iso;
                    const isToday = typeof wd === "object" && wd.is_today;
                    const cellKey = `${dateIso}:${loc}`;
                    const cell = cells[cellKey];
                    const employees: any[] = Array.isArray(cell?.employees) ? cell.employees : [];
                    const event = String(cell?.event || "");
                    const status = String(cell?.status || "off");

                    return (
                      <td
                        key={dateIso}
                        className={`border-b border-border/30 p-2 align-top text-center ${
                          isToday ? "bg-primary/5" : ""
                        }`}
                      >
                        {employees.length > 0 ? (
                          <div className="space-y-0.5">
                            {employees.map((emp: any, idx: number) => (
                              <div key={idx} className="text-xs">
                                {typeof emp === "string" ? emp : emp?.name || ""}
                              </div>
                            ))}
                          </div>
                        ) : status === "off" ? (
                          <span className="text-[10px] text-muted-foreground/50">выходной</span>
                        ) : (
                          <span className="text-[10px] text-amber-400/80">нужен сотрудник</span>
                        )}
                        {event && (
                          <div
                            className="mx-auto mt-1 max-w-[120px] truncate text-[10px] text-amber-400/80"
                            title={event}
                          >
                            {event}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function DailyFocusCard({ data }: { data: DashboardState }) {
  const items = buildDailyFocusTasks(data);
  const remainingCount = items.filter((item) => !item.done).length;
  const sourceLabel: Record<string, string> = {
    ops: "Операции",
    checklist: "Чек-лист",
    supplier: "Дедлайн заказа",
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Ежедневные задачи</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{data.today}</p>
        </div>
        <Badge variant={remainingCount > 0 ? "secondary" : "outline"} className="text-xs">
          Осталось: {remainingCount}
        </Badge>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <div className="space-y-2">
            {items.slice(0, 12).map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 p-3 rounded-md bg-muted/40"
              >
                <div className="flex items-start gap-2 min-w-0">
                  {item.done ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
                  ) : (
                    <Circle className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0">
                    <p
                      className={`text-sm truncate ${item.done ? "line-through text-muted-foreground" : ""}`}
                      title={item.text}
                    >
                      {item.text}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{sourceLabel[item.kind]}</p>
                  </div>
                </div>
                {item.time && (
                  <Badge variant="outline" className="text-[11px] shrink-0">
                    {item.time}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Операционные задачи на сегодня не найдены</p>
        )}
      </CardContent>
    </Card>
  );
}

export function TabHome({ data, isLoading }: { data?: DashboardState; isLoading: boolean }) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const hotCount = data.hot_zone?.total_count || 0;
  const overdueTasks = data.hot_zone?.overdue_tasks || [];
  const staleTasks = data.hot_zone?.stale_tasks || [];
  const upcomingDeadlines = data.hot_zone?.upcoming_deadlines || [];
  const staffingWarnings = data.hot_zone?.staffing_warnings || [];
  const triggeredAlerts = data.hot_zone?.triggered_alerts || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4" data-testid="tab-home">
      {hotCount > 0 && (
        <Card className="lg:col-span-2 border-red-500/30 bg-red-500/5">
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <CardTitle className="text-base text-red-400">
              Горячая зона ({hotCount})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueTasks.map((t) => (
                <div key={t.id} className="flex items-start gap-2 p-2 rounded-md bg-red-500/10 text-sm">
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <span className="text-red-300">{t.text}</span>
                </div>
              ))}
              {staleTasks.map((t) => (
                <div key={t.id} className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 text-sm">
                  <Clock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <span className="text-amber-300">{t.text}</span>
                </div>
              ))}
              {upcomingDeadlines.map((t) => (
                <div key={t.id} className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 text-sm">
                  <Clock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <span>{t.text} — {t.deadline_at_msk}</span>
                </div>
              ))}
              {staffingWarnings.map((w: any, i: number) => (
                <div key={`sw-${i}`} className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <span>{typeof w === "string" ? w : w.text || JSON.stringify(w)}</span>
                </div>
              ))}
              {triggeredAlerts.map((a: any, i: number) => (
                <div key={`ta-${i}`} className={`flex items-start gap-2 p-2 rounded-md text-sm ${
                  a.severity === "critical" ? "bg-red-500/10" : "bg-amber-500/10"
                }`}>
                  <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${
                    a.severity === "critical" ? "text-red-400" : "text-amber-400"
                  }`} />
                  <span className={a.severity === "critical" ? "text-red-300" : ""}>
                    {typeof a === "string" ? a : a.text || JSON.stringify(a)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <DailyFocusCard data={data} />

      <WeekShiftsCard data={data} />

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <Clock className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Смены сегодня</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(data.today_shifts || []).map((shift, i) => {
              const parts = shift.replace(/\*\*/g, "").split(":");
              const loc = parts[0]?.trim();
              const info = parts.slice(1).join(":").trim();
              return (
                <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/50">
                  <span className="font-medium text-sm">{loc}</span>
                  <span className="text-sm text-muted-foreground">{info}</span>
                </div>
              );
            })}
            {!data.today_shifts?.length && (
              <p className="text-sm text-muted-foreground">Сегодня смены не указаны</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
