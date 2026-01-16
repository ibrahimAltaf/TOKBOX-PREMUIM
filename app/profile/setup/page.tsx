"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bell,
  Camera,
  Check,
  Image as ImageIcon,
  MapPin,
  Mic,
  Upload,
  Video as VideoIcon,
  X,
} from "lucide-react";

import {
  ensureSession,
  deleteMe,
  patchMe,
} from "../../apis/sessions/sessions.api";
import { uploadMedia } from "../../apis/media/media.api";
import { toAbsoluteUrl } from "../../../lib/http";

type MediaItem = { id: string; file: File; url: string };
type Step = "idle" | "working" | "done" | "error";

const MAX_IMAGES = 8;
const MAX_VIDEOS = 3;
const MAX_IMAGE_MB = 8;
const MAX_VIDEO_MB = 40;

const cx = (...a: Array<string | false | undefined>) =>
  a.filter(Boolean).join(" ");
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const mb = (bytes: number) => bytes / (1024 * 1024);

const BG_IMAGE =
  "https://sendbird.imgix.net/cms/image2_2024-03-26-214252_jekb.png";

export default function ProfileSetupPage() {
  const router = useRouter();

  // form
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");

  // avatar & media
  const [avatar, setAvatar] = useState<MediaItem | null>(null);
  const [images, setImages] = useState<MediaItem[]>([]);
  const [videos, setVideos] = useState<MediaItem[]>([]);

  // permissions summary
  const [locationOn, setLocationOn] = useState<Step>("idle");
  const [notifOn, setNotifOn] = useState<Step>("idle");
  const [camOn, setCamOn] = useState<Step>("idle");
  const [micOn, setMicOn] = useState<Step>("idle");

  // camera preview
  const streamRef = useRef<MediaStream | null>(null);
  const camPreviewRef = useRef<HTMLVideoElement | null>(null);

  // permission modal
  const [permOpen, setPermOpen] = useState(false);

  const nicknameOk = nickname.trim().length >= 2;

  /**
   * ✅ INIT RULES (as you asked)
   * - When user comes to this page: delete old session (best-effort).
   * - DO NOT create a "guest" session.
   * - Only create a new session if needed (cookie missing) by calling ensureSession() without forcing "guest".
   */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const t = toast.loading("Preparing session...");
      try {
        // 1) always attempt to delete any previous session
        try {
          await deleteMe();
        } catch {}

        // 2) ensure there is an active session cookie if backend requires it
        // If your backend returns ok false when no session exists,
        // ensureSession will create one (anonymous) WITHOUT "guest" forcing.
        try {
          await ensureSession({
            // IMPORTANT: do NOT force nickname "guest"
            nickname: undefined as any,
            about: undefined as any,
            fingerprint: `fp_${uid()}`,
          });
        } catch {
          // if ensureSession is strict about schema, you can remove nickname/about entirely in your API layer
        }

        if (!cancelled) toast.success("Ready.", { id: t });
      } catch (e: any) {
        if (!cancelled)
          toast.error(e?.error?.message || "Session init failed.", { id: t });
      }
    })();

    return () => {
      cancelled = true;

      // cleanup object urls + stream
      if (avatar) URL.revokeObjectURL(avatar.url);
      images.forEach((m) => URL.revokeObjectURL(m.url));
      videos.forEach((m) => URL.revokeObjectURL(m.url));
      stopPreview();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickAvatar(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image for profile photo.");
      return;
    }
    if (mb(file.size) > MAX_IMAGE_MB) {
      toast.error(`Profile photo must be under ${MAX_IMAGE_MB}MB.`);
      return;
    }
    if (avatar) URL.revokeObjectURL(avatar.url);
    setAvatar({ id: uid(), file, url: URL.createObjectURL(file) });
    toast.success("Profile photo selected.");
  }

  function addImages(files: FileList | null) {
    if (!files) return;

    const current = images.length;
    const roomLeft = Math.max(0, MAX_IMAGES - current);
    if (roomLeft === 0) {
      toast.error(`Max ${MAX_IMAGES} images allowed.`);
      return;
    }

    const next: MediaItem[] = [];
    for (const f of Array.from(files).slice(0, roomLeft)) {
      if (!f.type.startsWith("image/")) continue;
      if (mb(f.size) > MAX_IMAGE_MB) {
        toast.error(
          `An image was too large (>${MAX_IMAGE_MB}MB) and was skipped.`
        );
        continue;
      }
      next.push({ id: uid(), file: f, url: URL.createObjectURL(f) });
    }

    if (!next.length) return;
    setImages((prev) => [...prev, ...next]);
    toast.success(`${next.length} image(s) added.`);
  }

  function addVideos(files: FileList | null) {
    if (!files) return;

    const current = videos.length;
    const roomLeft = Math.max(0, MAX_VIDEOS - current);
    if (roomLeft === 0) {
      toast.error(`Max ${MAX_VIDEOS} videos allowed.`);
      return;
    }

    const next: MediaItem[] = [];
    for (const f of Array.from(files).slice(0, roomLeft)) {
      if (!f.type.startsWith("video/")) continue;
      if (mb(f.size) > MAX_VIDEO_MB) {
        toast.error(
          `A video was too large (>${MAX_VIDEO_MB}MB) and was skipped.`
        );
        continue;
      }
      next.push({ id: uid(), file: f, url: URL.createObjectURL(f) });
    }

    if (!next.length) return;
    setVideos((prev) => [...prev, ...next]);
    toast.success(`${next.length} video(s) added.`);
  }

  function removeItem(list: "images" | "videos", id: string) {
    if (list === "images") {
      setImages((prev) => {
        const item = prev.find((x) => x.id === id);
        if (item) URL.revokeObjectURL(item.url);
        return prev.filter((x) => x.id !== id);
      });
      toast.message("Image removed.");
    } else {
      setVideos((prev) => {
        const item = prev.find((x) => x.id === id);
        if (item) URL.revokeObjectURL(item.url);
        return prev.filter((x) => x.id !== id);
      });
      toast.message("Video removed.");
    }
  }

  async function enableLocation() {
    setLocationOn("working");
    try {
      if (!("geolocation" in navigator))
        throw new Error("Geolocation unsupported.");
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(),
          (e) => reject(e),
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 30_000 }
        );
      });
      setLocationOn("done");
      toast.success("Location enabled.");
    } catch {
      setLocationOn("error");
      toast.error("Location permission not granted.");
    }
  }

  async function enableNotifications() {
    setNotifOn("working");
    try {
      if (!("Notification" in window))
        throw new Error("Notifications unsupported.");
      const p = await Notification.requestPermission();
      if (p !== "granted") throw new Error("Denied");
      setNotifOn("done");
      toast.success("Notifications enabled.");
    } catch {
      setNotifOn("error");
      toast.error("Notifications permission not granted.");
    }
  }

  async function enableCameraMicPreview() {
    setCamOn("working");
    setMicOn("working");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;

      setCamOn("done");
      setMicOn("done");

      if (camPreviewRef.current) {
        camPreviewRef.current.srcObject = stream;
        await camPreviewRef.current.play().catch(() => {});
      }

      toast.success("Camera & microphone enabled.");
    } catch {
      setCamOn("error");
      setMicOn("error");
      toast.error("Camera/microphone permission not granted.");
      stopPreview();
    }
  }

  function stopPreview() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (camPreviewRef.current) camPreviewRef.current.srcObject = null;
  }

  // ✅ SAVE + REDIRECT
  async function saveProfile() {
    if (!nicknameOk) {
      toast.error("Nickname is required (min 2 characters).");
      return;
    }

    const loadingId = toast.loading("Saving profile...");

    try {
      // 1) Upload avatar (optional)
      let avatarUrl: string | undefined;
      let avatarMediaId: string | undefined;

      if (avatar?.file) {
        const up = await uploadMedia({
          folder: "profiles/avatar",
          files: [avatar.file],
        });
        const f = up.files?.[0];
        avatarUrl = toAbsoluteUrl(f?.url);
        avatarMediaId = f?.id;
      }

      // 2) Upload photos gallery (optional)
      let photos: string[] | undefined;
      let photoMediaIds: string[] | undefined;

      if (images.length) {
        const up = await uploadMedia({
          folder: "profiles/photos",
          files: images.map((x) => x.file),
        });

        photos = (up.files ?? [])
          .map((x: any) => toAbsoluteUrl(x.url))
          .filter(Boolean) as string[];

        photoMediaIds = (up.files ?? []).map((x: any) => x.id).filter(Boolean);
      }

      // 3) Upload intro video (optional: use first)
      let introVideoUrl: string | undefined;
      let introVideoMediaId: string | undefined;

      if (videos.length) {
        const up = await uploadMedia({
          folder: "profiles/videos",
          files: [videos[0].file],
        });
        const f = up.files?.[0];
        introVideoUrl = toAbsoluteUrl(f?.url);
        introVideoMediaId = f?.id;
      }

      // 4) Patch session profile
      await patchMe({
        nickname: nickname.trim(),
        about: bio.trim() || undefined,

        ...(avatarUrl ? { avatarUrl } : {}),
        ...(avatarMediaId ? { avatarMediaId } : {}),

        ...(photos?.length ? { photos } : {}),
        ...(photoMediaIds?.length ? { photoMediaIds } : {}),

        ...(introVideoUrl ? { introVideoUrl } : {}),
        ...(introVideoMediaId ? { introVideoMediaId } : {}),
      });

      toast.success("Profile saved ✅", { id: loadingId });

      // ✅ redirect to chat
      router.replace("/chat");
    } catch (e: any) {
      const msg = e?.error?.fieldErrors
        ? JSON.stringify(e.error.fieldErrors)
        : e?.error?.message || e?.message || "Failed to save.";
      toast.error(msg, { id: loadingId });
    }
  }

  const summary = useMemo(() => {
    return [
      {
        label: "Location",
        step: locationOn,
        icon: <MapPin className="h-4 w-4" />,
      },
      {
        label: "Notifications",
        step: notifOn,
        icon: <Bell className="h-4 w-4" />,
      },
      { label: "Camera", step: camOn, icon: <Camera className="h-4 w-4" /> },
      { label: "Microphone", step: micOn, icon: <Mic className="h-4 w-4" /> },
    ];
  }, [locationOn, notifOn, camOn, micOn]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-zinc-900">
      {/* background */}
      <div className="absolute inset-0 -z-10">
        <Image
          src={BG_IMAGE}
          alt="TokBox background"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.35),rgba(255,255,255,0.70)_55%,rgba(255,255,255,0.96))]" />
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/30 via-white/35 to-white" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(168,85,247,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(168,85,247,0.08)_1px,transparent_1px)] bg-[size:72px_72px] opacity-40" />
      </div>

      <div className="mx-auto w-full max-w-5xl px-5 py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-purple-700">TokBox</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Profile setup
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Add your nickname, bio and media. Permissions are optional.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setPermOpen(true)}
            className="rounded-2xl border border-purple-200 bg-white/70 px-4 py-2 text-sm font-semibold text-purple-700 shadow-sm backdrop-blur hover:bg-white"
          >
            Permissions
          </button>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          {/* Form */}
          <div className="rounded-3xl border border-purple-200 bg-white/75 p-6 shadow-sm backdrop-blur">
            <div className="grid gap-5">
              <Field label="Nickname (required)">
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="e.g. IbrahimAltaf"
                  className="h-12 w-full rounded-2xl border border-purple-200 bg-white px-4 text-sm outline-none placeholder:text-zinc-400 focus:border-purple-400"
                />
              </Field>

              <Field label="Bio (optional)">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Short bio..."
                  className="min-h-[110px] w-full resize-none rounded-2xl border border-purple-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-zinc-400 focus:border-purple-400"
                />
              </Field>

              <Field label="Profile photo (optional)">
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-purple-200 bg-purple-50">
                    {avatar ? (
                      <Image
                        src={avatar.url}
                        alt="avatar"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-xs font-semibold text-purple-700">
                        Photo
                      </div>
                    )}
                  </div>

                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-700 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-110">
                    <Upload className="h-4 w-4" />
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        pickAvatar(e.target.files?.[0]);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>

                  {avatar && (
                    <button
                      type="button"
                      onClick={() => {
                        URL.revokeObjectURL(avatar.url);
                        setAvatar(null);
                        toast.message("Profile photo removed.");
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-purple-200 bg-white px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-50"
                    >
                      <X className="h-4 w-4" />
                      Remove
                    </button>
                  )}
                </div>
                <div className="mt-2 text-xs text-zinc-500">
                  JPG/PNG • up to {MAX_IMAGE_MB}MB
                </div>
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label={`Images (optional) • up to ${MAX_IMAGES}`}>
                  <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-purple-200 bg-white px-4 py-3 text-sm font-semibold text-purple-700 hover:bg-purple-50">
                    <ImageIcon className="h-4 w-4" />
                    Add images
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        addImages(e.target.files);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <ThumbGrid
                    items={images}
                    kind="image"
                    onRemove={(id) => removeItem("images", id)}
                  />
                </Field>

                <Field label={`Videos (optional) • up to ${MAX_VIDEOS}`}>
                  <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-purple-200 bg-white px-4 py-3 text-sm font-semibold text-purple-700 hover:bg-purple-50">
                    <VideoIcon className="h-4 w-4" />
                    Add videos
                    <input
                      type="file"
                      accept="video/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        addVideos(e.target.files);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <ThumbGrid
                    items={videos}
                    kind="video"
                    onRemove={(id) => removeItem("videos", id)}
                  />
                </Field>
              </div>

              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  disabled={!nicknameOk}
                  onClick={saveProfile}
                  className={cx(
                    "inline-flex h-12 items-center justify-center rounded-2xl px-6 text-sm font-semibold text-white shadow-sm",
                    nicknameOk
                      ? "bg-gradient-to-r from-purple-700 to-fuchsia-600 hover:brightness-110"
                      : "cursor-not-allowed bg-zinc-300"
                  )}
                >
                  Save
                </button>

                <button
                  type="button"
                  onClick={() => setPermOpen(true)}
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-purple-200 bg-white px-6 text-sm font-semibold text-purple-700 hover:bg-purple-50"
                >
                  Review Permissions
                </button>
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="grid gap-6">
            <div className="rounded-3xl border border-purple-200 bg-white/75 p-6 shadow-sm backdrop-blur">
              <div className="text-sm font-semibold">
                Privacy-friendly summary
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                We don’t show raw coordinates in UI. Just whether it’s enabled.
              </div>

              <div className="mt-4 grid gap-3">
                {summary.map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center justify-between rounded-2xl border border-purple-200 bg-white p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-2xl bg-purple-50 text-purple-700">
                        {s.icon}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{s.label}</div>
                        <div className="mt-1 text-xs text-zinc-500">
                          {stepText(s.step)}
                        </div>
                      </div>
                    </div>
                    <StatusPill step={s.step} />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-purple-200 bg-white/75 p-6 shadow-sm backdrop-blur">
              <div className="text-sm font-semibold">
                Camera preview (optional)
              </div>
              <div className="mt-3 overflow-hidden rounded-2xl border border-purple-200 bg-black">
                <video
                  ref={camPreviewRef}
                  playsInline
                  muted
                  className="h-44 w-full object-cover"
                />
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={enableCameraMicPreview}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-purple-700 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
                >
                  Enable camera & mic
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopPreview();
                    toast.message("Preview stopped.");
                  }}
                  className="rounded-2xl border border-purple-200 bg-white px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-50"
                >
                  Stop
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Permission Modal */}
        {permOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
            <div className="w-full max-w-lg rounded-3xl border border-purple-200 bg-white p-5 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Permissions</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    Enable what you need. You can continue without them.
                  </div>
                </div>
                <button
                  onClick={() => setPermOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-purple-200 bg-white hover:bg-purple-50"
                  aria-label="Close"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                <ModalRow
                  title="Location"
                  desc="Used for nearby / region experiences (optional)."
                  step={locationOn}
                  onClick={enableLocation}
                />
                <ModalRow
                  title="Notifications"
                  desc="For message alerts (optional)."
                  step={notifOn}
                  onClick={enableNotifications}
                />
                <ModalRow
                  title="Camera + Microphone"
                  desc="For calls / recording (optional)."
                  step={camOn === "done" && micOn === "done" ? "done" : camOn}
                  onClick={enableCameraMicPreview}
                />
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPermOpen(false)}
                  className="flex-1 rounded-2xl border border-purple-200 bg-white px-4 py-3 text-sm font-semibold text-purple-700 hover:bg-purple-50"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- UI helpers ---------------- */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-zinc-700">{label}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function StatusPill({ step }: { step: Step }) {
  const base =
    "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold";
  if (step === "done")
    return (
      <span
        className={cx(
          base,
          "border-emerald-200 bg-emerald-50 text-emerald-700"
        )}
      >
        <Check className="h-3.5 w-3.5" /> Enabled
      </span>
    );
  if (step === "working")
    return (
      <span className={cx(base, "border-amber-200 bg-amber-50 text-amber-700")}>
        Working…
      </span>
    );
  if (step === "error")
    return (
      <span className={cx(base, "border-rose-200 bg-rose-50 text-rose-700")}>
        Not allowed
      </span>
    );
  return (
    <span className={cx(base, "border-zinc-200 bg-zinc-50 text-zinc-700")}>
      Optional
    </span>
  );
}

function stepText(step: Step) {
  if (step === "done") return "Enabled";
  if (step === "working") return "Requesting…";
  if (step === "error") return "Denied / unavailable";
  return "Optional";
}

function ModalRow({
  title,
  desc,
  step,
  onClick,
}: {
  title: string;
  desc: string;
  step: Step;
  onClick: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-purple-200 bg-white p-4">
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-1 text-xs text-zinc-500">{desc}</div>
      </div>
      <div className="flex items-center gap-2">
        <StatusPill step={step} />
        <button
          type="button"
          onClick={onClick}
          className="rounded-2xl bg-gradient-to-r from-purple-700 to-fuchsia-600 px-3 py-2 text-xs font-semibold text-white hover:brightness-110"
        >
          Enable
        </button>
      </div>
    </div>
  );
}

function ThumbGrid({
  items,
  kind,
  onRemove,
}: {
  items: MediaItem[];
  kind: "image" | "video";
  onRemove: (id: string) => void;
}) {
  if (!items.length)
    return <div className="mt-3 text-xs text-zinc-500">Nothing added.</div>;

  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
      {items.map((m) => (
        <div
          key={m.id}
          className="relative aspect-square overflow-hidden rounded-2xl border border-purple-200 bg-white"
        >
          {kind === "image" ? (
            <Image src={m.url} alt="preview" fill className="object-cover" />
          ) : (
            <video
              src={m.url}
              className="h-full w-full object-cover"
              muted
              playsInline
            />
          )}

          <button
            type="button"
            onClick={() => onRemove(m.id)}
            className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-xl bg-white/85 text-zinc-800 shadow-sm hover:bg-white"
            aria-label="Remove"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
