import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServerClient } from "@supabase/ssr";
import { getCookies, setCookie, setResponseHeaders } from "@tanstack/react-start/server";
import { createSupabaseServerClient } from "./supabase";

vi.mock("@tanstack/react-start/server-only", () => ({}));
vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));
vi.mock("@tanstack/react-start/server", () => ({
  getCookies: vi.fn(() => ({})),
  setCookie: vi.fn(),
  setResponseHeaders: vi.fn(),
}));
vi.mock("./env", () => ({
  getServerAuthEnv: () => ({
    APP_URL: "https://ncap.test",
    SUPABASE_URL: "https://backend.test",
    SUPABASE_PUBLISHABLE_KEY: "public-test-configuration",
  }),
}));
const emit = () => {
  const options = vi.mocked(createServerClient).mock.calls[0]![2];
  const cookies = options.cookies as unknown as {
    setAll: (values: unknown[], headers: Record<string, string>) => void;
  };
  cookies.setAll(
    [
      {
        name: "sb-session",
        value: "test-session",
        options: { maxAge: 3600, httpOnly: false, sameSite: "none", secure: false },
      },
    ],
    { "cache-control": "private, no-store" },
  );
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCookies).mockReturnValue({});
});
describe("server session cookies", () => {
  it("forces HTTPS/HttpOnly/SameSite and uses a session cookie without remember-me", () => {
    createSupabaseServerClient({ persistSessionCookie: false });
    emit();
    expect(setResponseHeaders).toHaveBeenCalledWith(
      new Headers({ "cache-control": "private, no-store" }),
    );
    expect(setCookie).toHaveBeenCalledWith("sb-session", "test-session", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: true,
    });
  });
  it("keeps persistent cookie expiry when requested", () => {
    createSupabaseServerClient({ persistSessionCookie: true });
    emit();
    expect(setCookie).toHaveBeenCalledWith(
      "sb-session",
      "test-session",
      expect.objectContaining({ maxAge: 3600, httpOnly: true }),
    );
  });
  it("uses the server cookie preference during later refreshes", () => {
    vi.mocked(getCookies).mockReturnValue({ "ncap-session-persistent": "1" });
    createSupabaseServerClient();
    emit();
    expect(setCookie).toHaveBeenCalledWith(
      "sb-session",
      "test-session",
      expect.objectContaining({ maxAge: 3600 }),
    );
  });
});
