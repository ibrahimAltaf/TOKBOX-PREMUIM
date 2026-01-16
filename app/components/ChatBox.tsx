"use client";

import { useMemo } from "react";
import { useChat } from "../chat/_state/chat.context";
import { PhoneIncoming, PhoneOff } from "lucide-react";

const cx = (...a: Array<string | false | undefined>) => a.filter(Boolean).join(" ");

export default function ChatBox() {
  const {
    mode,
    activeThreadId,
    activePeerSessionId,
    activeRoomId,
    dmMessages,
    roomMessages,
    roomPresence,
    typing,
    ringingCall,
    acceptCall,
    endCall,
  } = useChat();

  const msgs = useMemo(() => {
    if (mode === "DM" && activeThreadId) return dmMessages[activeThreadId] ?? [];
    if (mode === "ROOM" && activeRoomId) return roomMessages[activeRoomId] ?? [];
    return [];
  }, [mode, activeThreadId, activeRoomId, dmMessages, roomMessages]);

  const roomTyping = activeRoomId ? typing[activeRoomId] ?? {} : {};
  const typingIds = Object.entries(roomTyping).filter(([, v]) => v).map(([k]) => k);

  const presenceCount = activeRoomId ? (roomPresence[activeRoomId]?.length ?? 0) : 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Incoming call banner */}
      {ringingCall && (
        <div className="mb-3 rounded-2xl border border-purple-200 bg-purple-50/50 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <PhoneIncoming className="h-4 w-4 text-purple-700" />
                Incoming call
              </div>
              <div className="mt-0.5 truncate text-xs text-zinc-600">
                From: {ringingCall.fromSessionId}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => acceptCall()}
                className="rounded-2xl bg-gradient-to-r from-purple-700 to-fuchsia-600 px-4 py-2 text-xs font-semibold text-white"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => endCall()}
                className="rounded-2xl border border-purple-200 bg-white px-4 py-2 text-xs font-semibold text-purple-700"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="rounded-2xl border border-purple-200 bg-white p-3">
        <div className="text-sm font-extrabold text-zinc-900">
          {mode === "DM"
            ? activeThreadId
              ? `DM (${activePeerSessionId ?? "-"})`
              : "Select a user from User List"
            : activeRoomId
            ? `Room: ${activeRoomId} (${presenceCount} online)`
            : "Select a room"}
        </div>

        {mode === "ROOM" && activeRoomId && typingIds.length > 0 && (
          <div className="mt-1 text-xs text-zinc-500">
            Typing: {typingIds.slice(0, 3).join(", ")}
            {typingIds.length > 3 ? "..." : ""}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="mt-4 flex-1 overflow-hidden rounded-2xl border border-purple-200 bg-white">
        <div className="flex h-full flex-col p-4">
          <div className="flex-1 space-y-3 overflow-auto pr-1">
            {msgs.length === 0 ? (
              <div className="text-sm text-zinc-500">No messages yet.</div>
            ) : (
              msgs.map((m: any, i: number) => {
                const mine = false; // If you want, compare against /sessions/me sessionId
                return (
                  <div key={(m.id ?? m._id ?? i) as any} className={mine ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className={cx(
                        "max-w-[78%] rounded-2xl px-4 py-3 text-sm",
                        mine ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-900"
                      )}
                    >
                      {m.text ?? "(media)"}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-3 rounded-2xl border border-purple-200 bg-purple-50/40 px-3 py-2 text-xs text-zinc-600">
            Use the bottom bar to send messages.
          </div>
        </div>
      </div>
    </div>
  );
}
