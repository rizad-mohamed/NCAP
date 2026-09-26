import { describe, expect, it } from "vitest";
import { awarenessKinds, awarenessListSchema, mediaInputSchema, parseAwareness } from "./awareness";
import * as seeds from "@/data/awareness";
import { resourcePayload, resourceRecord } from "@/server/awareness/mapping";
import type { ResourceRow } from "@/server/awareness/types";
import { inspectImage, inspectVideo } from "@/server/awareness/inspect-media";
const id = "00000000-0000-4000-a000-000000000001";
const groups = {
  articles: seeds.articles,
  cyberTips: seeds.tips,
  newsUpdates: seeds.news,
  bestPractices: seeds.bestPractices,
  posters: seeds.posters,
  infographics: seeds.infographics,
  videos: seeds.videos,
};
describe("Awareness schemas and seed preservation", () => {
  for (const kind of awarenessKinds)
    it(`validates every ${kind} seed and preserves structured content`, () => {
      for (const [index, r] of groups[kind].entries()) {
        const input = {
          ...r,
          id,
          slug: r.slug ?? `seed-${index}`,
          order: index,
          status: r.status ?? "Published",
          ...(["posters", "infographics"].includes(kind) ? { image: { id } } : {}),
        };
        expect(() => parseAwareness(kind, input)).not.toThrow();
        const payload = resourcePayload(kind, input);
        const record = resourceRecord({ ...payload, version: 1 } as ResourceRow);
        expect(record.title).toBe(r.title);
        for (const field of ["body", "steps", "points", "transcript", "chapters"])
          if (field in r)
            expect((record as unknown as Record<string, unknown>)[field]).toEqual(
              (r as unknown as Record<string, unknown>)[field],
            );
      }
    });
  it("contains all 60 resources", () => expect(Object.values(groups).flat()).toHaveLength(60));
  const article = { ...seeds.articles[0]!, id, order: 1 };
  it.each([
    { title: " " },
    { slug: "bad/slug" },
    { order: -1 },
    { status: "Unknown" },
    { body: [5] },
    { publishedAt: "2026-02-31" },
    { publishedAt: "2026-13-01" },
    { imageUrl: "javascript:alert(1)" },
    { image: { id: "local-demo" } },
  ])("rejects invalid input %j", (fields) => {
    expect(() => parseAwareness("articles", { ...article, ...fields })).toThrow();
  });
  it("allows incomplete draft bodies and requires published bodies", () => {
    expect(() =>
      parseAwareness("articles", { ...article, status: "Draft", body: [] }),
    ).not.toThrow();
    expect(() => parseAwareness("articles", { ...article, body: [] })).toThrow();
  });
  it("requires managed media for published posters", () => {
    expect(() =>
      parseAwareness("posters", { ...seeds.posters[0], id, slug: "poster", order: 0 }),
    ).toThrow();
  });
  it("validates chapters and external URL schemes", () => {
    const video = { ...seeds.videos[0], id, slug: "video", order: 1, status: "Published" };
    expect(() =>
      parseAwareness("videos", {
        ...video,
        chapters: [
          { label: "Late", at: "1:00" },
          { label: "Early", at: "0:30" },
        ],
      }),
    ).toThrow();
    expect(() =>
      parseAwareness("videos", { ...video, sourceUrl: "data:text/html,hello" }),
    ).toThrow();
  });
  it("preserves publication dates on republishing", () => {
    const draft = resourcePayload("articles", { ...article, status: "Draft" });
    expect(resourcePayload("articles", article).published_at).toBe(draft.published_at);
  });
  it("bounds list inputs and validates sorting", () => {
    expect(awarenessListSchema.parse({ kind: "articles" })).toMatchObject({
      admin: false,
      limit: 100,
      sort: "order",
    });
    expect(awarenessListSchema.safeParse({ kind: "articles", limit: 101 }).success).toBe(false);
  });
});
describe("authoritative media validation", () => {
  const image = {
    fileName: "poster.png",
    mimeType: "image/png",
    sizeBytes: 100,
    width: 800,
    height: 600,
    altText: "Security poster",
  };
  it.each([
    { fileName: "../poster.png" },
    { fileName: "poster.svg" },
    { mimeType: "image/svg+xml" },
    { sizeBytes: 5242881 },
    { width: 4097 },
    { height: 0 },
    { altText: "" },
    { sizeBytes: 0 },
  ])("rejects invalid metadata %j", (fields) => {
    expect(mediaInputSchema.safeParse({ ...image, ...fields }).success).toBe(false);
  });
  it("enforces video limits without broadening formats", () => {
    const video = { ...image, fileName: "video.mp4", mimeType: "video/mp4", durationSeconds: 30 };
    expect(mediaInputSchema.safeParse(video).success).toBe(true);
    expect(mediaInputSchema.safeParse({ ...video, durationSeconds: 14401 }).success).toBe(false);
    expect(mediaInputSchema.safeParse({ ...video, sizeBytes: 104857601 }).success).toBe(false);
  });
  it("reads dimensions from PNG bytes and rejects disguised HTML", () => {
    const bytes = new Uint8Array(32);
    bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
    bytes.set([73, 72, 68, 82], 12);
    const view = new DataView(bytes.buffer);
    view.setUint32(16, 800);
    view.setUint32(20, 600);
    expect(inspectImage(bytes, "image/png")).toEqual({ width: 800, height: 600 });
    expect(() =>
      inspectImage(new TextEncoder().encode("<html>executable</html>"), "image/png"),
    ).toThrow();
    expect(() => inspectVideo(bytes, bytes, "video/mp4")).toThrow();
  });
});
