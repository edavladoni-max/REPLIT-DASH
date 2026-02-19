import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Truck, Clock, Package } from "lucide-react";
import type { DashboardState } from "@/lib/api";
import { useOrderCatalog } from "@/hooks/use-dashboard";

export function TabSuppliers({ data, isLoading }: { data?: DashboardState; isLoading: boolean }) {
  const catalog = useOrderCatalog();
  const catalogData = catalog.data?.data;

  if (isLoading || !data) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3"><Skeleton className="h-5 w-40" /></CardHeader>
            <CardContent><div className="space-y-3">{[1, 2].map((j) => <Skeleton key={j} className="h-14 w-full" />)}</div></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4" data-testid="tab-suppliers">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <Clock className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Дедлайны заказов</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.supplier_deadlines.map((d) => {
              const now = new Date();
              const mskNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Moscow" }));
              const [h, m] = d.time.split(":").map(Number);
              const deadlineTime = new Date(mskNow);
              deadlineTime.setHours(h, m, 0, 0);
              const diffMs = deadlineTime.getTime() - mskNow.getTime();
              const diffMin = Math.floor(diffMs / 60000);
              const isPast = diffMin < 0;
              const isUrgent = !isPast && diffMin < 60;

              return (
                <div
                  key={d.name}
                  className={`flex items-center justify-between gap-3 p-4 rounded-md ${
                    isPast ? "bg-zinc-500/10" : isUrgent ? "bg-amber-500/10 border border-amber-500/20" : "bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Truck className={`w-5 h-5 ${isPast ? "text-zinc-500" : isUrgent ? "text-amber-400" : "text-muted-foreground"}`} />
                    <div>
                      <p className={`font-medium ${isPast ? "text-zinc-500" : ""}`}>{d.name}</p>
                      {d.note && <p className="text-xs text-muted-foreground mt-0.5">{d.note}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="font-mono text-sm">
                      до {d.time}
                    </Badge>
                    {!isPast && (
                      <Badge variant={isUrgent ? "destructive" : "secondary"} className="text-xs">
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
            })}
          </div>
        </CardContent>
      </Card>

      {data.deliveries && data.deliveries.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <Package className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Ожидаемые поставки</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.deliveries.map((d) => (
                <div key={d.id} className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                  <span className={`text-sm ${d.done ? "line-through text-muted-foreground" : ""}`}>
                    {d.text}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {catalogData && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <Truck className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Каталог поставщиков</CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(catalogData) ? (
              <div className="space-y-4">
                {catalogData.map((supplier: any, i: number) => (
                  <div key={i} className="space-y-2">
                    <h3 className="font-medium text-sm">{supplier.supplier || supplier.name || `Поставщик ${i + 1}`}</h3>
                    {supplier.items && Array.isArray(supplier.items) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {supplier.items.map((item: any, j: number) => (
                          <div key={j} className="text-xs p-2 rounded bg-muted/50 flex justify-between gap-2">
                            <span>{typeof item === "string" ? item : item.name || item.product || JSON.stringify(item)}</span>
                            {item.unit && <span className="text-muted-foreground">{item.unit}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : typeof catalogData === "object" ? (
              <div className="space-y-4">
                {Object.entries(catalogData).map(([supplierName, items]: [string, any]) => (
                  <div key={supplierName} className="space-y-2">
                    <h3 className="font-medium text-sm">{supplierName}</h3>
                    {Array.isArray(items) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {items.map((item: any, j: number) => (
                          <div key={j} className="text-xs p-2 rounded bg-muted/50">
                            {typeof item === "string" ? item : item.name || JSON.stringify(item)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Каталог загружается...</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
