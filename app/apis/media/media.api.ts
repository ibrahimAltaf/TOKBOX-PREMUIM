// src/apis/media/media.api.ts
"use client";

import { API_BASE } from "@/lib/http";

export type UploadedFile = {
  id: string;
  url: string;
  mime?: string;
  size?: number;
};

export async function uploadMedia(args: {
  folder: string;
  files: File[];
}): Promise<{ ok: true; files: UploadedFile[]; urls: string[] }> {
  const fd = new FormData();
  fd.set("folder", args.folder);
  for (const f of args.files) fd.append("files", f);

  const res = await fetch(`${API_BASE}/media/upload`, {
    method: "POST",
    credentials: "include",
    body: fd,
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) throw data ?? { ok: false, error: `HTTP_${res.status}` };
  return data;
}
