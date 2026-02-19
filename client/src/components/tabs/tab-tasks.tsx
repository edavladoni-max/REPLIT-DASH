import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ListTodo,
  Plus,
  Clock,
  Repeat,
  AlertTriangle,
  CheckSquare,
} from "lucide-react";
import type { DashboardState, Task, ChecklistItem } from "@/lib/api";
import { useToggleTask, useToggleOps, useAddTask, useChecklistComplete } from "@/hooks/use-dashboard";

function TaskItem({ task, onToggle, isPending }: { task: Task; onToggle: (id: string, done: boolean) => void; isPending: boolean }) {
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
            <span className={`text-xs flex items-center gap-1 ${task.is_overdue ? "text-red-400" : "text-muted-foreground"}`}>
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
          {task.assignee && (
            <span className="text-xs text-muted-foreground">{task.assignee}</span>
          )}
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

function DailyChecklistItem({ item, onComplete, isPending }: { item: ChecklistItem; onComplete: (id: string) => void; isPending: boolean }) {
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
  const [newTaskText, setNewTaskText] = useState("");
  const toggleTask = useToggleTask();
  const toggleOps = useToggleOps();
  const addTask = useAddTask();
  const checklistComplete = useChecklistComplete();

  const handleToggle = (id: string, done: boolean) => {
    toggleTask.mutate({ id, done });
  };

  const handleOpsToggle = (id: string, done: boolean) => {
    toggleOps.mutate({ id, done });
  };

  const handleAddTask = () => {
    if (!newTaskText.trim()) return;
    addTask.mutate({ text: newTaskText.trim() });
    setNewTaskText("");
  };

  const handleChecklistComplete = (itemId: string) => {
    checklistComplete.mutate({ item_id: itemId, actor: "dashboard" });
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3"><Skeleton className="h-5 w-40" /></CardHeader>
            <CardContent><div className="space-y-3">{[1, 2, 3].map((j) => <Skeleton key={j} className="h-14 w-full" />)}</div></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const pendingTasks = data.tasks_today.filter((t) => !t.done);
  const doneTasks = data.tasks_today.filter((t) => t.done);

  return (
    <div className="space-y-4 p-4" data-testid="tab-tasks">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <Plus className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Добавить задачу</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Текст новой задачи..."
              onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
              data-testid="input-new-task"
            />
            <Button onClick={handleAddTask} disabled={addTask.isPending || !newTaskText.trim()} data-testid="button-add-task">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <div className="flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Задачи на сегодня</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            {pendingTasks.length} / {data.tasks_today.length}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {pendingTasks.map((task) => (
              <TaskItem key={task.id} task={task} onToggle={handleToggle} isPending={toggleTask.isPending} />
            ))}
            {doneTasks.length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-2">Выполнено ({doneTasks.length})</p>
                {doneTasks.map((task) => (
                  <TaskItem key={task.id} task={task} onToggle={handleToggle} isPending={toggleTask.isPending} />
                ))}
              </div>
            )}
            {data.tasks_today.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">Задач на сегодня нет</p>
            )}
          </div>
        </CardContent>
      </Card>

      {data.ops_checklist && data.ops_checklist.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <CheckSquare className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Ежедневные операции</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.ops_checklist.map((task) => (
                <TaskItem key={task.id} task={task} onToggle={handleOpsToggle} isPending={toggleOps.isPending} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.daily_checklist && data.daily_checklist.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <Clock className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Чек-лист дня</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.daily_checklist.map((item) => (
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
    </div>
  );
}
