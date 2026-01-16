// src/realtime/invites.socket.ts
"use client";

import { connectSocket } from "./socket.client";

export function inviteCreate(payload: {
  kind: "ROOM" | "DM" | "VIDEO_GROUP" | "VIDEO_1ON1";
  roomId?: string;
  dmThreadId?: string;
  targetSessionId?: string;
  maxUses?: number;
  ttlMinutes?: number;
}) {
  const s = connectSocket();
  return new Promise<any>((resolve) => {
    s.emit("invite:create", payload, (res) => resolve(res));
  });
}

export function inviteAccept(token: string) {
  const s = connectSocket();
  return new Promise<any>((resolve) => {
    s.emit("invite:accept", { token }, (res) => resolve(res));
  });
}

export function inviteRevoke(token: string) {
  const s = connectSocket();
  return new Promise<any>((resolve) => {
    s.emit("invite:revoke", { token }, (res) => resolve(res));
  });
}

export function onInviteNew(handler: (payload: any) => void) {
  const s = connectSocket();
  s.on("invite:new", handler);
  return () => s.off("invite:new", handler);
}

export function onInviteAccepted(handler: (payload: any) => void) {
  const s = connectSocket();
  s.on("invite:accepted", handler);
  return () => s.off("invite:accepted", handler);
}

export function onInviteRevoked(handler: (payload: any) => void) {
  const s = connectSocket();
  s.on("invite:revoked", handler);
  return () => s.off("invite:revoked", handler);
}
