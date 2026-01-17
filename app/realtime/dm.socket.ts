// src/realtime/dm.socket.ts
"use client";

import { connectSocket } from "./socket.client";

type Ack = unknown;

export function dmOpen(targetSessionId: string): Promise<Ack> {
  const s = connectSocket();
  return new Promise<Ack>((resolve) => {
    s.emit("dm:open", { targetSessionId }, (res: Ack) => resolve(res));
  });
}

export function dmSend(args: {
  threadId: string;
  text?: string;
  mediaUrls?: string[];
  mediaIds?: string[];
}): Promise<Ack> {
  const s = connectSocket();
  return new Promise<Ack>((resolve) => {
    s.emit(
      "dm:send",
      {
        threadId: args.threadId,
        text: args.text,
        mediaUrls: args.mediaUrls,
        mediaIds: args.mediaIds,
      },
      (res: Ack) => resolve(res)
    );
  });
}

export function onDmNew(
  handler: (payload: { threadId: string; message: unknown }) => void
) {
  const s = connectSocket();
  s.on("dm:new", handler);
  return () => s.off("dm:new", handler);
}
