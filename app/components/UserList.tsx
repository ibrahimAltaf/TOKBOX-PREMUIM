"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";
import { MapPin, Phone, MessageCircle, Video } from "lucide-react";

import { listUsersPics } from "../apis/users/users.api";
import { openDmThread } from "../apis/dm/dm.api";
import { setChatState, selectUser, getChatState } from "../store/chat.store";
import { connectSocket } from "../realtime/socket.client";
import { safeImgSrc } from "@/lib/http";

const cx = (...a: Array<string | false | undefined>) => a.filter(Boolean).join(" ");

type ApiUser = {
  id: string;
  nickname?: string | null;
  about?: string | null;
  geoLabel?: string | null;
  avatarUrl?: string | null;
  photos?: string[];
  introVideoUrl?: string | null;
  lastSeenAt?: string;
  online?: boolean;
};

type User = {
  id: string;
  nickname?: string;
  about?: string;
  geoLabel?: string;
  avatarUrl?: string;
  photos?: string[];
  introVideoUrl?: string;
  lastSeenAt?: string;
  online?: boolean;
};

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const onlineCount = useMemo(() => users.length, [users.length]);

  useEffect(() => {
    let dead = false;

    async function load() {
      try {
        const st = getChatState();
        const meId = st.meSessionId ? String(st.meSessionId) : "";

        const res: any = await listUsersPics({ limit: 60, onlineOnly: true });
        if (dead) return;

        const apiUsers: ApiUser[] = res?.users ?? res?.data?.users ?? [];

        const arr: User[] = apiUsers
          .map((u) => ({
            id: String(u.id),
            nickname: u?.nickname ?? undefined,
            about: u?.about ?? undefined,
            geoLabel: u?.geoLabel ?? undefined,
            avatarUrl: u?.avatarUrl ?? undefined,
            photos: Array.isArray(u?.photos) ? u.photos : [],
            introVideoUrl: (u as any)?.introVideoUrl ?? undefined,
            lastSeenAt: u?.lastSeenAt ?? undefined,
            online: u?.online ?? true,
          }))
          .filter((u) => String(u.id) !== meId); // ✅ hide self

        setUsers(arr);
        setChatState({ onlineUsers: arr as any } as any);
      } catch {
        setUsers([]);
      }
    }

    load();
    const t = setInterval(load, 10_000);
    return () => {
      dead = true;
      clearInterval(t);
    };
  }, []);

  async function openDm(userId: string) {
    const st: any = getChatState();
    const blocked = (st.blockedUserIds ?? []) as string[];
    if (blocked.includes(userId)) return;

    const res: any = await openDmThread(userId);

    const threadId =
      res?.thread?.id ??
      res?.thread?._id ??
      res?.data?.thread?.id ??
      res?.data?.thread?._id ??
      res?.id ??
      res?.threadId ??
      null;

    setChatState({
      mode: "DM",
      activePeerId: userId,
      activeThreadId: threadId ? String(threadId) : null,
      activeRoomId: null,
    } as any);

    try {
      connectSocket().emit("dm:open", { targetSessionId: userId });
    } catch {}
  }

  function openProfile(userId: string) {
    selectUser(userId);
    setChatState({
      mode: "DM",
      activePeerId: userId,
      activeThreadId: null,
      activeRoomId: null,
    } as any);
  }

  // ✅ FIX: server contract for call:start = { targetSessionId, roomId? }
  function startCall(userId: string, kind: "audio" | "video") {
    const st: any = getChatState();
    const blocked = (st.blockedUserIds ?? []) as string[];
    if (blocked.includes(userId)) return;

    const callId = `call_${Math.random().toString(36).slice(2)}`;

    // store locally for UI modal (outgoing)
    setChatState({
      outgoingCall: { callId, toSessionId: userId, kind },
      incomingCall: null,
    } as any);

    try {
      connectSocket().emit("call:start", { targetSessionId: userId });
    } catch {}
  }

  return (
    <div className="h-full">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-zinc-900">Users</div>
        <div className="text-xs text-zinc-500">{onlineCount} online</div>
      </div>

      <div className="space-y-1.5">
        {users.map((u) => {
          const img = safeImgSrc(u.avatarUrl ?? null, u.photos ?? []);

          return (
            <div
              key={u.id}
              className={cx(
                "group flex w-full items-center gap-2 rounded-2xl border bg-white px-3 py-2 text-left shadow-sm transition",
                "border-purple-200/70 hover:border-purple-300 hover:bg-purple-50/30"
              )}
            >
              <button
                type="button"
                onClick={() => openProfile(u.id)}
                className="flex flex-1 items-center gap-2 text-left"
              >
                <div className="relative h-9 w-9 overflow-hidden rounded-full ring-2 ring-white bg-zinc-100">
                  {img ? (
                    <Image src={img} alt={u.nickname ?? "User"} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-[10px] font-semibold text-purple-700">—</div>
                  )}

                  <span
                    className={cx(
                      "absolute bottom-0 right-0 h-2 w-2 rounded-full ring-2 ring-white",
                      u.online ? "bg-emerald-500" : "bg-zinc-300"
                    )}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold leading-5 text-zinc-900">
                    {u.nickname ?? "Anonymous"}
                  </div>
                  <div className="truncate text-[11px] leading-4 text-zinc-500">{u.about ?? "—"}</div>
                </div>

                <div className="hidden items-center gap-1 rounded-full border border-purple-200 bg-white px-2 py-1 text-[10px] font-semibold text-purple-700 md:flex">
                  <MapPin className="h-3.5 w-3.5" />
                  {u.geoLabel ?? "Nearby"}
                </div>
              </button>

              <button
                type="button"
                onClick={() => openDm(u.id)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-purple-200 bg-white text-purple-700 hover:bg-purple-50"
                aria-label="Open DM"
                title="Message"
              >
                <MessageCircle className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => startCall(u.id, "audio")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-purple-200 bg-white text-purple-700 hover:bg-purple-50"
                aria-label="Audio call"
                title="Audio call"
              >
                <Phone className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => startCall(u.id, "video")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-purple-200 bg-white text-purple-700 hover:bg-purple-50"
                aria-label="Video call"
                title="Video call"
              >
                <Video className="h-4 w-4" />
              </button>
            </div>
          );
        })}

        {users.length === 0 && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
            No online users right now.
          </div>
        )}
      </div>
    </div>
  );
}
