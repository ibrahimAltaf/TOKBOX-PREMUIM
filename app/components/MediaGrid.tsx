"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";
import { Film, Image as ImgIcon } from "lucide-react";
import { getSelectedUser, setChatState, subscribeChat } from "../store/chat.store";
import { toAbsoluteUrl } from "@/lib/http";
import MediaLightbox from "./modals/MediaLightbox";

type Tab = "photos" | "videos";

const cx = (...a: Array<string | false | undefined>) => a.filter(Boolean).join(" ");

export default function MediaGrid() {
  const [, bump] = useState(0);

  useEffect(() => {
    return subscribeChat(() => bump((x) => x + 1));
  }, []);

  const u = getSelectedUser();
  const [tab, setTab] = useState<Tab>("photos");

  const [lightbox, setLightbox] = useState<{ open: boolean; src: string | null; kind: "image" | "video" }>({
    open: false,
    src: null,
    kind: "image",
  });

  const photos = useMemo(() => (u?.photos ?? []).map((x) => toAbsoluteUrl(x)).filter(Boolean), [u?.photos]);

  const videos = useMemo(() => {
    const v = u?.introVideoUrl ? [toAbsoluteUrl(u.introVideoUrl)] : [];
    return v.filter(Boolean);
  }, [u?.introVideoUrl]);

  if (!u) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
        Select a user to view their media.
      </div>
    );
  }

  const items = tab === "photos" ? photos : videos;

  return (
    <>
      <div className="h-full">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-zinc-900">Media</div>
          <div className="text-xs text-zinc-500">{u.nickname ?? "Anonymous"}</div>
        </div>

        <div className="mb-3 flex items-center gap-2 rounded-2xl border border-purple-200 bg-white p-1">
          <TabBtn active={tab === "photos"} onClick={() => setTab("photos")} icon={<ImgIcon className="h-4 w-4" />} label="Photos" />
          <TabBtn active={tab === "videos"} onClick={() => setTab("videos")} icon={<Film className="h-4 w-4" />} label="Videos" />
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
            No {tab} uploaded.
          </div>
        ) : tab === "photos" ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {items.map((src, i) => (
              <button
                key={src + i}
                type="button"
                className="relative aspect-square overflow-hidden rounded-2xl border border-purple-200 bg-white"
                onClick={() => setLightbox({ open: true, src, kind: "image" })}
                title="Open"
              >
                <Image src={src} alt="photo" fill className="object-cover" unoptimized />
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {items.map((src, i) => (
              <button
                key={src + i}
                type="button"
                onClick={() => setLightbox({ open: true, src, kind: "video" })}
                className="overflow-hidden rounded-2xl border border-purple-200 bg-black"
              >
                <video src={src} playsInline className="h-[260px] w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <MediaLightbox open={lightbox.open} src={lightbox.src} kind={lightbox.kind} onClose={() => setLightbox({ open: false, src: null, kind: "image" })} />
    </>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold transition",
        active
          ? "bg-gradient-to-r from-purple-700 to-fuchsia-600 text-white shadow-sm"
          : "text-purple-700 hover:bg-purple-50"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
