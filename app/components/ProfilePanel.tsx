// app/components/ProfilePanel.tsx
"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import { MapPin, X } from "lucide-react";
import {
  subscribeChat,
  getSelectedUser,
  selectUser,
} from "../store/chat.store";
import { safeImgSrc, toAbsoluteUrl } from "@/lib/http";

const cx = (...a: Array<string | false | undefined>) =>
  a.filter(Boolean).join(" ");

export default function ProfilePanel() {
  const [, bump] = useState(0);
  useEffect(() => subscribeChat(() => bump((x) => x + 1)), []);

  const u = getSelectedUser();

  if (!u) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
        Select a user to view profile.
      </div>
    );
  }

  const avatar = safeImgSrc(u.avatarUrl ?? null, u.photos ?? []);

  return (
    <div className="h-full">
      <div className="mb-3 flex items-center justify-between rounded-2xl border border-purple-200 bg-white p-3">
        <div>
          <div className="text-sm font-semibold text-zinc-900">
            {u.nickname ?? "Anonymous"}
          </div>
          <div className="mt-1 text-xs text-zinc-500">{u.about ?? "—"}</div>
        </div>
        <button
          type="button"
          onClick={() => selectUser(null)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-purple-200 bg-white text-purple-700 hover:bg-purple-50"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="rounded-2xl border border-purple-200 bg-white p-3">
        <div className="flex items-center gap-3">
          <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-purple-200 bg-zinc-100">
            {avatar ? (
              <Image
                src={avatar}
                alt="avatar"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-[10px] font-semibold text-purple-700">
                —
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
              <MapPin className="h-4 w-4" />
              {u.geoLabel ?? "Nearby"}
            </div>
            <div className="mt-1 text-[11px] text-zinc-500">
              {u.lastSeenAt
                ? `Last seen: ${new Date(u.lastSeenAt).toLocaleString()}`
                : "Online"}
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs font-semibold text-zinc-800">Photos</div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(u.photos ?? []).slice(0, 9).map((p, i) => {
            const src = toAbsoluteUrl(p);
            return (
              <div
                key={src + i}
                className="relative aspect-square overflow-hidden rounded-2xl border border-purple-200 bg-white"
              >
                <Image
                  src={src}
                  alt="photo"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            );
          })}
          {(!u.photos || u.photos.length === 0) && (
            <div className="col-span-3 rounded-2xl border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
              No photos uploaded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
