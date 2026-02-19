import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AgentCommand, AgentCommandStatus } from "@/lib/api";
import {
  useAgentCommands,
  useCompleteAgentCommand,
  useConfirmAgentCommand,
  useCreateAgentCommand,
  useFailAgentCommand,
  useRejectAgentCommand,
  useStartAgentCommand,
} from "@/hooks/use-agent-commands";

const STATUS_LABELS: Record<AgentCommandStatus, string> = {
  pending_confirmation: "Ждёт подтверждения",
  confirmed: "Подтверждено",
  rejected: "Отклонено",
  in_progress: "В работе",
  completed: "Завершено",
  failed: "С ошибкой",
};

const STATUS_CLASS: Record<AgentCommandStatus, string> = {
  pending_confirmation: "border-amber-500/30 text-amber-300",
  confirmed: "border-sky-500/30 text-sky-300",
  rejected: "border-zinc-500/30 text-zinc-300",
  in_progress: "border-indigo-500/30 text-indigo-300",
  completed: "border-emerald-500/30 text-emerald-300",
  failed: "border-red-500/30 text-red-300",
};

type FilterStatus = AgentCommandStatus | "all";

function formatWhen(value: string) {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

function CommandActions({ command }: { command: AgentCommand }) {
  const confirmMutation = useConfirmAgentCommand();
  const rejectMutation = useRejectAgentCommand();
  const startMutation = useStartAgentCommand();
  const completeMutation = useCompleteAgentCommand();
  const failMutation = useFailAgentCommand();

  const busy =
    confirmMutation.isPending ||
    rejectMutation.isPending ||
    startMutation.isPending ||
    completeMutation.isPending ||
    failMutation.isPending;

  if (command.status === "pending_confirmation") {
    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="default"
          disabled={busy}
          onClick={() => {
            confirmMutation.mutate({ id: command.id, actor: "operator" });
          }}
        >
          Подтвердить
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => {
            const reason =
              window.prompt("Почему отклоняем?", "Нет подтверждения от владельца") || "";
            rejectMutation.mutate({ id: command.id, actor: "operator", reason });
          }}
        >
          Отклонить
        </Button>
      </div>
    );
  }

  if (command.status === "confirmed") {
    return (
      <Button
        size="sm"
        variant="default"
        disabled={busy}
        onClick={() => startMutation.mutate({ id: command.id, actor: "agent" })}
      >
        Взять в работу
      </Button>
    );
  }

  if (command.status === "in_progress") {
    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="default"
          disabled={busy}
          onClick={() => {
            const result = window.prompt("Короткий итог выполнения", "Сделано") || "";
            completeMutation.mutate({ id: command.id, actor: "agent", result });
          }}
        >
          Завершить
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={busy}
          onClick={() => {
            const reason = window.prompt("Причина ошибки", "Не удалось выполнить") || "";
            failMutation.mutate({ id: command.id, actor: "agent", result: reason });
          }}
        >
          Ошибка
        </Button>
      </div>
    );
  }

  return null;
}

function CommandCard({ command }: { command: AgentCommand }) {
  return (
    <Card key={command.id} className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{command.title}</CardTitle>
          <Badge variant="outline" className={STATUS_CLASS[command.status]}>
            {STATUS_LABELS[command.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {command.details && <p className="text-muted-foreground">{command.details}</p>}

        {command.confirmationPrompt && command.status === "pending_confirmation" && (
          <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2 text-amber-200">
            {command.confirmationPrompt}
          </div>
        )}

        {command.memosQuery && (
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">MemOS Query</p>
            <p className="text-muted-foreground">{command.memosQuery}</p>
          </div>
        )}

        {command.memosContext && (
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">MemOS Context</p>
            <p className="whitespace-pre-wrap text-muted-foreground">{command.memosContext}</p>
          </div>
        )}

        {(command.result || command.error) && (
          <div className="rounded-md border border-border/60 bg-muted/20 p-2">
            {command.result && <p>Итог: {command.result}</p>}
            {command.error && <p className="text-red-300">Ошибка: {command.error}</p>}
          </div>
        )}

        <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
          <p>Создано: {formatWhen(command.createdAt)}</p>
          <p>Источник: {command.source || "—"}</p>
          <p>Подтвердил: {command.confirmedBy || "—"}</p>
          <p>Старт: {formatWhen(command.startedAt)}</p>
          <p>Финиш: {formatWhen(command.finishedAt)}</p>
          <p>Автор: {command.createdBy || "—"}</p>
        </div>

        <CommandActions command={command} />
      </CardContent>
    </Card>
  );
}

export function TabAgent() {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [memosQuery, setMemosQuery] = useState("");
  const [memosContext, setMemosContext] = useState("");
  const [requiresConfirmation, setRequiresConfirmation] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");

  const commandsQuery = useAgentCommands(filter);
  const createMutation = useCreateAgentCommand();

  const commands = useMemo(
    () => (Array.isArray(commandsQuery.data?.data) ? commandsQuery.data?.data : []),
    [commandsQuery.data],
  );

  const canSubmit = title.trim().length >= 3 && !createMutation.isPending;

  return (
    <div className="space-y-4 p-4" data-testid="tab-agent">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Новая команда для агента</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="agent-title">Что сделать</Label>
            <Input
              id="agent-title"
              placeholder="Например: пересчитать зарплату и проверить дедлайны"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="agent-details">Детали</Label>
            <Textarea
              id="agent-details"
              placeholder="Контекст задачи, ограничения, приоритет"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="agent-memos-query">MemOS query (опционально)</Label>
            <Input
              id="agent-memos-query"
              placeholder="Что агент должен поискать в MemOS"
              value={memosQuery}
              onChange={(event) => setMemosQuery(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="agent-memos-context">MemOS context (опционально)</Label>
            <Textarea
              id="agent-memos-context"
              placeholder="Краткая выжимка из памяти/контекста"
              value={memosContext}
              onChange={(event) => setMemosContext(event.target.value)}
              rows={3}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={requiresConfirmation}
              onChange={(event) => setRequiresConfirmation(event.target.checked)}
            />
            Требовать подтверждение перед запуском
          </label>
          <Button
            disabled={!canSubmit}
            onClick={() => {
              createMutation.mutate(
                {
                  source: "dashboard",
                  title: title.trim(),
                  details: details.trim() || undefined,
                  requiresConfirmation,
                  confirmationPrompt: requiresConfirmation
                    ? "Подтвердите выполнение этой команды в дашборде."
                    : undefined,
                  memosQuery: memosQuery.trim() || undefined,
                  memosContext: memosContext.trim() || undefined,
                  createdBy: "operator",
                },
                {
                  onSuccess: () => {
                    setTitle("");
                    setDetails("");
                    setMemosQuery("");
                    setMemosContext("");
                  },
                },
              );
            }}
          >
            Добавить команду
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Очередь команд</CardTitle>
            <div className="flex flex-wrap gap-1">
              {(["all", ...Object.keys(STATUS_LABELS)] as FilterStatus[]).map((item) => (
                <Button
                  key={item}
                  size="sm"
                  variant={filter === item ? "default" : "outline"}
                  onClick={() => setFilter(item)}
                >
                  {item === "all" ? "Все" : STATUS_LABELS[item]}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {commandsQuery.isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}
          {!commandsQuery.isLoading && commands.length === 0 && (
            <p className="text-sm text-muted-foreground">Команды пока не созданы.</p>
          )}
          {commands.map((command) => (
            <CommandCard key={command.id} command={command} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
