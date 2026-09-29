import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { createSupabaseServerClient } from "@/server/auth/supabase";
import {
  quizResult,
  listQuizzes,
  listAdminQuestions,
  saveQuiz,
  deleteQuiz,
  saveQuestion,
  deleteQuestion,
  startAttempt,
  getAttempt,
  answerAttempt,
  submitAttempt,
  attemptHistory,
  quizEligibility,
  adminQuizSummary,
} from "@/server/quiz-service";
function client() {
  setResponseHeaders(
    new Headers({ "cache-control": "private, no-store", vary: "Cookie, Authorization" }),
  );
  return createSupabaseServerClient();
}
export const getQuizCatalogue = createServerFn({ method: "GET" })
  .validator((v: unknown) => v)
  .handler(({ data }) => quizResult(() => listQuizzes(client(), data)));
export const getAdminQuestions = createServerFn({ method: "GET" })
  .validator((v: unknown) => v)
  .handler(({ data }) => quizResult(() => listAdminQuestions(client(), data)));
export const saveQuizDefinition = createServerFn({ method: "POST" })
  .validator((v: unknown) => v)
  .handler(({ data }) => quizResult(() => saveQuiz(client(), data)));
export const deleteQuizDefinition = createServerFn({ method: "POST" })
  .validator((v: unknown) => v)
  .handler(({ data }) => quizResult(() => deleteQuiz(client(), data)));
export const saveQuizQuestion = createServerFn({ method: "POST" })
  .validator((v: unknown) => v)
  .handler(({ data }) => quizResult(() => saveQuestion(client(), data)));
export const deleteQuizQuestion = createServerFn({ method: "POST" })
  .validator((v: unknown) => v)
  .handler(({ data }) => quizResult(() => deleteQuestion(client(), data)));
export const beginQuizAttempt = createServerFn({ method: "POST" })
  .validator((v: unknown) => v)
  .handler(({ data }) => quizResult(() => startAttempt(client(), data)));
export const readQuizAttempt = createServerFn({ method: "GET" })
  .validator((v: unknown) => v)
  .handler(({ data }) => quizResult(() => getAttempt(client(), data)));
export const answerQuizQuestion = createServerFn({ method: "POST" })
  .validator((v: unknown) => v)
  .handler(({ data }) => quizResult(() => answerAttempt(client(), data)));
export const finishQuizAttempt = createServerFn({ method: "POST" })
  .validator((v: unknown) => v)
  .handler(({ data }) => quizResult(() => submitAttempt(client(), data)));
export const getQuizHistory = createServerFn({ method: "GET" })
  .validator((v: unknown) => v)
  .handler(({ data }) => quizResult(() => attemptHistory(client(), data)));
export const getQuizEligibility = createServerFn({ method: "GET" })
  .validator((v: unknown) => v)
  .handler(({ data }) => quizResult(() => quizEligibility(client(), data)));
export const getAdminQuizSummary = createServerFn({ method: "GET" }).handler(() =>
  quizResult(() => adminQuizSummary(client())),
);
