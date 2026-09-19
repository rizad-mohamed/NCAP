import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Filter, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export const dashboardButton = {
  primary:
    "inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-sm hover:bg-violet hover:shadow-raised disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  secondary:
    "inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-xl border border-border-strong bg-white px-4 text-sm font-bold shadow-sm hover:border-violet hover:bg-accent hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  icon: "grid size-11 shrink-0 place-items-center rounded-xl border border-border-strong bg-white shadow-sm hover:border-violet hover:bg-accent hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-4",
  destructive:
    "inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-xl bg-destructive px-4 text-sm font-bold text-destructive-foreground shadow-sm hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
} as const;

export const dashboardField =
  "mt-1.5 h-11 w-full min-w-0 rounded-lg border border-input bg-white px-3 text-base sm:text-sm";

export const dashboardSelect =
  "h-11 w-full min-w-0 rounded-lg border border-input bg-white px-3 text-base sm:w-auto sm:text-sm";

export function FilterToolbar({
  children,
  className,
  label = "Filter results",
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <section
      className={cn(
        "mt-5 flex min-w-0 flex-col gap-3 rounded-xl border bg-white p-3 sm:flex-row sm:flex-wrap sm:items-center",
        className,
      )}
      aria-label={label}
    >
      <Filter
        className="hidden size-4 shrink-0 text-muted-foreground md:block"
        aria-hidden="true"
      />
      {children}
    </section>
  );
}

export function DashboardSearchInput({
  value,
  onChange,
  placeholder,
  label = placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
  className?: string;
}) {
  return (
    <label className={cn("relative min-w-0 flex-1 sm:min-w-56", className)}>
      <span className="sr-only">{label}</span>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full min-w-0 rounded-lg border border-input bg-background pl-10 pr-3 text-base sm:text-sm"
        placeholder={placeholder}
      />
    </label>
  );
}

export function ResultCount({ children }: { children: ReactNode }) {
  return (
    <span
      className="shrink-0 self-center text-sm text-muted-foreground"
      aria-live="polite"
      aria-atomic="true"
    >
      {children}
    </span>
  );
}

export function StatusBadge({ value }: { value: string }) {
  const positive = ["Active", "Published", "Issued", "Eligible", "Target met"].includes(value);
  const negative = ["Suspended", "Not eligible", "Below target"].includes(value);
  return (
    <span
      className={cn(
        "inline-flex min-h-7 max-w-full items-center rounded-md px-2 py-1 text-xs font-semibold",
        positive
          ? "bg-success-soft text-success"
          : negative
            ? "bg-destructive-soft text-destructive"
            : "bg-muted text-muted-foreground",
      )}
    >
      <span className="mr-1.5 size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
      <span className="break-words">{value}</span>
    </span>
  );
}

export function DashboardPagination({
  page,
  pages,
  onPageChange,
  count,
}: {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
  count: number;
}) {
  return (
    <nav
      className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"
      aria-label="Results pagination"
    >
      <span aria-live="polite">
        {count} records · Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className={dashboardButton.icon}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft />
        </button>
        <button
          type="button"
          className={dashboardButton.icon}
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight />
        </button>
      </div>
    </nav>
  );
}

export function ResponsiveTableContainer({
  children,
  className,
  label = "Scrollable data table",
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn(
        "app-scrollbar mt-4 max-w-full overflow-x-auto overscroll-x-contain rounded-xl border bg-white",
        className,
      )}
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      {children}
    </div>
  );
}
