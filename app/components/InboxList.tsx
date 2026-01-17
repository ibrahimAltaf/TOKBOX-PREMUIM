"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";
import { subscribeChat, getChatState, setChatState, selectUser } from "../store/chat.store";
import { safeImgSrc } from "@/lib/http";

const cx = (...a: Array<string | false | undefined>) => a.filter(Boolean).join(" ");

type ThreadRow = {
  id: string;
  peerId: string;
  nickname?: string;
  about?: string;
  avatarUrl?: string;
  photos?: string[];
  lastAt?: number;
};

export default function InboxList({ onOpenProfile }: { onOpenProfile?: () => void }) {
  const [s, setS] = useState(getChatState());

  useEffect(() => {
    return subscribeChat((next) => setS(next));
  }, []);

  const items: ThreadRow[] = useMemo(
    () =>
      (s.onlineUsers ?? []).map((u) => ({
        id: `thread_${u.id}`,
        peerId: u.id,
        nickname: u.nickname,
        about: u.about,
        avatarUrl: u.avatarUrl,
        photos: u.photos,
        lastAt: u.lastSeenAt ? Date.parse(u.lastSeenAt) : Date.now(),
      })),
    [s.onlineUsers]
  );

  return (
    <div className="h-full">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-zinc-900">Inbox</div>
        <div className="text-xs text-zinc-500">{items.length}</div>
      </div>

      <div className="space-y-1.5">
        {items.map((u) => {
          const img = safeImgSrc(u.avatarUrl ?? null, u.photos ?? []);
          return (
            <button
              key={u.id}
              type="button"
              onClick={() => {
                selectUser(u.peerId);
                onOpenProfile?.();

                setChatState({
                  mode: "DM",
                  activePeerId: u.peerId,
                  activeThreadId: null,
                  activeRoomId: null,
                });
              }}
              className={cx(
                "group flex w-full items-center gap-2 rounded-2xl border bg-white px-3 py-2 text-left shadow-sm transition",
                "border-purple-200/70 hover:border-purple-300 hover:bg-purple-50/30",
                "focus:outline-none focus:ring-2 focus:ring-purple-400/40"
              )}
            >
              <div className="relative h-9 w-9 overflow-hidden rounded-full ring-2 ring-white bg-zinc-100">
                {img ? (
                  <Image src={img} alt={u.nickname ?? "User"} fill className="object-cover" unoptimized />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[10px] font-semibold text-purple-700">
                    —
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold leading-5 text-zinc-900">
                  {u.nickname ?? "Anonymous"}
                </div>
                <div className="truncate text-[11px] leading-4 text-zinc-500">{u.about ?? "—"}</div>
              </div>

              <div className="text-[10px] font-semibold text-zinc-500">
                {u.lastAt
                  ? new Date(u.lastAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : ""}
              </div>
            </button>
          );
        })}

        {items.length === 0 && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
            No threads yet.
          </div>
        )}
      </div>
    </div>
  );
}
