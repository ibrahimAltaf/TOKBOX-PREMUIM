"use client";

import { io, type Socket } from "socket.io-client";
import {
  getChatState,
  pushDmMessage,
  pushRoomMessage,
  pushNotif,
  setChatState,
} from "../store/chat.store";

import type { ServerToClientEvents, ClientToServerEvents } from "./socket.types";

declare global {
  // eslint-disable-next-line no-var
  var __bullchat_sock__:
    | Socket<ServerToClientEvents, ClientToServerEvents>
    | undefined;
  // eslint-disable-next-line no-var
  var __bullchat_sock_bound__: boolean | undefined;
  // eslint-disable-next-line no-var
  var __bullchat_seen__: Map<string, number> | undefined;
  // eslint-disable-next-line no-var
  var __bullchat_vis_bound__: boolean | undefined;
}

let socketSessionKey: string | null = null;

let watchdog: any = null;
let lastConnectAttemptAt = 0;

const WATCHDOG_MS = 1200;
const MIN_RECONNECT_GAP_MS = 800;

// Event dedupe (prevents 2x/3x adds)
const SEEN_TTL_MS = 15_000;
const SEEN_MAX = 2000;

function getSeen() {
  if (!globalThis.__bullchat_seen__) globalThis.__bullchat_seen__ = new Map();
  return globalThis.__bullchat_seen__!;
}

function seenOnce(key: string) {
  const now = Date.now();
  const seen = getSeen();

  if (seen.size > SEEN_MAX) {
    for (const [k, t] of seen) {
      if (now - t > SEEN_TTL_MS) seen.delete(k);
    }
    if (seen.size > SEEN_MAX) {
      let i = 0;
      for (const k of seen.keys()) {
        seen.delete(k);
        i++;
        if (i > Math.floor(SEEN_MAX / 2)) break;
      }
    }
  }

  const t = seen.get(key);
  if (t && now - t < SEEN_TTL_MS) return false;
  seen.set(key, now);
  return true;
}

function playTone() {
  try {
    const a = new Audio("/sounds/ringtone.mp3");
    a.volume = 0.85;
    a.play().catch(() => {});
  } catch {}
}

function browserNotify(title: string, body?: string) {
  try {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      new Notification(title, body ? { body } : undefined);
      return;
    }
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  } catch {}
}

function shouldAlert(kind: "DM" | "ROOM", key: string) {
  const s = getChatState();
  if (kind === "DM" && s.mode === "DM" && s.activeThreadId === key)
    return false;
  if (kind === "ROOM" && s.mode === "ROOM" && s.activeRoomId === key)
    return false;
  return true;
}

function startWatchdog() {
  if (typeof window === "undefined") return;
  if (watchdog) return;

  watchdog = window.setInterval(() => {
    const sock = globalThis.__bullchat_sock__;
    if (!sock) return;

    const hidden =
      typeof document !== "undefined" && document.visibilityState === "hidden";
    if (hidden) return;

    if (sock.connected) return;

    const now = Date.now();
    if (now - lastConnectAttemptAt < MIN_RECONNECT_GAP_MS) return;

    lastConnectAttemptAt = now;
    try {
      sock.connect();
    } catch {}
  }, WATCHDOG_MS);
}

function stopWatchdog() {
  if (watchdog) {
    clearInterval(watchdog);
    watchdog = null;
  }
}

function normalizeMessage(m: any) {
  const ts =
    m?.ts != null
      ? Number(m.ts)
      : m?.createdAt
      ? Date.parse(m.createdAt)
      : Date.now();

  const fromSessionId =
    m?.fromSessionId ??
    m?.senderSessionId ??
    m?.authorSessionId ??
    m?.sessionId ??
    m?.from ??
    null;

  const text = String(m?.text ?? m?.body ?? "");

  const id =
    String(m?.id ?? m?._id ?? "") ||
    `${String(fromSessionId ?? "na")}:${String(ts)}:${text}`;

  const mediaUrls = Array.isArray(m?.mediaUrls) ? m.mediaUrls : [];
  const mediaIds = Array.isArray(m?.mediaIds) ? m.mediaIds : [];

  return { ...m, id, ts, fromSessionId, text, mediaUrls, mediaIds };
}

function bindOnce(sock: Socket<ServerToClientEvents, ClientToServerEvents>) {
  if (globalThis.__bullchat_sock_bound__) return;
  globalThis.__bullchat_sock_bound__ = true;

  // remove (safety) then bind
  sock.off("connect");
  sock.off("disconnect");
  sock.off("connect_error");

  sock.off("dm:new");
  sock.off("msg:new");
  sock.off("typing:update");
  sock.off("presence:update");

  sock.off("call:ring");
  sock.off("call:ended");

  sock.off("invite:new");
  sock.off("invite:accepted");
  sock.off("invite:revoked");

  sock.on("disconnect", (reason: any) => {
    pushNotif({
      kind: "SYSTEM",
      title: "Socket disconnected",
      body: String(reason || "disconnect"),
      read: false,
      ts: Date.now(),
    });
  });

  sock.on("connect_error", (err: any) => {
    pushNotif({
      kind: "SYSTEM",
      title: "Socket error",
      body: String(err?.message || "connect_error"),
      read: false,
      ts: Date.now(),
    });
  });

  sock.on("dm:new", (payload: any) => {
    const tid = String(payload?.threadId ?? "");
    if (!tid) return;

    const msg = normalizeMessage(payload?.message);
    const dedupeKey = `dm:${tid}:${String(msg.id ?? msg.ts)}`;

    if (!seenOnce(dedupeKey)) return;

    pushDmMessage(tid, msg);

    pushNotif({
      kind: "DM",
      title: "New DM",
      body: String(msg?.text || "New message"),
      key: tid,
      read: false,
      ts: Date.now(),
    });

    if (shouldAlert("DM", tid)) {
      playTone();
      browserNotify("New DM", msg?.text || "New message");
    }
  });

  sock.on("msg:new", (payload: any) => {
    const rid = String(payload?.roomId ?? "");
    if (!rid) return;

    const msg = normalizeMessage(payload?.message);
    const dedupeKey = `room:${rid}:${String(msg.id ?? msg.ts)}`;

    if (!seenOnce(dedupeKey)) return;

    pushRoomMessage(rid, msg);

    pushNotif({
      kind: "ROOM",
      title: "New room message",
      body: String(msg?.text || "New message"),
      key: rid,
      read: false,
      ts: Date.now(),
    });

    if (shouldAlert("ROOM", rid)) {
      playTone();
      browserNotify("New room message", msg?.text || "New message");
    }
  });

  sock.on("typing:update", (payload: any) => {
    const roomId = String(payload?.roomId ?? "");
    const sessionId = String(payload?.sessionId ?? "");
    if (!roomId || !sessionId) return;

    setChatState((st) => ({
      typingByRoom: {
        ...(st.typingByRoom ?? {}),
        [roomId]: {
          ...((st.typingByRoom ?? {})[roomId] ?? {}),
          [sessionId]: !!payload?.isTyping,
        },
      },
    }));
  });

  sock.on("presence:update", (payload: any) => {
    const roomId = String(payload?.roomId ?? "");
    if (!roomId) return;

    setChatState((st) => ({
      presenceByRoom: {
        ...(st.presenceByRoom ?? {}),
        [roomId]: Array.isArray(payload?.sessionIds) ? payload.sessionIds : [],
      },
    }));
  });

  sock.on("call:ring", (payload: any) => {
    setChatState({
      incomingCall: {
        callId: String(payload?.callId ?? ""),
        fromSessionId: String(payload?.fromSessionId ?? ""),
        roomId: payload?.roomId ?? null,
        kind: payload?.kind,
      },
    });

    pushNotif({
      kind: "CALL",
      title: "Incoming call",
      body: `From ${String(payload?.fromSessionId ?? "").slice(0, 6)}`,
      key: String(payload?.callId ?? ""),
      read: false,
      ts: Date.now(),
    });

    playTone();
    browserNotify(
      "Incoming call",
      `From ${String(payload?.fromSessionId ?? "").slice(0, 6)}`
    );
  });

  sock.on("call:ended", (payload: any) => {
    const callId = String(payload?.callId ?? "");
    setChatState((st: any) => {
      if (st.incomingCall?.callId === callId) return { incomingCall: null };
      return {};
    });

    pushNotif({
      kind: "CALL",
      title: "Call ended",
      body: String(payload?.reason || "ended"),
      key: callId,
      read: false,
      ts: Date.now(),
    });
  });

  sock.on("invite:new", (payload: any) => {
    pushNotif({
      kind: "INVITE",
      title: "New invite",
      body: payload?.kind ? `Invite: ${payload.kind}` : "Invite received",
      key: payload?.token ? String(payload.token) : undefined,
      read: false,
      ts: Date.now(),
    });
  });

  sock.on("invite:accepted", (payload: any) => {
    pushNotif({
      kind: "INVITE",
      title: "Invite accepted",
      body: payload?.kind ? `Accepted: ${payload.kind}` : "Invite accepted",
      key: payload?.token ? String(payload.token) : undefined,
      read: false,
      ts: Date.now(),
    });
  });

  sock.on("invite:revoked", (payload: any) => {
    pushNotif({
      kind: "INVITE",
      title: "Invite revoked",
      body: payload?.token ? `Token: ${payload.token}` : "Invite revoked",
      key: payload?.token ? String(payload.token) : undefined,
      read: false,
      ts: Date.now(),
    });
  });

  if (typeof document !== "undefined" && !globalThis.__bullchat_vis_bound__) {
    globalThis.__bullchat_vis_bound__ = true;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        try {
          globalThis.__bullchat_sock__?.connect();
        } catch {}
      }
    });
  }
}

export function setSocketSessionKey(key: string | null | undefined) {
  socketSessionKey = key ? String(key) : null;

  const sock = globalThis.__bullchat_sock__;
  if (sock) {
    try {
      sock.auth = socketSessionKey ? ({ sessionKey: socketSessionKey } as any) : {};
      sock.disconnect();
      sock.connect();
    } catch {}
  }
}

function getSocketUrl() {
  return (
    process.env.NEXT_PUBLIC_SOCKET_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    "https://tokbox.nl"
  );
}

export function connectSocket() {
  if (globalThis.__bullchat_sock__) return globalThis.__bullchat_sock__!;

  const url = getSocketUrl();

  const sock = io(url, {
    transports: ["websocket"],
    withCredentials: true,

    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 600,
    reconnectionDelayMax: 4000,
    randomizationFactor: 0.2,
    timeout: 8000,

    auth: socketSessionKey ? { sessionKey: socketSessionKey } : undefined,
  });

  globalThis.__bullchat_sock__ = sock;

  bindOnce(sock);
  startWatchdog();

  return sock;
}

export function getSocket() {
  return globalThis.__bullchat_sock__ ?? null;
}

export function resetSocket() {
  try {
    globalThis.__bullchat_sock__?.disconnect();
  } catch {}
  globalThis.__bullchat_sock__ = undefined;
  globalThis.__bullchat_sock_bound__ = false;
  stopWatchdog();
}
