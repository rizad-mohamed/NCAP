import { describe, expect, it } from "vitest";
import { quizDefinitionSchema, quizQuestionSchema, remainingSeconds } from "./quiz";

const definition = {
  id: "q-test",
  moduleId: "m-test",
  title: "Safety check",
  slug: "safety-check",
  description: "Check safe decisions",
  instructions: "",
  topic: "Safety",
  difficulty: "Beginner",
  durationSeconds: 600,
  passingPercent: 70,
  eligibilityPercent: 80,
  maxAttempts: null,
  cooldownSeconds: 0,
  questionCount: 2,
  status: "Draft",
};
describe("Quiz validation and display timer", () => {
  it("rejects invalid scoring and retake settings", () => {
    expect(quizDefinitionSchema.safeParse({ ...definition, passingPercent: 101 }).success).toBe(
      false,
    );
    expect(quizDefinitionSchema.safeParse({ ...definition, maxAttempts: 0 }).success).toBe(false);
    expect(quizDefinitionSchema.safeParse({ ...definition, cooldownSeconds: -1 }).success).toBe(
      false,
    );
    expect(quizDefinitionSchema.safeParse(definition).success).toBe(true);
  });
  it("requires a correct option that exists", () => {
    const question = {
      id: "qn-1",
      quizId: "q-test",
      prompt: "Choose a safe action",
      topic: "Safety",
      difficulty: "Beginner",
      order: 1,
      explanation: "Because it is safer",
      options: ["Wrong", "Right"],
      correctIndex: 1,
      status: "Published",
    };
    expect(quizQuestionSchema.safeParse(question).success).toBe(true);
    expect(quizQuestionSchema.safeParse({ ...question, correctIndex: 2 }).success).toBe(false);
    expect(quizQuestionSchema.safeParse({ ...question, options: ["Only one"] }).success).toBe(
      false,
    );
  });
  it("calculates a display countdown from the server clock and clamps expiration", () => {
    expect(remainingSeconds("2026-09-29T00:10:00Z", "2026-09-29T00:00:00Z")).toBe(600);
    expect(remainingSeconds("2026-09-29T00:10:00Z", "2026-09-29T00:00:00Z", 9000)).toBe(591);
    expect(remainingSeconds("2026-09-29T00:10:00Z", "2026-09-29T00:00:00Z", 610000)).toBe(0);
  });
});
