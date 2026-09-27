import { describe, it, expect } from "vitest";
import { learningSchemas, learningListSchema, learnerMutationSchema } from "./learning";
const module = {
  id: "m-one",
  topicId: "t-one",
  topic: "Safety",
  title: "Safer accounts",
  description: "Description",
  difficulty: "Beginner",
  minutes: 10,
  order: 1,
  status: "Draft",
  objectives: ["Stay safe"],
  quizId: "",
};
const lesson = {
  ...module,
  id: "l-one",
  moduleId: module.id,
  summary: "Summary",
  blocks: [{ kind: "paragraph", text: "Content" }],
};
describe("Learning input contracts", () => {
  it("accepts all structured lesson block types", () => {
    expect(
      learningSchemas.lessons.parse({
        ...lesson,
        blocks: [
          { kind: "paragraph", text: "Hello", format: { bold: true, align: "center" } },
          { kind: "heading", text: "Title" },
          { kind: "list", items: ["Item"] },
          { kind: "callout", tone: "tip", title: "Tip", text: "Do this" },
          { kind: "example", title: "Example", text: "Try this" },
          {
            kind: "check",
            question: "Question?",
            options: ["A", "B"],
            correctIndex: 0,
            explanation: "Explanation",
          },
        ],
      }).blocks,
    ).toHaveLength(6);
  });
  it.each([
    { topicId: undefined },
    { minutes: -1 },
    { order: 0 },
    { objectives: [] },
    { title: " " },
    { id: "../bad" },
  ])("rejects invalid module fields %j", (patch) =>
    expect(learningSchemas.modules.safeParse({ ...module, ...patch }).success).toBe(false),
  );
  it("rejects arbitrary video protocols and missing publication transcripts", () => {
    expect(
      learningSchemas.lessons.safeParse({
        ...lesson,
        video: { kind: "external", url: "javascript:alert(1)", transcript: "Text" },
      }).success,
    ).toBe(false);
    expect(
      learningSchemas.lessons.safeParse({
        ...lesson,
        status: "Published",
        video: { kind: "external", url: "https://example.org/video.mp4", transcript: "" },
      }).success,
    ).toBe(false);
  });
  it("bounds search, pagination and resume payloads", () => {
    expect(learningListSchema.safeParse({ kind: "lessons", limit: 101 }).success).toBe(false);
    expect(learningListSchema.safeParse({ kind: "lessons", offset: -1 }).success).toBe(false);
    expect(
      learnerMutationSchema.safeParse({
        action: "resume",
        lessonId: "l-one",
        source: "video",
        seconds: Infinity,
      }).success,
    ).toBe(false);
    expect(
      learnerMutationSchema.parse({ action: "complete", lessonId: "l-one", userId: "other" }),
    ).toEqual({ action: "complete", lessonId: "l-one" });
  });
});
