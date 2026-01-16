"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ensureSession, getMe, getSocketAuth } from "./sessions.api";

export function useEnsureSessionMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ensureSession,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["session", "me"] });
    },
  });
}

export function useSessionMeQuery(enabled = true) {
  return useQuery({
    queryKey: ["session", "me"],
    queryFn: getMe,
    enabled,
    staleTime: 10_000,
    retry: 0,
  });
}

export function useSocketAuthMutation() {
  return useMutation({
    mutationFn: getSocketAuth,
  });
}
