import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-5 border-b border-border/80 pb-7 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="meta mb-3 flex items-center gap-2 text-violet">
            <span className="size-1.5 rounded-full bg-violet" aria-hidden="true" />
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-bold md:text-4xl lg:text-[2.65rem]">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">{actions}</div>}
    </header>
  );
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold md:text-[1.75rem]">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "violet" | "ember" | "success";
}) {
  const tones = {
    default: "bg-card",
    violet: "bg-violet-soft",
    ember: "bg-ember-soft",
    success: "bg-success-soft",
  } as const;
  return (
    <div className={cn("panel min-w-0 p-5", tones[tone])}>
      <div className="flex items-start justify-between gap-3">
        <p className="meta text-muted-foreground">{label}</p>
        {icon && <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/75 text-violet shadow-sm [&_svg]:size-5">{icon}</span>}
      </div>
      <p className="mt-4 font-mono text-3xl font-bold tracking-tight text-foreground">{value}</p>
      {hint && <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong bg-card px-6 py-14 text-center shadow-panel">
      {icon && <div className="mb-4 grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground [&_svg]:size-6">{icon}</div>}
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function DemoTag({ label = "Demo data", className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full border border-violet/20 bg-violet-soft px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-accent-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="stagger-grid grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading content</span>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="panel p-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-4 h-5 w-3/4" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <Skeleton className="mt-5 h-9 w-28" />
        </div>
      ))}
    </div>
  );
}

export function ProgressMeter({
  value,
  label,
  size = "default",
}: {
  value: number;
  label: string;
  size?: "default" | "sm";
}) {
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label}: ${value}% complete`}
      className={cn("w-full overflow-hidden rounded-full bg-muted", size === "sm" ? "h-1.5" : "h-2")}
    >
      <div
        className="h-full w-full origin-left rounded-full bg-violet transition-transform duration-300"
        style={{ transform: `scaleX(${Math.min(100, Math.max(0, value)) / 100})` }}
      />
    </div>
  );
}
