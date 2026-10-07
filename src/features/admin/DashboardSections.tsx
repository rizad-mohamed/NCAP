import { confirmAction } from "@/components/common/ConfirmationPanel";
import { ContentSkeleton } from "@/components/common/primitives";
import { useInterfaceText } from "@/lib/i18n";
import { useContentReport, exportFilteredReport } from "@/services/report-hooks";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Download,
  Printer,
  Plus,
  Edit3,
  Trash2,
  Check,
  CalendarDays,
  Megaphone,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useNcap } from "@/state/ncap-store";
import { useQuizCatalogue } from "@/services/quiz-hooks";
import { useDashboardAnnouncements } from "@/services/dashboard-hooks";
import type { Announcement } from "@/data/types";
import { PageHeader, StatCard, EmptyState } from "@/components/common/primitives";
import {
  dashboardButton,
  dashboardField,
  dashboardSelect,
  FilterToolbar,
  ResultCount,
  StatusBadge,
  DashboardSearchInput,
  DashboardPagination,
  ResponsiveTableContainer,
} from "@/components/common/dashboard-primitives";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useI18n } from "@/lib/i18n";
import { AdminReportCharts } from "./AdminCharts";

const primary = dashboardButton.primary;
const outline = dashboardButton.secondary;

export function AdminReportsPage() {
  const uiText = useInterfaceText();

  const store = useNcap();
  const catalogue = useQuizCatalogue(true);
  const [filters, setFilters] = useState({ range: "Last 6 months", moduleId: "", quizId: "" });
  const [generated, setGenerated] = useState(filters);
  const [attemptPage, setAttemptPage] = useState(1);
  const days =
    generated.range === "Last 30 days"
      ? 30
      : generated.range === "Year to date"
        ? Math.max(
            1,
            Math.ceil((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 1)) / 86400000),
          )
        : 183;
  const report = useContentReport(
    days,
    generated.moduleId || null,
    generated.quizId || null,
    (attemptPage - 1) * 100,
  );
  const attempts = report.data?.attempts ?? [];
  const [exporting, setExporting] = useState(false);
  const exportCsv = async () => {
    setExporting(true);
    try {
      await exportFilteredReport({
        days,
        moduleId: generated.moduleId || null,
        quizId: generated.quizId || null,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to export report.");
    } finally {
      setExporting(false);
    }
  };
  return (
    <div className="container-ncap max-w-[1400px] py-2">
      <PageHeader
        eyebrow={uiText("Administration · Reporting")}
        title={uiText("Learning reports")}
        description={uiText("Generate learning and assessment summaries from saved records.")}
        actions={
          <>
            <button
              className={outline}
              onClick={() => void exportCsv()}
              disabled={!report.data || exporting}
            >
              <Download />
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
            <button className={outline} onClick={() => window.print()}>
              <Printer />
              {uiText("Print")}{" "}
            </button>
          </>
        }
      />
      <section className="no-print mt-7 rounded-xl border bg-white p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-xs font-semibold">
            {uiText("Range")}{" "}
            <select
              className={dashboardField}
              value={filters.range}
              onChange={(event) => setFilters({ ...filters, range: event.target.value })}
            >
              <option>{uiText("Last 30 days")}</option>
              <option>{uiText("Last 6 months")}</option>
              <option>{uiText("Year to date")}</option>
            </select>
          </label>
          <label className="text-xs font-semibold">
            {uiText("Module")}{" "}
            <select
              className={dashboardField}
              value={filters.moduleId}
              onChange={(event) =>
                setFilters({ ...filters, moduleId: event.target.value, quizId: "" })
              }
            >
              <option value="">{uiText("All")}</option>
              {store.modules.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold">
            {uiText("Quiz")}{" "}
            <select
              className={dashboardField}
              value={filters.quizId}
              onChange={(event) => setFilters({ ...filters, quizId: event.target.value })}
            >
              <option value="">{uiText("All")}</option>
              {(catalogue.data ?? [])
                .filter((item) => !filters.moduleId || item.moduleId === filters.moduleId)
                .map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.title}
                  </option>
                ))}
            </select>
          </label>
          <button
            className={primary}
            onClick={() => {
              setAttemptPage(1);
              setGenerated(filters);
            }}
          >
            {uiText("Generate report")}{" "}
          </button>
        </div>
      </section>
      {report.isPending && <ContentSkeleton label={uiText("Loading report…")} />}
      {report.isError && (
        <p className="mt-4" role="alert">
          {uiText("Report unavailable. Please try again.")}{" "}
        </p>
      )}
      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label={uiText("Quiz attempts")} value={report.data?.attemptCount ?? 0} />
        <StatCard
          label={uiText("Average score")}
          value={`${report.data?.averageScore ?? 0}%`}
          tone="violet"
        />
        <StatCard
          label={uiText("Completion rate")}
          value={`${report.data?.completionRate ?? 0}%`}
          tone="success"
        />
        <StatCard label={uiText("Completed lessons")} value={report.data?.completedLessons ?? 0} />
        <StatCard
          label={uiText("Learning hours")}
          value={Math.round(((report.data?.learningSeconds ?? 0) / 3600) * 10) / 10}
        />
        <StatCard
          label={uiText("Published quizzes")}
          value={report.data?.publishedQuizzes ?? 0}
          tone="ember"
        />
      </section>
      <AdminReportCharts
        quizRows={report.data?.quizRows ?? []}
        completionRows={report.data?.completionRows ?? []}
      />
      <section className="mt-6 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <caption className="p-5 text-left text-lg font-semibold">
            {uiText("Filtered quiz attempts")}
          </caption>
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3">{uiText("Completed")}</th>
              <th className="px-4 py-3">{uiText("Quiz")}</th>
              <th className="px-4 py-3">{uiText("Module")}</th>
              <th className="px-4 py-3">{uiText("Score")}</th>
              <th className="px-4 py-3">{uiText("Score outcome")}</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-4 py-3 font-mono text-xs">{item.completedAt}</td>
                <td className="px-4 py-3 font-semibold">{item.quizTitle}</td>
                <td className="px-4 py-3">{item.moduleTitle}</td>
                <td className="px-4 py-3">{item.scorePercent}%</td>
                <td className="px-4 py-3">
                  <StatusBadge value={item.passed ? "Target met" : "Below target"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!attempts.length && (
          <div className="p-6">
            <EmptyState
              title={uiText("No quiz attempts match")}
              description={uiText("Adjust the report filters and generate the report again.")}
            />
          </div>
        )}
      </section>
      <DashboardPagination
        page={attemptPage}
        pages={Math.max(1, Math.ceil((report.data?.attemptCount ?? 0) / 100))}
        onPageChange={setAttemptPage}
        count={report.data?.attemptCount ?? 0}
      />
    </div>
  );
}

const blank = (): Announcement => ({
  id: "",
  title: "",
  body: "",
  audience: "All Learners",
  active: false,
  startsAt: new Date().toISOString().slice(0, 10),
  endsAt: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
});
export function AdminAnnouncementsPage() {
  const uiText = useInterfaceText();
  const { language } = useI18n();
  const announcements = useDashboardAnnouncements();
  const [editing, setEditing] = useState<Announcement | null>(null);
  const original = useRef("");
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);
  const records = announcements.data ?? [];
  const visible = records.filter(
    (item) =>
      (item.title + " " + item.body).toLowerCase().includes(search.toLowerCase()) &&
      (activeFilter === "all" || item.active === (activeFilter === "active")),
  );
  const pages = Math.max(1, Math.ceil(visible.length / 8));
  const currentPage = Math.min(page, pages);
  const pageItems = visible.slice((currentPage - 1) * 8, currentPage * 8);
  const dirty = editing !== null && JSON.stringify(editing) !== original.current;
  useEffect(() => {
    if (!dirty) return;
    const protect = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty]);
  const openEditor = (item: Announcement, target: HTMLButtonElement) => {
    original.current = JSON.stringify(item);
    returnFocus.current = target;
    setEditing({ ...item });
  };
  const closeEditor = async () => {
    if (announcements.save.isPending) return;
    if (dirty && !(await confirmAction(uiText("Discard unsaved announcement changes?")))) return;
    setEditing(null);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing || announcements.save.isPending) return;
    try {
      await announcements.save.mutateAsync({ ...editing, id: editing.id || undefined });
      setEditing(null);
      toast.success(uiText("Announcement saved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save announcement");
    }
  };
  const remove = async (id: string) => {
    if (!(await confirmAction("Delete this announcement?"))) return;
    try {
      await announcements.remove.mutateAsync(id);
      toast.success(uiText("Announcement deleted"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete announcement");
    }
  };
  const dateLabel = (date: string) =>
    new Date(date + "T00:00:00Z").toLocaleDateString(language, {
      dateStyle: "medium",
      timeZone: "UTC",
    });
  return (
    <div className="container-ncap max-w-6xl py-2">
      <PageHeader
        eyebrow={uiText("Administration · Communications")}
        title={uiText("Announcements")}
        description={uiText("Create and schedule notices shown on learner dashboards.")}
        actions={
          <button className={primary} onClick={(event) => openEditor(blank(), event.currentTarget)}>
            <Plus />
            {uiText("New announcement")}
          </button>
        }
      />
      {!announcements.isPending && !announcements.isError && (
        <section className="mt-6 grid gap-3 sm:grid-cols-3" aria-label={uiText("Announcements")}>
          <StatCard label={uiText("Announcements")} value={records.length} icon={<Megaphone />} />
          <StatCard
            label={uiText("Active")}
            value={records.filter((item) => item.active).length}
            icon={<Check />}
            tone="success"
          />
          <StatCard
            label={uiText("Inactive")}
            value={records.filter((item) => !item.active).length}
            icon={<CalendarDays />}
          />
        </section>
      )}
      <FilterToolbar label={uiText("Search announcements…")}>
        <DashboardSearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder={uiText("Search announcements…")}
        />
        <select
          className={dashboardSelect}
          aria-label={uiText("Announcement status")}
          value={activeFilter}
          onChange={(event) => {
            setActiveFilter(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">{uiText("All statuses")}</option>
          <option value="active">{uiText("Active")}</option>
          <option value="inactive">{uiText("Inactive")}</option>
        </select>
        <ResultCount>
          {visible.length} {uiText("records")}
        </ResultCount>
      </FilterToolbar>
      {announcements.isPending && (
        <div role="status" className="mt-6 grid gap-3">
          <p className="text-sm text-muted-foreground">{uiText("Loading announcements…")}</p>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl border bg-muted" />
          ))}
        </div>
      )}
      {announcements.isError && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-destructive/20 bg-destructive-soft p-6"
        >
          <p>{uiText("Announcements are unavailable. Please refresh.")}</p>
        </div>
      )}
      {!announcements.isPending && !announcements.isError && (
        <div className="mt-5 grid gap-3">
          {pageItems.map((item) => (
            <article key={item.id} className="rounded-xl border bg-white p-5 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge value={item.active ? "Active" : "Inactive"} />
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="size-3.5" aria-hidden="true" />
                      {uiText(item.audience)}
                    </span>
                  </div>
                  <h2 className="mt-3 break-words text-xl font-bold leading-snug">{item.title}</h2>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                    {item.body}
                  </p>
                  <p className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" aria-hidden="true" />
                    <time dateTime={item.startsAt}>{dateLabel(item.startsAt)}</time>
                    <span aria-hidden="true">→</span>
                    <time dateTime={item.endsAt}>{dateLabel(item.endsAt)}</time>
                  </p>
                </div>
                <div className="flex shrink-0 gap-2 border-t pt-3 sm:border-0 sm:pt-0">
                  <button
                    className={dashboardButton.icon}
                    onClick={(event) => openEditor(item, event.currentTarget)}
                    aria-label={"Edit " + item.title}
                  >
                    <Edit3 />
                  </button>
                  <button
                    className={dashboardButton.icon}
                    disabled={announcements.save.isPending}
                    onClick={() =>
                      void announcements.save
                        .mutateAsync({ ...item, active: !item.active })
                        .catch(() => toast.error(uiText("Unable to save announcement")))
                    }
                    aria-label={(item.active ? "Deactivate " : "Activate ") + item.title}
                  >
                    <Check />
                  </button>
                  <button
                    className={
                      dashboardButton.icon +
                      " text-destructive hover:border-destructive hover:text-destructive"
                    }
                    disabled={announcements.remove.isPending}
                    onClick={() => void remove(item.id)}
                    aria-label={"Delete " + item.title}
                  >
                    <Trash2 />
                  </button>
                </div>
              </div>
            </article>
          ))}
          {visible.length === 0 && (
            <EmptyState
              icon={<Megaphone />}
              title={uiText(records.length ? "No announcements match" : "No announcements")}
              description={uiText(
                records.length
                  ? "Clear the search or choose a different status."
                  : "Create a scheduled notice for learners.",
              )}
              action={
                records.length > 0 ? (
                  <button
                    className={outline}
                    onClick={() => {
                      setSearch("");
                      setActiveFilter("all");
                      setPage(1);
                    }}
                  >
                    {uiText("Clear filters")}
                  </button>
                ) : undefined
              }
            />
          )}
          {visible.length > 8 && (
            <DashboardPagination
              page={currentPage}
              pages={pages}
              count={visible.length}
              onPageChange={setPage}
            />
          )}
        </div>
      )}
      <Sheet
        open={editing !== null}
        onOpenChange={(value) => {
          if (!value) closeEditor();
        }}
      >
        <SheetContent
          aria-label={uiText("Announcement editor")}
          aria-labelledby={undefined}
          className="flex w-full flex-col gap-0 bg-white p-0 sm:max-w-xl"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocus.current?.focus();
          }}
        >
          <div className="border-b px-6 py-6 pr-16">
            <p className="meta mb-2 text-violet">{uiText("Announcements")}</p>
            <SheetTitle>
              {editing?.id ? uiText("Edit announcement") : uiText("New announcement")}
            </SheetTitle>
            <SheetDescription className="mt-2">
              {uiText("Create and schedule notices shown on learner dashboards.")}
            </SheetDescription>
          </div>
          {editing && (
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
              <div className="app-scrollbar grid min-h-0 flex-1 gap-5 overflow-y-auto p-6">
                <label className="text-sm font-bold">
                  {uiText("Title")}
                  <input
                    required
                    maxLength={160}
                    className={dashboardField}
                    value={editing.title}
                    onChange={(event) => setEditing({ ...editing, title: event.target.value })}
                  />
                </label>
                <label className="text-sm font-bold">
                  {uiText("Message")}
                  <textarea
                    required
                    maxLength={2000}
                    className={dashboardField + " min-h-36 resize-y py-3 font-normal leading-6"}
                    value={editing.body}
                    onChange={(event) => setEditing({ ...editing, body: event.target.value })}
                  />
                </label>
                <label className="text-sm font-bold">
                  {uiText("Audience")}
                  <select
                    className={dashboardField}
                    value={editing.audience}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        audience: event.target.value as Announcement["audience"],
                      })
                    }
                  >
                    <option value="All Learners">{uiText("All Learners")}</option>
                    <option value="New Learners">{uiText("New Learners")}</option>
                    <option value="Administrators">{uiText("Administrators")}</option>
                  </select>
                </label>
                <div className="grid gap-4 min-[400px]:grid-cols-2">
                  <label className="min-w-0 text-sm font-bold">
                    {uiText("Start date")}
                    <input
                      required
                      type="date"
                      className={dashboardField}
                      value={editing.startsAt}
                      onChange={(event) => setEditing({ ...editing, startsAt: event.target.value })}
                    />
                  </label>
                  <label className="min-w-0 text-sm font-bold">
                    {uiText("End date")}
                    <input
                      required
                      type="date"
                      min={editing.startsAt}
                      className={dashboardField}
                      value={editing.endsAt}
                      onChange={(event) => setEditing({ ...editing, endsAt: event.target.value })}
                    />
                  </label>
                </div>
                <label className="flex min-h-11 items-center gap-3 rounded-lg border bg-background px-3 text-sm font-bold">
                  <input
                    type="checkbox"
                    className="size-4 min-h-0 accent-violet"
                    checked={editing.active}
                    onChange={(event) => setEditing({ ...editing, active: event.target.checked })}
                  />
                  {uiText("Active")}
                </label>
                <details className="rounded-xl border bg-background p-4">
                  <summary className="min-h-8 cursor-pointer text-sm font-bold">
                    {uiText("Preview announcement")}
                  </summary>
                  <article className="announcement-row mt-4">
                    <h3 className="break-words text-lg font-bold">{editing.title}</h3>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                      {editing.body}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {uiText(editing.audience)} · {editing.startsAt} → {editing.endsAt}
                    </p>
                  </article>
                </details>
              </div>
              <div className="flex flex-wrap justify-end gap-2 border-t bg-white px-6 py-4">
                <button
                  type="button"
                  className={outline}
                  onClick={closeEditor}
                  disabled={announcements.save.isPending}
                >
                  {uiText("Cancel")}
                </button>
                <button
                  className={primary}
                  disabled={announcements.save.isPending}
                  aria-busy={announcements.save.isPending}
                >
                  {uiText("Save announcement")}
                </button>
              </div>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
