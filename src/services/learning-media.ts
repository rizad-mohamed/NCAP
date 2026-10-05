import type { MediaAsset, VideoAsset } from "@/data/types";
import { LEARNING_VIDEO_MAX_BYTES } from "@/domain/learning-media";
import { validateMediaFile, validateVideoFile } from "./media";
import { unwrapLearning } from "./learning-repository";
import { RepositoryError } from "@/services";
import { uploadSignedMedia } from "./signed-media-upload";
import {
  prepareLearningMedia,
  finishLearningMedia,
  discardLearningMedia,
  learningMediaUrl,
} from "@/learning/learning.functions";
export const LearningMediaService = {
  async save(
    file: File,
    altText = "",
    onProgress?: (percent: number) => void,
  ): Promise<MediaAsset | VideoAsset> {
    if (file.size > LEARNING_VIDEO_MAX_BYTES)
      throw new RepositoryError("validation", "Learning videos must be 50 MiB or smaller.");
    const metadata = file.type.startsWith("image/")
      ? await validateMediaFile(file)
      : await validateVideoFile(file);
    const upload = await unwrapLearning(
      prepareLearningMedia({
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
      const asset = await unwrapLearning(finishLearningMedia({ data: upload.id }));
      onProgress?.(100);
      return asset;
    } catch (error) {
      await unwrapLearning(discardLearningMedia({ data: upload.id })).catch(() => undefined);
      if (error instanceof RepositoryError) throw error;
      throw new Error("The media upload could not be completed. Check the file and try again.");
    }
  },
  objectUrl(asset: Pick<MediaAsset | VideoAsset, "id">) {
    return unwrapLearning(learningMediaUrl({ data: asset.id }));
  },
  remove(asset: Pick<MediaAsset | VideoAsset, "id">) {
    return unwrapLearning(discardLearningMedia({ data: asset.id }));
  },
};
