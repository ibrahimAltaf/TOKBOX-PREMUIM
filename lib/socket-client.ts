"use client";

import { io, type Socket } from "socket.io-client";

let _socket: Socket | null = null;

const getBaseUrl = () =>
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");

export function getSocket() {
  if (_socket) return _socket;

  _socket = io(getBaseUrl(), {
    transports: ["websocket", "polling"],
    withCredentials: true,
    autoConnect: true, // ✅ IMPORTANT
  });

  _socket.on("connect", () => console.log("[socket] connected", _socket?.id));
  _socket.on("disconnect", (r) => console.log("[socket] disconnected", r));
  _socket.on("connect_error", (err) =>
    console.log("[socket] connect_error:", err?.message || err)
  );

  return _socket;
}
