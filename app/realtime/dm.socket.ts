// src/realtime/dm.socket.ts
"use client";

import { connectSocket } from "./socket.client";

export function dmOpen(targetSessionId: string) {
  const s = connectSocket();
  return new Promise<any>((resolve) => {
    s.emit("dm:open", { targetSessionId }, (res) => resolve(res));
  });
}

export function dmSend(args: {
  threadId: string;
  text?: string;
  mediaUrls?: string[];
  mediaIds?: string[];
}) {
  const s = connectSocket();
  return new Promise<any>((resolve) => {
    s.emit(
      "dm:send",
      {
        threadId: args.threadId,
        text: args.text,
        mediaUrls: args.mediaUrls,
        mediaIds: args.mediaIds,
      },
      (res) => resolve(res)
    );
  });
}

export function onDmNew(
  handler: (payload: { threadId: string; message: any }) => void
) {
  const s = connectSocket();
  s.on("dm:new", handler);
  return () => s.off("dm:new", handler);
}
