// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardUsers } from "@/services/dashboard-hooks";
import { AdminUsersPage } from "./DashboardSections";

vi.mock("@/services/dashboard-hooks", () => ({ useDashboardUsers: vi.fn() }));

const learner = {
  id: "alice",
  name: "Alice Perera",
  email: "alice@example.lk",
  language: "en",
  joinedAt: "2026-01-01",
  completedLessons: 2,
  progressPercent: 50,
  quizAverage: 85,
  attempts: 3,
  lastActivity: "2026-09-30",
};
function setQuery(value: { isPending?: boolean; isError?: boolean; data?: { total: number; items: typeof learner[] } }) {
  vi.mocked(useDashboardUsers).mockReturnValue(value as ReturnType<typeof useDashboardUsers>);
}
describe("admin learner overview", () => {
  beforeEach(() => vi.clearAllMocks());
  it("renders loading, error and empty states without demo users", () => {
    setQuery({ isPending: true });
    const view = render(<AdminUsersPage />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading learners");
    view.unmount();
    setQuery({ isError: true });
    const errorView = render(<AdminUsersPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("unavailable");
    errorView.unmount();
    setQuery({ data: { total: 0, items: [] } });
    render(<AdminUsersPage />);
    expect(screen.getByText("No learners found")).toBeInTheDocument();
  });
  it("renders saved learner statistics", () => {
    setQuery({ data: { total: 1, items: [learner] } });
    render(<AdminUsersPage />);
    expect(screen.getByText("Alice Perera")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });
});
