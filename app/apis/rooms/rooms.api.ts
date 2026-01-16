import { fetchJson } from "@/lib/http";

export type RoomType = "PUBLIC" | "PRIVATE" | "VIDEO_GROUP" | "VIDEO_1ON1";

export type Room = {
  id: string;
  type: RoomType;
  slug: string;
  title: string;
  maxUsers?: number | null;
  isOpen?: boolean | null;
};

export async function listRooms(args?: {
  type?: RoomType;
  q?: string;
  limit?: number;
  cursor?: string;
}) {
  const p = new URLSearchParams();
  if (args?.type) p.set("type", args.type);
  if (args?.q) p.set("q", args.q);
  if (args?.limit) p.set("limit", String(args.limit));
  if (args?.cursor) p.set("cursor", args.cursor);
  const qs = p.toString();
  return fetchJson<any>(`/rooms${qs ? `?${qs}` : ""}`);
}

export async function getRoom(id: string) {
  return fetchJson<any>(`/rooms/${id}`);
}

export async function createRoom(body: {
  type: RoomType;
  slug: string;
  title: string;
  maxUsers?: number;
}) {
  return fetchJson<any>("/rooms", { method: "POST", body });
}

export async function patchRoom(
  id: string,
  body: { title?: string; maxUsers?: number; isOpen?: boolean }
) {
  return fetchJson<any>(`/rooms/${id}`, { method: "PATCH", body });
}

export async function deleteRoom(id: string) {
  return fetchJson<any>(`/rooms/${id}`, { method: "DELETE" });
}

export async function joinRoom(roomId: string) {
  return fetchJson<any>(`/rooms/${roomId}/join`, { method: "POST" });
}

export async function leaveRoom(roomId: string) {
  return fetchJson<any>(`/rooms/${roomId}/leave`, { method: "POST" });
}

export async function listRoomMembers(roomId: string, limit = 100) {
  return fetchJson<any>(
    `/rooms/${roomId}/members?limit=${encodeURIComponent(String(limit))}`
  );
}

export async function kickRoomMember(roomId: string, targetSessionId: string) {
  return fetchJson<any>(`/rooms/${roomId}/kick`, {
    method: "POST",
    body: { targetSessionId },
  });
}

export async function banRoomMember(
  roomId: string,
  targetSessionId: string,
  minutes?: number
) {
  return fetchJson<any>(`/rooms/${roomId}/ban`, {
    method: "POST",
    body: { targetSessionId, minutes },
  });
}
