"use client";

import Image from "next/image";
import { MapPin } from "lucide-react";
import { useUsersPicsQuery } from "@/app/apis/users/users.queries";
import { useChat } from "../chat/_state/chat.context";

const cx = (...a: Array<string | false | undefined>) => a.filter(Boolean).join(" ");

export default function UserList() {
  const chat = useChat();

  const q = useUsersPicsQuery({
    limit: 60,
    onlineOnly: true, // ✅ show only online
  });

  const users = q.data?.users ?? [];

  return (
    <div className="h-full">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-zinc-900">Users</div>
        <div className="text-xs text-zinc-500">
          {q.isLoading ? "Loading…" : `${users.length} online`}
        </div>
      </div>

      <div className="space-y-1.5">
        {users.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => chat.openDm(u.id)}
            className={cx(
              "group flex w-full items-center gap-2 rounded-2xl border bg-white px-3 py-2 text-left shadow-sm transition",
              "border-purple-200/70 hover:border-purple-300 hover:bg-purple-50/30",
              "focus:outline-none focus:ring-2 focus:ring-purple-400/40"
            )}
          >
            <div className="relative h-9 w-9 overflow-hidden rounded-full ring-2 ring-white">
              {u.avatarUrl ? (
                <Image src={u.avatarUrl} alt={u.nickname ?? "User"} fill className="object-cover" />
              ) : (
                <div className="h-full w-full bg-zinc-200" />
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
              <div className="truncate text-[11px] leading-4 text-zinc-500">
                {u.about ?? "—"}
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-full border border-purple-200 bg-white px-2 py-1 text-[10px] font-semibold text-purple-700">
              <MapPin className="h-3.5 w-3.5" />
              {u.geoLabel ?? "Nearby"}
            </div>
          </button>
        ))}

        {!q.isLoading && users.length === 0 && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
            No online users right now.
          </div>
        )}
      </div>
    </div>
  );
}
