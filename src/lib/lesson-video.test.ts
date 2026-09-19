import { describe, expect, it } from "vitest";
import { lessonVideoPlayback } from "./lesson-video";

describe("lesson video URL allow-list", () => {
  it("converts supported YouTube and Vimeo links to privacy-conscious embeds", () => {
    expect(lessonVideoPlayback("https://youtu.be/dQw4w9WgXcQ")).toEqual({
      kind: "youtube",
      url: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    });
    expect(lessonVideoPlayback("https://vimeo.com/123456789")).toEqual({
      kind: "vimeo",
      url: "https://player.vimeo.com/video/123456789",
    });
  });

  it("allows HTTPS direct media and rejects unsafe or arbitrary iframe URLs", () => {
    expect(lessonVideoPlayback("https://cdn.example.lk/lesson/video.mp4")?.kind).toBe("direct");
    expect(lessonVideoPlayback("http://cdn.example.lk/video.mp4")).toBeNull();
    expect(lessonVideoPlayback("javascript:alert(1)")).toBeNull();
    expect(lessonVideoPlayback("https://untrusted.example/embed/lesson")).toBeNull();
  });
});
