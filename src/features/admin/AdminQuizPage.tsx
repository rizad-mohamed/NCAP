import { useInterfaceText } from "@/lib/i18n";
import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2, Check, Edit3 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/primitives";
import { dashboardButton } from "@/components/common/dashboard-primitives";
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
const field = "mt-1 w-full rounded-lg border bg-white px-3 py-2";
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
  const quizzes = catalogue.data ?? [];
  const selected = quizzes.find((q) => q.id === chosen) ?? quizzes[0];
  const shownQuestions = (questions.data ?? [])
    .filter((q) => q.quizId === selected?.id)
    .sort((a, b) => a.order - b.order);
  useEffect(() => {
    if (!chosen && catalogue.data?.[0]) setChosen(catalogue.data[0].id);
  }, [chosen, catalogue.data]);
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
    if (!window.confirm(`Delete ${quiz.title}? Quizzes with attempts must be unpublished instead.`))
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
    if (!window.confirm("Delete this question? Existing attempts keep their original snapshot."))
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
      <div className="mt-7 grid gap-6 lg:grid-cols-[340px_1fr]">
        <section className="rounded-xl border bg-white p-5">
          <h2 className="text-lg font-semibold">{uiText("Quizzes")}</h2>
          <div className="mt-4 grid gap-2">
            {quizzes.map((quiz) => (
              <button
                key={quiz.id}
                onClick={() => setChosen(quiz.id)}
                className={`rounded-lg border p-4 text-left text-sm ${selected?.id === quiz.id ? "border-violet bg-violet-soft" : "hover:bg-muted"}`}
              >
                <strong className="block">{quiz.title}</strong>
                <span className="mt-1 block text-muted-foreground">
                  {quiz.status} · {quiz.availableQuestions} {uiText("published questions")}{" "}
                </span>
              </button>
            ))}
          </div>
          {!quizzes.length && (
            <p className="mt-4 text-sm text-muted-foreground">{uiText("No quizzes yet.")}</p>
          )}
        </section>
        <section className="rounded-xl border bg-white p-5">
          {selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold">{selected.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{selected.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {selected.questionCount} {uiText("questions ·")}{" "}
                    {Math.ceil(selected.durationSeconds / 60)} {uiText("min · Pass")}{" "}
                    {selected.passingPercent}% · {selected.maxAttempts ?? "Unlimited"}{" "}
                    {uiText("attempts")}{" "}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className={secondary} onClick={() => setEditingQuiz(selected)}>
                    <Edit3 className="size-4" /> {uiText("Edit")}{" "}
                  </button>
                  <button
                    className={secondary}
                    disabled={busy}
                    onClick={() => void toggleQuiz(selected)}
                  >
                    <Check className="size-4" />{" "}
                    {selected.status === "Published" ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    className={secondary}
                    disabled={busy}
                    onClick={() => void removeQuiz(selected)}
                    aria-label={uiText("Delete quiz")}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <div className="mt-8 flex items-center justify-between border-t pt-6">
                <h3 className="text-lg font-semibold">{uiText("Questions")}</h3>
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
              <div className="mt-4 grid gap-3">
                {shownQuestions.map((question) => (
                  <article key={question.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          #{question.order} · {question.topic} · {question.difficulty} ·{" "}
                          {question.status}
                        </p>
                        <h4 className="mt-1 font-semibold">{question.prompt}</h4>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {question.options.length} {uiText("answer choices")}{" "}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button className={secondary} onClick={() => setEditingQuestion(question)}>
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
                          className={secondary}
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
              {!shownQuestions.length && (
                <p className="mt-4 text-sm text-muted-foreground">
                  {uiText("No questions for this quiz.")}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{uiText("Select or create a quiz.")}</p>
          )}
        </section>
      </div>
      {editingQuiz && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={uiText("Quiz editor")}
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
        >
          <form
            onSubmit={(e) => void saveDefinition(e)}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-xl font-semibold">
              {editingQuiz.version ? "Edit" : "Create"} {uiText("quiz")}{" "}
            </h2>
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
                  onChange={(e) => setEditingQuiz({ ...editingQuiz, description: e.target.value })}
                  className={field}
                />
              </label>
              <label className="text-sm font-semibold sm:col-span-2">
                {uiText("Instructions")}{" "}
                <textarea
                  value={editingQuiz.instructions}
                  onChange={(e) => setEditingQuiz({ ...editingQuiz, instructions: e.target.value })}
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
        </div>
      )}
      {editingQuestion && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={uiText("Question editor")}
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
        >
          <form
            onSubmit={(e) => void saveQuestion(e)}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-xl font-semibold">
              {editingQuestion.version ? "Edit" : "Create"} {uiText("question")}{" "}
            </h2>
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
                        onChange={() => setEditingQuestion({ ...editingQuestion, correctIndex: i })}
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
              <button type="button" className={secondary} onClick={() => setEditingQuestion(null)}>
                {uiText("Cancel")}{" "}
              </button>
              <button className={primary} disabled={busy}>
                {uiText("Save question")}{" "}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
