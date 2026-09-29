import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import {
  getQuizCatalogue,
  getQuizHistory,
  getAdminQuestions,
  getAdminQuizSummary,
} from "@/quiz.functions";
import type { QuizDefinition, QuizHistoryItem, AdminQuizQuestion } from "@/domain/quiz";
import { RepositoryError } from "@/services";

export async function unwrapQuiz<T>(
  result: Promise<{ ok: true; data: T } | { ok: false; code: string; message: string }>,
): Promise<T> {
  const response = await result;
  if (!response.ok)
    throw new RepositoryError(response.code as RepositoryError["code"], response.message);
  return response.data;
}
export function useQuizCatalogue(admin = false) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["quiz", "catalogue", admin, user?.id ?? "public"],
    queryFn: () => unwrapQuiz<QuizDefinition[]>(getQuizCatalogue({ data: admin })),
    refetchInterval: 30000,
  });
}
export function useQuizHistory(quizId: string | null = null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["quiz", "history", user?.id, quizId],
    queryFn: () => unwrapQuiz<QuizHistoryItem[]>(getQuizHistory({ data: quizId })),
    enabled: !!user,
    refetchInterval: 15000,
  });
}
export function useAdminQuizQuestions(quizId: string | null = null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["quiz", "questions", user?.id, quizId],
    queryFn: () => unwrapQuiz<AdminQuizQuestion[]>(getAdminQuestions({ data: quizId })),
  });
}
export function useInvalidateQuiz() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: ["quiz"] });
}
export function useAdminQuizSummary() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["quiz", "admin-summary", user?.id],
    queryFn: () =>
      unwrapQuiz<{
        attempts: number;
        averageScore: number;
        publishedQuizzes: number;
        publishedQuestions: number;
        trend: { period: string; average: number; attempts: number }[];
      }>(getAdminQuizSummary()),
    enabled: !!user,
    refetchInterval: 30000,
  });
}
