"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { COVER_TEXT_MAX, COVER_TEXT_POSITIONS } from "@/components/cover-text";
import { ChipGroup, CountedTextArea, FormError, SelectField, SubmitButton, TextField } from "@/components/form-fields";
import { megabytes, REEL_VIDEO } from "@/lib/media/limits";

const VIDEO_TYPES = ["video/mp4", "video/quicktime"];
const CAPTION_MAX = 300;


type Errors = Record<string, string[] | undefined>;

/**
 * Posts to /api/reels (a route, since videos can exceed the Server Action
 * size limit). The video is checked here first so nobody waits for an upload
 * that will be refused; the server checks it again from the file itself.
 */
export function ReelForm({ causes }: { causes: { value: string; label: string }[] }) {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(null);
  const [poster, setPoster] = useState<Blob | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setErrors((all) => ({ ...all, file: undefined }));
    setPreview(null);
    setPoster(null);
    if (!file) return;
    const problem = await checkVideo(file);
    if (problem) {
      setErrors((all) => ({ ...all, file: [problem] }));
      e.target.value = "";
      return;
    }
    setPreview(URL.createObjectURL(file));
    setPoster(await firstFrame(file));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(undefined);
    setPending(true);
    try {
      const upload = new FormData(e.currentTarget);
      if (poster) upload.set("poster", poster, "poster.jpg");
      const res = await fetch("/api/reels", { method: "POST", body: upload });
      if (res.ok) {
        const { id } = (await res.json()) as { id: string };
        router.push(`/reels?start=${id}`);
        router.refresh();
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string; fieldErrors?: Errors };
      setErrors(body.fieldErrors ?? {});
      setFormError(body.error ?? (body.fieldErrors ? undefined : "Something went wrong. Please try again."));
    } catch {
      setFormError("Couldn't reach Bono. Check your connection and try again.");
    }
    setPending(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <FormError message={formError} />
      <div className="flex flex-col gap-1">
        <label htmlFor="file" className="text-sm font-medium">
          Video
        </label>
        <p id="file-hint" className="text-sm text-zinc-600 dark:text-zinc-400">
          Vertical (portrait), MP4 or MOV, up to {REEL_VIDEO.maxSeconds} seconds and {megabytes(REEL_VIDEO.maxBytes)}. H.264 plays in
          every browser.
        </p>
        <input
          id="file"
          name="file"
          type="file"
          accept={VIDEO_TYPES.join(",")}
          onChange={pick}
          aria-invalid={errors.file ? true : undefined}
          aria-describedby={errors.file ? "file-hint file-error" : "file-hint"}
          className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:font-medium dark:file:bg-zinc-800 dark:file:text-zinc-100"
        />
        {errors.file && (
          <p id="file-error" className="text-sm text-red-700 dark:text-red-400">
            {errors.file[0]}
          </p>
        )}
        {preview && <video src={preview} muted playsInline autoPlay loop aria-label="Preview" className="mt-2 aspect-[9/16] w-40 rounded-xl bg-black object-contain" />}
      </div>
      <TextField
        name="coverText"
        label="Text on the video (optional)"
        hint={`The reel's point in a line or two, shown over the video, like "Some neighbors can't make it to the pantry, so the pantry comes to them". Up to ${COVER_TEXT_MAX} characters.`}
        required={false}
        errors={errors.coverText}
      />
      <SelectField name="coverTextPosition" label="Where the text goes" hint="Pick the spot that covers the least of what matters in the video." options={COVER_TEXT_POSITIONS} defaultValue="middle" />
      <CountedTextArea name="caption" label="Caption (optional)" maxLength={CAPTION_MAX} errors={errors.caption} />
      <ChipGroup
        name="causes"
        legend="Causes"
        hint="Shown on the reel."
        options={causes}
        defaultChecked={causes.map((c) => c.value)}
        errors={errors.causes}
      />
      <SubmitButton pending={pending}>Post reel</SubmitButton>
    </form>
  );
}

/** The same rules as the server, checked before uploading. */
async function checkVideo(file: File): Promise<string | null> {
  if (!VIDEO_TYPES.includes(file.type)) return "Use an MP4 or MOV video.";
  if (file.size > REEL_VIDEO.maxBytes) return `That video is over ${megabytes(REEL_VIDEO.maxBytes)}. Choose a shorter or smaller one.`;
  const meta = await videoMeta(file);
  if (meta && meta.seconds > REEL_VIDEO.maxSeconds + 0.5) return `Reels can be up to ${REEL_VIDEO.maxSeconds} seconds long.`;
  if (meta && meta.width > meta.height) return "Use a vertical (portrait) video.";
  return null;
}

/** The browser's own reading of a video's length and shape, or null if it can't tell. */
function videoMeta(file: File): Promise<{ seconds: number; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(video.duration) && video.videoWidth ? { seconds: video.duration, width: video.videoWidth, height: video.videoHeight } : null);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
}

/**
 * The video's first frame as a JPEG, shown while the reel loads. Optional:
 * if the browser can't decode the file here, the reel is posted without one.
 */
function firstFrame(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const done = (blob: Blob | null) => {
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onloadeddata = () => {
      video.currentTime = Math.min(0.1, video.duration || 0);
    };
    video.onseeked = () => {
      const scale = Math.min(1, 720 / video.videoWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(done, "image/jpeg", 0.82);
    };
    video.onerror = () => done(null);
    setTimeout(() => done(null), 8000);
    video.src = url;
  });
}
