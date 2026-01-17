"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  User2,
  MessageCircle,
  Heart,
  Ban,
  Image as ImageIcon,
  Video as VideoIcon,
  Paperclip,
  Smile,
  SendHorizontal,
} from "lucide-react";
import Image from "next/image";
import TextareaAutosize from "react-textarea-autosize";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";

import {
  subscribeChat,
  getChatState,
  setChatState,
  markAllNotifsRead,
  pushDmMessage,
  pushRoomMessage,
} from "../store/chat.store";

import { listDmMessages, sendDmMessage, openDmThread } from "../apis/dm/dm.api";
import { listRoomMessages, sendRoomMessage } from "../apis/messages/messages.api";
import { uploadMedia } from "../apis/media/media.api";
import { safeImgSrc, toAbsoluteUrl } from "@/lib/http";
import { connectSocket } from "../realtime/socket.client";

import MediaLightbox from "./modals/MediaLightbox";

const cx = (...a: Array<string | false | undefined>) => a.filter(Boolean).join(" ");

type TopTab = "chat" | "notifications" | "profile";

function isVideoUrl(u: string) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(u);
}

function mapApiMsg(m: any) {
  return {
    id: String(m?.id ?? m?._id ?? ""),
    text: m?.text ?? "",
    ts: m?.ts ? Number(m.ts) : m?.createdAt ? Date.parse(m.createdAt) : Date.now(),
    fromSessionId:
      m?.fromSessionId ??
      m?.senderSessionId ??
      m?.authorSessionId ??
      m?.sessionId ??
      m?.from ??
      null,
    mediaUrls: (m?.mediaUrls ?? []).map((u: string) => toAbsoluteUrl(u)).filter(Boolean),
    mediaIds: (m?.mediaIds ?? []).filter(Boolean),
  };
}

function emitWithAck<T = any>(
  sock: ReturnType<typeof connectSocket> | null,
  event: string,
  payload: any,
  timeoutMs = 1500
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!sock) return reject(new Error("NO_SOCKET"));

    let done = false;
    const t = setTimeout(() => {
      if (done) return;
      done = true;
      reject(new Error("ACK_TIMEOUT"));
    }, timeoutMs);

    try {
      sock.emit(event as any, payload, (res: any) => {
        if (done) return;
        done = true;
        clearTimeout(t);
        resolve(res);
      });
    } catch (e: any) {
      if (done) return;
      done = true;
      clearTimeout(t);
      reject(e);
    }
  });
}

export default function ChatBox() {
  const [tab, setTab] = useState<TopTab>("chat");
  const [s, setS] = useState(getChatState());

  const [text, setText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const imageRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLInputElement | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [lightbox, setLightbox] = useState<{
    open: boolean;
    src: string | null;
    kind: "image" | "video";
  }>({ open: false, src: null, kind: "image" });

  const sockRef = useRef<ReturnType<typeof connectSocket> | null>(null);

  useEffect(() => subscribeChat((next) => setS(next)), []);

  useEffect(() => {
    try {
      sockRef.current = connectSocket();
    } catch {}
  }, []);

  const peer = useMemo(() => {
    if (!s.activePeerId) return null;
    return (s.onlineUsers ?? []).find((u: any) => String(u.id) === String(s.activePeerId)) ?? null;
  }, [s.activePeerId, s.onlineUsers]);

  const peerImg = useMemo(
    () => safeImgSrc(peer?.avatarUrl ?? null, (peer?.photos as any) ?? null),
    [peer?.avatarUrl, peer?.photos]
  );

  const unreadCount = useMemo(() => (s.notifs ?? []).filter((n: any) => !n.read).length, [s.notifs]);

  const header = useMemo(() => {
    if (s.mode === "DM") {
      if (!s.activeThreadId && !s.activePeerId) return "Select a user";
      return peer?.nickname ? `DM: ${peer.nickname}` : `DM`;
    }
    const anyS = s as any;
    return anyS.activeRoomName
      ? `Room: ${anyS.activeRoomName}`
      : s.activeRoomId
      ? `Room: ${s.activeRoomId}`
      : "Select a room";
  }, [s.mode, s.activeThreadId, s.activePeerId, s.activeRoomId, peer?.nickname]);

  const msgs = useMemo(() => {
    const anyS = s as any;
    if (s.mode === "DM" && s.activeThreadId) return anyS.dmMessagesByThread?.[s.activeThreadId] ?? [];
    if (s.mode === "ROOM" && s.activeRoomId) return anyS.roomMessagesByRoom?.[s.activeRoomId] ?? [];
    return [];
  }, [s.mode, s.activeThreadId, s.activeRoomId, (s as any).dmMessagesByThread, (s as any).roomMessagesByRoom]);

  const stAny: any = s as any;
  const blocked = (stAny.blockedUserIds ?? []) as string[];
  const isBlocked = s.mode === "DM" && s.activePeerId ? blocked.includes(String(s.activePeerId)) : false;
  const canSend = text.trim().length > 0 && !isBlocked;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [msgs.length]);

  // Subscribe/join based on your backend events
  useEffect(() => {
    const sock = sockRef.current;
    if (!sock) return;

    if (s.mode === "ROOM" && s.activeRoomId) {
      try {
        sock.emit("room:join", { roomId: s.activeRoomId });
      } catch {}
      return;
    }

    if (s.mode === "DM" && s.activePeerId) {
      // This is critical: backend only pushes dm:new to subscribed users (usually)
      try {
        sock.emit("dm:open", { targetSessionId: s.activePeerId });
      } catch {}
    }
  }, [s.mode, s.activeRoomId, s.activePeerId]);

  // Load messages on selection change (API load once)
  useEffect(() => {
    let dead = false;

    async function load() {
      try {
        if (s.mode === "DM" && s.activeThreadId) {
          const res: any = await listDmMessages(s.activeThreadId, { limit: 50 });
          if (dead) return;
          const arr = (res?.messages ?? res?.data?.messages ?? []).map(mapApiMsg);

          setChatState((st: any) => ({
            dmMessagesByThread: { ...(st.dmMessagesByThread ?? {}), [s.activeThreadId!]: arr },
          }));
        }

        if (s.mode === "ROOM" && s.activeRoomId) {
          const res: any = await listRoomMessages(s.activeRoomId, { limit: 50 });
          if (dead) return;
          const arr = (res?.messages ?? res?.data?.messages ?? []).map(mapApiMsg);

          setChatState((st: any) => ({
            roomMessagesByRoom: { ...(st.roomMessagesByRoom ?? {}), [s.activeRoomId!]: arr },
          }));
        }
      } catch {}
    }

    load();
    return () => {
      dead = true;
    };
  }, [s.mode, s.activeThreadId, s.activeRoomId]);

  // Typing (ROOM only)
  useEffect(() => {
    if (s.mode !== "ROOM" || !s.activeRoomId) return;
    const sock = sockRef.current;
    if (!sock) return;

    if (!text) {
      try {
        sock.emit("typing:stop", { roomId: s.activeRoomId });
      } catch {}
      return;
    }

    try {
      sock.emit("typing:start", { roomId: s.activeRoomId });
    } catch {}

    const t = setTimeout(() => {
      try {
        sock.emit("typing:stop", { roomId: s.activeRoomId! });
      } catch {}
    }, 900);

    return () => clearTimeout(t);
  }, [text, s.mode, s.activeRoomId]);

  async function uploadAndGetMedia(files: FileList | null, folder: string) {
    if (!files || files.length === 0) return { mediaUrls: [] as string[], mediaIds: [] as string[] };

    const up = await uploadMedia({ folder, files: Array.from(files) });
    const urls = (up.files ?? []).map((f: any) => toAbsoluteUrl(f.url)).filter(Boolean) as string[];
    const ids = (up.files ?? []).map((f: any) => f.id).filter(Boolean) as string[];
    return { mediaUrls: urls, mediaIds: ids };
  }

  async function ensureDmThread() {
    if (s.activeThreadId) return s.activeThreadId;
    if (!s.activePeerId) return null;

    const res: any = await openDmThread(s.activePeerId);
    const threadId =
      res?.thread?.id ??
      res?.thread?._id ??
      res?.data?.thread?.id ??
      res?.data?.thread?._id ??
      res?.id ??
      res?.threadId ??
      null;

    if (!threadId) return null;

    setChatState({
      mode: "DM",
      activePeerId: s.activePeerId,
      activeThreadId: String(threadId),
      activeRoomId: null,
    } as any);

    // subscribe immediately so FIRST incoming message is realtime
    try {
      sockRef.current?.emit("dm:open", { targetSessionId: s.activePeerId });
    } catch {}

    return String(threadId);
  }

  async function sendNow(payload: { text?: string; mediaUrls?: string[]; mediaIds?: string[] }) {
    if (isBlocked) return;

    const sock = sockRef.current;

    if (s.mode === "DM") {
      const tid = await ensureDmThread();
      if (!tid) return;

      // socket first (ACK), API only if ACK fails/timeout
      try {
        const ack: any = await emitWithAck(sock, "dm:send", { threadId: tid, ...payload }, 1800);

        // If your backend returns message in ACK, you can push immediately (optional)
        if (ack?.message) pushDmMessage(tid, mapApiMsg(ack.message));

        if (ack?.ok) {
          setText("");
          setEmojiOpen(false);
          return;
        }
      } catch {}

      try {
        await sendDmMessage(tid, payload);
      } catch {}

      setText("");
      setEmojiOpen(false);
      return;
    }

    if (!s.activeRoomId) return;

    try {
      const ack: any = await emitWithAck(sock, "msg:send", { roomId: s.activeRoomId, ...payload }, 1800);

      if (ack?.message) pushRoomMessage(s.activeRoomId, mapApiMsg(ack.message));

      if (ack?.ok) {
        setText("");
        setEmojiOpen(false);
        return;
      }
    } catch {}

    try {
      await sendRoomMessage(s.activeRoomId, payload);
    } catch {}

    setText("");
    setEmojiOpen(false);
  }

  async function onSend() {
    if (!canSend) return;
    await sendNow({ text: text.trim() });
  }

  async function onAttach(kind: "file" | "image" | "video", files: FileList | null) {
    if (isBlocked) return;

    const folder = kind === "image" ? "chat/images" : kind === "video" ? "chat/videos" : "chat/files";
    const { mediaUrls, mediaIds } = await uploadAndGetMedia(files, folder);

    await sendNow({
      text: kind === "file" ? "[file]" : undefined,
      mediaUrls,
      mediaIds,
    });
  }

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="mb-3 rounded-2xl border border-purple-200 bg-white p-2">
          <div className="flex gap-2">
            <TopTabBtn
              active={tab === "notifications"}
              onClick={() => {
                setTab("notifications");
                markAllNotifsRead();
              }}
              label="Notifications"
              icon={<Bell className="h-4 w-4" />}
              badge={unreadCount}
            />
            <TopTabBtn active={tab === "profile"} onClick={() => setTab("profile")} label="Profile" icon={<User2 className="h-4 w-4" />} />
            <TopTabBtn active={tab === "chat"} onClick={() => setTab("chat")} label="Chat" icon={<MessageCircle className="h-4 w-4" />} />
          </div>
        </div>

        {tab === "profile" ? (
          <div className="flex-1 rounded-2xl border border-purple-200 bg-white p-4">
            <div className="text-sm font-semibold">Profile</div>

            <div className="mt-3 flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
                {peerImg ? <Image src={peerImg} alt="avatar" fill className="object-cover" unoptimized /> : null}
              </div>

              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-zinc-900">{peer?.nickname ?? "—"}</div>
                <div className="truncate text-[11px] text-zinc-500">{peer?.about ?? "—"}</div>
                <div className="mt-1 text-[10px] text-zinc-400">
                  {peer?.lastSeenAt ? `Last seen: ${new Date(peer.lastSeenAt).toLocaleString()}` : ""}
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button className="rounded-2xl border border-purple-200 bg-white px-3 py-2 text-xs font-semibold text-purple-700">
                <Heart className="mr-2 inline h-4 w-4" />
                Fav
              </button>
              <button className="rounded-2xl border border-purple-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700">
                <Ban className="mr-2 inline h-4 w-4" />
                Block
              </button>
            </div>
          </div>
        ) : tab === "notifications" ? (
          <div className="flex-1 rounded-2xl border border-purple-200 bg-white p-4">
            <div className="text-sm font-semibold">Notifications</div>

            <div className="mt-3 space-y-2">
              {(s.notifs ?? []).length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-xs text-zinc-600">No notifications yet.</div>
              ) : (
                (s.notifs ?? []).map((n: any) => (
                  <div key={n.id} className="rounded-2xl border border-zinc-200 bg-white p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold">{n.title}</div>
                      {!n.read && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">NEW</span>}
                    </div>
                    {n.body && <div className="mt-1 text-zinc-600">{n.body}</div>}
                    <div className="mt-1 text-[10px] text-zinc-400">{new Date(n.ts).toLocaleString()}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col overflow-hidden">
            <div className="rounded-2xl border border-purple-200 bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-extrabold text-zinc-900">{header}</div>
                  <div className="mt-1 text-xs text-zinc-500">{s.mode === "DM" ? peer?.about ?? "—" : "Room conversation"}</div>
                  {isBlocked && <div className="mt-1 text-xs font-semibold text-rose-700">You blocked this user. Messaging disabled.</div>}
                </div>

                {s.mode === "DM" && (
                  <div className="relative h-9 w-9 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
                    {peerImg ? <Image src={peerImg} alt="peer" fill className="object-cover" unoptimized /> : null}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex-1 overflow-hidden rounded-2xl border border-purple-200 bg-white">
              <div className="flex h-full flex-col p-4">
                <div ref={scrollRef} className="flex-1 space-y-3 overflow-auto pr-1">
                  {msgs.length === 0 ? (
                    <div className="text-sm text-zinc-500">No messages yet.</div>
                  ) : (
                    msgs.map((m: any) => {
                      const mine =
                        !!s.meSessionId &&
                        m?.fromSessionId != null &&
                        String(m.fromSessionId) === String(s.meSessionId);

                      const t = new Date(Number(m.ts ?? Date.now())).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                      // WhatsApp-like rule (DM):
                      // - Incoming: show peer avatar (receiver)
                      // - Outgoing: no avatar bubble
                      const showDmAvatar = s.mode === "DM" && !mine;

                      return (
                        <div key={String(m.id ?? m.ts)} className={cx("flex", mine ? "justify-end" : "justify-start")}>
                          <div className={cx("flex max-w-[82%] items-end gap-2", mine ? "flex-row-reverse" : "flex-row")}>
                            {showDmAvatar && (
                              <div className="relative h-7 w-7 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
                                {peerImg ? <Image src={peerImg} alt="avatar" fill className="object-cover" unoptimized /> : null}
                              </div>
                            )}

                            <div className={cx("relative rounded-2xl px-3 py-2 text-[14px] leading-5 shadow-sm", mine ? "bg-purple-600 text-white" : "bg-white text-zinc-900 border border-zinc-200")}>
                              <span
                                className={cx(
                                  "absolute bottom-2 h-3 w-3 rotate-45",
                                  mine ? "-right-1 bg-purple-600" : "-left-1 bg-white border-l border-b border-zinc-200"
                                )}
                              />

                              {!!m.text && <div className="whitespace-pre-wrap break-words pr-12">{m.text}</div>}

                              {!!m.mediaUrls?.length && (
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                  {m.mediaUrls.slice(0, 6).map((u: string) => {
                                    const abs = toAbsoluteUrl(u);
                                    const vid = isVideoUrl(u);
                                    return (
                                      <button
                                        key={u}
                                        type="button"
                                        onClick={() => setLightbox({ open: true, src: u, kind: vid ? "video" : "image" })}
                                        className={cx("overflow-hidden rounded-xl", mine ? "border border-white/20" : "border border-zinc-200")}
                                      >
                                        {vid ? (
                                          <video src={abs} className="h-28 w-full object-cover" muted playsInline />
                                        ) : (
                                          <Image src={abs} alt="media" width={260} height={180} className="h-28 w-full object-cover" unoptimized />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              <div className={cx("absolute bottom-1 right-2 text-[10px]", mine ? "text-white/80" : "text-zinc-500")}>{t}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-4">
                  {emojiOpen && (
                    <div className="mb-2 overflow-hidden rounded-2xl border border-purple-200 bg-white p-2">
                      <EmojiPicker
                        onEmojiClick={(emojiData: EmojiClickData) => setText((t) => t + (emojiData?.emoji ?? ""))}
                        height={360}
                        width="100%"
                        previewConfig={{ showPreview: false }}
                        skinTonesDisabled
                        lazyLoadEmojis
                      />
                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => setEmojiOpen(false)}
                          className="rounded-2xl border border-purple-200 bg-white px-3 py-2 text-[11px] font-semibold text-purple-700 hover:bg-purple-50"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-purple-200 bg-white p-2">
                    <div className="flex items-end gap-2">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setEmojiOpen((p) => !p)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-purple-200 bg-white text-purple-700 hover:bg-purple-50"
                          aria-label="Emoji"
                          disabled={isBlocked}
                        >
                          <Smile className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-purple-200 bg-white text-purple-700 hover:bg-purple-50"
                          aria-label="Attach file"
                          disabled={isBlocked}
                        >
                          <Paperclip className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => imageRef.current?.click()}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-purple-200 bg-white text-purple-700 hover:bg-purple-50"
                          aria-label="Attach image"
                          disabled={isBlocked}
                        >
                          <ImageIcon className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => videoRef.current?.click()}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-purple-200 bg-white text-purple-700 hover:bg-purple-50"
                          aria-label="Attach video"
                          disabled={isBlocked}
                        >
                          <VideoIcon className="h-4 w-4" />
                        </button>

                        <input
                          ref={fileRef}
                          type="file"
                          className="hidden"
                          multiple
                          onChange={(e) => {
                            onAttach("file", e.target.files);
                            e.currentTarget.value = "";
                          }}
                        />
                        <input
                          ref={imageRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          multiple
                          onChange={(e) => {
                            onAttach("image", e.target.files);
                            e.currentTarget.value = "";
                          }}
                        />
                        <input
                          ref={videoRef}
                          type="file"
                          accept="video/*"
                          className="hidden"
                          multiple
                          onChange={(e) => {
                            onAttach("video", e.target.files);
                            e.currentTarget.value = "";
                          }}
                        />
                      </div>

                      <TextareaAutosize
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={isBlocked ? "Blocked" : "Type a message…"}
                        disabled={isBlocked}
                        minRows={1}
                        maxRows={6}
                        className={cx(
                          "min-h-[44px] flex-1 resize-none rounded-2xl border bg-white px-3 py-2 text-sm outline-none placeholder:text-zinc-400",
                          isBlocked ? "border-zinc-200 text-zinc-400" : "border-purple-200 focus:border-purple-400"
                        )}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            onSend();
                          }
                        }}
                      />

                      <button
                        type="button"
                        onClick={onSend}
                        disabled={!canSend}
                        className={cx(
                          "inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-semibold text-white shadow-sm",
                          canSend ? "bg-gradient-to-r from-purple-700 to-fuchsia-600 hover:brightness-110" : "cursor-not-allowed bg-zinc-300"
                        )}
                      >
                        <SendHorizontal className="h-4 w-4" />
                        Send
                      </button>
                    </div>
                  </div>

                  {s.mode === "ROOM" && s.activeRoomId && (
                    <div className="mt-2 text-[11px] text-zinc-500">
                      Typing:{" "}
                      {Object.entries((s as any).typingByRoom?.[s.activeRoomId] ?? {})
                        .filter(([, v]) => v)
                        .map(([sid]) => String(sid).slice(0, 6))
                        .join(", ") || "—"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <MediaLightbox open={lightbox.open} src={lightbox.src} kind={lightbox.kind} onClose={() => setLightbox({ open: false, src: null, kind: "image" })} />
    </>
  );
}

function TopTabBtn({
  active,
  onClick,
  label,
  icon,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "relative flex-1 rounded-2xl px-3 py-2 text-left text-[12px] font-semibold transition",
        active ? "bg-gradient-to-r from-purple-700 to-fuchsia-600 text-white" : "border border-purple-200 bg-white text-purple-700 hover:bg-purple-50"
      )}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="truncate">{label}</span>
      </div>

      {!!badge && badge > 0 && (
        <span className="absolute right-2 top-2 inline-flex min-w-[18px] items-center justify-center rounded-full bg-white/95 px-1.5 py-0.5 text-[10px] font-extrabold text-purple-700">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}
