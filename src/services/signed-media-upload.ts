/** Shared private-storage transport. Progress stops at 99% until server validation
 * succeeds; a timeout/failure lets the existing service retire its pending object.
 * Never automatically replays an uncertain PUT against an immutable object path.
 */
export function uploadSignedMedia(
  file: File,
  signedUrl: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", signedUrl);
    request.timeout = 5 * 60 * 1000;
    request.setRequestHeader("Content-Type", file.type);
    request.setRequestHeader("x-upsert", "false");
    request.setRequestHeader("cache-control", "max-age=60");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress?.(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };
    const failed = () =>
      reject(new Error("The media upload failed. Check your connection and try again."));
    request.onerror = failed;
    request.ontimeout = failed;
    request.onabort = failed;
    request.onload = () => (request.status >= 200 && request.status < 300 ? resolve() : failed());
    request.send(file);
  });
}
