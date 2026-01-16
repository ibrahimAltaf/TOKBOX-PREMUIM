"use client";

import React from "react";
import { getSocket } from "../../realtime/socket-client";

type ChatMode = "DM" | "ROOM";

export type ChatState = {
  ready: boolean;

  mode: ChatMode;

  // DM state
  activeThreadId: string | null;
  activePeerSessionId: string | null;

  // ROOM state
  activeRoomId: string | null;
  roomPresence: Record<string, string[]>;
  typing: Record<string, Record<string, boolean>>;

  // Messages (kept in memory for demo, no REST fetch needed)
  dmMessages: Record<string, Array<any>>;
  roomMessages: Record<string, Array<any>>;

  // Call state (basic)
  ringingCall: null | { callId: string; fromSessionId: string; roomId?: string | null };
  activeCallId: string | null;
};

type ChatActions = {
  // DM
  openDm: (targetSessionId: string) => Promise<void>;
  sendDm: (text: string) => Promise<void>;

  // Room
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: (roomId: string) => Promise<void>;
  sendRoomMessage: (text: string) => Promise<void>;

  // typing
  typingStart: () => void;
  typingStop: () => void;

  // calls (basic ring/accept/end)
  startCall: (targetSessionId: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  endCall: () => Promise<void>;
};

const ChatCtx = React.createContext<(ChatState & ChatActions) | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ChatState>({
    ready: false,

    mode: "DM",

    activeThreadId: null,
    activePeerSessionId: null,

    activeRoomId: null,
    roomPresence: {},
    typing: {},

    dmMessages: {},
    roomMessages: {},

    ringingCall: null,
    activeCallId: null,
  });

  React.useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setState((p) => ({ ...p, ready: true }));
    const onDisconnect = () => setState((p) => ({ ...p, ready: false }));

    // ROOM presence
    socket.on("presence:update", (payload: any) => {
      setState((p) => ({
        ...p,
        roomPresence: { ...p.roomPresence, [payload.roomId]: payload.sessionIds ?? [] },
      }));
    });

    // ROOM message push
    socket.on("msg:new", (payload: any) => {
      setState((p) => {
        const roomId = payload.roomId;
        const prev = p.roomMessages[roomId] ?? [];
        return {
          ...p,
          roomMessages: { ...p.roomMessages, [roomId]: [...prev, payload.message] },
        };
      });
    });

    // DM message push
    socket.on("dm:new", (payload: any) => {
      setState((p) => {
        const threadId = payload.threadId;
        const prev = p.dmMessages[threadId] ?? [];
        return {
          ...p,
          dmMessages: { ...p.dmMessages, [threadId]: [...prev, payload.message] },
        };
      });
    });

    // typing push
    socket.on("typing:update", (payload: any) => {
      setState((p) => {
        const { roomId, sessionId, isTyping } = payload;
        return {
          ...p,
          typing: {
            ...p.typing,
            [roomId]: { ...(p.typing[roomId] ?? {}), [sessionId]: !!isTyping },
          },
        };
      });
    });

    // calls
    socket.on("call:ring", (payload: any) => {
      setState((p) => ({ ...p, ringingCall: payload }));
    });

    socket.on("call:accepted", (payload: any) => {
      setState((p) => ({ ...p, activeCallId: payload.callId }));
    });

    socket.on("call:ended", (payload: any) => {
      setState((p) => ({
        ...p,
        ringingCall: p.ringingCall?.callId === payload.callId ? null : p.ringingCall,
        activeCallId: p.activeCallId === payload.callId ? null : p.activeCallId,
      }));
    });

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("presence:update");
      socket.off("msg:new");
      socket.off("dm:new");
      socket.off("typing:update");
      socket.off("call:ring");
      socket.off("call:accepted");
      socket.off("call:ended");
    };
  }, []);

  const openDm: ChatActions["openDm"] = async (targetSessionId) => {
    const socket = getSocket();

    await new Promise<void>((resolve, reject) => {
      socket.emit("dm:open", { targetSessionId }, (res: any) => {
        if (!res?.ok) return reject(new Error(res?.error || "DM_OPEN_FAILED"));

        const threadId = String(res.thread?.id ?? res.thread?._id);
        setState((p) => ({
          ...p,
          mode: "DM",
          activeThreadId: threadId,
          activePeerSessionId: targetSessionId,
          activeRoomId: null,
        }));
        resolve();
      });
    });
  };

  const sendDm: ChatActions["sendDm"] = async (text) => {
    const socket = getSocket();
    const msg = text.trim();
    if (!msg) return;

    const threadId = state.activeThreadId;
    if (!threadId) return;

    await new Promise<void>((resolve, reject) => {
      socket.emit("dm:send", { threadId, text: msg }, (res: any) => {
        if (!res?.ok) return reject(new Error(res?.error || "DM_SEND_FAILED"));
        resolve();
      });
    });
  };

  const joinRoom: ChatActions["joinRoom"] = async (roomId) => {
    const socket = getSocket();

    await new Promise<void>((resolve, reject) => {
      socket.emit("room:join", { roomId }, (res: any) => {
        if (!res?.ok) return reject(new Error(res?.error || "JOIN_FAILED"));

        setState((p) => ({
          ...p,
          mode: "ROOM",
          activeRoomId: roomId,
          activeThreadId: null,
          activePeerSessionId: null,
        }));
        resolve();
      });
    });
  };

  const leaveRoom: ChatActions["leaveRoom"] = async (roomId) => {
    const socket = getSocket();

    await new Promise<void>((resolve) => {
      socket.emit("room:leave", { roomId }, () => {
        setState((p) => ({
          ...p,
          activeRoomId: p.activeRoomId === roomId ? null : p.activeRoomId,
        }));
        resolve();
      });
    });
  };

  const sendRoomMessage: ChatActions["sendRoomMessage"] = async (text) => {
    const socket = getSocket();
    const msg = text.trim();
    if (!msg) return;

    const roomId = state.activeRoomId;
    if (!roomId) return;

    await new Promise<void>((resolve, reject) => {
      socket.emit("msg:send", { roomId, text: msg }, (res: any) => {
        if (!res?.ok) return reject(new Error(res?.error || "SEND_FAILED"));
        resolve();
      });
    });
  };

  const typingStart: ChatActions["typingStart"] = () => {
    const socket = getSocket();
    const roomId = state.activeRoomId;
    if (!roomId) return;
    socket.emit("typing:start", { roomId }, () => {});
  };

  const typingStop: ChatActions["typingStop"] = () => {
    const socket = getSocket();
    const roomId = state.activeRoomId;
    if (!roomId) return;
    socket.emit("typing:stop", { roomId }, () => {});
  };

  const startCall: ChatActions["startCall"] = async (targetSessionId) => {
    const socket = getSocket();
    await new Promise<void>((resolve, reject) => {
      socket.emit("call:start", { targetSessionId, roomId: null }, (res: any) => {
        if (!res?.ok) return reject(new Error(res?.error || "CALL_START_FAILED"));
        setState((p) => ({ ...p, activeCallId: res.callId }));
        resolve();
      });
    });
  };

  const acceptCall: ChatActions["acceptCall"] = async () => {
    const socket = getSocket();
    const callId = state.ringingCall?.callId;
    if (!callId) return;

    await new Promise<void>((resolve, reject) => {
      socket.emit("call:accept", { callId }, (res: any) => {
        if (!res?.ok) return reject(new Error(res?.error || "CALL_ACCEPT_FAILED"));
        setState((p) => ({ ...p, ringingCall: null, activeCallId: callId }));
        resolve();
      });
    });
  };

  const endCall: ChatActions["endCall"] = async () => {
    const socket = getSocket();
    const callId = state.activeCallId || state.ringingCall?.callId;
    if (!callId) return;

    await new Promise<void>((resolve) => {
      socket.emit("call:end", { callId, reason: "ENDED" }, () => resolve());
    });
  };

  const value: ChatState & ChatActions = {
    ...state,
    openDm,
    sendDm,
    joinRoom,
    leaveRoom,
    sendRoomMessage,
    typingStart,
    typingStop,
    startCall,
    acceptCall,
    endCall,
  };

  return <ChatCtx.Provider value={value}>{children}</ChatCtx.Provider>;
}

export function useChat() {
  const v = React.useContext(ChatCtx);
  if (!v) throw new Error("useChat must be used within ChatProvider");
  return v;
}
