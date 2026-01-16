"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Camera,
  CirclePlay,
  Send,
  X,
  Minus,
  RefreshCcw,
  Mic,
  MicOff,
  Maximize2,
} from "lucide-react";
import { useChat } from "../chat/_state/chat.context";

const cx = (...a: Array<string | false | undefined>) =>
  a.filter(Boolean).join(" ");

type CamStep = "idle" | "starting" | "ready" | "error";

export default function BottomBar() {
  const [text, setText] = useState("");

  const { mode, sendDm, sendRoomMessage, typingStart, typingStop } = useChat();

  // floating camera state
  const [camOpen, setCamOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [micOn, setMicOn] = useState(true);
  const [camStep, setCamStep] = useState<CamStep>("idle");

  // position
  const [pos, setPos] = useState({ x: 24, y: 92 });

  const dragRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    pointerId?: number;
  }>({ dragging: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!camOpen) {
      stopStream();
      setCamStep("idle");
      return;
    }
    startStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camOpen, facingMode, micOn]);

  useEffect(() => {
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startStream() {
    setCamStep("starting");
    try {
      stopStream();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: micOn,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setCamStep("ready");
    } catch {
      setCamStep("error");
      stopStream();
    }
  }

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function toggleFacing() {
    setFacingMode((p) => (p === "user" ? "environment" : "user"));
  }

  function toggleMic() {
    setMicOn((p) => !p);
  }

  function openCam() {
    setCamOpen(true);
    setMinimized(false);
  }

  function closeCam() {
    stopStream();
    setCamOpen(false);
    setMinimized(false);
  }

  // drag
  function onPointerDown(e: React.PointerEvent) {
    dragRef.current.dragging = true;
    dragRef.current.pointerId = e.pointerId;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    dragRef.current.baseX = pos.x;
    dragRef.current.baseY = pos.y;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current.dragging) return;

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    const pad = 10;
    const w = minimized ? 240 : 360;
    const h = minimized ? 56 : 260;

    const maxX = window.innerWidth - w - pad;
    const maxY = window.innerHeight - h - pad;

    const nx = Math.max(pad, Math.min(maxX, dragRef.current.baseX + dx));
    const ny = Math.max(pad, Math.min(maxY, dragRef.current.baseY + dy));

    setPos({ x: nx, y: ny });
  }

  function onPointerUp(e: React.PointerEvent) {
    dragRef.current.dragging = false;
    if (dragRef.current.pointerId != null) {
      try {
        (e.currentTarget as HTMLDivElement).releasePointerCapture(
          dragRef.current.pointerId
        );
      } catch {}
    }
    dragRef.current.pointerId = undefined;
  }

  async function onSend() {
    const msg = text.trim();
    if (!msg) return;

    try {
      if (mode === "DM") {
        await sendDm(msg);
        setText("");
        return;
      }
      await sendRoomMessage(msg);
      setText("");
      typingStop();
    } catch (e: any) {
      // keep minimal
      console.error(e?.message ?? e);
    }
  }

  // typing debounce (room only)
  function onType(v: string) {
    setText(v);
    if (mode !== "ROOM") return;

    typingStart();
    (window as any).__typingT && clearTimeout((window as any).__typingT);
    (window as any).__typingT = setTimeout(() => typingStop(), 900);
  }

  return (
    <>
      <footer className="fixed bottom-0 left-0 right-0 z-40">
        <div className="h-[72px] w-full bg-gradient-to-r from-purple-700 via-fuchsia-600 to-purple-700">
          <div className="flex h-full w-full items-center px-4">
            <button
              type="button"
              onClick={openCam}
              className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-white/95 hover:bg-white/15"
            >
              <CirclePlay className="h-5 w-5" />
              Cam
            </button>

            <button
              type="button"
              aria-label="Notifications"
              className="ml-6 inline-flex h-10 w-10 items-center justify-center rounded-xl text-white/95 hover:bg-white/15 active:bg-white/20"
            >
              <Bell className="h-5 w-5" />
            </button>

            <div className="flex flex-1 justify-center px-6">
              <div className="relative w-full max-w-[980px]">
                <Camera className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  value={text}
                  onChange={(e) => onType(e.target.value)}
                  className="h-11 w-full rounded-full bg-white px-11 pr-12 text-sm text-zinc-900 outline-none ring-1 ring-black/5 placeholder:text-zinc-400 focus:ring-2 focus:ring-white/40"
                  placeholder={mode === "DM" ? "Type DM..." : "Type room message..."}
                />
                <button
                  type="button"
                  aria-label="Send"
                  onClick={onSend}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-zinc-600 hover:bg-zinc-100"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>

            <button
              type="button"
              className="rounded-full px-4 py-2 text-sm font-semibold text-white/95 hover:bg-white/15"
            >
              Inbox
            </button>
          </div>
        </div>
      </footer>

      {/* Floating Camera */}
      {camOpen && (
        <div className="fixed z-[60]" style={{ left: pos.x, top: pos.y }}>
          <div
            className={cx(
              "select-none overflow-hidden rounded-3xl border border-white/10 shadow-2xl",
              "bg-gradient-to-br from-purple-900/80 via-fuchsia-900/60 to-black/70",
              minimized ? "w-[240px]" : "w-[360px]"
            )}
          >
            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className="flex cursor-grab items-center justify-between gap-2 px-3 py-2 active:cursor-grabbing"
            >
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <div className="text-xs font-semibold text-white">Camera</div>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/80">
                  {camStep === "ready"
                    ? facingMode === "user"
                      ? "Front"
                      : "Back"
                    : camStep === "starting"
                    ? "Starting…"
                    : camStep === "error"
                    ? "Error"
                    : "Idle"}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {!minimized ? (
                  <MiniBtn
                    onClick={(e) => {
                      e.stopPropagation();
                      setMinimized(true);
                    }}
                    label="Minimize"
                  >
                    <Minus className="h-4 w-4" />
                  </MiniBtn>
                ) : (
                  <MiniBtn
                    onClick={(e) => {
                      e.stopPropagation();
                      setMinimized(false);
                    }}
                    label="Restore"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </MiniBtn>
                )}

                <MiniBtn
                  onClick={(e) => {
                    e.stopPropagation();
                    closeCam();
                  }}
                  label="Close"
                >
                  <X className="h-4 w-4" />
                </MiniBtn>
              </div>
            </div>

            {minimized ? (
              <div className="px-3 pb-3">
                <div className="flex items-center justify-between rounded-2xl bg-white/10 px-3 py-2">
                  <div className="flex items-center gap-2 text-white/90">
                    <Camera className="h-4 w-4" />
                    <div className="text-[11px] font-semibold">
                      Live camera running
                    </div>
                  </div>
                  <div className="text-[10px] font-semibold text-white/70">
                    Drag me
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="relative bg-black">
                  <video
                    ref={videoRef}
                    playsInline
                    muted={!micOn}
                    className="h-[210px] w-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/35" />

                  {camStep === "starting" && (
                    <div className="absolute inset-0 grid place-items-center">
                      <div className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur">
                        Opening camera…
                      </div>
                    </div>
                  )}

                  {camStep === "error" && (
                    <div className="absolute inset-0 grid place-items-center p-4 text-center">
                      <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white backdrop-blur">
                        <div className="text-xs font-semibold">
                          Camera not available
                        </div>
                        <div className="mt-1 text-[11px] text-white/80">
                          Check permissions / HTTPS.
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 px-3 py-3">
                  <div className="flex items-center gap-2">
                    <ControlBtn onClick={toggleFacing}>
                      <RefreshCcw className="h-4 w-4" />
                      Switch
                    </ControlBtn>

                    <ControlBtn onClick={toggleMic}>
                      {micOn ? (
                        <Mic className="h-4 w-4" />
                      ) : (
                        <MicOff className="h-4 w-4" />
                      )}
                      {micOn ? "Mic" : "Muted"}
                    </ControlBtn>
                  </div>

                  <ControlBtn onClick={startStream} className="bg-white/15">
                    <Camera className="h-4 w-4" />
                    Refresh
                  </ControlBtn>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function MiniBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/15"
    >
      {children}
    </button>
  );
}

function ControlBtn({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15",
        className
      )}
    >
      {children}
    </button>
  );
}
