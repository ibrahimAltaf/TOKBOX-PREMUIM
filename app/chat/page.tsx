"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import TopBar from "../components/TopBar";
import BottomBar from "../components/BottomBar";
import ChatLayout from "../components/ChatLayout";
import InboxList from "../components/InboxList";
import UserList from "../components/UserList";
import ProfilePanel from "../components/ProfilePanel";
import AllUsersGrid from "../components/AllUsersGrid";

import { getMe } from "../apis/sessions/sessions.api";
import { getSocketAuthKey } from "../apis/sessions/sessions.socket.api";
import { setSocketSessionKey, connectSocket } from "../realtime/socket.client";

import {
  setChatState,
  getChatState,
  subscribeChat,
  pushDmMessage,
  pushRoomMessage,
  pushRoomInvite,
  upsertRooms,
} from "../store/chat.store";

import CreateRoomModal from "../components/modals/CreateRoomModal";
import MeModal from "../components/modals/MeModal";
import CallModal from "../components/modals/CallModal";

import { startRingtone, stopRingtone } from "../../lib/ringtone";

type RightView = "inbox" | "users" | "media" | "profile";

function ChatInner() {
  const [rightView, setRightView] = useState<RightView>("inbox");
  const [s, setS] = useState(getChatState());

  const [meOpen, setMeOpen] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);

  useEffect(() => subscribeChat(setS), []);

  // Auto-open profile when a user is selected
  useEffect(() => {
    if (s.selectedUserId && rightView !== "profile") setRightView("profile");
  }, [s.selectedUserId, rightView]);

  // Ringtone handling for incoming calls
  useEffect(() => {
    if (s.incomingCall) startRingtone();
    else stopRingtone();
  }, [s.incomingCall]);

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
      <AllUsersGrid onPickUser={() => setRightView("profile")} />
    ) : rightView === "users" ? (
      <UserList />
    ) : rightView === "profile" ? (
      <ProfilePanel />
    ) : (
      <InboxList onOpenProfile={() => setRightView("profile")} />
    );

  const incoming = s.incomingCall as any;
  const outgoing = (s as any).outgoingCall as any;

  return (
    <div className="min-h-screen w-full bg-white text-zinc-900">
      <TopBar
        onHome={onHome}
        onList={onList}
        onGrid={onGrid}
        onOpenMe={() => setMeOpen(true)}
        onCreateRoom={() => setRoomOpen(true)}
      />

      <div className="h-[calc(100vh-64px-72px)] w-full px-4 py-4">
        <ChatLayout rightTitle={rightTitle} rightPanel={rightPanel} />
      </div>

      <BottomBar />

      {/* Incoming Call (server event = call:ring) */}
      <CallModal
        open={!!incoming}
        title="Incoming call"
        subtitle={
          incoming?.fromSessionId
            ? `From: ${String(incoming.fromSessionId).slice(0, 8)}`
            : ""
        }
        kind={(incoming?.kind as any) ?? "audio"}
        direction="incoming"
        onAccept={() => {
          try {
            connectSocket().emit("call:accept", { callId: incoming.callId });
          } catch {}
          stopRingtone();
          setChatState({
            incomingCall: null,
            activeCall: {
              callId: incoming.callId,
              peerSessionId: incoming.fromSessionId,
              kind: incoming.kind ?? "audio",
              direction: "in",
            },
          } as any);
        }}
        onReject={() => {
          try {
            connectSocket().emit("call:end", {
              callId: incoming.callId,
              reason: "rejected",
            });
          } catch {}
          stopRingtone();
          setChatState({ incomingCall: null } as any);
        }}
      />

      {/* Outgoing Call */}
      <CallModal
        open={!!outgoing}
        title="Calling..."
        subtitle={
          outgoing?.toSessionId
            ? `To: ${String(outgoing.toSessionId).slice(0, 8)}`
            : ""
        }
        kind={(outgoing?.kind as any) ?? "audio"}
        direction="outgoing"
        onReject={() => {
          try {
            connectSocket().emit("call:end", {
              callId: outgoing.callId,
              reason: "cancelled",
            });
          } catch {}
          setChatState({ outgoingCall: null } as any);
        }}
      />

      <CreateRoomModal open={roomOpen} onClose={() => setRoomOpen(false)} />
      <MeModal open={meOpen} onClose={() => setMeOpen(false)} />
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

        const me = res?.session ?? res?.data?.session ?? res?.data ?? null;
        const meId = String(me?._id ?? me?.id ?? "");
        if (meId) setChatState({ meSessionId: meId } as any);

        // socket auth key (handshake auth)
        try {
          const k: any = await getSocketAuthKey();
          if (k?.ok && k?.sessionKey) setSocketSessionKey(k.sessionKey);
        } catch {}

        const sock = connectSocket();

        // ---- EXACT server events ----

        // Room messages: io.to(roomNamespace(roomId)).emit("msg:new", { roomId, message })
        sock.off("msg:new");
        sock.on("msg:new", (payload: any) => {
          const roomId = String(payload?.roomId ?? "");
          if (!roomId) return;
          pushRoomMessage(roomId, payload?.message ?? payload);
        });

        // DM messages: server emits "dm:new" (payload any)
        sock.off("dm:new");
        sock.on("dm:new", (payload: any) => {
          // We try to find threadId in common keys
          const threadId =
            payload?.threadId ??
            payload?.key ??
            payload?.dmThreadId ??
            payload?.thread?._id ??
            payload?.thread?.id ??
            null;

          const tid = threadId ? String(threadId) : null;
          if (!tid) return;
          pushDmMessage(tid, payload?.message ?? payload);
        });

        // Typing updates: "typing:update" { roomId, sessionId, isTyping }
        sock.off("typing:update");
        sock.on("typing:update", (p: any) => {
          const roomId = String(p?.roomId ?? "");
          const sessionId = String(p?.sessionId ?? "");
          const isTyping = !!p?.isTyping;
          if (!roomId || !sessionId) return;

          setChatState((st: any) => ({
            typingByRoom: {
              ...(st.typingByRoom ?? {}),
              [roomId]: {
                ...((st.typingByRoom ?? {})[roomId] ?? {}),
                [sessionId]: isTyping,
              },
            },
          }));
        });

        // Presence update: "presence:update" { roomId, sessionIds }
        sock.off("presence:update");
        sock.on("presence:update", (p: any) => {
          const roomId = String(p?.roomId ?? "");
          const sessionIds = Array.isArray(p?.sessionIds) ? p.sessionIds.map(String) : [];
          if (!roomId) return;

          setChatState((st: any) => ({
            presenceByRoom: { ...(st.presenceByRoom ?? {}), [roomId]: sessionIds },
          }));
        });

        // Invites: "invite:new"
        sock.off("invite:new");
        sock.on("invite:new", (p: any) => {
          // Your invite system uses token to accept: invite:accept { token }
          const token = String(p?.token ?? p?.inviteToken ?? "");
          const kind = String(p?.kind ?? "ROOM");
          const roomId = p?.roomId ? String(p.roomId) : "";

          if (kind === "ROOM" && roomId) {
            pushRoomInvite({
              id: token || undefined,
              roomId,
              roomName: p?.roomName,
              fromSessionId: p?.fromSessionId,
              ts: p?.ts ? Number(p.ts) : Date.now(),
            });
          }

          // also notify
          setChatState((st: any) => ({
            notifs: [
              {
                id: `INVITE:${token}:${Date.now()}`,
                ts: Date.now(),
                read: false,
                kind: "INVITE",
                title: "New invite",
                body: kind === "ROOM" ? `Room invite received` : `Invite received`,
                key: token || roomId || undefined,
              },
              ...(st.notifs ?? []),
            ].slice(0, 200),
          }));
        });

        // Call flow: server -> call:ring, call:accepted, call:ended, call:busy
        sock.off("call:ring");
        sock.on("call:ring", (p: any) => {
          // payload: { callId, fromSessionId, roomId? }
          setChatState({ incomingCall: { ...p, kind: "audio" } } as any);
        });

        sock.off("call:accepted");
        sock.on("call:accepted", (p: any) => {
          // payload: { callId, bySessionId }
          // mark as active call (outgoing accepted)
          setChatState((st: any) => {
            const out = st.outgoingCall;
            if (!out || String(out.callId) !== String(p?.callId)) return {};
            return {
              outgoingCall: null,
              activeCall: {
                callId: out.callId,
                peerSessionId: out.toSessionId,
                kind: out.kind ?? "audio",
                direction: "out",
              },
            };
          });
        });

        sock.off("call:ended");
        sock.on("call:ended", () => {
          stopRingtone();
          setChatState({ incomingCall: null, outgoingCall: null, activeCall: null } as any);
        });

        sock.off("call:busy");
        sock.on("call:busy", (p: any) => {
          setChatState((st: any) => ({
            outgoingCall: null,
            notifs: [
              {
                id: `CALL_BUSY:${p?.targetSessionId ?? "na"}:${Date.now()}`,
                ts: Date.now(),
                read: false,
                kind: "CALL",
                title: "User busy",
                body: "The user is currently on another call.",
              },
              ...(st.notifs ?? []),
            ].slice(0, 200),
          }));
        });

        // optional: ask server for rooms list if your room handlers support it
        // sock.emit("rooms:list", {}, (r:any)=> upsertRooms(...))

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
