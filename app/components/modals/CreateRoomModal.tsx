"use client";

import React, { useMemo, useState } from "react";
import { X } from "lucide-react";
import { connectSocket } from "../../realtime/socket.client";
import { getChatState, setChatState } from "../../store/chat.store";

const cx = (...a: Array<string | false | undefined>) => a.filter(Boolean).join(" ");

export default function CreateRoomModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const s = getChatState();
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  const users = s.onlineUsers ?? [];
  const memberIds = useMemo(
    () => Object.entries(picked).filter(([, v]) => v).map(([k]) => k),
    [picked]
  );

  if (!open) return null;

  function toggle(id: string) {
    setPicked((p) => ({ ...p, [id]: !p[id] }));
  }

  async function createRoom() {
    const roomName = name.trim();
    if (!roomName) return;

    const sock = connectSocket();

    // Expect backend to respond (recommended). If not, we create a local optimistic room id.
    const optimisticId = `room_${Math.random().toString(36).slice(2)}`;

    try {
      sock.emit("room:create", { name: roomName, memberIds }, (ack: any) => {
        const roomId = String(ack?.roomId ?? ack?.id ?? optimisticId);

        const nextRoom = { id: roomId, name: roomName, memberIds };

        setChatState((st: any) => ({
          rooms: [...(st.rooms ?? []), nextRoom],
          mode: "ROOM",
          activeRoomId: roomId,
          activeRoomName: roomName,
          activePeerId: null,
          activeThreadId: null,
        }));

        try {
          sock.emit("room:join", { roomId });
        } catch {}

        onClose();
      });

      // If no ack is sent, still proceed after short delay (best-effort)
      setTimeout(() => {
        const st: any = getChatState();
        const exists = (st.rooms ?? []).some((r: any) => r.name === roomName);
        if (exists) return;

        const nextRoom = { id: optimisticId, name: roomName, memberIds };
        setChatState((x: any) => ({
          rooms: [...(x.rooms ?? []), nextRoom],
          mode: "ROOM",
          activeRoomId: optimisticId,
          activeRoomName: roomName,
          activePeerId: null,
          activeThreadId: null,
        }));
        try {
          sock.emit("room:join", { roomId: optimisticId });
        } catch {}
        onClose();
      }, 450);
    } catch {
      // swallow
    }
  }

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-purple-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-zinc-900">Create room</div>
            <div className="mt-1 text-xs text-zinc-500">Add members and start chatting.</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-purple-200 bg-white hover:bg-purple-50"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-purple-700" />
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <div>
            <div className="text-xs font-semibold text-zinc-700">Room name</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Friends"
              className="mt-2 h-11 w-full rounded-2xl border border-purple-200 bg-white px-4 text-sm outline-none focus:border-purple-400"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-zinc-700">Members</div>
            <div className="mt-2 max-h-[280px] space-y-2 overflow-auto rounded-2xl border border-purple-200 bg-white p-2">
              {users.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
                  No users online.
                </div>
              ) : (
                users.map((u: any) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggle(String(u.id))}
                    className={cx(
                      "flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left text-sm",
                      picked[String(u.id)]
                        ? "border-purple-300 bg-purple-50"
                        : "border-zinc-200 bg-white hover:bg-zinc-50"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-semibold text-zinc-900">
                        {u.nickname ?? "Anonymous"}
                      </div>
                      <div className="truncate text-[11px] text-zinc-500">{u.about ?? "—"}</div>
                    </div>
                    <div
                      className={cx(
                        "rounded-full px-2 py-1 text-[10px] font-bold",
                        picked[String(u.id)] ? "bg-purple-700 text-white" : "bg-zinc-100 text-zinc-700"
                      )}
                    >
                      {picked[String(u.id)] ? "Added" : "Add"}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={createRoom}
              className="flex-1 rounded-2xl bg-gradient-to-r from-purple-700 to-fuchsia-600 px-4 py-3 text-sm font-semibold text-white hover:brightness-110"
            >
              Create room
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-purple-200 bg-white px-4 py-3 text-sm font-semibold text-purple-700 hover:bg-purple-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
