/**
 * Mock frontend services.
 *
 * These deliberately mirror the shape of a future HTTP client so that each
 * service can later be swapped for a real API implementation without touching
 * the views:
 *
 *   MockLearningService     -> learning API
 *   MockAwarenessService    -> content API
 *   MockQuizService         -> assessment API
 *   MockReportingService    -> analytics API
 *   MockCertificateService  -> certificate API
 *
 * Nothing here talks to a server. All data is deterministic and local.
 */
import { NCAP_CONFIG } from "@/lib/config";
import { lessons, lessonsForModule, modules } from "@/data/learning";
import { questions, quizzes } from "@/data/quizzes";
import {
  articles,
  bestPractices,
  infographics,
  news,
  posters,
  tips,
  videos,
} from "@/data/awareness";
import { adminActivity, announcements, completionTrend, demoUsers, quizTrend, topicEngagement } from "@/data/admin";
import type { QuizQuestion } from "@/data/types";

const delay = <T>(value: T, ms = NCAP_CONFIG.mockLatencyMs): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

export const MockLearningService = {
  listModules: () => delay(modules),
  getModule: (id: string) => delay(modules.find((m) => m.id === id) ?? null),
  listLessons: (moduleId?: string) => delay(moduleId ? lessonsForModule(moduleId) : lessons),
  getLesson: (id: string) => delay(lessons.find((l) => l.id === id) ?? null),
  search: (term: string) => {
    const q = term.trim().toLowerCase();
    if (!q) return delay({ lessons: [], modules: [] });
    return delay({
      lessons: lessons.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.summary.toLowerCase().includes(q) ||
          l.topic.toLowerCase().includes(q),
      ),
      modules: modules.filter(
        (m) => m.title.toLowerCase().includes(q) || m.description.toLowerCase().includes(q),
      ),
    });
  },
};

export const MockAwarenessService = {
  listArticles: () => delay(articles),
  getArticle: (slug: string) => delay(articles.find((a) => a.slug === slug) ?? null),
  listTips: () => delay(tips),
  listNews: () => delay(news),
  listBestPractices: () => delay(bestPractices),
  listPosters: () => delay(posters),
  listInfographics: () => delay(infographics),
  listVideos: () => delay(videos),
};

/** Deterministic-but-shuffled selection performed once, at attempt start. */
function pickQuestions(moduleId: string, count: number): QuizQuestion[] {
  const pool = questions.filter((q) => q.moduleId === moduleId && q.status === "Published");
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

export const MockQuizService = {
  listQuizzes: () => delay(quizzes),
  getQuiz: (id: string) => delay(quizzes.find((q) => q.id === id) ?? null),
  questionCount: (moduleId: string) => questions.filter((q) => q.moduleId === moduleId).length,
  startAttempt: (moduleId: string) =>
    delay(pickQuestions(moduleId, NCAP_CONFIG.questionsPerAttempt), 220),
};

export const MockReportingService = {
  overview: () =>
    delay({
      users: demoUsers.length,
      activeLearners: demoUsers.filter((u) => u.status === "Active").length,
      lessonsPublished: lessons.filter((l) => l.status === "Published").length,
      quizAttempts: quizTrend.reduce((s, r) => s + r.attempts, 0),
      averageScore: Math.round(quizTrend.reduce((s, r) => s + r.average, 0) / quizTrend.length),
      certificatesIssued: demoUsers.reduce((s, u) => s + u.certificates, 0),
    }),
  quizTrend: () => delay(quizTrend),
  completionTrend: () => delay(completionTrend),
  topicEngagement: () => delay(topicEngagement),
  recentActivity: () => delay(adminActivity),
  announcements: () => delay(announcements),
  users: () => delay(demoUsers),
};

export const MockCertificateService = {
  reference: (moduleId: string) => `NCAP-DEMO-${moduleId.replace("m-", "").toUpperCase()}`,
};

export { delay };
