// src/lib/http.ts

/**
 * Public origins (set in .env.local / Vercel env)
 * - NEXT_PUBLIC_API_URL can be your backend origin (same as site in your case)
 * - NEXT_PUBLIC_APP_URL is optional, used only if you want absolute URLs for uploads
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.trim() || "https://tokbox.nl";

export const APP_BASE =
  process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://tokbox.nl";

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
  if (!FORCE_ABSOLUTE_UPLOADS) return path;
  return `${APP_BASE}${path}`;
}

export function toAbsoluteUrl(u?: string | null) {
  if (!u) return "";

  if (u.startsWith("/uploads/")) return makeUploadUrl(u);

  const m = u.match(/^https?:\/\/[^/]+(\/uploads\/.*)$/i);
  if (m?.[1]) return makeUploadUrl(m[1]);

  return u;
}

/**
 * For user images: prefer avatarUrl else first photo.
 */
export function safeImgSrc(avatarUrl?: string | null, photos?: string[] | null) {
  const raw = avatarUrl || (photos?.[0] ?? "") || "";
  const u = toAbsoluteUrl(raw);
  return u || undefined;
}

function isPlainObject(v: any): v is Record<string, any> {
  if (!v) return false;
  if (typeof v !== "object") return false;
  if (v instanceof FormData) return false;
  if (v instanceof URLSearchParams) return false;
  if (v instanceof Blob) return false;
  if (v instanceof ArrayBuffer) return false;
  return Object.prototype.toString.call(v) === "[object Object]";
}

/**
 * Fetch JSON via same-origin /api proxy so cookies work reliably.
 * - Supports init.json OR init.body as object (auto JSON stringify).
 */
export async function fetchJson<T = any>(
  path: string,
  init?: Omit<RequestInit, "body"> & {
    body?: any;
    json?: any;
  }
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

  // preferred explicit json
  if (init?.json !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(init.json);
  } else if (isPlainObject(body)) {
    // IMPORTANT: your code passes body: { ... } everywhere
    // This makes it actually work.
    headers["content-type"] = "application/json";
    body = JSON.stringify(body);
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
