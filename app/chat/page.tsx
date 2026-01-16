// app/chat/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import TopBar from "../components/TopBar";
import BottomBar from "../components/BottomBar";
import ChatLayout from "../components/ChatLayout";
import InboxList from "../components/InboxList";
import UserList from "../components/UserList";
import MediaGrid from "../components/MediaGrid";
import ProfilePanel from "../components/ProfilePanel";

import { getMe } from "../apis/sessions/sessions.api";
import { getSocketAuthKey } from "../apis/sessions/sessions.socket.api";
import { setSocketSessionKey } from "../../app/realtime/socket.client";
import { connectSocket } from "../realtime/socket.client";
import { setChatState, getChatState } from "../store/chat.store";

type RightView = "inbox" | "users" | "media" | "profile";

function ChatInner() {
  const [rightView, setRightView] = useState<RightView>("inbox");

  const onList = () => setRightView((p) => (p === "inbox" ? "users" : "inbox"));
  const onGrid = () => setRightView("media");
  const onHome = () => setRightView("inbox");

  const rightTitle =
    rightView === "media"
      ? "Media"
      : rightView === "users"
      ? "User List"
      : rightView === "profile"
      ? "Profile"
      : "Inbox";

  const rightPanel =
    rightView === "media" ? (
      <MediaGrid />
    ) : rightView === "users" ? (
      <UserList />
    ) : rightView === "profile" ? (
      <ProfilePanel />
    ) : (
      <InboxList onOpenProfile={() => setRightView("profile")} />
    );

  // auto-switch to profile when user selected
  useEffect(() => {
    const t = setInterval(() => {
      const st = getChatState();
      if (st.selectedUserId && rightView !== "profile") setRightView("profile");
    }, 300);
    return () => clearInterval(t);
  }, [rightView]);

  return (
    <div className="min-h-screen w-full bg-white text-zinc-900">
      <TopBar onHome={onHome} onList={onList} onGrid={onGrid} />

      <div className="h-[calc(100vh-64px-72px)] w-full px-4 py-4">
        <ChatLayout rightTitle={rightTitle} rightPanel={rightPanel} />
      </div>

      <BottomBar />
    </div>
  );
}

export default function ChatPage() {
  const router = useRouter();
  const [ok, setOk] = useState<"loading" | "yes" | "no">("loading");

  useEffect(() => {
    let dead = false;

    (async () => {
      try {
        const res: any = await getMe();
        if (dead) return;

        if (!res?.ok) {
          setOk("no");
          router.replace("/profile/setup");
          return;
        }

        const me =
          res?.session ?? res?.data?.session ?? res?.data ?? res?.me ?? null;
        const meId = String(me?._id ?? me?.id ?? "");
        if (meId) {
          // ✅ alignment depends on this
          setChatState({ meSessionId: meId });
        }

        try {
          const k = await getSocketAuthKey();
          if (k?.ok && k?.sessionKey) setSocketSessionKey(k.sessionKey);
        } catch {}

        // ensure socket connects once
        connectSocket();

        setOk("yes");
      } catch {
        if (dead) return;
        setOk("no");
        router.replace("/profile/setup");
      }
    })();

    return () => {
      dead = true;
    };
  }, [router]);

  if (ok !== "yes") return null;
  return <ChatInner />;
}
