"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { subscribeChat, getChatState, selectUser, setChatState } from "../store/chat.store";
import { safeImgSrc } from "@/lib/http";

const cx = (...a: Array<string | false | undefined>) => a.filter(Boolean).join(" ");

export default function AllUsersGrid({ onPickUser }: { onPickUser?: () => void }) {
  const [s, setS] = useState(getChatState());

  useEffect(() => {
    return subscribeChat((next) => setS(next));
  }, []);

  const users = useMemo(() => {
    const meId = s.meSessionId ? String(s.meSessionId) : "";
    return (s.onlineUsers ?? []).filter((u) => String(u.id) !== meId);
  }, [s.onlineUsers, s.meSessionId]);

  return (
    <div className="h-full">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-zinc-900">All users</div>
        <div className="text-xs text-zinc-500">{users.length}</div>
      </div>

      {users.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
          No users found.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {users.map((u) => {
            const img = safeImgSrc(u.avatarUrl ?? null, u.photos ?? []);
            return (
              <button
                key={String(u.id)}
                type="button"
                className={cx(
                  "group relative aspect-square overflow-hidden rounded-2xl border border-purple-200 bg-white",
                  "hover:border-purple-300"
                )}
                onClick={() => {
                  selectUser(String(u.id));
                  // also set DM context so user can msg/call immediately (requirement #8)
                  setChatState({
                    mode: "DM",
                    activePeerId: String(u.id),
                    activeThreadId: null,
                    activeRoomId: null,
                  } as any);
                  onPickUser?.();
                }}
                title={u.nickname ?? "User"}
              >
                {img ? (
                  <Image src={img} alt="user" fill className="object-cover" unoptimized />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[10px] font-semibold text-purple-700">
                    —
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-black/40 px-2 py-1">
                  <div className="truncate text-[10px] font-semibold text-white">
                    {u.nickname ?? "Anonymous"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
