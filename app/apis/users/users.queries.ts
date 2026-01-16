import { useQuery } from "@tanstack/react-query";
import { listUsersPics } from "./users.api";

export function useUsersPicsQuery(args?: {
  q?: string;
  limit?: number;
  onlineOnly?: boolean;
}) {
  return useQuery({
    queryKey: ["users-pics", args ?? {}],
    queryFn: () => listUsersPics(args),
    staleTime: 5_000,
    refetchInterval: 5_000,
  });
}
