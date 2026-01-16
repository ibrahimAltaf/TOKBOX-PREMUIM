// src/apis/messages/messages.api.ts
import { fetchJson } from "@/lib/http";
import { API_ROUTES } from "../_routes";

export async function listRoomMessages(
  roomId: string,
  args?: { limit?: number; cursor?: string }
) {
  const p = new URLSearchParams();
  if (args?.limit) p.set("limit", String(args.limit));
  if (args?.cursor) p.set("cursor", args.cursor);
  const qs = p.toString();

  // backend: GET /messages/rooms/:roomId/messages
  return fetchJson<any>(
    `${API_ROUTES.messages}/rooms/${roomId}/messages${qs ? `?${qs}` : ""}`
  );
}

export async function sendRoomMessage(
  roomId: string,
  body: { text?: string; mediaUrls?: string[]; mediaIds?: string[] }
) {
  // backend: POST /messages/rooms/:roomId/messages (requires session)
  return fetchJson<any>(`${API_ROUTES.messages}/rooms/${roomId}/messages`, {
    method: "POST",
    body,
  });
}
