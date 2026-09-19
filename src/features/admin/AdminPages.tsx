import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Activity,
  ArrowDownUp,
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
import { useNcap } from "@/state/ncap-store";
import { quizzes } from "@/data/quizzes";
import { adminActivity } from "@/data/admin";
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
  evaluateCertificateEligibility,
  isDuplicateTopic,
  normalizeTopicName,
  topicSlug,
} from "@/domain/rules";
import { DemoAuthService } from "@/services/auth";
import { DemoMediaService, DemoVideoService } from "@/services/media";
import {
  lessonBlocksSchema,
  lessonVideoSchema,
  passwordSchema,
  phoneSchema,
} from "@/domain/validation";
import { useI18n } from "@/lib/i18n";
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
  const s = useNcap();
  const metrics = [
    { label: "Total demo users", value: s.users.length, icon: <Users />, tone: "violet" as const },
    {
      label: "Active learners",
      value: s.users.filter((u) => u.status === "Active").length,
      icon: <CircleUserRound />,
      tone: "success" as const,
    },
    {
      label: "Lessons published",
      value: s.lessons.filter((l) => l.status === "Published").length,
      icon: <BookOpen />,
    },
    {
      label: "Quiz attempts",
      value: s.users.reduce((sum, user) => sum + user.attempts, 0),
      icon: <FileCheck2 />,
      tone: "ember" as const,
    },
    {
      label: "Average quiz score",
      value: `${s.users.length ? Math.round(s.users.reduce((sum, user) => sum + user.quizAverage, 0) / s.users.length) : 0}%`,
      icon: <Activity />,
    },
    {
      label: "Certificates issued",
      value: s.users.reduce((n, u) => n + u.certificates, 0),
      icon: <GraduationCap />,
    },
  ];
  return (
    <div className="container-ncap max-w-[1400px] py-2">
      <PageHeader
        eyebrow="Administration · Demo workspace"
        title="Overview"
        description="Monitor learning activity, content readiness, and assessment engagement across deterministic demonstration data."
        actions={<DemoTag />}
      />
      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map((m) => (
          <StatCard key={m.label} {...m} />
        ))}
      </section>
      <Suspense fallback={<ChartLoading />}>
        <AdminDashboardCharts />
      </Suspense>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_.8fr]">
        <div className="rounded-xl border bg-white p-6">
          <SectionHeading title="Recent activity" />
          <div className="grid gap-1">
            {adminActivity.slice(0, 7).map((a) => (
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
              ["Published lessons", s.lessons.filter((x) => x.status === "Published").length],
              ["Draft lessons", s.lessons.filter((x) => x.status === "Draft").length],
              ["Published articles", s.articles.filter((x) => x.status === "Published").length],
              ["Question bank", s.questions.length],
              ["Active announcements", s.announcements.filter((x) => x.active).length],
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

export function AdminUsersPage() {
  const s = useNcap();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [language, setLanguage] = useState("All");
  const [sort, setSort] = useState<"name" | "progress">("name");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<DemoUser | null>(null);
  const filtered = useMemo(
    () =>
      s.users
        .filter(
          (u) =>
            (status === "All" || u.status === status) &&
            (language === "All" || u.language === language) &&
            `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "name" ? a.name.localeCompare(b.name) : b.progressPercent - a.progressPercent,
        ),
    [s.users, search, status, language, sort],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / NCAP_CONFIG.adminPageSize));
  const rows = filtered.slice(
    (page - 1) * NCAP_CONFIG.adminPageSize,
    page * NCAP_CONFIG.adminPageSize,
  );
  const update = (user: DemoUser) => {
    const administrators = s.users.filter((item) => item.roles?.includes("admin"));
    const wasAdmin = s.users.find((item) => item.id === user.id)?.roles?.includes("admin");
    if (wasAdmin && !user.roles?.includes("admin") && administrators.length <= 1) {
      toast.error("At least one demonstration administrator must remain assigned.");
      return;
    }
    s.setUsers(s.users.map((u) => (u.id === user.id ? user : u)));
    s.logActivity("admin", `Updated roles and status for ${user.name}`);
    setSelected(user);
    toast.success("Demo user updated");
  };
  useEffect(() => setPage(1), [status, language, sort]);
  return (
    <div className="container-ncap max-w-[1400px] py-2">
      <PageHeader
        eyebrow="Administration · Users"
        title="Learners"
        description="Search, inspect, and update local demonstration learner records."
        actions={<DemoTag />}
      />
      <FilterToolbar>
        <DashboardSearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search name or email…"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={dashboardSelect}
          aria-label="Status filter"
        >
          <option>All</option>
          <option>Active</option>
          <option>Inactive</option>
          <option>Suspended</option>
        </select>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className={dashboardSelect}
          aria-label="Language filter"
        >
          <option>All</option>
          <option value="en">English</option>
          <option value="si">Sinhala</option>
          <option value="ta">Tamil</option>
        </select>
        <button className={outline} onClick={() => setSort(sort === "name" ? "progress" : "name")}>
          <ArrowDownUp />
          Sort: {sort === "name" ? "Name" : "Progress"}
        </button>
      </FilterToolbar>
      <ResponsiveTableContainer label="Learner records">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {[
                "User",
                "Email",
                "Status",
                "Roles",
                "Language",
                "Learning progress",
                "Quiz average",
                "Last activity",
                "",
              ].map((x) => (
                <th key={x} className="px-4 py-3 font-semibold">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t hover:bg-muted/50">
                <td className="px-4 py-4 font-semibold">{u.name}</td>
                <td className="px-4 py-4 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-4">
                  <StatusBadge value={u.status} />
                </td>
                <td className="px-4 py-4">
                  {(u.roles ?? ["learner"]).map((role) => (
                    <span
                      key={role}
                      className="mr-1 rounded-md bg-primary-soft px-2 py-1 text-xs font-semibold capitalize text-primary"
                    >
                      {role}
                    </span>
                  ))}
                </td>
                <td className="px-4 py-4 uppercase">{u.language}</td>
                <td className="px-4 py-4">
                  <div className="flex w-36 items-center gap-2">
                    <ProgressMeter
                      value={u.progressPercent}
                      label={`${u.name} progress`}
                      size="sm"
                    />
                    <span className="font-mono text-xs">{u.progressPercent}%</span>
                  </div>
                </td>
                <td className="px-4 py-4 font-mono">{u.quizAverage}%</td>
                <td className="px-4 py-4 text-muted-foreground">{u.lastActivity}</td>
                <td className="px-4 py-4">
                  <button
                    className={iconBtn}
                    onClick={() => setSelected(u)}
                    aria-label={`View ${u.name}`}
                  >
                    <Eye className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="p-6">
            <EmptyState title="No learners found" description="Adjust search or filter criteria." />
          </div>
        )}
      </ResponsiveTableContainer>
      <DashboardPagination
        page={page}
        pages={pages}
        onPageChange={setPage}
        count={filtered.length}
      />
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
                <DialogDescription>
                  {selected.email} · Joined {selected.joinedAt}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Progress" value={`${selected.progressPercent}%`} />
                <StatCard label="Quiz avg" value={`${selected.quizAverage}%`} />
                <StatCard label="Certificates" value={selected.certificates} />
              </div>
              <div className="rounded-lg bg-muted p-4">
                <h3 className="font-semibold">Learning activity</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selected.lessonsCompleted} lessons · {selected.attempts} quiz attempts · Last
                  active {selected.lastActivity}
                </p>
              </div>
              <label className="text-sm font-semibold">
                Account status
                <select
                  className={field}
                  value={selected.status}
                  onChange={(e) =>
                    setSelected({ ...selected, status: e.target.value as DemoUser["status"] })
                  }
                >
                  <option>Active</option>
                  <option>Inactive</option>
                  <option>Suspended</option>
                </select>
              </label>
              <fieldset className="rounded-lg border p-4">
                <legend className="px-1 text-sm font-semibold">Assigned roles</legend>
                <p className="mb-3 text-xs text-muted-foreground">
                  Client-side roles control this demonstration UI only. The backend must enforce
                  RBAC.
                </p>
                {(["learner", "admin"] as const).map((role) => (
                  <label
                    key={role}
                    className="flex min-h-11 items-center gap-3 text-sm font-medium capitalize"
                  >
                    <input
                      type="checkbox"
                      checked={(selected.roles ?? ["learner"]).includes(role)}
                      onChange={(event) => {
                        const roles = selected.roles ?? ["learner"];
                        setSelected({
                          ...selected,
                          roles: event.target.checked
                            ? [...new Set([...roles, role])]
                            : roles.filter((item) => item !== role),
                        });
                      }}
                      className="size-4 accent-primary"
                    />
                    {role}
                  </label>
                ))}
              </fieldset>
              <DialogFooter>
                <button className={outline} onClick={() => setSelected(null)}>
                  Cancel
                </button>
                <button className={primary} onClick={() => update(selected)}>
                  Save changes
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
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
      store.articles.some((item) => item.category === name) ||
      store.cyberTips.some((item) => item.topic === name) ||
      store.bestPractices.some((item) => item.topic === name) ||
      store.posters.some((item) => item.topic === name) ||
      store.infographics.some((item) => item.category === name) ||
      store.videos.some((item) => item.category === name) ||
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
      store.setArticles(
        store.articles.map((item) =>
          item.category === original.name ? { ...item, category: next.name } : item,
        ),
      );
      store.setCyberTips(
        store.cyberTips.map((item) =>
          item.topic === original.name ? { ...item, topic: next.name } : item,
        ),
      );
      store.setBestPractices(
        store.bestPractices.map((item) =>
          item.topic === original.name ? { ...item, topic: next.name } : item,
        ),
      );
      store.setPosters(
        store.posters.map((item) =>
          item.topic === original.name ? { ...item, topic: next.name } : item,
        ),
      );
      store.setInfographics(
        store.infographics.map((item) =>
          item.category === original.name ? { ...item, category: next.name } : item,
        ),
      );
      store.setVideos(
        store.videos.map((item) =>
          item.category === original.name ? { ...item, category: next.name } : item,
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
        description="Maintain the shared topic taxonomy used by learning, awareness, quizzes, search, and reports."
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
      if (!usedElsewhere) void DemoVideoService.remove(videoAsset).catch(() => undefined);
    }
    if (kind === "lessons") s.setLessons(s.lessons.filter((x) => x.id !== id));
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
    if (kind === "lessons")
      s.setLessons(s.lessons.map((x) => (x.id === item.id ? (next as Lesson) : x)));
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
    s.setLessons([
      ...s.lessons,
      {
        ...item,
        id: `${item.id}-copy-${Date.now()}`,
        title: `${item.title} (Copy)`,
        status: "Draft",
      },
    ]);
    toast.success("Lesson duplicated as draft");
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
                        onClick={() => setEditing(item)}
                        aria-label={`Edit ${title}`}
                      >
                        <Edit3 className="size-4" />
                      </button>
                      <button
                        className={iconBtn}
                        onClick={() => toggle(item)}
                        aria-label={`${item.status === "Published" ? "Unpublish" : "Publish"} ${title}`}
                      >
                        <Check className="size-4" />
                      </button>
                      {kind === "lessons" && (
                        <button
                          className={iconBtn}
                          onClick={() => duplicate(item as Lesson)}
                          aria-label={`Duplicate ${title}`}
                        >
                          <FileText className="size-4" />
                        </button>
                      )}
                      <button
                        className={cn(iconBtn, "hover:border-destructive hover:text-destructive")}
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
  const original = value === "new" ? null : value;
  const [title, setTitle] = useState(
    original ? ("title" in original ? original.title : original.prompt) : "",
  );
  const [summary, setSummary] = useState(original && "summary" in original ? original.summary : "");
  const [topic, setTopic] = useState<Topic>(
    original && "topic" in original ? original.topic : "Phishing",
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
      : s.lessons.filter((lesson) => lesson.moduleId === s.modules[0]?.id).length + 1,
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
        pending.asset.status === "local-demo" &&
        pending.asset.id !== originalVideoAsset?.id
      ) {
        void DemoVideoService.remove(pending.asset).catch(() => undefined);
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
      currentAsset?.status === "local-demo" &&
      currentAsset.id !== originalVideoAsset?.id &&
      currentAsset.id !== nextAsset?.id
    ) {
      void DemoVideoService.remove(currentAsset).catch(() => undefined);
    }
    setLessonVideo(next);
    lessonVideoRef.current = next;
  };
  const submit = (e: FormEvent) => {
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
    const id = original?.id ?? `${kind.slice(0, 2)}-${Date.now()}`;
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
      s.setLessons(
        original ? s.lessons.map((x) => (x.id === id ? item : x)) : [...s.lessons, item],
      );
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
      originalVideoAsset?.status === "local-demo" &&
      originalVideoAsset.id !== savedVideoAsset?.id &&
      !s.lessons.some(
        (lesson) =>
          lesson.id !== original?.id &&
          lesson.video?.kind === "upload" &&
          lesson.video.asset.storageKey === originalVideoAsset.storageKey,
      )
    ) {
      void DemoVideoService.remove(originalVideoAsset).catch(() => undefined);
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
            Changes remain in browser-local demonstration state.
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
                  onChange={(e) => setModuleId(e.target.value)}
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
            <button className={primary} disabled={videoBusy}>
              Save {kind === "questions" ? "question" : "record"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminReportsPage() {
  const s = useNcap();
  const [filters, setFilters] = useState({
    range: "Last 6 months",
    module: "All",
    topic: "All",
    quiz: "All",
    status: "All",
  });
  const [generated, setGenerated] = useState(filters);
  const report = useMemo(() => {
    const users = s.users.filter(
      (user) => generated.status === "All" || user.status === generated.status,
    );
    const selectedModule = s.modules.find((module) => module.title === generated.module);
    const selectedQuiz = quizzes.find((quiz) => quiz.title === generated.quiz);
    const currentDate = new Date();
    const cutoff =
      generated.range === "Last 30 days"
        ? new Date(currentDate.getTime() - 30 * 86_400_000)
        : generated.range === "Year to date"
          ? new Date(Date.UTC(currentDate.getUTCFullYear(), 0, 1))
          : new Date(currentDate.getTime() - 183 * 86_400_000);
    const attempts = s.attempts.filter((attempt) => {
      const completedAt = new Date(`${attempt.completedAt.replace(" ", "T")}Z`);
      return (
        !Number.isNaN(completedAt.getTime()) &&
        completedAt >= cutoff &&
        (!selectedModule || attempt.moduleId === selectedModule.id) &&
        (!selectedQuiz || attempt.quizId === selectedQuiz.id) &&
        (generated.topic === "All" ||
          attempt.byTopic.some((topic) => topic.topic === generated.topic && topic.total > 0))
      );
    });
    const completedLessonRecords = s.lessons.filter(
      (lesson) =>
        lesson.status === "Published" &&
        s.completedLessons.includes(lesson.id) &&
        (!selectedModule || lesson.moduleId === selectedModule.id) &&
        (generated.topic === "All" || lesson.topic === generated.topic),
    );
    const monthly = new Map<string, { total: number; count: number }>();
    for (const attempt of attempts) {
      const key = attempt.completedAt.slice(0, 7);
      const current = monthly.get(key) ?? { total: 0, count: 0 };
      monthly.set(key, {
        total: current.total + attempt.scorePercent,
        count: current.count + 1,
      });
    }
    const quizRows = [...monthly.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([period, value]) => ({
        period,
        attempts: value.count,
        average: Math.round(value.total / value.count),
      }));
    const completedLessons = completedLessonRecords.length;
    return {
      users,
      quizRows,
      completionRows: [{ period: "Current", completions: completedLessons }],
      attempts,
      average: attempts.length
        ? Math.round(
            attempts.reduce((sum, attempt) => sum + attempt.scorePercent, 0) / attempts.length,
          )
        : 0,
      completedLessons,
      completionRate: users.length
        ? Math.round(users.reduce((sum, user) => sum + user.progressPercent, 0) / users.length)
        : 0,
      learningHours:
        Math.round(
          (completedLessonRecords.reduce((sum, lesson) => sum + lesson.minutes, 0) / 60) * 10,
        ) / 10,
      certificateEligible: users.filter(
        (user) =>
          user.progressPercent === 100 &&
          user.quizAverage >= NCAP_CONFIG.certificateThresholdPercent,
      ).length,
    };
  }, [generated, s.attempts, s.completedLessons, s.lessons, s.modules, s.users]);
  const generate = () => {
    setGenerated(filters);
    toast.success("Demo report generated");
  };
  const csv = () => {
    const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = [
      "Completed at,Quiz,Module,Score percent,Correct,Total",
      ...report.attempts.map((attempt) =>
        [
          attempt.completedAt,
          quizzes.find((quiz) => quiz.id === attempt.quizId)?.title ?? attempt.quizId,
          s.modules.find((module) => module.id === attempt.moduleId)?.title ?? attempt.moduleId,
          attempt.scorePercent,
          attempt.correct,
          attempt.total,
        ]
          .map(escape)
          .join(","),
      ),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ncap-demo-report.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV export created locally");
  };
  return (
    <div className="container-ncap max-w-[1400px] py-2">
      <PageHeader
        eyebrow="Administration · Reporting"
        title="Learning reports"
        description="Generate traceable Foundation Release summaries from current demo records. This is not a National Cybersecurity Index."
        actions={
          <>
            <button className={outline} onClick={csv}>
              <Download />
              Export CSV
            </button>
            <button className={outline} onClick={() => window.print()}>
              <Printer />
              Print
            </button>
          </>
        }
      />
      <section className="no-print mt-7 rounded-xl border bg-white p-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {Object.entries(filters).map(([key, value]) => (
            <label key={key} className="text-xs font-semibold capitalize">
              {key}
              <select
                value={value}
                onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
                className={field}
              >
                {key === "range" ? (
                  <>
                    <option>Last 30 days</option>
                    <option>Last 6 months</option>
                    <option>Year to date</option>
                  </>
                ) : key === "module" ? (
                  <>
                    <option>All</option>
                    {s.modules.map((m) => (
                      <option key={m.id}>{m.title}</option>
                    ))}
                  </>
                ) : key === "topic" ? (
                  <>
                    <option>All</option>
                    {s.topics.map((topic) => (
                      <option key={topic.id}>{topic.name}</option>
                    ))}
                  </>
                ) : key === "quiz" ? (
                  <>
                    <option>All</option>
                    {quizzes.map((q) => (
                      <option key={q.id}>{q.title}</option>
                    ))}
                  </>
                ) : (
                  <>
                    <option>All</option>
                    <option>Active</option>
                    <option>Inactive</option>
                    <option>Suspended</option>
                  </>
                )}
              </select>
            </label>
          ))}
          <button className={cn(primary, "self-end")} onClick={generate}>
            Generate report
          </button>
        </div>
      </section>
      <p className="mt-4 text-xs text-muted-foreground">
        Showing: {Object.values(generated).join(" · ")} · Current browser demo records
      </p>
      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Quiz attempts" value={report.attempts.length} />
        <StatCard label="Average score" value={`${report.average}%`} tone="violet" />
        <StatCard label="Completion rate" value={`${report.completionRate}%`} tone="success" />
        <StatCard label="Completed lessons" value={report.completedLessons} />
        <StatCard label="Learning hours" value={report.learningHours} />
        <StatCard label="Certificate eligible" value={report.certificateEligible} tone="ember" />
      </section>
      <Suspense fallback={<ChartLoading />}>
        <AdminReportCharts quizRows={report.quizRows} completionRows={report.completionRows} />
      </Suspense>
      <section className="mt-6 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <caption className="p-5 text-left text-lg font-semibold">Filtered quiz attempts</caption>
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3">Completed</th>
              <th className="px-4 py-3">Quiz</th>
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Score outcome</th>
            </tr>
          </thead>
          <tbody>
            {report.attempts.map((attempt) => (
              <tr key={attempt.id} className="border-t">
                <td className="px-4 py-3 font-mono text-xs">{attempt.completedAt}</td>
                <td className="px-4 py-3 font-semibold">
                  {quizzes.find((quiz) => quiz.id === attempt.quizId)?.title ?? "Quiz"}
                </td>
                <td className="px-4 py-3">
                  {s.modules.find((module) => module.id === attempt.moduleId)?.title ?? "Module"}
                </td>
                <td className="px-4 py-3">{attempt.scorePercent}%</td>
                <td className="px-4 py-3">
                  <StatusBadge
                    value={
                      attempt.scorePercent >= NCAP_CONFIG.passingScorePercent
                        ? "Target met"
                        : "Below target"
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {report.attempts.length === 0 && (
          <div className="p-6">
            <EmptyState
              title="No quiz attempts match"
              description="Adjust the report range or learning filters and generate the report again."
            />
          </div>
        )}
      </section>
    </div>
  );
}

export function AdminCertificatesPage() {
  const store = useNcap();
  const [view, setView] = useState<"registry" | "template">("registry");
  const [template, setTemplate] = useState(store.certificateTemplate);
  const certificateModules = store.modules.filter((module) => module.status === "Published");
  const rows = certificateModules.length
    ? store.users.map((user, index) => {
        const module = certificateModules[index % certificateModules.length]!;
        const moduleLessons = store.lessons.filter(
          (lesson) => lesson.moduleId === module.id && lesson.status === "Published",
        );
        const completedLessonIds =
          user.progressPercent === 100 ? moduleLessons.map((lesson) => lesson.id) : [];
        const syntheticAttempts = user.attempts
          ? [
              {
                id: `admin-${user.id}-${module.quizId}`,
                quizId: module.quizId,
                moduleId: module.id,
                scorePercent: user.quizAverage,
                correct: user.quizAverage,
                total: 100,
                seconds: 0,
                completedAt: user.lastActivity,
                byTopic: [],
              },
            ]
          : [];
        const eligibility = evaluateCertificateEligibility({
          moduleId: module.id,
          quizId: module.quizId,
          lessons: store.lessons,
          completedLessonIds,
          attempts: syntheticAttempts,
        });
        const record = store.certificateRecords.find(
          (item) =>
            item.userId === user.id && item.moduleId === module.id && item.status === "Issued",
        );
        return { user, module, eligibility, record };
      })
    : [];
  const saveTemplate = (event: FormEvent) => {
    event.preventDefault();
    if (!template.title.trim() || !template.issuer.trim() || !template.body.trim()) {
      toast.error("Title, issuer, and certificate wording are required.");
      return;
    }
    store.setCertificateTemplate({
      ...template,
      title: template.title.trim(),
      issuer: template.issuer.trim(),
      body: template.body.trim(),
    });
    store.logActivity("admin", "Updated the certificate template");
    toast.success("Certificate template saved locally");
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
                <tr key={r.user.id} className="border-t">
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
                    <StatusBadge value={r.record ? "Issued" : "Pending"} />
                  </td>
                  <td className="px-4 py-4">{r.record?.issuedAt ?? "—"}</td>
                  <td className="px-4 py-4 font-mono text-xs">{r.record?.reference ?? "—"}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button
                        className={outline}
                        onClick={() =>
                          toast.info(
                            `Template preview is available on the Template tab for ${r.user.name}.`,
                          )
                        }
                      >
                        <Eye />
                        Preview
                      </button>
                      {r.record ? (
                        <button
                          className={cn(outline, "text-destructive")}
                          onClick={() => {
                            if (window.confirm("Revoke this demo certificate?")) {
                              store.setCertificateRecords(
                                store.certificateRecords.map((record) =>
                                  record.id === r.record!.id
                                    ? {
                                        ...record,
                                        status: "Revoked",
                                        revokedAt: new Date().toISOString().slice(0, 10),
                                      }
                                    : record,
                                ),
                              );
                              store.logActivity("admin", `Revoked certificate for ${r.user.name}`);
                              toast.success("Certificate revoked in demo state");
                            }
                          }}
                        >
                          Revoke
                        </button>
                      ) : (
                        <button
                          className={primary}
                          disabled={!r.eligibility.eligible}
                          onClick={() => {
                            const issuedAt = new Date().toISOString().slice(0, 10);
                            store.setCertificateRecords([
                              ...store.certificateRecords,
                              {
                                id: `certificate-${crypto.randomUUID()}`,
                                userId: r.user.id,
                                moduleId: r.module.id,
                                status: "Issued",
                                issuedAt,
                                reference: `NCAP-DEMO-${r.user.id.toUpperCase()}-${r.module.id.replace("m-", "").toUpperCase()}`,
                              },
                            ]);
                            store.logActivity("admin", `Issued certificate for ${r.user.name}`);
                            toast.success("Certificate marked issued");
                          }}
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
        </div>
      ) : (
        <div className="mt-7 grid gap-6 xl:grid-cols-[420px_1fr]">
          <form
            onSubmit={saveTemplate}
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
              asset={template.logo}
              initialAlt="NCAP certificate logo"
              guidance="A transparent or square logo works best."
              onChange={(logo) =>
                setTemplate((value) => ({ ...value, ...(logo ? { logo } : { logo: undefined }) }))
              }
            />
            <button className={primary}>Save template</button>
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
              <p className="meta mt-5 text-primary">{template.issuer} · Demonstration</p>
              <h2 className="mt-5 text-4xl font-semibold">
                {template.title || "Certificate title"}
              </h2>
              <p className="mt-3 text-muted-foreground">{template.subtitle}</p>
              <p className="mx-auto mt-8 max-w-2xl">{template.body}</p>
              <p className="mt-8 text-3xl font-semibold">Demo Learner</p>
              <p className="mt-3 text-xl">Digital Safety Fundamentals</p>
              <div className="mx-auto mt-12 max-w-xs border-t pt-2">
                <p className="font-semibold">{template.signatoryName}</p>
                <p className="text-sm text-muted-foreground">{template.signatoryTitle}</p>
              </div>
              <p className="mt-8 font-mono text-xs text-muted-foreground">
                NCAP-DEMO-PREVIEW · Not cryptographically verifiable
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

export function AdminAnnouncementsPage() {
  const s = useNcap();
  const [editing, setEditing] = useState<Announcement | "new" | null>(null);
  const remove = (id: string) => {
    if (window.confirm("Delete this announcement from demo state?")) {
      s.setAnnouncements(s.announcements.filter((a) => a.id !== id));
      toast.success("Announcement deleted");
    }
  };
  return (
    <div className="container-ncap max-w-6xl py-2">
      <PageHeader
        eyebrow="Administration · Communications"
        title="Announcements"
        description="Create, schedule, activate, and maintain notices shown in the learner dashboard."
        actions={
          <button className={primary} onClick={() => setEditing("new")}>
            <Plus />
            New announcement
          </button>
        }
      />
      <div className="mt-7 grid gap-4">
        {s.announcements.map((a) => (
          <article key={a.id} className="rounded-xl border bg-white p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge value={announcementStatus(a)} />
                  <span className="meta text-muted-foreground">{a.audience}</span>
                </div>
                <h2 className="mt-3 text-xl font-semibold">{a.title}</h2>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{a.body}</p>
                <p className="mt-4 font-mono text-xs text-muted-foreground">
                  {a.startsAt} → {a.endsAt}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className={iconBtn}
                  onClick={() => setEditing(a)}
                  aria-label={`Edit ${a.title}`}
                >
                  <Edit3 className="size-4" />
                </button>
                <button
                  className={iconBtn}
                  onClick={() => {
                    s.setAnnouncements(
                      s.announcements.map((x) => (x.id === a.id ? { ...x, active: !x.active } : x)),
                    );
                    toast.success(a.active ? "Announcement deactivated" : "Announcement activated");
                  }}
                  aria-label={`${a.active ? "Deactivate" : "Activate"} ${a.title}`}
                >
                  <Check className="size-4" />
                </button>
                <button
                  className={cn(iconBtn, "text-destructive")}
                  onClick={() => remove(a.id)}
                  aria-label={`Delete ${a.title}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          </article>
        ))}
        {s.announcements.length === 0 && (
          <EmptyState
            title="No announcements"
            description="Create a scheduled notice for learners or administrators."
          />
        )}
      </div>
      <AnnouncementEditor
        key={editing === "new" ? "new" : (editing?.id ?? "closed")}
        value={editing}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
function AnnouncementEditor({
  value,
  onClose,
}: {
  value: Announcement | "new" | null;
  onClose: () => void;
}) {
  const s = useNcap();
  const original = value === "new" ? null : value;
  const [form, setForm] = useState({
    title: original?.title ?? "",
    body: original?.body ?? "",
    audience: original?.audience ?? "All Learners",
    startsAt: original?.startsAt ?? new Date().toISOString().slice(0, 10),
    endsAt: original?.endsAt ?? "2026-12-31",
    active: original?.active ?? false,
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Title and message are required");
      return;
    }
    if (form.endsAt < form.startsAt) {
      toast.error("End date must be after start date");
      return;
    }
    const item: Announcement = {
      ...form,
      id: original?.id ?? `an-${Date.now()}`,
      audience: form.audience as Announcement["audience"],
    };
    s.setAnnouncements(
      original
        ? s.announcements.map((a) => (a.id === item.id ? item : a))
        : [item, ...s.announcements],
    );
    toast.success(original ? "Announcement updated" : "Announcement created");
    onClose();
  };
  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{original ? "Edit" : "Create"} announcement</DialogTitle>
          <DialogDescription>Active notices appear on the learner dashboard.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <label className="text-sm font-semibold">
            Title *
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className={field}
            />
          </label>
          <label className="text-sm font-semibold">
            Message *
            <textarea
              value={form.body}
              onChange={(e) => set("body", e.target.value)}
              className="mt-1.5 min-h-28 w-full rounded-lg border p-3"
            />
          </label>
          <label className="text-sm font-semibold">
            Audience
            <select
              value={form.audience}
              onChange={(e) => set("audience", e.target.value)}
              className={field}
            >
              <option>All Learners</option>
              <option>New Learners</option>
              <option>Administrators</option>
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Start date
              <input
                type="date"
                value={form.startsAt}
                onChange={(e) => set("startsAt", e.target.value)}
                className={field}
              />
            </label>
            <label className="text-sm font-semibold">
              End date
              <input
                type="date"
                value={form.endsAt}
                onChange={(e) => set("endsAt", e.target.value)}
                className={field}
              />
            </label>
          </div>
          <label className="flex min-h-11 items-center gap-3 rounded-lg border p-3 text-sm font-semibold">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => set("active", e.target.checked)}
              className="size-4 accent-violet"
            />
            Active on learner dashboard
          </label>
          <DialogFooter>
            <button type="button" className={outline} onClick={onClose}>
              Cancel
            </button>
            <button className={primary}>Save announcement</button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminProfilePage() {
  const store = useNcap();
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
  const [savingPassword, setSavingPassword] = useState(false);
  const saveProfile = (event: FormEvent) => {
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
    store.updateProfile({
      name: profile.name.trim(),
      email: profile.email.trim(),
      phone: profile.phone.trim(),
      notifications: profile.notifications,
      ...(profile.avatar ? { avatar: profile.avatar } : {}),
    });
    setLanguage(profile.language);
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
      await DemoAuthService.changePassword(passwords.current, passwords.next);
      setPasswords({ current: "", next: "", confirm: "" });
      toast.success("Password change request completed in demo mode; no password was stored.");
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
        description="Manage the local demonstration administrator profile. Production identity changes require the backend."
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
              onChange={(event) => setProfile((value) => ({ ...value, email: event.target.value }))}
              autoComplete="email"
              maxLength={254}
              className={field}
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
          <button className={primary}>Save profile</button>
        </form>
        <form
          onSubmit={(event) => void changePassword(event)}
          className="grid content-start gap-4 rounded-xl border bg-white p-6"
        >
          <h2 className="text-xl font-semibold">Change password</h2>
          <p className="rounded-lg bg-warning-soft p-4 text-sm">
            Demo contract only: values are submitted to an in-memory service adapter, immediately
            cleared, and never persisted or logged.
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
