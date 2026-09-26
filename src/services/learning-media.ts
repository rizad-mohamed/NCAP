import type { MediaAsset, VideoAsset } from "@/data/types";
import { validateMediaFile, validateVideoFile } from "./media";
import { unwrapLearning } from "./learning-repository";
import { RepositoryError } from "@/services";
import {
  prepareLearningMedia,
  finishLearningMedia,
  discardLearningMedia,
  learningMediaUrl,
} from "@/learning/learning.functions";
export const LearningMediaService = {
  async save(file: File, altText = ""): Promise<MediaAsset | VideoAsset> {
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
      const response = await fetch(upload.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type, "x-upsert": "false", "cache-control": "max-age=60" },
        body: file,
      });
      if (!response.ok) throw new Error("The media upload failed. Try again.");
      return await unwrapLearning(finishLearningMedia({ data: upload.id }));
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
