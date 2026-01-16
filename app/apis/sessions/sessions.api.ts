const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");

function getOrCreateFingerprint(): string {
  if (typeof window === "undefined") return "fp-web-1234567890";

  const key = "tokbox:fingerprint:v1";
  const existing = window.localStorage.getItem(key);
  if (existing && existing.trim().length >= 10) return existing.trim();

  const fp =
    "fp-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2);

  window.localStorage.setItem(key, fp);
  return fp;
}

async function apiFetch(path: string, init?: RequestInit) {
  const isJsonBody = init?.body && typeof init.body === "string";

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(isJsonBody ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });

  const data = await res.json().catch(() => null);

  // normalize error
  if (!res.ok || (data && data.ok === false)) {
    return (
      data ?? {
        ok: false,
        error: "REQUEST_FAILED",
        status: res.status,
      }
    );
  }

  return data;
}

export async function ensureSession(body: any) {
  const payload = {
    ...(body ?? {}),
    fingerprint: (body?.fingerprint || getOrCreateFingerprint()).toString(),
  };

  // ensure fingerprint is >=10, else regenerate
  if (!payload.fingerprint || payload.fingerprint.trim().length < 10) {
    payload.fingerprint = getOrCreateFingerprint();
  }

  return apiFetch("/sessions/ensure", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMe() {
  return apiFetch("/sessions/me", { method: "GET" });
}

export async function getSocketAuth() {
  // backend: POST /sessions/socket-auth
  return apiFetch("/sessions/socket-auth", { method: "POST", body: JSON.stringify({}) });
}
