// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAdminUsers, useAdminUserDetails, useChangeAdminUser } from "@/services/users-hooks";
import { AdminUsersPage } from "./UsersPage";

vi.mock("@/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "admin", role: "super_admin" } }),
}));
vi.mock("@/services/users-hooks", () => ({
  useAdminUsers: vi.fn(),
  useAdminUserDetails: vi.fn(),
  useChangeAdminUser: vi.fn(),
}));
const user = {
  id: "00000000-0000-4000-8000-000000000002",
  name: "Alice Perera",
  email: "alice@example.lk",
  language: "en",
  role: "learner" as const,
  status: "active" as const,
  joinedAt: "2026-01-01",
  completedLessons: 2,
  completedModules: 1,
  progressPercent: 50,
  quizAverage: 85,
  attempts: 3,
  lastActivity: "2026-09-30",
};
describe("administrator users page", () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAdminUsers).mockReturnValue({ data: { total: 1, items: [user] } } as ReturnType<
      typeof useAdminUsers
    >);
    vi.mocked(useAdminUserDetails).mockReturnValue({
      data: { ...user, modules: [], recentActivity: [] },
    } as unknown as ReturnType<typeof useAdminUserDetails>);
    vi.mocked(useChangeAdminUser).mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useChangeAdminUser>);
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
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "User details" })).toHaveFocus(),
    );
    const summary = within(screen.getByRole("region", { name: "Learning summary" }));
    expect(summary.getByText("Lessons completed").nextElementSibling).toHaveTextContent("2");
    expect(summary.getByText("Quiz average").nextElementSibling).toHaveTextContent("85%");
    fireEvent.change(screen.getAllByLabelText("Status")[1]!, { target: { value: "suspended" } });
    expect(screen.getByRole("button", { name: "Update status" })).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Required for restrictions"), {
      target: { value: "Security review" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update status" }));
    expect(vi.mocked(useChangeAdminUser).mock.results[0]?.value.mutateAsync).toHaveBeenCalledWith({
      target: user.id,
      status: "suspended",
      reason: "Security review",
    });
  });
  it("paginates on the server and submits a role change", () => {
    vi.mocked(useAdminUsers).mockReturnValue({ data: { total: 25, items: [user] } } as ReturnType<
      typeof useAdminUsers
    >);
    render(<AdminUsersPage />);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(vi.mocked(useAdminUsers).mock.lastCall?.[0].offset).toBe(20);
    fireEvent.click(screen.getByRole("button", { name: "View" }));
    fireEvent.change(screen.getAllByLabelText("Role")[1]!, { target: { value: "super_admin" } });
    fireEvent.click(screen.getByRole("button", { name: "Update role" }));
    expect(vi.mocked(useChangeAdminUser).mock.results[0]?.value.mutateAsync).toHaveBeenCalledWith({
      target: user.id,
      role: "super_admin",
      reason: "",
    });
  });
  it("replaces the user table and pagination with loading feedback until records arrive", () => {
    vi.mocked(useAdminUsers).mockReturnValue({ isPending: true } as ReturnType<
      typeof useAdminUsers
    >);
    render(<AdminUsersPage />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading users");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Results pagination" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("No users found")).not.toBeInTheDocument();
  });
  it("waits for account details before exposing mutation controls", () => {
    vi.mocked(useAdminUserDetails).mockReturnValue({ isPending: true } as ReturnType<
      typeof useAdminUserDetails
    >);
    render(<AdminUsersPage />);
    fireEvent.click(screen.getByRole("button", { name: "View" }));
    const panel = within(screen.getByRole("dialog"));
    expect(panel.getByRole("status")).toHaveTextContent("Loading details");
    expect(panel.queryByRole("button", { name: "Update role" })).not.toBeInTheDocument();
    expect(panel.queryByRole("button", { name: "Update status" })).not.toBeInTheDocument();
  });
});
