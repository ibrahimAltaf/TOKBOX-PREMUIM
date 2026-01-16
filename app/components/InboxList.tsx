"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Phone, Star, Ban, Users, Video, CheckCheck } from "lucide-react";

type TabKey = "favs" | "blocked" | "rooms" | "calls";

type InboxItem = {
  id: string;
  name: string;
  subtitle: string; // last msg / room desc / call status
  time: string;
  unread?: number;
  avatar?: string; // for users/calls
  online?: boolean;
  kind: "user" | "room" | "call";
  callType?: "audio" | "video";
};

const cx = (...a: Array<string | false | undefined>) =>
  a.filter(Boolean).join(" ");

const data: Record<TabKey, InboxItem[]> = {
  favs: [
    {
      id: "u1",
      kind: "user",
      name: "Ayesha",
      subtitle: "Acha kal call pe baat karte hain 👀",
      time: "2m",
      unread: 2,
      online: true,
      avatar:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=60",
    },
    {
      id: "u2",
      kind: "user",
      name: "Hassan",
      subtitle: "Ok done. Share repo link.",
      time: "14m",
      unread: 0,
      online: false,
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=60",
    },
    {
      id: "u3",
      kind: "user",
      name: "Sara",
      subtitle: "Typing...",
      time: "1h",
      unread: 0,
      online: true,
      avatar:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=60",
    },
  ],
  blocked: [
    {
      id: "b1",
      kind: "user",
      name: "Unknown_102",
      subtitle: "Blocked user",
      time: "—",
      unread: 0,
      online: false,
      avatar:
        "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=200&q=60",
    },
    {
      id: "b2",
      kind: "user",
      name: "Spammer_77",
      subtitle: "Blocked user",
      time: "—",
      unread: 0,
      online: false,
      avatar:
        "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=200&q=60",
    },
  ],
  rooms: [
    {
      id: "r1",
      kind: "room",
      name: "Lahore Room",
      subtitle: "24 online • casual chat",
      time: "live",
      unread: 0,
    },
    {
      id: "r2",
      kind: "room",
      name: "Developers Hub",
      subtitle: "18 online • tech talk",
      time: "live",
      unread: 0,
    },
    {
      id: "r3",
      kind: "room",
      name: "Night Vibes",
      subtitle: "9 online • chill",
      time: "live",
      unread: 0,
    },
  ],
  calls: [
    {
      id: "c1",
      kind: "call",
      name: "Bilal",
      subtitle: "Missed call",
      time: "5m",
      unread: 1,
      online: true,
      callType: "audio",
      avatar:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=60",
    },
    {
      id: "c2",
      kind: "call",
      name: "Sara",
      subtitle: "Outgoing • 02:14",
      time: "1h",
      unread: 0,
      online: true,
      callType: "video",
      avatar:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=60",
    },
    {
      id: "c3",
      kind: "call",
      name: "Ayesha",
      subtitle: "Incoming • 00:42",
      time: "yday",
      unread: 0,
      online: false,
      callType: "audio",
      avatar:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=60",
    },
  ],
};

const tabs: Array<{
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}> = [
  { key: "favs", label: "Fav", icon: <Star className="h-4 w-4" /> },
  { key: "blocked", label: "Block", icon: <Ban className="h-4 w-4" /> },
  { key: "rooms", label: "Room", icon: <Users className="h-4 w-4" /> },
  { key: "calls", label: "Calls", icon: <Phone className="h-4 w-4" /> },
];

export default function InboxList() {
  const [tab, setTab] = useState<TabKey>("favs");

  const items = useMemo(() => data[tab] ?? [], [tab]);

  return (
    <div className="h-full">
      {/* Tabs */}
      <div className="mb-3 flex items-center gap-2 rounded-2xl border border-purple-200 bg-white p-1">
        {tabs.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cx(
                "flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold transition",
                active
                  ? "bg-gradient-to-r from-purple-700 to-fuchsia-600 text-white shadow-sm"
                  : "text-purple-700 hover:bg-purple-50"
              )}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-1.5">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            className={cx(
              "group flex w-full items-center gap-2 rounded-2xl border bg-white px-3 py-2 text-left shadow-sm transition",
              "border-purple-200/70 hover:border-purple-300 hover:bg-purple-50/30",
              "focus:outline-none focus:ring-2 focus:ring-purple-400/40"
            )}
          >
            {/* Left icon/avatar */}
            {it.kind === "room" ? (
              <div className="grid h-9 w-9 place-items-center rounded-full bg-purple-50 text-purple-700 ring-2 ring-white">
                <Users className="h-4 w-4" />
              </div>
            ) : (
              <div className="relative h-9 w-9 overflow-hidden rounded-full ring-2 ring-white">
                {it.avatar ? (
                  <Image
                    src={it.avatar}
                    alt={it.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-zinc-200" />
                )}
                <span
                  className={cx(
                    "absolute bottom-0 right-0 h-2 w-2 rounded-full ring-2 ring-white",
                    it.online ? "bg-emerald-500" : "bg-zinc-300"
                  )}
                />
              </div>
            )}

            {/* Text */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-[13px] font-semibold leading-5 text-zinc-900">
                  {it.name}
                </div>
                <div className="shrink-0 text-[10px] font-semibold text-zinc-500">
                  {it.time}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-[11px] leading-4 text-zinc-500">
                  {it.subtitle}
                </div>

                {/* Right: unread / call type / seen */}
                <div className="shrink-0">
                  {it.kind === "call" ? (
                    it.callType === "video" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-white px-2 py-1 text-[10px] font-semibold text-purple-700">
                        <Video className="h-3.5 w-3.5" /> Video
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-white px-2 py-1 text-[10px] font-semibold text-purple-700">
                        <Phone className="h-3.5 w-3.5" /> Audio
                      </span>
                    )
                  ) : it.unread && it.unread > 0 ? (
                    <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-zinc-900 px-2 py-1 text-[10px] font-bold text-white">
                      {it.unread}
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-zinc-400">
                      <CheckCheck className="h-4 w-4" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
