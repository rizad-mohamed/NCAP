export type LessonVideoPlayback =
  { kind: "youtube" | "vimeo"; url: string } | { kind: "direct"; url: string };

const YOUTUBE_ID = /^[a-zA-Z0-9_-]{11}$/;
const VIMEO_ID = /^\d{6,12}$/;

/** Convert an allow-listed HTTPS video URL into a safe playback URL. */
export function lessonVideoPlayback(value: string): LessonVideoPlayback | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return YOUTUBE_ID.test(id)
      ? { kind: "youtube", url: `https://www.youtube-nocookie.com/embed/${id}` }
      : null;
  }
  if (["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)) {
    const pathParts = url.pathname.split("/").filter(Boolean);
    const id =
      url.pathname === "/watch"
        ? (url.searchParams.get("v") ?? "")
        : ["embed", "shorts"].includes(pathParts[0] ?? "")
          ? (pathParts[1] ?? "")
          : "";
    return YOUTUBE_ID.test(id)
      ? { kind: "youtube", url: `https://www.youtube-nocookie.com/embed/${id}` }
      : null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    const id = host === "player.vimeo.com" && parts[0] === "video" ? parts[1] : parts[0];
    return id && VIMEO_ID.test(id)
      ? { kind: "vimeo", url: `https://player.vimeo.com/video/${id}` }
      : null;
  }

  return /\.(mp4|webm)$/i.test(url.pathname) ? { kind: "direct", url: url.href } : null;
}
