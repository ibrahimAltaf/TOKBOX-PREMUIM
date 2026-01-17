// app/store/chat.store.ts
type Mode = "DM" | "ROOM";

export type Msg = {
  id: string;
  text: string;
  ts: number;
  fromSessionId?: string;
  mediaUrls?: string[];
  mediaIds?: string[];
};

export type OnlineUser = {
  id: string;
  nickname?: string;
  about?: string;
  geoLabel?: string;
  avatarUrl?: string;
  photos?: string[];
  introVideoUrl?: string;
  online?: boolean;
  lastSeenAt?: string;
};

export type Notif = {
  id: string;
  ts: number;
  read: boolean;
  kind: "DM" | "ROOM" | "CALL" | "INVITE" | "SYSTEM";
  title: string;
  body?: string;
  key?: string; // threadId or roomId or callId
};

export type Room = {
  id: string;
  name?: string;
  memberIds?: string[];
};

export type RoomInvite = {
  id: string;
  roomId: string;
  roomName?: string;
  fromSessionId?: string;
  ts: number;
};

export type ActiveCall = {
  callId: string;
  peerSessionId: string;
  kind: "audio" | "video";
  direction: "in" | "out";
};

export type OutgoingCall = {
  callId: string;
  toSessionId: string;
  kind: "audio" | "video";
};

export type ChatState = {
  meSessionId: string | null;

  mode: Mode;
  activeThreadId: string | null;
  activePeerId: string | null;
  activeRoomId: string | null;

  onlineUsers: OnlineUser[];
  dmMessagesByThread: Record<string, Msg[]>;
  roomMessagesByRoom: Record<string, Msg[]>;

  typingByRoom: Record<string, Record<string, boolean>>;
  presenceByRoom: Record<string, string[]>;

  notifs: Notif[];

  selectedUserId: string | null;

  incomingCall: null | {
    callId: string;
    fromSessionId: string;
    kind?: "audio" | "video";
    roomId?: string | null;
  };

  outgoingCall: OutgoingCall | null;
  activeCall: ActiveCall | null;

  favUserIds: string[];
  blockedUserIds: string[];

  rooms: Room[];
  roomInvites: RoomInvite[];

  // Back-compat aliases (kept)
  dmByThread: Record<string, Msg[]>;
  roomByRoom: Record<string, Msg[]>;
};

let state: ChatState = {
  meSessionId: null,

  mode: "DM",
  activeThreadId: null,
  activePeerId: null,
  activeRoomId: null,

  onlineUsers: [],
  dmMessagesByThread: {},
  roomMessagesByRoom: {},

  typingByRoom: {},
  presenceByRoom: {},

  notifs: [],

  selectedUserId: null,

  incomingCall: null,
  outgoingCall: null,
  activeCall: null,

  favUserIds: [],
  blockedUserIds: [],

  rooms: [],
  roomInvites: [],

  dmByThread: {},
  roomByRoom: {},
};

const subs = new Set<(s: ChatState) => void>();

function emit() {
  subs.forEach((fn) => fn(state));
}

export function getChatState() {
  return state;
}

function syncAliases(next: ChatState): ChatState {
  next.dmByThread = next.dmMessagesByThread;
  next.roomByRoom = next.roomMessagesByRoom;
  return next;
}

export function setChatState(
  patch: Partial<ChatState> | ((s: ChatState) => Partial<ChatState>)
) {
  const nextPatch = typeof patch === "function" ? patch(state) : patch;
  state = syncAliases({ ...state, ...nextPatch });
  emit();
}

function mapMsg(m: any): Msg {
  const idRaw = m?.id ?? m?._id ?? null;

  const ts =
    m?.ts != null
      ? Number(m.ts)
      : m?.createdAt
      ? Date.parse(m.createdAt)
      : Date.now();

  const fromSessionId =
    m?.fromSessionId ?? m?.authorSessionId ?? m?.sessionId ?? m?.from;

  const fallback = `${String(fromSessionId ?? "na")}:${String(ts)}:${String(
    m?.text ?? m?.body ?? ""
  )}`;

  const id = String(idRaw ?? fallback);

  const mediaUrls = Array.isArray(m?.mediaUrls) ? m.mediaUrls : [];
  const mediaIds = Array.isArray(m?.mediaIds) ? m.mediaIds : [];

  return {
    id,
    text: String(m?.text ?? m?.body ?? ""),
    ts,
    fromSessionId: fromSessionId ? String(fromSessionId) : undefined,
    mediaUrls,
    mediaIds,
  };
}

function pushUnique(list: Msg[], msg: Msg) {
  if (list.some((x) => x.id === msg.id)) return list;
  return [...list, msg].sort((a, b) => a.ts - b.ts);
}

export function pushDmMessage(threadId: string, raw: any) {
  const m = mapMsg(raw);
  setChatState((st) => {
    const prev = st.dmMessagesByThread[threadId] ?? [];
    return {
      dmMessagesByThread: {
        ...st.dmMessagesByThread,
        [threadId]: pushUnique(prev, m),
      },
    };
  });
}

export function pushRoomMessage(roomId: string, raw: any) {
  const m = mapMsg(raw);
  setChatState((st) => {
    const prev = st.roomMessagesByRoom[roomId] ?? [];
    return {
      roomMessagesByRoom: {
        ...st.roomMessagesByRoom,
        [roomId]: pushUnique(prev, m),
      },
    };
  });
}

// ---------------- Notifications ----------------

function notifId(n: Partial<Notif>) {
  return (
    n.id ??
    `${n.kind ?? "SYSTEM"}:${n.key ?? "na"}:${n.ts ?? Date.now()}:${String(
      n.title ?? ""
    )}:${String(n.body ?? "")}`
  );
}

export function pushNotif(n: Omit<Notif, "id"> & { id?: string }) {
  const full: Notif = {
    id: notifId(n),
    ts: n.ts ?? Date.now(),
    read: !!n.read,
    kind: n.kind,
    title: n.title,
    body: n.body,
    key: n.key,
  };

  setChatState((st) => {
    if (st.notifs.some((x) => x.id === full.id)) return {};
    return { notifs: [full, ...st.notifs].slice(0, 200) };
  });
}

export function markAllNotifsRead() {
  setChatState((st) => ({
    notifs: st.notifs.map((n) => ({ ...n, read: true })),
  }));
}

// ---------------- Rooms ----------------

export function upsertRooms(list: Room[]) {
  setChatState((st) => {
    const map = new Map<string, Room>();
    (st.rooms ?? []).forEach((r) => map.set(String(r.id), r));
    list.forEach((r) => map.set(String(r.id), r));
    return { rooms: Array.from(map.values()) };
  });
}

export function pushRoomInvite(inv: Omit<RoomInvite, "id"> & { id?: string }) {
  const full: RoomInvite = {
    id:
      inv.id ??
      `invite:${inv.roomId}:${inv.fromSessionId ?? "na"}:${inv.ts ?? Date.now()}`,
    roomId: String(inv.roomId),
    roomName: inv.roomName,
    fromSessionId: inv.fromSessionId,
    ts: inv.ts ?? Date.now(),
  };

  setChatState((st) => {
    if ((st.roomInvites ?? []).some((x) => x.id === full.id)) return {};
    return { roomInvites: [full, ...(st.roomInvites ?? [])].slice(0, 100) };
  });

  pushNotif({
    kind: "INVITE",
    ts: full.ts,
    read: false,
    title: "Room invite",
    body: full.roomName ? `Invite to: ${full.roomName}` : `Invite to room: ${full.roomId}`,
    key: full.roomId,
  });
}

// ---------------- Profile selection ----------------

export function selectUser(userId: string | null) {
  setChatState({ selectedUserId: userId });
}

export function getSelectedUser() {
  const st = getChatState();
  if (!st.selectedUserId) return null;
  return (
    st.onlineUsers.find((u) => String(u.id) === String(st.selectedUserId)) ??
    null
  );
}

export function subscribeChat(fn: (s: ChatState) => void) {
  subs.add(fn);

  try {
    fn(state);
  } catch {}

  // cleanup
  return () => {
    subs.delete(fn);
  };
}
