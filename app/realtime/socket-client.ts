"use client";

import { io, type Socket } from "socket.io-client";

let _socket: Socket | null = null;
let _sessionKey = "";

export function setSocketSessionKey(key: string) {
  _sessionKey = key.trim();
  if (_socket) {
    (_socket as any).auth = { sessionKey: _sessionKey };
  }
}

function getSocketUrl() {
  return (process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:8080").replace(/\/$/, "");
}

export function connectSocket() {
  if (_socket && (_socket.connected || (_socket as any).active)) return _socket;

  _socket = io(getSocketUrl(), {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 600,
    reconnectionDelayMax: 4000,
    timeout: 12000,
    autoConnect: true,

    // ✅ MUST MATCH BACKEND HANDSHAKE VALIDATION
    auth: { sessionKey: _sessionKey },
    withCredentials: true,
  });

  _socket.on("connect", () => console.log("[socket] connected", _socket?.id));
  _socket.on("connect_error", (e) =>
    console.log("[socket] connect_error:", (e as any)?.message || e)
  );

  return _socket;
}

export function getSocket() {
  return _socket ?? connectSocket();
}

export function disconnectSocket() {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}
