import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  AgentCommand,
  AgentCommandStatus,
  ApiResponse,
} from "@/lib/api";

const COMMANDS_KEY = "/api/agent/commands";

type CommandFilter = AgentCommandStatus | "all";

function buildCommandsUrl(filter: CommandFilter) {
  const params = new URLSearchParams();
  params.set("limit", "100");
  if (filter !== "all") {
    params.set("status", filter);
  }
  const qs = params.toString();
  return `${COMMANDS_KEY}${qs ? `?${qs}` : ""}`;
}

function invalidateCommands() {
  queryClient.invalidateQueries({ queryKey: [COMMANDS_KEY] });
}

export function useAgentCommands(filter: CommandFilter = "all") {
  return useQuery<ApiResponse<AgentCommand[]>>({
    queryKey: [COMMANDS_KEY, filter],
    queryFn: async () => {
      const res = await fetch(buildCommandsUrl(filter), {
        credentials: "include",
      });
      return res.json();
    },
    refetchInterval: 10_000,
    staleTime: 4_000,
  });
}

export function useCreateAgentCommand() {
  return useMutation({
    mutationFn: async (payload: {
      source?: string;
      title: string;
      details?: string;
      requiresConfirmation: boolean;
      confirmationPrompt?: string;
      memosQuery?: string;
      memosContext?: string;
      createdBy?: string;
    }) => {
      const res = await apiRequest("POST", COMMANDS_KEY, payload);
      return res.json();
    },
    onSuccess: invalidateCommands,
  });
}

export function useConfirmAgentCommand() {
  return useMutation({
    mutationFn: async (payload: { id: string; actor?: string }) => {
      const res = await apiRequest(
        "POST",
        `${COMMANDS_KEY}/${encodeURIComponent(payload.id)}/confirm`,
        { actor: payload.actor || "operator" },
      );
      return res.json();
    },
    onSuccess: invalidateCommands,
  });
}

export function useRejectAgentCommand() {
  return useMutation({
    mutationFn: async (payload: { id: string; actor?: string; reason?: string }) => {
      const res = await apiRequest(
        "POST",
        `${COMMANDS_KEY}/${encodeURIComponent(payload.id)}/reject`,
        {
          actor: payload.actor || "operator",
          reason: payload.reason || "Rejected by operator",
        },
      );
      return res.json();
    },
    onSuccess: invalidateCommands,
  });
}

export function useStartAgentCommand() {
  return useMutation({
    mutationFn: async (payload: { id: string; actor?: string }) => {
      const res = await apiRequest(
        "POST",
        `${COMMANDS_KEY}/${encodeURIComponent(payload.id)}/start`,
        { actor: payload.actor || "agent" },
      );
      return res.json();
    },
    onSuccess: invalidateCommands,
  });
}

export function useCompleteAgentCommand() {
  return useMutation({
    mutationFn: async (payload: { id: string; actor?: string; result?: string }) => {
      const res = await apiRequest(
        "POST",
        `${COMMANDS_KEY}/${encodeURIComponent(payload.id)}/complete`,
        {
          actor: payload.actor || "agent",
          result: payload.result || "",
        },
      );
      return res.json();
    },
    onSuccess: invalidateCommands,
  });
}

export function useFailAgentCommand() {
  return useMutation({
    mutationFn: async (payload: { id: string; actor?: string; result?: string }) => {
      const res = await apiRequest(
        "POST",
        `${COMMANDS_KEY}/${encodeURIComponent(payload.id)}/fail`,
        {
          actor: payload.actor || "agent",
          result: payload.result || "Execution failed",
        },
      );
      return res.json();
    },
    onSuccess: invalidateCommands,
  });
}
