import { confirmAction } from "@/components/common/ConfirmationPanel";
import { useInterfaceText } from "@/lib/i18n";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, ContentSkeleton } from "@/components/common/primitives";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { dashboardButton, dashboardField } from "@/components/common/dashboard-primitives";
import { useRepository } from "@/services/repository-provider";
import { useRepositoryList } from "@/services/query-hooks";
import {
  useAdminQuizQuestions,
  useInvalidateQuiz,
  useQuizCatalogue,
  unwrapQuiz,
} from "@/services/quiz-hooks";
import {
  deleteQuizDefinition,
  deleteQuizQuestion,
  saveQuizDefinition,
  saveQuizQuestion,
} from "@/quiz.functions";
import type { AdminQuizQuestion, QuizDefinition } from "@/domain/quiz";
import { quizDefinitionSchema, quizQuestionSchema } from "@/domain/quiz";

const primary = dashboardButton.primary;
const secondary = dashboardButton.secondary;
const field = dashboardField;
const blankQuiz = (moduleId: string): QuizDefinition => ({
  id: `q-${crypto.randomUUID()}`,
  moduleId,
  title: "",
  slug: "",
  description: "",
  instructions: "",
  topic: "",
  difficulty: "Beginner",
  durationSeconds: 600,
  passingPercent: 70,
  eligibilityPercent: 80,
  maxAttempts: null,
  cooldownSeconds: 0,
  questionCount: 10,
  status: "Draft",
  availableQuestions: 0,
});
const blankQuestion = (quiz: QuizDefinition): AdminQuizQuestion => ({
  id: `qn-${crypto.randomUUID()}`,
  quizId: quiz.id,
  prompt: "",
  topic: quiz.topic,
  difficulty: quiz.difficulty,
  order: 1,
  explanation: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  status: "Draft",
});
function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={field}
      />
    </label>
  );
}
export function AdminQuizPage() {
  const uiText = useInterfaceText();

  const catalogue = useQuizCatalogue(true);
  const questions = useAdminQuizQuestions();
  const invalidate = useInvalidateQuiz();
  const repository = useRepository();
  const modules = useRepositoryList(repository, "modules").data ?? [];
  const [chosen, setChosen] = useState<string | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<QuizDefinition | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<AdminQuizQuestion | null>(null);
  const [busy, setBusy] = useState(false);
  const questionScroll = useRef<HTMLDivElement>(null);
  const quizzes = catalogue.data ?? [];
  const selected = quizzes.find((q) => q.id === chosen) ?? quizzes[0];
  const shownQuestions = (questions.data ?? [])
    .filter((q) => q.quizId === selected?.id)
    .sort((a, b) => a.order - b.order);
  useEffect(() => {
    if (!chosen && catalogue.data?.[0]) setChosen(catalogue.data[0].id);
  }, [chosen, catalogue.data]);
  useEffect(() => {
    if (questionScroll.current) questionScroll.current.scrollTop = 0;
  }, [selected?.id]);
  async function saveDefinition(event: FormEvent) {
    event.preventDefault();
    if (!editingQuiz) return;
    const {
      availableQuestions: _count,
      createdAt: _created,
      updatedAt: _updated,
      ...payload
    } = editingQuiz;
    void _count;
    void _created;
    void _updated;
    const checked = quizDefinitionSchema.safeParse(payload);
    if (!checked.success) {
      toast.error(checked.error.issues[0]?.message ?? "Check the quiz fields.");
      return;
    }
    setBusy(true);
    try {
      const saved = await unwrapQuiz<QuizDefinition>(saveQuizDefinition({ data: checked.data }));
      await invalidate();
      setChosen(saved.id);
      setEditingQuiz(null);
      toast.success(uiText("Quiz saved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Quiz could not be saved.");
    } finally {
      setBusy(false);
    }
  }
  async function saveQuestion(event: FormEvent) {
    event.preventDefault();
    if (!editingQuestion) return;
    const checked = quizQuestionSchema.safeParse(editingQuestion);
    if (!checked.success) {
      toast.error(checked.error.issues[0]?.message ?? "Check the question.");
      return;
    }
    setBusy(true);
    try {
      await unwrapQuiz(saveQuizQuestion({ data: checked.data }));
      await invalidate();
      setEditingQuestion(null);
      toast.success(uiText("Question saved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Question could not be saved.");
    } finally {
      setBusy(false);
    }
  }
  async function toggleQuiz(quiz: QuizDefinition) {
    setBusy(true);
    try {
      const {
        availableQuestions: _count,
        createdAt: _created,
        updatedAt: _updated,
        ...payload
      } = quiz;
      void _count;
      void _created;
      void _updated;
      await unwrapQuiz(
        saveQuizDefinition({
          data: { ...payload, status: quiz.status === "Published" ? "Draft" : "Published" },
        }),
      );
      await invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Publication could not be changed.");
    } finally {
      setBusy(false);
    }
  }
  async function toggleQuestion(question: AdminQuizQuestion) {
    setBusy(true);
    try {
      await unwrapQuiz(
        saveQuizQuestion({
          data: { ...question, status: question.status === "Published" ? "Draft" : "Published" },
        }),
      );
      await invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Publication could not be changed.");
    } finally {
      setBusy(false);
    }
  }
  async function removeQuiz(quiz: QuizDefinition) {
    if (
      !(await confirmAction(
        `Delete ${quiz.title}? Quizzes with attempts must be unpublished instead.`,
      ))
    )
      return;
    setBusy(true);
    try {
      await unwrapQuiz(
        deleteQuizDefinition({ data: { target: quiz.id, expectedVersion: quiz.version! } }),
      );
      if (chosen === quiz.id) setChosen(null);
      await invalidate();
      toast.success(uiText("Quiz deleted"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Quiz could not be deleted.");
    } finally {
      setBusy(false);
    }
  }
  async function removeQuestion(question: AdminQuizQuestion) {
    if (
      !(await confirmAction(
        "Delete this question? Existing attempts keep their original snapshot.",
      ))
    )
      return;
    setBusy(true);
    try {
      await unwrapQuiz(
        deleteQuizQuestion({ data: { target: question.id, expectedVersion: question.version! } }),
      );
      await invalidate();
      toast.success(uiText("Question deleted"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Question could not be deleted.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container-ncap max-w-[1400px] py-2">
      <PageHeader
        eyebrow={uiText("Administration · Quizzes")}
        title={uiText("Quiz management")}
        description={uiText(
          "Manage assessments, published questions, answers, timing, scoring and retake rules.",
        )}
        actions={
          <button
            className={primary}
            onClick={() => setEditingQuiz(blankQuiz(modules[0]?.id ?? ""))}
            disabled={!modules.length}
          >
            <Plus /> {uiText("Add quiz")}{" "}
          </button>
        }
      />
      {(catalogue.error || questions.error) && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-destructive p-4 text-sm text-destructive"
        >
          {catalogue.error?.message ?? questions.error?.message}
        </p>
      )}
      <div className="quiz-manager">
        <section className="quiz-manager-panel">
          <div className="quiz-manager-heading flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{uiText("Quizzes")}</h2>
            <span className="rounded-md bg-muted px-2 py-1 text-xs tabular-nums">
              {catalogue.isPending ? "—" : quizzes.length}
            </span>
          </div>
          <div
            className="quiz-manager-scroll"
            role="region"
            tabIndex={0}
            aria-label={uiText("Quiz catalogue")}
          >
            {catalogue.isPending ? (
              <ContentSkeleton label={uiText("Loading quizzes…")} rows={3} />
            ) : (
              <div className="grid gap-2">
                {quizzes.map((quiz) => (
                  <button
                    key={quiz.id}
                    onClick={() => setChosen(quiz.id)}
                    aria-pressed={selected?.id === quiz.id}
                    className={`min-w-0 rounded-lg border p-3 text-left text-sm ${selected?.id === quiz.id ? "border-violet bg-violet-soft" : "hover:bg-muted"}`}
                  >
                    <strong className="block">{quiz.title}</strong>{" "}
                    <span className="mt-1 block text-muted-foreground">
                      {quiz.status} · {quiz.availableQuestions} {uiText("published questions")}{" "}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {!catalogue.isPending && !catalogue.isError && !quizzes.length && (
              <p className="mt-4 text-sm text-muted-foreground">{uiText("No quizzes yet.")}</p>
            )}
          </div>
        </section>
        <section className="quiz-manager-panel quiz-manager-detail">
          {selected ? (
            <>
              <div className="quiz-manager-heading">
                <div className="quiz-manager-summary grid gap-4">
                  <div className="min-w-0">
                    <h2 className="break-words text-2xl font-semibold">{selected.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{selected.description}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {selected.questionCount} {uiText("questions ·")}{" "}
                      {Math.ceil(selected.durationSeconds / 60)} {uiText("min · Pass")}{" "}
                      {selected.passingPercent}% · {selected.maxAttempts ?? "Unlimited"}{" "}
                      {uiText("attempts")}{" "}
                    </p>
                  </div>
                  <div className="quiz-question-actions max-w-sm">
                    <button className={secondary} onClick={() => setEditingQuiz(selected)}>
                      {uiText("Edit")}{" "}
                    </button>
                    <button
                      className={secondary}
                      disabled={busy}
                      onClick={() => void toggleQuiz(selected)}
                    >
                      {selected.status === "Published" ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      className={dashboardButton.icon}
                      disabled={busy}
                      onClick={() => void removeQuiz(selected)}
                      aria-label={uiText("Delete quiz")}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  <h3 className="text-lg font-semibold">
                    {uiText("Questions")}{" "}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      {questions.isPending ? "" : shownQuestions.length}
                    </span>
                  </h3>
                  <button
                    className={primary}
                    onClick={() =>
                      setEditingQuestion({
                        ...blankQuestion(selected),
                        order: shownQuestions.length + 1,
                      })
                    }
                  >
                    <Plus className="size-4" /> {uiText("Add question")}{" "}
                  </button>
                </div>
              </div>
              <div
                ref={questionScroll}
                className="quiz-manager-scroll"
                role="region"
                tabIndex={0}
                aria-label={uiText("Quiz questions")}
              >
                {questions.isPending && <ContentSkeleton label={uiText("Loading questions…")} />}
                {!questions.isPending && (
                  <div className="quiz-question-list">
                    {shownQuestions.map((question) => (
                      <article key={question.id} className="rounded-lg border p-4">
                        <div className="quiz-question-row">
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">
                              #{question.order} · {question.topic} · {question.difficulty} ·{" "}
                              {question.status}
                            </p>
                            <h4 className="mt-1 break-words font-semibold">{question.prompt}</h4>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {question.options.length} {uiText("answer choices")}{" "}
                            </p>
                          </div>
                          <div className="quiz-question-actions">
                            <button
                              className={secondary}
                              onClick={() => setEditingQuestion(question)}
                            >
                              {uiText("Edit")}{" "}
                            </button>
                            <button
                              className={secondary}
                              disabled={busy}
                              onClick={() => void toggleQuestion(question)}
                            >
                              {question.status === "Published" ? "Unpublish" : "Publish"}
                            </button>
                            <button
                              className={dashboardButton.icon}
                              disabled={busy}
                              onClick={() => void removeQuestion(question)}
                              aria-label={uiText("Delete question")}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                {!questions.isPending && !questions.isError && !shownQuestions.length && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    {uiText("No questions for this quiz.")}
                  </p>
                )}
              </div>
            </>
          ) : catalogue.isPending ? (
            <div className="p-5">
              <ContentSkeleton label={uiText("Loading quizzes…")} rows={3} />
            </div>
          ) : (
            <p className="p-5 text-sm text-muted-foreground">
              {uiText("Select or create a quiz.")}
            </p>
          )}
        </section>
      </div>
      {editingQuiz && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !busy) setEditingQuiz(null);
          }}
        >
          <DialogContent
            aria-label={uiText("Quiz editor")}
            aria-labelledby={undefined}
            aria-describedby={undefined}
            className="max-w-2xl"
          >
            <form onSubmit={(e) => void saveDefinition(e)} className="w-full">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">
                  {editingQuiz.version ? "Edit" : "Create"} {uiText("quiz")}{" "}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold sm:col-span-2">
                  {uiText("Title")}{" "}
                  <input
                    required
                    maxLength={160}
                    value={editingQuiz.title}
                    onChange={(e) =>
                      setEditingQuiz({
                        ...editingQuiz,
                        title: e.target.value,
                        slug: editingQuiz.version
                          ? editingQuiz.slug
                          : e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, "-")
                              .replace(/^-|-$/g, ""),
                      })
                    }
                    className={field}
                  />
                </label>
                <label className="text-sm font-semibold">
                  {uiText("Slug")}{" "}
                  <input
                    required
                    value={editingQuiz.slug}
                    onChange={(e) => setEditingQuiz({ ...editingQuiz, slug: e.target.value })}
                    className={field}
                  />
                </label>
                <label className="text-sm font-semibold">
                  {uiText("Module")}{" "}
                  <select
                    value={editingQuiz.moduleId}
                    onChange={(e) => setEditingQuiz({ ...editingQuiz, moduleId: e.target.value })}
                    className={field}
                  >
                    {modules.map((module) => (
                      <option key={module.id} value={module.id}>
                        {module.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold sm:col-span-2">
                  {uiText("Description")}{" "}
                  <textarea
                    required
                    value={editingQuiz.description}
                    onChange={(e) =>
                      setEditingQuiz({ ...editingQuiz, description: e.target.value })
                    }
                    className={field}
                  />
                </label>
                <label className="text-sm font-semibold sm:col-span-2">
                  {uiText("Instructions")}{" "}
                  <textarea
                    value={editingQuiz.instructions}
                    onChange={(e) =>
                      setEditingQuiz({ ...editingQuiz, instructions: e.target.value })
                    }
                    className={field}
                  />
                </label>
                <label className="text-sm font-semibold">
                  {uiText("Topic")}{" "}
                  <input
                    required
                    value={editingQuiz.topic}
                    onChange={(e) => setEditingQuiz({ ...editingQuiz, topic: e.target.value })}
                    className={field}
                  />
                </label>
                <label className="text-sm font-semibold">
                  {uiText("Difficulty")}{" "}
                  <select
                    value={editingQuiz.difficulty}
                    onChange={(e) =>
                      setEditingQuiz({
                        ...editingQuiz,
                        difficulty: e.target.value as QuizDefinition["difficulty"],
                      })
                    }
                    className={field}
                  >
                    <option>{uiText("Beginner")}</option>
                    <option>{uiText("Intermediate")}</option>
                    <option>{uiText("Advanced")}</option>
                  </select>
                </label>
                <NumberField
                  label={uiText("Duration (seconds)")}
                  value={editingQuiz.durationSeconds}
                  min={60}
                  max={7200}
                  onChange={(v) => setEditingQuiz({ ...editingQuiz, durationSeconds: v })}
                />
                <NumberField
                  label={uiText("Questions per attempt")}
                  value={editingQuiz.questionCount}
                  min={1}
                  max={100}
                  onChange={(v) => setEditingQuiz({ ...editingQuiz, questionCount: v })}
                />
                <NumberField
                  label={uiText("Passing score (%)")}
                  value={editingQuiz.passingPercent}
                  min={0}
                  max={100}
                  onChange={(v) => setEditingQuiz({ ...editingQuiz, passingPercent: v })}
                />
                <NumberField
                  label={uiText("Quiz eligibility score (%)")}
                  value={editingQuiz.eligibilityPercent}
                  min={0}
                  max={100}
                  onChange={(v) => setEditingQuiz({ ...editingQuiz, eligibilityPercent: v })}
                />
                <label className="text-sm font-semibold">
                  {uiText("Maximum attempts (blank for unlimited)")}{" "}
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={editingQuiz.maxAttempts ?? ""}
                    onChange={(e) =>
                      setEditingQuiz({
                        ...editingQuiz,
                        maxAttempts: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className={field}
                  />
                </label>
                <NumberField
                  label={uiText("Retake cooldown (seconds)")}
                  value={editingQuiz.cooldownSeconds}
                  min={0}
                  max={604800}
                  onChange={(v) => setEditingQuiz({ ...editingQuiz, cooldownSeconds: v })}
                />
                <label className="text-sm font-semibold">
                  {uiText("Status")}{" "}
                  <select
                    value={editingQuiz.status}
                    onChange={(e) =>
                      setEditingQuiz({
                        ...editingQuiz,
                        status: e.target.value as QuizDefinition["status"],
                      })
                    }
                    className={field}
                  >
                    <option>{uiText("Draft")}</option>
                    <option>{uiText("Published")}</option>
                  </select>
                </label>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" className={secondary} onClick={() => setEditingQuiz(null)}>
                  {uiText("Cancel")}{" "}
                </button>
                <button className={primary} disabled={busy}>
                  {uiText("Save quiz")}{" "}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {editingQuestion && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !busy) setEditingQuestion(null);
          }}
        >
          <DialogContent
            aria-label={uiText("Question editor")}
            aria-labelledby={undefined}
            aria-describedby={undefined}
            className="max-w-2xl"
          >
            <form onSubmit={(e) => void saveQuestion(e)} className="w-full">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">
                  {editingQuestion.version ? "Edit" : "Create"} {uiText("question")}{" "}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-5 grid gap-4">
                <label className="text-sm font-semibold">
                  {uiText("Question")}{" "}
                  <textarea
                    required
                    value={editingQuestion.prompt}
                    onChange={(e) =>
                      setEditingQuestion({ ...editingQuestion, prompt: e.target.value })
                    }
                    className={field}
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="text-sm font-semibold">
                    {uiText("Topic")}{" "}
                    <input
                      required
                      value={editingQuestion.topic}
                      onChange={(e) =>
                        setEditingQuestion({ ...editingQuestion, topic: e.target.value })
                      }
                      className={field}
                    />
                  </label>
                  <label className="text-sm font-semibold">
                    {uiText("Difficulty")}{" "}
                    <select
                      value={editingQuestion.difficulty}
                      onChange={(e) =>
                        setEditingQuestion({
                          ...editingQuestion,
                          difficulty: e.target.value as AdminQuizQuestion["difficulty"],
                        })
                      }
                      className={field}
                    >
                      <option>{uiText("Beginner")}</option>
                      <option>{uiText("Intermediate")}</option>
                      <option>{uiText("Advanced")}</option>
                    </select>
                  </label>
                  <NumberField
                    label={uiText("Order")}
                    value={editingQuestion.order}
                    min={1}
                    max={10000}
                    onChange={(v) => setEditingQuestion({ ...editingQuestion, order: v })}
                  />
                </div>
                <fieldset>
                  <legend className="text-sm font-semibold">
                    {uiText("Answer choices · Select the correct answer")}{" "}
                  </legend>
                  <div className="mt-2 grid gap-2">
                    {editingQuestion.options.map((option, i) => (
                      <label key={i} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correct"
                          checked={editingQuestion.correctIndex === i}
                          onChange={() =>
                            setEditingQuestion({ ...editingQuestion, correctIndex: i })
                          }
                        />
                        <span className="sr-only">
                          {uiText("Correct answer")} {i + 1}
                        </span>
                        <input
                          required
                          value={option}
                          onChange={(e) =>
                            setEditingQuestion({
                              ...editingQuestion,
                              options: editingQuestion.options.map((o, n) =>
                                n === i ? e.target.value : o,
                              ),
                            })
                          }
                          className={field}
                        />
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={secondary}
                    disabled={editingQuestion.options.length >= 10}
                    onClick={() =>
                      setEditingQuestion({
                        ...editingQuestion,
                        options: [...editingQuestion.options, ""],
                      })
                    }
                  >
                    {uiText("Add answer")}{" "}
                  </button>
                  {editingQuestion.options.length > 2 && (
                    <button
                      type="button"
                      className={secondary}
                      onClick={() =>
                        setEditingQuestion({
                          ...editingQuestion,
                          options: editingQuestion.options.slice(0, -1),
                          correctIndex: Math.min(
                            editingQuestion.correctIndex,
                            editingQuestion.options.length - 2,
                          ),
                        })
                      }
                    >
                      {uiText("Remove last answer")}{" "}
                    </button>
                  )}
                </fieldset>
                <label className="text-sm font-semibold">
                  {uiText("Explanation")}{" "}
                  <textarea
                    required
                    value={editingQuestion.explanation}
                    onChange={(e) =>
                      setEditingQuestion({ ...editingQuestion, explanation: e.target.value })
                    }
                    className={field}
                  />
                </label>
                <label className="text-sm font-semibold">
                  {uiText("Status")}{" "}
                  <select
                    value={editingQuestion.status}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        status: e.target.value as AdminQuizQuestion["status"],
                      })
                    }
                    className={field}
                  >
                    <option>{uiText("Draft")}</option>
                    <option>{uiText("Published")}</option>
                  </select>
                </label>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  className={secondary}
                  onClick={() => setEditingQuestion(null)}
                >
                  {uiText("Cancel")}{" "}
                </button>
                <button className={primary} disabled={busy}>
                  {uiText("Save question")}{" "}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
