import { z } from "zod";

const id = z.string().regex(/^[a-z0-9][a-z0-9-]{1,99}$/);
const difficulty = z.enum(["Beginner", "Intermediate", "Advanced"]);
const status = z.enum(["Draft", "Published"]);
export const quizDefinitionSchema = z.object({
  id,
  moduleId: id,
  title: z.string().trim().min(3).max(160),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  description: z.string().trim().min(1).max(2000),
  instructions: z.string().max(4000).default(""),
  topic: z.string().trim().min(1).max(120),
  difficulty,
  durationSeconds: z.number().int().min(60).max(7200),
  passingPercent: z.number().int().min(0).max(100),
  eligibilityPercent: z.number().int().min(0).max(100),
  maxAttempts: z.number().int().min(1).max(100).nullable(),
  cooldownSeconds: z.number().int().min(0).max(604800),
  questionCount: z.number().int().min(1).max(100),
  status,
  version: z.number().int().positive().optional(),
});
export const quizQuestionSchema = z
  .object({
    id: z.string().min(2).max(120),
    quizId: id,
    prompt: z.string().trim().min(5).max(2000),
    topic: z.string().trim().min(1).max(120),
    difficulty,
    order: z.number().int().min(1).max(10000),
    explanation: z.string().trim().min(1).max(2000),
    options: z.array(z.string().trim().min(1).max(500)).min(2).max(10),
    correctIndex: z.number().int().min(0).max(9),
    status,
    version: z.number().int().positive().optional(),
  })
  .refine((value) => value.correctIndex < value.options.length, {
    message: "Choose a correct answer from the available options.",
    path: ["correctIndex"],
  });
export type QuizDefinition = z.infer<typeof quizDefinitionSchema> & {
  availableQuestions: number;
  createdAt?: string;
  updatedAt?: string;
};
export type AdminQuizQuestion = z.infer<typeof quizQuestionSchema>;
export interface DeliveredQuestion {
  id: string;
  prompt: string;
  topic: string;
  difficulty: string;
  position: number;
  options: { id: string; text: string }[];
  selectedOptionId: string | null;
  correctOptionId: string | null;
  explanation: string | null;
}
export interface ServerQuizAttempt {
  id: string;
  quizId: string;
  attemptNumber: number;
  startedAt: string;
  deadlineAt: string;
  serverNow: string;
  completedAt: string | null;
  status: "in_progress" | "submitted" | "expired";
  correct: number | null;
  total: number | null;
  scorePercent: number | null;
  passed: boolean | null;
  questions: DeliveredQuestion[];
  byTopic: { topic: string; correct: number; total: number }[] | null;
}
export interface QuizHistoryItem {
  id: string;
  quizId: string;
  attemptNumber: number;
  status: ServerQuizAttempt["status"];
  startedAt: string;
  deadlineAt: string;
  completedAt: string | null;
  scorePercent: number | null;
  correct: number | null;
  total: number | null;
  passed: boolean | null;
}
export function remainingSeconds(deadlineAt: string, serverNow: string, elapsedMs = 0) {
  return Math.max(
    0,
    Math.ceil((Date.parse(deadlineAt) - Date.parse(serverNow) - elapsedMs) / 1000),
  );
}
