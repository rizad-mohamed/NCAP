import { useInterfaceText } from "@/lib/i18n";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Timer, XCircle, Target } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLink, PageCrumbs } from "@/components/layout/AppShell";
import {
  EmptyState,
  PageHeader,
  ProgressMeter,
  SectionHeading,
  PageSkeleton,
} from "@/components/common/primitives";
import { dashboardButton } from "@/components/common/dashboard-primitives";
import { cn } from "@/lib/utils";
import { useQuizCatalogue, useQuizHistory, unwrapQuiz } from "@/services/quiz-hooks";
import {
  beginQuizAttempt,
  answerQuizQuestion,
  finishQuizAttempt,
  readQuizAttempt,
  getQuizEligibility,
} from "@/quiz.functions";
import { remainingSeconds, type ServerQuizAttempt } from "@/domain/quiz";
import { useRepository } from "@/services/repository-provider";
import { useRepositoryList } from "@/services/query-hooks";

const primary = dashboardButton.primary;
const outline = dashboardButton.secondary;
function Message({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className="rounded-xl border bg-white p-6 text-sm">
      {children}
    </div>
  );
}
export function QuizzesPage() {
  const uiText = useInterfaceText();

  const catalogue = useQuizCatalogue();
  const history = useQuizHistory();
  const repository = useRepository();
  const modules = useRepositoryList(repository, "modules").data ?? [];
  if (catalogue.isPending) return <PageSkeleton label={uiText("Loading quizzes…")} />;
  if (catalogue.error) return <Message>{catalogue.error.message}</Message>;
  return (
    <div className="container-ncap max-w-7xl py-2">
      <PageHeader
        eyebrow={uiText("Knowledge checks")}
        title={uiText("Test what you can apply")}
        description={uiText(
          "Choose a published assessment. Your attempts and results are saved to your account.",
        )}
      />
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {catalogue.data.map((quiz) => {
          const mine = (history.data ?? []).filter(
            (a) => a.quizId === quiz.id && a.scorePercent !== null,
          );
          const best = Math.max(0, ...mine.map((a) => a.scorePercent ?? 0));
          return (
            <article
              key={quiz.id}
              className="interactive-card flex min-h-[310px] flex-col rounded-xl border bg-white p-6"
            >
              <div className="flex items-center justify-between">
                <span className="meta text-violet">{quiz.topic}</span>
                <span className="rounded-md bg-muted px-2 py-1 text-xs">{quiz.difficulty}</span>
              </div>
              <h2 className="mt-6 text-2xl font-semibold">{quiz.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{quiz.description}</p>
              <div className="mt-5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>
                  {quiz.questionCount} {uiText("questions")}
                </span>
                <span>
                  · {Math.ceil(quiz.durationSeconds / 60)} {uiText("min")}
                </span>
                <span>· {modules.find((m) => m.id === quiz.moduleId)?.title ?? "Module"}</span>
              </div>
              <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-7">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {mine.length ? "Best score" : "Attempt status"}
                  </p>
                  <p className="mt-1 font-mono text-xl font-bold">
                    {mine.length ? `${best}%` : "Not started"}
                  </p>
                </div>
                {quiz.availableQuestions >= quiz.questionCount ? (
                  <AppLink href={`/quizzes/${quiz.id}`} className={primary}>
                    {mine.length ? "Try again" : "View quiz"} <ArrowRight />
                  </AppLink>
                ) : (
                  <span className="rounded-lg bg-muted px-4 py-3 text-sm font-semibold text-muted-foreground">
                    {uiText("Awaiting questions")}{" "}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {!catalogue.data.length && (
        <div className="mt-8">
          <EmptyState
            icon={<Target />}
            title={uiText("No quizzes available")}
            description={uiText("Published assessments will appear here.")}
          />
        </div>
      )}
    </div>
  );
}
export function QuizInstructionsPage({ quizId }: { quizId: string }) {
  const uiText = useInterfaceText();

  const catalogue = useQuizCatalogue();
  const history = useQuizHistory(quizId);
  const quiz = catalogue.data?.find((item) => item.id === quizId);
  if (catalogue.isPending) return <PageSkeleton label={uiText("Loading quiz…")} />;
  if (!quiz) return <Message>{uiText("Quiz unavailable.")}</Message>;
  const completed = (history.data ?? []).filter((attempt) => attempt.status !== "in_progress");
  const active = (history.data ?? []).find((attempt) => attempt.status === "in_progress");
  const limitReached = quiz.maxAttempts !== null && completed.length >= quiz.maxAttempts && !active;
  const cooldown =
    !active &&
    completed[0]?.completedAt &&
    Date.parse(completed[0].completedAt) + quiz.cooldownSeconds * 1000 > Date.now();
  return (
    <div className="container-ncap max-w-4xl py-2">
      <PageCrumbs items={[{ label: "Quizzes", href: "/quizzes" }, { label: quiz.title }]} />
      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b bg-primary-soft p-8 md:p-12">
          <h1 className="text-4xl font-semibold">{quiz.title}</h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{quiz.description}</p>
        </div>
        <div className="grid gap-8 p-6 md:grid-cols-[1fr_280px] md:p-10">
          <div>
            <h2 className="text-xl font-semibold">{uiText("Before you begin")}</h2>
            <ul className="mt-5 grid gap-4 text-sm">
              <li>
                {quiz.questionCount} {uiText("questions selected from the published question bank")}
              </li>
              <li>
                {Math.ceil(quiz.durationSeconds / 60)}{" "}
                {uiText("minute timer, enforced by the server")}
              </li>
              <li>
                {quiz.passingPercent}
                {uiText("% passing score;")} {quiz.eligibilityPercent}
                {uiText("% quiz threshold for certificate eligibility")}{" "}
              </li>
              <li>{uiText("Submit each answer to see immediate feedback")}</li>
            </ul>
            {quiz.instructions && (
              <p className="mt-6 rounded-lg bg-muted p-4 text-sm">{quiz.instructions}</p>
            )}
            {completed.length > 0 && (
              <div className="mt-6">
                <SectionHeading title={uiText("Attempt history")} />
                <ul className="mt-3 grid gap-2 text-sm">
                  {completed.map((a) => (
                    <li key={a.id} className="rounded-lg border p-3">
                      {uiText("Attempt")} {a.attemptNumber}: {a.scorePercent}% ·{" "}
                      {a.passed ? "Passed" : "Keep practicing"} ·{" "}
                      {a.completedAt && new Date(a.completedAt).toLocaleString()}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <aside className="rounded-xl bg-primary p-6 text-white">
            <p className="meta text-white/60">{uiText("Ready?")}</p>
            <p className="mt-4 text-sm text-white/70">
              {uiText(
                "Question order is randomized once and remains stable if you resume on another device.",
              )}{" "}
            </p>
            {quiz.availableQuestions < quiz.questionCount ? (
              <p className="mt-7 rounded-lg bg-white/10 p-4 text-sm">
                {uiText("This assessment needs more published questions.")}{" "}
              </p>
            ) : limitReached ? (
              <p className="mt-7 rounded-lg bg-white/10 p-4 text-sm">
                {uiText("Maximum attempts reached.")}
              </p>
            ) : cooldown ? (
              <p className="mt-7 rounded-lg bg-white/10 p-4 text-sm">
                {uiText("Retake cooldown is active.")}
              </p>
            ) : (
              <AppLink
                href={`/quizzes/${quiz.id}/run`}
                className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-white font-semibold text-primary"
              >
                {active ? "Resume quiz" : "Start quiz"} <ArrowRight />
              </AppLink>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
export function QuizRunnerPage({ quizId }: { quizId: string }) {
  const uiText = useInterfaceText();

  const navigate = useNavigate();
  const client = useQueryClient();
  const attemptQuery = useQuery({
    queryKey: ["quiz", "active", quizId],
    queryFn: () => unwrapQuiz<ServerQuizAttempt>(beginQuizAttempt({ data: quizId })),
    retry: false,
    staleTime: Infinity,
  });
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(0);
  const base = useRef({ local: Date.now(), server: new Date().toISOString() });
  const initialized = useRef<string | null>(null);
  const attempt = attemptQuery.data;
  useEffect(() => {
    if (attempt) base.current = { local: Date.now(), server: attempt.serverNow };
  }, [attempt]);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!attempt || initialized.current === attempt.id || attempt.status !== "in_progress") return;
    initialized.current = attempt.id;
    const first = attempt.questions.findIndex((q) => !q.selectedOptionId);
    if (first >= 0) setIndex(first);
  }, [attempt]);
  const remaining = attempt
    ? remainingSeconds(
        attempt.deadlineAt,
        base.current.server,
        (clock || Date.now()) - base.current.local,
      )
    : 0;
  useEffect(() => {
    if (!attempt || attempt.status !== "in_progress" || remaining > 0 || busy) return;
    setBusy(true);
    void unwrapQuiz<ServerQuizAttempt>(finishQuizAttempt({ data: attempt.id }))
      .then((result) => {
        client.setQueryData(["quiz", "active", quizId], result);
        void client.invalidateQueries({ queryKey: ["quiz", "history"] });
        void navigate({ to: `/quizzes/${quizId}/results` as never });
      })
      .catch((error) => {
        toast.error(error.message);
        setBusy(false);
      });
  }, [remaining, attempt, busy, client, navigate, quizId]);
  if (attemptQuery.isPending) return <PageSkeleton label={uiText("Preparing your quiz…")} />;
  if (attemptQuery.error)
    return (
      <Message>
        {attemptQuery.error.message}{" "}
        <AppLink href={`/quizzes/${quizId}`} className="underline">
          {uiText("Back to quiz")}{" "}
        </AppLink>
      </Message>
    );
  if (!attempt) return <Message>{uiText("Attempt unavailable.")}</Message>;
  if (attempt.status !== "in_progress")
    return (
      <Message>
        {uiText("Attempt complete.")}{" "}
        <AppLink href={`/quizzes/${quizId}/results`} className="underline">
          {uiText("View results")}{" "}
        </AppLink>
      </Message>
    );
  const current = attempt.questions[index];
  if (!current) return <Message>{uiText("Question unavailable.")}</Message>;
  const chosen = current.selectedOptionId ?? selected;
  const submitted = !!current.selectedOptionId;
  async function submitAnswer() {
    if (!attempt || !current || !selected || busy) return;
    setBusy(true);
    try {
      const next = await unwrapQuiz<ServerQuizAttempt>(
        answerQuizQuestion({
          data: { target: attempt.id, question: current.id, optionId: selected },
        }),
      );
      client.setQueryData(["quiz", "active", quizId], next);
      setSelected(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Answer could not be saved.");
    } finally {
      setBusy(false);
    }
  }
  async function advance() {
    if (!attempt || busy) return;
    if (index < attempt.questions.length - 1) {
      setIndex(index + 1);
      setSelected(null);
      return;
    }
    setBusy(true);
    try {
      const done = await unwrapQuiz<ServerQuizAttempt>(finishQuizAttempt({ data: attempt.id }));
      client.setQueryData(["quiz", "active", quizId], done);
      await client.invalidateQueries({ queryKey: ["quiz", "history"] });
      void navigate({ to: `/quizzes/${quizId}/results` as never });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Quiz could not be submitted.");
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-4xl py-2">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="meta text-violet">
            {uiText("Quiz attempt")} {attempt.attemptNumber}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {uiText("Question")} {index + 1} {uiText("of")} {attempt.questions.length} ·{" "}
            {attempt.questions.filter((q) => !q.selectedOptionId).length}{" "}
            {uiText("unanswered")}{" "}
          </p>
        </div>
        <div
          role="timer"
          aria-label={`${Math.floor(remaining / 60)} minutes ${remaining % 60} seconds remaining`}
          className={cn(
            "flex min-h-11 items-center gap-2 rounded-lg border bg-white px-4 font-mono font-bold",
            remaining <= 60 && "border-destructive bg-destructive-soft text-destructive",
          )}
        >
          <Timer className="size-5" />
          {String(Math.floor(remaining / 60)).padStart(2, "0")}:
          {String(remaining % 60).padStart(2, "0")}
        </div>
      </div>
      <ProgressMeter
        value={(index / attempt.questions.length) * 100}
        label={uiText("Quiz progress")}
      />
      <section className="mt-6 rounded-xl border bg-white p-6 md:p-10">
        <span className="meta text-muted-foreground">
          {current.topic} · {current.difficulty}
        </span>
        <h1 className="mt-4 text-2xl font-semibold md:text-3xl">{current.prompt}</h1>
        <fieldset className="mt-8 grid gap-3">
          <legend className="sr-only">{uiText("Choose one answer")}</legend>
          {current.options.map((option, i) => {
            const correct = submitted && option.id === current.correctOptionId;
            const wrong = submitted && chosen === option.id && !correct;
            return (
              <label
                key={option.id}
                className={cn(
                  "flex min-h-14 cursor-pointer items-center gap-4 rounded-lg border p-4 text-sm hover:border-violet",
                  chosen === option.id && "border-violet bg-violet-soft",
                  correct && "border-success bg-success-soft",
                  wrong && "border-destructive bg-destructive-soft",
                )}
              >
                <input
                  type="radio"
                  name="answer"
                  checked={chosen === option.id}
                  onChange={() => setSelected(option.id)}
                  disabled={submitted || busy}
                  className="size-4 accent-violet"
                />
                <span className="grid size-7 shrink-0 place-items-center rounded-md border bg-white font-mono text-xs">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="font-medium">{option.text}</span>
                {correct && <CheckCircle2 className="ml-auto size-5 text-success" />}
                {wrong && <XCircle className="ml-auto size-5 text-destructive" />}
              </label>
            );
          })}
        </fieldset>
        {submitted && (
          <div
            aria-live="polite"
            className={cn(
              "mt-6 rounded-xl p-5",
              chosen === current.correctOptionId ? "bg-success-soft" : "bg-destructive-soft",
            )}
          >
            <h2 className="font-semibold">
              {chosen === current.correctOptionId ? "Correct" : "Incorrect"}
            </h2>
            {chosen !== current.correctOptionId && (
              <p className="mt-1 text-sm">
                {uiText("Correct answer:")}{" "}
                <strong>
                  {current.options.find((o) => o.id === current.correctOptionId)?.text}
                </strong>
              </p>
            )}
            <p className="mt-2 text-sm">{current.explanation}</p>
          </div>
        )}
        <div className="mt-8 flex justify-end">
          {!submitted ? (
            <button
              onClick={() => void submitAnswer()}
              disabled={!selected || busy}
              className={primary}
            >
              {uiText("Submit answer")}{" "}
            </button>
          ) : (
            <button onClick={() => void advance()} disabled={busy} className={primary}>
              {index === attempt.questions.length - 1 ? "View results" : "Next question"}{" "}
              <ArrowRight />
            </button>
          )}
        </div>
      </section>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        {uiText(
          "Your answers are saved to your account and can be resumed until the server deadline.",
        )}{" "}
      </p>
    </div>
  );
}
export function QuizResultsPage({ quizId }: { quizId: string }) {
  const uiText = useInterfaceText();

  const history = useQuizHistory(quizId);
  const catalogue = useQuizCatalogue();
  const repository = useRepository();
  const modules = useRepositoryList(repository, "modules").data ?? [];
  const latest = history.data?.find((a) => a.status !== "in_progress");
  const result = useQuery({
    queryKey: ["quiz", "result", latest?.id],
    queryFn: () => unwrapQuiz<ServerQuizAttempt>(readQuizAttempt({ data: latest!.id })),
    enabled: !!latest?.id,
  });
  const attempt = result.data;
  const quiz = catalogue.data?.find((q) => q.id === quizId);
  const module = modules.find((m) => m.id === quiz?.moduleId);
  const eligibility = useQuery({
    queryKey: ["quiz", "eligibility", quizId],
    queryFn: () =>
      unwrapQuiz<{
        eligible: boolean;
        bestScore: number;
        completionPercent: number;
        threshold: number;
      }>(getQuizEligibility({ data: quizId })),
    enabled: !!quiz,
  });
  const best = eligibility.data?.bestScore ?? 0;
  const complete = eligibility.data?.completionPercent === 100;
  const eligible = eligibility.data?.eligible ?? false;
  const weakest = [...(attempt?.byTopic ?? [])].sort(
    (a, b) => a.correct / a.total - b.correct / b.total,
  )[0];
  const lessonList = useRepositoryList(repository, "lessons").data ?? [];
  const publishedLessons = lessonList.filter(
    (l) => l.moduleId === quiz?.moduleId && l.status === "Published",
  );
  const recommendation =
    publishedLessons.find((l) => l.topic === weakest?.topic) ?? publishedLessons[0];
  if (history.isPending || (latest && result.isPending))
    return <PageSkeleton label={uiText("Loading results…")} />;
  if (!attempt || !quiz || !module)
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={<Target />}
          title={uiText("No result available")}
          description={uiText("Complete this quiz to see your score and topic breakdown.")}
          action={
            <AppLink href={`/quizzes/${quizId}`} className={primary}>
              {uiText("View quiz instructions")}{" "}
            </AppLink>
          }
        />
      </div>
    );
  return (
    <div className="mx-auto max-w-5xl py-2">
      <div className="rounded-xl border bg-white p-6 md:p-10">
        <div className="grid items-center gap-8 md:grid-cols-[260px_1fr]">
          <div
            className={cn(
              "grid aspect-square place-items-center rounded-full border-[14px]",
              attempt.passed
                ? "border-success-soft bg-success-soft"
                : "border-destructive-soft bg-destructive-soft",
            )}
          >
            <div className="text-center">
              <p className="font-mono text-5xl font-bold">{attempt.scorePercent}%</p>
              <p className="mt-1 text-sm font-semibold">
                {attempt.correct} {uiText("of")} {attempt.total} {uiText("correct")}{" "}
              </p>
            </div>
          </div>
          <div>
            <p className="meta text-violet">{uiText("Quiz complete")}</p>
            <h1 className="mt-4 text-4xl font-semibold">
              {attempt.passed ? "You passed" : "Keep building the skill"}
            </h1>
            <p className="mt-3 text-muted-foreground">
              {uiText("Completed in")}{" "}
              {Math.floor(
                (Date.parse(attempt.completedAt ?? "") - Date.parse(attempt.startedAt)) / 60000,
              )}{" "}
              {uiText("minutes. Your result is saved to your account.")}{" "}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <AppLink href={`/quizzes/${quiz.id}`} className={primary}>
                {uiText("Try again")}{" "}
              </AppLink>
              <AppLink href="/dashboard" className={outline}>
                {uiText("Return to dashboard")}{" "}
              </AppLink>
            </div>
          </div>
        </div>
        <section className="mt-10 border-t pt-8">
          <SectionHeading title={uiText("Performance by topic")} />
          <div className="grid gap-3 sm:grid-cols-2">
            {(attempt.byTopic ?? []).map((t) => (
              <div key={t.topic} className="rounded-lg bg-muted p-4">
                <div className="mb-2 flex justify-between text-sm">
                  <strong>{t.topic}</strong>
                  <span className="font-mono">
                    {t.correct}/{t.total}
                  </span>
                </div>
                <ProgressMeter
                  value={Math.round((t.correct / t.total) * 100)}
                  label={`${t.topic} performance`}
                />
              </div>
            ))}
          </div>
        </section>
        <section
          className={cn(
            "mt-8 rounded-xl border p-6",
            eligible ? "border-success bg-success-soft" : "bg-primary-soft",
          )}
        >
          <h2 className="text-xl font-semibold">
            {eligible ? "Quiz threshold and module completion met" : "Certificate steps remaining"}
          </h2>
          <p className="mt-2 text-sm">
            {uiText("Complete the related module and reach")} {quiz.eligibilityPercent}
            {uiText("% on this quiz.")}{" "}
          </p>
          <ul className="mt-3 grid gap-1 text-sm">
            <li>
              {complete ? "✓" : "○"} {uiText("Module complete")}
            </li>
            <li>
              {best >= quiz.eligibilityPercent ? "✓" : "○"} {uiText("Best quiz score at least")}{" "}
              {quiz.eligibilityPercent}%
            </li>
          </ul>
        </section>
        {recommendation && (
          <section className="mt-8 rounded-xl border p-6">
            <p className="meta text-violet">{uiText("Recommended next lesson")}</p>
            <h2 className="mt-3 text-xl font-semibold">{recommendation.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {uiText("Review")} {weakest?.topic ?? module.topic}{" "}
              {uiText("to strengthen your lowest topic result.")}{" "}
            </p>
            <AppLink href={`/learn/lessons/${recommendation.id}`} className={cn(primary, "mt-5")}>
              {uiText("Open lesson")} <ArrowRight />
            </AppLink>
          </section>
        )}
      </div>
    </div>
  );
}
