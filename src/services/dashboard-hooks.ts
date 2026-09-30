import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import type { Announcement } from "@/data/types";
import { RepositoryError } from "@/services";
import {
  getLearnerDashboard,
  getAdminDashboard,
  getAdminDashboardReport,
  getDashboardAnnouncements,
  getDashboardUsers,
  saveDashboardAnnouncement,
  deleteDashboardAnnouncement,
  beginDashboardLesson,
  heartbeatDashboardLesson,
} from "@/dashboard.functions";

export interface DashboardBadge {
  id: string;
  name: string;
  description: string;
  earned: boolean;
  earnedAt: string | null;
}
export interface DashboardActivity {
  id: string;
  kind: string;
  label: string;
  at: string;
}
export interface LearnerDashboardData {
  statistics: {
    overall: number;
    completedCount: number;
    totalLessons: number;
    moduleProgress: { id: string; total: number; completed: number }[];
  };
  learningSeconds: number;
  badges: DashboardBadge[];
  activities: DashboardActivity[];
  announcements: Pick<Announcement, "id" | "title" | "body">[];
}
export interface AdminDashboardData {
  users: number;
  activeLearners: number;
  publishedLessons: number;
  draftLessons: number;
  completedLessons: number;
  learningSeconds: number;
  completionRate: number;
  announcements: number;
  topicEngagement: { topic: string; learners: number }[];
  recentActivity: DashboardActivity[];
  completionRows: { period: string; completions: number }[];
}
export interface ReportAttempt {
  id: string;
  completedAt: string;
  quizId: string;
  quizTitle: string;
  moduleId: string;
  moduleTitle: string;
  scorePercent: number;
  passed: boolean;
}
export interface DashboardReportData {
  attempts: ReportAttempt[];
  attemptCount: number;
  averageScore: number;
  quizRows: { period: string; attempts: number; average: number }[];
  completedLessons: number;
  learningSeconds: number;
  completionRows: { period: string; completions: number }[];
}
export interface DashboardUser {
  id: string;
  name: string;
  email: string;
  language: string;
  joinedAt: string;
  completedLessons: number;
  progressPercent: number;
  quizAverage: number;
  attempts: number;
  lastActivity: string;
}

export async function unwrapDashboard<T>(
  request: Promise<{ ok: true; data: unknown } | { ok: false; code: string; message: string }>,
): Promise<T> {
  const result = await request;
  if (!result.ok) throw new RepositoryError(result.code as RepositoryError["code"], result.message);
  return result.data as T;
}
export function useLearnerDashboard(offset = 0) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard", "learner", user?.id, offset],
    queryFn: () => unwrapDashboard<LearnerDashboardData>(getLearnerDashboard({ data: offset })),
    enabled: !!user,
    refetchInterval: 15000,
  });
}
export function useAdminDashboard() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard", "admin", user?.id],
    queryFn: () => unwrapDashboard<AdminDashboardData>(getAdminDashboard()),
    enabled: user?.role === "super_admin",
    refetchInterval: 30000,
  });
}
export function useDashboardReport(
  days: number,
  moduleId: string | null,
  quizId: string | null,
  offset: number,
) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard", "report", user?.id, days, moduleId, quizId, offset],
    queryFn: () =>
      unwrapDashboard<DashboardReportData>(
        getAdminDashboardReport({ data: { days, moduleId, quizId, offset } }),
      ),
    enabled: user?.role === "super_admin",
  });
}
export function useDashboardAnnouncements() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["dashboard", "announcements", user?.id],
    queryFn: () => unwrapDashboard<Announcement[]>(getDashboardAnnouncements()),
    enabled: user?.role === "super_admin",
  });
  const save = useMutation({
    mutationFn: (announcement: Omit<Announcement, "id"> & { id?: string | undefined }) =>
      unwrapDashboard(saveDashboardAnnouncement({ data: announcement })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => unwrapDashboard(deleteDashboardAnnouncement({ data: id })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
  });
  return { ...query, save, remove };
}
export function useDashboardUsers(offset: number, limit: number, search: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard", "users", user?.id, offset, limit, search],
    queryFn: () =>
      unwrapDashboard<{ total: number; items: DashboardUser[] }>(
        getDashboardUsers({ data: { offset, limit, search } }),
      ),
    enabled: user?.role === "super_admin",
  });
}
export function useDashboardLessonSession(lessonId: string) {
  const { user } = useAuth();
  const userId = user?.role === "learner" ? user.id : null;
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!userId || !lessonId) return;
    let live = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    void unwrapDashboard<string>(beginDashboardLesson({ data: lessonId }))
      .then((sessionId) => {
        if (!live || !sessionId) return;
        void queryClient.invalidateQueries({ queryKey: ["dashboard", "learner", userId] });
        timer = setInterval(() => {
          if (document.visibilityState === "visible" && document.hasFocus())
            void unwrapDashboard<number>(heartbeatDashboardLesson({ data: sessionId }))
              .then(() =>
                queryClient.invalidateQueries({ queryKey: ["dashboard", "learner", userId] }),
              )
              .catch(() => undefined);
        }, 30000);
      })
      .catch(() => undefined);
    return () => {
      live = false;
      if (timer) clearInterval(timer);
    };
  }, [lessonId, userId, queryClient]);
}
