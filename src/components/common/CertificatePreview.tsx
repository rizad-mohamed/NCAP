import { Download, Printer, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { dashboardButton } from "@/components/common/dashboard-primitives";
import { useCertificateDocument } from "@/services/certificate-hooks";
import { useMediaUrl } from "@/components/common/MediaField";
import { toast } from "sonner";

export function CertificatePreview({ id, onClose }: { id: string | null; onClose: () => void }) {
  const query = useCertificateDocument(id);
  const record = query.data;
  const logo = useMediaUrl(record?.template.logo);
  const download = async () => {
    try {
      const response = await fetch(`/api/certificates/${id}/pdf`);
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? "Unable to download certificate.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `NCAP-${record?.reference}.pdf`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Certificate download failed.");
    }
  };
  return (
    <Dialog open={!!id} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Certificate preview</DialogTitle>
          <DialogDescription>Certificate facts and wording recorded at issuance.</DialogDescription>
        </DialogHeader>
        {query.isPending && <p role="status">Loading certificate…</p>}
        {query.isError && <p role="alert">Certificate unavailable. Please refresh.</p>}
        {record && (
          <>
            <div
              className={`print-surface border-8 border-double p-8 text-center md:p-14 ${record.template.theme === "teal" ? "border-success" : record.template.theme === "blue" ? "border-accent" : "border-primary"}`}
            >
              {logo ? (
                <img
                  src={logo}
                  alt={record.template.logo?.altText}
                  className="mx-auto h-12 object-contain"
                />
              ) : (
                <ShieldCheck className="mx-auto size-12 text-primary" />
              )}
              <p className="meta mt-5 text-primary">{record.template.issuer}</p>
              <h2 className="mt-5 text-4xl font-semibold">{record.template.title}</h2>
              <p className="mt-2 text-muted-foreground">{record.template.subtitle}</p>
              <p className="mt-7 text-muted-foreground">{record.template.body}</p>
              <p className="mt-3 text-3xl font-semibold">{record.evidence.learnerName}</p>
              <p className="mt-7 text-muted-foreground">for completing the learning module</p>
              <p className="mt-2 text-2xl font-semibold">{record.evidence.moduleTitle}</p>
              <div className="mx-auto mt-10 max-w-xs border-t pt-2">
                <p className="font-semibold">{record.template.signatoryName}</p>
                <p className="text-sm text-muted-foreground">{record.template.signatoryTitle}</p>
              </div>
              <p className="mt-8 font-mono text-xs text-muted-foreground">
                NCAP-{record.reference} · {record.issued_at.slice(0, 10)}
              </p>
              {record.status === "Revoked" && (
                <p className="mt-3 font-semibold text-destructive">
                  Revoked · {record.revocation_reason}
                </p>
              )}
            </div>
            <div className="no-print flex flex-wrap justify-end gap-2">
              <a
                className={dashboardButton.secondary}
                href={`/verify-certificate?reference=${record.reference}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Verify
              </a>
              <button className={dashboardButton.secondary} onClick={() => void download()}>
                <Download />
                Download PDF
              </button>
              <button className={dashboardButton.primary} onClick={() => window.print()}>
                <Printer />
                Print
              </button>
            </div>
            <details className="no-print">
              <summary>Certificate history</summary>
              {record.audit?.map((item, index) => (
                <p key={index} className="mt-2 text-sm">
                  {item.action} · {item.at}
                </p>
              ))}
            </details>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
