import { describe, expect, it } from "vitest";
import { safeInternalPath } from "@/auth/redirect";

describe("safeInternalPath", () => {
  it("keeps application paths", () => {
    expect(safeInternalPath("/dashboard?tab=progress#latest")).toBe(
      "/dashboard?tab=progress#latest",
    );
  });

  it.each([
    "https://attacker.example",
    "//attacker.example/path",
    "/\\attacker.example",
    "dashboard",
  ])("rejects unsafe redirect %s", (value) => {
    expect(safeInternalPath(value, "/dashboard")).toBe("/dashboard");
  });
});
