// src/apis/users/users.api.ts
import { fetchJson } from "@/lib/http";

export async function listOnlineUsers(args?: { limit?: number; cursor?: string }) {
  const p = new URLSearchParams();
  if (args?.limit) p.set("limit", String(args.limit));
  if (args?.cursor) p.set("cursor", args.cursor);
  const qs = p.toString();
  return fetchJson<any>(`/users/online${qs ? `?${qs}` : ""}`);
}

export async function listUsersPics(args?: {
  q?: string;
  limit?: number;
  cursor?: string;
  onlineOnly?: boolean;
}) {
  const p = new URLSearchParams();
  if (args?.q) p.set("q", args.q);
  if (args?.limit) p.set("limit", String(args.limit));
  if (args?.cursor) p.set("cursor", args.cursor);
  if (args?.onlineOnly !== undefined) p.set("onlineOnly", String(args.onlineOnly));
  const qs = p.toString();
  return fetchJson<any>(`/users-pics${qs ? `?${qs}` : ""}`);
}
