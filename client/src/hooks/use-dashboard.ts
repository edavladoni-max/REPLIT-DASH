import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { DashboardState, ApiResponse } from "@/lib/api";

export function useDashboardState() {
  return useQuery<ApiResponse<DashboardState>>({
    queryKey: ["/api/state"],
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

export function useJournal(date?: string) {
  const params = date ? `?date=${date}` : "";
  return useQuery<ApiResponse<any>>({
    queryKey: ["/api/journal", date || "today"],
    queryFn: async () => {
      const res = await fetch(`/api/journal${params}`, { credentials: "include" });
      return res.json();
    },
    staleTime: 30000,
  });
}

export function useSalary(week: string = "current") {
  return useQuery<ApiResponse<any>>({
    queryKey: ["/api/salary/calculate", week],
    queryFn: async () => {
      const res = await fetch(`/api/salary/calculate?week=${week}`, { credentials: "include" });
      return res.json();
    },
    staleTime: 60000,
  });
}

export function useOrderCatalog() {
  return useQuery<ApiResponse<any>>({
    queryKey: ["/api/order/catalog"],
    staleTime: 120000,
  });
}

export function useRoutines() {
  return useQuery<ApiResponse<any>>({
    queryKey: ["/api/routines"],
    staleTime: 60000,
  });
}

export function useToggleTask() {
  return useMutation({
    mutationFn: async (params: { id: string; done: boolean }) => {
      const res = await apiRequest("POST", "/api/tasks/toggle", params);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/state"] });
    },
  });
}

export function useToggleOps() {
  return useMutation({
    mutationFn: async (params: { id: string; done: boolean }) => {
      const res = await apiRequest("POST", "/api/ops/toggle", params);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/state"] });
    },
  });
}

export function useAddTask() {
  return useMutation({
    mutationFn: async (params: { text: string; priority?: string; deadline?: string }) => {
      const res = await apiRequest("POST", "/api/tasks/add", params);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/state"] });
    },
  });
}

export function useSyncWorkspace() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sync", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/state"] });
    },
  });
}

export function useRegenerateDay() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/day/regenerate", { actor: "dashboard" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/state"] });
    },
  });
}

export function useGridCellSave() {
  return useMutation({
    mutationFn: async (params: any) => {
      const res = await apiRequest("POST", "/api/grid/cell/save", params);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/state"] });
    },
  });
}

export function useDraftScheduleSave() {
  return useMutation({
    mutationFn: async (params: any) => {
      const res = await apiRequest("POST", "/api/draft-schedule/save", params);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/state"] });
    },
  });
}

export function useChecklistComplete() {
  return useMutation({
    mutationFn: async (params: { item_id: string; actor?: string }) => {
      const res = await apiRequest("POST", "/api/checklist/complete", params);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/state"] });
    },
  });
}
