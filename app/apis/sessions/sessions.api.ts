// src/apis/sessions/sessions.api.ts
"use client";

import { fetchJson } from "@/lib/http";

export type EnsureSessionBody = {
  nickname?: string;
  about?: string;
  avatarUrl?: string;
  fingerprint?: string;
  photos?: string[];
  introVideoUrl?: string;
};

export type UpdateMeBody = {
  nickname?: string;
  about?: string;

  avatarUrl?: string;
  avatarMediaId?: string;

  photos?: string[];
  photoMediaIds?: string[];

  introVideoUrl?: string;
  introVideoMediaId?: string;
};

export async function ensureSession(body?: EnsureSessionBody) {
  return fetchJson<any>("/sessions/ensure", {
    method: "POST",
    body: body ?? {},
  });
}

export async function getMe() {
  return fetchJson<any>("/sessions/me", { method: "GET" });
}

export async function patchMe(body: UpdateMeBody) {
  return fetchJson<any>("/sessions/me", { method: "PATCH", body });
}

export async function deleteMe() {
  return fetchJson<any>("/sessions/me", { method: "DELETE" });
}

/**
 * Backend: POST /sessions/socket-auth => { ok: true, sessionKey }
 * Used for socket handshake auth fallback (esp cross-site cookie issues).
 */
export async function socketAuth() {
  return fetchJson<{ ok: true; sessionKey: string }>("/sessions/socket-auth", {
    method: "POST",
    body: {},
  });
}
