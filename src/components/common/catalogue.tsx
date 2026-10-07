import type { ReactNode } from "react";
import { ShieldCheck, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** One compact editorial identity for awareness, learning and assessments. */
export function CatalogueHero({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="catalogue-hero">
      <div className="catalogue-hero-copy">
        <p className="meta flex items-center gap-2 text-signal">
          <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
          {eyebrow}
        </p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 md:text-base">{description}</p>
        {actions && (
          <div className="catalogue-hero-actions mt-5 flex flex-wrap gap-2">{actions}</div>
        )}
      </div>
      <div className="catalogue-orbit" aria-hidden="true">
        <span className="catalogue-orbit-ring" />
        <span className="catalogue-orbit-ring catalogue-orbit-ring-inner" />
        <span className="catalogue-orbit-core">
          <ShieldCheck strokeWidth={1.4} />
        </span>
        <span className="catalogue-orbit-spark">
          <Sparkles className="size-5" />
        </span>
        <span className="catalogue-orbit-dot" />
      </div>
    </header>
  );
}

export const catalogueCard =
  "catalogue-card interactive-card flex min-w-0 flex-col overflow-hidden rounded-xl border bg-white";
export const catalogueGrid =
  "stagger-grid mt-5 grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3";

export function ResourceGridSkeleton({
  label,
  count = 6,
  announce = true,
}: {
  label: string;
  count?: number;
  announce?: boolean;
}) {
  return (
    <div
      role={announce ? "status" : undefined}
      aria-busy={announce ? true : undefined}
      aria-hidden={announce ? undefined : true}
      className={catalogueGrid}
    >
      {announce && <span className="sr-only">{label}</span>}
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={catalogueCard} aria-hidden="true">
          <Skeleton className="catalogue-cover rounded-none" />
          <div className="p-5">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="mt-3 h-6 w-4/5" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-2/3" />
            <Skeleton className="mt-5 h-11 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CatalogueSkeleton({ label }: { label: string }) {
  return (
    <div className="container-ncap catalogue-page py-2" role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="catalogue-hero" aria-hidden="true">
        <div className="w-full max-w-2xl">
          <Skeleton className="h-3 w-36 bg-white/15" />
          <Skeleton className="mt-4 h-10 w-4/5 bg-white/15" />
          <Skeleton className="mt-4 h-5 w-full bg-white/15" />
        </div>
      </div>
      <div aria-hidden="true" className="mt-5 flex flex-wrap gap-3 rounded-xl border bg-white p-4">
        <Skeleton className="h-11 min-w-40 flex-1" />
        <Skeleton className="h-11 w-40" />
      </div>
      <ResourceGridSkeleton label={label} announce={false} />
    </div>
  );
}

export function CatalogueCover({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("catalogue-cover catalogue-cover-graphic", className)}>
      {children}
      <span className="catalogue-cover-line" aria-hidden="true" />
    </div>
  );
}
