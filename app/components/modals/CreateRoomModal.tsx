"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { connectSocket } from "../../realtime/socket.client";
import { getChatState, setChatState, subscribeChat } from "../../store/chat.store";

const cx = (...a: Array<string | false | undefined>) => a.filter(Boolean).join(" ");

type RoomLite = { id: string; name?: string; memberIds?: string[] };

type RoomCreateAck =
  | { ok: true; roomId?: string; id?: string; room?: { id?: string; _id?: string; name?: string; memberIds?: string[] } }
  | { ok: false; error?: any }
  | any;

type RoomCreatePayload = { name: string; memberIds: string[] };

export default function CreateRoomModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // ✅ reactive state (instead of snapshot getChatState())
  const [s, setS] = useState(() => getChatState());

  const [name, setName] = useState("");
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  useEffect(() => subscribeChat((next) => setS(next)), []);

  // reset on open/close
  useEffect(() => {
    if (!open) {
      setName("");
      setPicked({});
    }
  }, [open]);

  const users = s.onlineUsers ?? [];

  const memberIds = useMemo(() => {
    const pickedIds = Object.entries(picked)
      .filter(([, v]) => v)
      .map(([k]) => String(k));

    // ✅ ensure creator included (if we have meSessionId)
    const me = s.meSessionId ? String(s.meSessionId) : null;
    const all = me ? [me, ...pickedIds] : pickedIds;

    // ✅ unique
    return Array.from(new Set(all)).filter(Boolean);
  }, [picked, s.meSessionId]);

  if (!open) return null;

  function toggle(id: string) {
    const key = String(id);
    setPicked((p) => ({ ...p, [key]: !p[key] }));
  }

  function upsertRoomLocal(room: RoomLite) {
    setChatState((st: any) => {
      const prev: RoomLite[] = (st.rooms ?? []).map((r: any) => ({
        id: String(r.id),
        name: r.name,
        memberIds: r.memberIds,
      }));

      const exists = prev.some((r) => String(r.id) === String(room.id));
      const nextRooms = exists
        ? prev.map((r) => (String(r.id) === String(room.id) ? { ...r, ...room } : r))
        : [...prev, room];

      return { rooms: nextRooms };
    });
  }

  async function createRoom() {
    const roomName = name.trim();
    if (!roomName) return;

    // ✅ prevent empty member list
    if (memberIds.length === 0) return;

    const sock = connectSocket();

    // optimistic id (stable)
    const optimisticId = `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // ✅ optimistic upsert + switch UI immediately
    const optimisticRoom: RoomLite = { id: optimisticId, name: roomName, memberIds };
    upsertRoomLocal(optimisticRoom);

    setChatState({
      mode: "ROOM",
      activeRoomId: optimisticId,
      activeRoomName: roomName,
      activePeerId: null,
      activeThreadId: null,
    } as any);

    // ✅ join optimistic
    try {
      sock.emit("room:join" as any, { roomId: optimisticId });
    } catch {}

    // ✅ now request backend create (typed-safe via `as any` because socket.types doesn't include room:create yet)
    let acked = false;

    try {
      sock.emit("room:create" as any, { name: roomName, memberIds } satisfies RoomCreatePayload, (ack: RoomCreateAck) => {
        acked = true;

        const serverRoomId =
          String(ack?.roomId ?? ack?.id ?? ack?.room?.id ?? ack?.room?._id ?? "") || null;

        if (!serverRoomId) {
          // backend didn't provide id; keep optimistic
          onClose();
          return;
        }

        // ✅ replace optimistic room id with server id (avoid duplicates)
        setChatState((st: any) => {
          const prev: any[] = st.rooms ?? [];
          const nextRooms = prev.map((r: any) =>
            String(r.id) === String(optimisticId)
              ? { ...r, id: serverRoomId, name: roomName, memberIds }
              : r
          );

          // if somehow optimistic not found, upsert it
          const found = nextRooms.some((r: any) => String(r.id) === String(serverRoomId));
          const finalRooms = found ? nextRooms : [...nextRooms, { id: serverRoomId, name: roomName, memberIds }];

          return {
            rooms: finalRooms,
            mode: "ROOM",
            activeRoomId: serverRoomId,
            activeRoomName: roomName,
            activePeerId: null,
            activeThreadId: null,
          };
        });

        // ✅ join real server room
        try {
          sock.emit("room:join" as any, { roomId: serverRoomId });
        } catch {}

        onClose();
      });
    } catch {
      // swallow
    }

    // ✅ fallback: if no ack within time, just close (do NOT create duplicate)
    window.setTimeout(() => {
      if (acked) return;
      onClose();
    }, 900);
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
                users
                  // ✅ optionally hide self if you want (since we auto-include)
                  .filter((u: any) => !s.meSessionId || String(u.id) !== String(s.meSessionId))
                  .map((u: any) => {
                    const id = String(u.id);
                    const isPicked = !!picked[id];

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggle(id)}
                        className={cx(
                          "flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left text-sm",
                          isPicked ? "border-purple-300 bg-purple-50" : "border-zinc-200 bg-white hover:bg-zinc-50"
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
                            isPicked ? "bg-purple-700 text-white" : "bg-zinc-100 text-zinc-700"
                          )}
                        >
                          {isPicked ? "Added" : "Add"}
                        </div>
                      </button>
                    );
                  })
              )}
            </div>

            {/* small helper */}
            <div className="mt-2 text-[11px] text-zinc-500">
              Selected: {Math.max(0, memberIds.length - (s.meSessionId ? 1 : 0))}
            </div>
          </div>

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={createRoom}
              disabled={!name.trim() || memberIds.length === 0}
              className={cx(
                "flex-1 rounded-2xl px-4 py-3 text-sm font-semibold text-white",
                name.trim() && memberIds.length > 0
                  ? "bg-gradient-to-r from-purple-700 to-fuchsia-600 hover:brightness-110"
                  : "cursor-not-allowed bg-zinc-300"
              )}
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
