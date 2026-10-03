import type { MediaAsset } from "@/data/types";
import { validateMediaFile } from "./media";
import { avatarSchema } from "@/domain/auth-profile";

export const ProfileMediaService = {
  async save(file: File, altText = ""): Promise<MediaAsset> {
    const dimensions = await validateMediaFile(file);
    if (file.size > 256 * 1024 || dimensions.width > 1024 || dimensions.height > 1024)
      throw new Error("Use a profile picture up to 256 KiB and 1024 × 1024 pixels.");
    const storageKey = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("The picture could not be read."));
      reader.readAsDataURL(file);
    });
    return avatarSchema.parse({
      id: crypto.randomUUID(),
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      ...dimensions,
      altText,
      storageKey,
      status: "ready",
    });
  },
  async objectUrl(asset: Pick<MediaAsset, "storageKey">) {
    return asset.storageKey;
  },
};
