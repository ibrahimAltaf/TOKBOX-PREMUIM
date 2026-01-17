// app/realtime/socket.client.ts
"use client";

import { io, type Socket } from "socket.io-client";
import {
  getChatState,
  pushDmMessage,
  pushRoomMessage,
  pushNotif,
  setChatState,
} from "../store/chat.store";

let sock: Socket | null = null;
let bound = false;

let socketSessionKey: string | null = null;

function playTone() {
  try {
    const a = new Audio("/sounds/notify.mp3");
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
  if (kind === "DM" && s.mode === "DM" && s.activeThreadId === key) return false;
  if (kind === "ROOM" && s.mode === "ROOM" && s.activeRoomId === key) return false;
  return true;
}

function bindOnce(s: Socket) {
  if (bound) return;
  bound = true;

  s.on("connect", () => {});

  s.on("connect_error", (err: any) => {
    // console.log("[socket] connect_error", err?.message || err);
    pushNotif({
      kind: "SYSTEM",
      title: "Socket error",
      body: String(err?.message || "connect_error"),
      read: false,
      ts: Date.now(),
    });
  });

  s.on("dm:new", ({ threadId, message }) => {
    const tid = String(threadId);
    pushDmMessage(tid, message);

    pushNotif({
      kind: "DM",
      title: "New DM",
      body: String(message?.text || "New message"),
      key: tid,
      read: false,
      ts: Date.now(),
    });

    if (shouldAlert("DM", tid)) {
      playTone();
      browserNotify("New DM", message?.text || "New message");
    }
  });

  s.on("msg:new", ({ roomId, message }) => {
    const rid = String(roomId);
    pushRoomMessage(rid, message);

    pushNotif({
      kind: "ROOM",
      title: "New room message",
      body: String(message?.text || "New message"),
      key: rid,
      read: false,
      ts: Date.now(),
    });

    if (shouldAlert("ROOM", rid)) {
      playTone();
      browserNotify("New room message", message?.text || "New message");
    }
  });

  s.on("typing:update", ({ roomId, sessionId, isTyping }) => {
    setChatState((st) => ({
      typingByRoom: {
        ...st.typingByRoom,
        [roomId]: {
          ...(st.typingByRoom[roomId] ?? {}),
          [sessionId]: !!isTyping,
        },
      },
    }));
  });

  s.on("presence:update", ({ roomId, sessionIds }) => {
    setChatState((st) => ({
      presenceByRoom: { ...st.presenceByRoom, [roomId]: sessionIds ?? [] },
    }));
  });

  // calling
  s.on("call:ring", ({ callId, fromSessionId, roomId }) => {
    setChatState({ incomingCall: { callId, fromSessionId, roomId } });

    pushNotif({
      kind: "CALL",
      title: "Incoming call",
      body: `From ${String(fromSessionId).slice(0, 6)}`,
      key: String(callId),
      read: false,
      ts: Date.now(),
    });

    playTone();
    browserNotify("Incoming call", `From ${String(fromSessionId).slice(0, 6)}`);
  });

  s.on("call:ended", ({ callId, reason }) => {
    setChatState((st) => {
      if (st.incomingCall?.callId === callId) return { incomingCall: null };
      return {};
    });

    pushNotif({
      kind: "CALL",
      title: "Call ended",
      body: String(reason || "ended"),
      key: String(callId),
      read: false,
      ts: Date.now(),
    });
  });

  // invites (optional UI later)
  s.on("invite:new", (payload: any) => {
    pushNotif({
      kind: "INVITE",
      title: "New invite",
      body: payload?.kind ? `Invite: ${payload.kind}` : "Invite received",
      key: payload?.token ? String(payload.token) : undefined,
      read: false,
      ts: Date.now(),
    });
  });

  s.on("invite:accepted", (payload: any) => {
    pushNotif({
      kind: "INVITE",
      title: "Invite accepted",
      body: payload?.kind ? `Accepted: ${payload.kind}` : "Invite accepted",
      key: payload?.token ? String(payload.token) : undefined,
      read: false,
      ts: Date.now(),
    });
  });

  s.on("invite:revoked", (payload: any) => {
    pushNotif({
      kind: "INVITE",
      title: "Invite revoked",
      body: payload?.token ? `Token: ${payload.token}` : "Invite revoked",
      key: payload?.token ? String(payload.token) : undefined,
      read: false,
      ts: Date.now(),
    });
  });
}

export function setSocketSessionKey(key: string | null | undefined) {
  socketSessionKey = key ? String(key) : null;

  if (sock) {
    try {
      sock.auth = { ...(sock.auth as any), sessionKey: socketSessionKey };
      sock.disconnect();
      sock.connect();
    } catch {}
  }
}

export function connectSocket(): Socket {
  if (sock) return sock;

  const url =
    process.env.NEXT_PUBLIC_SOCKET_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    "http://localhost:8080";

  sock = io(url, {
    transports: ["websocket"],
    withCredentials: true,
    auth: socketSessionKey ? { sessionKey: socketSessionKey } : undefined,
  });

  bindOnce(sock);
  return sock;
}

export function getSocket() {
  return sock;
}

export function resetSocket() {
  try {
    sock?.disconnect();
  } catch {}
  sock = null;
  bound = false;
}
