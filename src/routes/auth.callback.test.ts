// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const exchange = vi.hoisted(() => vi.fn());
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (config: unknown) => config }));
vi.mock("@tanstack/react-start/server", () => ({ setResponseHeaders: vi.fn() }));
vi.mock("@/server/auth/supabase", () => ({
  createSupabaseServerClient: () => ({ auth: { exchangeCodeForSession: exchange } }),
}));
vi.mock("@/server/auth/env", () => ({
  getServerAuthEnv: () => ({ APP_URL: "https://ncap.test" }),
}));
import { Route } from "./auth.callback";
const callback = (
  Route as unknown as {
    server: { handlers: { GET: (input: { request: Request }) => Promise<Response> } };
  }
).server.handlers.GET;
beforeEach(() => {
  vi.clearAllMocks();
  exchange.mockResolvedValue({ error: null });
});
describe("PKCE email callback", () => {
  it("exchanges a verification code and redirects to an internal destination", async () => {
    const response = await callback({
      request: new Request("https://ncap.test/auth/callback?code=test-code"),
    });
    expect(exchange).toHaveBeenCalledWith("test-code");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://ncap.test/dashboard");
  });
  it("keeps recovery redirects internal and rejects external destinations", async () => {
    const reset = await callback({
      request: new Request("https://ncap.test/auth/callback?code=test-code&next=%2Freset-password"),
    });
    expect(reset.headers.get("location")).toBe("https://ncap.test/reset-password");
    const unsafe = await callback({
      request: new Request(
        "https://ncap.test/auth/callback?code=test-code&next=https%3A%2F%2Fevil.test",
      ),
    });
    expect(unsafe.headers.get("location")).toBe("https://ncap.test/dashboard");
  });
  it("fails safely for missing, expired or replayed codes", async () => {
    const missing = await callback({ request: new Request("https://ncap.test/auth/callback") });
    expect(exchange).not.toHaveBeenCalled();
    expect(missing.headers.get("location")).toBe(
      "https://ncap.test/verify-email?error=link_invalid",
    );
    exchange.mockResolvedValue({ error: { message: "sensitive provider details" } });
    const invalid = await callback({
      request: new Request("https://ncap.test/auth/callback?code=test-code"),
    });
    expect(invalid.headers.get("location")).toBe(
      "https://ncap.test/verify-email?error=link_invalid",
    );
  });
});
