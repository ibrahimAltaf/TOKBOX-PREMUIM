import { fetchJson } from "@/lib/http";

// Default assumes: /rooms/:roomId/messages
const BASE = ""; // set "/messages" if your backend mounts /messages/rooms/:id/messages

export async function listRoomMessages(
  roomId: string,
  args?: { limit?: number; cursor?: string }
) {
  const p = new URLSearchParams();
  if (args?.limit) p.set("limit", String(args.limit));
  if (args?.cursor) p.set("cursor", args.cursor);
  const qs = p.toString();

  return fetchJson<any>(
    `${BASE}/rooms/${roomId}/messages${qs ? `?${qs}` : ""}`
  );
}

export async function sendRoomMessage(
  roomId: string,
  body: { text?: string; mediaUrls?: string[]; mediaIds?: string[] }
) {
  return fetchJson<any>(`${BASE}/rooms/${roomId}/messages`, {
    method: "POST",
    body,
  });
}
