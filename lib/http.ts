// src/lib/http.ts

/**
 * Public origins (set in .env.local / Vercel env)
 * - NEXT_PUBLIC_API_URL can be your backend origin (same as site in your case)
 * - NEXT_PUBLIC_APP_URL is optional, used only if you want absolute URLs for uploads
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://tokbox.nl";

export const APP_BASE = process.env.NEXT_PUBLIC_APP_URL || "https://tokbox.nl";

/**
 * Fetch JSON via same-origin /api proxy so cookies work reliably.
 */
export async function fetchJson<T = any>(
  path: string,
  init?: RequestInit & { json?: any }
): Promise<T> {
  const url = path.startsWith("http")
    ? path
    : path.startsWith("/api/")
    ? path
    : `/api${path.startsWith("/") ? "" : "/"}${path}`;

  const headers: Record<string, string> = {
    accept: "application/json",
    ...(init?.headers as any),
  };

  let body: any = init?.body;
  if (init?.json !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(init.json);
  }

  const res = await fetch(url, {
    ...init,
    body,
    headers,
    credentials: "include",
  });

  const text = await res.text();
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const err: any = new Error("request_failed");
    err.status = res.status;
    err.error = data;
    throw err;
  }

  return data as T;
}

/**
 * Convert ANY backend upload URL to either:
 *  - same-origin "/uploads/..." (recommended)
 *  - OR absolute "https://yourdomain/uploads/..." if you want
 *
 * Set NEXT_PUBLIC_UPLOADS_ABSOLUTE=true to force absolute URLs.
 */
const FORCE_ABSOLUTE_UPLOADS =
  (process.env.NEXT_PUBLIC_UPLOADS_ABSOLUTE || "").toLowerCase() === "true";

function makeUploadUrl(path: string) {
  if (!path.startsWith("/uploads/")) return path;

  // default: same-origin (best for cookies + Next/Image)
  if (!FORCE_ABSOLUTE_UPLOADS) return path;

  // absolute: APP_BASE + /uploads/...
  return `${APP_BASE}${path}`;
}

export function toAbsoluteUrl(u?: string | null) {
  if (!u) return "";

  // already relative uploads
  if (u.startsWith("/uploads/")) return makeUploadUrl(u);

  // If URL contains /uploads/... on any host, map it to same-origin
  const m = u.match(/^https?:\/\/[^/]+(\/uploads\/.*)$/i);
  if (m?.[1]) return makeUploadUrl(m[1]);

  // Otherwise return as-is (non-upload URLs)
  return u;
}

/**
 * For user images: prefer avatarUrl else first photo.
 */
export function safeImgSrc(
  avatarUrl?: string | null,
  photos?: string[] | null
) {
  const raw = avatarUrl || (photos?.[0] ?? "") || "";
  const u = toAbsoluteUrl(raw);
  return u || undefined;
}
