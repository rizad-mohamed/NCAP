// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAdminUsers, useAdminUserDetails, useChangeAdminUser } from "@/services/users-hooks";
import { AdminUsersPage } from "./UsersPage";

vi.mock("@/auth/AuthProvider", () => ({ useAuth: () => ({ user: { id: "admin", role: "super_admin" } }) }));
vi.mock("@/services/users-hooks", () => ({ useAdminUsers: vi.fn(), useAdminUserDetails: vi.fn(), useChangeAdminUser: vi.fn() }));
const user = { id: "00000000-0000-4000-8000-000000000002", name: "Alice Perera", email: "alice@example.lk",
  language: "en", role: "learner" as const, status: "active" as const, joinedAt: "2026-01-01",
  completedLessons: 2, completedModules: 1, progressPercent: 50, quizAverage: 85, attempts: 3, lastActivity: "2026-09-30" };
describe("administrator users page", () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAdminUsers).mockReturnValue({ data: { total: 1, items: [user] } } as ReturnType<typeof useAdminUsers>);
    vi.mocked(useAdminUserDetails).mockReturnValue({ data: { ...user, modules: [], recentActivity: [] } } as unknown as ReturnType<typeof useAdminUserDetails>);
    vi.mocked(useChangeAdminUser).mockReturnValue({ isPending: false, mutateAsync: vi.fn().mockResolvedValue(undefined) } as unknown as ReturnType<typeof useChangeAdminUser>);
  });
  it("renders Supabase results and sends search, role and status filters", () => {
    render(<AdminUsersPage />);
    expect(screen.getByText("Alice Perera")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "alice" } });
    expect(vi.mocked(useAdminUsers).mock.lastCall?.[0].search).toBe("alice");
    fireEvent.change(screen.getByLabelText("Role"), { target: { value: "learner" } });
    expect(vi.mocked(useAdminUsers).mock.lastCall?.[0].role).toBe("learner");
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "active" } });
    expect(vi.mocked(useAdminUsers).mock.lastCall?.[0].status).toBe("active");
  });
  it("opens saved user details and submits status change with a reason", async () => {
    render(<AdminUsersPage />);
    fireEvent.click(screen.getByRole("button", { name: "View" }));
    expect(screen.getByText(/2 lessons completed/)).toBeInTheDocument();
    fireEvent.change(screen.getAllByLabelText("Status")[1]!, { target: { value: "suspended" } });
    fireEvent.change(screen.getByPlaceholderText("Required for restrictions"), { target: { value: "Security review" } });
    fireEvent.click(screen.getByRole("button", { name: "Update status" }));
    expect(vi.mocked(useChangeAdminUser).mock.results[0]?.value.mutateAsync).toHaveBeenCalledWith({
      target: user.id, status: "suspended", reason: "Security review",
    });
  });
  it("paginates on the server and submits a role change", () => {
    vi.mocked(useAdminUsers).mockReturnValue({ data: { total: 25, items: [user] } } as ReturnType<typeof useAdminUsers>);
    render(<AdminUsersPage />);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(vi.mocked(useAdminUsers).mock.lastCall?.[0].offset).toBe(20);
    fireEvent.click(screen.getByRole("button", { name: "View" }));
    fireEvent.change(screen.getAllByLabelText("Role")[1]!, { target: { value: "super_admin" } });
    fireEvent.click(screen.getByRole("button", { name: "Update role" }));
    expect(vi.mocked(useChangeAdminUser).mock.results[0]?.value.mutateAsync).toHaveBeenCalledWith({
      target: user.id, role: "super_admin", reason: "",
    });
  });
});
