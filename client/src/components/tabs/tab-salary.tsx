import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Wallet, Users, Clock, CalendarDays } from "lucide-react";
import { useSalary, useRoutines } from "@/hooks/use-dashboard";
import type { DashboardState } from "@/lib/api";

export function TabSalary({ data, isLoading }: { data?: DashboardState; isLoading: boolean }) {
  const [week, setWeek] = useState<"current" | "previous">("current");
  const salary = useSalary(week);
  const routines = useRoutines();
  const salaryData = salary.data?.data;
  const routinesData = routines.data?.data;

  if (isLoading || !data) {
    return (
      <div className="space-y-4 p-4">
        <Card><CardHeader className="pb-3"><Skeleton className="h-5 w-40" /></CardHeader><CardContent><Skeleton className="h-60 w-full" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4" data-testid="tab-salary">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Расчёт зарплаты</CardTitle>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={week === "current" ? "default" : "ghost"}
              onClick={() => setWeek("current")}
              data-testid="button-salary-current"
            >
              Текущая неделя
            </Button>
            <Button
              size="sm"
              variant={week === "previous" ? "default" : "ghost"}
              onClick={() => setWeek("previous")}
              data-testid="button-salary-previous"
            >
              Прошлая неделя
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {salary.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : salaryData ? (
            <div className="space-y-3">
              {salaryData.employees ? (
                salaryData.employees.map((emp: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">{emp.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {emp.hours || emp.total_hours || 0}ч
                      </span>
                      <Badge variant="secondary" className="text-xs font-mono">
                        {emp.salary || emp.total || 0} ₽
                      </Badge>
                    </div>
                  </div>
                ))
              ) : salaryData.rows ? (
                salaryData.rows.map((row: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/50">
                    <span className="text-sm font-medium">{row.name || row.employee}</span>
                    <div className="flex items-center gap-3">
                      {row.hours !== undefined && (
                        <span className="text-xs text-muted-foreground">{row.hours}ч</span>
                      )}
                      <Badge variant="secondary" className="text-xs font-mono">
                        {row.total || row.salary || 0} ₽
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm">
                  <pre className="text-muted-foreground whitespace-pre-wrap text-xs">
                    {JSON.stringify(salaryData, null, 2)}
                  </pre>
                </div>
              )}
              {salaryData.total !== undefined && (
                <div className="flex items-center justify-between p-3 rounded-md bg-primary/10 border border-primary/20">
                  <span className="text-sm font-medium">Итого</span>
                  <span className="font-mono font-bold">{salaryData.total} ₽</span>
                </div>
              )}
              {salaryData.week_title && (
                <p className="text-xs text-muted-foreground mt-2">
                  <CalendarDays className="w-3 h-3 inline mr-1" />
                  {salaryData.week_title}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Не удалось загрузить данные</p>
          )}
        </CardContent>
      </Card>

      {routinesData && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <CalendarDays className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Регулярные задачи</CardTitle>
          </CardHeader>
          <CardContent>
            {routinesData.items && Array.isArray(routinesData.items) ? (
              <div className="space-y-2">
                {routinesData.items.map((routine: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{routine.text || routine.title || JSON.stringify(routine)}</p>
                      {routine.schedule && (
                        <p className="text-xs text-muted-foreground mt-0.5">{routine.schedule}</p>
                      )}
                    </div>
                    {routine.active !== undefined && (
                      <Badge variant={routine.active ? "default" : "secondary"} className="text-xs shrink-0">
                        {routine.active ? "Активна" : "Пауза"}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                {JSON.stringify(routinesData, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      )}

      {data.employees && data.employees.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <Users className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base">Сотрудники ({data.employees.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.employees.map((name) => (
                <Badge key={name} variant="outline" className="text-xs">
                  {name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
