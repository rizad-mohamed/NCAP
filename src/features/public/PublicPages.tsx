import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Download,
  Eye,
  FileText,
  Lightbulb,
  ListChecks,
  Newspaper,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import type {
  Article,
  BestPractice,
  CyberTip,
  Infographic,
  MediaAsset,
  NewsUpdate,
  Poster,
  VideoResource,
} from "@/data/types";
import { AppLink, PageCrumbs } from "@/components/layout/AppShell";
import { DemoTag, EmptyState, PageHeader, SectionHeading } from "@/components/common/primitives";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useMediaUrl } from "@/components/common/MediaField";
import { useRepository } from "@/services/repository-provider";
import { useRepositoryList } from "@/services/query-hooks";

export { HomePage } from "@/features/public/home/HomePage";

const btn =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-white shadow-sm hover:bg-violet hover:shadow-raised";
const btnOutline =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border-strong bg-white px-6 text-sm font-bold shadow-sm hover:border-violet hover:bg-accent hover:text-primary";
export function AwarenessHubPage() {
  const repository = useRepository();
  const { data: articles = [] } = useRepositoryList(repository, "articles");
  const { data: tips = [] } = useRepositoryList(repository, "cyberTips");
  const { data: news = [] } = useRepositoryList(repository, "newsUpdates");
  const { data: bestPractices = [] } = useRepositoryList(repository, "bestPractices");
  const { data: posters = [] } = useRepositoryList(repository, "posters");
  const { data: infographics = [] } = useRepositoryList(repository, "infographics");
  const { data: videos = [] } = useRepositoryList(repository, "videos");
  const featured = articles.find((article) => article.status === "Published");
  const categories = [
    [FileText, "Articles", "In-depth guidance for common online risks.", "/awareness/articles", articles.filter((item) => item.status === "Published").length],
    [Lightbulb, "Cyber tips", "Actions you can apply in under five minutes.", "/awareness/tips", tips.filter((item) => (item.status ?? "Published") === "Published").length],
    [
      Newspaper,
      "Demo updates",
      "Clearly labelled NCAP platform and learning updates.",
      "/awareness/news",
      news.filter((item) => (item.status ?? "Published") === "Published").length,
    ],
    [ListChecks, "Best practices", "Step-by-step security routines.", "/awareness/best-practices", bestPractices.filter((item) => (item.status ?? "Published") === "Published").length],
    [Download, "Posters", "Printable resources for schools and communities.", "/awareness/posters", posters.filter((item) => item.status === "Published").length],
    [Sparkles, "Infographics", "Visual explanations of key concepts.", "/awareness/infographics", infographics.filter((item) => (item.status ?? "Published") === "Published").length],
    [Video, "Videos", "Videos, chapters, and accessible transcripts.", "/awareness/videos", videos.filter((item) => (item.status ?? "Published") === "Published").length],
  ] as const;
  return (
    <div className="container-ncap py-12">
      <PageHeader
        eyebrow="Awareness hub"
        title="Know the signs. Take the safer next step."
        description="Explore practical, plain-language resources for the situations people encounter online every day."
        actions={
          <AppLink href="/learn/search" className={btnOutline}>
            <Search />
            Search all learning
          </AppLink>
        }
      />
      <section className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map(([Icon, title, text, href, count], index) => (
          <AppLink
            key={href}
            href={href}
            className="group interactive-card overflow-hidden rounded-xl border bg-white"
          >
            <div
              className={cn(
                "grid h-28 place-items-center border-b",
                index % 3 === 0 && "bg-sky-50 text-sky-800",
                index % 3 === 1 && "bg-amber-50 text-amber-800",
                index % 3 === 2 && "bg-emerald-50 text-emerald-800",
              )}
            >
              <span className="grid size-14 place-items-center rounded-2xl border border-current/15 bg-white/80 shadow-sm">
                <Icon className="size-7" aria-hidden="true" />
              </span>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{text}</p>
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">{count} published</p>
              <span className="mt-5 inline-flex min-h-10 items-center text-sm font-semibold text-primary">
                Explore{" "}
                <ArrowRight
                  className="ml-2 size-4 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </div>
          </AppLink>
        ))}
      </section>
      <section className="mt-16">
        <SectionHeading title="Featured resource" />
        <div className="grid overflow-hidden rounded-xl border bg-white lg:grid-cols-[.7fr_1.3fr]">
          <div className="grid-motif grid min-h-64 place-items-center bg-primary-soft p-8">
            <span className="grid size-28 place-items-center rounded-full bg-white text-primary shadow-raised">
              <ShieldCheck className="size-12" />
            </span>
          </div>
          <div className="p-8">
            <p className="meta text-violet">Featured · 7 min read</p>
            <h2 className="mt-3 text-3xl font-semibold">
              {featured?.title ?? "Practical cybersecurity guidance"}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {featured?.summary ?? "Explore reviewed NCAP awareness resources."}
            </p>
            <AppLink
              href={featured ? `/awareness/articles/${featured.slug}` : "/awareness/articles"}
              className={cn(btn, "mt-7")}
            >
              Read the article <ArrowRight />
            </AppLink>
          </div>
        </div>
      </section>
    </div>
  );
}

function FilterBar({
  search,
  setSearch,
  topic,
  setTopic,
  topics,
}: {
  search: string;
  setSearch: (s: string) => void;
  topic: string;
  setTopic: (s: string) => void;
  topics: string[];
}) {
  return (
    <div className="mt-8 flex flex-col gap-3 rounded-xl border bg-white p-3 md:flex-row">
      <label className="relative flex-1">
        <span className="sr-only">Search resources</span>
        <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 w-full rounded-lg border bg-background pl-10 pr-3"
          placeholder="Search by title or keyword…"
        />
      </label>
      <select
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        className="h-11 rounded-lg border bg-white px-3"
        aria-label="Filter by topic"
      >
        {topics.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </div>
  );
}

export function ArticlesPage() {
  const repository = useRepository();
  const { data: articles = [] } = useRepositoryList(repository, "articles");
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState("All");
  const [sort, setSort] = useState("Newest");
  const articleTopics = useMemo(
    () => [
      "All",
      ...new Set(
        articles
          .filter((article) => article.status === "Published")
          .map((article) => article.category),
      ),
    ],
    [articles],
  );
  const filtered = useMemo(
    () =>
      articles
        .filter(
          (a) =>
            a.status === "Published" &&
            (topic === "All" || a.category === topic) &&
            `${a.title} ${a.summary}`.toLowerCase().includes(search.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "Newest"
            ? b.publishedAt.localeCompare(a.publishedAt)
            : a.title.localeCompare(b.title),
        ),
    [articles, search, topic, sort],
  );
  return (
    <ContentContainer>
      <PageCrumbs items={[{ label: "Awareness", href: "/awareness" }, { label: "Articles" }]} />
      <PageHeader
        eyebrow="Awareness · Articles"
        title="Read, understand, act"
        description="Detailed guidance that turns cybersecurity advice into useful decisions."
      />
      <FilterBar
        search={search}
        setSearch={setSearch}
        topic={topic}
        setTopic={setTopic}
        topics={articleTopics}
      />
      <div className="mt-4 flex justify-between text-sm text-muted-foreground">
        <span>
          {filtered.length} article{filtered.length === 1 ? "" : "s"}
        </span>
        <label>
          Sort{" "}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="ml-2 rounded-md border bg-white p-2"
          >
            <option>Newest</option>
            <option>Title</option>
          </select>
        </label>
      </div>
      {filtered.length ? (
        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a, i) => (
            <ArticleCard key={a.id} article={a} accent={i === 0} />
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState
            icon={<Search />}
            title="No articles found"
            description="Try a different keyword or clear the topic filter."
            action={
              <button
                className={btnOutline}
                onClick={() => {
                  setSearch("");
                  setTopic("All");
                }}
              >
                Clear filters
              </button>
            }
          />
        </div>
      )}
    </ContentContainer>
  );
}

function ArticleCard({ article, accent = false }: { article: Article; accent?: boolean }) {
  return (
    <article
      className={cn(
        "interactive-card flex flex-col overflow-hidden rounded-xl border bg-white",
        accent && "border-violet/40 bg-violet-soft/40",
      )}
    >
      <div className="grid-motif flex h-24 items-center justify-between border-b bg-primary-soft px-5">
        <span className="grid size-11 place-items-center rounded-xl bg-white text-primary shadow-sm">
          <FileText className="size-5" aria-hidden="true" />
        </span>
        <span className="rounded-full border bg-white/90 px-3 py-1 text-xs font-bold text-primary">
          Practical guide
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="meta text-violet">{article.category}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {article.readingMinutes} min read
          </span>
        </div>
        <h3 className="mt-4 text-xl font-semibold">
          <AppLink href={`/awareness/articles/${article.slug}`} className="hover:text-primary">
            {article.title}
          </AppLink>
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
          {article.summary}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-6 text-xs text-muted-foreground">
          <span>{article.publishedAt}</span>
          <AppLink
            href={`/awareness/articles/${article.slug}`}
            className="inline-flex min-h-10 items-center font-semibold text-primary"
          >
            Read article <ArrowRight className="ml-1 size-4" aria-hidden="true" />
          </AppLink>
        </div>
      </div>
    </article>
  );
}

export function ArticleDetailPage({ slug }: { slug: string }) {
  const repository = useRepository();
  const { data: articles = [] } = useRepositoryList(repository, "articles");
  const article = articles.find((a) => a.slug === slug && a.status === "Published");
  if (!article) return <NotFoundContent />;
  const related = articles
    .filter(
      (a) => a.status === "Published" && a.category === article.category && a.id !== article.id,
    )
    .slice(0, 3);
  return (
    <ContentContainer narrow>
      <PageCrumbs
        items={[
          { label: "Awareness", href: "/awareness" },
          { label: "Articles", href: "/awareness/articles" },
          { label: article.title },
        ]}
      />
      <article>
        <header className="border-b pb-8">
          {(article.image || article.imageUrl) && (
            <MediaImage
              asset={article.image}
              fallback={article.imageUrl}
              alt={article.image?.altText ?? article.title}
              className="mb-8 aspect-video w-full rounded-xl bg-muted object-cover"
            />
          )}
          <span className="meta text-violet">{article.category}</span>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">{article.title}</h1>
          <p className="mt-5 text-xl text-muted-foreground">{article.summary}</p>
          <div className="mt-6 flex flex-wrap gap-5 text-sm text-muted-foreground">
            <span>By {article.author}</span>
            <span>{article.publishedAt}</span>
            <span>{article.readingMinutes} minute read</span>
            <span>Content language: English</span>
          </div>
        </header>
        <div className="prose-ncap mx-auto max-w-3xl py-10">
          {article.body.map((paragraph, i) =>
            i === 1 ? (
              <aside key={i} className="my-8 border-l-4 border-violet bg-violet-soft p-5">
                <strong className="block">Pause and check</strong>
                <p className="mt-2">{paragraph}</p>
              </aside>
            ) : (
              <p key={i} className="mb-6 text-lg leading-8 text-foreground/85">
                {paragraph}
              </p>
            ),
          )}
        </div>
        <aside className="rounded-xl border bg-primary p-6 text-white">
          <p className="meta text-white/60">Related learning module</p>
          <h2 className="mt-2 text-xl font-semibold">Build the skill, then test it</h2>
          <p className="mt-2 text-sm text-white/70">
            Continue with a structured lesson and practical knowledge check.
          </p>
          <AppLink
            href="/learn"
            className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-white px-4 font-semibold text-primary"
          >
            Explore learning modules
          </AppLink>
        </aside>
      </article>
      {related.length > 0 && (
        <section className="mt-14">
          <SectionHeading title="Related resources" />
          <div className="grid gap-4 md:grid-cols-3">
            {related.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}
    </ContentContainer>
  );
}

export function ResourceListingPage({
  kind,
}: {
  kind: "tips" | "news" | "best-practices" | "posters" | "infographics" | "videos";
}) {
  const [topic, setTopic] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const repository = useRepository();
  const { data: posters = [] } = useRepositoryList(repository, "posters");
  const { data: infographics = [] } = useRepositoryList(repository, "infographics");
  const { data: tips = [] } = useRepositoryList(repository, "cyberTips");
  const { data: news = [] } = useRepositoryList(repository, "newsUpdates");
  const { data: bestPractices = [] } = useRepositoryList(repository, "bestPractices");
  const { data: videos = [] } = useRepositoryList(repository, "videos");
  const definitions = {
    tips: ["Cyber tips", "Small actions, meaningful protection."],
    news: [
      "NCAP demo updates",
      "Fictional platform and awareness updates, clearly labelled as demonstration content.",
    ],
    "best-practices": [
      "Best practices",
      "Step-by-step routines for safer accounts, devices, and payments.",
    ],
    posters: [
      "Awareness posters",
      "Local printable SVG resources for classrooms, workplaces, and communities.",
    ],
    infographics: [
      "Infographics",
      "Open accessible visual explainers and download the local demo asset.",
    ],
    videos: ["Video learning", "Demo media experiences with useful chapters and full transcripts."],
  } as const;
  const [title, description] = definitions[kind];
  const data =
    kind === "tips"
      ? tips.filter((item) => (item.status ?? "Published") === "Published")
      : kind === "news"
        ? news.filter((item) => (item.status ?? "Published") === "Published")
        : kind === "best-practices"
          ? bestPractices.filter((item) => (item.status ?? "Published") === "Published")
          : kind === "posters"
            ? posters.filter((item) => item.status === "Published")
            : kind === "infographics"
              ? infographics.filter((item) => (item.status ?? "Published") === "Published")
              : videos.filter((item) => (item.status ?? "Published") === "Published");
  const query = search.trim().toLowerCase();
  const items = data.filter((item) => {
    const matchesTopic =
      topic === "All" ||
      ("topic" in item && item.topic === topic) ||
      ("category" in item && item.category === topic);
    const matchesSearch = !query || JSON.stringify(item).toLowerCase().includes(query);
    return matchesTopic && matchesSearch;
  });
  const availableTopics = [
    "All",
    ...new Set(
      data.flatMap((item) =>
        "topic" in item ? [item.topic] : "category" in item ? [item.category] : [],
      ),
    ),
  ];
  const selectedVideo = videos.find((v) => v.id === selected);
  const selectedInfo = infographics.find((v) => v.id === selected);
  return (
    <ContentContainer>
      <PageCrumbs items={[{ label: "Awareness", href: "/awareness" }, { label: title }]} />
      <PageHeader eyebrow="Awareness resources" title={title} description={description} />
      <div className="mt-8 rounded-2xl border bg-white p-3 shadow-panel sm:p-4">
        <label className="relative block">
          <span className="sr-only">Search {title.toLowerCase()}</span>
          <Search
            className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-12 w-full rounded-xl border bg-background pl-12 pr-4 text-base"
            placeholder={`Search ${title.toLowerCase()}…`}
          />
        </label>
        {kind !== "news" && (
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Topic filter">
            {availableTopics.map((x) => (
              <button
                key={x}
                onClick={() => setTopic(x)}
                aria-pressed={topic === x}
                className={cn(
                  "min-h-11 rounded-xl border bg-white px-4 text-sm font-medium",
                  topic === x && "border-primary bg-primary text-white",
                )}
              >
                {x}
              </button>
            ))}
          </div>
        )}
        <div
          className="mt-3 flex min-h-10 flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm text-muted-foreground"
          aria-live="polite"
        >
          <span>
            {items.length} {items.length === 1 ? "resource" : "resources"} found
          </span>
          {(search || topic !== "All") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setTopic("All");
              }}
              className="min-h-10 rounded-lg px-3 font-semibold text-primary hover:bg-primary-soft"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
      {items.length > 0 ? (
        <div className="stagger-grid mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((raw) => {
            if (kind === "tips") {
              const item = raw as CyberTip;
              return (
                <article key={item.id} className="interactive-card rounded-xl border bg-white p-5">
                  <span className="grid size-11 place-items-center rounded-xl bg-amber-50 text-amber-800">
                    <Lightbulb className="size-5" aria-hidden="true" />
                  </span>
                  <span className="meta mt-5 block text-muted-foreground">{item.topic}</span>
                  <h2 className="mt-2 text-xl font-semibold">{item.title}</h2>
                  <p className="mt-2 text-muted-foreground">{item.text}</p>
                </article>
              );
            }
            if (kind === "news") {
              const item = raw as NewsUpdate;
              return (
                <article key={item.id} className="interactive-card rounded-xl border bg-white p-5">
                  <div className="flex items-center justify-between">
                    <DemoTag label="NCAP Demo Update" />
                    <span className="text-xs text-muted-foreground">{item.date}</span>
                  </div>
                  <h2 className="mt-6 text-xl font-semibold">{item.title}</h2>
                  <p className="mt-2 text-muted-foreground">{item.summary}</p>
                  <details className="mt-5 rounded-lg bg-muted p-4 text-sm">
                    <summary className="cursor-pointer font-semibold">Read more</summary>
                    {(item.body?.length ? item.body : ["This demonstration update is not a report of a real-world incident."]).map((paragraph, index) => <p key={`${item.id}-${index}`} className="mt-2 text-muted-foreground">{paragraph}</p>)}
                  </details>
                </article>
              );
            }
            if (kind === "best-practices") {
              const item = raw as BestPractice;
              return (
                <article key={item.id} className="interactive-card rounded-xl border bg-white p-5">
                  <span className="meta text-violet">{item.topic}</span>
                  <h2 className="mt-3 text-xl font-semibold">{item.title}</h2>
                  <ol className="mt-5 grid gap-3">
                    {item.steps.map((s, i) => (
                      <li key={s} className="flex gap-3 text-sm">
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-success-soft font-mono text-xs font-bold text-success">
                          {i + 1}
                        </span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>
                </article>
              );
            }
            if (kind === "posters") {
              const item = raw as Poster;
              return (
                <article
                  key={item.id}
                  className="interactive-card overflow-hidden rounded-xl border bg-white"
                >
                  <MediaImage
                    asset={item.image}
                    fallback={item.file}
                    alt={item.image?.altText ?? `${item.title} awareness poster preview`}
                    className="aspect-[4/3] w-full bg-primary-soft object-cover"
                  />
                  <div className="p-5">
                    <span className="meta text-violet">
                      {item.topic} · {item.format}
                    </span>
                    <h2 className="mt-2 text-xl font-semibold">{item.title}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                    <MediaDownloadLink
                      asset={item.image}
                      fallback={item.file}
                      label={`Download ${item.format}`}
                      className={cn(btnOutline, "mt-5 w-full")}
                    />
                  </div>
                </article>
              );
            }
            if (kind === "infographics") {
              const item = raw as Infographic;
              return (
                <article key={item.id} className="interactive-card rounded-xl border bg-white p-5">
                  <MediaImage
                    asset={item.image}
                    fallback={item.file}
                    alt={item.image?.altText ?? item.alt}
                    className="aspect-[16/9] w-full rounded-lg bg-primary-soft object-cover"
                  />
                  <span className="meta mt-5 block text-violet">{item.category}</span>
                  <h2 className="mt-2 text-xl font-semibold">{item.title}</h2>
                  <button
                    onClick={() => setSelected(item.id)}
                    className={cn(btnOutline, "mt-5 w-full")}
                  >
                    <Eye />
                    Open infographic
                  </button>
                </article>
              );
            }
            const item = raw as VideoResource;
            return (
              <article
                key={item.id}
                className="interactive-card overflow-hidden rounded-xl border bg-white"
              >
                <button
                  onClick={() => setSelected(item.id)}
                  className="group relative block aspect-video w-full bg-primary text-white"
                  aria-label={`${item.sourceUrl ? "Open video" : "Open transcript preview"} ${item.title}`}
                >
                  {(item.poster || item.posterUrl) && <MediaImage asset={item.poster} fallback={item.posterUrl} alt="" className="absolute inset-0 size-full object-cover opacity-45" />}
                  <span className="absolute inset-0 grid-motif opacity-20" />
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="grid size-14 place-items-center rounded-full bg-white text-primary shadow-overlay transition group-hover:scale-105">
                      <Play className="ml-1" />
                    </span>
                  </span>
                  <span className="absolute bottom-3 right-3 rounded-md bg-black/70 px-2 py-1 font-mono text-xs">
                    {item.durationLabel}
                  </span>
                </button>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="meta text-violet">{item.category}</span>
                    <DemoTag label={item.sourceUrl ? "Video" : "Transcript preview"} />
                  </div>
                  <h2 className="mt-3 text-xl font-semibold">{item.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                  <button
                    onClick={() => setSelected(item.id)}
                    className="mt-4 inline-flex min-h-10 items-center font-semibold text-primary"
                  >
                    {item.sourceUrl ? "Open video" : "Read transcript"}{" "}
                    <ArrowRight className="ml-2 size-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            icon={<Search aria-hidden="true" />}
            title="No resources found"
            description="Try another keyword or clear the selected topic to see more resources."
            action={
              <button
                type="button"
                className={btnOutline}
                onClick={() => {
                  setSearch("");
                  setTopic("All");
                }}
              >
                Clear filters
              </button>
            }
          />
        </div>
      )}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          {selectedVideo && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedVideo.title}</DialogTitle>
                <DialogDescription>
                  {selectedVideo.sourceUrl
                    ? "Accessible video with chapters and a complete text transcript"
                    : "Text preview · Licensed video media has not been configured"}
                </DialogDescription>
              </DialogHeader>
              {selectedVideo.sourceUrl ? (
                <video
                  controls
                  preload="metadata"
                  poster={selectedVideo.posterUrl}
                  className="aspect-video w-full rounded-xl bg-primary"
                  aria-label={selectedVideo.title}
                >
                  <source src={selectedVideo.sourceUrl} />
                  Your browser does not support HTML5 video. Use the transcript below.
                </video>
              ) : (
                <p className="rounded-xl border bg-primary-soft p-5 text-sm">
                  NCAP does not present a fake player. The reviewed chapters and transcript remain
                  available while licensed media delivery is pending.
                </p>
              )}
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold">Chapters</h3>
                  <ol className="mt-3 grid gap-2">
                    {selectedVideo.chapters.map((c) => (
                      <li
                        key={c.at}
                        className="flex justify-between rounded-lg bg-muted p-3 text-sm"
                      >
                        <span>{c.label}</span>
                        <span className="font-mono">{c.at}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h3 className="font-semibold">Transcript</h3>
                  <div className="mt-3 grid gap-3 text-sm text-muted-foreground">
                    {selectedVideo.transcript.map((t) => (
                      <p key={t}>{t}</p>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
          {selectedInfo && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedInfo.title}</DialogTitle>
                <DialogDescription>{selectedInfo.alt}</DialogDescription>
              </DialogHeader>
              <MediaImage
                asset={selectedInfo.image}
                fallback={selectedInfo.file}
                alt={selectedInfo.image?.altText ?? selectedInfo.alt}
                className="max-h-[45vh] w-full rounded-lg bg-primary-soft object-contain"
              />
              <ul className="grid gap-2">
                {selectedInfo.points.map((p) => (
                  <li key={p} className="flex gap-2 text-sm">
                    <Check className="size-5 text-success" />
                    {p}
                  </li>
                ))}
              </ul>
              <MediaDownloadLink
                asset={selectedInfo.image}
                fallback={selectedInfo.file}
                label={`Download ${selectedInfo.image?.mimeType.split("/")[1]?.toUpperCase() ?? "SVG"}`}
                className={btn}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </ContentContainer>
  );
}

function MediaImage({
  asset,
  fallback,
  alt,
  className,
}: {
  asset?: MediaAsset | undefined;
  fallback?: string | undefined;
  alt: string;
  className: string;
}) {
  const src = useMediaUrl(asset, fallback);
  return src ? (
    <img src={src} alt={alt} className={className} loading="lazy" decoding="async" />
  ) : null;
}

function MediaDownloadLink({
  asset,
  fallback,
  label,
  className,
}: {
  asset?: MediaAsset | undefined;
  fallback?: string | undefined;
  label: string;
  className: string;
}) {
  const src = useMediaUrl(asset, fallback);
  if (!src) return null;
  return (
    <a
      href={src}
      download={asset?.fileName ?? true}
      className={className}
      onClick={() => toast.success("Resource download started")}
    >
      <Download aria-hidden="true" />
      {label}
    </a>
  );
}

export function InformationalPage({ kind }: { kind: "accessibility" | "privacy" }) {
  return (
    <ContentContainer narrow>
      <PageHeader
        eyebrow="NCAP platform"
        title={
          kind === "accessibility" ? "Accessibility statement" : "Privacy in this demonstration"
        }
        description={
          kind === "accessibility"
            ? "Our goal is an inclusive learning experience aligned with WCAG 2.2 AA-conscious practices."
            : "NCAP’s Foundation Release runs locally in your browser and does not connect to a production account system."
        }
      />
      <div className="mt-10 space-y-8 rounded-xl border bg-white p-6 md:p-10">
        {kind === "accessibility" ? (
          <>
            <InfoSection
              title="How this interface is built"
              text="The application uses semantic headings, labelled form controls, keyboard-accessible dialogs and menus, visible focus indicators, text equivalents for charts and progress, and reduced-motion support."
            />
            <InfoSection
              title="Languages and content"
              text="Core navigation is prepared for English, Sinhala, and Tamil. Learning content in this demo remains in English and is labelled accordingly."
            />
            <InfoSection
              title="Feedback"
              text="This is a frontend demonstration. A production release should provide an accessible contact channel and documented response process for accessibility issues."
            />
          </>
        ) : (
          <>
            <InfoSection
              title="What is stored"
              text="Non-sensitive demo state—lesson completion, bookmarks, quiz summaries, language preference, and mock content changes—may be stored in this browser."
            />
            <InfoSection
              title="What is never stored"
              text="Entered passwords, reset credentials, access tokens, API keys, and production identity data are not persisted. No real authentication or email delivery occurs."
            />
            <InfoSection
              title="Resetting the demo"
              text="Signed-in learner and administrator workspaces include a Reset demo data action. Clearing browser storage also removes local state."
            />
          </>
        )}
      </div>
    </ContentContainer>
  );
}
function InfoSection({ title, text }: { title: string; text: string }) {
  return (
    <section>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-muted-foreground">{text}</p>
    </section>
  );
}
export function NotFoundContent() {
  return (
    <div className="container-ncap grid min-h-[60vh] place-items-center py-20 text-center">
      <div>
        <p className="font-mono text-7xl font-bold text-violet">404</p>
        <h1 className="mt-5 text-3xl font-semibold">That page is not here</h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          The address may have changed, or the resource may no longer be available.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <AppLink href="/" className={btn}>
            Go home
          </AppLink>
          <AppLink href="/learn/search" className={btnOutline}>
            Search learning
          </AppLink>
        </div>
      </div>
    </div>
  );
}
function ContentContainer({
  children,
  narrow = false,
}: {
  children: React.ReactNode;
  narrow?: boolean;
}) {
  return (
    <div className={cn("container-ncap py-10 md:py-14", narrow && "max-w-5xl")}>{children}</div>
  );
}
