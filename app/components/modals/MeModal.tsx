"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { X, Upload, Video, Image as ImgIcon } from "lucide-react";
import { toast } from "sonner";

import { getMe, patchMe } from "../../apis/sessions/sessions.api";
import { uploadMedia } from "../../apis/media/media.api";
import { toAbsoluteUrl } from "../../../lib/http";
import MediaLightbox from "./MediaLightbox";

const cx = (...a: Array<string | false | undefined>) => a.filter(Boolean).join(" ");
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

type MediaItem = { id: string; url: string; kind: "image" | "video" };

export default function MeModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const [nickname, setNickname] = useState("");
  const [about, setAbout] = useState("");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [introVideoUrl, setIntroVideoUrl] = useState<string | null>(null);

  const [lightbox, setLightbox] = useState<{ open: boolean; src: string | null; kind: "image" | "video" }>({
    open: false,
    src: null,
    kind: "image",
  });

  useEffect(() => {
    if (!open) return;

    let dead = false;
    (async () => {
      setLoading(true);
      try {
        const res: any = await getMe();
        const me = res?.session ?? res?.data?.session ?? res?.data ?? res?.me ?? null;

        if (dead) return;

        setNickname(me?.nickname ?? "");
        setAbout(me?.about ?? "");

        setAvatarUrl(me?.avatarUrl ?? null);
        setPhotos(Array.isArray(me?.photos) ? me.photos : []);
        setIntroVideoUrl(me?.introVideoUrl ?? null);
      } catch {
        // ignore
      } finally {
        if (!dead) setLoading(false);
      }
    })();

    return () => {
      dead = true;
    };
  }, [open]);

  if (!open) return null;

  async function uploadOne(file: File, folder: string) {
    const up = await uploadMedia({ folder, files: [file] });
    const f = up?.files?.[0];
    // IMPORTANT: send raw URL as returned by backend (avoid toAbsoluteUrl for PATCH validation)
    return { url: (f?.url as string) ?? null, id: f?.id ?? null };
  }

  async function uploadMany(files: FileList | null, folder: string) {
    if (!files || files.length === 0) return [];
    const up = await uploadMedia({ folder, files: Array.from(files) });
    return (up?.files ?? []).map((f: any) => String(f.url)).filter(Boolean);
  }

  async function onPickAvatar(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Select an image file.");

    const t = toast.loading("Uploading avatar...");
    try {
      const r = await uploadOne(file, "profiles/avatar");
      if (!r.url) throw new Error("upload_failed");
      setAvatarUrl(r.url);
      toast.success("Avatar uploaded.", { id: t });
    } catch {
      toast.error("Avatar upload failed.", { id: t });
    }
  }

  async function onAddPhotos(files: FileList | null) {
    const t = toast.loading("Uploading photos...");
    try {
      const urls = await uploadMany(files, "profiles/photos");
      if (!urls.length) throw new Error("no_files");
      setPhotos((p) => [...p, ...urls]);
      toast.success(`${urls.length} photo(s) uploaded.`, { id: t });
    } catch {
      toast.error("Photos upload failed.", { id: t });
    }
  }

  async function onPickVideo(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("video/")) return toast.error("Select a video file.");

    const t = toast.loading("Uploading video...");
    try {
      const r = await uploadOne(file, "profiles/videos");
      if (!r.url) throw new Error("upload_failed");
      setIntroVideoUrl(r.url);
      toast.success("Video uploaded.", { id: t });
    } catch {
      toast.error("Video upload failed.", { id: t });
    }
  }

  async function save() {
    const n = nickname.trim();
    if (n.length < 2) return toast.error("Nickname min 2 chars.");

    const t = toast.loading("Saving...");
    try {
      await patchMe({
        nickname: n,
        about: about.trim() || undefined,
        ...(avatarUrl ? { avatarUrl } : {}),
        ...(photos.length ? { photos } : {}),
        ...(introVideoUrl ? { introVideoUrl } : {}),
      });

      toast.success("Updated.", { id: t });
      onClose();
    } catch (e: any) {
      const msg = e?.error?.message || e?.message || "Save failed.";
      toast.error(msg, { id: t });
    }
  }

  const avatarAbs = useMemo(() => (avatarUrl ? toAbsoluteUrl(avatarUrl) : null), [avatarUrl]);

  return (
    <>
      <div className="fixed inset-0 z-[110] grid place-items-center bg-black/40 p-4">
        <div className="w-full max-w-2xl rounded-3xl border border-purple-200 bg-white p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-zinc-900">My profile</div>
              <div className="mt-1 text-xs text-zinc-500">Update your avatar, photos, video, name and bio.</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-purple-200 bg-white hover:bg-purple-50"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-purple-700" />
            </button>
          </div>

          <div className="mt-4 grid gap-4">
            {/* avatar */}
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-purple-200 bg-purple-50">
                {avatarAbs ? (
                  <Image src={avatarAbs} alt="me" fill className="object-cover" unoptimized />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xs font-semibold text-purple-700">ME</div>
                )}
              </div>

              <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-700 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:brightness-110">
                <Upload className="h-4 w-4" />
                Upload avatar
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    onPickAvatar(e.target.files?.[0]);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>

            {/* name/bio */}
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs font-semibold text-zinc-700">Name</div>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-purple-200 bg-white px-4 text-sm outline-none focus:border-purple-400"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-700">Bio</div>
                <input
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-purple-200 bg-white px-4 text-sm outline-none focus:border-purple-400"
                />
              </div>
            </div>

            {/* photos */}
            <div>
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-zinc-700">Photos</div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-purple-200 bg-white px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50">
                  <ImgIcon className="h-4 w-4" />
                  Add photos
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      onAddPhotos(e.target.files);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>

              {photos.length === 0 ? (
                <div className="mt-2 rounded-2xl border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
                  No photos yet.
                </div>
              ) : (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {photos.map((p, i) => {
                    const abs = toAbsoluteUrl(p);
                    return (
                      <button
                        key={p + i}
                        type="button"
                        onClick={() => setLightbox({ open: true, src: p, kind: "image" })}
                        className="relative aspect-square overflow-hidden rounded-2xl border border-purple-200 bg-white"
                      >
                        <Image src={abs} alt="photo" fill className="object-cover" unoptimized />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* video */}
            <div>
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-zinc-700">Intro video</div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-purple-200 bg-white px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50">
                  <Video className="h-4 w-4" />
                  Upload video
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      onPickVideo(e.target.files?.[0]);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>

              {!introVideoUrl ? (
                <div className="mt-2 rounded-2xl border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
                  No video yet.
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setLightbox({ open: true, src: introVideoUrl, kind: "video" })}
                  className="mt-2 w-full overflow-hidden rounded-2xl border border-purple-200 bg-black"
                >
                  <video src={toAbsoluteUrl(introVideoUrl)} className="h-44 w-full object-cover" muted playsInline />
                </button>
              )}
            </div>

            <div className="mt-1 flex gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={save}
                className={cx(
                  "flex-1 rounded-2xl px-4 py-3 text-sm font-semibold text-white",
                  "bg-gradient-to-r from-purple-700 to-fuchsia-600 hover:brightness-110"
                )}
              >
                Save changes
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-purple-200 bg-white px-4 py-3 text-sm font-semibold text-purple-700 hover:bg-purple-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      <MediaLightbox
        open={lightbox.open}
        src={lightbox.src}
        kind={lightbox.kind}
        onClose={() => setLightbox({ open: false, src: null, kind: "image" })}
      />
    </>
  );
}
