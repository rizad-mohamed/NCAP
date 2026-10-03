import { useContentReport, exportFilteredReport } from "@/services/report-hooks";
import { useState, type FormEvent } from "react";
import { Download, Printer, Plus, Edit3, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { useNcap } from "@/state/ncap-store";
import { useQuizCatalogue } from "@/services/quiz-hooks";
import { useDashboardAnnouncements } from "@/services/dashboard-hooks";
import type { Announcement } from "@/data/types";
import { PageHeader, StatCard, EmptyState } from "@/components/common/primitives";
import {
  dashboardButton,
  dashboardField,
  StatusBadge,
  DashboardSearchInput,
  DashboardPagination,
  ResponsiveTableContainer,
} from "@/components/common/dashboard-primitives";
import { AdminReportCharts } from "./AdminCharts";

const primary = dashboardButton.primary;
const outline = dashboardButton.secondary;

export function AdminReportsPage() {
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
        eyebrow="Administration · Reporting"
        title="Learning reports"
        description="Generate learning and assessment summaries from saved records."
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
              Print
            </button>
          </>
        }
      />
      <section className="no-print mt-7 rounded-xl border bg-white p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-xs font-semibold">
            Range
            <select
              className={dashboardField}
              value={filters.range}
              onChange={(event) => setFilters({ ...filters, range: event.target.value })}
            >
              <option>Last 30 days</option>
              <option>Last 6 months</option>
              <option>Year to date</option>
            </select>
          </label>
          <label className="text-xs font-semibold">
            Module
            <select
              className={dashboardField}
              value={filters.moduleId}
              onChange={(event) =>
                setFilters({ ...filters, moduleId: event.target.value, quizId: "" })
              }
            >
              <option value="">All</option>
              {store.modules.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold">
            Quiz
            <select
              className={dashboardField}
              value={filters.quizId}
              onChange={(event) => setFilters({ ...filters, quizId: event.target.value })}
            >
              <option value="">All</option>
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
            Generate report
          </button>
        </div>
      </section>
      {report.isPending && (
        <p className="mt-4" role="status">
          Loading report…
        </p>
      )}
      {report.isError && (
        <p className="mt-4" role="alert">
          Report unavailable. Please try again.
        </p>
      )}
      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Quiz attempts" value={report.data?.attemptCount ?? 0} />
        <StatCard
          label="Average score"
          value={`${report.data?.averageScore ?? 0}%`}
          tone="violet"
        />
        <StatCard
          label="Completion rate"
          value={`${report.data?.completionRate ?? 0}%`}
          tone="success"
        />
        <StatCard label="Completed lessons" value={report.data?.completedLessons ?? 0} />
        <StatCard
          label="Learning hours"
          value={Math.round(((report.data?.learningSeconds ?? 0) / 3600) * 10) / 10}
        />
        <StatCard
          label="Published quizzes"
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
          <caption className="p-5 text-left text-lg font-semibold">Filtered quiz attempts</caption>
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3">Completed</th>
              <th className="px-4 py-3">Quiz</th>
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Score outcome</th>
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
              title="No quiz attempts match"
              description="Adjust the report filters and generate the report again."
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
  const announcements = useDashboardAnnouncements();
  const [editing, setEditing] = useState<Announcement | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    try {
      await announcements.save.mutateAsync({ ...editing, id: editing.id || undefined });
      setEditing(null);
      toast.success("Announcement saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save announcement");
    }
  };
  const remove = async (id: string) => {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      await announcements.remove.mutateAsync(id);
      toast.success("Announcement deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete announcement");
    }
  };
  return (
    <div className="container-ncap max-w-6xl py-2">
      <PageHeader
        eyebrow="Administration · Communications"
        title="Announcements"
        description="Create and schedule notices shown on learner dashboards."
        actions={
          <button className={primary} onClick={() => setEditing(blank())}>
            <Plus />
            New announcement
          </button>
        }
      />
      {announcements.isPending && (
        <p role="status" className="mt-7">
          Loading announcements…
        </p>
      )}
      {announcements.isError && (
        <p role="alert" className="mt-7">
          Announcements are unavailable. Please refresh.
        </p>
      )}
      <div className="mt-7 grid gap-4">
        {(announcements.data ?? []).map((item) => (
          <article key={item.id} className="rounded-xl border bg-white p-5">
            <div className="flex justify-between gap-4">
              <div>
                <div className="flex gap-2">
                  <StatusBadge value={item.active ? "Active" : "Inactive"} />
                  <span className="meta text-muted-foreground">{item.audience}</span>
                </div>
                <h2 className="mt-3 text-xl font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                <p className="mt-4 font-mono text-xs text-muted-foreground">
                  {item.startsAt} → {item.endsAt}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className={outline}
                  onClick={() => setEditing(item)}
                  aria-label={`Edit ${item.title}`}
                >
                  <Edit3 />
                </button>
                <button
                  className={outline}
                  onClick={() =>
                    void announcements.save.mutateAsync({ ...item, active: !item.active })
                  }
                  aria-label={`${item.active ? "Deactivate" : "Activate"} ${item.title}`}
                >
                  <Check />
                </button>
                <button
                  className={outline}
                  onClick={() => void remove(item.id)}
                  aria-label={`Delete ${item.title}`}
                >
                  <Trash2 />
                </button>
              </div>
            </div>
          </article>
        ))}
        {!announcements.isPending && !announcements.data?.length && (
          <EmptyState
            title="No announcements"
            description="Create a scheduled notice for learners."
          />
        )}
      </div>
      {editing && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          role="presentation"
        >
          <form
            className="grid w-full max-w-xl gap-4 rounded-xl bg-white p-6"
            onSubmit={submit}
            role="dialog"
            aria-modal="true"
            aria-label="Announcement editor"
          >
            <h2 className="text-xl font-semibold">{editing.id ? "Edit" : "Create"} announcement</h2>
            <label>
              Title
              <input
                required
                maxLength={160}
                className={dashboardField}
                value={editing.title}
                onChange={(event) => setEditing({ ...editing, title: event.target.value })}
              />
            </label>
            <label>
              Message
              <textarea
                required
                maxLength={2000}
                className={dashboardField}
                value={editing.body}
                onChange={(event) => setEditing({ ...editing, body: event.target.value })}
              />
            </label>
            <label>
              Audience
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
                <option>All Learners</option>
                <option>New Learners</option>
                <option>Administrators</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                Start date
                <input
                  required
                  type="date"
                  className={dashboardField}
                  value={editing.startsAt}
                  onChange={(event) => setEditing({ ...editing, startsAt: event.target.value })}
                />
              </label>
              <label>
                End date
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
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={editing.active}
                onChange={(event) => setEditing({ ...editing, active: event.target.checked })}
              />
              Active
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className={outline} onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className={primary} disabled={announcements.save.isPending}>
                Save announcement
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
