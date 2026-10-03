import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasRecentRecovery } from "./recovery";
const check = (amr: unknown, error: unknown = null) =>
  hasRecentRecovery({
    auth: { getClaims: vi.fn().mockResolvedValue({ data: { claims: { amr } }, error }) },
  } as unknown as SupabaseClient);
describe("verified recovery session evidence", () => {
  it("accepts recent recovery and rejects password sessions, expired and future claims", async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    expect(await check([{ method: "recovery", timestamp }])).toBe(true);
    expect(await check([{ method: "password", timestamp }])).toBe(false);
    expect(await check([{ method: "recovery", timestamp: timestamp - 901 }])).toBe(false);
    expect(await check([{ method: "recovery", timestamp: timestamp + 60 }])).toBe(false);
    expect(await check(["recovery", null])).toBe(false);
    expect(await check([{ method: "recovery", timestamp }], new Error("invalid signature"))).toBe(
      false,
    );
  });
});
