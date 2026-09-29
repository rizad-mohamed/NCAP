import { z } from "zod";
import type { LearningClient } from "@/server/learning/authorization";
import { requireLearner, requireLearningAdmin } from "@/server/learning/authorization";
import { RepositoryError } from "@/services";
import {
  quizDefinitionSchema,
  quizQuestionSchema,
  type QuizDefinition,
  type AdminQuizQuestion,
  type ServerQuizAttempt,
  type QuizHistoryItem,
} from "@/domain/quiz";
import type { Json } from "@/types/database";

function databaseError(error: { code?: string } | null) {
  if (!error) return;
  if (["PT409", "23505", "40001"].includes(error.code ?? ""))
    throw new RepositoryError(
      "conflict",
      "This quiz changed, the attempt limit was reached, or the answer was already submitted.",
    );
  if (error.code === "42501")
    throw new RepositoryError("forbidden", "You do not have permission for this Quiz action.");
  if (error.code === "P0002")
    throw new RepositoryError("not-found", "This quiz or attempt is unavailable.");
  if (["23503", "23514", "22023", "22P02"].includes(error.code ?? ""))
    throw new RepositoryError("validation", "Check the quiz details and answers.");
  throw new RepositoryError("server", "Quizzes are temporarily unavailable. Please try again.");
}
export async function quizResult<T>(operation: () => Promise<T>) {
  try {
    return { ok: true as const, data: await operation() };
  } catch (error) {
    if (error instanceof z.ZodError)
      return {
        ok: false as const,
        code: "validation",
        message: error.issues[0]?.message ?? "Check the quiz details.",
      };
    if (error instanceof RepositoryError)
      return { ok: false as const, code: error.code, message: error.message };
    return {
      ok: false as const,
      code: "server",
      message: "Quizzes are temporarily unavailable. Please try again.",
    };
  }
}
export async function listQuizzes(client: LearningClient, input: unknown) {
  const admin = z.boolean().parse(input);
  if (admin) await requireLearningAdmin(client);
  const { data, error } = await client.rpc("quiz_catalogue", { admin });
  databaseError(error);
  return data as unknown as QuizDefinition[];
}
export async function listAdminQuestions(client: LearningClient, input: unknown) {
  await requireLearningAdmin(client);
  const target = z.string().nullable().parse(input);
  const { data, error } = await client.rpc("quiz_admin_questions", { target });
  databaseError(error);
  return data as unknown as AdminQuizQuestion[];
}
export async function saveQuiz(client: LearningClient, input: unknown) {
  await requireLearningAdmin(client);
  const payload = quizDefinitionSchema.parse(input);
  const { data, error } = await client.rpc("quiz_save_definition", { payload: payload as Json });
  databaseError(error);
  return data as unknown as QuizDefinition;
}
export async function deleteQuiz(client: LearningClient, input: unknown) {
  await requireLearningAdmin(client);
  const { target, expectedVersion } = z
    .object({ target: z.string(), expectedVersion: z.number().int().positive() })
    .parse(input);
  const { error } = await client.rpc("quiz_delete_definition", {
    target,
    expected_version: expectedVersion,
  });
  databaseError(error);
}
export async function saveQuestion(client: LearningClient, input: unknown) {
  await requireLearningAdmin(client);
  const payload = quizQuestionSchema.parse(input);
  const { data, error } = await client.rpc("quiz_save_question", { payload: payload as Json });
  databaseError(error);
  return data as unknown as AdminQuizQuestion;
}
export async function deleteQuestion(client: LearningClient, input: unknown) {
  await requireLearningAdmin(client);
  const { target, expectedVersion } = z
    .object({ target: z.string(), expectedVersion: z.number().int().positive() })
    .parse(input);
  const { error } = await client.rpc("quiz_delete_question", {
    target,
    expected_version: expectedVersion,
  });
  databaseError(error);
}
export async function startAttempt(client: LearningClient, input: unknown) {
  await requireLearner(client);
  const target = z.string().parse(input);
  const { data, error } = await client.rpc("quiz_start", { target });
  databaseError(error);
  return data as unknown as ServerQuizAttempt;
}
export async function getAttempt(client: LearningClient, input: unknown) {
  await requireLearner(client);
  const target = z.string().uuid().parse(input);
  const { data, error } = await client.rpc("quiz_attempt", { target });
  databaseError(error);
  return data as unknown as ServerQuizAttempt;
}
export async function answerAttempt(client: LearningClient, input: unknown) {
  await requireLearner(client);
  const { target, question, optionId } = z
    .object({ target: z.string().uuid(), question: z.string().min(2), optionId: z.string().uuid() })
    .parse(input);
  const { data, error } = await client.rpc("quiz_answer", {
    target,
    question,
    option_id: optionId,
  });
  databaseError(error);
  return data as unknown as ServerQuizAttempt;
}
export async function submitAttempt(client: LearningClient, input: unknown) {
  await requireLearner(client);
  const target = z.string().uuid().parse(input);
  const { data, error } = await client.rpc("quiz_submit", { target });
  databaseError(error);
  return data as unknown as ServerQuizAttempt;
}
export async function attemptHistory(client: LearningClient, input: unknown) {
  await requireLearner(client);
  const target = z.string().nullable().parse(input);
  const { data, error } = await client.rpc("quiz_history", { target });
  databaseError(error);
  return data as unknown as QuizHistoryItem[];
}
export async function quizEligibility(client: LearningClient, input: unknown) {
  await requireLearner(client);
  const target = z.string().parse(input);
  const { data, error } = await client.rpc("quiz_eligibility", { target });
  databaseError(error);
  return data as unknown as {
    quizId: string;
    moduleId: string;
    bestScore: number;
    completionPercent: number;
    eligible: boolean;
    threshold: number;
  };
}
export async function adminQuizSummary(client: LearningClient) {
  await requireLearningAdmin(client);
  const { data, error } = await client.rpc("quiz_admin_summary");
  databaseError(error);
  return data as unknown as {
    attempts: number;
    averageScore: number;
    publishedQuizzes: number;
    publishedQuestions: number;
    trend: { period: string; average: number; attempts: number }[];
  };
}
