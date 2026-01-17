"use client";

import React, { useEffect } from "react";
import { PhoneCall, PhoneOff, Video } from "lucide-react";
import { stopRingtone } from "../../../lib/ringtone";

const cx = (...a: Array<string | false | undefined>) => a.filter(Boolean).join(" ");

async function requestCallPermissions(kind: "audio" | "video") {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return true;

  const constraints =
    kind === "video"
      ? { audio: true, video: true }
      : { audio: true, video: false };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints as any);
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

export default function CallModal({
  open,
  title,
  subtitle,
  kind,
  direction,
  onAccept,
  onReject,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  kind: "audio" | "video";
  direction: "incoming" | "outgoing";
  onAccept?: () => void;
  onReject: () => void;
}) {
  useEffect(() => {
    if (!open) stopRingtone();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[115] grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-3xl border border-purple-200 bg-white p-5 shadow-2xl">
        <div className="text-sm font-semibold text-zinc-900">{title}</div>
        {subtitle && <div className="mt-1 text-xs text-zinc-500">{subtitle}</div>}

        <div className="mt-5 flex items-center justify-center">
          <div
            className={cx(
              "grid h-14 w-14 place-items-center rounded-2xl",
              kind === "video" ? "bg-fuchsia-50 text-fuchsia-700" : "bg-purple-50 text-purple-700"
            )}
          >
            {kind === "video" ? <Video className="h-6 w-6" /> : <PhoneCall className="h-6 w-6" />}
          </div>
        </div>

        <div className="mt-5 grid gap-2">
          {direction === "incoming" && (
            <button
              type="button"
              onClick={async () => {
                const ok = await requestCallPermissions(kind);
                if (!ok) {
                  alert(
                    kind === "video"
                      ? "Camera/Microphone permission required for video call."
                      : "Microphone permission required for audio call."
                  );
                  return;
                }
                onAccept?.();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-700 to-fuchsia-600 px-4 py-3 text-sm font-semibold text-white hover:brightness-110"
            >
              <PhoneCall className="h-4 w-4" />
              Accept
            </button>
          )}

          <button
            type="button"
            onClick={onReject}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-purple-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"
          >
            <PhoneOff className="h-4 w-4" />
            {direction === "incoming" ? "Reject" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
