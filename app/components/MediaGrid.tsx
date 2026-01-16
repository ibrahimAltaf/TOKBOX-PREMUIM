"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Film, Image as ImgIcon } from "lucide-react";

type Tab = "photos" | "movies";

const cx = (...a: Array<string | false | undefined>) =>
  a.filter(Boolean).join(" ");

const PHOTOS = [
  "https://images.unsplash.com/photo-1520975958225-3f61d1f2f7f0?auto=format&fit=crop&w=900&q=60",
  "https://images.unsplash.com/photo-1520975693411-b2e8f2c7a41a?auto=format&fit=crop&w=900&q=60",
  "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=900&q=60",
  "https://images.unsplash.com/photo-1520975958225-3f61d1f2f7f0?auto=format&fit=crop&w=900&q=60",
  "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=900&q=60",
  "https://images.unsplash.com/photo-1520975693411-b2e8f2c7a41a?auto=format&fit=crop&w=900&q=60",
];

const MOVIES = [
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
];

export default function MediaGrid() {
  const [tab, setTab] = useState<Tab>("photos");
  const items = useMemo(() => (tab === "photos" ? PHOTOS : MOVIES), [tab]);

  return (
    <div className="h-full">
      {/* Tabs */}
      <div className="mb-3 flex items-center gap-2 rounded-2xl border border-purple-200 bg-white p-1">
        <TabBtn
          active={tab === "photos"}
          onClick={() => setTab("photos")}
          icon={<ImgIcon className="h-4 w-4" />}
          label="Photos"
        />
        <TabBtn
          active={tab === "movies"}
          onClick={() => setTab("movies")}
          icon={<Film className="h-4 w-4" />}
          label="Movies"
        />
      </div>

      {/* Content */}
      {tab === "photos" ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {items.map((src, i) => (
            <div
              key={src + i}
              className="relative aspect-square overflow-hidden rounded-2xl border border-purple-200 bg-white"
            >
              <Image src={src} alt="photo" fill className="object-cover" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((src, i) => (
            <div
              key={src + i}
              className="overflow-hidden rounded-2xl border border-purple-200 bg-black"
            >
              <video
                src={src}
                controls
                playsInline
                className="h-[170px] w-full object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
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
