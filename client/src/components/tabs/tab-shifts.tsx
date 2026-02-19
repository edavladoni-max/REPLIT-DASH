import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, Users, AlertTriangle } from "lucide-react";
import type { DashboardState } from "@/lib/api";

export function TabShifts({ data, isLoading }: { data?: DashboardState; isLoading: boolean }) {
  if (isLoading || !data) {
    return (
      <div className="p-4">
        <Card>
          <CardHeader className="pb-3"><Skeleton className="h-5 w-60" /></CardHeader>
          <CardContent><Skeleton className="h-80 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  const grid = data.shift_grid;
  if (!grid) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Данные смен не доступны
          </CardContent>
        </Card>
      </div>
    );
  }

  const weekDates: any[] = grid.week_dates || [];
  const locations: string[] = grid.locations || [];
  const cells: Record<string, any> = grid.cells || {};

  return (
    <div className="space-y-4 p-4" data-testid="tab-shifts">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">{grid.week_title || "Расписание смен"}</CardTitle>
          </div>
          {grid.summary && (
            <Badge variant="secondary" className="text-xs">
              {grid.summary.filled}/{grid.summary.total_slots} заполнено
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm border-collapse min-w-[700px]">
              <thead>
                <tr>
                  <th className="text-left p-2 text-muted-foreground font-medium border-b border-border/50 w-32 sticky left-0 bg-card z-10">Локация</th>
                  {weekDates.map((wd: any) => {
                    const dateIso = typeof wd === "string" ? wd : wd.date_iso;
                    const label = typeof wd === "string" ? "" : wd.weekday_label;
                    const display = typeof wd === "string" ? wd : wd.date_display;
                    const isToday = typeof wd === "object" && wd.is_today;
                    const isPast = typeof wd === "object" && wd.is_past;

                    return (
                      <th
                        key={dateIso}
                        className={`text-center p-2 font-medium border-b border-border/50 ${
                          isToday ? "text-primary" : isPast ? "text-muted-foreground/50" : "text-muted-foreground"
                        }`}
                      >
                        <div className={`${isToday ? "bg-primary/10 rounded-md px-2 py-1" : ""}`}>
                          <div className="text-xs uppercase">{label}</div>
                          <div className="text-sm">{display?.split(".").slice(0, 2).join(".")}</div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => (
                  <tr key={loc}>
                    <td className="p-2 font-medium border-b border-border/30 text-sm whitespace-nowrap sticky left-0 bg-card z-10">{loc}</td>
                    {weekDates.map((wd: any) => {
                      const dateIso = typeof wd === "string" ? wd : wd.date_iso;
                      const isToday = typeof wd === "object" && wd.is_today;
                      const isPast = typeof wd === "object" && wd.is_past;
                      const cellKey = `${dateIso}:${loc}`;
                      const cell = cells[cellKey];

                      const employees: any[] = cell?.employees || [];
                      const event = cell?.event || "";
                      const status = cell?.status || "off";

                      const bgClass = isToday
                        ? "bg-primary/5"
                        : status === "off"
                        ? ""
                        : isPast
                        ? "bg-muted/20"
                        : "";

                      return (
                        <td
                          key={dateIso}
                          className={`p-2 border-b border-border/30 text-center align-top ${bgClass}`}
                        >
                          {employees.length > 0 ? (
                            <div className="space-y-0.5">
                              {employees.map((emp: any, idx: number) => (
                                <div key={idx} className="text-xs">
                                  {typeof emp === "string" ? emp : emp.name || ""}
                                </div>
                              ))}
                            </div>
                          ) : status === "off" ? (
                            <span className="text-xs text-muted-foreground/30">—</span>
                          ) : (
                            <span className="text-xs text-amber-400/60">?</span>
                          )}
                          {event && (
                            <div className="text-xs text-amber-400/80 mt-1 max-w-[120px] mx-auto truncate" title={event}>
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

      {data.draft_schedule && data.draft_schedule.table && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <Users className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Черновик: {data.draft_schedule.week_title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-6 px-6">
              {data.draft_schedule.table.headers && data.draft_schedule.table.rows ? (
                <table className="w-full text-sm border-collapse min-w-[600px]">
                  <thead>
                    <tr>
                      {data.draft_schedule.table.headers.map((h: string) => (
                        <th key={h} className="text-left p-2 text-muted-foreground font-medium border-b border-border/50 text-xs">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.draft_schedule.table.rows.map((row: any, i: number) => {
                      const cols = data.draft_schedule.table.headers;
                      return (
                        <tr key={i}>
                          {cols.map((col: string) => (
                            <td key={col} className="p-2 border-b border-border/30 text-xs">
                              {row[col] || "—"}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : Array.isArray(data.draft_schedule.table) && data.draft_schedule.table.length > 0 ? (
                <table className="w-full text-sm border-collapse min-w-[600px]">
                  <thead>
                    <tr>
                      {Object.keys(data.draft_schedule.table[0]).filter(k => !k.startsWith("_")).map((key) => (
                        <th key={key} className="text-left p-2 text-muted-foreground font-medium border-b border-border/50 text-xs">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.draft_schedule.table.map((row: any, i: number) => (
                      <tr key={i}>
                        {Object.entries(row).filter(([k]) => !k.startsWith("_")).map(([k, val]: [string, any]) => (
                          <td key={k} className="p-2 border-b border-border/30 text-xs">
                            {val || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
            {data.draft_schedule.warnings && data.draft_schedule.warnings.length > 0 && (
              <div className="mt-3 space-y-1">
                {data.draft_schedule.warnings.map((w: any, i: number) => (
                  <div key={i} className="text-xs text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    {typeof w === "string" ? w : JSON.stringify(w)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {data.concert_tomorrow && data.concert_tomorrow.items && data.concert_tomorrow.items.length > 0 && (
        <Card className="border-amber-500/20">
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <CardTitle className="text-base">Мероприятия завтра ({data.concert_tomorrow.tomorrow_date_iso})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.concert_tomorrow.items.map((item: any, i: number) => (
                <div
                  key={i}
                  className={`p-3 rounded-md text-sm ${
                    item.severity === "critical" ? "bg-red-500/10 border border-red-500/20" : "bg-amber-500/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.location}: {item.event}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Персонал: {item.employees?.join(", ")} ({item.assigned_count}/{item.target_staff})
                      </p>
                    </div>
                    {item.needs_second_staff && (
                      <Badge variant="destructive" className="text-xs shrink-0">
                        Нужен ещё сотрудник
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
