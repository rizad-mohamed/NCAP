import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import {
  unwrapDashboard,
  type DashboardReportData,
  type ReportAttempt,
} from "@/services/dashboard-hooks";
import { getContentReport, exportContentReport } from "@/admin-modules.functions";

export function useContentReport(
  days: number,
  moduleId: string | null,
  quizId: string | null,
  offset: number,
) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["content-report", user?.id, days, moduleId, quizId, offset],
    enabled: user?.role === "super_admin",
    queryFn: () =>
      unwrapDashboard<DashboardReportData & { completionRate: number; publishedQuizzes: number }>(
        getContentReport({ data: { days, moduleId, quizId, offset } }),
      ),
  });
}
export function csvCell(value: string | number) {
  // Spreadsheet formula prefixes are dangerous even inside quoted CSV fields.
  const text = String(value);
  const safe = /^[\s]*[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
export async function exportFilteredReport(filters: {
  days: number;
  moduleId: string | null;
  quizId: string | null;
}) {
  const attempts = await unwrapDashboard<ReportAttempt[]>(exportContentReport({ data: filters }));
  const rows = [
    "Completed at,Quiz,Module,Score percent,Passed",
    ...attempts.map((item) =>
      [
        item.completedAt,
        item.quizTitle,
        item.moduleTitle,
        item.scorePercent,
        item.passed ? "Yes" : "No",
      ]
        .map(csvCell)
        .join(","),
    ),
  ];
  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + rows.join("\r\n")], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "ncap-learning-report.csv";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
