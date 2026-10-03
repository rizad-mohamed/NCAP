import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";
import { useAdminUsers, useAdminUserDetails, useChangeAdminUser } from "./users-hooks";

const api = vi.hoisted(() => ({ list: vi.fn(), details: vi.fn(), change: vi.fn() }));
vi.mock("@/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "admin", role: "super_admin" } }),
}));
vi.mock("@/users.functions", () => ({
  getAdminUsers: api.list,
  getAdminUserDetails: api.details,
  changeAdminUser: api.change,
}));

it("keeps account changes pending until the list and detail refreshes both finish", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  });
  const filters = {
    offset: 0,
    limit: 20,
    search: "",
    role: "" as const,
    status: "" as const,
    sort: "created" as const,
    direction: "desc" as const,
  };
  client.setQueryData(["admin-users", "admin", filters], {
    total: 1,
    items: [{ id: "target", status: "active" }],
  });
  client.setQueryData(["admin-user-details", "admin", "target"], {
    id: "target",
    status: "active",
  });
  let finishList!: (value: unknown) => void;
  let finishDetails!: (value: unknown) => void;
  api.list.mockReturnValue(
    new Promise((resolve) => {
      finishList = resolve;
    }),
  );
  api.details.mockReturnValue(
    new Promise((resolve) => {
      finishDetails = resolve;
    }),
  );
  api.change.mockResolvedValue({ ok: true, data: undefined });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(
    () => ({
      list: useAdminUsers(filters),
      details: useAdminUserDetails("target"),
      change: useChangeAdminUser(),
    }),
    { wrapper },
  );
  try {
    act(() =>
      hook.result.current.change.mutate({
        target: "target",
        status: "suspended",
        reason: "Security review",
      }),
    );
    await waitFor(() => expect(api.details).toHaveBeenCalled());
    expect(hook.result.current.change.isPending).toBe(true);
    await act(async () =>
      finishList({ ok: true, data: { total: 1, items: [{ id: "target", status: "suspended" }] } }),
    );
    expect(hook.result.current.change.isPending).toBe(true);
    await act(async () => finishDetails({ ok: true, data: { id: "target", status: "suspended" } }));
    await waitFor(() => expect(hook.result.current.change.isSuccess).toBe(true));
    expect(hook.result.current.details.data?.status).toBe("suspended");
    expect(hook.result.current.list.data?.items[0]?.status).toBe("suspended");
  } finally {
    hook.unmount();
    client.clear();
  }
});
