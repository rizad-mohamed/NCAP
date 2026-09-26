import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AuthUser } from "@/auth/types";
import type { LearningModule, Lesson, TopicRecord } from "@/data/types";
import { emptyLearningState, type learnerMutationSchema } from "@/domain/learning";
import type { z } from "zod";
import { getLearningState, mutateLearningState } from "@/learning/learning.functions";
import { allLearning, unwrapLearning } from "./learning-repository";

export function useLearningStore(user: AuthUser | null, admin: boolean) {
  const queryClient = useQueryClient();
  const scope = admin ? `admin:${user?.id}` : `learning:${user?.id ?? "public"}`;
  const modules = useQuery({
    queryKey: ["repository", "modules", scope],
    queryFn: () => allLearning("modules", admin) as Promise<LearningModule[]>,
    refetchInterval: 30000,
  });
  const lessons = useQuery({
    queryKey: ["repository", "lessons", scope],
    queryFn: () => allLearning("lessons", admin) as Promise<Lesson[]>,
    refetchInterval: 30000,
  });
  const topics = useQuery({
    queryKey: ["repository", "topics", scope],
    queryFn: () => allLearning("topics", admin) as Promise<TopicRecord[]>,
    refetchInterval: 30000,
  });
  const stateKey = useMemo(() => ["learning-state", user?.id ?? "guest"], [user?.id]);
  const state = useQuery({
    queryKey: stateKey,
    queryFn: () => unwrapLearning(getLearningState()),
    enabled: !!user,
    refetchInterval: 15000,
    staleTime: 0,
  });
  const mutation = useMutation({
    scope: { id: `learning-state:${user?.id}` },
    mutationFn: (data: z.input<typeof learnerMutationSchema>) =>
      unwrapLearning(mutateLearningState({ data })),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: stateKey });
    },
    onError: (error) => toast.error(error.message),
  });
  const learning = user ? (state.data ?? emptyLearningState) : emptyLearningState;
  return {
    ...learning,
    modules: modules.data ?? [],
    lessons: lessons.data ?? [],
    topics: topics.data ?? [],
    learningPending:
      modules.isPending || lessons.isPending || topics.isPending || (!!user && state.isPending),
    learningError: modules.error ?? lessons.error ?? topics.error ?? (user ? state.error : null),
    learningSaving: mutation.isPending,
    async completeLesson(lessonId: string) {
      await mutation.mutateAsync({ action: "complete", lessonId });
    },
    async toggleBookmark(lessonId: string) {
      const saved = !learning.bookmarks.includes(lessonId);
      await mutation.mutateAsync({ action: "bookmark", lessonId, saved });
      return saved;
    },
    async saveResume(lessonId: string, source: string, seconds: number) {
      await mutation.mutateAsync({ action: "resume", lessonId, source, seconds });
    },
  };
}
