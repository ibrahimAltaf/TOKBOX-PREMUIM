"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { toAbsoluteUrl } from "@/lib/http";

export default function MediaLightbox({
  open,
  src,
  kind,
  onClose,
}: {
  open: boolean;
  src: string | null;
  kind: "image" | "video";
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !src) return null;

  const abs = toAbsoluteUrl(src);

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/70 p-4">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white hover:bg-white/15"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {kind === "video" ? (
          <video src={abs} controls playsInline className="h-[78vh] w-full object-contain" />
        ) : (
          <div className="relative h-[78vh] w-full">
            <Image src={abs} alt="media" fill className="object-contain" unoptimized />
          </div>
        )}
      </div>
    </div>
  );
}
