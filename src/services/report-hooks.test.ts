import { describe, expect, it } from "vitest";
import { csvCell } from "./report-hooks";

describe("report CSV", () => {
  it("quotes fields and neutralizes spreadsheet formulas", () => {
    expect(csvCell('Safety, "advanced"')).toBe('"Safety, ""advanced"""');
    expect(csvCell('=WEBSERVICE("https://example.invalid")')).toBe(
      '"\'=WEBSERVICE(""https://example.invalid"")"',
    );
    expect(csvCell("  +1+1")).toBe('"\'  +1+1"');
  });
});
