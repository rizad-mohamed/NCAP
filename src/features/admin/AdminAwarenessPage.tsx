import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Check, Edit3, Eye, FileText, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type {
  Article,
  BestPractice,
  ContentStatus,
  CyberTip,
  Infographic,
  MediaAsset,
  NewsUpdate,
  Poster,
  Topic,
  VideoResource,
} from "@/data/types";
import { AppLink } from "@/components/layout/AppShell";
import { EmptyState, PageHeader } from "@/components/common/primitives";
import { MediaField, useMediaUrl } from "@/components/common/MediaField";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { topicSlug } from "@/domain/rules";
import { DemoMediaService } from "@/services/media";
import { useRepository } from "@/services/repository-provider";
import {
  useRemoveRepositoryRecord,
  useRepositoryList,
  useSaveRepositoryRecord,
} from "@/services/query-hooks";
import {
  DashboardSearchInput,
  FilterToolbar,
  ResultCount,
  dashboardButton,
  dashboardField,
  dashboardSelect,
} from "@/components/common/dashboard-primitives";

export type AwarenessKind =
  "articles" | "cyber-tips" | "updates" | "best-practices" | "posters" | "infographics" | "videos";

type AwarenessRecord =
  Article | CyberTip | NewsUpdate | BestPractice | Poster | Infographic | VideoResource;

const kinds: { kind: AwarenessKind; label: string; publicHref: string }[] = [
  { kind: "articles", label: "Articles", publicHref: "/awareness/articles" },
  { kind: "cyber-tips", label: "Cyber Tips", publicHref: "/awareness/tips" },
  { kind: "updates", label: "Demo Updates", publicHref: "/awareness/news" },
  { kind: "best-practices", label: "Best Practices", publicHref: "/awareness/best-practices" },
  { kind: "posters", label: "Posters", publicHref: "/awareness/posters" },
  { kind: "infographics", label: "Infographics", publicHref: "/awareness/infographics" },
  { kind: "videos", label: "Videos", publicHref: "/awareness/videos" },
];

const primary = dashboardButton.primary;
const outline = dashboardButton.secondary;
const iconButton = dashboardButton.icon;
const field = dashboardField;

const recordStatus = (record: AwarenessRecord): ContentStatus => record.status ?? "Published";
const recordTopic = (record: AwarenessRecord) =>
  "topic" in record ? record.topic : "category" in record ? record.category : record.tag;
const recordSummary = (record: AwarenessRecord) => {
  if ("summary" in record && record.summary) return record.summary;
  if ("description" in record) return record.description;
  if ("text" in record) return record.text;
  if ("steps" in record) return record.steps.join(" ");
  if ("points" in record) return record.points.join(" ");
  return "";
};
const recordOrder = (record: AwarenessRecord, index: number) => record.order ?? index + 1;

export function AdminAwarenessPage({ kind = "articles" }: { kind?: AwarenessKind }) {
  const repository = useRepository();
  const articleQuery = useRepositoryList(repository, "articles");
  const tipQuery = useRepositoryList(repository, "cyberTips");
  const updateQuery = useRepositoryList(repository, "newsUpdates");
  const practiceQuery = useRepositoryList(repository, "bestPractices");
  const posterQuery = useRepositoryList(repository, "posters");
  const infographicQuery = useRepositoryList(repository, "infographics");
  const videoQuery = useRepositoryList(repository, "videos");
  const topicQuery = useRepositoryList(repository, "topics");
  const saveArticle = useSaveRepositoryRecord(repository, "articles");
  const saveTip = useSaveRepositoryRecord(repository, "cyberTips");
  const saveUpdate = useSaveRepositoryRecord(repository, "newsUpdates");
  const savePractice = useSaveRepositoryRecord(repository, "bestPractices");
  const savePoster = useSaveRepositoryRecord(repository, "posters");
  const saveInfographic = useSaveRepositoryRecord(repository, "infographics");
  const saveVideo = useSaveRepositoryRecord(repository, "videos");
  const removeArticle = useRemoveRepositoryRecord(repository, "articles");
  const removeTip = useRemoveRepositoryRecord(repository, "cyberTips");
  const removeUpdate = useRemoveRepositoryRecord(repository, "newsUpdates");
  const removePractice = useRemoveRepositoryRecord(repository, "bestPractices");
  const removePoster = useRemoveRepositoryRecord(repository, "posters");
  const removeInfographic = useRemoveRepositoryRecord(repository, "infographics");
  const removeVideo = useRemoveRepositoryRecord(repository, "videos");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [topic, setTopic] = useState("All");
  const [editing, setEditing] = useState<AwarenessRecord | "new" | null>(null);
  const [previewing, setPreviewing] = useState<AwarenessRecord | null>(null);
  const [deleting, setDeleting] = useState<AwarenessRecord | null>(null);
  const active = kinds.find((item) => item.kind === kind) ?? kinds[0]!;
  const recordsByKind: Record<AwarenessKind, AwarenessRecord[]> = {
    articles: articleQuery.data ?? [],
    "cyber-tips": tipQuery.data ?? [],
    updates: updateQuery.data ?? [],
    "best-practices": practiceQuery.data ?? [],
    posters: posterQuery.data ?? [],
    infographics: infographicQuery.data ?? [],
    videos: videoQuery.data ?? [],
  };
  const records = recordsByKind[kind];
  const availableTopics = useMemo(
    () => ["All", ...new Set(records.map(recordTopic).filter(Boolean))],
    [records],
  );
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records
      .filter(
        (record) =>
          (status === "All" || recordStatus(record) === status) &&
          (topic === "All" || recordTopic(record) === topic) &&
          (!query || `${record.title} ${recordSummary(record)}`.toLowerCase().includes(query)),
      )
      .sort((a, b) => recordOrder(a, records.indexOf(a)) - recordOrder(b, records.indexOf(b)));
  }, [records, search, status, topic]);
  const queries = [
    articleQuery,
    tipQuery,
    updateQuery,
    practiceQuery,
    posterQuery,
    infographicQuery,
    videoQuery,
  ];
  const busy = queries.some((query) => query.isPending);
  const queryError = queries.find((query) => query.error)?.error;

  const save = async (record: AwarenessRecord) => {
    if (kind === "articles") await saveArticle.mutateAsync(record as Article);
    if (kind === "cyber-tips") await saveTip.mutateAsync(record as CyberTip);
    if (kind === "updates") await saveUpdate.mutateAsync(record as NewsUpdate);
    if (kind === "best-practices") await savePractice.mutateAsync(record as BestPractice);
    if (kind === "posters") await savePoster.mutateAsync(record as Poster);
    if (kind === "infographics") await saveInfographic.mutateAsync(record as Infographic);
    if (kind === "videos") await saveVideo.mutateAsync(record as VideoResource);
  };
  const remove = async (record: AwarenessRecord) => {
    if (kind === "articles") await removeArticle.mutateAsync(record.id);
    if (kind === "cyber-tips") await removeTip.mutateAsync(record.id);
    if (kind === "updates") await removeUpdate.mutateAsync(record.id);
    if (kind === "best-practices") await removePractice.mutateAsync(record.id);
    if (kind === "posters") await removePoster.mutateAsync(record.id);
    if (kind === "infographics") await removeInfographic.mutateAsync(record.id);
    if (kind === "videos") await removeVideo.mutateAsync(record.id);
  };
  const toggle = async (record: AwarenessRecord) => {
    try {
      await save({
        ...record,
        status: recordStatus(record) === "Published" ? "Draft" : "Published",
      });
      toast.success(
        recordStatus(record) === "Published" ? "Content unpublished" : "Content published",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The status could not be changed.");
    }
  };

  return (
    <div className="container-ncap max-w-[1400px] py-2">
      <PageHeader
        eyebrow="Administration · Awareness"
        title="Manage Awareness"
        description="Create, review, publish, and maintain every resource shown in the public Awareness hub. Changes are saved to the shared browser-demo repository."
      />
      <nav
        className="app-scrollbar mt-7 flex gap-2 overflow-x-auto border-b"
        aria-label="Awareness content types"
      >
        {kinds.map((item) => (
          <AppLink
            key={item.kind}
            href={`/admin/awareness/${item.kind}`}
            aria-current={item.kind === kind ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center border-b-2 border-transparent px-5 text-sm font-bold text-muted-foreground",
              item.kind === kind && "border-violet text-primary",
            )}
          >
            {item.label}
          </AppLink>
        ))}
      </nav>
      <section className="pt-6" aria-labelledby="awareness-section-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="awareness-section-title" className="text-2xl font-semibold">
              {active.label}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Manage the {active.label.toLowerCase()} available through the public Awareness hub.
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
            <AppLink href={active.publicHref} target="_blank" rel="noreferrer" className={outline}>
              <Eye /> View public collection
            </AppLink>
            <button className={primary} onClick={() => setEditing("new")}>
              <Plus /> Create {active.label.replace(/s$/, "").toLowerCase()}
            </button>
          </div>
        </div>
        <FilterToolbar label={`Filter ${active.label.toLowerCase()}`}>
          <DashboardSearchInput
            value={search}
            onChange={setSearch}
            placeholder={`Search ${active.label.toLowerCase()}…`}
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={dashboardSelect}
            aria-label="Publication filter"
          >
            <option>All</option>
            <option>Published</option>
            <option>Draft</option>
          </select>
          <select
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            className={dashboardSelect}
            aria-label="Category filter"
          >
            {availableTopics.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <ResultCount>{filtered.length} records</ResultCount>
        </FilterToolbar>
        {busy ? (
          <div
            className="mt-5 flex min-h-48 items-center justify-center rounded-xl border bg-white"
            aria-busy="true"
          >
            <LoaderCircle className="mr-2 size-5 animate-spin" /> Loading content…
          </div>
        ) : queryError ? (
          <div className="mt-5 rounded-xl border border-destructive/40 bg-destructive-soft p-6">
            <h2 className="font-semibold">Awareness content could not be loaded</h2>
            <p className="mt-2 text-sm">{queryError.message}</p>
          </div>
        ) : filtered.length ? (
          <div className="mt-5 overflow-x-auto rounded-xl border bg-white">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Topic / category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((record, index) => (
                  <tr key={record.id} className="border-t hover:bg-muted/40">
                    <td className="max-w-lg px-4 py-4 font-semibold">{record.title}</td>
                    <td className="px-4 py-4 text-muted-foreground">{recordTopic(record)}</td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-bold",
                          recordStatus(record) === "Published"
                            ? "bg-success-soft text-success"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {recordStatus(record)}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs">{recordOrder(record, index)}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          className={iconButton}
                          onClick={() => setPreviewing(record)}
                          aria-label={`Preview ${record.title}`}
                        >
                          <Eye className="size-4" />
                        </button>
                        <button
                          className={iconButton}
                          onClick={() => setEditing(record)}
                          aria-label={`Edit ${record.title}`}
                        >
                          <Edit3 className="size-4" />
                        </button>
                        <button
                          className={iconButton}
                          onClick={() => void toggle(record)}
                          aria-label={`${recordStatus(record) === "Published" ? "Unpublish" : "Publish"} ${record.title}`}
                        >
                          <Check className="size-4" />
                        </button>
                        <button
                          className={cn(
                            iconButton,
                            "hover:border-destructive hover:text-destructive",
                          )}
                          onClick={() => setDeleting(record)}
                          aria-label={`Delete ${record.title}`}
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
              icon={<FileText />}
              title={`No ${active.label.toLowerCase()} found`}
              description="Adjust the filters or create the first record for this collection."
              action={
                <button className={primary} onClick={() => setEditing("new")}>
                  <Plus className="size-4" /> Create content
                </button>
              }
            />
          </div>
        )}
        <AwarenessEditor
          key={editing === "new" ? `new-${kind}` : (editing?.id ?? "closed")}
          kind={kind}
          value={editing}
          records={records}
          topics={[
            "General",
            ...(topicQuery.data ?? [])
              .filter((item) => item.status === "Active")
              .map((item) => item.name),
          ]}
          onClose={() => setEditing(null)}
          onSave={save}
        />
        <PreviewDialog record={previewing} onClose={() => setPreviewing(null)} />
        <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete “{deleting?.title}”?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the record from the admin repository and the public site. Local
                uploaded media attached only to this record will also be removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={() => {
                  if (!deleting) return;
                  const record = deleting;
                  setDeleting(null);
                  void remove(record)
                    .then(async () => {
                      const media =
                        "image" in record
                          ? record.image
                          : "poster" in record
                            ? record.poster
                            : undefined;
                      if (media?.status === "local-demo")
                        await DemoMediaService.remove(media).catch(() => undefined);
                      toast.success("Awareness content deleted");
                    })
                    .catch((error: unknown) =>
                      toast.error(
                        error instanceof Error ? error.message : "The record could not be deleted.",
                      ),
                    );
                }}
              >
                Delete content
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}

function AwarenessEditor({
  kind,
  value,
  records,
  topics,
  onClose,
  onSave,
}: {
  kind: AwarenessKind;
  value: AwarenessRecord | "new" | null;
  records: AwarenessRecord[];
  topics: Topic[];
  onClose: () => void;
  onSave: (record: AwarenessRecord) => Promise<void>;
}) {
  const original = value === "new" ? null : value;
  const [title, setTitle] = useState(original?.title ?? "");
  const [slug, setSlug] = useState(original && "slug" in original ? (original.slug ?? "") : "");
  const [summary, setSummary] = useState(original ? recordSummary(original) : "");
  const [topic, setTopic] = useState<Topic>(
    original ? recordTopic(original) : (topics[0] ?? "General"),
  );
  const [status, setStatus] = useState<ContentStatus>(original ? recordStatus(original) : "Draft");
  const [author, setAuthor] = useState(
    original && "author" in original ? (original.author ?? "") : "NCAP Awareness Desk",
  );
  const [publishedAt, setPublishedAt] = useState(
    original
      ? "publishedAt" in original
        ? (original.publishedAt ?? "")
        : "date" in original
          ? original.date
          : ""
      : new Date().toISOString().slice(0, 10),
  );
  const [tags, setTags] = useState(
    original && "tags" in original ? (original.tags?.join(", ") ?? "") : "",
  );
  const [order, setOrder] = useState(original?.order ?? records.length + 1);
  const [body, setBody] = useState(
    original
      ? "body" in original
        ? (original.body?.join("\n\n") ?? "")
        : "text" in original
          ? original.text
          : "steps" in original
            ? original.steps.join("\n")
            : "points" in original
              ? original.points.join("\n")
              : "transcript" in original
                ? original.transcript.join("\n\n")
                : ""
      : "",
  );
  const [tag, setTag] = useState(original && "tag" in original ? original.tag : "Platform");
  const [readingMinutes, setReadingMinutes] = useState(
    original && "readingMinutes" in original ? original.readingMinutes : 5,
  );
  const [duration, setDuration] = useState(
    original && "durationLabel" in original ? original.durationLabel : "0:00",
  );
  const [sourceUrl, setSourceUrl] = useState(
    original && "sourceUrl" in original ? (original.sourceUrl ?? "") : "",
  );
  const [chapters, setChapters] = useState(
    original && "chapters" in original
      ? original.chapters.map((chapter) => `${chapter.at} | ${chapter.label}`).join("\n")
      : "0:00 | Introduction",
  );
  const originalMedia = original
    ? "image" in original
      ? original.image
      : "poster" in original
        ? original.poster
        : undefined
    : undefined;
  const [media, setMedia] = useState<MediaAsset | undefined>(originalMedia);
  const [saving, setSaving] = useState(false);
  const mediaRef = useRef(media);
  const committed = useRef(false);
  useEffect(() => {
    mediaRef.current = media;
  }, [media]);
  useEffect(
    () => () => {
      const pending = mediaRef.current;
      if (
        !committed.current &&
        pending?.status === "local-demo" &&
        pending.id !== originalMedia?.id
      )
        void DemoMediaService.remove(pending).catch(() => undefined);
    },
    [originalMedia?.id],
  );
  const changeMedia = (next: MediaAsset | undefined) => {
    if (media?.status === "local-demo" && media.id !== originalMedia?.id && media.id !== next?.id)
      void DemoMediaService.remove(media).catch(() => undefined);
    setMedia(next);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    const cleanSlug = topicSlug(slug.trim() || cleanTitle);
    const lines = body
      .split(/\r?\n(?:\s*\r?\n)?/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!cleanTitle || !cleanSlug || !summary.trim()) {
      toast.error("Title, slug, and summary/content are required.");
      return;
    }
    if (
      records.some(
        (record) => record.id !== original?.id && "slug" in record && record.slug === cleanSlug,
      )
    ) {
      toast.error("Use a unique slug for this content type.");
      return;
    }
    if (
      (kind === "posters" || kind === "infographics") &&
      status === "Published" &&
      !media &&
      !(original && "file" in original && original.file)
    ) {
      toast.error("Add an image before publishing this resource.");
      return;
    }
    if (
      (kind === "articles" || kind === "best-practices" || kind === "videos") &&
      status === "Published" &&
      lines.length === 0
    ) {
      toast.error("Add the full content before publishing.");
      return;
    }
    if (kind === "videos" && sourceUrl && !/^https?:\/\//i.test(sourceUrl)) {
      toast.error("Video source must be a complete http(s) URL.");
      return;
    }
    const id = original?.id ?? `${kind.slice(0, 2)}-${Date.now()}`;
    const common = {
      id,
      slug: cleanSlug,
      title: cleanTitle,
      status,
      author: author.trim() || "NCAP Awareness Desk",
      publishedAt,
      tags: tags
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      order: Math.max(1, Math.round(order)),
    };
    let record: AwarenessRecord;
    if (kind === "articles")
      record = {
        ...common,
        category: topic,
        summary: summary.trim(),
        readingMinutes: Math.max(1, Math.round(readingMinutes)),
        body: body
          .split(/\n\s*\n/)
          .map((part) => part.trim())
          .filter(Boolean),
        image: media,
        imageUrl: original && "imageUrl" in original ? original.imageUrl : undefined,
      };
    else if (kind === "cyber-tips") record = { ...common, topic, text: summary.trim() };
    else if (kind === "updates")
      record = {
        ...common,
        date: publishedAt,
        summary: summary.trim(),
        tag: tag.trim() || "Platform",
        body: body
          .split(/\n\s*\n/)
          .map((part) => part.trim())
          .filter(Boolean),
      };
    else if (kind === "best-practices")
      record = { ...common, topic, summary: summary.trim(), steps: lines };
    else if (kind === "posters") {
      const format: Poster["format"] =
        media?.mimeType === "image/png"
          ? "PNG"
          : media?.mimeType === "image/webp"
            ? "WEBP"
            : media
              ? "JPEG"
              : "SVG";
      record = {
        ...common,
        topic,
        description: summary.trim(),
        format,
        file: original && "file" in original ? original.file : "",
        image: media,
      };
    } else if (kind === "infographics")
      record = {
        ...common,
        category: topic,
        alt: media?.altText ?? summary.trim(),
        points: lines.length ? lines : [summary.trim()],
        file: original && "file" in original ? original.file : "",
        image: media,
      };
    else
      record = {
        ...common,
        category: topic,
        durationLabel: duration.trim() || "0:00",
        description: summary.trim(),
        chapters: chapters
          .split(/\r?\n/)
          .map((line) => {
            const [at = "0:00", ...label] = line.split("|");
            return { at: at.trim(), label: label.join("|").trim() };
          })
          .filter((chapter) => chapter.label),
        transcript: body
          .split(/\n\s*\n/)
          .map((part) => part.trim())
          .filter(Boolean),
        ...(sourceUrl ? { sourceUrl } : {}),
        poster: media,
        ...(original && "posterUrl" in original && original.posterUrl
          ? { posterUrl: original.posterUrl }
          : {}),
      };
    setSaving(true);
    try {
      await onSave(record);
      committed.current = true;
      if (originalMedia?.status === "local-demo" && originalMedia.id !== media?.id)
        await DemoMediaService.remove(originalMedia).catch(() => undefined);
      toast.success(original ? "Awareness content updated" : "Awareness content created");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The content could not be saved.");
    } finally {
      setSaving(false);
    }
  };
  const needsBody =
    kind === "articles" ||
    kind === "updates" ||
    kind === "best-practices" ||
    kind === "infographics" ||
    kind === "videos";
  const needsMedia =
    kind === "articles" || kind === "posters" || kind === "infographics" || kind === "videos";
  return (
    <Dialog open={Boolean(value)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{original ? "Edit" : "Create"} awareness content</DialogTitle>
          <DialogDescription>
            {status === "Published"
              ? "Saving updates the public collection immediately."
              : "Draft content remains available only in administration and preview."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void submit(event)} className="grid gap-4">
          <label className="text-sm font-semibold">
            Title *
            <input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (!original && !slug) setSlug(topicSlug(event.target.value));
              }}
              maxLength={160}
              className={field}
              required
            />
          </label>
          <label className="text-sm font-semibold">
            Slug *
            <input
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              maxLength={180}
              className={field}
              required
            />
          </label>
          <label className="text-sm font-semibold">
            {kind === "cyber-tips"
              ? "Tip text"
              : kind === "best-practices" || kind === "infographics"
                ? "Summary / accessible introduction"
                : kind === "posters"
                  ? "Description / accessible alt-text basis"
                  : "Summary"}{" "}
            *
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              className="mt-1.5 min-h-24 w-full rounded-lg border p-3"
              required
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-semibold">
              {kind === "updates" ? "Category" : "Topic"}
              {kind === "updates" ? (
                <input
                  value={tag}
                  onChange={(event) => setTag(event.target.value)}
                  maxLength={80}
                  className={field}
                />
              ) : (
                <select
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  className={field}
                >
                  {topics.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              )}
            </label>
            <label className="text-sm font-semibold">
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as ContentStatus)}
                className={field}
              >
                <option>Draft</option>
                <option>Published</option>
              </select>
            </label>
            <label className="text-sm font-semibold">
              Publish date
              <input
                type="date"
                value={publishedAt}
                onChange={(event) => setPublishedAt(event.target.value)}
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
              Author / source
              <input
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                maxLength={120}
                className={field}
              />
            </label>
            <label className="text-sm font-semibold">
              Tags (comma separated)
              <input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                maxLength={300}
                className={field}
              />
            </label>
          </div>
          {kind === "articles" && (
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
          )}
          {kind === "videos" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold">
                  Duration (m:ss)
                  <input
                    value={duration}
                    onChange={(event) => setDuration(event.target.value)}
                    className={field}
                  />
                </label>
                <label className="text-sm font-semibold">
                  Video source URL
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={(event) => setSourceUrl(event.target.value)}
                    placeholder="https://…"
                    className={field}
                  />
                </label>
              </div>
              <label className="text-sm font-semibold">
                Chapters (timestamp | label)
                <textarea
                  value={chapters}
                  onChange={(event) => setChapters(event.target.value)}
                  className="mt-1.5 min-h-28 w-full rounded-lg border p-3 font-mono text-sm"
                />
              </label>
            </>
          )}
          {needsBody && (
            <label className="text-sm font-semibold">
              {kind === "articles"
                ? "Article body"
                : kind === "updates"
                  ? "Full content / body"
                  : kind === "videos"
                    ? "Transcript (separate paragraphs with blank lines)"
                    : kind === "best-practices"
                      ? "Steps (one per line)"
                      : "Key points (one per line)"}{" "}
              *
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                className="mt-1.5 min-h-44 w-full rounded-lg border p-3"
              />
            </label>
          )}
          {needsMedia && (
            <MediaField
              label={
                kind === "videos" ? "Video poster image" : "Featured image / downloadable asset"
              }
              asset={media}
              fallbackUrl={
                original
                  ? "file" in original
                    ? original.file
                    : "imageUrl" in original
                      ? original.imageUrl
                      : "posterUrl" in original
                        ? original.posterUrl
                        : undefined
                  : undefined
              }
              initialAlt={original ? ("alt" in original ? original.alt : summary) : summary}
              guidance="Use an accessible, relevant image. Posters and infographics use this exact asset for public preview and download."
              onChange={changeMedia}
            />
          )}
          <DialogFooter>
            <button type="button" className={outline} onClick={onClose}>
              Cancel
            </button>
            <button className={primary} disabled={saving}>
              {saving && <LoaderCircle className="size-4 animate-spin" />}
              {saving ? "Saving…" : "Save record"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PreviewDialog({
  record,
  onClose,
}: {
  record: AwarenessRecord | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(record)} onOpenChange={(open) => !open && onClose()}>
      {record && <PreviewContent record={record} />}
    </Dialog>
  );
}

function PreviewContent({ record }: { record: AwarenessRecord }) {
  const media = "image" in record ? record.image : "poster" in record ? record.poster : undefined;
  const fallback =
    "file" in record
      ? record.file
      : "imageUrl" in record
        ? record.imageUrl
        : "posterUrl" in record
          ? record.posterUrl
          : undefined;
  const src = useMediaUrl(media, fallback);
  const detail =
    "body" in record
      ? (record.body ?? [])
      : "steps" in record
        ? record.steps
        : "points" in record
          ? record.points
          : "transcript" in record
            ? record.transcript
            : "text" in record
              ? [record.text]
              : [];
  return (
    <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{record.title}</DialogTitle>
        <DialogDescription>
          Administrative preview · {recordStatus(record)} · {recordTopic(record)}
        </DialogDescription>
      </DialogHeader>
      {src && (
        <img
          src={src}
          alt={media?.altText ?? ("alt" in record ? record.alt : record.title)}
          className="max-h-72 w-full rounded-xl bg-muted object-contain"
        />
      )}
      <p className="text-lg text-muted-foreground">{recordSummary(record)}</p>
      {detail.length > 0 && (
        <div className="grid gap-3 rounded-xl border bg-muted/30 p-5">
          {detail.map((part, index) => (
            <p key={`${part}-${index}`} className="leading-7">
              {part}
            </p>
          ))}
        </div>
      )}
    </DialogContent>
  );
}
