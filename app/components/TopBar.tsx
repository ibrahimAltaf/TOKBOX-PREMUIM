"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Home,
  List,
  LayoutGrid,
  Search,
  X,
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
  PlusSquare,
} from "lucide-react";
import { subscribeChat, getChatState, selectUser, setChatState } from "../store/chat.store";
import { useRouter } from "next/navigation";
import { safeImgSrc } from "@/lib/http";

const cx = (...a: Array<string | false | undefined>) => a.filter(Boolean).join(" ");

export default function TopBar({
  onHome,
  onList,
  onGrid,
  onOpenMe,
  onCreateRoom,
}: {
  onHome?: () => void;
  onList?: () => void;
  onGrid?: () => void;
  onOpenMe?: () => void;
  onCreateRoom?: () => void;
}) {
  const router = useRouter();
  const [s, setS] = useState(getChatState());

  const [q, setQ] = useState("");
  const [openSearch, setOpenSearch] = useState(false);

  useEffect(() => {
    return subscribeChat((next) => setS(next));
  }, []);

  const me = useMemo(() => {
    return { id: s.meSessionId ?? "", nickname: "Me", avatarUrl: (s as any)?.meAvatarUrl ?? null, photos: (s as any)?.mePhotos ?? [] };
  }, [s.meSessionId, (s as any)?.meAvatarUrl, (s as any)?.mePhotos]);

  const meAvatar = useMemo(() => safeImgSrc(me.avatarUrl ?? null, me.photos ?? []), [me.avatarUrl, me.photos]);

  const filtered = useMemo(() => {
    const users = (s.onlineUsers ?? []) as any[];
    const t = q.trim().toLowerCase();
    if (!t) return users.slice(0, 10);
    return users
      .filter((u) => {
        const name = String(u?.nickname ?? "").toLowerCase();
        const about = String(u?.about ?? "").toLowerCase();
        return name.includes(t) || about.includes(t) || String(u?.id ?? "").includes(t);
      })
      .slice(0, 12);
  }, [q, s.onlineUsers]);

  function pickUser(userId: string) {
    selectUser(userId);
    setChatState({ mode: "DM", activePeerId: userId, activeThreadId: null, activeRoomId: null } as any);
    setOpenSearch(false);
    setQ("");
  }

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="h-16 w-full bg-gradient-to-r from-purple-700 via-fuchsia-600 to-purple-700">
        <div className="flex h-full w-full items-center px-4">
          <div className="flex items-center">
            <div className="text-xl font-extrabold tracking-tight text-white">
              Tok<span className="text-white/90">Box</span>
            </div>
          </div>

          <div className="ml-10 flex items-center gap-3">
            <IconOnly label="Home" onClick={onHome}>
              <Home className="h-5 w-5" />
            </IconOnly>
            <IconOnly label="List" onClick={onList}>
              <List className="h-5 w-5" />
            </IconOnly>
            <IconOnly label="Grid" onClick={onGrid}>
              <LayoutGrid className="h-5 w-5" />
            </IconOnly>
          </div>

          {/* SEARCH */}
          <div className="relative flex flex-1 justify-center px-6">
            <div className="relative w-full max-w-[760px]">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setOpenSearch(true);
                }}
                onFocus={() => setOpenSearch(true)}
                className="h-10 w-full rounded-full bg-white px-11 pr-10 text-sm text-zinc-900 outline-none ring-1 ring-black/5 placeholder:text-zinc-400 focus:ring-2 focus:ring-white/40"
                placeholder="Search users..."
              />
              <button
                type="button"
                aria-label="Clear"
                onClick={() => {
                  setQ("");
                  setOpenSearch(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-500 hover:bg-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>

              {openSearch && (q.trim() || filtered.length) && (
                <div className="absolute left-0 right-0 top-[46px] z-[60] overflow-hidden rounded-2xl border border-purple-200 bg-white shadow-xl">
                  <div className="max-h-[360px] overflow-auto p-2">
                    {filtered.length === 0 ? (
                      <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
                        No results.
                      </div>
                    ) : (
                      filtered.map((u: any) => {
                        const img = safeImgSrc(u?.avatarUrl ?? null, u?.photos ?? []);
                        return (
                          <button
                            key={String(u.id)}
                            type="button"
                            onClick={() => pickUser(String(u.id))}
                            className={cx(
                              "flex w-full items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-left hover:bg-purple-50/40"
                            )}
                          >
                            <div className="relative h-9 w-9 overflow-hidden rounded-full bg-zinc-100">
                              {img ? <Image src={img} alt="u" fill className="object-cover" unoptimized /> : null}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[13px] font-semibold text-zinc-900">
                                {u.nickname ?? "Anonymous"}
                              </div>
                              <div className="truncate text-[11px] text-zinc-500">{u.about ?? "—"}</div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <IconOnly label="Settings">
              <Settings className="h-5 w-5" />
            </IconOnly>
            <IconOnly label="Prev">
              <ChevronLeft className="h-5 w-5" />
            </IconOnly>
            <IconOnly label="Next">
              <ChevronRight className="h-5 w-5" />
            </IconOnly>

            <button
              type="button"
              onClick={onCreateRoom}
              className="ml-1 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-white/95 hover:bg-white/15"
            >
              <PlusSquare className="h-4 w-4" />
              Create room
            </button>

            <button
              type="button"
              onClick={onOpenMe}
              className="ml-1 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-white/95 hover:bg-white/15"
            >
              <User className="h-4 w-4" />
              Me
            </button>

            <IconOnly label="Close" onClick={() => setOpenSearch(false)}>
              <X className="h-5 w-5" />
            </IconOnly>
          </div>
        </div>
      </div>
    </header>
  );
}

function IconOnly({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cx(
        "inline-flex h-10 w-10 items-center justify-center rounded-xl text-white/95",
        "hover:bg-white/15 active:bg-white/20"
      )}
    >
      {children}
    </button>
  );
}
