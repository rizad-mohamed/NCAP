import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AdminQuizPage } from "./AdminQuizPage";

const state = vi.hoisted(() => ({ pending: false, questionsPending: false }));
vi.mock("@/services/repository-provider", () => ({ useRepository: () => ({}) }));
vi.mock("@/services/query-hooks", () => ({
  useRepositoryList: () => ({ data: [{ id: "module", title: "Safety" }] }),
}));
vi.mock("@/services/quiz-hooks", () => ({
  useQuizCatalogue: () => ({
    data: state.pending
      ? undefined
      : [
          {
            id: "one",
            title: "Passwords",
            description: "Protect your accounts.",
            questionCount: 1,
            durationSeconds: 600,
            passingPercent: 70,
            status: "Published",
            availableQuestions: 1,
          },
          {
            id: "two",
            title: "Phishing",
            description: "Check suspicious messages.",
            questionCount: 1,
            durationSeconds: 600,
            passingPercent: 70,
            status: "Published",
            availableQuestions: 1,
          },
        ],
    isPending: state.pending,
  }),
  useAdminQuizQuestions: () => ({
    data: state.questionsPending
      ? undefined
      : [
          {
            id: "question-one",
            quizId: "one",
            order: 1,
            prompt: "Which passphrase is strongest?",
            topic: "Passwords",
            difficulty: "Beginner",
            status: "Published",
            options: ["One", "Two"],
          },
          {
            id: "question-two",
            quizId: "two",
            order: 1,
            prompt:
              "A long message asks you to visit a familiar looking login page and disclose your account recovery details. What should you check before responding?",
            topic: "Phishing",
            difficulty: "Beginner",
            status: "Published",
            options: ["One", "Two"],
          },
        ],
    isPending: state.questionsPending,
  }),
  useInvalidateQuiz: () => vi.fn(),
  unwrapQuiz: vi.fn(),
}));
beforeEach(() => {
  state.pending = false;
  state.questionsPending = false;
});
afterEach(cleanup);

it("provides separate keyboard reachable catalogue and question scroll regions", () => {
  render(<AdminQuizPage />);
  expect(screen.getByRole("region", { name: "Quiz catalogue" })).toHaveAttribute("tabindex", "0");
  const questions = screen.getByRole("region", { name: "Quiz questions" });
  expect(questions).toHaveAttribute("tabindex", "0");
  expect(
    within(questions).getByRole("heading", { name: "Which passphrase is strongest?" }),
  ).toBeInTheDocument();
  expect(within(questions).getByRole("button", { name: "Edit" })).toBeInTheDocument();
  const catalogue = screen.getByRole("region", { name: "Quiz catalogue" });
  catalogue.scrollTop = 80;
  questions.scrollTop = 240;
  fireEvent.click(
    within(screen.getByRole("region", { name: "Quiz catalogue" })).getByRole("button", {
      name: /Phishing/,
    }),
  );
  expect(within(questions).queryByText("Which passphrase is strongest?")).not.toBeInTheDocument();
  expect(within(questions).getByRole("heading", { name: /A long message/ })).toBeInTheDocument();
  expect(within(questions).getByRole("button", { name: "Unpublish" })).toBeInTheDocument();
  expect(within(questions).getByRole("button", { name: "Delete question" })).toBeInTheDocument();
  expect(questions.scrollTop).toBe(0);
  expect(catalogue.scrollTop).toBe(80);
});

it("does not flash empty quiz or question messages while either request is pending", () => {
  state.pending = true;
  const view = render(<AdminQuizPage />);
  expect(screen.queryByText("No quizzes yet.")).not.toBeInTheDocument();
  expect(screen.queryByText("Select or create a quiz.")).not.toBeInTheDocument();
  state.pending = false;
  state.questionsPending = true;
  view.rerender(<AdminQuizPage />);
  expect(
    within(screen.getByRole("region", { name: "Quiz questions" })).getByRole("status"),
  ).toHaveTextContent("Loading questions");
  expect(screen.queryByText("No questions for this quiz.")).not.toBeInTheDocument();
});
