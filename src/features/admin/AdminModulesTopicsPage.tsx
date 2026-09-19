import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Check, Edit3, Eye, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { quizzes } from "@/data/quizzes";
import type { Difficulty, LearningModule, MediaAsset, Topic, TopicRecord } from "@/data/types";
import { EmptyState, PageHeader } from "@/components/common/primitives";
import { MediaField, useMediaUrl } from "@/components/common/MediaField";
import { cn } from "@/lib/utils";
import { isDuplicateTopic, normalizeTopicName, topicSlug } from "@/domain/rules";
import { DemoMediaService } from "@/services/media";
import { useRepository } from "@/services/repository-provider";
import {
  useRemoveRepositoryRecord,
  useRepositoryList,
  useSaveRepositoryRecord,
} from "@/services/query-hooks";
import { useNcap } from "@/state/ncap-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DashboardSearchInput,
  FilterToolbar,
  ResultCount,
  dashboardButton,
  dashboardField,
  dashboardSelect,
} from "@/components/common/dashboard-primitives";

const primary = dashboardButton.primary;
const outline = dashboardButton.secondary;
const iconButton = dashboardButton.icon;
const field = dashboardField;

export function AdminModulesTopicsPage() {
  const [tab, setTab] = useState<"modules" | "topics">("topics");
  return (
    <div className="container-ncap max-w-[1400px] py-2">
      <PageHeader
        eyebrow="Administration · Learning structure"
        title="Manage Modules & Topics"
        description="Maintain the learning catalogue and its shared taxonomy from one repository-backed workspace."
      />
      <div
        className="mt-7 flex gap-2 border-b"
        role="tablist"
        aria-label="Manage modules and topics"
      >
        {(["modules", "topics"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            aria-controls={`${value}-panel`}
            onClick={() => setTab(value)}
            className={cn(
              "min-h-11 border-b-2 border-transparent px-5 text-sm font-bold capitalize text-muted-foreground",
              tab === value && "border-violet text-primary",
            )}
          >
            {value}
          </button>
        ))}
      </div>
      {tab === "modules" ? <ModulesPanel /> : <TopicsPanel />}
    </div>
  );
}

function ModulesPanel() {
  const repository = useRepository();
  const { data: modules = [], isPending, error } = useRepositoryList(repository, "modules");
  const { data: topics = [] } = useRepositoryList(repository, "topics");
  const { data: lessons = [] } = useRepositoryList(repository, "lessons");
  const { data: questions = [] } = useRepositoryList(repository, "questions");
  const saveMutation = useSaveRepositoryRecord(repository, "modules");
  const removeMutation = useRemoveRepositoryRecord(repository, "modules");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [topic, setTopic] = useState("All");
  const [editing, setEditing] = useState<LearningModule | "new" | null>(null);
  const [previewing, setPreviewing] = useState<LearningModule | null>(null);
  const [deleting, setDeleting] = useState<LearningModule | null>(null);
  const ordered = useMemo(
    () => [...modules].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [modules],
  );
  const filtered = ordered.filter(
    (module) =>
      (status === "All" || module.status === status) &&
      (topic === "All" || module.topic === topic) &&
      `${module.title} ${module.description} ${module.topic}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  const referenced = (module: LearningModule) =>
    lessons.some((lesson) => lesson.moduleId === module.id) ||
    questions.some((question) => question.moduleId === module.id) ||
    quizzes.some((quiz) => quiz.moduleId === module.id);
  const save = async (module: LearningModule) => {
    await saveMutation.mutateAsync(module);
  };
  const reorder = async (module: LearningModule, direction: -1 | 1) => {
    const index = ordered.findIndex((item) => item.id === module.id);
    const swap = ordered[index + direction];
    if (!swap) return;
    const next = ordered.map((item, itemIndex) =>
      item.id === module.id
        ? { ...item, order: index + direction + 1 }
        : item.id === swap.id
          ? { ...item, order: index + 1 }
          : { ...item, order: itemIndex + 1 },
    );
    try {
      await repository.modules.replace(next);
      toast.success("Module order updated");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Module order could not be updated.");
    }
  };
  return (
    <section id="modules-panel" role="tabpanel" className="pt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Learning modules</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Published modules appear in this order on the learner catalogue.
          </p>
        </div>
        <button className={primary} onClick={() => setEditing("new")}>
          <Plus className="size-4" /> Create module
        </button>
      </div>
      <FilterToolbar label="Filter learning modules">
        <DashboardSearchInput value={search} onChange={setSearch} placeholder="Search modules…" />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Module publication filter"
          className={dashboardSelect}
        >
          <option>All</option>
          <option>Published</option>
          <option>Draft</option>
        </select>
        <select
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          aria-label="Module topic filter"
          className={dashboardSelect}
        >
          <option>All</option>
          {[...new Set(modules.map((module) => module.topic))].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <ResultCount>{filtered.length} modules</ResultCount>
      </FilterToolbar>
      {isPending ? (
        <div
          className="mt-5 flex min-h-44 items-center justify-center rounded-xl border bg-white"
          aria-busy="true"
        >
          <LoaderCircle className="mr-2 size-5 animate-spin" /> Loading modules…
        </div>
      ) : error ? (
        <div className="mt-5 rounded-xl border border-destructive/40 bg-destructive-soft p-6">
          {error.message}
        </div>
      ) : filtered.length ? (
        <div className="mt-5 overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Topic</th>
                <th className="px-4 py-3">Difficulty</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((module) => (
                <tr key={module.id} className="border-t hover:bg-muted/40">
                  <td className="max-w-md px-4 py-4">
                    <strong>{module.title}</strong>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      {module.description}
                    </p>
                  </td>
                  <td className="px-4 py-4">{module.topic}</td>
                  <td className="px-4 py-4">{module.difficulty}</td>
                  <td className="px-4 py-4">{module.minutes} min</td>
                  <td className="px-4 py-4">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-bold",
                        module.status === "Published"
                          ? "bg-success-soft text-success"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {module.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        className={iconButton}
                        disabled={ordered[0]?.id === module.id}
                        onClick={() => void reorder(module, -1)}
                        aria-label={`Move ${module.title} up`}
                      >
                        <ArrowUp className="size-4" />
                      </button>
                      <button
                        className={iconButton}
                        disabled={ordered.at(-1)?.id === module.id}
                        onClick={() => void reorder(module, 1)}
                        aria-label={`Move ${module.title} down`}
                      >
                        <ArrowDown className="size-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        className={iconButton}
                        onClick={() => setPreviewing(module)}
                        aria-label={`Preview ${module.title}`}
                      >
                        <Eye className="size-4" />
                      </button>
                      <button
                        className={iconButton}
                        onClick={() => setEditing(module)}
                        aria-label={`Edit ${module.title}`}
                      >
                        <Edit3 className="size-4" />
                      </button>
                      <button
                        className={iconButton}
                        onClick={() =>
                          void save({
                            ...module,
                            status: module.status === "Published" ? "Draft" : "Published",
                          })
                            .then(() =>
                              toast.success(
                                module.status === "Published"
                                  ? "Module unpublished"
                                  : "Module published",
                              ),
                            )
                            .catch((reason: unknown) =>
                              toast.error(
                                reason instanceof Error
                                  ? reason.message
                                  : "Status could not be updated.",
                              ),
                            )
                        }
                        aria-label={`${module.status === "Published" ? "Unpublish" : "Publish"} ${module.title}`}
                      >
                        <Check className="size-4" />
                      </button>
                      <button
                        className={cn(iconButton, "text-destructive")}
                        onClick={() =>
                          referenced(module)
                            ? toast.error(
                                "This module is referenced by lessons, questions, or a quiz. Unpublish it instead of deleting it.",
                              )
                            : setDeleting(module)
                        }
                        aria-label={`Delete ${module.title}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState
            title="No modules found"
            description="Adjust the filters or create a new learning module."
          />
        </div>
      )}
      <ModuleEditor
        key={editing === "new" ? "new-module" : (editing?.id ?? "closed")}
        value={editing}
        modules={modules}
        topics={topics}
        onClose={() => setEditing(null)}
        onSave={save}
      />
      <ModulePreview
        module={previewing}
        lessonCount={
          previewing
            ? lessons.filter(
                (lesson) => lesson.moduleId === previewing.id && lesson.status === "Published",
              ).length
            : 0
        }
        onClose={() => setPreviewing(null)}
      />
      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the unreferenced module from local demo state and the
              learning catalogue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white"
              onClick={() => {
                if (!deleting) return;
                const module = deleting;
                setDeleting(null);
                void removeMutation
                  .mutateAsync(module.id)
                  .then(async () => {
                    if (module.image?.status === "local-demo")
                      await DemoMediaService.remove(module.image).catch(() => undefined);
                    toast.success("Module deleted");
                  })
                  .catch((reason: unknown) =>
                    toast.error(
                      reason instanceof Error ? reason.message : "Module could not be deleted.",
                    ),
                  );
              }}
            >
              Delete module
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function ModuleEditor({
  value,
  modules,
  topics,
  onClose,
  onSave,
}: {
  value: LearningModule | "new" | null;
  modules: LearningModule[];
  topics: TopicRecord[];
  onClose: () => void;
  onSave: (module: LearningModule) => Promise<void>;
}) {
  const original = value === "new" ? null : value;
  const [title, setTitle] = useState(original?.title ?? "");
  const [description, setDescription] = useState(original?.description ?? "");
  const [topic, setTopic] = useState<Topic>(
    original?.topic ?? topics.find((item) => item.status === "Active")?.name ?? "General",
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(original?.difficulty ?? "Beginner");
  const [minutes, setMinutes] = useState(original?.minutes ?? 30);
  const [status, setStatus] = useState<LearningModule["status"]>(original?.status ?? "Draft");
  const [order, setOrder] = useState(original?.order ?? modules.length + 1);
  const [objectives, setObjectives] = useState(original?.objectives.join("\n") ?? "");
  const [quizId, setQuizId] = useState(original?.quizId ?? "");
  const [image, setImage] = useState<MediaAsset | undefined>(original?.image);
  const [saving, setSaving] = useState(false);
  const imageRef = useRef(image);
  const committed = useRef(false);
  useEffect(() => {
    imageRef.current = image;
  }, [image]);
  useEffect(
    () => () => {
      const pending = imageRef.current;
      if (
        !committed.current &&
        pending?.status === "local-demo" &&
        pending.id !== original?.image?.id
      )
        void DemoMediaService.remove(pending).catch(() => undefined);
    },
    [original?.image?.id],
  );
  const changeImage = (next: MediaAsset | undefined) => {
    if (image?.status === "local-demo" && image.id !== original?.image?.id && image.id !== next?.id)
      void DemoMediaService.remove(image).catch(() => undefined);
    setImage(next);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const cleanObjectives = objectives
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (!title.trim() || !description.trim() || !topic || cleanObjectives.length === 0) {
      toast.error("Title, description, topic, and at least one objective are required.");
      return;
    }
    const id = original?.id ?? `m-${topicSlug(title)}-${Date.now().toString().slice(-5)}`;
    if (
      modules.some(
        (module) =>
          module.id !== original?.id &&
          module.title.trim().toLowerCase() === title.trim().toLowerCase(),
      )
    ) {
      toast.error("A module with this title already exists.");
      return;
    }
    const module: LearningModule = {
      id,
      title: title.trim(),
      description: description.trim(),
      topic,
      difficulty,
      minutes: Math.max(1, Math.round(minutes)),
      status,
      objectives: cleanObjectives,
      quizId,
      order: Math.max(1, Math.round(order)),
      image,
    };
    setSaving(true);
    try {
      await onSave(module);
      committed.current = true;
      if (original?.image?.status === "local-demo" && original.image.id !== image?.id)
        await DemoMediaService.remove(original.image).catch(() => undefined);
      toast.success(original ? "Module updated" : "Module created");
      onClose();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Module could not be saved.");
    } finally {
      setSaving(false);
    }
  };
  const compatibleQuizzes = quizzes.filter((quiz) => quiz.moduleId === original?.id);
  return (
    <Dialog open={Boolean(value)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{original ? "Edit" : "Create"} learning module</DialogTitle>
          <DialogDescription>
            Published records render immediately on the learner catalogue and related module views.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void submit(event)} className="grid gap-4">
          <label className="text-sm font-semibold">
            Module title *
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={160}
              className={field}
              required
            />
          </label>
          <label className="text-sm font-semibold">
            Description *
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={1200}
              className="mt-1.5 min-h-28 w-full rounded-lg border p-3"
              required
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-semibold">
              Topic
              <select
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                className={field}
              >
                {topics
                  .filter((item) => item.status === "Active" || item.name === topic)
                  .map((item) => (
                    <option key={item.id}>{item.name}</option>
                  ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Difficulty
              <select
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value as Difficulty)}
                className={field}
              >
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </label>
            <label className="text-sm font-semibold">
              Duration in minutes
              <input
                type="number"
                min={1}
                max={10000}
                value={minutes}
                onChange={(event) => setMinutes(event.target.valueAsNumber || 1)}
                className={field}
              />
            </label>
            <label className="text-sm font-semibold">
              Display order
              <input
                type="number"
                min={1}
                max={9999}
                value={order}
                onChange={(event) => setOrder(event.target.valueAsNumber || 1)}
                className={field}
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Publication status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as LearningModule["status"])}
                className={field}
              >
                <option>Draft</option>
                <option>Published</option>
              </select>
            </label>
            <label className="text-sm font-semibold">
              Related quiz
              <select
                value={quizId}
                onChange={(event) => setQuizId(event.target.value)}
                className={field}
              >
                <option value="">No related assessment</option>
                {compatibleQuizzes.map((quiz) => (
                  <option key={quiz.id} value={quiz.id}>
                    {quiz.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="text-sm font-semibold">
            Learning objectives (one per line) *
            <textarea
              value={objectives}
              onChange={(event) => setObjectives(event.target.value)}
              className="mt-1.5 min-h-36 w-full rounded-lg border p-3"
              required
            />
          </label>
          <MediaField
            label="Module image"
            asset={image}
            initialAlt={original?.image?.altText ?? title}
            guidance="A landscape image is recommended. This exact local asset appears on public featured-learning cards."
            onChange={changeImage}
          />
          <DialogFooter>
            <button type="button" className={outline} onClick={onClose}>
              Cancel
            </button>
            <button className={primary} disabled={saving}>
              {saving && <LoaderCircle className="size-4 animate-spin" />}
              {saving ? "Saving…" : "Save module"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ModulePreview({
  module,
  lessonCount,
  onClose,
}: {
  module: LearningModule | null;
  lessonCount: number;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(module)} onOpenChange={(open) => !open && onClose()}>
      {module && <ModulePreviewContent module={module} lessonCount={lessonCount} />}
    </Dialog>
  );
}
function ModulePreviewContent({
  module,
  lessonCount,
}: {
  module: LearningModule;
  lessonCount: number;
}) {
  const src = useMediaUrl(module.image);
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{module.title}</DialogTitle>
        <DialogDescription>
          {module.topic} · {module.difficulty} · {module.minutes} minutes · {module.status}
        </DialogDescription>
      </DialogHeader>
      {src && (
        <img
          src={src}
          alt={module.image?.altText ?? ""}
          className="max-h-64 w-full rounded-xl bg-muted object-cover"
        />
      )}
      <p className="leading-7 text-muted-foreground">{module.description}</p>
      <div className="rounded-xl border bg-muted/30 p-5">
        <p className="text-sm font-semibold">
          {lessonCount} published lessons ·{" "}
          {module.quizId ? "Related assessment configured" : "No related assessment"}
        </p>
        <ul className="mt-3 grid gap-2 text-sm">
          {module.objectives.map((objective) => (
            <li key={objective}>• {objective}</li>
          ))}
        </ul>
      </div>
    </DialogContent>
  );
}

function TopicsPanel() {
  const repository = useRepository();
  const store = useNcap();
  const { data: topics = [], isPending, error } = useRepositoryList(repository, "topics");
  const saveMutation = useSaveRepositoryRecord(repository, "topics");
  const removeMutation = useRemoveRepositoryRecord(repository, "topics");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [editing, setEditing] = useState<TopicRecord | "new" | null>(null);
  const [name, setName] = useState("");
  const open = (value: TopicRecord | "new") => {
    setEditing(value);
    setName(value === "new" ? "" : value.name);
  };
  const filtered = topics.filter(
    (topic) =>
      (status === "All" || topic.status === status) &&
      topic.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const references = (name: string) => ({
    modules: store.modules.some((item) => item.topic === name),
    lessons: store.lessons.some((item) => item.topic === name),
    questions: store.questions.some((item) => item.topic === name),
    quizzes: quizzes.some((item) => item.topic === name),
    awareness:
      store.articles.some((item) => item.category === name) ||
      store.cyberTips.some((item) => item.topic === name) ||
      store.bestPractices.some((item) => item.topic === name) ||
      store.posters.some((item) => item.topic === name) ||
      store.infographics.some((item) => item.category === name) ||
      store.videos.some((item) => item.category === name),
  });
  const isReferenced = (name: string) => Object.values(references(name)).some(Boolean);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextName = normalizeTopicName(name);
    const original = editing === "new" ? null : editing;
    if (!nextName) {
      toast.error("Topic name is required.");
      return;
    }
    if (isDuplicateTopic(topics, nextName, original?.id)) {
      toast.error("A topic with this name already exists.");
      return;
    }
    const slug = topicSlug(nextName);
    if (topics.some((topic) => topic.id !== original?.id && topic.slug === slug)) {
      toast.error("Choose a topic name with a unique URL slug.");
      return;
    }
    if (
      original &&
      original.name !== nextName &&
      quizzes.some((quiz) => quiz.topic === original.name)
    ) {
      toast.error(
        "This topic is assigned to a configured quiz and cannot be renamed safely in this frontend release.",
      );
      return;
    }
    const now = new Date().toISOString().slice(0, 10);
    const record: TopicRecord = {
      id: original?.id ?? `topic-${crypto.randomUUID()}`,
      name: nextName,
      slug,
      status: original?.status ?? "Active",
      createdAt: original?.createdAt ?? now,
      updatedAt: now,
    };
    try {
      await saveMutation.mutateAsync(record);
      if (original && original.name !== nextName) {
        const old = original.name;
        await Promise.all([
          repository.modules.replace(
            store.modules.map((item) => (item.topic === old ? { ...item, topic: nextName } : item)),
          ),
          repository.lessons.replace(
            store.lessons.map((item) => (item.topic === old ? { ...item, topic: nextName } : item)),
          ),
          repository.questions.replace(
            store.questions.map((item) =>
              item.topic === old ? { ...item, topic: nextName } : item,
            ),
          ),
          repository.articles.replace(
            store.articles.map((item) =>
              item.category === old ? { ...item, category: nextName } : item,
            ),
          ),
          repository.cyberTips.replace(
            store.cyberTips.map((item) =>
              item.topic === old ? { ...item, topic: nextName } : item,
            ),
          ),
          repository.bestPractices.replace(
            store.bestPractices.map((item) =>
              item.topic === old ? { ...item, topic: nextName } : item,
            ),
          ),
          repository.posters.replace(
            store.posters.map((item) => (item.topic === old ? { ...item, topic: nextName } : item)),
          ),
          repository.infographics.replace(
            store.infographics.map((item) =>
              item.category === old ? { ...item, category: nextName } : item,
            ),
          ),
          repository.videos.replace(
            store.videos.map((item) =>
              item.category === old ? { ...item, category: nextName } : item,
            ),
          ),
        ]);
      }
      toast.success(original ? "Topic updated" : "Topic created");
      setEditing(null);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Topic could not be saved.");
    }
  };
  return (
    <section id="topics-panel" role="tabpanel" className="pt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Topics</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Shared taxonomy for modules, lessons, quizzes, and awareness resources.
          </p>
        </div>
        <button className={primary} onClick={() => open("new")}>
          <Plus className="size-4" /> Create topic
        </button>
      </div>
      <FilterToolbar label="Filter topics">
        <DashboardSearchInput value={search} onChange={setSearch} placeholder="Search topics…" />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Topic status filter"
          className={dashboardSelect}
        >
          <option>All</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
        <ResultCount>{filtered.length} topics</ResultCount>
      </FilterToolbar>
      {isPending ? (
        <div className="mt-5 flex min-h-44 items-center justify-center">
          <LoaderCircle className="mr-2 size-5 animate-spin" /> Loading topics…
        </div>
      ) : error ? (
        <div className="mt-5 rounded-xl border border-destructive/40 bg-destructive-soft p-6">
          {error.message}
        </div>
      ) : filtered.length ? (
        <div className="mt-5 overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
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
                  <td className="px-4 py-4">
                    {isReferenced(topic.name) ? "In use" : "Unreferenced"}
                  </td>
                  <td className="px-4 py-4">{topic.status}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        className={iconButton}
                        onClick={() => open(topic)}
                        aria-label={`Edit ${topic.name}`}
                      >
                        <Edit3 className="size-4" />
                      </button>
                      <button
                        className={iconButton}
                        onClick={() =>
                          void saveMutation
                            .mutateAsync({
                              ...topic,
                              status: topic.status === "Active" ? "Inactive" : "Active",
                              updatedAt: new Date().toISOString().slice(0, 10),
                            })
                            .then(() =>
                              toast.success(
                                topic.status === "Active" ? "Topic deactivated" : "Topic activated",
                              ),
                            )
                        }
                        aria-label={`${topic.status === "Active" ? "Deactivate" : "Activate"} ${topic.name}`}
                      >
                        <Check className="size-4" />
                      </button>
                      <button
                        className={cn(iconButton, "text-destructive")}
                        onClick={() => {
                          if (isReferenced(topic.name)) {
                            toast.error(
                              "Referenced topics cannot be deleted. Deactivate this topic instead.",
                            );
                            return;
                          }
                          if (!window.confirm(`Delete the unreferenced topic “${topic.name}”?`))
                            return;
                          void removeMutation
                            .mutateAsync(topic.id)
                            .then(() => toast.success("Topic deleted"));
                        }}
                        aria-label={`Delete ${topic.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState title="No topics found" description="Adjust the filters or create a topic." />
        </div>
      )}
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Create" : "Edit"} topic</DialogTitle>
            <DialogDescription>Topic names and URL slugs must remain unique.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(event) => void submit(event)} className="grid gap-4">
            <label className="text-sm font-semibold">
              Topic name *
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                className={field}
                required
              />
            </label>
            <DialogFooter>
              <button type="button" className={outline} onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className={primary}>Save topic</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
