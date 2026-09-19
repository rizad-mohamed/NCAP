import { useEffect, useId, useRef, useState } from "react";
import { Film, Link2, LoaderCircle, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import type { LessonVideo } from "@/data/types";
import { lessonVideoPlayback } from "@/lib/lesson-video";
import { DemoVideoService, VIDEO_LIMITS } from "@/services/media";
import { useMediaUrl } from "@/components/common/MediaField";
import { dashboardButton, dashboardSelect } from "@/components/common/dashboard-primitives";
import { cn } from "@/lib/utils";

export function LessonVideoField({
  value,
  onChange,
  onBusyChange,
}: {
  value: LessonVideo | undefined;
  onChange: (video: LessonVideo | undefined) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const [source, setSource] = useState<"none" | "external" | "upload">(value?.kind ?? "none");
  const uploadedUrl = useMediaUrl(value?.kind === "upload" ? value.asset : undefined);
  const playback = value?.kind === "external" ? lessonVideoPlayback(value.url) : null;

  useEffect(() => {
    setFile(null);
  }, [source]);

  const chooseSource = (next: "none" | "external" | "upload") => {
    setSource(next);
    if (next === "none") onChange(undefined);
    else if (next === "external")
      onChange({ kind: "external", url: "", transcript: value?.transcript ?? "" });
    else if (value?.kind !== "upload") {
      onChange(undefined);
      setFile(null);
    }
  };
  const saveUpload = async () => {
    if (!file) return;
    setBusy(true);
    onBusyChange(true);
    try {
      const asset = await DemoVideoService.save(file);
      if (!active.current) {
        await DemoVideoService.remove(asset);
        return;
      }
      onChange({ kind: "upload", asset, transcript: value?.transcript ?? "" });
      setFile(null);
      toast.success("Video stored in local demo media storage");
    } catch (error) {
      if (active.current)
        toast.error(error instanceof Error ? error.message : "The video could not be prepared.");
    } finally {
      if (active.current) {
        setBusy(false);
        onBusyChange(false);
      }
    }
  };

  return (
    <fieldset className="min-w-0 rounded-xl border p-4" disabled={busy} aria-busy={busy}>
      <legend className="px-1 text-sm font-semibold">Lesson video (optional)</legend>
      <p className="text-sm text-muted-foreground">
        Add a secure video link or upload a local demo video. Text-only lessons can leave this off.
      </p>
      <label className="mt-4 block text-sm font-semibold">
        Video source
        <select
          value={source}
          onChange={(event) => chooseSource(event.target.value as "none" | "external" | "upload")}
          className={cn(dashboardSelect, "mt-1.5 sm:w-full")}
        >
          <option value="none">No video</option>
          <option value="external">YouTube, Vimeo, or direct video link</option>
          <option value="upload">Upload MP4 or WebM</option>
        </select>
      </label>

      {source === "external" && value?.kind === "external" && (
        <div className="mt-4 grid gap-3">
          <label className="text-sm font-semibold">
            HTTPS video URL
            <span className="relative mt-1.5 block">
              <Link2
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="url"
                value={value.url}
                maxLength={2048}
                onChange={(event) => onChange({ ...value, url: event.target.value })}
                className="h-11 w-full rounded-lg border bg-white pl-10 pr-3"
                placeholder="https://www.youtube.com/watch?v=…"
              />
            </span>
          </label>
          {value.url && (
            <p
              className={cn("text-xs", playback ? "text-success" : "text-destructive")}
              aria-live="polite"
            >
              {playback
                ? "Supported secure video link."
                : "Use an HTTPS YouTube, Vimeo, MP4, or WebM URL."}
            </p>
          )}
        </div>
      )}

      {source === "upload" && (
        <div className="mt-4 rounded-lg border border-dashed bg-muted/40 p-4">
          {value?.kind === "upload" ? (
            <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
              {uploadedUrl ? (
                <video
                  src={uploadedUrl}
                  controls
                  preload="metadata"
                  className="aspect-video w-full rounded-lg bg-black"
                  aria-label="Uploaded lesson video preview"
                />
              ) : (
                <div className="grid aspect-video place-items-center rounded-lg bg-primary text-white">
                  <Film className="size-8" aria-hidden="true" />
                </div>
              )}
              <div className="min-w-0">
                <p className="break-all text-sm font-semibold">{value.asset.fileName}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {Math.ceil(value.asset.durationSeconds / 60)} min · {value.asset.width} ×{" "}
                  {value.asset.height} · {(value.asset.sizeBytes / 1024 / 1024).toFixed(1)} MiB
                </p>
                <button
                  type="button"
                  className={cn(dashboardButton.secondary, "mt-3 text-destructive")}
                  onClick={() => {
                    onChange(undefined);
                    setFile(null);
                  }}
                >
                  <Trash2 /> Remove video
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <Film className="mx-auto size-8 text-primary" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold">
                {file?.name ?? "Choose an MP4 or WebM video"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Up to 100 MiB and four hours. Files stay in this browser demo.
              </p>
              <label
                htmlFor={inputId}
                className={cn(dashboardButton.secondary, "mt-3 cursor-pointer")}
              >
                <Upload /> Choose video
              </label>
              <input
                id={inputId}
                type="file"
                accept={VIDEO_LIMITS.accepted.join(",")}
                className="sr-only"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              {file && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveUpload()}
                  className={cn(dashboardButton.primary, "ml-2 mt-3")}
                >
                  {busy ? <LoaderCircle className="animate-spin" /> : <Upload />}
                  {busy ? "Preparing…" : "Use this video"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {value && (
        <label className="mt-4 block text-sm font-semibold">
          Video transcript
          <textarea
            value={value.transcript}
            maxLength={50_000}
            onChange={(event) => onChange({ ...value, transcript: event.target.value })}
            className="mt-1.5 min-h-28 w-full rounded-lg border bg-white p-3 text-base"
            placeholder="Paste the spoken content so the lesson remains accessible…"
          />
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            Required before publishing a video lesson. Learners can expand it below the player.
          </span>
        </label>
      )}
    </fieldset>
  );
}
