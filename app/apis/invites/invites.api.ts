// src/apis/invites/invites.api.ts
import { fetchJson } from "@/lib/http";
import { API_ROUTES } from "../_routes";

export type InviteKind = "ROOM" | "DM" | "VIDEO_GROUP" | "VIDEO_1ON1";

/**
 * We support two server route styles:
 * A) /invites/:token + /invites/:token/accept + /invites/:token/revoke  (POST)
 * B) /invites/preview/:token + /invites/accept (POST {token}) + /invites/:token (DELETE revoke)
 *
 * This client tries A first, and falls back to B.
 */
export async function listIncomingInvites(args?: { limit?: number }) {
  const p = new URLSearchParams();
  if (args?.limit) p.set("limit", String(args.limit));
  const qs = p.toString();
  return fetchJson<any>(`${API_ROUTES.invites}/incoming${qs ? `?${qs}` : ""}`);
}

export async function createInvite(body: {
  kind: InviteKind;
  roomId?: string;
  dmThreadId?: string;
  targetSessionId?: string;
  maxUses: number;
  ttlMinutes?: number;
}) {
  return fetchJson<any>(`${API_ROUTES.invites}`, { method: "POST", body });
}

export async function getInvite(token: string) {
  // try style A
  try {
    return await fetchJson<any>(`${API_ROUTES.invites}/${token}`);
  } catch {
    // fallback style B preview
    return fetchJson<any>(`${API_ROUTES.invites}/preview/${token}`);
  }
}

export async function acceptInvite(token: string) {
  // try style A
  try {
    return await fetchJson<any>(`${API_ROUTES.invites}/${token}/accept`, {
      method: "POST",
    });
  } catch {
    // fallback style B
    return fetchJson<any>(`${API_ROUTES.invites}/accept`, {
      method: "POST",
      body: { token },
    });
  }
}

export async function revokeInvite(token: string) {
  // try style A
  try {
    return await fetchJson<any>(`${API_ROUTES.invites}/${token}/revoke`, {
      method: "POST",
    });
  } catch {
    // fallback style B
    return fetchJson<any>(`${API_ROUTES.invites}/${token}`, {
      method: "DELETE",
    });
  }
}
