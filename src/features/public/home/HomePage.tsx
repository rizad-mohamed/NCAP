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

const primaryButton =
  "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-white shadow-sm transition hover:bg-violet hover:shadow-raised focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-soft";
const secondaryButton =
  "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border-strong bg-white px-6 text-sm font-bold text-foreground shadow-sm transition hover:border-violet hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-soft";
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
    image: "/images/home/course-family-safety.jpg",
    alt: "Sri Lankan family learning practical online safety together",
  },
  "m-phishing": {
    image: "/images/home/course-phishing.jpg",
    alt: "Laptop displaying a clear phishing warning",
  },
  "m-passwords": {
    image: "/images/home/course-passwords.jpg",
    alt: "Smartphone and secure padlock representing strong passwords",
    featured: true,
  },
  "m-devices": {
    image: "/images/home/course-mfa.jpg",
    alt: "Person securing a digital account on a smartphone",
  },
  "m-privacy": {
    image: "/images/home/course-online-banking.jpg",
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
  return (
    <section className="relative overflow-hidden border-b border-border bg-[radial-gradient(circle_at_88%_42%,var(--color-violet-soft)_0,transparent_33%)]">
      <div
        className="pointer-events-none absolute right-[-60px] top-14 size-72 rounded-full border-[54px] border-primary-soft sm:size-[430px]"
        aria-hidden="true"
      />
      <div className="container-ncap relative grid gap-8 pb-7 pt-10 lg:min-h-[500px] lg:grid-cols-[.96fr_1.04fr] lg:items-center lg:gap-10 lg:pb-5 lg:pt-8 xl:min-h-[535px] xl:gap-16">
        <div className="relative z-10 max-w-[650px]">
          <p className="meta inline-flex items-center gap-2 rounded-full bg-violet-soft px-3 py-2 text-violet">
            <span className="size-2 rounded-full bg-violet" aria-hidden="true" />
            Build cyber confidence
          </p>
          <h1 className="mt-6 max-w-[650px] text-[2.25rem] font-bold leading-[1.02] tracking-[-0.035em] text-foreground min-[440px]:text-[2.65rem] sm:text-[3.7rem] lg:text-[3.35rem] xl:text-[4rem]">
            Safer digital habits for <span className="text-violet">every Sri Lankan.</span>
          </h1>
          <p className="mt-5 max-w-[570px] text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Practical guidance, short lessons and trusted resources to help you stay safe, confident
            and responsible online—at home, at work and everywhere in between.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <AppLink href="/learn" className={primaryButton}>
              Start learning <ArrowRight className="size-4" aria-hidden="true" />
            </AppLink>
            <AppLink href="/learn/search" className={secondaryButton}>
              <BookOpenCheck className="size-4 text-violet" aria-hidden="true" /> Explore topics
            </AppLink>
          </div>
        </div>

        <HeroVisual />

        <div className="relative z-10 col-span-full grid grid-cols-2 gap-x-3 gap-y-4 border-t border-border pt-5 sm:grid-cols-3 lg:grid-cols-5 lg:border-0 lg:pt-0">
          {benefits.map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="flex min-h-11 items-center gap-2.5 text-xs font-bold leading-4 text-muted-foreground"
            >
              <Icon className="size-5 shrink-0 text-violet" strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto min-h-[370px] w-full max-w-[650px] sm:min-h-[470px] lg:min-h-[420px] xl:min-h-[455px]">
      <div
        className="absolute right-2 top-8 h-[78%] w-[65%] rotate-[5deg] rounded-[28px] bg-violet"
        aria-hidden="true"
      />
      <div className="absolute right-[8%] top-0 h-[72%] w-[72%] overflow-hidden rounded-[28px] bg-muted shadow-overlay sm:right-[7%] sm:w-[70%]">
        <img
          src="/images/home/hero-family.jpg"
          alt="Sri Lankan family building safer digital habits together on a laptop"
          width="1920"
          height="1440"
          fetchPriority="high"
          className="size-full object-cover object-center"
        />
      </div>

      <div className="absolute bottom-2 left-0 z-10 w-[62%] rounded-2xl bg-primary p-4 text-white shadow-overlay sm:bottom-5 sm:w-[56%] sm:p-5">
        <div className="flex gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet shadow-md">
            <ShieldCheck className="size-6" aria-hidden="true" />
          </span>
          <div>
            <p className="font-bold">Stay alert. Stay secure.</p>
            <p className="mt-1 hidden text-xs leading-5 text-white/70 sm:block">
              Small steps today build a safer tomorrow for you and your community.
            </p>
            <AppLink
              href="/awareness/videos"
              className="mt-3 inline-flex min-h-9 items-center gap-2 text-xs font-bold text-white transition hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <span className="grid size-5 place-items-center rounded-full border border-white/40">
                <Play className="ml-0.5 size-2.5 fill-current" aria-hidden="true" />
              </span>
              Watch intro video
            </AppLink>
          </div>
        </div>
      </div>

      <div className="absolute bottom-5 right-0 z-20 h-[38%] w-[30%] overflow-hidden rounded-2xl border-4 border-card bg-muted shadow-raised sm:h-[41%] sm:w-[31%]">
        <img
          src="/images/home/hero-phone-user.jpg"
          alt="Young Sri Lankan woman using her phone with confidence"
          width="1537"
          height="1920"
          fetchPriority="high"
          className="size-full object-cover object-center"
        />
      </div>
      <div
        className="absolute right-0 top-0 hidden h-16 w-20 opacity-70 sm:block"
        style={{
          backgroundImage: "radial-gradient(var(--color-violet) 1.5px, transparent 1.5px)",
          backgroundSize: "14px 14px",
        }}
        aria-hidden="true"
      />
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
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <AppLink
        href={href}
        className="hidden min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-bold text-violet transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-soft sm:inline-flex"
      >
        {action} <ArrowRight className="size-4" aria-hidden="true" />
      </AppLink>
    </div>
  );
}

function FeaturedLearning() {
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
      className="border-b border-border py-8 sm:py-10"
      aria-labelledby="featured-learning-heading"
    >
      <div className="container-ncap relative">
        <div id="featured-learning-heading">
          <SectionHeading
            title="Featured learning"
            description="Handpicked lessons to help you build practical cyber skills."
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
          onClick={() => trackRef.current?.scrollBy({ left: 280, behavior: "smooth" })}
          className="absolute right-0 top-[52%] z-20 grid size-11 cursor-pointer place-items-center rounded-xl border border-border bg-card text-violet shadow-raised transition hover:border-violet hover:bg-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-soft xl:hidden"
          aria-label="Show more featured courses"
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
        <AppLink
          href="/learn"
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-bold text-violet hover:bg-accent hover:text-accent-foreground sm:hidden"
        >
          View all courses <ArrowRight className="size-4" aria-hidden="true" />
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
  const resolvedImage = useMediaUrl(imageAsset, image);
  return (
    <article className="group w-[76vw] max-w-[270px] shrink-0 snap-start overflow-hidden rounded-xl border border-border bg-card shadow-panel transition hover:-translate-y-0.5 hover:border-violet hover:shadow-raised sm:w-[245px] xl:w-auto">
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
            {level}
          </span>
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary/85 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
            <Clock3 className="size-3" aria-hidden="true" /> {minutes} min
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
            <span>{lessons} Lessons</span>
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
  return (
    <section className="border-b border-border py-8 sm:py-9" aria-labelledby="topics-heading">
      <div className="container-ncap">
        <div id="topics-heading">
          <SectionHeading
            title="Browse by topic"
            description="Find guidance on the risks and situations that matter most."
            href="/learn/search"
            action="View all topics"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          {topics.map(({ label, icon: Icon, iconClass, bubbleClass, query }) => (
            <AppLink
              key={label}
              href={`/learn/search?q=${encodeURIComponent(query)}`}
              className="group flex min-h-[148px] cursor-pointer flex-col items-center justify-center rounded-xl border border-border bg-card p-3 text-center shadow-panel transition hover:-translate-y-0.5 hover:border-violet hover:shadow-raised focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-soft"
            >
              <span className={`grid size-14 place-items-center rounded-full ${bubbleClass}`}>
                <Icon className={`size-7 ${iconClass}`} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className="mt-3 text-[13px] font-bold leading-[1.35] text-foreground group-hover:text-violet">
                {label}
              </span>
            </AppLink>
          ))}
        </div>
        <AppLink
          href="/learn/search"
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-bold text-violet hover:bg-accent hover:text-accent-foreground sm:hidden"
        >
          View all topics <ArrowRight className="size-4" aria-hidden="true" />
        </AppLink>
      </div>
    </section>
  );
}

function FamilyBanner() {
  return (
    <section className="container-ncap py-8 sm:py-10" aria-labelledby="family-safety-heading">
      <div className="relative isolate min-h-[400px] overflow-hidden rounded-2xl border border-border bg-primary-soft shadow-panel sm:min-h-[360px]">
        <img
          src="/images/home/family-banner.jpg"
          alt="Sri Lankan parents and child using digital devices together"
          width="1920"
          height="1081"
          loading="lazy"
          className="absolute inset-0 size-full object-cover object-[64%_center]"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-primary-soft from-35% via-primary-soft/90 via-52% to-transparent to-80%"
          aria-hidden="true"
        />
        <div
          className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary-soft via-primary-soft/50 to-transparent sm:hidden"
          aria-hidden="true"
        />
        <div className="relative z-10 flex min-h-[400px] max-w-xl flex-col justify-end p-6 sm:min-h-[360px] sm:justify-center sm:p-10 lg:p-12">
          <p className="meta w-fit rounded-full bg-card/90 px-3 py-1.5 text-violet">
            Stay safe together
          </p>
          <h2
            id="family-safety-heading"
            className="mt-4 max-w-[430px] text-3xl font-bold leading-[1.05] text-foreground sm:text-[2.65rem]"
          >
            Build safer digital habits as a family.
          </h2>
          <p className="mt-3 max-w-[430px] text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Practical lessons, trusted guidance and simple actions for parents, students and
            everyday users in Sri Lanka.
          </p>
          <AppLink href="/learn" className={`${primaryButton} mt-5 w-fit`}>
            Start learning <ArrowRight className="size-4" aria-hidden="true" />
          </AppLink>
        </div>
      </div>
    </section>
  );
}

function LatestResources() {
  const resources = [
    {
      label: "Guide",
      labelClass: "bg-violet-soft text-violet",
      title: "How to identify scams in 5 simple steps",
      description: "A quick guide to help you recognise and avoid common online scams.",
      image: "/images/home/resource-scam-guide.jpg",
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
      image: "/images/home/resource-platform-update.jpg",
      alt: "Laptop displaying the NCAP learning dashboard",
      action: "Read more",
      href: "/awareness/news",
      kind: "read" as const,
    },
  ];

  return (
    <section
      className="border-t border-border pb-5 pt-8 sm:pb-6 sm:pt-9"
      aria-labelledby="latest-resources-heading"
    >
      <div className="container-ncap">
        <div id="latest-resources-heading">
          <SectionHeading
            title="Latest updates & resources"
            description="Stay informed with new guides, posters and platform updates."
            href="/awareness/news"
            action="View all updates"
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {resources.map((resource) => (
            <article
              key={resource.title}
              className="group grid min-h-[230px] grid-cols-[1.04fr_.96fr] overflow-hidden rounded-xl border border-border bg-card shadow-panel transition hover:border-violet hover:shadow-raised"
            >
              <div className="flex min-w-0 flex-col p-4 sm:p-5">
                <span
                  className={`w-fit rounded-full px-2 py-1 text-[9px] font-bold uppercase ${resource.labelClass}`}
                >
                  {resource.label}
                </span>
                <h3 className="mt-3 text-base font-bold leading-[1.25] text-foreground">
                  {resource.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
                  {resource.description}
                </p>
                {resource.kind === "download" ? (
                  <a
                    href={resource.href}
                    download
                    className="mt-auto inline-flex min-h-10 w-fit cursor-pointer items-center gap-2 rounded-lg pt-3 text-xs font-bold text-violet hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-soft"
                  >
                    <Download className="size-4" aria-hidden="true" /> {resource.action}
                  </a>
                ) : (
                  <AppLink
                    href={resource.href}
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
          View all updates <ArrowRight className="size-4" aria-hidden="true" />
        </AppLink>
      </div>
    </section>
  );
}

function ImpactStrip() {
  const store = useNcap();
  const modules = useModules();
  const publishedLessons = store.lessons.filter((lesson) => lesson.status === "Published").length;
  const publishedArticles = useAwarenessSummary().data?.kinds.articles?.count ?? "—";
  return (
    <section className="container-ncap pb-3 pt-1" aria-label="NCAP demonstration impact indicators">
      <div className="grid overflow-hidden rounded-2xl bg-primary px-6 py-5 text-white shadow-raised md:grid-cols-[1.75fr_repeat(3,.65fr)] md:items-center md:px-8">
        <div className="flex items-center gap-4 border-b border-white/15 pb-5 md:border-b-0 md:border-r md:pb-0 md:pr-8">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/10 text-sky-200">
            <ShieldCheck className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-bold">A transparent Foundation Release demonstration</h2>
            <p className="mt-1 max-w-lg text-xs leading-5 text-white/65">
              These counts are derived from the learning and awareness records available in this
              browser.
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
            <span className="mt-1 block text-[11px] text-white/65">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
