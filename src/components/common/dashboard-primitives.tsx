import { useInterfaceText } from "@/lib/i18n";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Filter, Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { fieldStyles } from "./control-styles";
import { cn } from "@/lib/utils";

export const dashboardButton = {
  primary: buttonVariants(),
  secondary: buttonVariants({ variant: "outline" }),
  icon: buttonVariants({ variant: "outline", size: "icon" }),
  destructive: buttonVariants({ variant: "destructive" }),
} as const;

export const dashboardField = `mt-1.5 ${fieldStyles}`;

export const dashboardSelect = `${fieldStyles} sm:w-auto`;

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
        "ncap-filter-toolbar mt-5 flex min-w-0 flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:flex-wrap sm:items-center",
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
        className={`${fieldStyles} pl-10`}
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
            ? "bg-destructive-soft text-red-700"
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
  const uiText = useInterfaceText();

  return (
    <nav
      className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"
      aria-label={uiText("Results pagination")}
    >
      <span aria-live="polite">
        {count} {uiText("records · Page")} {page} {uiText("of")} {pages}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className={dashboardButton.icon}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label={uiText("Previous page")}
        >
          <ChevronLeft />
        </button>
        <button
          type="button"
          className={dashboardButton.icon}
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          aria-label={uiText("Next page")}
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
        "data-table app-scrollbar mt-4 max-w-full overflow-x-auto overscroll-x-contain rounded-xl border bg-white",
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
