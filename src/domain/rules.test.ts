import { describe, expect, it } from "vitest";
import {
  announcementStatus,
  calculateQuizResult,
  evaluateCertificateEligibility,
  isAnnouncementVisible,
  isDuplicateTopic,
} from "./rules";
import type { Announcement, Lesson, QuizAttempt, QuizQuestion, TopicRecord } from "@/data/types";

const lesson = (id: string, status: Lesson["status"] = "Published"): Lesson => ({
  id,
  moduleId: "m-1",
  title: id,
  summary: id,
  topic: "Phishing",
  difficulty: "Beginner",
  minutes: 5,
  order: 1,
  status,
  updatedAt: "2026-01-01",
  objectives: [],
  blocks: [],
});
const attempt = (scorePercent: number): QuizAttempt => ({
  id: String(scorePercent),
  quizId: "q-1",
  moduleId: "m-1",
  scorePercent,
  correct: scorePercent,
  total: 100,
  seconds: 10,
  completedAt: "2026-01-01",
  byTopic: [],
});

describe("certificate eligibility", () => {
  it("requires every published lesson and the best score to be at least 80", () => {
    const result = evaluateCertificateEligibility({
      moduleId: "m-1",
      quizId: "q-1",
      lessons: [lesson("a"), lesson("b"), lesson("draft", "Draft")],
      completedLessonIds: ["a", "b"],
      attempts: [attempt(70), attempt(82)],
    });
    expect(result).toMatchObject({ eligible: true, completionPercent: 100, bestScore: 82 });
  });
  it("explains each unmet requirement", () => {
    const result = evaluateCertificateEligibility({
      moduleId: "m-1",
      quizId: "q-1",
      lessons: [lesson("a"), lesson("b")],
      completedLessonIds: ["a"],
      attempts: [attempt(79)],
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toHaveLength(2);
  });
});

describe("quiz scoring", () => {
  it("calculates score and topic breakdown", () => {
    const questions: QuizQuestion[] = [0, 1].map((correctIndex, index) => ({
      id: `q-${index}`,
      moduleId: "m-1",
      topic: "Phishing",
      difficulty: "Beginner",
      prompt: "?",
      options: ["A", "B"],
      correctIndex,
      explanation: "Because",
      status: "Published",
    }));
    expect(calculateQuizResult(questions, { "q-0": 0, "q-1": 0 })).toMatchObject({
      correct: 1,
      total: 2,
      scorePercent: 50,
    });
  });
});

describe("announcement visibility", () => {
  const base: Announcement = {
    id: "a",
    title: "Notice",
    body: "Body",
    audience: "All Learners",
    active: true,
    startsAt: "2026-08-01",
    endsAt: "2026-09-30",
  };
  const now = new Date("2026-08-31T12:00:00Z");
  it("honours status and date windows", () => {
    expect(announcementStatus(base, now)).toBe("Active");
    expect(announcementStatus({ ...base, startsAt: "2026-09-01" }, now)).toBe("Scheduled");
    expect(isAnnouncementVisible(base, "learner", "2026-08-20", now)).toBe(true);
  });
  it("limits new learner announcements to thirty days", () => {
    const item = { ...base, audience: "New Learners" as const };
    expect(isAnnouncementVisible(item, "learner", "2026-08-15", now)).toBe(true);
    expect(isAnnouncementVisible(item, "learner", "2026-06-01", now)).toBe(false);
  });
});

it("detects case-insensitive topic duplicates", () => {
  const topics: TopicRecord[] = [
    {
      id: "1",
      name: "Phishing",
      slug: "phishing",
      status: "Active",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
  ];
  expect(isDuplicateTopic(topics, " phishing ")).toBe(true);
});
