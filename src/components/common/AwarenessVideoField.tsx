import { useInterfaceText } from "@/lib/i18n";
import { useState } from "react";
import { toast } from "sonner";
import type { VideoAsset } from "@/data/types";
import { AwarenessMediaService } from "@/services/awareness-media";
export function AwarenessVideoField({
  asset,
  onChange,
}: {
  asset?: VideoAsset | undefined;
  onChange: (asset: VideoAsset | undefined) => void;
}) {
  const uiText = useInterfaceText();

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  return (
    <fieldset className="rounded-xl border p-4">
      {busy && (
        <progress
          aria-label={uiText("Upload progress")}
          value={progress}
          max={100}
          className="w-full"
        />
      )}
      <legend className="px-1 text-sm font-semibold">{uiText("Video file")}</legend>
      {asset && (
        <div className="mb-3 flex items-center gap-3">
          <span>{asset.fileName}</span>
          <button
            type="button"
            className="min-h-11 rounded-lg border px-3"
            onClick={() => onChange(undefined)}
          >
            {uiText("Remove video")}{" "}
          </button>
        </div>
      )}
      <label className="block text-sm font-semibold">
        {busy ? "Uploading video…" : asset ? "Replace video" : "Upload video"}
        <input
          className="mt-2 block w-full"
          type="file"
          accept="video/mp4,video/webm"
          disabled={busy}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setProgress(0);
            try {
              onChange((await AwarenessMediaService.save(file, "", setProgress)) as VideoAsset);
              toast.success(uiText("Video uploaded. Save the record to attach it."));
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Video upload failed.");
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      <p className="mt-2 text-xs text-muted-foreground">
        {uiText(
          "MP4 or WebM, up to 100 MiB and four hours. Include chapters and a transcript below.",
        )}{" "}
      </p>
    </fieldset>
  );
}
