import { z } from "zod";
import type {
  Article,
  BestPractice,
  CyberTip,
  Infographic,
  NewsUpdate,
  Poster,
  VideoResource,
} from "@/data/types";

export const awarenessKinds = [
  "articles",
  "cyberTips",
  "newsUpdates",
  "bestPractices",
  "posters",
  "infographics",
  "videos",
] as const;
export type AwarenessKind = (typeof awarenessKinds)[number];
export type AwarenessRecord =
  Article | CyberTip | NewsUpdate | BestPractice | Poster | Infographic | VideoResource;
const text = (max: number) => z.string().trim().min(1).max(max);
const paragraphs = z.array(text(8000)).max(100);
const date = z
  .string()
  .refine(
    (v) =>
      v === "" ||
      (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
        Number.isFinite(Date.parse(v)) &&
        new Date(v).toISOString().slice(0, 10) === v),
    "Use a valid date.",
  );
const url = z
  .string()
  .max(2048)
  .refine(
    (v) =>
      !v ||
      (/^https:\/\//.test(v) &&
        (() => {
          try {
            const u = new URL(v);
            return !u.username && !u.password;
          } catch {
            return false;
          }
        })()),
    "Use an HTTPS URL.",
  );
export const mediaInputSchema = z
  .object({
    fileName: text(140).refine(
      (v) => !v.includes("/") && !v.includes("\\") && [...v].every((c) => c.charCodeAt(0) >= 32),
      "Use a valid filename.",
    ),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"]),
    sizeBytes: z
      .number()
      .int()
      .positive()
      .max(100 * 1024 * 1024),
    width: z.number().int().positive().max(16384),
    height: z.number().int().positive().max(16384),
    durationSeconds: z.number().positive().max(14400).optional(),
    altText: z.string().trim().max(240).default(""),
  })
  .superRefine((v, ctx) => {
    const image = v.mimeType.startsWith("image/");
    const extensions: Record<string, string[]> = {
      "image/jpeg": ["jpg", "jpeg"],
      "image/png": ["png"],
      "image/webp": ["webp"],
      "video/mp4": ["mp4"],
      "video/webm": ["webm"],
    };
    if (!extensions[v.mimeType]?.includes(v.fileName.split(".").pop()!.toLowerCase()))
      ctx.addIssue({ code: "custom", message: "The file extension does not match its type." });
    if (image && (v.sizeBytes > 5 * 1024 * 1024 || v.width > 4096 || v.height > 4096 || !v.altText))
      ctx.addIssue({
        code: "custom",
        message: "Images require alternative text, at most 5 MiB and 4096 × 4096 pixels.",
      });
    if (!image && !v.durationSeconds)
      ctx.addIssue({ code: "custom", message: "Video duration is required." });
  });
const asset = z.object({ id: z.string().uuid() }).passthrough();
const common = {
  id: z.string().uuid(),
  version: z.number().int().positive().optional(),
  slug: text(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: text(200),
  status: z.enum(["Published", "Draft"]),
  author: z.string().trim().max(160).default(""),
  publishedAt: date.optional(),
  tags: z.array(text(60)).max(20).default([]),
  order: z.number().int().min(0).max(1000000),
  language: z.enum(["en", "si", "ta"]).default("en"),
  featured: z.boolean().default(false),
};
export const awarenessSchemas = {
  articles: z.object({
    ...common,
    category: text(100),
    summary: text(2000),
    readingMinutes: z.number().int().min(1).max(240),
    body: paragraphs,
    image: asset.optional(),
    imageUrl: url.optional(),
  }),
  cyberTips: z.object({ ...common, topic: text(100), text: text(4000) }),
  newsUpdates: z.object({
    ...common,
    date,
    summary: text(2000),
    tag: text(100),
    body: paragraphs.default([]),
  }),
  bestPractices: z.object({
    ...common,
    topic: text(100),
    summary: z.string().trim().max(2000).default(""),
    steps: z.array(text(2000)).max(100),
  }),
  posters: z.object({
    ...common,
    topic: text(100),
    description: text(2000),
    format: z.enum(["SVG", "PNG", "JPEG", "WEBP"]),
    file: z.string().max(2048).default(""),
    image: asset.optional(),
  }),
  infographics: z.object({
    ...common,
    category: text(100),
    alt: text(2000),
    points: z.array(text(2000)).max(100),
    file: z.string().max(2048).default(""),
    image: asset.optional(),
  }),
  videos: z.object({
    ...common,
    category: text(100),
    description: text(2000),
    durationLabel: text(20).regex(/^\d{1,3}:[0-5]\d(?::[0-5]\d)?$/),
    chapters: z
      .array(z.object({ label: text(200), at: text(20).regex(/^\d{1,3}:[0-5]\d(?::[0-5]\d)?$/) }))
      .max(100),
    transcript: paragraphs,
    sourceUrl: url.optional(),
    posterUrl: url.optional(),
    poster: asset.optional(),
    video: asset.optional(),
  }),
};
export function parseAwareness(kind: AwarenessKind, input: unknown) {
  const record = awarenessSchemas[kind].parse(input);
  if (record.status === "Published") {
    const required =
      "body" in record && kind === "articles"
        ? record.body
        : "steps" in record
          ? record.steps
          : "transcript" in record
            ? record.transcript
            : "points" in record
              ? record.points
              : null;
    if (required && !required.length)
      throw new z.ZodError([
        { code: "custom", path: [], message: "Add full content before publishing." },
      ]);
    if ((kind === "posters" || kind === "infographics") && !("image" in record && record.image))
      throw new z.ZodError([
        { code: "custom", path: ["image"], message: "Add an image before publishing." },
      ]);
  }
  if ("chapters" in record) {
    const seconds = record.chapters.map((c) =>
      c.at.split(":").reduce((n, p) => n * 60 + Number(p), 0),
    );
    if (seconds.some((v, i) => i > 0 && v <= seconds[i - 1]!))
      throw new z.ZodError([
        { code: "custom", path: ["chapters"], message: "Chapter times must increase." },
      ]);
  }
  return record;
}
export const awarenessListSchema = z.object({
  kind: z.enum(awarenessKinds),
  admin: z.boolean().default(false),
  search: z.string().trim().max(200).default(""),
  topic: z.string().max(100).default(""),
  status: z.enum(["Published", "Draft"]).optional(),
  sort: z.enum(["order", "newest", "title"]).default("order"),
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(100),
});
export type AwarenessListInput = z.input<typeof awarenessListSchema>;
