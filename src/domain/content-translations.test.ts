import { describe, expect, it } from "vitest";
import { translatedRecords, translationSaveSchema } from "./content-translations";
import { interfaceText } from "@/lib/i18n";
describe("Localization integrity", () => {
  it("retains English when no approved translation exists", () => {
    const source = [{ id: "lesson", title: "English", moduleId: "stable" }];
    expect(translatedRecords(source, [])).toEqual(source);
    expect(interfaceText("si", "Unreviewed new interface text")).toBe(
      "Unreviewed new interface text",
    );
  });
  it("uses approved dictionary entries for keyed and literal interface strings", () => {
    for (const language of ["si", "ta"] as const) {
      expect(interfaceText(language, "nav.dashboard")).toBe(interfaceText(language, "Dashboard"));
      expect(interfaceText(language, "Dashboard")).not.toBe("Dashboard");
    }
    expect(interfaceText("en", "__proto__")).toBe("__proto__");
  });
  it("overlays reviewed text while retaining source IDs, assets and transcript relationships", () => {
    const source = [
      {
        id: "lesson",
        title: "English",
        moduleId: "stable",
        video: { kind: "upload", asset: { id: "asset" }, transcript: "Original" },
      },
    ];
    const next = translatedRecords(source, [
      {
        source_id: "lesson",
        language: "si",
        content: { title: "Translated", transcript: "Reviewed transcript" },
      },
    ]);
    expect(next[0]).toMatchObject({
      id: "lesson",
      moduleId: "stable",
      title: "Translated",
      video: { asset: { id: "asset" }, transcript: "Reviewed transcript" },
    });
    expect(source[0]?.video.transcript).toBe("Original");
  });
  it("rejects arbitrary resource/asset fields and publication statuses", () => {
    expect(() =>
      translatedRecords(
        [{ id: "original" }],
        [
          {
            source_id: "original",
            language: "si",
            content: { title: "Translated", id: "other" } as never,
          },
        ],
      ),
    ).toThrow();
    expect(
      translationSaveSchema.safeParse({
        kind: "lessons",
        sourceId: "lesson",
        sourceVersion: 1,
        expectedVersion: 0,
        language: "si",
        status: "Approved",
        content: { title: "Invalid status" },
      }).success,
    ).toBe(false);
  });
});
