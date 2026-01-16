import { apiFetch } from "../../../lib/api";

export type UserPic = {
  id: string;
  nickname: string | null;
  about: string | null;
  avatarUrl: string | null;
  photos: string[];
  geoLabel: string | null;
  lat: number | null;
  lng: number | null;
  lastSeenAt: string | null;
  online: boolean;
};

export async function listUsersPics(params?: {
  q?: string;
  limit?: number;
  onlineOnly?: boolean;
}) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  qs.set("limit", String(params?.limit ?? 60));
  qs.set("onlineOnly", String(params?.onlineOnly ?? true));

  return apiFetch<{ ok: true; users: UserPic[] }>(
    `/users-pics?${qs.toString()}`
  );
}
