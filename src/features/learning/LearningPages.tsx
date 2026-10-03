import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BadgeCheck,
  BookCheck,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Edit3,
  FileCheck2,
  Filter,
  Flame,
  GraduationCap,
  Lightbulb,
  LockKeyhole,
  PlayCircle,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  Trophy,
  UserRound,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { quizzes } from "@/data/quizzes";
import type { LanguageCode, LessonBlock, QuizAttempt, QuizQuestion, Topic } from "@/data/types";
import { NCAP_CONFIG } from "@/lib/config";
import { useNcap, useLearnerStats } from "@/state/ncap-store";
import { useI18n } from "@/lib/i18n";
import { calculateQuizResult } from "@/domain/rules";
import { AppLink, PageCrumbs } from "@/components/layout/AppShell";
import {
  DemoTag,
  EmptyState,
  PageHeader,
  ProgressMeter,
  SectionHeading,
  StatCard,
} from "@/components/common/primitives";
import { cn } from "@/lib/utils";
import { phoneSchema } from "@/domain/validation";
import { useRepository } from "@/services/repository-provider";
import { useRepositoryList } from "@/services/query-hooks";
import { dashboardButton } from "@/components/common/dashboard-primitives";
import { LessonVideoPlayer } from "@/components/learning/LessonVideoPlayer";
import { updateProfile as updateAccountProfile } from "@/auth/auth.functions";
import { useAuth } from "@/auth/AuthProvider";
import { useQuizCatalogue, useQuizHistory } from "@/services/quiz-hooks";
import { useLearnerDashboard } from "@/services/dashboard-hooks";
import { useCertificates } from "@/services/certificate-hooks";

const primary = dashboardButton.primary;
const outline = dashboardButton.secondary;
function useModules() {
  const repository = useRepository();
  return useRepositoryList(repository, "modules").data ?? [];
}
export function LearningCataloguePage() {
  const { completedLessons, bookmarks, toggleBookmark, lessons } = useNcap();
  const modules = useModules();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const cards = useMemo(
    () =>
      [...modules]
        .filter((module) => module.status === "Published")
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((m) => {
          const ls = lessons.filter((l) => l.moduleId === m.id && l.status === "Published");
          const done = ls.filter((l) => completedLessons.includes(l.id)).length;
          return {
            m,
            lessons: ls.length,
            done,
            progress: ls.length ? Math.round((done / ls.length) * 100) : 0,
          };
        })
        .filter((x) => {
          const text = `${x.m.title} ${x.m.description} ${x.m.topic}`.toLowerCase();
          const matchSearch = text.includes(search.toLowerCase());
          const matchFilter =
            filter === "All" ||
            filter === x.m.difficulty ||
            (filter === "Completed" && x.progress === 100) ||
            (filter === "In Progress" && x.progress > 0 && x.progress < 100);
          return matchSearch && matchFilter;
        }),
    [completedLessons, search, filter, lessons, modules],
  );
  return (
    <div className="container-ncap max-w-7xl py-2">
      <PageHeader
        eyebrow="Learning catalogue · English content"
        title="Build practical digital confidence"
        description={`${cards.length} published module${cards.length === 1 ? "" : "s"}, each made of short lessons and a related knowledge check.`}
        actions={
          <AppLink href="/learn/search" className={outline}>
            <Search />
            Search all learning
          </AppLink>
        }
      />
      <div className="mt-8 flex flex-col gap-3 rounded-xl border bg-white p-3 lg:flex-row">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
          <span className="sr-only">Search modules</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full rounded-lg border bg-background pl-10 pr-3"
            placeholder="Search modules or topics…"
          />
        </label>
        <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Module filters">
          {["All", "Beginner", "Intermediate", "Completed", "In Progress"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                "min-h-11 whitespace-nowrap rounded-lg border px-3 text-sm font-medium",
                filter === f && "border-primary bg-primary text-white",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      {cards.length ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cards.map(({ m, lessons: lessonCount, done, progress }) => (
            <article
              key={m.id}
              className="flex min-h-[350px] flex-col rounded-xl border bg-white p-6 hover:border-violet hover:shadow-raised"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="meta text-violet">{m.topic}</span>
                <button
                  className="grid size-11 place-items-center rounded-lg hover:bg-muted"
                  onClick={() => {
                    const first = lessons.find(
                      (l) => l.moduleId === m.id && l.status === "Published",
                    );
                    if (first) {
                      void toggleBookmark(first.id)
                        .then((added) =>
                          toast.success(added ? "First lesson bookmarked" : "Bookmark removed"),
                        )
                        .catch(() => undefined);
                    }
                  }}
                  aria-label={`${bookmarks.some((id) => lessons.find((l) => l.id === id)?.moduleId === m.id) ? "Remove" : "Bookmark"} ${m.title}`}
                >
                  <Bookmark
                    className={cn(
                      "size-5",
                      bookmarks.some((id) => lessons.find((l) => l.id === id)?.moduleId === m.id) &&
                        "fill-violet text-violet",
                    )}
                  />
                </button>
              </div>
              <h2 className="mt-5 text-2xl font-semibold">{m.title}</h2>
              <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{m.description}</p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-md bg-muted px-2 py-1">{m.difficulty}</span>
                <span className="rounded-md bg-muted px-2 py-1">{lessonCount} lessons</span>
                <span className="rounded-md bg-muted px-2 py-1">{m.minutes} min</span>
              </div>
              <div className="mt-auto pt-7">
                <div className="mb-2 flex justify-between text-xs">
                  <span>
                    {done} of {lessonCount} complete
                  </span>
                  <span className="font-mono">{progress}%</span>
                </div>
                <ProgressMeter value={progress} label={m.title} />
                <AppLink href={`/learn/modules/${m.id}`} className={cn(primary, "mt-5 w-full")}>
                  {progress > 0 ? "Continue module" : "View module"}
                  <ArrowRight />
                </AppLink>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState
            icon={<Search />}
            title="No modules match"
            description="Clear the search or choose a different progress filter."
            action={
              <button
                className={outline}
                onClick={() => {
                  setSearch("");
                  setFilter("All");
                }}
              >
                Clear filters
              </button>
            }
          />
        </div>
      )}
    </div>
  );
}

export function ModuleDetailPage({ moduleId }: { moduleId: string }) {
  const { completedLessons, bookmarks, toggleBookmark, lessons } = useNcap();
  const modules = useModules();
  const quizCatalogue = useQuizCatalogue();
  const module = modules.find((m) => m.id === moduleId);
  const linkedQuiz = quizCatalogue.data?.find((quiz) => quiz.moduleId === moduleId);
  if (!module || module.status !== "Published") return <Missing />;
  const ls = lessons
    .filter((l) => l.moduleId === module.id && l.status === "Published")
    .sort((a, b) => a.order - b.order);
  const done = ls.filter((l) => completedLessons.includes(l.id)).length;
  const progress = ls.length ? Math.round((done / ls.length) * 100) : 0;
  return (
    <div className="container-ncap max-w-6xl py-2">
      <PageCrumbs items={[{ label: "Learn", href: "/learn" }, { label: module.title }]} />
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div>
          <PageHeader
            eyebrow={`${module.topic} · ${module.difficulty}`}
            title={module.title}
            description={module.description}
          />
          <section className="mt-9">
            <h2 className="text-xl font-semibold">What you will learn</h2>
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {module.objectives.map((o) => (
                <li key={o} className="flex gap-3 rounded-lg border bg-white p-4 text-sm">
                  <Target className="size-5 shrink-0 text-violet" />
                  {o}
                </li>
              ))}
            </ul>
          </section>
          <section className="mt-10">
            <SectionHeading
              title="Lessons"
              description={`${done} of ${ls.length} complete · Content is available in English`}
            />
            <div className="overflow-hidden rounded-xl border bg-white">
              {ls.length === 0 && (
                <div className="p-6">
                  <EmptyState
                    title="No published lessons"
                    description="This module is not open for learning yet. Check again after content review."
                  />
                </div>
              )}
              {ls.map((lesson, i) => {
                const isDone = completedLessons.includes(lesson.id);
                const isCurrent =
                  !isDone && ls.slice(0, i).every((x) => completedLessons.includes(x.id));
                return (
                  <div
                    key={lesson.id}
                    className="flex flex-col gap-4 border-b p-4 last:border-0 sm:flex-row sm:items-center"
                  >
                    <span
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-full border font-mono text-sm",
                        isDone
                          ? "border-success bg-success-soft text-success"
                          : isCurrent
                            ? "border-violet bg-violet-soft text-violet"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {isDone ? <Check className="size-5" /> : i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{lesson.title}</h3>
                        {isCurrent && (
                          <span className="rounded-md bg-ember-soft px-2 py-0.5 text-xs font-semibold text-ember">
                            Next
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{lesson.summary}</p>
                      <span className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        {lesson.video ? (
                          <PlayCircle className="size-3.5" aria-hidden="true" />
                        ) : (
                          <Clock3 className="size-3.5" aria-hidden="true" />
                        )}
                        {lesson.video ? "Video · " : ""}
                        {lesson.minutes} min
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          void toggleBookmark(lesson.id)
                            .then((added) =>
                              toast.success(added ? "Lesson bookmarked" : "Bookmark removed"),
                            )
                            .catch(() => undefined);
                        }}
                        className="grid size-11 place-items-center rounded-lg border"
                        aria-label={`${bookmarks.includes(lesson.id) ? "Remove bookmark from" : "Bookmark"} ${lesson.title}`}
                      >
                        <Bookmark
                          className={cn(
                            "size-4",
                            bookmarks.includes(lesson.id) && "fill-violet text-violet",
                          )}
                        />
                      </button>
                      <AppLink href={`/learn/lessons/${lesson.id}`} className={outline}>
                        {isDone ? "Review" : "Open"}
                        <ArrowRight />
                      </AppLink>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border bg-white p-5">
            <p className="meta text-muted-foreground">Module progress</p>
            <p className="mt-3 font-mono text-4xl font-bold">{progress}%</p>
            <div className="mt-4">
              <ProgressMeter value={progress} label={module.title} />
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Duration</dt>
                <dd className="font-semibold">{module.minutes} min</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Lessons</dt>
                <dd className="font-semibold">{ls.length}</dd>
              </div>
            </dl>
          </div>
          {linkedQuiz && (
            <div className="mt-4 rounded-xl border border-violet/30 bg-violet-soft p-5">
              <GraduationCap className="size-6 text-violet" />
              <h2 className="mt-4 font-semibold">Related assessment</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Complete the module and score at least {linkedQuiz.eligibilityPercent}% to meet the
                quiz eligibility threshold.
              </p>
              <AppLink href={`/quizzes/${linkedQuiz.id}`} className={cn(primary, "mt-5 w-full")}>
                View quiz
              </AppLink>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export function LessonPage({ lessonId }: { lessonId: string }) {
  const quizCatalogue = useQuizCatalogue();
  const { completedLessons, bookmarks, toggleBookmark, completeLesson, lessons, session } =
    useNcap();
  const modules = useModules();
  const lesson = lessons.find((l) => l.id === lessonId && l.status === "Published");
  const module = modules.find((m) => m.id === lesson?.moduleId);
  const linkedQuiz = quizCatalogue.data?.find((quiz) => quiz.moduleId === module?.id);
  const [checkAnswers, setCheckAnswers] = useState<Record<number, number>>({});
  useEffect(() => {
    setCheckAnswers({});
  }, [lessonId]);
  if (!lesson || !module || module.status !== "Published") return <Missing />;
  const siblings = lessons
    .filter((l) => l.moduleId === lesson.moduleId && l.status === "Published")
    .sort((a, b) => a.order - b.order);
  const index = siblings.findIndex((l) => l.id === lesson.id);
  const prev = siblings[index - 1],
    next = siblings[index + 1];
  const done = completedLessons.includes(lesson.id);
  const finish = () => {
    void completeLesson(lesson.id)
      .then(() =>
        toast.success("Lesson marked complete", {
          description: "Your dashboard and module progress are updated.",
        }),
      )
      .catch(() => undefined);
  };
  return (
    <div className="container-ncap max-w-[1400px] py-2">
      <PageCrumbs
        items={[
          { label: "Learn", href: "/learn" },
          { label: module.title, href: `/learn/modules/${module.id}` },
          { label: lesson.title },
        ]}
      />
      <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border bg-white p-3">
        <div className="flex-1">
          <div className="mb-2 flex justify-between text-xs text-muted-foreground">
            <span>
              Lesson {index + 1} of {siblings.length}
            </span>
            <span>{Math.round(((index + 1) / siblings.length) * 100)}%</span>
          </div>
          <ProgressMeter
            value={((index + 1) / siblings.length) * 100}
            label="Lesson position"
            size="sm"
          />
        </div>
        <button
          onClick={() => {
            void toggleBookmark(lesson.id)
              .then((added) => toast.success(added ? "Lesson bookmarked" : "Bookmark removed"))
              .catch(() => undefined);
          }}
          className="grid size-11 place-items-center rounded-lg border"
          aria-label={bookmarks.includes(lesson.id) ? "Remove bookmark" : "Bookmark lesson"}
        >
          <Bookmark
            className={cn("size-5", bookmarks.includes(lesson.id) && "fill-violet text-violet")}
          />
        </button>
      </div>
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <article className="overflow-hidden rounded-xl border bg-white">
            <header className="border-b p-6 md:p-10">
              <div className="flex flex-wrap items-center gap-3">
                <span className="meta text-violet">{lesson.topic}</span>
                <span className="text-xs text-muted-foreground">
                  {lesson.minutes} min · English
                </span>
              </div>
              <h1 className="mt-4 max-w-3xl text-3xl font-semibold md:text-4xl">{lesson.title}</h1>
              <p className="mt-4 max-w-3xl text-lg text-muted-foreground">{lesson.summary}</p>
            </header>
            {lesson.video && (
              <LessonVideoPlayer
                key={`${lesson.id}:${lesson.video.kind === "upload" ? lesson.video.asset.storageKey : lesson.video.url}`}
                learnerKey={session.email}
                lessonId={lesson.id}
                title={lesson.title}
                video={lesson.video}
                {...(!done ? { onComplete: finish } : {})}
              />
            )}
            <div className="mx-auto max-w-3xl px-6 py-10 md:px-10">
              {lesson.blocks.map((block, i) => (
                <LessonBlockView
                  key={i}
                  block={block}
                  selected={checkAnswers[i]}
                  onSelect={(v) => setCheckAnswers((s) => ({ ...s, [i]: v }))}
                />
              ))}
            </div>
            <footer className="border-t p-6 md:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {done ? (
                    <p className="flex items-center gap-2 font-semibold text-success">
                      <CheckCircle2 />
                      Lesson completed
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Finished reading? Record your progress.
                    </p>
                  )}
                </div>
                <button className={primary} disabled={done} onClick={finish}>
                  {done ? (
                    <>
                      <Check />
                      Completed
                    </>
                  ) : (
                    <>
                      <BookCheck />
                      Mark as complete
                    </>
                  )}
                </button>
              </div>
            </footer>
          </article>
          <nav className="mt-6 grid gap-3 sm:grid-cols-2" aria-label="Lesson navigation">
            {prev ? (
              <AppLink href={`/learn/lessons/${prev.id}`} className={cn(outline, "justify-start")}>
                <ChevronLeft />
                Previous: {prev.title}
              </AppLink>
            ) : (
              <span />
            )}
            {next ? (
              <AppLink href={`/learn/lessons/${next.id}`} className={cn(primary, "justify-end")}>
                Next: {next.title}
                <ChevronRight />
              </AppLink>
            ) : (
              <AppLink
                href={linkedQuiz ? `/quizzes/${linkedQuiz.id}` : "/quizzes"}
                className={cn(primary, "justify-end")}
              >
                Take the module quiz
                <ArrowRight />
              </AppLink>
            )}
          </nav>
        </div>
        <aside
          className="rounded-xl border bg-white xl:sticky xl:top-24 xl:self-start"
          aria-label="Course content"
        >
          <div className="border-b p-5">
            <p className="meta text-violet">Course content</p>
            <h2 className="mt-2 text-lg font-semibold">{module.title}</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              {siblings.filter((item) => completedLessons.includes(item.id)).length} of{" "}
              {siblings.length} lessons complete
            </p>
          </div>
          <ol className="max-h-[min(65vh,620px)] overflow-y-auto p-2">
            {siblings.map((item, itemIndex) => {
              const complete = completedLessons.includes(item.id);
              const current = item.id === lesson.id;
              return (
                <li key={item.id}>
                  <AppLink
                    href={`/learn/lessons/${item.id}`}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "flex min-h-14 items-start gap-3 rounded-lg px-3 py-3 text-sm hover:bg-muted",
                      current && "bg-primary-soft text-primary",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-bold",
                        complete && "border-success bg-success-soft text-success",
                        current && !complete && "border-violet bg-white text-violet",
                      )}
                    >
                      {complete ? <Check className="size-3.5" /> : itemIndex + 1}
                    </span>
                    <span className="min-w-0">
                      <strong className="line-clamp-2 font-semibold">{item.title}</strong>
                      <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        {item.video ? (
                          <PlayCircle className="size-3.5" />
                        ) : (
                          <BookOpen className="size-3.5" />
                        )}
                        {item.video ? "Video" : "Reading"} · {item.minutes} min
                      </span>
                    </span>
                  </AppLink>
                </li>
              );
            })}
          </ol>
        </aside>
      </div>
    </div>
  );
}

export function LessonBlockView({
  block,
  selected,
  onSelect,
}: {
  block: LessonBlock;
  selected: number | undefined;
  onSelect: (v: number) => void;
}) {
  if (block.kind === "heading")
    return <h2 className="mb-4 mt-10 text-2xl font-semibold first:mt-0">{block.text}</h2>;
  if (block.kind === "paragraph")
    return (
      <p
        className="mb-5 whitespace-pre-wrap break-words text-lg leading-8 text-foreground/85"
        style={{
          fontWeight: block.format?.bold ? 700 : 400,
          fontStyle: block.format?.italic ? "italic" : "normal",
          textDecoration: block.format?.underline ? "underline" : "none",
          textAlign: block.format?.align ?? "left",
        }}
      >
        {block.text}
      </p>
    );
  if (block.kind === "list")
    return (
      <ul className="mb-6 grid gap-3">
        {block.items.map((x) => (
          <li key={x} className="flex gap-3 text-lg">
            <Check className="mt-1 size-5 shrink-0 text-success" />
            <span>{x}</span>
          </li>
        ))}
      </ul>
    );
  if (block.kind === "callout")
    return (
      <aside
        className={cn(
          "my-7 border-l-4 p-5",
          block.tone === "warning"
            ? "border-warning bg-warning-soft"
            : block.tone === "tip"
              ? "border-success bg-success-soft"
              : "border-violet bg-violet-soft",
        )}
      >
        <strong className="flex items-center gap-2">
          <Lightbulb className="size-5" />
          {block.title}
        </strong>
        <p className="mt-2">{block.text}</p>
      </aside>
    );
  if (block.kind === "example")
    return (
      <aside className="my-7 rounded-xl border bg-muted p-5">
        <span className="meta text-violet">Example</span>
        <h3 className="mt-2 font-semibold">{block.title}</h3>
        <p className="mt-2">{block.text}</p>
      </aside>
    );
  const answered = selected !== undefined;
  return (
    <section className="my-8 rounded-xl border border-violet/30 p-5">
      <p className="meta text-violet">Mini knowledge check</p>
      <h3 className="mt-3 text-lg font-semibold">{block.question}</h3>
      <div className="mt-4 grid gap-2">
        {block.options.map((o, i) => (
          <button
            key={o}
            onClick={() => !answered && onSelect(i)}
            disabled={answered}
            className={cn(
              "min-h-11 rounded-lg border px-4 text-left text-sm",
              selected === i && "border-violet bg-violet-soft",
              answered && i === block.correctIndex && "border-success bg-success-soft",
            )}
          >
            {o}
          </button>
        ))}
      </div>
      {answered && (
        <p className="mt-4 flex gap-2 text-sm" aria-live="polite">
          {selected === block.correctIndex ? (
            <CheckCircle2 className="size-5 shrink-0 text-success" />
          ) : (
            <XCircle className="size-5 shrink-0 text-destructive" />
          )}
          <span>
            <strong>
              {selected === block.correctIndex ? "Correct." : "The safer answer is highlighted."}
            </strong>{" "}
            {block.explanation}
          </span>
        </p>
      )}
    </section>
  );
}

export function LearningSearchPage() {
  const { lessons } = useNcap();
  const modules = useModules();
  const routeSearch = useSearch({ from: "/learn/search" });
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("All");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (routeSearch.q) setQuery(routeSearch.q);
    const key = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [routeSearch.q]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return lessons.filter(
      (l) =>
        l.status === "Published" &&
        modules.some((module) => module.id === l.moduleId && module.status === "Published") &&
        (topic === "All" || l.topic === topic) &&
        `${l.title} ${l.summary} ${l.topic} ${modules.find((m) => m.id === l.moduleId)?.title}`
          .toLowerCase()
          .includes(q),
    );
  }, [lessons, modules, query, topic]);
  const topicOptions = useMemo(
    () => [
      "All",
      ...new Set(
        lessons.filter((lesson) => lesson.status === "Published").map((lesson) => lesson.topic),
      ),
    ],
    [lessons],
  );
  return (
    <div className="container-ncap max-w-6xl py-2">
      <PageHeader
        eyebrow="Learning search · English content"
        title="Find the lesson you need"
        description="Search lesson titles, modules, topics, and practical keywords. Press / anywhere outside a form to focus search."
      />
      <div className="mt-8 flex flex-col gap-3 rounded-xl border bg-white p-3 md:flex-row">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-3.5 size-5 text-muted-foreground" />
          <span className="sr-only">Search learning</span>
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 w-full rounded-lg border bg-background pl-11 pr-12"
            placeholder="Try “OTP”, “public Wi-Fi”, or “password”…"
          />
          <kbd className="absolute right-3 top-3 rounded border bg-white px-2 py-1 font-mono text-xs text-muted-foreground">
            /
          </kbd>
        </label>
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="h-12 rounded-lg border bg-white px-3"
          aria-label="Filter learning results by topic"
        >
          {topicOptions.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <p className="mt-5 text-sm text-muted-foreground" aria-live="polite">
        {query
          ? `${results.length} lesson${results.length === 1 ? "" : "s"} found for “${query}”`
          : `Enter a keyword to search across ${lessons.filter((lesson) => lesson.status === "Published").length} lessons.`}
      </p>
      {query && results.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-xl border bg-white">
          {results.map((l) => (
            <AppLink
              key={l.id}
              href={`/learn/lessons/${l.id}`}
              className="flex flex-col gap-3 border-b p-5 last:border-0 hover:bg-muted sm:flex-row sm:items-center"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                <BookOpen className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  <span className="meta text-violet">{l.topic}</span>
                  <span className="text-xs text-muted-foreground">
                    {modules.find((m) => m.id === l.moduleId)?.title}
                  </span>
                </div>
                <h2 className="mt-1 font-semibold">{l.title}</h2>
                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{l.summary}</p>
              </div>
              <span className="text-sm font-semibold text-primary">Open lesson →</span>
            </AppLink>
          ))}
        </div>
      ) : query ? (
        <div className="mt-5">
          <EmptyState
            icon={<Search />}
            title="No lessons found"
            description="Try a broader keyword, another topic, or clear the filter."
            action={
              <button
                className={outline}
                onClick={() => {
                  setQuery("");
                  setTopic("All");
                  input.current?.focus();
                }}
              >
                Clear search
              </button>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {["phishing link", "password manager", "phone update"].map((q) => (
            <button
              key={q}
              onClick={() => setQuery(q)}
              className="rounded-xl border bg-white p-5 text-left hover:border-violet"
            >
              <Search className="size-5 text-violet" />
              <span className="mt-4 block font-semibold">Search “{q}”</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function BookmarksPage() {
  const { bookmarks, toggleBookmark, lessons } = useNcap();
  const modules = useModules();
  const [topic, setTopic] = useState("All");
  const topicOptions = [
    "All",
    ...new Set(
      lessons
        .filter(
          (lesson) =>
            lesson.status === "Published" &&
            bookmarks.includes(lesson.id) &&
            modules.some(
              (module) => module.id === lesson.moduleId && module.status === "Published",
            ),
        )
        .map((lesson) => lesson.topic),
    ),
  ];
  const saved = lessons.filter(
    (l) =>
      l.status === "Published" &&
      modules.some((module) => module.id === l.moduleId && module.status === "Published") &&
      bookmarks.includes(l.id) &&
      (topic === "All" || l.topic === topic),
  );
  return (
    <div className="container-ncap max-w-6xl py-2">
      <PageHeader
        eyebrow="My learning"
        title="Saved lessons"
        description="Keep useful guidance close and remove bookmarks whenever you no longer need them."
      />
      <div className="mt-7 flex items-center gap-3">
        <Filter className="size-4 text-muted-foreground" />
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="h-11 rounded-lg border bg-white px-3"
          aria-label="Filter bookmarks"
        >
          {topicOptions.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground">{saved.length} saved</span>
      </div>
      {saved.length ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {saved.map((l) => (
            <article key={l.id} className="rounded-xl border bg-white p-5">
              <div className="flex justify-between">
                <span className="meta text-violet">{l.topic}</span>
                <button
                  onClick={() => {
                    void toggleBookmark(l.id)
                      .then(() => toast.success("Bookmark removed"))
                      .catch(() => undefined);
                  }}
                  className="grid size-11 place-items-center rounded-lg border"
                  aria-label={`Remove bookmark from ${l.title}`}
                >
                  <BookmarkCheck className="size-5 text-violet" />
                </button>
              </div>
              <h2 className="mt-5 text-xl font-semibold">{l.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{l.summary}</p>
              <div className="mt-5 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {l.minutes} min · {l.difficulty}
                </span>
                <AppLink
                  href={`/learn/lessons/${l.id}`}
                  className="inline-flex min-h-10 items-center font-semibold text-primary"
                >
                  Open lesson <ArrowRight className="ml-2 size-4" />
                </AppLink>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState
            icon={<Bookmark className="size-8" />}
            title={bookmarks.length ? "No bookmarks in this topic" : "No saved lessons yet"}
            description={
              bookmarks.length
                ? "Choose All or another topic to see your saved lessons."
                : "Save a lesson from the catalogue or lesson screen and it will appear here."
            }
            action={
              <AppLink href="/learn" className={primary}>
                Browse learning
              </AppLink>
            }
          />
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const store = useNcap();
  const [activityOffset, setActivityOffset] = useState(0);
  const dashboard = useLearnerDashboard(activityOffset);
  const quizHistory = useQuizHistory();
  const quizCatalogue = useQuizCatalogue();
  const completedQuizAttempts = (quizHistory.data ?? [])
    .filter((attempt) => attempt.scorePercent !== null)
    .map((attempt) => ({
      ...attempt,
      scorePercent: attempt.scorePercent!,
      seconds: Math.max(
        0,
        Math.round(
          (Date.parse(attempt.completedAt ?? attempt.startedAt) - Date.parse(attempt.startedAt)) /
            1000,
        ),
      ),
    }));
  const quizAverage = completedQuizAttempts.length
    ? Math.round(
        completedQuizAttempts.reduce((sum, attempt) => sum + attempt.scorePercent, 0) /
          completedQuizAttempts.length,
      )
    : 0;
  const modules = useModules();
  const stats = {
    overall: dashboard.data?.statistics.overall ?? 0,
    completedCount: dashboard.data?.statistics.completedCount ?? 0,
    totalLessons: dashboard.data?.statistics.totalLessons ?? 0,
    hours: Math.round(((dashboard.data?.learningSeconds ?? 0) / 3600) * 10) / 10,
    moduleProgress:
      dashboard.data?.statistics.moduleProgress
        .map((progress) => ({
          module: modules.find((module) => module.id === progress.id)!,
          total: progress.total,
          completed: progress.completed,
          percent: progress.total ? Math.round((progress.completed * 100) / progress.total) : 0,
        }))
        .filter((progress) => progress.module) ?? [],
    badges: dashboard.data?.badges ?? [],
  };
  const publishedLessons = store.lessons.filter(
    (lesson) =>
      lesson.status === "Published" &&
      modules.some((module) => module.id === lesson.moduleId && module.status === "Published"),
  );
  const next =
    publishedLessons.find((l) => !store.completedLessons.includes(l.id)) ?? publishedLessons[0];
  if (dashboard.isPending || store.learningPending) {
    return (
      <div className="container-ncap py-8" role="status">
        Loading your dashboard…
      </div>
    );
  }
  if (dashboard.isError || store.learningError || quizHistory.isError) {
    return (
      <div className="container-ncap py-8" role="alert">
        Your dashboard is unavailable. Please refresh and try again.
      </div>
    );
  }
  if (!next) {
    return (
      <div className="container-ncap max-w-[1320px] py-2">
        <PageHeader
          eyebrow="Learner dashboard"
          title={`Welcome back${store.session.name ? `, ${store.session.name.split(" ")[0]}` : ""}`}
          description="Your learning summary is ready, but there are currently no published lessons."
        />
        <div className="mt-8">
          <EmptyState
            icon={<BookOpen />}
            title="No lessons are currently published"
            description="An administrator can review and publish learning content from the content workspace."
            action={
              <AppLink href="/awareness" className={outline}>
                Browse awareness resources
              </AppLink>
            }
          />
        </div>
      </div>
    );
  }
  const currentModule = modules.find((m) => m.id === next.moduleId);
  const visibleAnnouncements = dashboard.data?.announcements.slice(0, 3) ?? [];
  return (
    <div className="container-ncap max-w-[1320px] py-2">
      <PageHeader
        eyebrow="Learner dashboard"
        title={`Welcome back${store.session.name ? `, ${store.session.name.split(" ")[0]}` : ""}`}
        description="Continue where you left off and see how your learning is building up."
        actions={
          <AppLink href={`/learn/lessons/${next.id}`} className={primary}>
            Continue learning <ArrowRight />
          </AppLink>
        }
      />
      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Overall learning progress"
          value={`${stats.overall}%`}
          hint={`${stats.completedCount} of ${stats.totalLessons} lessons`}
          icon={<Target />}
          tone="violet"
        />
        <StatCard
          label="Quiz average"
          value={`${quizAverage}%`}
          hint={`${completedQuizAttempts.length} completed attempts`}
          icon={<Trophy />}
          tone="ember"
        />
        <StatCard
          label="Completed lessons"
          value={stats.completedCount}
          hint={`${stats.totalLessons - stats.completedCount} remaining`}
          icon={<BookCheck />}
          tone="success"
        />
        <StatCard
          label="Learning hours"
          value={stats.hours}
          hint="Time spent in lessons"
          icon={<Clock3 />}
        />
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <div className="rounded-xl border bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="meta text-violet">Continue learning</p>
              <h2 className="mt-2 text-2xl font-semibold">{next.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {currentModule?.title ?? "Learning module"}
              </p>
            </div>
            <span className="grid size-12 place-items-center rounded-xl bg-primary-soft text-primary">
              <BookOpen />
            </span>
          </div>
          <p className="mt-5 text-muted-foreground">{next.summary}</p>
          <AppLink href={`/learn/lessons/${next.id}`} className={cn(primary, "mt-6")}>
            Resume lesson <ArrowRight />
          </AppLink>
        </div>
        <div className="rounded-xl border bg-primary p-6 text-white">
          <p className="meta text-white/60">Recommended next step</p>
          <Sparkles className="mt-6 size-7 text-ember" />
          <h2 className="mt-3 text-xl font-semibold">
            {stats.overall < 40
              ? "Complete one short lesson today"
              : "Strengthen your lowest quiz topic"}
          </h2>
          <p className="mt-2 text-sm text-white/70">
            This suggestion is based on your saved learning progress.
          </p>
        </div>
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-xl border bg-white p-6">
          <SectionHeading title="Progress by module" />
          <div className="grid gap-5">
            {stats.moduleProgress.map((p) => (
              <div key={p.module.id}>
                <div className="mb-2 flex justify-between text-sm">
                  <AppLink
                    href={`/learn/modules/${p.module.id}`}
                    className="font-semibold hover:text-primary"
                  >
                    {p.module.title}
                  </AppLink>
                  <span className="font-mono text-xs">
                    {p.completed}/{p.total} · {p.percent}%
                  </span>
                </div>
                <ProgressMeter value={p.percent} label={p.module.title} />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-white p-6">
          <SectionHeading
            title="Recent quiz performance"
            action={
              <AppLink href="/quizzes" className="text-sm font-semibold text-primary">
                All quizzes →
              </AppLink>
            }
          />
          {completedQuizAttempts.length ? (
            <div className="grid gap-3">
              {completedQuizAttempts.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg bg-muted p-4"
                >
                  <div>
                    <p className="font-semibold">
                      {quizCatalogue.data?.find((q) => q.id === a.quizId)?.title ?? "Quiz attempt"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {a.completedAt} · {Math.floor(a.seconds / 60)}m {a.seconds % 60}s
                    </p>
                  </div>
                  <strong
                    className={cn(
                      "font-mono text-xl",
                      a.scorePercent >= 80
                        ? "text-success"
                        : a.scorePercent >= 70
                          ? "text-warning"
                          : "text-destructive",
                    )}
                  >
                    {a.scorePercent}%
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No quiz attempts yet"
              description="Complete an assessment to see your scores here."
            />
          )}
        </div>
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_.8fr]">
        <div className="rounded-xl border bg-white p-6">
          <SectionHeading
            title="Badges"
            description="Earned through visible, deterministic learning milestones."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {stats.badges.map((b) => (
              <div
                key={b.id}
                className={cn(
                  "flex gap-3 rounded-lg border p-4",
                  b.earned ? "bg-success-soft" : "bg-muted",
                )}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white">
                  <Award
                    className={cn("size-5", b.earned ? "text-ember" : "text-muted-foreground")}
                  />
                </span>
                <div>
                  <p className="font-semibold">
                    {b.name}
                    {!b.earned && <span className="sr-only">, locked</span>}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{b.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-white p-6">
          <SectionHeading title="Announcements" />
          <div className="grid gap-3">
            {visibleAnnouncements.map((a) => (
              <article key={a.id} className="border-l-2 border-violet pl-4">
                <h3 className="font-semibold">{a.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
              </article>
            ))}
            {visibleAnnouncements.length === 0 && (
              <p className="text-sm text-muted-foreground">No active announcements.</p>
            )}
          </div>
        </div>
      </section>
      <section className="mt-6 rounded-xl border bg-white p-6">
        <SectionHeading title="Recent activity" />
        <ol className="grid gap-2 md:grid-cols-2">
          {(dashboard.data?.activities ?? []).map((a) => (
            <li key={a.id} className="flex gap-3 rounded-lg p-3 hover:bg-muted">
              <span className="mt-1 size-2 shrink-0 rounded-full bg-violet" />
              <div>
                <p className="text-sm font-medium">{a.label}</p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">{a.at}</p>
              </div>
            </li>
          ))}
        </ol>
        {!dashboard.data?.activities.length && (
          <p className="text-sm text-muted-foreground">
            Your completed lessons, quizzes, bookmarks, and badges will appear here.
          </p>
        )}
        <div className="mt-4 flex gap-2">
          {activityOffset > 0 && (
            <button
              className={outline}
              onClick={() => setActivityOffset(Math.max(0, activityOffset - 20))}
            >
              Previous activity
            </button>
          )}
          {(dashboard.data?.activities.length ?? 0) === 20 && (
            <button className={outline} onClick={() => setActivityOffset(activityOffset + 20)}>
              More activity
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

export { LearnerCertificatesPage as CertificatesPage } from "@/features/learning/LearnerCertificatesPage";

export function ProfilePage({ edit = false }: { edit?: boolean }) {
  const store = useNcap();
  const auth = useAuth();
  const { language: activeLanguage, setLanguage: setActiveLanguage } = useI18n();
  const navigate = useNavigate();
  const stats = useLearnerStats();
  const certificates = useCertificates();
  const [name, setName] = useState(store.session.name);
  const [language, setLanguage] = useState<LanguageCode>(activeLanguage);
  const [phone, setPhone] = useState(store.session.phone);
  const [interests, setInterests] = useState<string[]>(store.session.interests);
  const [notifications, setNotifications] = useState(store.session.notifications);
  const [saving, setSaving] = useState(false);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Full name is required");
      return;
    }
    const parsedPhone = phoneSchema.safeParse(phone);
    if (!parsedPhone.success) {
      toast.error(parsedPhone.error.issues[0]?.message ?? "Enter a valid phone number.");
      return;
    }
    setSaving(true);
    const result = await updateAccountProfile({
      data: {
        displayName: name.trim(),
        language,
        phone: phone.trim(),
        notifications,
      },
    });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    store.updateProfile({
      name: result.data.displayName,
      phone: result.data.phone,
      interests,
      notifications,
    });
    setActiveLanguage(language);
    await auth.refresh();
    toast.success("Profile updated");
    void navigate({ to: "/profile" as never });
  };
  if (edit)
    return (
      <div className="container-ncap max-w-3xl py-2">
        <PageCrumbs items={[{ label: "Profile", href: "/profile" }, { label: "Edit" }]} />
        <PageHeader
          eyebrow="Profile settings"
          title="Edit your profile"
          description="Your email is managed by your secure account and cannot be changed here."
        />
        <form onSubmit={save} className="mt-8 grid gap-6 rounded-xl border bg-white p-6">
          <label className="text-sm font-semibold">
            Full name <span className="text-destructive">*</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border px-3"
              required
            />
          </label>
          <label className="text-sm font-semibold">
            Email address
            <input
              value={store.session.email}
              readOnly
              className="mt-2 h-11 w-full rounded-lg border bg-muted px-3 text-muted-foreground"
            />
          </label>
          <label className="text-sm font-semibold">
            Phone number
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              maxLength={24}
              className="mt-2 h-11 w-full rounded-lg border px-3"
            />
          </label>
          <label className="text-sm font-semibold">
            Preferred language
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className="mt-2 h-11 w-full rounded-lg border px-3"
            >
              <option value="en">English</option>
              <option value="si">සිංහල</option>
              <option value="ta">தமிழ்</option>
            </select>
          </label>
          <fieldset>
            <legend className="text-sm font-semibold">Learning interests</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {store.topics
                .filter((topic) => topic.status === "Active")
                .map((topic) => topic.name)
                .map((t) => (
                  <label
                    key={t}
                    className="flex min-h-11 items-center gap-3 rounded-lg border p-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={interests.includes(t)}
                      onChange={(e) =>
                        setInterests((x) =>
                          e.target.checked ? [...x, t] : x.filter((v) => v !== t),
                        )
                      }
                      className="size-4 accent-violet"
                    />
                    {t}
                  </label>
                ))}
            </div>
          </fieldset>
          <label className="flex min-h-12 items-center justify-between gap-3 rounded-lg border p-4">
            <span>
              <strong className="block text-sm">Learning notifications</strong>
              <span className="text-xs text-muted-foreground">
                Demo preference only; no emails or push notifications are sent.
              </span>
            </span>
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
              className="size-5 accent-violet"
            />
          </label>
          <div className="flex justify-end gap-3">
            <AppLink href="/profile" className={outline}>
              Cancel
            </AppLink>
            <button className={primary} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    );
  return (
    <div className="container-ncap max-w-5xl py-2">
      <PageHeader
        eyebrow="Learner profile · Demo data"
        title="Your profile"
        description="A concise view of your learning identity and progress."
        actions={
          <AppLink href="/profile/edit" className={primary}>
            <Edit3 />
            Edit profile
          </AppLink>
        }
      />
      <section className="mt-8 grid gap-6 md:grid-cols-[280px_1fr]">
        <div className="rounded-xl border bg-white p-6 text-center">
          <span className="mx-auto grid size-24 place-items-center rounded-full bg-primary-soft text-3xl font-bold text-primary">
            {(store.session.name || "D").slice(0, 1)}
          </span>
          <h2 className="mt-5 text-xl font-semibold">{store.session.name || "Demo Learner"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {store.session.email || "learner@ncap.demo"}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Joined {store.session.joinedAt || "2026-03-02"}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-6">
          <h2 className="text-xl font-semibold">Learning summary</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <StatCard label="Progress" value={`${stats.overall}%`} />
            <StatCard label="Completed lessons" value={stats.completedCount} />
            <StatCard label="Certificates" value={certificates.data?.issuedCount ?? 0} />
          </div>
          <h3 className="mt-7 font-semibold">Interests</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {store.session.interests.map((i) => (
              <span
                key={i}
                className="rounded-md bg-primary-soft px-3 py-1.5 text-sm font-medium text-primary"
              >
                {i}
              </span>
            ))}
          </div>
          <dl className="mt-7 grid gap-4 border-t pt-6 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Preferred language</dt>
              <dd className="mt-1 font-semibold">
                {activeLanguage === "si" ? "සිංහල" : activeLanguage === "ta" ? "தமிழ்" : "English"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Learning notifications</dt>
              <dd className="mt-1 font-semibold">
                {store.session.notifications ? "Enabled (demo preference)" : "Disabled"}
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}

function Missing() {
  return (
    <div className="mx-auto max-w-xl">
      <EmptyState
        title="Learning resource not found"
        description="The item may have moved or the address is incomplete."
        action={
          <AppLink href="/learn" className={primary}>
            Return to learning
          </AppLink>
        }
      />
    </div>
  );
}
