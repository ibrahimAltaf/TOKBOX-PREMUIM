// app/chat/_state/startChatRealtime.ts
"use client";

import { connectSocket } from "../../realtime/socket.client";

let started = false;

/**
 * IMPORTANT:
 * - Do NOT bind msg:new / dm:new here.
 * - socket.client.ts already binds them once (HMR-safe).
 * - This file should only ensure socket is connected.
 */
export function startChatRealtime() {
  if (started) return;
  started = true;

  connectSocket();
}

/**
 * Intentionally no-op.
 * If you need a full teardown, call resetSocket() from socket.client.ts
 * but do that only on full logout/unmount scenarios.
 */
export function stopChatRealtime() {
  // no-op (prevents accidental removeAllListeners which breaks socket.client.ts)
}
