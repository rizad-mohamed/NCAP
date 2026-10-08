import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminDashboardPage } from "./AdminPages";
import { AdminReportsPage } from "./DashboardSections";
import { DashboardPage } from "@/features/learning/LearningPages";
import { modules, lessons } from "@/data/learning";

const state = vi.hoisted(() => ({
  dashboardPending: false,
  quizPending: false,
  awarenessPending: false,
  reportPending: false,
  modulePending: false,
  historyPending: false,
  error: false,
  retry: vi.fn(),
}));
vi.mock("@/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "admin", role: "super_admin" } }),
}));
vi.mock("@/components/layout/AppShell", () => ({
  AppLink: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
  PageCrumbs: () => null,
}));
vi.mock("@/services/repository-provider", () => ({ useRepository: () => ({}) }));
vi.mock("@/services/query-hooks", () => ({
  useRepositoryList: () => ({ data: modules, isPending: state.modulePending }),
  useSaveRepositoryRecord: vi.fn(),
  useRemoveRepositoryRecord: vi.fn(),
}));
vi.mock("@/services/dashboard-hooks", () => ({
  unwrapDashboard: vi.fn(),
  useAdminDashboard: () => ({
    data: state.dashboardPending
      ? undefined
      : {
          users: 42,
          activeLearners: 7,
          publishedLessons: 9,
          completedLessons: 12,
          recentActivity: [],
          topicEngagement: [],
        },
    isPending: state.dashboardPending,
    isError: state.error,
    refetch: state.retry,
  }),
  useLearnerDashboard: () => ({
    data: state.dashboardPending
      ? undefined
      : {
          statistics: { overall: 25, completedCount: 2, totalLessons: 10, moduleProgress: [] },
          learningSeconds: 3600,
          badges: [],
          activities: [],
          announcements: [],
        },
    isPending: state.dashboardPending,
    isError: state.error,
  }),
  useDashboardAnnouncements: vi.fn(),
}));
vi.mock("@/services/quiz-hooks", () => ({
  useAdminQuizSummary: () => ({
    data: state.quizPending ? undefined : { attempts: 30, averageScore: 81, trend: [] },
    isPending: state.quizPending,
    isError: false,
    refetch: state.retry,
  }),
  useQuizHistory: () => ({ data: [], isLoading: state.historyPending, isError: false }),
  useQuizCatalogue: () => ({ data: [], isPending: false }),
}));
vi.mock("@/services/awareness-hooks", () => ({
  useAwarenessSummary: () => ({
    data: state.awarenessPending ? undefined : { kinds: { articles: { count: 16 } } },
    isPending: state.awarenessPending,
    isError: false,
    refetch: state.retry,
  }),
}));
vi.mock("@/services/report-hooks", () => ({
  useContentReport: () => ({ data: undefined, isPending: state.reportPending, isError: false }),
  exportFilteredReport: vi.fn(),
}));
vi.mock("@/state/ncap-store", () => ({
  useNcap: () => ({
    session: { name: "Preview Learner" },
    lessons,
    modules,
    completedLessons: [],
    learningPending: false,
    learningError: null,
  }),
}));
vi.mock("./AdminCharts", () => ({
  AdminDashboardCharts: () => <div>Activity charts</div>,
  AdminReportCharts: () => <div>Report charts</div>,
}));
beforeEach(() => {
  Object.assign(state, {
    dashboardPending: false,
    quizPending: false,
    awarenessPending: false,
    reportPending: false,
    modulePending: false,
    historyPending: false,
    error: false,
  });
  state.retry.mockClear();
});
afterEach(cleanup);

describe("dashboard loading states", () => {
  it.each(["dashboardPending", "quizPending", "awarenessPending"] as const)(
    "replaces metrics while %s is pending",
    (key) => {
      state[key] = true;
      const view = render(<AdminDashboardPage />);
      expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("Loading administration metrics");
      expect(screen.queryByText("Total learners")).not.toBeInTheDocument();
      expect(screen.queryByText("0%")).not.toBeInTheDocument();
      state[key] = false;
      view.rerender(<AdminDashboardPage />);
      expect(screen.getByText("42")).toBeInTheDocument();
      expect(screen.getByText("81%")).toBeInTheDocument();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    },
  );
  it("shows recovery instead of invented zero metrics on error", () => {
    state.error = true;
    render(<AdminDashboardPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("Administration metrics are unavailable");
    expect(screen.queryByText("Total learners")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(state.retry).toHaveBeenCalledTimes(3);
  });
  it("does not show report metrics, charts or an empty attempt result before the report arrives", () => {
    state.reportPending = true;
    render(<AdminReportsPage />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading report");
    expect(screen.queryByText("Average score")).not.toBeInTheDocument();
    expect(screen.queryByText("Report charts")).not.toBeInTheDocument();
    expect(screen.queryByText("No quiz attempts match")).not.toBeInTheDocument();
  });
  it.each(["modulePending", "historyPending"] as const)(
    "keeps the learner dashboard loading until %s resolves",
    (key) => {
      state[key] = true;
      render(<DashboardPage />);
      expect(screen.getByRole("status")).toHaveTextContent("Loading your dashboard");
      expect(screen.queryByText("No lessons are currently published")).not.toBeInTheDocument();
      expect(screen.queryByText("0%")).not.toBeInTheDocument();
    },
  );
});
