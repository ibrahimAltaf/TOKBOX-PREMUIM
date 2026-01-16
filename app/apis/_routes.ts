// src/apis/_routes.ts
/**
 * Adjust these if your buildRouter mounts differently.
 * Based on your backend snippets:
 * - messagesRouter likely mounted under /messages
 * - roomsRouter under /rooms
 * - roomMembers maybe under /room-members OR /rooms (depends on buildRouter)
 */
export const API_ROUTES = {
  rooms: "/rooms",
  messages: "/messages", // IMPORTANT: backend messages.routes.ts suggests /messages
  dm: "/dm",
  invites: "/invites",
  media: "/media",
  users: "/users",
  usersPics: "/users-pics",
  sessions: "/sessions",
};
