import { useEffect, useId, useState, type DragEvent } from "react";
import { ImagePlus, LoaderCircle, RefreshCw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import type { MediaAsset, VideoAsset } from "@/data/types";
import { DemoMediaService, MEDIA_LIMITS } from "@/services/media";
import { cn } from "@/lib/utils";

export function useMediaUrl(asset?: MediaAsset | VideoAsset, fallback?: string) {
  const [url, setUrl] = useState(fallback ?? "");
  useEffect(() => {
    let current = "";
    let active = true;
    setUrl(fallback ?? "");
    if (!asset) {
      setUrl(fallback ?? "");
      return;
    }
    void DemoMediaService.objectUrl(asset)
      .then((next) => {
        if (!active) {
          if (next) URL.revokeObjectURL(next);
          return;
        }
        if (next) {
          current = next;
          setUrl(next);
        } else setUrl(fallback ?? "");
      })
      .catch(() => {
        if (active) setUrl(fallback ?? "");
      });
    return () => {
      active = false;
      if (current) URL.revokeObjectURL(current);
    };
  }, [asset, fallback]);
  return url;
}

export function MediaField({
  label = "Image",
  asset,
  fallbackUrl,
  initialAlt = "",
  guidance,
  onChange,
}: {
  label?: string;
  asset?: MediaAsset | undefined;
  fallbackUrl?: string | undefined;
  initialAlt?: string;
  guidance?: string;
  onChange: (asset: MediaAsset | undefined) => void;
}) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState(asset?.altText ?? initialAlt);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const storedUrl = useMediaUrl(asset, fallbackUrl);
  const [localUrl, setLocalUrl] = useState("");

  useEffect(() => {
    if (!file) {
      setLocalUrl("");
      return;
    }
    const next = URL.createObjectURL(file);
    setLocalUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  const choose = (next?: File) => {
    if (!next) return;
    setFile(next);
  };
  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    choose(event.dataTransfer.files[0]);
  };
  const prepare = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const saved = await DemoMediaService.save(file, altText);
      onChange(saved);
      setFile(null);
      toast.success("Image stored in local demo media storage");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The image could not be prepared.");
    } finally {
      setBusy(false);
    }
  };
  const remove = () => {
    onChange(undefined);
    setFile(null);
  };
  const preview = localUrl || storedUrl;

  return (
    <fieldset className="rounded-xl border p-4">
      <legend className="px-1 text-sm font-semibold">{label}</legend>
      {preview ? (
        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
          <img
            src={preview}
            alt={altText || asset?.altText || "Selected image preview"}
            className="aspect-video w-full rounded-lg border bg-muted object-contain"
          />
          <div className="grid content-start gap-2">
            <p className="text-sm font-semibold">
              {file?.name ?? asset?.fileName ?? "Bundled image"}
            </p>
            {asset && (
              <p className="text-xs text-muted-foreground">
                {asset.width} × {asset.height} · {(asset.sizeBytes / 1024).toFixed(0)} KiB · Local
                demo media
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <label
                htmlFor={inputId}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-semibold"
              >
                <RefreshCw className="size-4" /> Replace
              </label>
              <button
                type="button"
                onClick={remove}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-semibold text-destructive"
              >
                <Trash2 className="size-4" /> Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
          className={cn(
            "grid min-h-36 place-items-center rounded-lg border-2 border-dashed bg-muted/40 p-5 text-center",
            dragging && "border-primary bg-primary-soft",
          )}
        >
          <div>
            <ImagePlus className="mx-auto size-8 text-primary" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold">Drop an image here or choose a file</p>
            <label
              htmlFor={inputId}
              className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white"
            >
              <Upload className="size-4" /> Choose image
            </label>
          </div>
        </div>
      )}
      <input
        id={inputId}
        type="file"
        accept={MEDIA_LIMITS.accepted.join(",")}
        className="sr-only"
        onChange={(event) => choose(event.target.files?.[0])}
      />
      <label className="mt-4 block text-sm font-semibold">
        Alternative text *
        <input
          value={altText}
          onChange={(event) => setAltText(event.target.value)}
          maxLength={240}
          className="mt-1.5 h-11 w-full rounded-lg border px-3"
          placeholder="Describe the image's useful information"
        />
      </label>
      <p className="mt-2 text-xs text-muted-foreground">
        JPEG, PNG, or WebP · up to 5 MiB and 4096 × 4096. {guidance}
      </p>
      {file && (
        <button
          type="button"
          disabled={busy || !altText.trim()}
          onClick={() => void prepare()}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {busy ? "Preparing…" : "Use this image"}
        </button>
      )}
    </fieldset>
  );
}
