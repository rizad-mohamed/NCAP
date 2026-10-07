// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  header: vi.fn(),
  origin: "http://127.0.0.1:4173",
}));
vi.mock("@tanstack/react-start/server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@tanstack/react-start/server", () => ({ getRequestHeader: mocks.header }));
vi.mock("./env", () => ({
  getServerAuthEnv: () => ({ APP_URL: mocks.origin, SUPABASE_URL: "https://backend.test" }),
}));
import { allowAuthAttempt, checkAuthAttempt } from "./abuse";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only-server-credential");
  vi.stubEnv("AUTH_TRUST_PROXY", "");
  mocks.origin = "http://127.0.0.1:4173";
  mocks.rpc.mockResolvedValue({ data: true, error: null });
});
describe("shared authentication abuse controls", () => {
  it.each([
    ["register", 5],
    ["resendVerification", 5],
    ["requestPasswordReset", 5],
    ["updatePassword", 5],
    ["changePassword", 5],
    ["signIn", 10],
    ["adminChange", 30],
  ])("preserves the %s action policy", async (action, max) => {
    expect(await checkAuthAttempt(action, "learner@example.invalid")).toBe("allowed");
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    expect(mocks.rpc.mock.calls[0]?.[1]).toMatchObject({ max_attempts: 120, window_seconds: 600 });
    expect(mocks.rpc.mock.calls[1]?.[1]).toMatchObject({ max_attempts: max, window_seconds: 300 });
  });
  it("uses independent resend and registration identity buckets with normalized identity", async () => {
    await checkAuthAttempt("register", " Learner@example.invalid ");
    const registerBucket = mocks.rpc.mock.calls[1]?.[1].bucket_key;
    await checkAuthAttempt("resendVerification", "learner@example.invalid");
    expect(mocks.rpc.mock.calls[3]?.[1].bucket_key).not.toBe(registerBucket);
    await checkAuthAttempt("register", "learner@example.invalid");
    expect(mocks.rpc.mock.calls[5]?.[1].bucket_key).toBe(registerBucket);
  });
  it("distinguishes actual denial from unavailable counters without retrying consumption", async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: false, error: null });
    expect(await checkAuthAttempt("register", "learner")).toBe("limited");
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    mocks.rpc.mockRejectedValueOnce(new Error("network"));
    expect(await checkAuthAttempt("register", "learner")).toBe("unavailable");
    expect(mocks.rpc).toHaveBeenCalledTimes(3);
  });
  it("uses opaque buckets and bounded source/action counters", async () => {
    expect(await allowAuthAttempt("signIn", "alice@example.invalid")).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    for (const [, args] of mocks.rpc.mock.calls) expect(args.bucket_key).toMatch(/^[a-f0-9]{64}$/);
    expect(mocks.rpc.mock.calls[1]?.[1]).toMatchObject({ max_attempts: 10, window_seconds: 300 });
  });
  it("fails closed on missing server credentials and database errors", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(await allowAuthAttempt("signIn", "alice")).toBe(false);
    expect(mocks.rpc).not.toHaveBeenCalled();
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only-server-credential");
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "unavailable" } });
    expect(await allowAuthAttempt("signIn", "alice")).toBe(false);
  });
  it("rejects unknown HTTPS ingress and only uses explicitly trusted Cloudflare headers", async () => {
    mocks.origin = "https://ncap.test";
    mocks.header.mockReturnValue("192.0.2.1");
    expect(await allowAuthAttempt("register", "alice")).toBe(false);
    vi.stubEnv("AUTH_TRUST_PROXY", "cloudflare");
    expect(await allowAuthAttempt("register", "alice")).toBe(true);
    expect(mocks.header).toHaveBeenCalledWith("cf-connecting-ip");
  });
  it("does not continue consuming after a source bucket denies a request", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    expect(await allowAuthAttempt("signIn", "alice")).toBe(false);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
});
