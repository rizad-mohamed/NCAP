import { Parallax } from "@/components/common/Parallax";
import { useInterfaceText } from "@/lib/i18n";
import { useAwarenessSummary } from "@/services/awareness-hooks";
import { useRef } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpenCheck,
  ChevronRight,
  Clock3,
  Download,
  KeyRound,
  Languages,
  Landmark,
  LockKeyhole,
  MapPinned,
  MessageSquareText,
  Play,
  SearchCheck,
  ShieldCheck,
  Smartphone,
  UsersRound,
} from "lucide-react";
import { AppLink } from "@/components/layout/AppShell";
import { useNcap } from "@/state/ncap-store";
import { useMediaUrl } from "@/components/common/MediaField";
import type { MediaAsset } from "@/data/types";
import { useRepository } from "@/services/repository-provider";
import { useRepositoryList } from "@/services/query-hooks";

import { homeHeroImage } from "./home-hero-image";

function useModules() {
  const repository = useRepository();
  return useRepositoryList(repository, "modules").data ?? [];
}

type Course = {
  title: string;
  description: string;
  image: string;
  imageAsset?: MediaAsset | undefined;
  alt: string;
  level: "Beginner" | "Intermediate";
  minutes: number;
  lessons: number;
  progress: number;
  href: string;
  featured?: boolean;
};

const courseVisuals: Record<string, { image: string; alt: string; featured?: boolean }> = {
  "m-fundamentals": {
    image: "/images/home/course-family-safety.webp",
    alt: "Sri Lankan family learning practical online safety together",
  },
  "m-phishing": {
    image: "/images/home/course-phishing.webp",
    alt: "Laptop displaying a clear phishing warning",
  },
  "m-passwords": {
    image: "/images/home/course-passwords.webp",
    alt: "Smartphone and secure padlock representing strong passwords",
    featured: true,
  },
  "m-devices": {
    image: "/images/home/course-mfa.webp",
    alt: "Person securing a digital account on a smartphone",
  },
  "m-privacy": {
    image: "/images/home/course-online-banking.webp",
    alt: "Secure mobile banking interface protected by a shield",
  },
};

const topics: {
  label: string;
  icon: LucideIcon;
  iconClass: string;
  bubbleClass: string;
  query: string;
}[] = [
  {
    label: "Phishing & Scams",
    icon: SearchCheck,
    iconClass: "text-violet",
    bubbleClass: "bg-violet-soft",
    query: "Phishing",
  },
  {
    label: "Passwords & Logins",
    icon: LockKeyhole,
    iconClass: "text-success",
    bubbleClass: "bg-success-soft",
    query: "Password Security",
  },
  {
    label: "MFA & Account Security",
    icon: ShieldCheck,
    iconClass: "text-violet",
    bubbleClass: "bg-violet-soft",
    query: "MFA",
  },
  {
    label: "Privacy & Data Protection",
    icon: KeyRound,
    iconClass: "text-primary",
    bubbleClass: "bg-primary-soft",
    query: "Privacy",
  },
  {
    label: "Devices & Mobile Safety",
    icon: Smartphone,
    iconClass: "text-ember",
    bubbleClass: "bg-ember-soft",
    query: "Device Security",
  },
  {
    label: "Online Banking Safety",
    icon: Landmark,
    iconClass: "text-violet",
    bubbleClass: "bg-violet-soft",
    query: "Online Banking",
  },
  {
    label: "Social Media Safety",
    icon: UsersRound,
    iconClass: "text-success",
    bubbleClass: "bg-success-soft",
    query: "Social Media",
  },
  {
    label: "Backups & Recovery",
    icon: BookOpenCheck,
    iconClass: "text-ember",
    bubbleClass: "bg-ember-soft",
    query: "Backups",
  },
];

const benefits: { label: string; icon: LucideIcon }[] = [
  { label: "Plain language guidance", icon: MessageSquareText },
  { label: "Built for Sri Lanka", icon: MapPinned },
  { label: "Short lessons, big impact", icon: BookOpenCheck },
  { label: "Guides to build confidence", icon: ShieldCheck },
  { label: "සිංහල / தமிழ் / English", icon: Languages },
];

export function HomePage() {
  return (
    <div className="overflow-x-clip bg-background text-foreground">
      <HomeHero />
      <FeaturedLearning />
      <TopicsGrid />
      <FamilyBanner />
      <LatestResources />
      <ImpactStrip />
    </div>
  );
}

function HomeHero() {
  const uiText = useInterfaceText();
  return (
    <>
      <section className="home-hero" aria-labelledby="home-title">
        <div className="container-ncap home-hero-inner">
          <div className="home-hero-copy">
            <p className="home-hero-eyebrow">{uiText("Build cyber confidence")}</p>
            <h1 id="home-title" className="mt-6">
              {uiText("Safer digital habits for")} <span>{uiText("every Sri Lankan.")}</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-slate-200 sm:text-lg sm:leading-8">
              {uiText(
                "Practical guidance, short lessons and trusted resources to help you stay safe, confident and responsible online—at home, at work and everywhere in between.",
              )}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <AppLink
                href="/learn"
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-signal px-6 font-bold text-signal-foreground hover:bg-white"
              >
                {uiText("Start learning")} <ArrowRight className="size-4" aria-hidden="true" />
              </AppLink>
              <AppLink
                href="/learn/search"
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-lg border border-white/35 px-6 font-bold text-white hover:bg-white/10"
              >
                {uiText("Explore topics")} <BookOpenCheck className="size-4" aria-hidden="true" />
              </AppLink>
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>
      <div className="home-trust-strip">
        <div className="container-ncap">
          {benefits.map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-3 text-xs font-bold leading-5 text-muted-foreground"
            >
              <Icon className="size-5 shrink-0 text-violet" strokeWidth={1.6} aria-hidden="true" />
              <span>{uiText(label)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function HeroVisual() {
  const uiText = useInterfaceText();
  return (
    <div className="home-hero-visual">
      <Parallax>
        <img
          src={homeHeroImage.src}
          srcSet={homeHeroImage.srcSet}
          sizes={homeHeroImage.sizes}
          alt={uiText("Sri Lankan family building safer digital habits together on a laptop")}
          width="960"
          height="720"
          fetchPriority="high"
          className="home-hero-image"
        />
      </Parallax>
      <div className="home-hero-caption">
        <span>
          <ShieldCheck className="size-6" strokeWidth={1.7} aria-hidden="true" />
        </span>
        <div>
          <p className="font-bold">{uiText("Stay alert. Stay secure.")}</p>
          <AppLink
            href="/awareness/videos"
            className="mt-1 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-violet hover:underline"
          >
            {uiText("Watch intro video")} <Play className="size-3" aria-hidden="true" />
          </AppLink>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  const uiText = useInterfaceText();
  return (
    <div className="home-section-heading">
      <div>
        <h2 className="font-bold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <AppLink
        href={href}
        className="hidden min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-bold text-violet transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-soft sm:inline-flex"
      >
        {uiText(action)} <ArrowRight className="size-4" aria-hidden="true" />
      </AppLink>
    </div>
  );
}

function FeaturedLearning() {
  const uiText = useInterfaceText();

  const trackRef = useRef<HTMLDivElement>(null);
  const store = useNcap();
  const modules = useModules();
  const courses: Course[] = [...modules]
    .filter((module) => module.status === "Published")
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((module) => {
      const moduleLessons = store.lessons.filter(
        (lesson) => lesson.moduleId === module.id && lesson.status === "Published",
      );
      const completed = moduleLessons.filter((lesson) =>
        store.completedLessons.includes(lesson.id),
      ).length;
      const visual = courseVisuals[module.id] ?? courseVisuals["m-fundamentals"]!;
      return {
        title: module.title,
        description: module.description,
        image: visual.image,
        imageAsset: module.image,
        alt: visual.alt,
        level: module.difficulty === "Advanced" ? "Intermediate" : module.difficulty,
        minutes: module.minutes,
        lessons: moduleLessons.length,
        progress: moduleLessons.length ? Math.round((completed / moduleLessons.length) * 100) : 0,
        href: `/learn/modules/${module.id}`,
        ...(visual.featured ? { featured: true } : {}),
      };
    });
  return (
    <section
      className="home-section border-b border-border"
      aria-labelledby="featured-learning-heading"
    >
      <div className="container-ncap relative">
        <div id="featured-learning-heading">
          <SectionHeading
            title={uiText("Featured learning")}
            description={uiText("Handpicked lessons to help you build practical cyber skills.")}
            href="/learn"
            action="View all courses"
          />
        </div>
        <div
          ref={trackRef}
          className="home-hide-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 xl:grid xl:grid-cols-5 xl:overflow-visible xl:pb-0"
        >
          {courses.map((course) => (
            <LearningCard key={course.title} {...course} />
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            trackRef.current?.scrollBy({
              left: 280,
              behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "instant"
                : "smooth",
            })
          }
          className="absolute right-0 top-[52%] z-20 grid size-11 cursor-pointer place-items-center rounded-xl border border-border bg-card text-violet shadow-raised transition hover:border-violet hover:bg-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-soft xl:hidden"
          aria-label={uiText("Show more featured courses")}
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
        <AppLink
          href="/learn"
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-bold text-violet hover:bg-accent hover:text-accent-foreground sm:hidden"
        >
          {uiText("View all courses")} <ArrowRight className="size-4" aria-hidden="true" />
        </AppLink>
      </div>
    </section>
  );
}

function LearningCard({
  title,
  description,
  image,
  imageAsset,
  alt,
  level,
  minutes,
  lessons,
  progress,
  href,
  featured = false,
}: Course) {
  const uiText = useInterfaceText();

  const resolvedImage = useMediaUrl(imageAsset, image);
  return (
    <article className="group w-[76vw] max-w-[270px] shrink-0 snap-start overflow-hidden rounded-xl border border-border bg-card transition hover:border-violet hover:shadow-raised sm:w-[245px] xl:w-auto">
      <AppLink
        href={href}
        className="flex h-full cursor-pointer flex-col focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-violet-soft"
      >
        <div className="relative aspect-[1.47] overflow-hidden bg-muted">
          <img
            src={resolvedImage}
            alt={imageAsset?.altText ?? alt}
            width="1920"
            height="1440"
            loading="lazy"
            className="size-full object-cover transition duration-300 motion-safe:group-hover:scale-[1.025]"
          />
          <span
            className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold ${level === "Beginner" ? "bg-card text-foreground" : "bg-success-soft text-success"}`}
          >
            {uiText(level)}
          </span>
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary/85 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
            <Clock3 className="size-3" aria-hidden="true" /> {minutes} {uiText("min")}{" "}
          </span>
          {featured && (
            <span className="absolute left-1/2 top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl bg-card text-violet shadow-raised">
              <Play className="ml-0.5 size-4 fill-current" aria-hidden="true" />
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-4">
          <h3 className="min-h-[2.7rem] text-[15px] font-bold leading-[1.35] text-foreground transition group-hover:text-violet">
            {title}
          </h3>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{description}</p>
          <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-[10px] font-bold text-muted-foreground">
            <span>
              {lessons} {uiText("Lessons")}
            </span>
            <span>{progress}%</span>
          </div>
          <div
            className="mt-2 h-1 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label={`Course progress: ${progress} percent`}
          >
            <span className="block h-full bg-violet" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </AppLink>
    </article>
  );
}

function TopicsGrid() {
  const uiText = useInterfaceText();

  return (
    <section
      className="home-section border-b border-border bg-white"
      aria-labelledby="topics-heading"
    >
      <div className="container-ncap">
        <div id="topics-heading">
          <SectionHeading
            title={uiText("Browse by topic")}
            description={uiText("Find guidance on the risks and situations that matter most.")}
            href="/learn/search"
            action="View all topics"
          />
        </div>
        <div className="grid overflow-hidden rounded-xl border border-border sm:grid-cols-2 lg:grid-cols-4">
          {topics.map(({ label, icon: Icon, iconClass, bubbleClass, query }) => (
            <AppLink
              key={label}
              href={`/learn/search?q=${encodeURIComponent(query)}`}
              className="home-topic group"
            >
              <span className={`home-topic-icon ${bubbleClass}`}>
                <Icon className={`size-7 ${iconClass}`} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className="text-sm font-bold leading-5 text-foreground group-hover:text-violet">
                {uiText(label)}
              </span>
              <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
            </AppLink>
          ))}
        </div>
        <AppLink
          href="/learn/search"
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-bold text-violet hover:bg-accent hover:text-accent-foreground sm:hidden"
        >
          {uiText("View all topics")} <ArrowRight className="size-4" aria-hidden="true" />
        </AppLink>
      </div>
    </section>
  );
}

function FamilyBanner() {
  const uiText = useInterfaceText();
  return (
    <section className="container-ncap home-section" aria-labelledby="family-safety-heading">
      <div className="home-family-banner">
        <div>
          <p className="meta text-signal">{uiText("Stay safe together")}</p>
          <h2
            id="family-safety-heading"
            className="mt-5 max-w-md text-3xl font-bold leading-tight sm:text-4xl"
          >
            {uiText("Build safer digital habits as a family.")}
          </h2>
          <p className="mt-4 max-w-md text-base leading-7 text-slate-200">
            {uiText(
              "Practical lessons, trusted guidance and simple actions for parents, students and everyday users in Sri Lanka.",
            )}
          </p>
          <AppLink
            href="/learn"
            className="mt-6 inline-flex min-h-12 items-center gap-3 rounded-lg bg-signal px-5 font-bold text-signal-foreground hover:bg-white"
          >
            {uiText("Start learning")} <ArrowRight className="size-4" aria-hidden="true" />
          </AppLink>
        </div>
        <img
          src="/images/home/family-banner.webp"
          alt={uiText("Sri Lankan parents and child using digital devices together")}
          width="960"
          height="540"
          loading="lazy"
        />
      </div>
    </section>
  );
}

function LatestResources() {
  const uiText = useInterfaceText();

  const resources = [
    {
      label: "Guide",
      labelClass: "bg-violet-soft text-violet",
      title: "How to identify scams in 5 simple steps",
      description: "A quick guide to help you recognise and avoid common online scams.",
      image: "/images/home/resource-scam-guide.webp",
      alt: "A scam warning displayed beside a person using a laptop",
      action: "5 min read",
      href: "/awareness/articles",
      kind: "read" as const,
    },
    {
      label: "Poster",
      labelClass: "bg-success-soft text-success",
      title: "Protect your accounts: MFA is a must!",
      description: "Enable multi-factor authentication to protect what matters.",
      image: "/images/home/resource-mfa-poster.svg",
      alt: "Blue multi-factor authentication awareness poster",
      action: "Download poster",
      href: "/images/home/resource-mfa-poster.svg",
      kind: "download" as const,
    },
    {
      label: "Platform update",
      labelClass: "bg-primary-soft text-primary",
      title: "NCAP Foundation Release demo updates",
      description: "New lessons, improved navigation and smarter bug fixes are now live.",
      image: "/images/home/resource-platform-update.webp",
      alt: "Laptop displaying the NCAP learning dashboard",
      action: "Read platform update",
      href: "/awareness/news",
      kind: "read" as const,
    },
  ];

  return (
    <section
      className="home-section border-t border-border bg-white"
      aria-labelledby="latest-resources-heading"
    >
      <div className="container-ncap">
        <div id="latest-resources-heading">
          <SectionHeading
            title={uiText("Latest updates & resources")}
            description={uiText("Stay informed with new guides, posters and platform updates.")}
            href="/awareness/news"
            action="View all updates"
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {resources.map((resource) => (
            <article
              key={uiText(resource.title)}
              className="group grid min-h-[230px] grid-cols-[1.04fr_.96fr] overflow-hidden rounded-xl border border-border bg-card shadow-panel transition hover:border-violet hover:shadow-raised"
            >
              <div className="flex min-w-0 flex-col p-4 sm:p-5">
                <span
                  className={`w-fit rounded-full px-2 py-1 text-[9px] font-bold uppercase ${resource.labelClass}`}
                >
                  {uiText(resource.label)}
                </span>
                <h3 className="mt-3 text-base font-bold leading-[1.25] text-foreground">
                  {resource.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
                  {uiText(resource.description)}
                </p>
                {resource.kind === "download" ? (
                  <a
                    href={resource.href}
                    download
                    className="mt-auto inline-flex min-h-10 w-fit cursor-pointer items-center gap-2 rounded-lg pt-3 text-xs font-bold text-violet hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-soft"
                  >
                    <Download className="size-4" aria-hidden="true" /> {uiText(resource.action)}
                  </a>
                ) : (
                  <AppLink
                    href={resource.href}
                    aria-label={`${resource.action}: ${resource.title}`}
                    className="mt-auto inline-flex min-h-10 w-fit items-center gap-2 rounded-lg pt-3 text-xs font-bold text-violet hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-soft"
                  >
                    {resource.action === "5 min read" && (
                      <Clock3 className="size-4" aria-hidden="true" />
                    )}
                    {resource.action}{" "}
                    {resource.action !== "5 min read" && (
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    )}
                  </AppLink>
                )}
              </div>
              <div className="m-3 ml-0 min-w-0 overflow-hidden rounded-xl bg-muted">
                <img
                  src={resource.image}
                  alt={resource.alt}
                  width="1920"
                  height="1440"
                  loading="lazy"
                  className="size-full object-cover transition duration-300 motion-safe:group-hover:scale-[1.025]"
                />
              </div>
            </article>
          ))}
        </div>
        <AppLink
          href="/awareness/news"
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-bold text-violet hover:bg-accent hover:text-accent-foreground sm:hidden"
        >
          {uiText("View all updates")} <ArrowRight className="size-4" aria-hidden="true" />
        </AppLink>
      </div>
    </section>
  );
}

function ImpactStrip() {
  const uiText = useInterfaceText();

  const store = useNcap();
  const modules = useModules();
  const publishedLessons = store.lessons.filter((lesson) => lesson.status === "Published").length;
  const publishedArticles = useAwarenessSummary().data?.kinds.articles?.count ?? "—";
  return (
    <section
      className="container-ncap py-8"
      aria-label={uiText("NCAP demonstration impact indicators")}
    >
      <div className="grid overflow-hidden rounded-2xl bg-primary px-6 py-5 text-white shadow-raised md:grid-cols-[1.75fr_repeat(3,.65fr)] md:items-center md:px-8">
        <div className="flex items-center gap-4 border-b border-white/15 pb-5 md:border-b-0 md:border-r md:pb-0 md:pr-8">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/10 text-sky-200">
            <ShieldCheck className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-bold">
              {uiText("A transparent Foundation Release demonstration")}
            </h2>
            <p className="mt-1 max-w-lg text-xs leading-5 text-slate-200">
              {uiText(
                "These counts are derived from the learning and awareness records available in this browser.",
              )}{" "}
            </p>
          </div>
        </div>
        {[
          [
            String(modules.filter((module) => module.status === "Published").length),
            "Learning modules",
          ],
          [String(publishedLessons), "Published lessons"],
          [String(publishedArticles), "Published articles"],
        ].map(([value, label]) => (
          <div
            key={label}
            className="border-white/15 py-4 text-center first-of-type:border-t md:border-l md:border-t-0 md:py-0"
          >
            <strong className="block text-3xl tracking-[-0.04em]">{value}</strong>
            <span className="mt-1 block text-[11px] text-slate-200">{uiText(label ?? "")}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
