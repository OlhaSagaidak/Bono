"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CountedTextArea, FormError, SubmitButton, TextField } from "@/components/form-fields";
import { megabytes, STORY_VIDEO } from "@/lib/media/limits";

// Must match MAX_IMAGE_BYTES in lib/images.ts (the server checks again).
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime"];
const CAPTION_MAX = 150;

type Errors = Record<string, string[] | undefined>;

/**
 * Posts to /api/stories (a route, since videos can exceed the Server Action
 * size limit). The file is checked here first so people don't wait for an
 * upload that will be refused; the server checks everything again.
 */
export function StoryForm({ nonprofitId }: { nonprofitId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sticker, setSticker] = useState<"none" | "donate" | "link">("none");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);

  // Free the preview's memory when it's replaced or the form goes away.
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    setErrors((all) => ({ ...all, file: undefined }));
    setFile(null);
    setPreview(null);
    if (!picked) return;
    const problem = await checkFile(picked);
    if (problem) {
      setErrors((all) => ({ ...all, file: [problem] }));
      e.target.value = "";
      return;
    }
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(undefined);
    setPending(true);
    try {
      const res = await fetch("/api/stories", { method: "POST", body: new FormData(e.currentTarget) });
      if (res.ok) {
        router.push(`/feed?story=${nonprofitId}`);
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
          Photo or video
        </label>
        <p id="file-hint" className="text-sm text-zinc-600 dark:text-zinc-400">
          A photo (JPEG, PNG or WebP, up to 2 MB) or a vertical video (MP4 or MOV, up to {STORY_VIDEO.maxSeconds} seconds and{" "}
          {megabytes(STORY_VIDEO.maxBytes)}).
        </p>
        <input
          id="file"
          name="file"
          type="file"
          accept={[...PHOTO_TYPES, ...VIDEO_TYPES].join(",")}
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
        {preview && file && (
          <div className="mt-2 w-40 overflow-hidden rounded-xl bg-black">
            {file.type.startsWith("video/") ? (
              <video src={preview} muted playsInline autoPlay loop aria-label="Preview" className="aspect-[9/16] w-full object-contain" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- a local preview
              <img src={preview} alt="Preview" className="aspect-[9/16] w-full object-contain" />
            )}
          </div>
        )}
      </div>

      <CountedTextArea name="caption" label="Caption (optional)" maxLength={CAPTION_MAX} errors={errors.caption} />

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Sticker</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["none", "None"],
              ["donate", "Donate button"],
              ["link", "Link"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="cursor-pointer rounded-full border border-zinc-300 px-4 py-2 text-sm has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-700 has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-emerald-600 dark:border-zinc-700"
            >
              <input type="radio" name="sticker" value={value} checked={sticker === value} onChange={() => setSticker(value)} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      {sticker === "link" && (
        <TextField name="linkUrl" label="Link address" type="url" hint="A full https:// address, e.g. your sign-up form." errors={errors.linkUrl} />
      )}

      <SubmitButton pending={pending}>Post story</SubmitButton>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">Stories disappear after 24 hours. Your followers get a notification.</p>
    </form>
  );
}

/** The same rules as the server, checked before uploading. */
async function checkFile(file: File): Promise<string | null> {
  if (PHOTO_TYPES.includes(file.type)) {
    return file.size > MAX_PHOTO_BYTES ? "That photo is over 2 MB. Choose a smaller one." : null;
  }
  if (!VIDEO_TYPES.includes(file.type)) return "Use a JPEG, PNG or WebP photo, or an MP4 or MOV video.";
  if (file.size > STORY_VIDEO.maxBytes) return `That video is over ${megabytes(STORY_VIDEO.maxBytes)}. Choose a shorter or smaller one.`;
  const seconds = await videoSeconds(file);
  if (seconds !== null && seconds > STORY_VIDEO.maxSeconds + 0.5) return `Stories can be up to ${STORY_VIDEO.maxSeconds} seconds long.`;
  return null;
}

/** The browser's own reading of a video's length, or null if it can't tell. */
function videoSeconds(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(video.duration) ? video.duration : null);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
}
