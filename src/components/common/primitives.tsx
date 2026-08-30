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
    <header className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className="meta mb-2 text-violet">{eyebrow}</p>}
        <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
        {description && <p className="mt-2 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
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
    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
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
    <div className={cn("rounded-lg border border-border p-4", tones[tone])}>
      <div className="flex items-start justify-between gap-3">
        <p className="meta text-muted-foreground">{label}</p>
        {icon && <span className="text-violet">{icon}</span>}
      </div>
      <p className="mt-3 font-mono text-2xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
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
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-card px-6 py-14 text-center">
      {icon && <div className="mb-3 text-muted-foreground">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function DemoTag({ label = "Demo data", className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading content</span>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-5">
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
        className="h-full rounded-full bg-violet transition-[width] duration-200"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
