"use client";

import { fetchJson } from "@/lib/http";

export async function getSocketAuthKey(): Promise<{
  ok: true;
  sessionKey: string;
}> {
  return fetchJson<any>("/sessions/socket-auth", { method: "POST", body: {} });
}
