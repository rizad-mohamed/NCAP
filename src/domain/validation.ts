import { z } from "zod";
import { lessonVideoPlayback } from "@/lib/lesson-video";

export const emailSchema = z.string().trim().email("Enter a valid email address.").max(254);
export const phoneSchema = z
  .string()
  .trim()
  .max(24)
  .refine((value) => !value || /^\+?[0-9 ()-]{7,24}$/.test(value), "Enter a valid phone number.");
export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Use no more than 128 characters.")
  .regex(/[A-Za-z]/, "Include a letter.")
  .regex(/[0-9]/, "Include a number.");

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(100),
  email: emailSchema,
  phone: phoneSchema,
});

export const lessonBlocksSchema = z
  .array(
    z.discriminatedUnion("kind", [
      z.object({
        kind: z.literal("paragraph"),
        text: z.string().trim().min(1).max(4000),
        format: z
          .object({
            bold: z.boolean().optional(),
            italic: z.boolean().optional(),
            underline: z.boolean().optional(),
            align: z.enum(["left", "center", "right"]).optional(),
          })
          .optional(),
      }),
      z.object({ kind: z.literal("heading"), text: z.string().trim().min(1).max(160) }),
      z.object({
        kind: z.literal("list"),
        items: z.array(z.string().trim().min(1).max(300)).min(1).max(20),
      }),
      z.object({
        kind: z.literal("callout"),
        tone: z.enum(["tip", "warning", "note"]),
        title: z.string().trim().min(1).max(120),
        text: z.string().trim().min(1).max(1500),
      }),
      z.object({
        kind: z.literal("example"),
        title: z.string().trim().min(1).max(120),
        text: z.string().trim().min(1).max(1500),
      }),
      z.object({
        kind: z.literal("check"),
        question: z.string().trim().min(1).max(300),
        options: z.array(z.string().trim().min(1).max(240)).min(2).max(6),
        correctIndex: z.number().int().min(0),
        explanation: z.string().trim().min(1).max(1200),
      }),
    ]),
  )
  .min(1, "Add at least one lesson block.")
  .max(100)
  .superRefine((blocks, context) => {
    blocks.forEach((block, index) => {
      if (block.kind === "check" && block.correctIndex >= block.options.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Correct answer index is outside the answer list.",
          path: [index, "correctIndex"],
        });
      }
    });
  });

const videoAssetSchema = z.object({
  id: z.string().min(1),
  fileName: z.string().min(1).max(140),
  mimeType: z.enum(["video/mp4", "video/webm"]),
  sizeBytes: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  durationSeconds: z.number().positive(),
  storageKey: z.string().min(1),
  status: z.enum(["local-demo", "ready"]),
});

export const lessonVideoSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("external"),
    url: z
      .string()
      .trim()
      .max(2048)
      .refine(
        (value) => lessonVideoPlayback(value) !== null,
        "Use an HTTPS YouTube, Vimeo, MP4, or WebM URL.",
      ),
    transcript: z.string().trim().max(50_000),
  }),
  z.object({
    kind: z.literal("upload"),
    asset: videoAssetSchema,
    transcript: z.string().trim().max(50_000),
  }),
]);

export const persistedStateEnvelopeSchema = z.object({
  version: z.literal(2),
  state: z.record(z.string(), z.unknown()),
});

const recordWithId = z.object({ id: z.string().min(1) }).passthrough();
const persistedSectionSchemas = {
  session: z
    .object({
      role: z.enum(["guest", "learner", "admin"]),
      name: z.string(),
      email: z.string(),
      joinedAt: z.string(),
      interests: z.array(z.string()),
      notifications: z.boolean(),
      phone: z.string(),
    })
    .passthrough(),
  completedLessons: z.array(z.string()),
  bookmarks: z.array(z.string()),
  attempts: z.array(recordWithId),
  activities: z.array(recordWithId),
  issuedCertificates: z.array(z.object({ moduleId: z.string() }).passthrough()),
  lessons: z.array(recordWithId),
  modules: z.array(recordWithId),
  questions: z.array(recordWithId),
  topics: z.array(recordWithId),
  announcements: z.array(recordWithId),
  users: z.array(recordWithId),
  quizDrafts: z.record(z.string(), z.object({ quizId: z.string() }).passthrough()),
  certificateTemplate: z
    .object({
      title: z.string(),
      subtitle: z.string(),
      issuer: z.string(),
      body: z.string(),
      signatoryName: z.string(),
      signatoryTitle: z.string(),
      theme: z.enum(["navy", "blue", "teal"]),
    })
    .passthrough(),
  certificateRecords: z.array(recordWithId),
} satisfies Record<string, z.ZodTypeAny>;

/** Keep independently valid demo-state sections and reset only corrupt sections. */
export function recoverPersistedSections<T extends Record<string, unknown>>(
  candidate: unknown,
  defaults: T,
): T {
  if (!candidate || typeof candidate !== "object") return defaults;
  const source = candidate as Record<string, unknown>;
  const restored: Record<string, unknown> = { ...defaults };
  for (const [key, schema] of Object.entries(persistedSectionSchemas)) {
    const parsed = schema.safeParse(source[key]);
    if (parsed.success) restored[key] = parsed.data;
  }
  return restored as T;
}
