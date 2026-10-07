import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LearningCataloguePage } from "./LearningPages";
import { QuizzesPage } from "./QuizPages";

const state = vi.hoisted(() => ({
  modulePending: false,
  quizPending: false,
  historyPending: false,
  historyError: false,
  bookmark: vi.fn(),
}));
const modules = [
  {
    id: "module-one",
    title: "Password habits",
    description: "Protect your account.",
    topic: "Passwords",
    difficulty: "Beginner",
    status: "Published",
    minutes: 5,
  },
  {
    id: "module-two",
    title: "Spot phishing",
    description: "Check links before responding.",
    topic: "Phishing",
    difficulty: "Intermediate",
    status: "Published",
    minutes: 10,
  },
];
vi.mock("@/services/repository-provider", () => ({ useRepository: () => ({}) }));
vi.mock("@/services/query-hooks", () => ({
  useRepositoryList: () => ({
    data: state.modulePending ? undefined : modules,
    isPending: state.modulePending,
  }),
}));
vi.mock("@/components/layout/AppShell", () => ({
  AppLink: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
  PageCrumbs: () => null,
}));
vi.mock("@/state/ncap-store", () => ({
  useNcap: () => ({
    completedLessons: ["lesson-one"],
    bookmarks: [],
    toggleBookmark: state.bookmark,
    lessons: [
      { id: "lesson-one", moduleId: "module-one", status: "Published" },
      { id: "lesson-two", moduleId: "module-two", status: "Published" },
    ],
    learningPending: false,
  }),
}));
vi.mock("@/services/quiz-hooks", () => ({
  useQuizCatalogue: () => ({
    isPending: state.quizPending,
    data: state.quizPending
      ? undefined
      : [
          {
            id: "quiz-one",
            title: "Password check",
            topic: "Passwords",
            difficulty: "Beginner",
            description: "Test account safety.",
            moduleId: "module-one",
            questionCount: 5,
            availableQuestions: 5,
            durationSeconds: 300,
          },
          {
            id: "quiz-two",
            title: "Phishing check",
            topic: "Phishing",
            difficulty: "Intermediate",
            description: "Test message safety.",
            moduleId: "module-two",
            questionCount: 5,
            availableQuestions: 2,
            durationSeconds: 300,
          },
        ],
  }),
  useQuizHistory: () => ({
    isLoading: state.historyPending,
    isError: state.historyError,
    data:
      state.historyPending || state.historyError
        ? undefined
        : [{ quizId: "quiz-one", scorePercent: 80 }],
  }),
}));
beforeEach(() => {
  Object.assign(state, {
    modulePending: false,
    quizPending: false,
    historyPending: false,
    historyError: false,
  });
  state.bookmark.mockReset().mockResolvedValue(true);
});
afterEach(cleanup);

it("keeps module filters, saved progress and bookmark actions connected to the original records", () => {
  render(<LearningCataloguePage />);
  fireEvent.change(screen.getByRole("combobox", { name: "Module filters" }), {
    target: { value: "Completed" },
  });
  expect(screen.getByRole("heading", { name: "Password habits" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Spot phishing" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Continue module" })).toHaveAttribute(
    "href",
    "/learn/modules/module-one",
  );
  fireEvent.click(screen.getByRole("button", { name: "Bookmark Password habits" }));
  expect(state.bookmark).toHaveBeenCalledWith("lesson-one");
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  expect(screen.getByRole("heading", { name: "Spot phishing" })).toBeInTheDocument();
});
it("reserves module cards without reporting no matches before the module query resolves", () => {
  state.modulePending = true;
  render(<LearningCataloguePage />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading learning modules");
  expect(screen.queryByText("No modules match")).not.toBeInTheDocument();
});
it("filters quizzes by search and difficulty without changing question availability", () => {
  render(<QuizzesPage />);
  expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute(
    "href",
    "/quizzes/quiz-one",
  );
  expect(screen.getByText("Awaiting questions")).toBeInTheDocument();
  fireEvent.change(screen.getByRole("searchbox", { name: "Search quizzes" }), {
    target: { value: "phishing" },
  });
  fireEvent.change(screen.getByRole("combobox", { name: "Difficulty" }), {
    target: { value: "Beginner" },
  });
  expect(screen.getByText("No quizzes match")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  expect(screen.getAllByRole("article")).toHaveLength(2);
  expect(screen.getByText("Awaiting questions")).toBeInTheDocument();
});
it.each(["historyPending", "historyError"] as const)(
  "does not report Not started while %s",
  (key) => {
    state[key] = true;
    render(<QuizzesPage />);
    for (const card of screen.getAllByRole("article"))
      expect(within(card).queryByText("Not started")).not.toBeInTheDocument();
    if (key === "historyPending")
      expect(screen.getAllByLabelText("Loading attempt history")).toHaveLength(2);
    else expect(screen.getAllByText("History unavailable")).toHaveLength(2);
  },
);
