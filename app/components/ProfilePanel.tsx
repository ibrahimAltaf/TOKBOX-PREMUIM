"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";
import { MapPin, X, Heart, Ban } from "lucide-react";
import {
  subscribeChat,
  getSelectedUser,
  selectUser,
  setChatState,
  getChatState,
} from "../store/chat.store";
import { safeImgSrc, toAbsoluteUrl } from "@/lib/http";
import { connectSocket } from "../realtime/socket.client";

const cx = (...a: Array<string | false | undefined>) => a.filter(Boolean).join(" ");

export default function ProfilePanel() {
  const [, bump] = useState(0);

  useEffect(() => {
    return subscribeChat(() => bump((x) => x + 1));
  }, []);

  const u = getSelectedUser();

  const avatar = useMemo(
    () => safeImgSrc(u?.avatarUrl ?? null, u?.photos ?? []),
    [u?.avatarUrl, u?.photos]
  );

  if (!u) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
        Select a user to view profile.
      </div>
    );
  }

  const uId = String(u.id);
  const st: any = getChatState();
  const favs = (st.favUserIds ?? []) as string[];
  const blocks = (st.blockedUserIds ?? []) as string[];

  const isFav = favs.includes(uId);
  const isBlocked = blocks.includes(uId);

  function toggleFav() {
    const next = isFav ? favs.filter((x) => x !== uId) : [...favs, uId];
    setChatState({ favUserIds: next } as any);
  }

  function toggleBlock() {
    const next = isBlocked ? blocks.filter((x) => x !== uId) : [...blocks, uId];
    setChatState({ blockedUserIds: next } as any);

    if (!isBlocked) {
      const st2: any = getChatState();
      if (String(st2.activePeerId ?? "") === uId) {
        setChatState({ activePeerId: null, activeThreadId: null, mode: "DM" } as any);
      }
    }
  }

  function openDm() {
    if (isBlocked) return;

    setChatState({
      mode: "DM",
      activePeerId: uId,
      activeRoomId: null,
      activeThreadId: null,
    } as any);

    try {
      connectSocket().emit("dm:open", { targetSessionId: uId });
    } catch {}
  }

  const hasPhotos = (u.photos ?? []).length > 0;

  return (
    <div className="h-full">
      <div className="mb-3 flex items-center justify-between rounded-2xl border border-purple-200 bg-white p-3">
        <div>
          <div className="text-sm font-semibold text-zinc-900">{u.nickname ?? "Anonymous"}</div>
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

      {/* FIX #6: if no photos, show avatar big */}
      <div className="overflow-hidden rounded-2xl border border-purple-200 bg-white">
        <div className={cx("relative w-full bg-zinc-100", hasPhotos ? "h-[160px]" : "h-[240px]")}>
          {avatar ? (
            <Image src={avatar} alt="avatar" fill className="object-cover" unoptimized />
          ) : (
            <div className="grid h-full w-full place-items-center text-xs font-semibold text-purple-700">—</div>
          )}
        </div>

        <div className="p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
            <MapPin className="h-4 w-4" />
            {u.geoLabel ?? "Nearby"}
          </div>

          <div className="mt-1 text-[11px] text-zinc-500">
            {u.lastSeenAt ? `Last seen: ${new Date(u.lastSeenAt).toLocaleString()}` : "Online"}
          </div>

          {isBlocked && <div className="mt-1 text-[11px] font-semibold text-rose-700">Blocked</div>}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={openDm}
              disabled={isBlocked}
              className={cx(
                "flex-1 rounded-2xl px-4 py-2 text-xs font-semibold text-white",
                isBlocked
                  ? "cursor-not-allowed bg-zinc-300"
                  : "bg-gradient-to-r from-purple-700 to-fuchsia-600 hover:brightness-110"
              )}
            >
              Message
            </button>

            <button
              type="button"
              onClick={toggleFav}
              className={cx(
                "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold",
                isFav
                  ? "border-purple-300 bg-purple-50 text-purple-700"
                  : "border-purple-200 bg-white text-purple-700 hover:bg-purple-50"
              )}
            >
              <Heart className="h-4 w-4" />
              {isFav ? "Favourited" : "Fav"}
            </button>

            <button
              type="button"
              onClick={toggleBlock}
              className={cx(
                "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold",
                isBlocked
                  ? "border-rose-300 bg-rose-50 text-rose-700"
                  : "border-purple-200 bg-white text-rose-700 hover:bg-rose-50"
              )}
            >
              <Ban className="h-4 w-4" />
              {isBlocked ? "Unblock" : "Block"}
            </button>
          </div>

          <div className="mt-4 text-xs font-semibold text-zinc-800">Photos</div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(u.photos ?? []).slice(0, 9).map((p, i) => {
              const src = toAbsoluteUrl(p);
              return (
                <button
                  key={src + i}
                  type="button"
                  onClick={openDm}
                  className="relative aspect-square overflow-hidden rounded-2xl border border-purple-200 bg-white"
                  title="Open DM"
                >
                  <Image src={src} alt="photo" fill className="object-cover" unoptimized />
                </button>
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
    </div>
  );
}
