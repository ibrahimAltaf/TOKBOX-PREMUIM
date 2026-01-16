"use client";

import { connectSocket, getSocket } from "../../realtime/socket.client";
import {
  pushDmMessage,
  pushRoomMessage,
  setChatState,
} from "../../store/chat.store";

let started = false;

export function startChatRealtime() {
  if (started) return;
  started = true;

  const s = connectSocket();

  s.on("connect", () => {
    // console.log("socket connected", s.id);
  });

  s.on("disconnect", () => {
    // console.log("socket disconnected");
  });

  s.on("msg:new", (payload) => {
    const roomId = payload?.roomId;
    if (!roomId) return;
    pushRoomMessage(roomId, payload?.message);
  });

  s.on("dm:new", (payload) => {
    const threadId = payload?.threadId;
    if (!threadId) return;
    pushDmMessage(threadId, payload?.message);
  });

  s.on("presence:update", (payload) => {
    if (!payload?.roomId) return;
    setChatState((st) => ({
      presenceByRoom: {
        ...st.presenceByRoom,
        [payload.roomId]: payload.sessionIds ?? [],
      },
    }));
  });

  s.on("typing:update", (payload) => {
    if (!payload?.roomId || !payload?.sessionId) return;
    setChatState((st) => {
      const roomTyping = st.typingByRoom[payload.roomId] ?? {};
      return {
        typingByRoom: {
          ...st.typingByRoom,
          [payload.roomId]: {
            ...roomTyping,
            [payload.sessionId]: !!payload.isTyping,
          },
        },
      };
    });
  });

  // Invites – you can wire UI later
  s.on("invite:new", () => {});
  s.on("invite:accepted", () => {});
  s.on("invite:revoked", () => {});
}

export function stopChatRealtime() {
  const s = getSocket();
  if (!s) return;
  s.removeAllListeners();
}
