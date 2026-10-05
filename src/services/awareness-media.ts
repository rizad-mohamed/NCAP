import type { MediaAsset, VideoAsset } from "@/data/types";
import { validateMediaFile, validateVideoFile } from "./media";
import { unwrapAwareness } from "./awareness-repository";
import { RepositoryError } from "@/services";
import { uploadSignedMedia } from "./signed-media-upload";
import {
  prepareAwarenessMedia,
  finishAwarenessMedia,
  discardAwarenessMedia,
  awarenessMediaUrl,
} from "@/awareness/awareness.functions";
export const AwarenessMediaService = {
  async save(
    file: File,
    altText = "",
    onProgress?: (percent: number) => void,
  ): Promise<MediaAsset | VideoAsset> {
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
      await uploadSignedMedia(file, upload.signedUrl, onProgress);
      const asset = await unwrapAwareness(finishAwarenessMedia({ data: upload.id }));
      onProgress?.(100);
      return asset;
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
