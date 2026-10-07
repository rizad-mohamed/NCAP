import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const mocks = vi.hoisted(() => ({
  client: {} as Record<string, unknown>,
  allow: vi.fn(),
  checkAttempt: vi.fn(),
  recovery: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let schema: z.ZodType | undefined;
    const builder = {
      validator: (value: z.ZodType) => {
        schema = value;
        return builder;
      },
      handler:
        (handler: (input: { data: unknown }) => unknown) => async (input?: { data: unknown }) =>
          handler({ data: schema ? schema.parse(input?.data) : input?.data }),
    };
    return builder;
  },
}));
vi.mock("@tanstack/react-start/server", () => ({
  setResponseHeaders: vi.fn(),
  setCookie: vi.fn(),
}));
vi.mock("@/server/auth/supabase", () => ({ createSupabaseServerClient: () => mocks.client }));
vi.mock("@/server/auth/env", () => ({
  getServerAuthEnv: () => ({ APP_URL: "https://ncap.test" }),
}));
vi.mock("@/server/auth/abuse", () => ({
  allowAuthAttempt: mocks.allow,
  checkAuthAttempt: mocks.checkAttempt,
}));
vi.mock("@/server/auth/recovery", () => ({ hasRecentRecovery: mocks.recovery }));
import { verifyCurrentPassword } from "@/server/auth/password";
import {
  signIn,
  register,
  requestPasswordReset,
  resendVerification,
  updatePassword,
  changePassword,
  updateProfile,
  getAuthState,
  signOut,
} from "./auth.functions";

vi.mock("@/server/auth/password", () => ({
  verifyCurrentPassword: vi.fn().mockResolvedValue(true),
}));
const authUser = {
  email: "test@example.invalid",
  id: "00000000-0000-4000-8000-000000000002",
  email_confirmed_at: "2026-10-04",
};
const profile = {
  id: authUser.id,
  email: "test@example.invalid",
  display_name: "Learner",
  role: "learner",
  status: "active",
  language: "en",
  phone: "",
  notifications: true,
  interests: ["Passwords"],
  avatar: null,
  created_at: "2026-10-04",
};
let auth: Record<string, ReturnType<typeof vi.fn>>;
let table: {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.allow.mockResolvedValue(true);
  mocks.checkAttempt.mockResolvedValue("allowed");
  mocks.recovery.mockResolvedValue(true);
  auth = Object.fromEntries(
    [
      "getUser",
      "signInWithPassword",
      "signUp",
      "resend",
      "resetPasswordForEmail",
      "updateUser",
      "signOut",
    ].map((name) => [name, vi.fn().mockResolvedValue({ data: { user: authUser }, error: null })]),
  );
  table = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: profile, error: null }),
    update: vi.fn(),
  };
  table.select.mockReturnValue(table);
  table.eq.mockReturnValue(table);
  table.update.mockReturnValue(table);
  mocks.client = { auth, from: vi.fn().mockReturnValue(table) };
});
describe("authentication server actions", () => {
  const registration = {
    data: {
      name: "Learner",
      email: "test@example.invalid",
      password: "LongPassword123",
      language: "en" as const,
    },
  };
  it("consumes one registration action per request and allows five before the sixth is limited", async () => {
    auth["signUp"]!.mockResolvedValue({
      data: {},
      error: { status: 429, code: "over_email_send_rate_limit" },
    });
    for (let i = 0; i < 5; i++) {
      expect(await register(registration)).toEqual({
        ok: false,
        message: "Verification email requests are temporarily limited. Please try again later.",
      });
      expect(mocks.checkAttempt).toHaveBeenCalledTimes(i + 1);
      expect(auth["signUp"]).toHaveBeenCalledTimes(i + 1);
    }
    mocks.checkAttempt.mockResolvedValue("limited");
    expect(await register(registration)).toEqual({
      ok: false,
      message: "Too many registration attempts. Please wait and try again.",
    });
    expect(auth["signUp"]).toHaveBeenCalledTimes(5);
    expect(mocks.allow).not.toHaveBeenCalled();
    expect(mocks.checkAttempt).toHaveBeenLastCalledWith("register", registration.data.email);
  });
  it.each([
    [
      429,
      "over_email_send_rate_limit",
      "Verification email requests are temporarily limited. Please try again later.",
    ],
    [
      429,
      "over_request_rate_limit",
      "The registration service is receiving too many requests. Please try again later.",
    ],
    [
      429,
      undefined,
      "The registration service is receiving too many requests. Please try again later.",
    ],
    [503, "unexpected_failure", "Registration is temporarily unavailable. Please try again later."],
    [0, undefined, "Registration is temporarily unavailable. Please try again later."],
    [
      400,
      "email_address_invalid",
      "Unable to create the account. Check the details and try again.",
    ],
    [422, "user_already_exists", "Unable to create the account. Check the details and try again."],
  ])("safely distinguishes upstream registration errors (%s/%s)", async (status, code, message) => {
    auth["signUp"]!.mockResolvedValue({
      data: {},
      error: { status, code, message: "private provider detail" },
    });
    expect(await register(registration)).toEqual({ ok: false, message });
    expect(mocks.checkAttempt).toHaveBeenCalledTimes(1);
  });
  it("fails closed without mislabeling an unavailable throttle as a reached limit", async () => {
    mocks.checkAttempt.mockResolvedValue("unavailable");
    expect(await register(registration)).toEqual({
      ok: false,
      message: "Registration is temporarily unavailable. Please try again later.",
    });
    expect(auth["signUp"]).not.toHaveBeenCalled();
  });
  it("validates registration before contacting Auth and ignores privileged metadata", async () => {
    await expect(
      register({ data: { name: "a", email: "invalid", password: "short", language: "en" } }),
    ).rejects.toBeInstanceOf(z.ZodError);
    expect(auth["signUp"]).not.toHaveBeenCalled();
    expect(mocks.checkAttempt).not.toHaveBeenCalled();
    const result = await register({
      data: {
        name: "Learner",
        email: "test@example.invalid",
        password: "LongPassword123",
        language: "en",
      },
    });
    expect(result).toMatchObject({ ok: true, data: { requiresEmailVerification: true } });
    expect(auth["signUp"]).toHaveBeenCalledWith(
      expect.objectContaining({
        options: {
          emailRedirectTo: "https://ncap.test/auth/callback",
          data: { display_name: "Learner", language: "en" },
        },
      }),
    );
  });
  it("throttles login before password verification", async () => {
    mocks.allow.mockResolvedValue(false);
    expect(
      await signIn({ data: { email: "test@example.invalid", password: "bad" } }),
    ).toMatchObject({ ok: false });
    expect(auth["signInWithPassword"]).not.toHaveBeenCalled();
  });
  it("hides provider errors on login", async () => {
    auth["signInWithPassword"]!.mockResolvedValue({
      data: {},
      error: { message: "sensitive backend error" },
    });
    expect(await signIn({ data: { email: "test@example.invalid", password: "bad" } })).toEqual({
      ok: false,
      message: "The email address or password is incorrect.",
    });
  });
  it("returns authoritative persisted interests on login", async () => {
    expect(
      await signIn({ data: { email: "test@example.invalid", password: "LongPassword123" } }),
    ).toMatchObject({ ok: true, data: { interests: ["Passwords"] } });
  });
  it("clears suspended sessions", async () => {
    table.single.mockResolvedValue({ data: { ...profile, status: "suspended" }, error: null });
    expect(await getAuthState()).toEqual({ user: null });
    expect(auth["signOut"]).toHaveBeenCalledWith({ scope: "local" });
  });
  it("does not reveal account existence in recovery and resend responses", async () => {
    auth["resetPasswordForEmail"]!.mockResolvedValue({
      error: { status: 400, message: "missing user" },
    });
    auth["resend"]!.mockResolvedValue({ error: { status: 400, message: "missing user" } });
    expect(await requestPasswordReset({ data: { email: "test@example.invalid" } })).toMatchObject({
      ok: true,
    });
    expect(await resendVerification({ data: { email: "test@example.invalid" } })).toMatchObject({
      ok: true,
    });
  });
  it("requires recent verified recovery evidence for reset", async () => {
    mocks.recovery.mockResolvedValue(false);
    expect(await updatePassword({ data: { password: "LongPassword123" } })).toMatchObject({
      ok: false,
    });
    expect(auth["updateUser"]).not.toHaveBeenCalled();
  });
  it("denies suspended accounts password changes", async () => {
    table.single.mockResolvedValue({ data: { ...profile, status: "suspended" }, error: null });
    expect(
      await changePassword({
        data: { currentPassword: "OldPassword123", newPassword: "LongPassword123" },
      }),
    ).toMatchObject({ ok: false });
    expect(auth["updateUser"]).not.toHaveBeenCalled();
  });
  it("denies a wrong current password before changing credentials", async () => {
    vi.mocked(verifyCurrentPassword).mockResolvedValueOnce(false);
    expect(
      await changePassword({
        data: { currentPassword: "WrongPassword123", newPassword: "LongPassword123" },
      }),
    ).toMatchObject({ ok: false });
    expect(auth["updateUser"]).not.toHaveBeenCalled();
  });
  it("passes current password to Auth and revokes other refresh sessions", async () => {
    expect(
      await changePassword({
        data: { currentPassword: "OldPassword123", newPassword: "LongPassword123" },
      }),
    ).toMatchObject({ ok: true });
    expect(auth["updateUser"]).toHaveBeenCalledWith({
      password: "LongPassword123",
      current_password: "OldPassword123",
    });
    expect(auth["signOut"]).toHaveBeenCalledWith({ scope: "others" });
  });
  it("updates only safe fields for the authenticated identity", async () => {
    const result = await updateProfile({
      data: {
        displayName: "Learner",
        language: "en",
        phone: "",
        notifications: true,
        interests: ["Passwords"],
        avatar: null,
      },
    });
    expect(result).toMatchObject({ ok: true });
    expect(table.update).toHaveBeenCalledWith({
      display_name: "Learner",
      language: "en",
      phone: "",
      notifications: true,
      interests: ["Passwords"],
      avatar: null,
    });
    expect(table.eq).toHaveBeenCalledWith("id", authUser.id);
  });
  it("reports logout failure without claiming a session transition", async () => {
    auth["signOut"]!.mockResolvedValue({ error: { message: "private" } });
    expect(await signOut()).toEqual({
      ok: false,
      message: "Unable to sign out. Please try again.",
    });
  });
});
