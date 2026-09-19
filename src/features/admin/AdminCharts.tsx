import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { quizTrend, topicEngagement } from "@/data/admin";

type QuizRow = { period: string; average: number; attempts: number };
type CompletionRow = { period: string; completions: number };

function ChartPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{description} · Demo data</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

export function AdminDashboardCharts() {
  return (
    <section className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
      <ChartPanel title="Quiz performance trend" description="Monthly average across demo attempts">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={quizTrend} margin={{ left: -20, right: 12, top: 12 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="period" tickLine={false} />
            <YAxis domain={[0, 100]} tickLine={false} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="average"
              stroke="var(--color-violet)"
              strokeWidth={3}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="sr-only">
          Average score rises from {quizTrend[0]?.average ?? 0} percent in{" "}
          {quizTrend[0]?.period ?? "the first period"} to {quizTrend.at(-1)?.average ?? 0} percent
          in {quizTrend.at(-1)?.period ?? "the final period"}.
        </p>
      </ChartPanel>
      <ChartPanel title="Topic engagement" description="Learners opening content by topic">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={topicEngagement} layout="vertical" margin={{ left: 20, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" hide />
            <YAxis dataKey="topic" type="category" width={72} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="learners" fill="var(--color-ember)" radius={[0, 5, 5, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p className="sr-only">
          {topicEngagement.map((row) => `${row.topic}: ${row.learners} learners`).join("; ")}.
        </p>
      </ChartPanel>
    </section>
  );
}

export function AdminReportCharts({
  quizRows,
  completionRows,
}: {
  quizRows: QuizRow[];
  completionRows: CompletionRow[];
}) {
  return (
    <section className="mt-6 grid gap-6 xl:grid-cols-2">
      <ChartPanel title="Quiz score trend" description="Average score by month">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={quizRows}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="period" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Line dataKey="average" stroke="var(--color-violet)" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
        <p className="sr-only">
          {quizRows.map((row) => `${row.period}: ${row.average} percent`).join("; ")}.
        </p>
      </ChartPanel>
      <ChartPanel title="Learning completions" description="Completed lessons by month">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={completionRows}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="completions" fill="var(--color-ember)" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p className="sr-only">
          {completionRows
            .map((row) => `${row.period}: ${row.completions} completed lessons`)
            .join("; ")}
          .
        </p>
      </ChartPanel>
    </section>
  );
}
