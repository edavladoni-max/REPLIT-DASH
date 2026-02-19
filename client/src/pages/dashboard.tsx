import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Home,
  Bot,
  ListTodo,
  CalendarDays,
  Truck,
  TrendingUp,
  ScrollText,
  Wallet,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertTriangle,
} from "lucide-react";
import { MskClock } from "@/components/msk-clock";
import { TabHome } from "@/components/tabs/tab-home";
import { TabTasks } from "@/components/tabs/tab-tasks";
import { TabShifts } from "@/components/tabs/tab-shifts";
import { TabSuppliers } from "@/components/tabs/tab-suppliers";
import { TabFinance } from "@/components/tabs/tab-finance";
import { TabJournal } from "@/components/tabs/tab-journal";
import { TabSalary } from "@/components/tabs/tab-salary";
import { TabAgent } from "@/components/tabs/tab-agent";
import { useDashboardState, useSyncWorkspace } from "@/hooks/use-dashboard";

const TAB_CONFIG = [
  { id: "home", label: "Главная", icon: Home },
  { id: "tasks", label: "Задачи", icon: ListTodo },
  { id: "shifts", label: "Смены", icon: CalendarDays },
  { id: "suppliers", label: "Поставщики", icon: Truck },
  { id: "finance", label: "Финансы", icon: TrendingUp },
  { id: "journal", label: "Журнал", icon: ScrollText },
  { id: "salary", label: "ЗП", icon: Wallet },
  { id: "agent", label: "Команды", icon: Bot },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("home");
  const { data: response, isLoading, isError, error, dataUpdatedAt } = useDashboardState();
  const syncWorkspace = useSyncWorkspace();
  const dashData = response?.data;

  const [lastRefresh, setLastRefresh] = useState("");
  useEffect(() => {
    if (dataUpdatedAt) {
      const d = new Date(dataUpdatedAt);
      setLastRefresh(
        d.toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Moscow",
        })
      );
    }
  }, [dataUpdatedAt]);

  const syncLevel = dashData?.sync_meta?.level;
  const hotCount = dashData?.hot_zone?.total_count || 0;

  return (
    <div className="flex flex-col h-screen bg-background" data-testid="dashboard">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg font-bold tracking-tight whitespace-nowrap" data-testid="text-app-title">
              <span className="text-primary">V</span>ЛАДОНИ
            </h1>
            <div className="hidden sm:block h-5 w-px bg-border" />
            <MskClock />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {dashData?.today && (
              <Badge variant="outline" className="hidden md:flex text-xs font-normal gap-1" data-testid="text-today-date">
                <CalendarDays className="w-3 h-3" />
                {dashData.today}
              </Badge>
            )}

            {syncLevel && (
              <Badge
                variant="outline"
                className={`text-xs ${
                  syncLevel === "green"
                    ? "border-emerald-500/30 text-emerald-400"
                    : syncLevel === "yellow"
                    ? "border-amber-500/30 text-amber-400"
                    : "border-red-500/30 text-red-400"
                }`}
                data-testid="badge-sync-status"
              >
                {syncLevel === "green" ? (
                  <Wifi className="w-3 h-3 mr-1" />
                ) : syncLevel === "red" ? (
                  <WifiOff className="w-3 h-3 mr-1" />
                ) : (
                  <Wifi className="w-3 h-3 mr-1" />
                )}
                {dashData?.sync_meta?.age_minutes || 0}м
              </Badge>
            )}

            {hotCount > 0 && (
              <Badge
                variant="outline"
                className="text-xs border-red-500/30 text-red-400 cursor-pointer"
                onClick={() => setActiveTab("home")}
                data-testid="badge-hot-zone"
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                {hotCount}
              </Badge>
            )}

            <Button
              size="icon"
              variant="ghost"
              onClick={() => syncWorkspace.mutate()}
              disabled={syncWorkspace.isPending}
              data-testid="button-sync"
            >
              <RefreshCw className={`w-4 h-4 ${syncWorkspace.isPending ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </header>

      {isError && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-sm text-red-400">
            Ошибка загрузки: {error instanceof Error ? error.message : "Нет связи с сервером"}
          </span>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border/50 bg-background">
          <div className="overflow-x-auto">
            <TabsList className="h-auto bg-transparent p-0 px-2 w-max min-w-full flex gap-0">
              {TAB_CONFIG.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-muted-foreground data-[state=active]:text-foreground text-sm whitespace-nowrap"
                  data-testid={`tab-trigger-${tab.id}`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto">
            <TabsContent value="home" className="mt-0">
              <TabHome data={dashData} isLoading={isLoading} />
            </TabsContent>
            <TabsContent value="tasks" className="mt-0">
              <TabTasks data={dashData} isLoading={isLoading} />
            </TabsContent>
            <TabsContent value="shifts" className="mt-0">
              <TabShifts data={dashData} isLoading={isLoading} />
            </TabsContent>
            <TabsContent value="suppliers" className="mt-0">
              <TabSuppliers data={dashData} isLoading={isLoading} />
            </TabsContent>
            <TabsContent value="finance" className="mt-0">
              <TabFinance data={dashData} isLoading={isLoading} />
            </TabsContent>
            <TabsContent value="journal" className="mt-0">
              <TabJournal data={dashData} isLoading={isLoading} />
            </TabsContent>
            <TabsContent value="salary" className="mt-0">
              <TabSalary data={dashData} isLoading={isLoading} />
            </TabsContent>
            <TabsContent value="agent" className="mt-0">
              <TabAgent />
            </TabsContent>
          </div>
        </div>
      </Tabs>

      <footer className="border-t border-border/30 px-4 py-1.5 flex items-center justify-between text-xs text-muted-foreground/60">
        <span>VЛАДОНИ Control Panel</span>
        <span>
          {lastRefresh && `Обновлено: ${lastRefresh}`}
          {dashData?.generated_at_utc && ` · API: ${new Date(dashData.generated_at_utc).toLocaleTimeString("ru-RU", { timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit" })}`}
        </span>
      </footer>
    </div>
  );
}
