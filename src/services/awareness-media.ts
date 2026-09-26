import type { MediaAsset, VideoAsset } from "@/data/types";
import { validateMediaFile, validateVideoFile } from "./media";
import { unwrapAwareness } from "./awareness-repository";
import { RepositoryError } from "@/services";
import {
  prepareAwarenessMedia,
  finishAwarenessMedia,
  discardAwarenessMedia,
  awarenessMediaUrl,
} from "@/awareness/awareness.functions";
export const AwarenessMediaService = {
  async save(file: File, altText = ""): Promise<MediaAsset | VideoAsset> {
    const metadata = file.type.startsWith("image/")
      ? await validateMediaFile(file)
      : await validateVideoFile(file);
    const upload = await unwrapAwareness(
      prepareAwarenessMedia({
        data: {
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          altText,
          ...metadata,
        },
      }),
    );
    try {
      const response = await fetch(upload.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type, "x-upsert": "false", "cache-control": "max-age=60" },
        body: file,
      });
      if (!response.ok) throw new Error("The media upload failed. Try again.");
      return await unwrapAwareness(finishAwarenessMedia({ data: upload.id }));
    } catch (error) {
      await unwrapAwareness(discardAwarenessMedia({ data: upload.id })).catch(() => undefined);
      if (error instanceof RepositoryError) throw error;
      throw new Error("The media upload could not be completed. Check the file and try again.");
    }
  },
  objectUrl(asset: Pick<MediaAsset | VideoAsset, "id">, download = false) {
    return unwrapAwareness(awarenessMediaUrl({ data: { id: asset.id, download } }));
  },
  remove(asset: Pick<MediaAsset | VideoAsset, "id">) {
    return unwrapAwareness(discardAwarenessMedia({ data: asset.id }));
  },
};
