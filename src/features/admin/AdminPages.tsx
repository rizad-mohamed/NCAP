import { useCertificates, useCertificateTemplate } from "@/services/certificate-hooks";
import { CertificatePreview } from "@/components/common/CertificatePreview";
import { LessonBlockView } from "@/features/learning/LearningPages";
import { LessonVideoPlayer } from "@/components/learning/LessonVideoPlayer";
import type { StoredCertificateTemplate } from "@/domain/certificates";
import { useAwarenessSummary } from "@/services/awareness-hooks";
import { useAdminQuizSummary } from "@/services/quiz-hooks";
import { useAdminDashboard } from "@/services/dashboard-hooks";
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Activity,
  ArrowDownUp,
  ArrowUp,
  ArrowDown,
  BookOpen,
  Check,
  CircleUserRound,
  Download,
  Edit3,
  Eye,
  FileCheck2,
  FileQuestion,
  FileText,
  GraduationCap,
  Megaphone,
  MoreHorizontal,
  Plus,
  Printer,
  ShieldCheck,
  Settings,
  Tags,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useNcap } from "@/state/ncap-store";
import { quizzes } from "@/data/quizzes";
import type {
  Announcement,
  Article,
  DemoUser,
  Infographic,
  Lesson,
  LessonBlock,
  LessonVideo,
  MediaAsset,
  Poster,
  QuizQuestion,
  Topic,
  TopicRecord,
} from "@/data/types";
import { NCAP_CONFIG } from "@/lib/config";
import { AppLink } from "@/components/layout/AppShell";
import {
  DemoTag,
  EmptyState,
  PageHeader,
  ProgressMeter,
  SectionHeading,
  StatCard,
} from "@/components/common/primitives";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MediaField } from "@/components/common/MediaField";
import { LessonContentBuilder } from "@/components/admin/LessonContentBuilder";
import { LessonVideoField } from "@/components/admin/LessonVideoField";
import {
  announcementStatus,
  isDuplicateTopic,
  normalizeTopicName,
  topicSlug,
} from "@/domain/rules";
import { DemoMediaService } from "@/services/media";
import { LearningMediaService } from "@/services/learning-media";
import { useRepository } from "@/services/repository-provider";
import { useSaveRepositoryRecord, useRemoveRepositoryRecord } from "@/services/query-hooks";
import {
  lessonBlocksSchema,
  lessonVideoSchema,
  passwordSchema,
  phoneSchema,
} from "@/domain/validation";
import { useI18n } from "@/lib/i18n";
import {
  changePassword as changeAccountPassword,
  updateProfile as updateAccountProfile,
} from "@/auth/auth.functions";
import { useAuth } from "@/auth/AuthProvider";
import {
  DashboardPagination,
  DashboardSearchInput,
  FilterToolbar,
  ResponsiveTableContainer,
  StatusBadge,
  dashboardButton,
  dashboardField,
  dashboardSelect,
} from "@/components/common/dashboard-primitives";

const AdminDashboardCharts = lazy(() =>
  import("./AdminCharts").then((module) => ({ default: module.AdminDashboardCharts })),
);
const AdminReportCharts = lazy(() =>
  import("./AdminCharts").then((module) => ({ default: module.AdminReportCharts })),
);

const primary = dashboardButton.primary;
const outline = dashboardButton.secondary;
const iconBtn = dashboardButton.icon;
const field = dashboardField;
const seedTopicNames: Topic[] = [
  "Password Security",
  "MFA",
  "Phishing",
  "Social Engineering",
  "Device Security",
  "Mobile Security",
  "Safe Browsing",
  "Privacy",
  "Social Media",
  "Online Banking",
  "Backups",
];

export function AdminDashboardPage() {
  const awareness = useAwarenessSummary();
  const quizSummary = useAdminQuizSummary();
  const dashboard = useAdminDashboard();
  const metrics = [
    {
      label: "Total learners",
      value: dashboard.data?.users ?? 0,
      icon: <Users />,
      tone: "violet" as const,
    },
    {
      label: "Active learners",
      value: dashboard.data?.activeLearners ?? 0,
      icon: <CircleUserRound />,
      tone: "success" as const,
    },
    {
      label: "Lessons published",
      value: dashboard.data?.publishedLessons ?? 0,
      icon: <BookOpen />,
    },
    {
      label: "Quiz attempts",
      value: quizSummary.data?.attempts ?? 0,
      icon: <FileCheck2 />,
      tone: "ember" as const,
    },
    {
      label: "Average quiz score",
      value: `${quizSummary.data?.averageScore ?? 0}%`,
      icon: <Activity />,
    },
    {
      label: "Lessons completed",
      value: dashboard.data?.completedLessons ?? 0,
      icon: <GraduationCap />,
    },
  ];
  return (
    <div className="container-ncap max-w-[1400px] py-2">
      {dashboard.isPending && <p role="status">Loading administration metrics…</p>}
      {dashboard.isError && (
        <p role="alert">Administration metrics are unavailable. Please refresh.</p>
      )}
      <PageHeader
        eyebrow="Administration"
        title="Overview"
        description="Monitor learning activity, content readiness, and assessment engagement."
      />
      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map((m) => (
          <StatCard key={m.label} {...m} />
        ))}
      </section>
      <Suspense fallback={<ChartLoading />}>
        <AdminDashboardCharts
          quizTrend={quizSummary.data?.trend ?? []}
          topicEngagement={dashboard.data?.topicEngagement ?? []}
        />
      </Suspense>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_.8fr]">
        <div className="rounded-xl border bg-white p-6">
          <SectionHeading title="Recent activity" />
          <div className="grid gap-1">
            {(dashboard.data?.recentActivity ?? []).map((a) => (
              <div key={a.id} className="flex gap-3 rounded-lg p-3 hover:bg-muted">
                <span className="mt-1.5 size-2 rounded-full bg-violet" />
                <div>
                  <p className="text-sm font-medium">{a.label}</p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">{a.at}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-white p-6">
          <SectionHeading title="Content overview" />
          <div className="grid gap-3">
            {[
              ["Published lessons", dashboard.data?.publishedLessons ?? 0],
              ["Draft lessons", dashboard.data?.draftLessons ?? 0],
              ["Published articles", awareness.data?.kinds.articles?.count ?? "—"],
              ["Question bank", quizSummary.data?.publishedQuestions ?? 0],
              ["Active announcements", dashboard.data?.announcements ?? 0],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between border-b pb-3 text-sm last:border-0"
              >
                <span className="text-muted-foreground">{label}</span>
                <strong className="font-mono">{value}</strong>
              </div>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <AppLink href="/admin/lessons" className={outline}>
              Manage content
            </AppLink>
            <AppLink href="/admin/questions" className={primary}>
              Question bank
            </AppLink>
          </div>
        </div>
      </section>
    </div>
  );
}
function ChartLoading() {
  return (
    <section
      className="mt-6 grid gap-6 xl:grid-cols-2"
      aria-busy="true"
      aria-label="Loading charts"
    >
      {[0, 1].map((item) => (
        <div key={item} className="h-[340px] animate-pulse rounded-xl border bg-muted" />
      ))}
    </section>
  );
}

export function AdminTopicsPage() {
  const store = useNcap();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<TopicRecord | "new" | null>(null);
  const [name, setName] = useState("");
  const open = (value: TopicRecord | "new") => {
    setEditing(value);
    setName(value === "new" ? "" : value.name);
  };
  const filtered = store.topics.filter((topic) =>
    topic.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  const referenced = (topic: TopicRecord) => {
    const name = topic.name;
    return (
      store.lessons.some((item) => item.topic === name) ||
      store.questions.some((item) => item.topic === name)
    );
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    const value = normalizeTopicName(name);
    const original = editing === "new" ? undefined : (editing ?? undefined);
    if (!value) {
      toast.error("Topic name is required.");
      return;
    }
    if (isDuplicateTopic(store.topics, value, original?.id)) {
      toast.error("A topic with this name already exists.");
      return;
    }
    const slug = topicSlug(value);
    if (store.topics.some((topic) => topic.id !== original?.id && topic.slug === slug)) {
      toast.error("Choose a topic name with a unique URL slug.");
      return;
    }
    if (
      original &&
      original.name !== value &&
      store.modules.some((module) => module.topic === original.name)
    ) {
      toast.error("A topic assigned to a Foundation module cannot be renamed in this release.");
      return;
    }
    const now = new Date().toISOString().slice(0, 10);
    const next: TopicRecord = {
      id: original?.id ?? `topic-${crypto.randomUUID()}`,
      name: value as Topic,
      slug,
      status: original?.status ?? "Active",
      createdAt: original?.createdAt ?? now,
      updatedAt: now,
    };
    store.setTopics(
      original
        ? store.topics.map((topic) => (topic.id === original.id ? next : topic))
        : [...store.topics, next],
    );
    if (original && original.name !== next.name) {
      store.setLessons(
        store.lessons.map((item) =>
          item.topic === original.name ? { ...item, topic: next.name } : item,
        ),
      );
      store.setQuestions(
        store.questions.map((item) =>
          item.topic === original.name ? { ...item, topic: next.name } : item,
        ),
      );
    }
    store.logActivity("admin", `${original ? "Updated" : "Created"} topic “${next.name}”`);
    toast.success(original ? "Topic updated" : "Topic created");
    setEditing(null);
  };
  const remove = (topic: TopicRecord) => {
    if (referenced(topic)) {
      store.setTopics(
        store.topics.map((item) =>
          item.id === topic.id
            ? { ...item, status: "Inactive", updatedAt: new Date().toISOString().slice(0, 10) }
            : item,
        ),
      );
      toast.info("Referenced topics are deactivated instead of deleted.");
      return;
    }
    if (!window.confirm(`Delete the unreferenced topic “${topic.name}”?`)) return;
    store.setTopics(store.topics.filter((item) => item.id !== topic.id));
    toast.success("Topic deleted");
  };
  return (
    <div className="container-ncap max-w-6xl py-2">
      <PageHeader
        eyebrow="Administration · Taxonomy"
        title="Topics"
        description="Maintain the topic taxonomy used by learning, quizzes, search, and reports. Awareness topics are maintained on each resource."
        actions={
          <button className={primary} onClick={() => open("new")}>
            <Plus />
            Create topic
          </button>
        }
      />
      <FilterToolbar>
        <DashboardSearchInput value={search} onChange={setSearch} placeholder="Search topics…" />
        <span className="text-sm text-muted-foreground">{filtered.length} topics</span>
      </FilterToolbar>
      <div className="mt-4 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3">Topic</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Usage</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((topic) => (
              <tr key={topic.id} className="border-t">
                <td className="px-4 py-4 font-semibold">{topic.name}</td>
                <td className="px-4 py-4 font-mono text-xs">{topic.slug}</td>
                <td className="px-4 py-4">{referenced(topic) ? "In use" : "Unreferenced"}</td>
                <td className="px-4 py-4">
                  <StatusBadge value={topic.status} />
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      className={iconBtn}
                      onClick={() => open(topic)}
                      aria-label={`Edit ${topic.name}`}
                    >
                      <Edit3 className="size-4" />
                    </button>
                    <button
                      className={cn(iconBtn, "text-destructive")}
                      onClick={() => remove(topic)}
                      aria-label={`${referenced(topic) ? "Deactivate" : "Delete"} ${topic.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-6">
            <EmptyState
              title="No topics found"
              description="Adjust the search or create a topic."
            />
          </div>
        )}
      </div>
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Create" : "Edit"} topic</DialogTitle>
            <DialogDescription>
              Names must remain unique across the shared taxonomy.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="grid gap-4">
            <label className="text-sm font-semibold">
              Topic name *
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                className={field}
                list="ncap-topic-options"
              />
            </label>
            <datalist id="ncap-topic-options">
              {seedTopicNames.map((topic) => (
                <option key={topic} value={topic} />
              ))}
            </datalist>
            <DialogFooter>
              <button type="button" className={outline} onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className={primary}>Save topic</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type ContentKind = "lessons" | "articles" | "posters" | "infographics" | "questions";
export function AdminContentPage({ kind }: { kind: ContentKind }) {
  const s = useNcap();
  const repository = useRepository();
  const saveLesson = useSaveRepositoryRecord(repository, "lessons");
  const deleteLesson = useRemoveRepositoryRecord(repository, "lessons");
  const queryClient = useQueryClient();
  const [reordering, setReordering] = useState(false);
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);
  const [previewAnswers, setPreviewAnswers] = useState<Record<number, number>>({});
  const moveLesson = async (lesson: Lesson, direction: -1 | 1) => {
    const siblings = s.lessons
      .filter((l) => l.moduleId === lesson.moduleId)
      .sort((a, b) => a.order - b.order);
    const index = siblings.findIndex((l) => l.id === lesson.id);
    const other = siblings[index + direction];
    if (!other) return;
    setReordering(true);
    try {
      await repository.lessons.replace([
        { ...lesson, order: other.order },
        { ...other, order: lesson.order },
      ]);
      await queryClient.invalidateQueries({ queryKey: ["repository", "lessons"] });
      toast.success("Lesson order updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lesson order could not be updated.");
    } finally {
      setReordering(false);
    }
  };
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [editing, setEditing] = useState<
    Lesson | Article | Poster | Infographic | QuizQuestion | "new" | null
  >(null);
  const config = {
    lessons: {
      title: "Lessons",
      description: "Create and maintain structured learning content.",
      items: s.lessons,
    },
    articles: {
      title: "Articles",
      description: "Manage public cybersecurity awareness articles.",
      items: s.articles,
    },
    posters: {
      title: "Posters",
      description: "Manage local downloadable awareness assets and metadata.",
      items: s.posters,
    },
    infographics: {
      title: "Infographics",
      description: "Manage accessible visual explainers and downloadable image assets.",
      items: s.infographics,
    },
    questions: {
      title: "Question bank",
      description: "Maintain robust assessment questions and answer explanations.",
      items: s.questions,
    },
  }[kind];
  const items = config.items.filter(
    (item) =>
      (status === "All" || item.status === status) &&
      ("title" in item ? item.title : (item as QuizQuestion).prompt)
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const remove = (id: string) => {
    if (kind === "lessons") {
      if (!window.confirm("Delete this lesson and its saved progress?")) return;
      const lesson = s.lessons.find((l) => l.id === id);
      void deleteLesson
        .mutateAsync({ id, version: lesson?.version })
        .then(() => toast.success("Lesson deleted"))
        .catch((error) => toast.error(error.message));
      return;
    }
    if (!window.confirm("Delete this demo record? This action updates browser state only.")) return;
    const record = config.items.find((item) => item.id === id);
    if (record && "image" in record && record.image?.status === "local-demo") {
      void DemoMediaService.remove(record.image).catch(() => undefined);
    }
    if (record && "video" in record && record.video?.kind === "upload") {
      const videoAsset = record.video.asset;
      const usedElsewhere = s.lessons.some(
        (lesson) =>
          lesson.id !== record.id &&
          lesson.video?.kind === "upload" &&
          lesson.video.asset.id === videoAsset.id,
      );
      if (!usedElsewhere) void LearningMediaService.remove(videoAsset).catch(() => undefined);
    }
    if (kind === "articles") s.setArticles(s.articles.filter((x) => x.id !== id));
    if (kind === "posters") s.setPosters(s.posters.filter((x) => x.id !== id));
    if (kind === "infographics") s.setInfographics(s.infographics.filter((x) => x.id !== id));
    if (kind === "questions") s.setQuestions(s.questions.filter((x) => x.id !== id));
    toast.success("Demo record deleted");
  };
  const toggle = (item: Lesson | Article | Poster | Infographic | QuizQuestion) => {
    const nextStatus = item.status === "Published" ? "Draft" : "Published";
    if (kind === "lessons" && nextStatus === "Published") {
      const lesson = item as Lesson;
      const parsedVideo = lesson.video ? lessonVideoSchema.safeParse(lesson.video) : null;
      if (parsedVideo && (!parsedVideo.success || !parsedVideo.data.transcript.trim())) {
        toast.error("Add a valid video and transcript before publishing this video lesson.");
        return;
      }
    }
    const next = {
      ...item,
      status: nextStatus,
    } as typeof item;
    if (kind === "lessons") {
      void saveLesson
        .mutateAsync(next as Lesson)
        .then(() => toast.success(`Lesson ${nextStatus.toLowerCase()}`))
        .catch((error) => toast.error(error.message));
      return;
    }
    if (kind === "articles")
      s.setArticles(s.articles.map((x) => (x.id === item.id ? (next as Article) : x)));
    if (kind === "posters")
      s.setPosters(s.posters.map((x) => (x.id === item.id ? (next as Poster) : x)));
    if (kind === "infographics")
      s.setInfographics(s.infographics.map((x) => (x.id === item.id ? (next as Infographic) : x)));
    if (kind === "questions")
      s.setQuestions(s.questions.map((x) => (x.id === item.id ? (next as QuizQuestion) : x)));
    toast.success(`Record ${nextStatus.toLowerCase()}`);
  };
  const duplicate = (item: Lesson) => {
    const order =
      Math.max(0, ...s.lessons.filter((l) => l.moduleId === item.moduleId).map((l) => l.order)) + 1;
    void saveLesson
      .mutateAsync({
        ...item,
        id: `l-${crypto.randomUUID()}`,
        version: undefined,
        title: `${item.title.slice(0, 153)} (Copy)`,
        order,
        status: "Draft",
      })
      .then(() => toast.success("Lesson duplicated as draft"))
      .catch((error) => toast.error(error.message));
  };
  return (
    <div className="container-ncap max-w-[1400px] py-2">
      <PageHeader
        eyebrow={`Administration · ${config.title}`}
        title={config.title}
        description={config.description}
        actions={
          <button className={primary} onClick={() => setEditing("new")}>
            <Plus />
            Add {kind === "questions" ? "question" : kind.slice(0, -1)}
          </button>
        }
      />
      <FilterToolbar>
        <DashboardSearchInput value={search} onChange={setSearch} placeholder={`Search ${kind}…`} />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-11 rounded-lg border bg-white px-3"
        >
          <option>All</option>
          <option>Published</option>
          <option>Draft</option>
        </select>
        <span className="ml-auto text-sm text-muted-foreground">{items.length} records</span>
      </FilterToolbar>
      <div className="mt-4 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">
                {kind === "questions" ? "Question" : kind === "lessons" ? "Lesson" : "Title"}
              </th>
              <th className="px-4 py-3">
                {kind === "lessons" ? "Module" : kind === "articles" ? "Category" : "Topic"}
              </th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((raw) => {
              const item = raw as Lesson | Article | Poster | Infographic | QuizQuestion;
              const title = "title" in item ? item.title : item.prompt;
              const topic = "topic" in item ? item.topic : "category" in item ? item.category : "";
              const details =
                kind === "lessons"
                  ? `${(item as Lesson).video ? "Video · " : ""}${(item as Lesson).difficulty} · ${(item as Lesson).minutes} min`
                  : kind === "articles"
                    ? `${(item as Article).author} · ${(item as Article).readingMinutes} min`
                    : kind === "posters"
                      ? (item as Poster).format
                      : kind === "infographics"
                        ? `${(item as Infographic).points.length} key points`
                        : `${(item as QuizQuestion).difficulty} · ${s.modules.find((m) => m.id === (item as QuizQuestion).moduleId)?.title}`;
              return (
                <tr key={item.id} className="border-t hover:bg-muted/40">
                  <td className="max-w-md px-4 py-4 font-semibold">
                    <span className="line-clamp-2">{title}</span>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {kind === "lessons"
                      ? s.modules.find((m) => m.id === (item as Lesson).moduleId)?.title
                      : topic}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{details}</td>
                  <td className="px-4 py-4">
                    <StatusBadge value={item.status ?? "Draft"} />
                  </td>
                  <td className="px-4 py-4 font-mono text-xs text-muted-foreground">
                    {"updatedAt" in item
                      ? item.updatedAt
                      : "publishedAt" in item
                        ? item.publishedAt
                        : "Demo"}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        className={iconBtn}
                        disabled={saveLesson.isPending || deleteLesson.isPending}
                        onClick={() => setEditing(item)}
                        aria-label={`Edit ${title}`}
                      >
                        <Edit3 className="size-4" />
                      </button>
                      <button
                        className={iconBtn}
                        disabled={saveLesson.isPending || deleteLesson.isPending}
                        onClick={() => toggle(item)}
                        aria-label={`${item.status === "Published" ? "Unpublish" : "Publish"} ${title}`}
                      >
                        <Check className="size-4" />
                      </button>
                      {kind === "lessons" && (
                        <>
                          <button
                            className={iconBtn}
                            disabled={saveLesson.isPending || deleteLesson.isPending}
                            onClick={() => {
                              setPreviewAnswers({});
                              setPreviewLesson(item as Lesson);
                            }}
                            aria-label={`Preview ${title}`}
                          >
                            <Eye className="size-4" />
                          </button>
                          <button
                            className={iconBtn}
                            disabled={
                              reordering ||
                              !s.lessons.some(
                                (l) =>
                                  l.moduleId === (item as Lesson).moduleId &&
                                  l.order < (item as Lesson).order,
                              )
                            }
                            onClick={() => void moveLesson(item as Lesson, -1)}
                            aria-label={`Move ${title} up`}
                          >
                            <ArrowUp className="size-4" />
                          </button>
                          <button
                            className={iconBtn}
                            disabled={
                              reordering ||
                              !s.lessons.some(
                                (l) =>
                                  l.moduleId === (item as Lesson).moduleId &&
                                  l.order > (item as Lesson).order,
                              )
                            }
                            onClick={() => void moveLesson(item as Lesson, 1)}
                            aria-label={`Move ${title} down`}
                          >
                            <ArrowDown className="size-4" />
                          </button>
                          <button
                            className={iconBtn}
                            onClick={() => duplicate(item as Lesson)}
                            aria-label={`Duplicate ${title}`}
                          >
                            <FileText className="size-4" />
                          </button>
                        </>
                      )}
                      <button
                        className={cn(iconBtn, "hover:border-destructive hover:text-destructive")}
                        disabled={saveLesson.isPending || deleteLesson.isPending}
                        onClick={() => remove(item.id)}
                        aria-label={`Delete ${title}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="p-6">
            <EmptyState
              title={`No ${kind} found`}
              description="Adjust search or create a new record."
            />
          </div>
        )}
      </div>
      <Dialog open={!!previewLesson} onOpenChange={(open) => !open && setPreviewLesson(null)}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview {previewLesson?.title}</DialogTitle>
            <DialogDescription>{previewLesson?.summary}</DialogDescription>
          </DialogHeader>
          {previewLesson && (
            <article>
              {previewLesson.video && (
                <LessonVideoPlayer
                  lessonId={previewLesson.id}
                  learnerKey="administrator-preview"
                  title={previewLesson.title}
                  video={previewLesson.video}
                  preview
                />
              )}
              {previewLesson.blocks.map((block, index) => (
                <LessonBlockView
                  key={index}
                  block={block}
                  selected={previewAnswers[index]}
                  onSelect={(answer) =>
                    setPreviewAnswers((values) => ({ ...values, [index]: answer }))
                  }
                />
              ))}
            </article>
          )}
        </DialogContent>
      </Dialog>
      <ContentEditor
        key={editing === "new" ? "new" : (editing?.id ?? "closed")}
        kind={kind}
        value={editing}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function ContentEditor({
  kind,
  value,
  onClose,
}: {
  kind: ContentKind;
  value: Lesson | Article | Poster | Infographic | QuizQuestion | "new" | null;
  onClose: () => void;
}) {
  const s = useNcap();
  const repository = useRepository();
  const saveLesson = useSaveRepositoryRecord(repository, "lessons");
  const original = value === "new" ? null : value;
  const [title, setTitle] = useState(
    original ? ("title" in original ? original.title : original.prompt) : "",
  );
  const [summary, setSummary] = useState(original && "summary" in original ? original.summary : "");
  const [topic, setTopic] = useState<Topic>(
    original && "topic" in original
      ? original.topic
      : kind === "lessons"
        ? (s.topics.find((t) => t.status === "Active")?.name ?? "")
        : "Phishing",
  );
  const [status, setStatus] = useState<"Published" | "Draft">(original?.status ?? "Draft");
  const [moduleId, setModuleId] = useState(
    original && "moduleId" in original ? original.moduleId : (s.modules[0]?.id ?? ""),
  );
  const [difficulty, setDifficulty] = useState<"Beginner" | "Intermediate" | "Advanced">(
    original && "difficulty" in original ? original.difficulty : "Beginner",
  );
  const [lessonMinutes, setLessonMinutes] = useState(
    original && "minutes" in original ? original.minutes : 10,
  );
  const [lessonOrder, setLessonOrder] = useState(
    original && "order" in original
      ? original.order
      : Math.max(
          0,
          ...s.lessons
            .filter((lesson) => lesson.moduleId === s.modules[0]?.id)
            .map((lesson) => lesson.order),
        ) + 1,
  );
  const [author, setAuthor] = useState(
    original && "author" in original ? original.author : "NCAP Editorial Team",
  );
  const [readingMinutes, setReadingMinutes] = useState(
    original && "readingMinutes" in original ? original.readingMinutes : 5,
  );
  const [publishedAt, setPublishedAt] = useState(
    original && "publishedAt" in original
      ? original.publishedAt
      : new Date().toISOString().slice(0, 10),
  );
  const [options, setOptions] = useState<string[]>(
    original && "options" in original ? original.options : ["", "", "", ""],
  );
  const [correct, setCorrect] = useState(
    original && "correctIndex" in original ? original.correctIndex : 0,
  );
  const [explanation, setExplanation] = useState(
    original && "explanation" in original ? original.explanation : "",
  );
  const [objectivesText, setObjectivesText] = useState(
    original && "objectives" in original
      ? original.objectives.join("\n")
      : "Apply this guidance in an everyday situation",
  );
  const [lessonBlocks, setLessonBlocks] = useState<LessonBlock[]>(
    original && "blocks" in original
      ? [...original.blocks]
      : [{ kind: "paragraph", text: "Add clear lesson content here." }],
  );
  const [lessonVideo, setLessonVideo] = useState<LessonVideo | undefined>(
    original && "video" in original ? original.video : undefined,
  );
  const [videoBusy, setVideoBusy] = useState(false);
  const [articleBody, setArticleBody] = useState(
    original && "body" in original ? original.body.join("\n\n") : "",
  );
  const [media, setMedia] = useState<MediaAsset | undefined>(
    original && "image" in original ? original.image : undefined,
  );
  const originalMedia = original && "image" in original ? original.image : undefined;
  const originalVideo = original && "video" in original ? original.video : undefined;
  const originalVideoAsset = originalVideo?.kind === "upload" ? originalVideo.asset : undefined;
  const mediaRef = useRef(media);
  const lessonVideoRef = useRef(lessonVideo);
  const committed = useRef(false);
  useEffect(() => {
    mediaRef.current = media;
  }, [media]);
  useEffect(() => {
    lessonVideoRef.current = lessonVideo;
  }, [lessonVideo]);
  useEffect(
    () => () => {
      const pending = mediaRef.current;
      if (
        !committed.current &&
        pending?.status === "local-demo" &&
        pending.id !== originalMedia?.id
      ) {
        void DemoMediaService.remove(pending).catch(() => undefined);
      }
    },
    [originalMedia?.id],
  );
  useEffect(
    () => () => {
      const pending = lessonVideoRef.current;
      if (
        !committed.current &&
        pending?.kind === "upload" &&
        pending.asset.status === "ready" &&
        pending.asset.id !== originalVideoAsset?.id
      ) {
        void LearningMediaService.remove(pending.asset).catch(() => undefined);
      }
    },
    [originalVideoAsset?.id],
  );
  const changeMedia = (next: MediaAsset | undefined) => {
    if (media?.status === "local-demo" && media.id !== originalMedia?.id && media.id !== next?.id) {
      void DemoMediaService.remove(media).catch(() => undefined);
    }
    setMedia(next);
  };
  const changeLessonVideo = (next: LessonVideo | undefined) => {
    const currentAsset = lessonVideo?.kind === "upload" ? lessonVideo.asset : undefined;
    const nextAsset = next?.kind === "upload" ? next.asset : undefined;
    if (
      currentAsset?.status === "ready" &&
      currentAsset.id !== originalVideoAsset?.id &&
      currentAsset.id !== nextAsset?.id
    ) {
      void LearningMediaService.remove(currentAsset).catch(() => undefined);
    }
    setLessonVideo(next);
    lessonVideoRef.current = next;
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (videoBusy) {
      toast.error("Wait for the video to finish preparing before saving.");
      return;
    }
    if (!title.trim()) {
      toast.error(kind === "questions" ? "Question is required" : "Title is required");
      return;
    }
    if ((kind === "lessons" || kind === "questions") && !moduleId) {
      toast.error("Create a learning module before adding linked content.");
      return;
    }
    if (
      status === "Published" &&
      (kind === "posters" || kind === "infographics") &&
      !media &&
      !(original && "file" in original && original.file)
    ) {
      toast.error("Add an image before publishing this visual resource.");
      return;
    }
    if (status === "Published" && !summary.trim() && kind !== "questions") {
      toast.error(
        kind === "infographics"
          ? "Add at least one accessible key point before publishing."
          : "Add a summary or description before publishing.",
      );
      return;
    }
    if (kind === "articles" && status === "Published" && !articleBody.trim()) {
      toast.error("Add the article body before publishing.");
      return;
    }
    const id =
      original?.id ??
      `${kind.slice(0, 2)}-${kind === "lessons" ? crypto.randomUUID() : Date.now()}`;
    if (kind === "lessons") {
      const parsedBlocks = lessonBlocksSchema.safeParse(lessonBlocks);
      if (!parsedBlocks.success) {
        const issue = parsedBlocks.error.issues[0];
        const blockIndex = issue?.path[0];
        toast.error(
          typeof blockIndex === "number"
            ? `Content block ${blockIndex + 1}: ${issue?.path[1] ?? "content"} — ${issue?.message}`
            : (issue?.message ?? "Review the lesson content fields before saving."),
        );
        return;
      }
      const parsedVideo = lessonVideo ? lessonVideoSchema.safeParse(lessonVideo) : null;
      if (parsedVideo && !parsedVideo.success) {
        toast.error(parsedVideo.error.issues[0]?.message ?? "Review the lesson video settings.");
        return;
      }
      if (status === "Published" && parsedVideo?.data && !parsedVideo.data.transcript.trim()) {
        toast.error("Add a video transcript before publishing this video lesson.");
        return;
      }
      const item: Lesson = {
        version: original && "version" in original ? original.version : undefined,
        topicId: s.topics.find((t) => t.name === topic)?.id,
        id,
        moduleId,
        title,
        summary: summary || "A practical cybersecurity learning lesson.",
        topic,
        difficulty,
        minutes: Math.max(1, Math.round(lessonMinutes)),
        order: Math.max(1, Math.round(lessonOrder)),
        status,
        updatedAt: new Date().toISOString().slice(0, 10),
        objectives: objectivesText
          .split(/\r?\n/)
          .map((objective) => objective.trim())
          .filter(Boolean),
        blocks: parsedBlocks.data,
        ...(parsedVideo?.data ? { video: parsedVideo.data } : {}),
      };
      try {
        await saveLesson.mutateAsync(item);
        committed.current = true;
        toast.success(original ? "Lesson updated" : "Lesson created");
        onClose();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Lesson could not be saved.");
      }
      return;
    }
    if (kind === "articles") {
      const baseSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const slug =
        original && "slug" in original
          ? original.slug
          : s.articles.some((article) => article.slug === baseSlug)
            ? `${baseSlug}-${id.slice(-6)}`
            : baseSlug;
      const item: Article = {
        id,
        slug,
        title,
        category: topic,
        summary: summary || "Practical public awareness guidance.",
        author: author.trim() || "NCAP Editorial Team",
        readingMinutes: Math.max(1, Math.round(readingMinutes)),
        publishedAt,
        status,
        body: articleBody
          .split(/\n\s*\n/)
          .map((paragraph) => paragraph.trim())
          .filter(Boolean).length
          ? articleBody
              .split(/\n\s*\n/)
              .map((paragraph) => paragraph.trim())
              .filter(Boolean)
          : [summary || "Add article content using clear structured paragraphs."],
        image: media,
        imageUrl: original && "imageUrl" in original ? original.imageUrl : undefined,
      };
      s.setArticles(
        original ? s.articles.map((x) => (x.id === id ? item : x)) : [...s.articles, item],
      );
    }
    if (kind === "posters") {
      const item: Poster = {
        id,
        title,
        topic,
        description: summary || "Printable cybersecurity awareness resource.",
        format:
          media?.mimeType === "image/png"
            ? "PNG"
            : media?.mimeType === "image/webp"
              ? "WEBP"
              : media
                ? "JPEG"
                : "SVG",
        file: original && "file" in original ? original.file : "",
        status,
        image: media,
      };
      s.setPosters(
        original ? s.posters.map((x) => (x.id === id ? item : x)) : [...s.posters, item],
      );
    }
    if (kind === "infographics") {
      const item: Infographic = {
        id,
        title,
        category: topic,
        alt: media?.altText ?? (summary || `${title} cybersecurity infographic`),
        points: summary
          ? summary
              .split(/\r?\n/)
              .map((point) => point.trim())
              .filter(Boolean)
          : ["Add concise accessible key points for this infographic."],
        file: original && "file" in original ? original.file : "",
        status,
        image: media,
      };
      s.setInfographics(
        original ? s.infographics.map((x) => (x.id === id ? item : x)) : [...s.infographics, item],
      );
    }
    if (kind === "questions") {
      const validOptions = options
        .map((text, originalIndex) => ({ text: text.trim(), originalIndex }))
        .filter((option) => option.text);
      if (validOptions.length < 2) {
        toast.error("Add at least two valid answer choices");
        return;
      }
      const correctIndex = validOptions.findIndex((option) => option.originalIndex === correct);
      if (correctIndex < 0) {
        toast.error("Choose a non-empty answer as the correct choice");
        return;
      }
      if (!explanation.trim()) {
        toast.error("An answer explanation is required");
        return;
      }
      const item: QuizQuestion = {
        id,
        moduleId,
        topic,
        difficulty,
        prompt: title,
        options: validOptions.map((option) => option.text),
        correctIndex,
        explanation,
        status,
      };
      s.setQuestions(
        original ? s.questions.map((x) => (x.id === id ? item : x)) : [...s.questions, item],
      );
    }
    committed.current = true;
    if (originalMedia?.status === "local-demo" && originalMedia.id !== media?.id) {
      void DemoMediaService.remove(originalMedia).catch(() => undefined);
    }
    const savedVideoAsset = lessonVideo?.kind === "upload" ? lessonVideo.asset : undefined;
    if (
      originalVideoAsset?.status === "ready" &&
      originalVideoAsset.id !== savedVideoAsset?.id &&
      !s.lessons.some(
        (lesson) =>
          lesson.id !== original?.id &&
          lesson.video?.kind === "upload" &&
          lesson.video.asset.storageKey === originalVideoAsset.storageKey,
      )
    ) {
      void LearningMediaService.remove(originalVideoAsset).catch(() => undefined);
    }
    toast.success(original ? "Demo record updated" : "Demo record created");
    onClose();
  };
  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={cn(
          "max-h-[92vh] overflow-y-auto",
          kind === "lessons" ? "max-w-4xl" : "max-w-2xl",
        )}
      >
        <DialogHeader>
          <DialogTitle>
            {original ? "Edit" : "Add"} {kind === "questions" ? "question" : kind.slice(0, -1)}
          </DialogTitle>
          <DialogDescription>
            {kind === "lessons"
              ? "Changes are saved securely to the Learning catalogue."
              : "Changes remain in browser-local demonstration state."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid min-w-0 gap-4">
          <label className="text-sm font-semibold">
            {kind === "questions" ? "Question" : "Title"} *
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 min-h-20 w-full rounded-lg border p-3"
            />
          </label>
          {kind !== "questions" && (
            <label className="text-sm font-semibold">
              {kind === "lessons"
                ? "Summary and content introduction"
                : kind === "posters"
                  ? "Description / accessible alt-text basis"
                  : kind === "infographics"
                    ? "Accessible key points (one per line)"
                    : "Summary"}
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="mt-1.5 min-h-24 w-full rounded-lg border p-3"
              />
            </label>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {(kind === "lessons" || kind === "questions") && (
              <label className="text-sm font-semibold">
                Module
                <select
                  value={moduleId}
                  onChange={(e) => {
                    const nextModuleId = e.target.value;
                    setModuleId(nextModuleId);
                    if (kind === "lessons")
                      setLessonOrder(
                        Math.max(
                          0,
                          ...s.lessons
                            .filter(
                              (lesson) =>
                                lesson.moduleId === nextModuleId && lesson.id !== original?.id,
                            )
                            .map((lesson) => lesson.order),
                        ) + 1,
                      );
                  }}
                  className={field}
                >
                  {s.modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {kind === "lessons" && (
              <>
                <label className="text-sm font-semibold">
                  Estimated minutes
                  <input
                    type="number"
                    min={1}
                    max={600}
                    value={lessonMinutes}
                    onChange={(event) => setLessonMinutes(event.target.valueAsNumber || 1)}
                    className={field}
                  />
                </label>
                <label className="text-sm font-semibold">
                  Lesson order
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={lessonOrder}
                    onChange={(event) => setLessonOrder(event.target.valueAsNumber || 1)}
                    className={field}
                  />
                </label>
              </>
            )}
            <label className="text-sm font-semibold">
              Topic
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value as Topic)}
                className={field}
              >
                {s.topics
                  .filter((item) => item.status === "Active" || item.name === topic)
                  .map((item) => (
                    <option key={item.id}>{item.name}</option>
                  ))}
              </select>
            </label>
            {(kind === "lessons" || kind === "questions") && (
              <label className="text-sm font-semibold">
                Difficulty
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
                  className={field}
                >
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </label>
            )}
            <label className="text-sm font-semibold">
              Status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                className={field}
              >
                <option>Draft</option>
                <option>Published</option>
              </select>
            </label>
          </div>
          {kind === "lessons" && (
            <>
              <label className="text-sm font-semibold">
                Learning objectives (one per line)
                <textarea
                  value={objectivesText}
                  onChange={(event) => setObjectivesText(event.target.value)}
                  className="mt-1.5 min-h-24 w-full rounded-lg border p-3 font-mono text-sm"
                />
              </label>
              <LessonVideoField
                value={lessonVideo}
                onChange={changeLessonVideo}
                onBusyChange={setVideoBusy}
              />
              <LessonContentBuilder blocks={lessonBlocks} onChange={setLessonBlocks} />
            </>
          )}
          {kind === "articles" && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="text-sm font-semibold sm:col-span-1">
                  Author
                  <input
                    value={author}
                    onChange={(event) => setAuthor(event.target.value)}
                    maxLength={100}
                    className={field}
                  />
                </label>
                <label className="text-sm font-semibold">
                  Reading minutes
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={readingMinutes}
                    onChange={(event) => setReadingMinutes(event.target.valueAsNumber || 1)}
                    className={field}
                  />
                </label>
                <label className="text-sm font-semibold">
                  Publication date
                  <input
                    type="date"
                    value={publishedAt}
                    onChange={(event) => setPublishedAt(event.target.value)}
                    className={field}
                  />
                </label>
              </div>
              <label className="text-sm font-semibold">
                Article body *
                <textarea
                  value={articleBody}
                  onChange={(event) => setArticleBody(event.target.value)}
                  className="mt-1.5 min-h-48 w-full rounded-lg border p-3"
                  placeholder="Separate paragraphs with a blank line."
                />
              </label>
            </>
          )}
          {(kind === "articles" || kind === "posters" || kind === "infographics") && (
            <MediaField
              label={
                kind === "articles"
                  ? "Article image"
                  : kind === "posters"
                    ? "Poster image"
                    : "Infographic image"
              }
              asset={media}
              fallbackUrl={
                original && "file" in original
                  ? original.file
                  : original && "imageUrl" in original
                    ? original.imageUrl
                    : undefined
              }
              initialAlt={original && "alt" in original ? original.alt : summary}
              guidance={
                kind === "articles"
                  ? "A 16:9 landscape image is recommended."
                  : "Use a clear layout that remains legible when scaled."
              }
              onChange={changeMedia}
            />
          )}
          {kind === "questions" && (
            <>
              <fieldset>
                <legend className="text-sm font-semibold">Answer choices *</legend>
                <div className="mt-2 grid gap-2">
                  {options.map((o, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correct"
                        checked={correct === i}
                        onChange={() => setCorrect(i)}
                        aria-label={`Mark answer ${i + 1} correct`}
                      />
                      <input
                        value={o}
                        onChange={(e) =>
                          setOptions((x) => x.map((v, j) => (j === i ? e.target.value : v)))
                        }
                        className="h-11 flex-1 rounded-lg border px-3"
                        placeholder={`Answer ${String.fromCharCode(65 + i)}`}
                      />
                    </div>
                  ))}
                </div>
              </fieldset>
              <label className="text-sm font-semibold">
                Explanation *
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  className="mt-1.5 min-h-24 w-full rounded-lg border p-3"
                />
              </label>
            </>
          )}
          <DialogFooter>
            <button type="button" className={outline} onClick={onClose}>
              Cancel
            </button>
            <button className={primary} disabled={videoBusy || saveLesson.isPending}>
              Save {kind === "questions" ? "question" : "record"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminCertificatesPage() {
  const store = useNcap();
  const [view, setView] = useState<"registry" | "template">("registry");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const registry = useCertificates((page - 1) * 20, moduleId || null, search);
  const settings = useCertificateTemplate();
  const [template, setTemplate] = useState<StoredCertificateTemplate>({
    title: "",
    subtitle: "",
    issuer: "",
    body: "",
    signatoryName: "",
    signatoryTitle: "",
    theme: "navy",
    version: 1,
  });
  useEffect(() => {
    if (settings.data) setTemplate(settings.data);
  }, [settings.data]);
  const rows = (registry.data?.items ?? []).map((item) => ({
    user: { id: item.userId, name: item.learnerName },
    module: { id: item.moduleId, title: item.moduleTitle },
    eligibility: item.eligibility,
    record: item.record ? { ...item.record, issuedAt: item.record.issued_at } : null,
  }));
  const saveTemplate = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await settings.save.mutateAsync(template);
      toast.success("Certificate template saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save template.");
    }
  };
  const issue = async (userId: string, moduleId: string) => {
    try {
      await registry.issue.mutateAsync({ userId, moduleId });
      toast.success("Certificate issued");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to issue certificate.");
    }
  };
  const revoke = async (id: string) => {
    const reason = window.prompt("Reason for revoking this certificate:");
    if (!reason?.trim()) return;
    try {
      await registry.revoke.mutateAsync({ id, reason });
      toast.success("Certificate revoked");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to revoke certificate.");
    }
  };
  return (
    <div className="container-ncap max-w-[1400px] py-2">
      <PageHeader
        eyebrow="Administration · Certificates"
        title="Certificate management"
        description="Use one policy for learner eligibility, issuance records, and the print-friendly template."
        actions={
          <div className="flex gap-2">
            <button
              className={view === "registry" ? primary : outline}
              onClick={() => setView("registry")}
            >
              <FileCheck2 />
              Registry
            </button>
            <button
              className={view === "template" ? primary : outline}
              onClick={() => setView("template")}
            >
              <Settings />
              Template
            </button>
          </div>
        }
      />
      {(registry.isPending || settings.isPending) && (
        <p role="status" className="mt-4">
          Loading certificates…
        </p>
      )}
      {(registry.isError || settings.isError) && (
        <p role="alert" className="mt-4">
          Certificate data unavailable. Please refresh.
        </p>
      )}
      <CertificatePreview id={preview} onClose={() => setPreview(null)} />
      {view === "registry" && (
        <FilterToolbar>
          <DashboardSearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search learners or modules…"
          />
          <select
            aria-label="Certificate module"
            className={dashboardSelect}
            value={moduleId}
            onChange={(event) => {
              setModuleId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All modules</option>
            {store.modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </FilterToolbar>
      )}
      {view === "registry" ? (
        <div className="mt-7 overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-muted">
              <tr>
                {[
                  "Learner",
                  "Module",
                  "Eligibility",
                  "Requirements",
                  "Status",
                  "Issue date",
                  "Reference",
                  "Actions",
                ].map((x) => (
                  <th key={x} className="px-4 py-3">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.user.id}:${r.module.id}`} className="border-t">
                  <td className="px-4 py-4 font-semibold">{r.user.name}</td>
                  <td className="px-4 py-4">{r.module.title}</td>
                  <td className="px-4 py-4">
                    <StatusBadge value={r.eligibility.eligible ? "Eligible" : "Not eligible"} />
                  </td>
                  <td className="px-4 py-4 text-xs">
                    <span className="block">Lessons: {r.eligibility.completionPercent}%</span>
                    <span className="block">Best quiz: {r.eligibility.bestScore}%</span>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge value={r.record?.status ?? "Pending"} />
                  </td>
                  <td className="px-4 py-4">{r.record?.issuedAt ?? "—"}</td>
                  <td className="px-4 py-4 font-mono text-xs">{r.record?.reference ?? "—"}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button
                        className={outline}
                        disabled={!r.record}
                        onClick={() => setPreview(r.record?.id ?? null)}
                      >
                        <Eye />
                        Preview
                      </button>
                      {r.record?.status === "Issued" ? (
                        <button
                          className={cn(outline, "text-destructive")}
                          disabled={registry.revoke.isPending}
                          onClick={() => void revoke(r.record!.id)}
                        >
                          Revoke
                        </button>
                      ) : (
                        <button
                          className={primary}
                          disabled={
                            !r.eligibility.eligible ||
                            registry.issue.isPending ||
                            registry.isFetching
                          }
                          onClick={() => void issue(r.user.id, r.module.id)}
                        >
                          Mark issued
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!registry.isPending && !rows.length && (
            <div className="p-6">
              <EmptyState
                title="No certificate records"
                description="Adjust the search or module filter."
              />
            </div>
          )}
          <DashboardPagination
            page={page}
            pages={Math.max(1, Math.ceil((registry.data?.total ?? 0) / 20))}
            count={registry.data?.total ?? 0}
            onPageChange={setPage}
          />
        </div>
      ) : (
        <div className="mt-7 grid gap-6 xl:grid-cols-[420px_1fr]">
          <form
            onSubmit={(event) => void saveTemplate(event)}
            className="grid content-start gap-4 rounded-xl border bg-white p-5"
          >
            <h2 className="text-xl font-semibold">Template settings</h2>
            <label className="text-sm font-semibold">
              Title *
              <input
                value={template.title}
                onChange={(event) =>
                  setTemplate((value) => ({ ...value, title: event.target.value }))
                }
                maxLength={100}
                className={field}
              />
            </label>
            <label className="text-sm font-semibold">
              Supporting text
              <input
                value={template.subtitle}
                onChange={(event) =>
                  setTemplate((value) => ({ ...value, subtitle: event.target.value }))
                }
                maxLength={160}
                className={field}
              />
            </label>
            <label className="text-sm font-semibold">
              Issuer *
              <input
                value={template.issuer}
                onChange={(event) =>
                  setTemplate((value) => ({ ...value, issuer: event.target.value }))
                }
                maxLength={100}
                className={field}
              />
            </label>
            <label className="text-sm font-semibold">
              Certificate wording *
              <textarea
                value={template.body}
                onChange={(event) =>
                  setTemplate((value) => ({ ...value, body: event.target.value }))
                }
                maxLength={320}
                className="mt-1.5 min-h-28 w-full rounded-lg border p-3"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                Signatory name
                <input
                  value={template.signatoryName}
                  onChange={(event) =>
                    setTemplate((value) => ({ ...value, signatoryName: event.target.value }))
                  }
                  className={field}
                />
              </label>
              <label className="text-sm font-semibold">
                Signatory title
                <input
                  value={template.signatoryTitle}
                  onChange={(event) =>
                    setTemplate((value) => ({ ...value, signatoryTitle: event.target.value }))
                  }
                  className={field}
                />
              </label>
            </div>
            <label className="text-sm font-semibold">
              Theme
              <select
                value={template.theme}
                onChange={(event) =>
                  setTemplate((value) => ({
                    ...value,
                    theme: event.target.value as typeof value.theme,
                  }))
                }
                className={field}
              >
                <option value="navy">NCAP navy</option>
                <option value="blue">NCAP blue</option>
                <option value="teal">NCAP teal</option>
              </select>
            </label>
            <MediaField
              label="Certificate logo"
              acceptedTypes={["image/png", "image/jpeg"]}
              storage="learning"
              asset={template.logo}
              initialAlt="NCAP certificate logo"
              guidance="Use a PNG or JPEG logo. Uploaded logos are stored securely."
              onChange={(logo) =>
                setTemplate((value) => ({ ...value, ...(logo ? { logo } : { logo: undefined }) }))
              }
            />
            <button className={primary} disabled={!settings.data || settings.save.isPending}>
              Save template
            </button>
          </form>
          <section className="rounded-xl border bg-white p-4 md:p-8">
            <div
              className={cn(
                "print-surface border-8 border-double p-8 text-center md:p-14",
                template.theme === "teal"
                  ? "border-success"
                  : template.theme === "blue"
                    ? "border-accent"
                    : "border-primary",
              )}
            >
              <ShieldCheck className="mx-auto size-12 text-primary" aria-hidden="true" />
              <p className="meta mt-5 text-primary">{template.issuer} · Template preview</p>
              <h2 className="mt-5 text-4xl font-semibold">
                {template.title || "Certificate title"}
              </h2>
              <p className="mt-3 text-muted-foreground">{template.subtitle}</p>
              <p className="mx-auto mt-8 max-w-2xl">{template.body}</p>
              <p className="mt-8 text-3xl font-semibold">Sample Learner</p>
              <p className="mt-3 text-xl">Digital Safety Fundamentals</p>
              <div className="mx-auto mt-12 max-w-xs border-t pt-2">
                <p className="font-semibold">{template.signatoryName}</p>
                <p className="text-sm text-muted-foreground">{template.signatoryTitle}</p>
              </div>
              <p className="mt-8 font-mono text-xs text-muted-foreground">
                Template preview · No certificate issued
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className={cn(outline, "no-print mt-4")}
            >
              <Printer />
              Print / Save as PDF
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

export function AdminProfilePage() {
  const store = useNcap();
  const auth = useAuth();
  const { language, setLanguage } = useI18n();
  const [profile, setProfile] = useState({
    name: store.session.name || "Demo Administrator",
    email: store.session.email || "admin@ncap.demo",
    phone: store.session.phone,
    language,
    notifications: store.session.notifications,
    avatar: store.session.avatar,
  });
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (profile.name.trim().length < 2) {
      toast.error("Enter your full name.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(profile.email.trim())) {
      toast.error("Enter a valid email address.");
      return;
    }
    const phone = phoneSchema.safeParse(profile.phone);
    if (!phone.success) {
      toast.error(phone.error.issues[0]?.message ?? "Enter a valid phone number.");
      return;
    }
    setSavingProfile(true);
    const result = await updateAccountProfile({
      data: {
        displayName: profile.name.trim(),
        language: profile.language,
        phone: profile.phone.trim(),
        notifications: profile.notifications,
      },
    });
    setSavingProfile(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    store.updateProfile({
      name: result.data.displayName,
      phone: result.data.phone,
      notifications: result.data.notifications,
      ...(profile.avatar ? { avatar: profile.avatar } : {}),
    });
    setLanguage(profile.language);
    await auth.refresh();
    store.logActivity("admin", "Updated administrator profile settings");
    toast.success("Administrator profile updated");
  };
  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = passwordSchema.safeParse(passwords.next);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Choose a stronger password.");
      return;
    }
    if (passwords.next !== passwords.confirm) {
      toast.error("New passwords do not match.");
      return;
    }
    setSavingPassword(true);
    try {
      const result = await changeAccountPassword({
        data: { currentPassword: passwords.current, newPassword: passwords.next },
      });
      if (!result.ok) throw new Error(result.message);
      setPasswords({ current: "", next: "", confirm: "" });
      toast.success("Password changed securely.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The request could not be completed.");
    } finally {
      setSavingPassword(false);
    }
  };
  return (
    <div className="container-ncap max-w-5xl py-2">
      <PageHeader
        eyebrow="Administration · Account"
        title="Profile and account settings"
        description="Manage your secure Super Administrator profile and password."
      />
      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={saveProfile}
          className="grid content-start gap-4 rounded-xl border bg-white p-6"
        >
          <h2 className="text-xl font-semibold">Profile</h2>
          <MediaField
            label="Profile picture"
            asset={profile.avatar}
            initialAlt={`${profile.name} profile picture`}
            guidance="A square image is recommended."
            onChange={(avatar) => setProfile((value) => ({ ...value, avatar }))}
          />
          <label className="text-sm font-semibold">
            Full name *
            <input
              value={profile.name}
              onChange={(event) => setProfile((value) => ({ ...value, name: event.target.value }))}
              autoComplete="name"
              maxLength={100}
              className={field}
            />
          </label>
          <label className="text-sm font-semibold">
            Email address *
            <input
              type="email"
              value={profile.email}
              readOnly
              className={cn(field, "bg-muted text-muted-foreground")}
            />
          </label>
          <label className="text-sm font-semibold">
            Phone number
            <input
              type="tel"
              value={profile.phone}
              onChange={(event) => setProfile((value) => ({ ...value, phone: event.target.value }))}
              autoComplete="tel"
              maxLength={24}
              className={field}
            />
          </label>
          <label className="text-sm font-semibold">
            Preferred language
            <select
              value={profile.language}
              onChange={(event) =>
                setProfile((value) => ({
                  ...value,
                  language: event.target.value as typeof value.language,
                }))
              }
              className={field}
            >
              <option value="en">English</option>
              <option value="si">සිංහල</option>
              <option value="ta">தமிழ்</option>
            </select>
          </label>
          <label className="flex min-h-12 items-center justify-between gap-3 rounded-lg border p-4 text-sm font-semibold">
            Admin notifications
            <input
              type="checkbox"
              checked={profile.notifications}
              onChange={(event) =>
                setProfile((value) => ({ ...value, notifications: event.target.checked }))
              }
              className="size-5 accent-primary"
            />
          </label>
          <button className={primary} disabled={savingProfile}>
            {savingProfile ? "Saving…" : "Save profile"}
          </button>
        </form>
        <form
          onSubmit={(event) => void changePassword(event)}
          className="grid content-start gap-4 rounded-xl border bg-white p-6"
        >
          <h2 className="text-xl font-semibold">Change password</h2>
          <p className="rounded-lg bg-warning-soft p-4 text-sm">
            Your current password is required. Password values are sent only to the protected
            authentication endpoint and are never stored by NCAP.
          </p>
          <label className="text-sm font-semibold">
            Current password *
            <input
              type="password"
              value={passwords.current}
              onChange={(event) =>
                setPasswords((value) => ({ ...value, current: event.target.value }))
              }
              autoComplete="current-password"
              maxLength={128}
              className={field}
            />
          </label>
          <label className="text-sm font-semibold">
            New password *
            <input
              type="password"
              value={passwords.next}
              onChange={(event) =>
                setPasswords((value) => ({ ...value, next: event.target.value }))
              }
              autoComplete="new-password"
              maxLength={128}
              className={field}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Use 8–128 characters with at least one letter and one number.
          </p>
          <label className="text-sm font-semibold">
            Confirm new password *
            <input
              type="password"
              value={passwords.confirm}
              onChange={(event) =>
                setPasswords((value) => ({ ...value, confirm: event.target.value }))
              }
              autoComplete="new-password"
              maxLength={128}
              className={field}
            />
          </label>
          <button disabled={savingPassword} className={primary}>
            {savingPassword ? "Submitting…" : "Change password"}
          </button>
        </form>
      </div>
    </div>
  );
}
