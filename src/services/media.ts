import type { MediaAsset, VideoAsset } from "@/data/types";

export const MEDIA_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  maxDimension: 4096,
  accepted: ["image/jpeg", "image/png", "image/webp"],
} as const;

export const VIDEO_LIMITS = {
  maxBytes: 100 * 1024 * 1024,
  maxDurationSeconds: 4 * 60 * 60,
  accepted: ["video/mp4", "video/webm"],
} as const;

const DB_NAME = "ncap-demo-media";
const STORE_NAME = "assets";

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Local demo media storage is unavailable."));
  });
}

export function sanitizeDisplayFileName(value: string) {
  const extension = value.includes(".") ? `.${value.split(".").pop()!.toLowerCase()}` : "";
  const base = value.slice(0, Math.max(0, value.length - extension.length));
  const safe = base
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return `${safe || "image"}${extension}`;
}

function dimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The selected file is not a readable image."));
    };
    image.src = url;
  });
}

function videoMetadata(file: File) {
  return new Promise<{ width: number; height: number; durationSeconds: number }>(
    (resolve, reject) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      const timeout = window.setTimeout(() => {
        release();
        reject(new Error("Video inspection timed out. Choose a readable MP4 or WebM file."));
      }, 15_000);
      const release = () => {
        window.clearTimeout(timeout);
        video.onloadedmetadata = null;
        video.ontimeupdate = null;
        video.onerror = null;
        URL.revokeObjectURL(url);
        video.removeAttribute("src");
        video.load();
      };
      const readMetadata = () => {
        const metadata = {
          width: video.videoWidth,
          height: video.videoHeight,
          durationSeconds: video.duration,
        };
        release();
        if (
          !metadata.width ||
          !metadata.height ||
          !Number.isFinite(metadata.durationSeconds) ||
          metadata.durationSeconds <= 0
        ) {
          reject(new Error("The selected file does not contain readable video metadata."));
          return;
        }
        resolve(metadata);
      };
      video.onloadedmetadata = () => {
        if (video.duration === Infinity) {
          // Browser-recorded WebM can omit duration. Seeking to the end lets the
          // browser discover the final timestamp without uploading the file.
          video.ontimeupdate = () => {
            if (Number.isFinite(video.duration)) readMetadata();
          };
          video.currentTime = Number.MAX_SAFE_INTEGER;
        } else readMetadata();
      };
      video.onerror = () => {
        release();
        reject(new Error("The selected file is not a readable MP4 or WebM video."));
      };
      video.preload = "metadata";
      video.src = url;
    },
  );
}

export async function validateMediaFile(file: File) {
  if (!MEDIA_LIMITS.accepted.includes(file.type as (typeof MEDIA_LIMITS.accepted)[number])) {
    throw new Error("Choose a JPEG, PNG, or WebP image. SVG and GIF uploads are not accepted.");
  }
  const expected = file.type === "image/jpeg" ? ["jpg", "jpeg"] : [file.type.split("/")[1]!];
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!expected.includes(extension)) throw new Error("The file extension does not match its type.");
  if (file.size > MEDIA_LIMITS.maxBytes) throw new Error("Images must be 5 MiB or smaller.");
  const size = await dimensions(file);
  if (size.width > MEDIA_LIMITS.maxDimension || size.height > MEDIA_LIMITS.maxDimension) {
    throw new Error("Images must be no larger than 4096 × 4096 pixels.");
  }
  return size;
}

export async function validateVideoFile(file: File) {
  if (!VIDEO_LIMITS.accepted.includes(file.type as (typeof VIDEO_LIMITS.accepted)[number])) {
    throw new Error("Choose an MP4 or WebM video.");
  }
  const expected = file.type === "video/mp4" ? "mp4" : "webm";
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (extension !== expected) throw new Error("The video extension does not match its type.");
  if (file.size === 0) throw new Error("The selected video is empty.");
  if (file.size > VIDEO_LIMITS.maxBytes) throw new Error("Videos must be 100 MiB or smaller.");
  const metadata = await videoMetadata(file);
  if (metadata.durationSeconds > VIDEO_LIMITS.maxDurationSeconds) {
    throw new Error("Videos must be four hours or shorter.");
  }
  return metadata;
}

async function storeFile(file: File, id: string, errorMessage: string) {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(file, id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error(errorMessage));
      transaction.onabort = () => reject(new Error(errorMessage));
    });
  } finally {
    db.close();
  }
}

async function storedObjectUrl(storageKey: string) {
  const db = await openDatabase();
  try {
    const blob = await new Promise<Blob | undefined>((resolve, reject) => {
      const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).get(storageKey);
      request.onsuccess = () => resolve(request.result as Blob | undefined);
      request.onerror = () => reject(new Error("The local media file could not be loaded."));
    });
    return blob ? URL.createObjectURL(blob) : null;
  } finally {
    db.close();
  }
}

async function removeStoredFile(storageKey: string) {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(storageKey);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error("The local media file could not be removed."));
      transaction.onabort = () => reject(new Error("The local media file could not be removed."));
    });
  } finally {
    db.close();
  }
}

export const DemoMediaService = {
  async save(file: File, altText: string): Promise<MediaAsset> {
    if (!altText.trim()) throw new Error("Alternative text is required.");
    const size = await validateMediaFile(file);
    const id = `media-${crypto.randomUUID()}`;
    await storeFile(file, id, "The image could not be saved locally.");
    return {
      id,
      fileName: sanitizeDisplayFileName(file.name),
      mimeType: file.type as MediaAsset["mimeType"],
      sizeBytes: file.size,
      width: size.width,
      height: size.height,
      altText: altText.trim(),
      storageKey: id,
      status: "local-demo",
    };
  },
  async objectUrl(asset: Pick<MediaAsset | VideoAsset, "storageKey">) {
    return storedObjectUrl(asset.storageKey);
  },
  async remove(asset: Pick<MediaAsset | VideoAsset, "storageKey">) {
    await removeStoredFile(asset.storageKey);
  },
};

export const DemoVideoService = {
  async save(file: File): Promise<VideoAsset> {
    const metadata = await validateVideoFile(file);
    const id = `video-${crypto.randomUUID()}`;
    await storeFile(file, id, "The video could not be saved locally.");
    return {
      id,
      fileName: sanitizeDisplayFileName(file.name),
      mimeType: file.type as VideoAsset["mimeType"],
      sizeBytes: file.size,
      ...metadata,
      storageKey: id,
      status: "local-demo",
    };
  },
  objectUrl(asset: VideoAsset) {
    return storedObjectUrl(asset.storageKey);
  },
  async remove(asset: VideoAsset) {
    await removeStoredFile(asset.storageKey);
  },
};
