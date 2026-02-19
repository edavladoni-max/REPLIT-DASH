import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Truck,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import type { DashboardState } from "@/lib/api";

function LocationCard({ status }: { status: { name: string; status: string; note: string } }) {
  const getStatusColor = (s: string) => {
    if (s === "working" || s === "active") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    if (s === "events_only") return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
  };

  const getStatusLabel = (s: string) => {
    if (s === "working" || s === "active") return "Работает";
    if (s === "events_only") return "Мероприятия";
    return "Закрыто";
  };

  const getStatusIcon = (s: string) => {
    if (s === "working" || s === "active") return <CheckCircle2 className="w-4 h-4" />;
    if (s === "events_only") return <AlertCircle className="w-4 h-4" />;
    return <XCircle className="w-4 h-4" />;
  };

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/50" data-testid={`location-${status.name}`}>
      <div className="flex items-center gap-2 min-w-0">
        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="font-medium truncate">{status.name}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="outline" className={`${getStatusColor(status.status)} text-xs border`}>
          {getStatusIcon(status.status)}
          <span className="ml-1">{getStatusLabel(status.status)}</span>
        </Badge>
      </div>
    </div>
  );
}

function SupplierCountdown({ deadline }: { deadline: { name: string; time: string; note: string } }) {
  const now = new Date();
  const mskNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Moscow" }));
  const [h, m] = deadline.time.split(":").map(Number);
  const deadlineTime = new Date(mskNow);
  deadlineTime.setHours(h, m, 0, 0);
  const diffMs = deadlineTime.getTime() - mskNow.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const isPast = diffMin < 0;
  const isUrgent = !isPast && diffMin < 60;

  return (
    <div
      className={`flex items-center justify-between gap-3 p-3 rounded-md ${
        isPast
          ? "bg-zinc-500/10"
          : isUrgent
          ? "bg-amber-500/10 border border-amber-500/20"
          : "bg-muted/50"
      }`}
      data-testid={`supplier-${deadline.name}`}
    >
      <div className="flex items-center gap-2">
        <Truck className={`w-4 h-4 ${isPast ? "text-zinc-500" : isUrgent ? "text-amber-400" : "text-muted-foreground"}`} />
        <span className={`font-medium ${isPast ? "text-zinc-500 line-through" : ""}`}>{deadline.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">до {deadline.time}</span>
        {!isPast && (
          <Badge variant="outline" className={`text-xs ${isUrgent ? "border-amber-500/30 text-amber-400" : "text-muted-foreground"}`}>
            {Math.floor(diffMin / 60)}ч {diffMin % 60}м
          </Badge>
        )}
        {isPast && (
          <Badge variant="outline" className="text-xs text-zinc-500 border-zinc-500/30">
            Истекло
          </Badge>
        )}
      </div>
    </div>
  );
}

export function TabHome({ data, isLoading }: { data?: DashboardState; isLoading: boolean }) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
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
              {data.hot_zone.overdue_tasks.map((t) => (
                <div key={t.id} className="flex items-start gap-2 p-2 rounded-md bg-red-500/10 text-sm">
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <span className="text-red-300">{t.text}</span>
                </div>
              ))}
              {data.hot_zone.stale_tasks.map((t) => (
                <div key={t.id} className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 text-sm">
                  <Clock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <span className="text-amber-300">{t.text}</span>
                </div>
              ))}
              {data.hot_zone.upcoming_deadlines.map((t) => (
                <div key={t.id} className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 text-sm">
                  <Clock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <span>{t.text} — {t.deadline_at_msk}</span>
                </div>
              ))}
              {data.hot_zone.staffing_warnings.map((w: any, i: number) => (
                <div key={`sw-${i}`} className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <span>{typeof w === "string" ? w : w.text || JSON.stringify(w)}</span>
                </div>
              ))}
              {data.hot_zone.triggered_alerts.map((a: any, i: number) => (
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

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <MapPin className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Локации</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.location_statuses.map((s) => (
              <LocationCard key={s.name} status={s} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <Clock className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Смены сегодня</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.today_shifts.map((shift, i) => {
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <Truck className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Дедлайны поставщиков</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.supplier_deadlines.map((d) => (
              <SupplierCountdown key={d.name} deadline={d} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <TrendingUp className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Финансы</CardTitle>
        </CardHeader>
        <CardContent>
          {data.finance ? (
            <div className="space-y-2 text-sm">
              <pre className="text-muted-foreground whitespace-pre-wrap">
                {JSON.stringify(data.finance, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Финансовые данные не доступны</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <Calendar className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Ключевые даты</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.key_dates.map((kd, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                <Badge variant="outline" className="shrink-0 text-xs font-mono">
                  {kd.date_display}
                </Badge>
                <span className="text-sm">{kd.description}</span>
              </div>
            ))}
            {data.key_dates.length === 0 && (
              <p className="text-sm text-muted-foreground">Нет ключевых дат</p>
            )}
          </div>
        </CardContent>
      </Card>

      {data.concert_tomorrow && data.concert_tomorrow.items && data.concert_tomorrow.items.length > 0 && (
        <Card className="lg:col-span-2 border-amber-500/20">
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <CardTitle className="text-base">
              Мероприятия завтра ({data.concert_tomorrow.tomorrow_date_iso})
            </CardTitle>
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
                        Аудитория: {item.audience} · Персонал: {item.employees?.join(", ")} ({item.assigned_count}/{item.target_staff})
                      </p>
                    </div>
                    {item.needs_second_staff && (
                      <Badge variant="destructive" className="text-xs shrink-0">
                        Нужен ещё
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
