import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckSquare, Clock, Repeat, AlertTriangle } from "lucide-react";
import type { DashboardState, Task, ChecklistItem } from "@/lib/api";
import { useToggleOps, useChecklistComplete } from "@/hooks/use-dashboard";
import { buildOperationalChecklist } from "@/lib/daily-tasks";

function TaskItem({
  task,
  onToggle,
  isPending,
}: {
  task: Task;
  onToggle: (id: string, done: boolean) => void;
  isPending: boolean;
}) {
  const getPriorityColor = (p: string) => {
    if (p === "high" || p === "critical") return "border-red-500/30 text-red-400";
    if (p === "medium") return "border-amber-500/30 text-amber-400";
    return "";
  };

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-md bg-muted/50 group ${task.is_overdue ? "border border-red-500/20" : ""}`}
      data-testid={`task-${task.id}`}
    >
      <Checkbox
        checked={task.done}
        onCheckedChange={(checked) => onToggle(task.id, !!checked)}
        disabled={isPending}
        className="mt-0.5 shrink-0"
        data-testid={`checkbox-task-${task.id}`}
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${task.done ? "line-through text-muted-foreground" : ""}`}>
          {task.text}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.priority && task.priority !== "normal" && (
            <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </Badge>
          )}
          {task.deadline_at_msk && (
            <span
              className={`text-xs flex items-center gap-1 ${task.is_overdue ? "text-red-400" : "text-muted-foreground"}`}
            >
              <Clock className="w-3 h-3" />
              {task.deadline_at_msk}
            </span>
          )}
          {task.repeat && (
            <span className="text-xs flex items-center gap-1 text-muted-foreground">
              <Repeat className="w-3 h-3" />
              {task.repeat}
            </span>
          )}
          {task.assignee && <span className="text-xs text-muted-foreground">{task.assignee}</span>}
          {task.is_overdue && (
            <Badge variant="outline" className="text-xs border-red-500/30 text-red-400">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Просрочено
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function DailyChecklistItem({
  item,
  onComplete,
  isPending,
}: {
  item: ChecklistItem;
  onComplete: (id: string) => void;
  isPending: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50" data-testid={`checklist-${item.id}`}>
      <Checkbox
        checked={!!item.done}
        onCheckedChange={() => onComplete(item.id)}
        disabled={isPending || !!item.done}
        className="mt-0.5 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${item.done ? "line-through text-muted-foreground" : ""}`}>
          {item.label}
        </p>
        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          <Clock className="w-3 h-3" />
          {item.time}
        </span>
      </div>
    </div>
  );
}

export function TabTasks({ data, isLoading }: { data?: DashboardState; isLoading: boolean }) {
  const toggleOps = useToggleOps();
  const checklistComplete = useChecklistComplete();

  const handleOpsToggle = (id: string, done: boolean) => {
    toggleOps.mutate({ id, done });
  };

  const handleChecklistComplete = (itemId: string) => {
    checklistComplete.mutate({ item_id: itemId, actor: "dashboard" });
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-14 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const operationalChecklist = buildOperationalChecklist(data);
  const pendingOps = data.ops_checklist.filter((t) => !t.done).length;
  const pendingChecklist = operationalChecklist.filter((item) => !item.done).length;

  return (
    <div className="space-y-4 p-4" data-testid="tab-tasks">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Ежедневные операции</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            Осталось: {pendingOps}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.ops_checklist.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={handleOpsToggle}
                isPending={toggleOps.isPending}
              />
            ))}
            {data.ops_checklist.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">
                Операционные задачи на сегодня не найдены
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {operationalChecklist.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">Дополнительно на день</CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs">
              Осталось: {pendingChecklist}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {operationalChecklist.map((item) => (
                <DailyChecklistItem
                  key={item.id}
                  item={item}
                  onComplete={handleChecklistComplete}
                  isPending={checklistComplete.isPending}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.supplier_deadlines.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <Clock className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Дедлайны заказов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.supplier_deadlines.map((deadline) => (
                <div
                  key={deadline.name}
                  className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{deadline.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{deadline.note}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    до {deadline.time}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
