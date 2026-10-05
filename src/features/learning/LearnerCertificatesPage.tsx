import { useInterfaceText } from "@/lib/i18n";
import { useState } from "react";
import { Award, LockKeyhole } from "lucide-react";
import { useCertificates } from "@/services/certificate-hooks";
import { CertificatePreview } from "@/components/common/CertificatePreview";
import { PageHeader, EmptyState } from "@/components/common/primitives";
import { DashboardPagination, dashboardButton } from "@/components/common/dashboard-primitives";
import { AppLink } from "@/components/layout/AppShell";
import { cn } from "@/lib/utils";

export function LearnerCertificatesPage() {
  const uiText = useInterfaceText();

  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<string | null>(null);
  const registry = useCertificates((page - 1) * 20);
  return (
    <div className="container-ncap max-w-6xl py-2">
      <PageHeader
        eyebrow={uiText("My achievements")}
        title={uiText("Certificates")}
        description={uiText(
          "Eligibility requires full module completion and a best quiz score of at least 80%. Eligible certificates are issued by an administrator.",
        )}
      />
      {registry.isPending && (
        <p role="status" className="mt-4">
          {uiText("Loading certificates…")}{" "}
        </p>
      )}
      {registry.isError && (
        <p role="alert" className="mt-4">
          {uiText("Certificates unavailable. Please refresh.")}{" "}
        </p>
      )}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {registry.data?.items.map((item) => (
          <article
            key={item.moduleId}
            className={cn(
              "rounded-xl border bg-white p-6",
              item.eligibility.eligible && "border-success/50",
            )}
          >
            <div className="flex items-start justify-between">
              <span
                className={cn(
                  "grid size-12 place-items-center rounded-xl",
                  item.eligibility.eligible
                    ? "bg-success-soft text-success"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {item.eligibility.eligible ? <Award /> : <LockKeyhole />}
              </span>
              <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold">
                {item.record?.status ??
                  (item.eligibility.eligible ? "Eligible · Awaiting issuance" : "Not yet eligible")}
              </span>
            </div>
            <h2 className="mt-6 text-xl font-semibold">{item.moduleTitle}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {uiText("Module")} {item.eligibility.completionPercent}
              {uiText("% complete · Best quiz")} {item.eligibility.bestScore}%
            </p>
            {item.record && (
              <p className="mt-3 break-all font-mono text-xs text-muted-foreground">
                {uiText("NCAP-")}
                {item.record.reference} · {item.record.issued_at.slice(0, 10)}
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-2">
              {item.record && (
                <button
                  className={dashboardButton.secondary}
                  onClick={() => setPreview(item.record!.id)}
                >
                  {uiText("Preview")}{" "}
                </button>
              )}
              {!item.eligibility.eligible && (
                <AppLink
                  className={dashboardButton.secondary}
                  href={`/learn/modules/${item.moduleId}`}
                >
                  {uiText("Continue learning")}{" "}
                </AppLink>
              )}
            </div>
          </article>
        ))}
      </div>
      {!registry.isPending && !registry.isError && !registry.data?.items.length && (
        <EmptyState
          title={uiText("No certificates yet")}
          description={uiText("Published modules will appear here when available.")}
        />
      )}
      <DashboardPagination
        page={page}
        pages={Math.max(1, Math.ceil((registry.data?.total ?? 0) / 20))}
        count={registry.data?.total ?? 0}
        onPageChange={setPage}
      />
      <CertificatePreview id={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
