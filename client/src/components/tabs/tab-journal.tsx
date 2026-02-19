import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollText, Clock, MapPin, User } from "lucide-react";
import type { DashboardState, JournalEntry } from "@/lib/api";

function JournalItem({ entry }: { entry: JournalEntry }) {
  const getTypeColor = (type: string) => {
    if (type === "error" || type === "alert") return "border-red-500/30 text-red-400";
    if (type === "warning") return "border-amber-500/30 text-amber-400";
    if (type === "shift" || type === "shift_start" || type === "shift_end") return "border-blue-500/30 text-blue-400";
    if (type === "task") return "border-emerald-500/30 text-emerald-400";
    if (type === "finance") return "border-purple-500/30 text-purple-400";
    return "border-zinc-500/30 text-zinc-400";
  };

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      shift_start: "Начало смены",
      shift_end: "Конец смены",
      shift: "Смена",
      task: "Задача",
      finance: "Финансы",
      alert: "Внимание",
      error: "Ошибка",
      warning: "Предупреждение",
      order: "Заказ",
      delivery: "Поставка",
      system: "Система",
      note: "Заметка",
      supplier: "Поставщик",
      ops: "Операции",
    };
    return map[type] || type;
  };

  return (
    <div className="flex gap-3 p-3 rounded-md bg-muted/50" data-testid={`journal-entry-${entry.time}`}>
      <div className="shrink-0 pt-0.5">
        <span className="font-mono text-xs text-muted-foreground">{entry.time}</span>
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-xs ${getTypeColor(entry.type)}`}>
            {getTypeLabel(entry.type)}
          </Badge>
          {entry.location && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {entry.location}
            </span>
          )}
          {entry.actor && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="w-3 h-3" />
              {entry.actor}
            </span>
          )}
        </div>
        <p className="text-sm">{entry.text}</p>
      </div>
    </div>
  );
}

export function TabJournal({ data, isLoading }: { data?: DashboardState; isLoading: boolean }) {
  if (isLoading || !data) {
    return (
      <div className="p-4">
        <Card>
          <CardHeader className="pb-3"><Skeleton className="h-5 w-40" /></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const events = data.journal_today || [];
  const dailyEvents = data.daily_events;

  return (
    <div className="space-y-4 p-4" data-testid="tab-journal">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <div className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Журнал событий</CardTitle>
          </div>
          {dailyEvents && (
            <Badge variant="secondary" className="text-xs">
              {dailyEvents.total || events.length} событий
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {events.length > 0 ? (
            <div className="space-y-2">
              {events.map((entry, i) => (
                <JournalItem key={i} entry={entry} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ScrollText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Событий за сегодня пока нет</p>
            </div>
          )}
        </CardContent>
      </Card>

      {dailyEvents && dailyEvents.by_type && Object.keys(dailyEvents.by_type).length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base">Статистика по типам</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(dailyEvents.by_type).map(([type, count]: [string, any]) => (
                <Badge key={type} variant="outline" className="text-xs">
                  {type}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
