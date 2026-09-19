import { describe, expect, it } from "vitest";
import { normalizeRepositoryError, RepositoryError } from "./index";

describe("repository error normalization", () => {
  it.each([
    [401, "unauthenticated"],
    [403, "forbidden"],
    [404, "not-found"],
    [409, "conflict"],
    [422, "validation"],
    [429, "rate-limited"],
    [500, "server"],
  ] as const)("maps HTTP %i to %s", (status, code) => {
    expect(normalizeRepositoryError(new Error("response"), status)).toMatchObject({ code, status });
  });

  it("normalizes abort and network failures without exposing technical details", () => {
    expect(normalizeRepositoryError(new DOMException("abort", "AbortError")).code).toBe("cancelled");
    expect(normalizeRepositoryError(new TypeError("fetch failed"))).toMatchObject({
      code: "network",
      retryable: true,
    });
  });

  it("preserves a normalized repository error", () => {
    const error = new RepositoryError("timeout", "The request timed out.", undefined, true);
    expect(normalizeRepositoryError(error)).toBe(error);
  });
});
