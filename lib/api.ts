const API_BASE = ""; // ✅ same-origin (via next rewrites)

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

function extractErrMsg(data: any, fallback = "REQUEST_FAILED") {
  if (!data) return fallback;
  if (typeof data.error === "string") return data.error;

  // zod flatten() shape support
  const fe = data?.error?.fieldErrors;
  if (fe) {
    const firstKey = Object.keys(fe)[0];
    const firstMsg = firstKey ? fe[firstKey]?.[0] : null;
    if (firstMsg) return firstMsg;
  }
  const formErr = data?.error?.formErrors?.[0];
  if (formErr) return formErr;

  return fallback;
}

export async function apiFetch(path: string, init?: RequestInit) {
  const isJsonBody = init?.body && typeof init.body === "string";

  const res = await fetch(`${API_BASE}/api${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(isJsonBody ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || data?.ok === false) {
    return { ok: false, error: extractErrMsg(data), status: res.status, raw: data };
  }

  return data;
}

export async function ensureSession(body: any) {
  const payload = {
    ...(body ?? {}),
    fingerprint: (body?.fingerprint || getOrCreateFingerprint()).toString(),
  };

  return apiFetch("/sessions/ensure", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMe() {
  return apiFetch("/sessions/me", { method: "GET" });
}

export async function getSocketAuth() {
  return apiFetch("/sessions/socket-auth", {
    method: "POST",
    body: JSON.stringify({}),
  });
}
