import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, DollarSign, CreditCard, Banknote } from "lucide-react";
import type { DashboardState } from "@/lib/api";

export function TabFinance({ data, isLoading }: { data?: DashboardState; isLoading: boolean }) {
  if (isLoading || !data) {
    return (
      <div className="p-4">
        <Card>
          <CardHeader className="pb-3"><Skeleton className="h-5 w-40" /></CardHeader>
          <CardContent><Skeleton className="h-60 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  const fin = data.finance;

  if (!fin) {
    return (
      <div className="p-4" data-testid="tab-finance">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Финансы</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Финансовые данные не доступны на сегодня</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Данные появляются после закрытия смены</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderFinanceData = (finData: any) => {
    if (typeof finData === "string") {
      return <p className="text-sm">{finData}</p>;
    }
    if (Array.isArray(finData)) {
      return (
        <div className="space-y-3">
          {finData.map((item: any, i: number) => (
            <div key={i} className="p-4 rounded-md bg-muted/50">
              {typeof item === "string" ? (
                <p className="text-sm">{item}</p>
              ) : (
                <div className="space-y-2">
                  {item.date && <p className="font-medium text-sm">{item.date}</p>}
                  {item.location && <p className="text-xs text-muted-foreground">{item.location}</p>}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                    {item.revenue !== undefined && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                        <div>
                          <p className="text-xs text-muted-foreground">Выручка</p>
                          <p className="text-sm font-medium">{item.revenue} ₽</p>
                        </div>
                      </div>
                    )}
                    {item.cash !== undefined && (
                      <div className="flex items-center gap-2">
                        <Banknote className="w-4 h-4 text-amber-400" />
                        <div>
                          <p className="text-xs text-muted-foreground">Наличные</p>
                          <p className="text-sm font-medium">{item.cash} ₽</p>
                        </div>
                      </div>
                    )}
                    {item.card !== undefined && (
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-blue-400" />
                        <div>
                          <p className="text-xs text-muted-foreground">Безнал</p>
                          <p className="text-sm font-medium">{item.card} ₽</p>
                        </div>
                      </div>
                    )}
                    {item.checks !== undefined && (
                      <div>
                        <p className="text-xs text-muted-foreground">Чеки</p>
                        <p className="text-sm font-medium">{item.checks}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
    if (typeof finData === "object") {
      return (
        <div className="space-y-3">
          {Object.entries(finData).map(([key, value]: [string, any]) => (
            <div key={key} className="flex items-center justify-between p-3 rounded-md bg-muted/50">
              <span className="text-sm text-muted-foreground">{key}</span>
              <span className="text-sm font-medium">
                {typeof value === "object" ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4" data-testid="tab-finance">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <TrendingUp className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Финансы</CardTitle>
        </CardHeader>
        <CardContent>{renderFinanceData(fin)}</CardContent>
      </Card>
    </div>
  );
}
