import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  BookOpen,
  Bookmark,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  FileQuestion,
  Facebook,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Megaphone,
  Newspaper,
  Search,
  ShieldCheck,
  Instagram,
  Tags,
  UserRound,
  Users,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNcap, useSessionPreferences } from "@/state/ncap-store";
import { LanguageSelector } from "@/components/common/LanguageSelector";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function AppLink({
  href,
  className,
  children,
  onClick,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const navigate = useNavigate();
  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          props.target === "_blank" ||
          href.startsWith("http") ||
          href.startsWith("#")
        )
          return;
        event.preventDefault();
        void navigate({ to: href as never });
      }}
      {...props}
    >
      {children}
    </a>
  );
}

export function Brand({
  inverse = false,
  compact = false,
}: {
  inverse?: boolean;
  compact?: boolean;
}) {
  return (
    <AppLink
      href="/"
      className="inline-flex min-h-11 items-center gap-3 font-bold"
      aria-label="NCAP — National Cyber Awareness Platform Sri Lanka home"
    >
      <span
        className={cn(
          "relative grid size-10 place-items-center rounded-xl border shadow-sm",
          inverse
            ? "border-white/25 bg-white text-primary"
            : "border-primary/10 bg-primary text-white",
        )}
      >
        <ShieldCheck className="size-5" strokeWidth={2.25} aria-hidden="true" />
        <span
          className={cn(
            "absolute -bottom-2 -right-3 overflow-hidden rounded-[3px] border shadow-sm",
            inverse ? "border-primary" : "border-white",
          )}
          title="Sri Lanka"
          aria-hidden="true"
        >
          <img
            src="/flags/sri-lanka.svg"
            alt=""
            width="32"
            height="16"
            className="block h-4 w-8 object-cover"
          />
        </span>
      </span>
      {!compact && (
        <span className={cn("leading-tight", inverse ? "text-white" : "text-foreground")}>
          <span className="block text-lg tracking-[-0.03em]">NCAP</span>
          <span
            className={cn(
              "block text-[10px] font-bold uppercase tracking-[0.12em]",
              inverse ? "text-white/70" : "text-muted-foreground",
            )}
          >
            National Cyber Awareness
          </span>
        </span>
      )}
    </AppLink>
  );
}

const awarenessLinks = [
  ["Articles", "/awareness/articles"],
  ["Cyber tips", "/awareness/tips"],
  ["Demo updates", "/awareness/news"],
  ["Best practices", "/awareness/best-practices"],
  ["Posters", "/awareness/posters"],
  ["Infographics", "/awareness/infographics"],
  ["Videos", "/awareness/videos"],
] as const;
const mobileAwarenessLinks = awarenessLinks.filter(
  ([, href]) =>
    href !== "/awareness/news" &&
    href !== "/awareness/posters" &&
    href !== "/awareness/infographics",
);

function PublicHeader({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const { session, signOut } = useSessionPreferences();
  const active = (path: string) => pathname === path || pathname.startsWith(`${path}/`);
  const resourcesActive = active("/awareness/posters") || active("/awareness/infographics");
  const newsActive = active("/awareness/news");
  const searchActive = active("/learn/search");
  const awarenessActive = active("/awareness") && !resourcesActive && !newsActive;
  const learnActive = active("/learn") && !searchActive;
  return (
    <header className="no-print sticky top-0 z-40 border-b border-border/80 bg-white/95 shadow-[0_1px_0_rgb(15_23_42/0.02)] backdrop-blur-xl">
      <div className="container-ncap flex h-[68px] items-center justify-between gap-4">
        <Brand />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          <div className="group relative">
            <AppLink
              href="/awareness"
              className={navClass(awarenessActive)}
              aria-current={awarenessActive ? "page" : undefined}
            >
              Awareness <ChevronDown className="size-4" aria-hidden="true" />
            </AppLink>
            <div className="invisible absolute left-0 top-full w-60 translate-y-2 rounded-xl border bg-white p-2 opacity-0 shadow-overlay transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              {awarenessLinks.map(([label, href]) => (
                <AppLink
                  key={href}
                  href={href}
                  className="flex min-h-11 items-center rounded-lg px-3 text-sm font-bold text-secondary-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent"
                >
                  {label}
                </AppLink>
              ))}
            </div>
          </div>
          <AppLink
            href="/learn"
            className={navClass(learnActive)}
            aria-current={learnActive ? "page" : undefined}
          >
            Learn
          </AppLink>
          <AppLink
            href="/quizzes"
            className={navClass(active("/quizzes"))}
            aria-current={active("/quizzes") ? "page" : undefined}
          >
            Quizzes
          </AppLink>
          <AppLink
            href="/awareness/posters"
            className={navClass(resourcesActive)}
            aria-current={resourcesActive ? "page" : undefined}
          >
            Resources
          </AppLink>
          <AppLink
            href="/awareness/news"
            className={navClass(newsActive)}
            aria-current={newsActive ? "page" : undefined}
          >
            News &amp; Updates
          </AppLink>
          <AppLink
            href="/learn/search"
            className={cn(
              "grid size-11 place-items-center rounded-xl text-primary transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-soft",
              searchActive && "bg-primary-soft text-violet",
            )}
            aria-current={searchActive ? "page" : undefined}
            aria-label="Search NCAP learning"
          >
            <Search className="size-5" aria-hidden="true" />
          </AppLink>
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {session.role === "guest" ? (
            <>
              <AppLink
                href="/login"
                className="inline-flex min-h-11 items-center rounded-xl border border-primary px-4 text-sm font-bold text-primary transition hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-soft"
              >
                Sign In
              </AppLink>
              <AppLink
                href="/register"
                className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-sm transition hover:bg-violet hover:shadow-raised focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-soft"
              >
                Sign Up
              </AppLink>
            </>
          ) : (
            <AppLink
              href={session.role === "admin" ? "/admin" : "/dashboard"}
              className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-sm transition hover:bg-violet focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-soft"
            >
              Open {session.role === "admin" ? "administration" : "dashboard"}
            </AppLink>
          )}
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              className="grid size-11 place-items-center rounded-xl border bg-white shadow-sm hover:border-violet hover:bg-accent lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="size-5" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="flex w-[min(92vw,390px)] flex-col border-l bg-white p-6 sm:max-w-[390px]"
          >
            <SheetTitle className="sr-only">Navigation menu</SheetTitle>
            <SheetDescription className="sr-only">
              Browse NCAP awareness and learning areas.
            </SheetDescription>
            <div className="pr-12">
              <Brand />
            </div>
            <nav className="mt-8 grid gap-1 overflow-y-auto" aria-label="Mobile navigation">
              <AppLink
                href="/awareness"
                onClick={() => setOpen(false)}
                className={mobileNavClass(awarenessActive)}
              >
                Awareness hub
              </AppLink>
              {mobileAwarenessLinks.map(([label, href]) => (
                <AppLink
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center rounded-lg px-5 text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {label}
                </AppLink>
              ))}
              <AppLink
                href="/learn"
                onClick={() => setOpen(false)}
                className={mobileNavClass(learnActive)}
              >
                Learn
              </AppLink>
              <AppLink
                href="/quizzes"
                onClick={() => setOpen(false)}
                className={mobileNavClass(active("/quizzes"))}
              >
                Quizzes
              </AppLink>
              <AppLink
                href="/awareness/posters"
                onClick={() => setOpen(false)}
                className={mobileNavClass(resourcesActive)}
              >
                Resources
              </AppLink>
              <AppLink
                href="/awareness/news"
                onClick={() => setOpen(false)}
                className={mobileNavClass(newsActive)}
              >
                News &amp; Updates
              </AppLink>
              <AppLink
                href="/learn/search"
                onClick={() => setOpen(false)}
                className={mobileNavClass(searchActive)}
              >
                Search
              </AppLink>
            </nav>
            <div className="mt-auto grid gap-3 border-t pt-5">
              {session.role === "guest" ? (
                <>
                  <AppLink
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-primary font-bold text-primary hover:bg-primary-soft"
                  >
                    Sign In
                  </AppLink>
                  <AppLink
                    href="/register"
                    onClick={() => setOpen(false)}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary font-bold text-white shadow-sm hover:bg-violet"
                  >
                    Sign Up
                  </AppLink>
                </>
              ) : (
                <>
                  <AppLink
                    href={session.role === "admin" ? "/admin" : "/dashboard"}
                    onClick={() => setOpen(false)}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary font-bold text-white shadow-sm hover:bg-violet"
                  >
                    Open {session.role === "admin" ? "administration" : "dashboard"}
                  </AppLink>
                  <button
                    type="button"
                    onClick={() => {
                      signOut();
                      setOpen(false);
                    }}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border font-bold hover:bg-muted"
                  >
                    Sign out
                  </button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

function navClass(active: boolean) {
  return cn(
    "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-bold text-secondary-foreground hover:bg-accent hover:text-accent-foreground",
    active && "bg-primary-soft text-primary shadow-[inset_0_-2px_0_var(--color-violet)]",
  );
}
function mobileNavClass(active: boolean) {
  return cn(
    "flex min-h-11 items-center rounded-lg px-3 font-bold hover:bg-muted",
    active && "bg-primary-soft text-primary shadow-[inset_3px_0_0_var(--color-violet)]",
  );
}

const learnerNav = [
  ["Dashboard", "/dashboard", LayoutDashboard],
  ["Learn", "/learn", BookOpen],
  ["Quizzes", "/quizzes", ClipboardCheck],
  ["Bookmarks", "/bookmarks", Bookmark],
  ["Certificates", "/certificates", GraduationCap],
  ["Profile", "/profile", UserRound],
] as const;

const adminNav = [
  ["Overview", "/admin", LayoutDashboard],
  ["Users", "/admin/users", Users],
  ["Lessons", "/admin/lessons", BookOpen],
  ["Manage Awareness", "/admin/awareness", Newspaper],
  ["Manage Modules & Topics", "/admin/topics", Tags],
  ["Questions", "/admin/questions", FileQuestion],
  ["Reports", "/admin/reports", ChartNoAxesCombined],
  ["Certificates", "/admin/certificates", GraduationCap],
  ["Announcements", "/admin/announcements", Megaphone],
  ["Profile & settings", "/admin/profile", UserRound],
] as const;

function WorkspaceShell({
  pathname,
  kind,
  children,
}: {
  pathname: string;
  kind: "learner" | "admin";
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { resetDemo } = useNcap();
  const { session, signOut } = useSessionPreferences();
  const navigate = useNavigate();
  const nav = kind === "admin" ? adminNav : learnerNav;
  const active = (href: string) =>
    href === `/${kind}` ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const currentLabel = nav.find(([, href]) => active(href))?.[0] ?? "Workspace";
  const side = (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-5 py-5">
        <Brand inverse />
        <span className="mt-4 inline-flex rounded-full border border-sky-300/20 bg-sky-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-sky-200">
          {kind === "admin" ? "Administration" : "Learning workspace"}
        </span>
      </div>
      <nav
        className="app-scrollbar mt-3 grid gap-1 overflow-y-auto px-3"
        aria-label={`${kind} navigation`}
      >
        {nav.map(([label, href, Icon]) => (
          <AppLink
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            aria-current={active(href) ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-white/70 hover:bg-white/10 hover:text-white",
              active(href) && "bg-white text-primary shadow-md hover:bg-white hover:text-primary",
            )}
          >
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            <span>{label}</span>
          </AppLink>
        ))}
      </nav>
      <div className="mt-auto border-t border-white/10 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-xl bg-white/[0.06] px-3 py-3 text-white">
          <span className="grid size-10 place-items-center rounded-full bg-sky-400/20 text-sm font-bold text-sky-100 ring-1 ring-white/10">
            {(session.name || "D").slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{session.name || `Demo ${kind}`}</p>
            <p className="truncate text-xs text-white/55">
              {kind === "admin" ? "Administrator" : "Learner demo"}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            signOut();
            void navigate({ to: "/" });
          }}
          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-bold text-white/65 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="size-5" />
          Log out
        </button>
        <button
          onClick={() => {
            if (window.confirm("Reset all locally saved demo progress and content changes?"))
              resetDemo();
          }}
          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-xs font-bold text-white/50 hover:bg-white/10 hover:text-white"
        >
          <CircleHelp className="size-4" />
          Reset demo data
        </button>
      </div>
    </div>
  );
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-[272px] bg-rail shadow-overlay lg:block">
        {side}
      </aside>
      <div className="min-w-0 lg:col-start-2">
        <header className="no-print sticky top-0 z-30 flex min-h-[72px] flex-wrap items-center justify-between gap-2 border-b bg-white/95 px-4 py-2 shadow-[0_1px_0_rgb(15_23_42/0.02)] backdrop-blur-xl md:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button
                  className="grid size-11 place-items-center rounded-xl border bg-white shadow-sm hover:border-violet hover:bg-accent lg:hidden"
                  aria-label="Open workspace navigation"
                >
                  <Menu className="size-5" />
                </button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[min(88vw,320px)] border-0 bg-rail p-0 text-white sm:max-w-[320px]"
              >
                <SheetTitle className="sr-only">{kind} navigation</SheetTitle>
                <SheetDescription className="sr-only">
                  Navigate the NCAP {kind} workspace.
                </SheetDescription>
                {side}
              </SheetContent>
            </Sheet>
            <div className="max-[359px]:hidden">
              <span className="meta hidden text-muted-foreground sm:block">
                {kind === "admin" ? "Administration" : "My learning"}
              </span>
              <strong className="block text-base leading-tight sm:text-lg">{currentLabel}</strong>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSelector compact />
            <button
              className="relative grid size-11 place-items-center rounded-xl hover:bg-muted"
              aria-label="Notifications"
              onClick={() => toast.info("You have no new notifications in this demo.")}
            >
              <Bell className="size-5" />
              <span
                className="absolute right-2.5 top-2.5 size-2 rounded-full bg-success ring-2 ring-white"
                aria-hidden="true"
              />
            </button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="page-enter min-w-0 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PublicFooter({ pathname = "" }: { pathname?: string }) {
  const footerLink =
    "-mx-2 flex min-h-10 items-center rounded-lg px-2 text-sm text-rail-muted transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-soft";
  return (
    <footer
      id="social"
      className={cn(
        "no-print bg-primary text-primary-foreground",
        pathname === "/" ? "mt-0" : "mt-20",
      )}
    >
      <div className="h-1 bg-violet" aria-hidden="true" />
      <div className="container-ncap grid gap-9 py-10 sm:grid-cols-2 lg:grid-cols-[1.45fr_.72fr_.72fr_.85fr_1fr] lg:py-11">
        <div>
          <Brand inverse />
          <p className="mt-4 max-w-[270px] text-sm leading-6 text-rail-muted">
            A public initiative to empower every Sri Lankan to live, learn and work safely in a
            digital world.
          </p>
          <div className="mt-4 flex gap-2" aria-label="NCAP social media">
            {(
              [
                [Facebook, "Facebook"],
                [Instagram, "Instagram"],
                [Youtube, "YouTube"],
              ] as const
            ).map(([Icon, label]) => (
              <a
                key={label as string}
                href="#social"
                aria-label={label as string}
                className="grid size-10 place-items-center rounded-full border border-white/20 text-rail-muted transition-colors hover:border-violet-soft hover:bg-violet hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-soft"
              >
                <Icon className="size-4" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Awareness</h2>
          <div className="mt-3 grid">
            <AppLink href="/awareness/articles" className={footerLink}>
              Articles
            </AppLink>
            <AppLink href="/awareness/tips" className={footerLink}>
              Cyber tips
            </AppLink>
            <AppLink href="/awareness/posters" className={footerLink}>
              Posters
            </AppLink>
            <AppLink href="/awareness/infographics" className={footerLink}>
              Infographics
            </AppLink>
          </div>
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Learn</h2>
          <div className="mt-3 grid">
            <AppLink href="/learn" className={footerLink}>
              Modules
            </AppLink>
            <AppLink href="/quizzes" className={footerLink}>
              Quizzes
            </AppLink>
            <AppLink href="/awareness/videos" className={footerLink}>
              Videos
            </AppLink>
            <AppLink href="/learn/search" className={footerLink}>
              Guides
            </AppLink>
          </div>
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Resources</h2>
          <div className="mt-3 grid">
            <AppLink href="/awareness/news" className={footerLink}>
              Demo updates
            </AppLink>
            <AppLink href="/awareness/best-practices" className={footerLink}>
              Best practices
            </AppLink>
            <AppLink href="/awareness/posters" className={footerLink}>
              Toolkits
            </AppLink>
          </div>
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Follow us</h2>
          <div className="mt-4 flex gap-2">
            {[Facebook, Instagram, Youtube].map((Icon, index) => (
              <a
                key={index}
                href="#social"
                aria-label={`Social media link ${index + 1}`}
                className="grid size-10 place-items-center rounded-full border border-white/20 text-rail-muted transition-colors hover:border-violet-soft hover:bg-violet hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-soft"
              >
                <Icon className="size-4" aria-hidden="true" />
              </a>
            ))}
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm text-rail-muted">
            <MapPin className="size-4 text-violet-soft" aria-hidden="true" /> Sri Lanka
          </p>
        </div>
      </div>
      <div className="border-t border-white/15">
        <div className="container-ncap flex flex-col gap-3 py-5 text-xs text-rail-muted md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} NCAP (National Cyber Awareness). All rights reserved.</p>
          <div className="flex gap-5">
            <AppLink
              href="/privacy"
              className="rounded transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-soft"
            >
              Privacy Policy
            </AppLink>
            <AppLink
              href="/privacy"
              className="rounded transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-soft"
            >
              Terms of Use
            </AppLink>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function AppShell({ pathname, children }: { pathname: string; children: ReactNode }) {
  const { session } = useSessionPreferences();
  if (pathname.startsWith("/admin"))
    return (
      <WorkspaceShell pathname={pathname} kind="admin">
        {children}
      </WorkspaceShell>
    );
  const learnerArea = ["/dashboard", "/bookmarks", "/certificates", "/profile"].some((path) =>
    pathname.startsWith(path),
  );
  if (
    learnerArea ||
    (session.role === "learner" &&
      (pathname.startsWith("/learn") || pathname.startsWith("/quizzes")))
  ) {
    return (
      <WorkspaceShell pathname={pathname} kind="learner">
        {children}
      </WorkspaceShell>
    );
  }
  return (
    <>
      <PublicHeader pathname={pathname} />
      <main id="main-content" tabIndex={-1} className="page-enter">
        {children}
      </main>
      <PublicFooter pathname={pathname} />
    </>
  );
}

export function PageCrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-5 flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
    >
      <AppLink
        href="/"
        className="grid size-10 place-items-center rounded-lg hover:bg-accent hover:text-primary"
        aria-label="Home"
      >
        <Home className="size-4" />
      </AppLink>
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="contents">
          <ChevronRight className="size-4 text-border-strong" aria-hidden="true" />
          {item.href ? (
            <AppLink
              href={item.href}
              className="inline-flex min-h-10 items-center rounded-lg px-2 font-bold hover:bg-accent hover:text-primary"
            >
              {item.label}
            </AppLink>
          ) : (
            <span
              aria-current="page"
              className="inline-flex min-h-10 items-center px-2 font-bold text-foreground"
            >
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
