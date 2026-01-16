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
  key?: string; // threadId or roomId (optional)
};

export type ChatState = {
  // identity
  meSessionId: string | null;

  // navigation
  mode: Mode;
  activeThreadId: string | null;
  activePeerId: string | null;
  activeRoomId: string | null;

  // data (NEW canonical names used by ChatBox)
  onlineUsers: OnlineUser[];
  dmMessagesByThread: Record<string, Msg[]>;
  roomMessagesByRoom: Record<string, Msg[]>;

  // typing/presence
  typingByRoom: Record<string, Record<string, boolean>>;
  presenceByRoom: Record<string, string[]>;

  // notifications
  notifs: Notif[];

  // profile panel selection
  selectedUserId: string | null;

  // calling
  incomingCall: null | {
    callId: string;
    fromSessionId: string;
    roomId?: string | null;
  };

  // ---- Backward compat aliases (so old components don't break)
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

  // aliases
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

export function subscribeChat(fn: (s: ChatState) => void) {
  subs.add(fn);
  fn(state);
  return () => subs.delete(fn);
}

function syncAliases(next: ChatState): ChatState {
  // keep alias maps in sync for any older code
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

  const fallback =
    String(m?.fromSessionId ?? m?.authorSessionId ?? m?.sessionId ?? "na") +
    ":" +
    String(m?.ts ?? (m?.createdAt ? Date.parse(m.createdAt) : Date.now())) +
    ":" +
    String(m?.text ?? m?.body ?? "");

  const id = String(idRaw ?? fallback);

  const mediaUrls = Array.isArray(m?.mediaUrls) ? m.mediaUrls : [];
  const mediaIds = Array.isArray(m?.mediaIds) ? m.mediaIds : [];

  return {
    id,
    text: String(m?.text ?? m?.body ?? ""),
    ts: Number(m?.ts ?? (m?.createdAt ? Date.parse(m.createdAt) : Date.now())),
    fromSessionId: m?.fromSessionId ?? m?.authorSessionId ?? m?.sessionId,
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
    // avoid duplicates
    if (st.notifs.some((x) => x.id === full.id)) return {};
    return { notifs: [full, ...st.notifs].slice(0, 200) };
  });
}

export function markAllNotifsRead() {
  setChatState((st) => ({
    notifs: st.notifs.map((n) => ({ ...n, read: true })),
  }));
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
