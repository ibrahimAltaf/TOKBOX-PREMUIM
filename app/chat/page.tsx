"use client";

import React from "react";
import TopBar from "../components/TopBar";
import BottomBar from "../components/BottomBar";
import ChatLayout from "../components/ChatLayout";
import InboxList from "../components/InboxList";
import UserList from "../components/UserList";
import MediaGrid from "../components/MediaGrid";

import { connectSocket, setSocketSessionKey } from "../realtime/socket-client";
import {
  useEnsureSessionMutation,
  useSessionMeQuery,
  useSocketAuthMutation,
} from "../apis/sessions/sessions.queries";
import { ChatProvider } from "./_state/chat.context";

type RightView = "inbox" | "users" | "media";

function ChatInner() {
  const [rightView, setRightView] = React.useState<RightView>("inbox");

  const onList = () => setRightView((p) => (p === "inbox" ? "users" : "inbox"));
  const onGrid = () => setRightView("media");
  const onHome = () => setRightView("inbox");

  return (
    <div className="min-h-screen w-full bg-white text-zinc-900">
      <TopBar onHome={onHome} onList={onList} onGrid={onGrid} />

      <div className="h-[calc(100vh-64px-72px)] w-full px-4 py-4">
        <ChatLayout
          rightTitle={
            rightView === "media"
              ? "Media"
              : rightView === "users"
              ? "User List"
              : "Inbox"
          }
          rightPanel={
            rightView === "media" ? (
              <MediaGrid />
            ) : rightView === "users" ? (
              <UserList />
            ) : (
              <InboxList />
            )
          }
        />
      </div>

      <BottomBar />
    </div>
  );
}

export default function ChatPage() {
  const meQ = useSessionMeQuery(true);
  const ensureM = useEnsureSessionMutation();
  const socketAuthM = useSocketAuthMutation();

  const ensuredOnceRef = React.useRef(false);
  const socketOnceRef = React.useRef(false);

  // 1) Ensure session cookie exists (only once)
  React.useEffect(() => {
    if (meQ.isLoading) return;

    const ok = meQ.data?.ok === true;
    if (ok) return;

    if (!ensuredOnceRef.current && !ensureM.isPending) {
      ensuredOnceRef.current = true;
      ensureM.mutate({});
    }
  }, [meQ.isLoading, meQ.data?.ok, ensureM.isPending, ensureM]);

  // 2) Once session OK, fetch socket auth + connect (only once)
  React.useEffect(() => {
    const ok = meQ.data?.ok === true;
    if (!ok) return;
    if (socketOnceRef.current) return;

    socketOnceRef.current = true;

    (async () => {
      const auth = await socketAuthM.mutateAsync();

      if (!auth?.ok) {
        console.log("[socket-auth] failed", auth);
        socketOnceRef.current = false; // allow retry
        return;
      }

      const key = String(auth.sessionKey || "").trim();
      if (!key) {
        console.log("[socket-auth] missing sessionKey", auth);
        socketOnceRef.current = false; // allow retry
        return;
      }

      setSocketSessionKey(key);
      connectSocket();
    })();
  }, [meQ.data?.ok]);

  const ready = meQ.data?.ok === true;

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800">
          Initializing session…
        </div>
      </div>
    );
  }

  return (
    <ChatProvider>
      <ChatInner />
    </ChatProvider>
  );
}
