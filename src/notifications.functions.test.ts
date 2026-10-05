import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn() }));
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
vi.mock("@tanstack/react-start/server", () => ({ setResponseHeaders: vi.fn() }));
vi.mock("@/server/auth/supabase", () => ({
  createSupabaseServerClient: () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }),
}));
import {
  listNotifications,
  syncNotifications,
  readAllNotifications,
  setNotificationRead,
} from "./notifications.functions";
const alice = "00000000-0000-4000-8000-000000000002";
const bob = "00000000-0000-4000-8000-000000000003";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: alice } }, error: null });
  mocks.rpc.mockResolvedValue({ data: { items: [], unreadCount: 0 }, error: null });
});
describe("Notification server identity and error boundaries", () => {
  it("rejects stale-account requests before reading or mutating another account", async () => {
    const requests = [
      () => listNotifications({ data: { expectedUserId: bob, before: null, beforeId: null } }),
      () => syncNotifications({ data: { expectedUserId: bob } }),
      () => readAllNotifications({ data: { expectedUserId: bob } }),
      () => setNotificationRead({ data: { expectedUserId: bob, id: alice, read: true } }),
    ];
    for (const request of requests)
      expect(await request()).toMatchObject({ ok: false, code: "conflict" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("uses bounded owner RPCs and forwards only the read state/resource identifier", async () => {
    expect(
      await listNotifications({ data: { expectedUserId: alice, before: null, beforeId: null } }),
    ).toMatchObject({ ok: true });
    expect(mocks.rpc).toHaveBeenCalledWith("notifications_list", {
      page_before: null,
      before_id: null,
      page_limit: 20,
    });
    await setNotificationRead({ data: { expectedUserId: alice, id: alice, read: false } });
    expect(mocks.rpc).toHaveBeenCalledWith("notifications_set_read", {
      target: alice,
      is_read: false,
    });
  });
  it("rejects signed-out requests and hides underlying database messages", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    expect(await syncNotifications({ data: { expectedUserId: alice } })).toMatchObject({
      ok: false,
      code: "unauthenticated",
    });
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "XX000", message: "internal secret detail" },
    });
    const response = await readAllNotifications({ data: { expectedUserId: alice } });
    expect(response).toMatchObject({ ok: false, code: "server" });
    expect(JSON.stringify(response)).not.toContain("internal secret detail");
  });
});
