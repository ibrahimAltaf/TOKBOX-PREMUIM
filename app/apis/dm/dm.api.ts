// src/apis/dm/dm.api.ts
import { fetchJson } from "@/lib/http";

export async function openDmThread(targetSessionId: string) {
  return fetchJson<any>("/dm/threads", {
    method: "POST",
    body: { targetSessionId },
  });
}

export async function listDmThreads(args?: {
  limit?: number;
  cursor?: string;
}) {
  const p = new URLSearchParams();
  if (args?.limit) p.set("limit", String(args.limit));
  if (args?.cursor) p.set("cursor", args.cursor);
  const qs = p.toString();
  return fetchJson<any>(`/dm/threads${qs ? `?${qs}` : ""}`);
}

export async function listDmMessages(
  threadId: string,
  args?: { limit?: number; cursor?: string }
) {
  const p = new URLSearchParams();
  if (args?.limit) p.set("limit", String(args.limit));
  if (args?.cursor) p.set("cursor", args.cursor);
  const qs = p.toString();
  return fetchJson<any>(
    `/dm/threads/${threadId}/messages${qs ? `?${qs}` : ""}`
  );
}

export async function sendDmMessage(
  threadId: string,
  body: { text?: string; mediaUrls?: string[]; mediaIds?: string[] }
) {
  return fetchJson<any>(`/dm/threads/${threadId}/messages`, {
    method: "POST",
    body,
  });
}
