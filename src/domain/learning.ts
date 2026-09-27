import { z } from "zod";
import { lessonBlocksSchema, lessonVideoSchema } from "./validation";
import type { ActivityItem, LearningModule, Lesson, TopicRecord } from "@/data/types";

export const learningKinds = ["topics", "modules", "lessons"] as const;
export type LearningKind = (typeof learningKinds)[number];
export type LearningRecord = TopicRecord | LearningModule | Lesson;
export const learningId = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
const text = (max: number) => z.string().trim().min(1).max(max);
const common = { id: learningId, version: z.number().int().positive().optional() };
const content = {
  ...common,
  title: text(160),
  topicId: learningId,
  topic: text(80),
  difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]),
  minutes: z.number().int().min(1).max(10000),
  order: z.number().int().min(1).max(9999).default(1),
  status: z.enum(["Draft", "Published"]),
  objectives: z.array(text(500)).min(1).max(30),
};
const asset = z.object({ id: z.string().uuid(), status: z.literal("ready") }).passthrough();
export const learningSchemas = {
  topics: z.object({
    ...common,
    name: text(80),
    slug: text(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    status: z.enum(["Active", "Inactive"]),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  }),
  modules: z.object({
    ...content,
    description: text(1200),
    quizId: z.string().max(100).default(""),
    image: asset.optional(),
  }),
  lessons: z
    .object({
      ...content,
      moduleId: learningId,
      summary: text(1200),
      updatedAt: z.string().optional(),
      blocks: lessonBlocksSchema,
      video: lessonVideoSchema.optional(),
    })
    .superRefine((lesson, ctx) => {
      if (lesson.video?.kind === "upload" && lesson.video.asset.status !== "ready")
        ctx.addIssue({
          code: "custom",
          message: "Upload the video before saving.",
          path: ["video"],
        });
      if (lesson.status === "Published" && lesson.video && !lesson.video.transcript.trim())
        ctx.addIssue({
          code: "custom",
          message: "Add a transcript before publishing.",
          path: ["video", "transcript"],
        });
    }),
};
export const learningListSchema = z.object({
  kind: z.enum(learningKinds),
  admin: z.boolean().default(false),
  search: z.string().trim().max(200).default(""),
  topicId: learningId.optional(),
  moduleId: learningId.optional(),
  id: learningId.optional(),
  status: z.enum(["Draft", "Published", "Active", "Inactive"]).optional(),
  difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]).optional(),
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(100),
});
export type LearningListInput = z.input<typeof learningListSchema>;
export const learnerMutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("complete"),
    lessonId: learningId,
    expectedUserId: z.string().uuid().optional(),
  }),
  z.object({
    action: z.literal("bookmark"),
    lessonId: learningId,
    saved: z.boolean(),
    expectedUserId: z.string().uuid().optional(),
  }),
  z.object({
    action: z.literal("resume"),
    expectedUserId: z.string().uuid().optional(),
    lessonId: learningId,
    source: z.string().max(2048),
    seconds: z.number().finite().min(0).max(14400),
  }),
]);
export interface LearningState {
  statistics?: {
    totalLessons: number;
    completedCount: number;
    minutes: number;
    overall: number;
    moduleProgress: { id: string; total: number; completed: number }[];
  };
  completedLessons: string[];
  bookmarks: string[];
  activities: ActivityItem[];
  resume: Record<string, { source: string; seconds: number }>;
}
export const emptyLearningState: LearningState = {
  completedLessons: [],
  bookmarks: [],
  activities: [],
  resume: {},
};
