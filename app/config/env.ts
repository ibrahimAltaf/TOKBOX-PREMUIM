// src/config/env.ts
export const env = {
  API_BASE_URL:
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:8080",
  SOCKET_URL:
    process.env.NEXT_PUBLIC_SOCKET_URL?.trim() || "http://localhost:8080",
} as const;
