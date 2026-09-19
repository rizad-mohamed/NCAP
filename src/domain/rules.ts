import type {
  Announcement,
  CertificatePolicy,
  Lesson,
  QuizAttempt,
  QuizQuestion,
  TopicRecord,
} from "@/data/types";

export const CERTIFICATE_POLICY: CertificatePolicy = {
  completionPercent: 100,
  minimumBestQuizScore: 80,
};

export function calculateQuizResult(questions: QuizQuestion[], answers: Record<string, number>) {
  const correct = questions.filter(
    (question) => answers[question.id] === question.correctIndex,
  ).length;
  const total = questions.length;
  const byTopic = [...new Set(questions.map((question) => question.topic))].map((topic) => ({
    topic,
    correct: questions.filter(
      (question) => question.topic === topic && answers[question.id] === question.correctIndex,
    ).length,
    total: questions.filter((question) => question.topic === topic).length,
  }));
  return {
    correct,
    total,
    scorePercent: total ? Math.round((correct / total) * 100) : 0,
    byTopic,
  };
}

export function bestQuizScore(attempts: QuizAttempt[], quizId: string) {
  return attempts
    .filter((attempt) => attempt.quizId === quizId)
    .reduce((best, attempt) => Math.max(best, attempt.scorePercent), 0);
}

export function evaluateCertificateEligibility(input: {
  moduleId: string;
  quizId: string;
  lessons: Lesson[];
  completedLessonIds: string[];
  attempts: QuizAttempt[];
  policy?: CertificatePolicy;
}) {
  const policy = input.policy ?? CERTIFICATE_POLICY;
  const published = input.lessons.filter(
    (lesson) => lesson.moduleId === input.moduleId && lesson.status === "Published",
  );
  const completed = published.filter((lesson) => input.completedLessonIds.includes(lesson.id));
  const completionPercent = published.length
    ? Math.round((completed.length / published.length) * 100)
    : 0;
  const score = bestQuizScore(input.attempts, input.quizId);
  const eligible =
    completionPercent === policy.completionPercent && score >= policy.minimumBestQuizScore;
  const reasons: string[] = [];
  if (completionPercent !== policy.completionPercent) {
    reasons.push(`Complete all published lessons (${completionPercent}% complete).`);
  }
  if (score < policy.minimumBestQuizScore) {
    reasons.push(
      `Reach at least ${policy.minimumBestQuizScore}% on the module quiz (best: ${score}%).`,
    );
  }
  return { eligible, completionPercent, bestScore: score, reasons };
}

export function announcementStatus(announcement: Announcement, now = new Date()) {
  if (!announcement.active) return "Inactive" as const;
  const today = now.toISOString().slice(0, 10);
  if (today < announcement.startsAt) return "Scheduled" as const;
  if (today > announcement.endsAt) return "Expired" as const;
  return "Active" as const;
}

export function isAnnouncementVisible(
  announcement: Announcement,
  audience: "learner" | "admin",
  joinedAt?: string,
  now = new Date(),
) {
  if (announcementStatus(announcement, now) !== "Active") return false;
  if (audience === "admin") return announcement.audience === "Administrators";
  if (announcement.audience === "All Learners") return true;
  if (announcement.audience !== "New Learners" || !joinedAt) return false;
  const joined = new Date(`${joinedAt.slice(0, 10)}T00:00:00Z`).getTime();
  const ageDays = (now.getTime() - joined) / 86_400_000;
  return ageDays >= 0 && ageDays <= 30;
}

export function normalizeTopicName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function topicSlug(value: string) {
  return normalizeTopicName(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isDuplicateTopic(topics: TopicRecord[], name: string, exceptId?: string) {
  const normalized = normalizeTopicName(name).toLocaleLowerCase();
  return topics.some(
    (topic) => topic.id !== exceptId && topic.name.toLocaleLowerCase() === normalized,
  );
}
