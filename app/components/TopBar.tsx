"use client";

import {
  Home,
  List,
  LayoutGrid,
  Search,
  X,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const cx = (...a: Array<string | false | undefined>) =>
  a.filter(Boolean).join(" ");

export default function TopBar({
  onHome,
  onList,
  onGrid,
}: {
  onHome?: () => void;
  onList?: () => void;
  onGrid?: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="h-16 w-full bg-gradient-to-r from-purple-700 via-fuchsia-600 to-purple-700">
        <div className="flex h-full w-full items-center px-4">
          {/* LEFT: Logo */}
          <div className="flex items-center">
            <div className="text-xl font-extrabold tracking-tight text-white">
              Tok<span className="text-white/90">Box</span>
            </div>
          </div>

          {/* ICONS */}
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
          <div className="flex flex-1 justify-center px-6">
            <div className="relative w-full max-w-[760px]">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                className="h-10 w-full rounded-full bg-white px-11 pr-10 text-sm text-zinc-900 outline-none ring-1 ring-black/5 placeholder:text-zinc-400 focus:ring-2 focus:ring-white/40"
                placeholder="Search..."
              />
              <button
                type="button"
                aria-label="Clear"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-500 hover:bg-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* RIGHT */}
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
              className="ml-1 rounded-full px-3 py-2 text-sm font-semibold text-white/95 hover:bg-white/15"
            >
              Me
            </button>

            <button
              type="button"
              className="ml-1 rounded-full px-3 py-2 text-sm font-semibold text-white/95 hover:bg-white/15"
            >
              Help
            </button>

            <IconOnly label="Close">
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
