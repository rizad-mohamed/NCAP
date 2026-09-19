import { describe, expect, it } from "vitest";
import {
  emailSchema,
  passwordSchema,
  phoneSchema,
  recoverPersistedSections,
  lessonBlocksSchema,
  lessonVideoSchema,
} from "./validation";

describe("form validation", () => {
  it("keeps legacy lesson text and safe paragraph formatting", () => {
    expect(lessonBlocksSchema.parse([{ kind: "paragraph", text: "Legacy content" }])).toEqual([
      { kind: "paragraph", text: "Legacy content" },
    ]);
    const blocks = [
      {
        kind: "paragraph",
        text: "Formatted content",
        format: { bold: true, italic: true, underline: true, align: "center" },
      },
    ];
    expect(lessonBlocksSchema.parse(blocks)).toEqual(blocks);
    expect(
      lessonBlocksSchema.safeParse([
        { kind: "paragraph", text: "Invalid", format: { align: "javascript:alert(1)" } },
      ]).success,
    ).toBe(false);
  });
  it("rejects unsafe lesson video URLs", () => {
    expect(
      lessonVideoSchema.safeParse({
        kind: "external",
        url: "javascript:alert(1)",
        transcript: "Transcript",
      }).success,
    ).toBe(false);
  });
  it("trims and validates email addresses", () =>
    expect(emailSchema.parse(" learner@example.lk ")).toBe("learner@example.lk"));
  it("requires a letter and number in passwords", () => {
    expect(passwordSchema.safeParse("password").success).toBe(false);
    expect(passwordSchema.safeParse("password8").success).toBe(true);
  });
  it("accepts an empty optional phone and rejects letters", () => {
    expect(phoneSchema.safeParse("").success).toBe(true);
    expect(phoneSchema.safeParse("not-a-phone").success).toBe(false);
  });
});

it("recovers valid persisted sections without retaining a corrupt sibling", () => {
  const defaults = {
    completedLessons: [] as string[],
    bookmarks: [] as string[],
    session: {
      role: "guest",
      name: "",
      email: "",
      joinedAt: "",
      interests: [],
      notifications: true,
      phone: "",
    },
  };
  const recovered = recoverPersistedSections(
    { completedLessons: "invalid", bookmarks: ["lesson-1"], session: { role: "invalid" } },
    defaults,
  );
  expect(recovered.completedLessons).toEqual([]);
  expect(recovered.bookmarks).toEqual(["lesson-1"]);
  expect(recovered.session.role).toBe("guest");
});
