import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useCertificateVerification } from "@/services/certificate-hooks";
import { PageHeader } from "@/components/common/primitives";
import { dashboardButton, dashboardField } from "@/components/common/dashboard-primitives";

export const Route = createFileRoute("/verify-certificate")({
  validateSearch: (search: Record<string, unknown>) => ({
    reference: typeof search["reference"] === "string" ? search["reference"].slice(0, 100) : "",
  }),
  head: () => ({
    meta: [{ title: "Verify certificate | NCAP" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: VerificationPage,
});
function VerificationPage() {
  const search = Route.useSearch();
  const [value, setValue] = useState(search.reference);
  const [reference, setReference] = useState(search.reference);
  const result = useCertificateVerification(reference);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setReference(value.trim().replace(/^NCAP-/, ""));
  };
  return (
    <div className="container-ncap max-w-3xl py-10">
      <PageHeader
        title="Verify certificate"
        description="Check the current status of an NCAP certificate using its unique reference."
      />
      <form onSubmit={submit} className="mt-7 flex flex-wrap items-end gap-3">
        <label className="flex-1">
          Certificate reference
          <input
            className={dashboardField}
            required
            maxLength={100}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </label>
        <button className={dashboardButton.primary}>Verify</button>
      </form>
      {reference && (
        <div className="mt-7 rounded-xl border bg-white p-6" aria-live="polite">
          {result.isPending ? (
            <p role="status">Verifying…</p>
          ) : result.isError ? (
            <p role="alert">Verification unavailable. Please try again.</p>
          ) : (
            <>
              <h2 className="text-xl font-semibold">
                {result.data?.valid ? "Verified certificate" : "Invalid / unverified certificate"}
              </h2>
              {result.data?.status === "Revoked" && (
                <p className="mt-2 text-destructive">This certificate has been revoked.</p>
              )}
              {result.data?.moduleTitle && (
                <p className="mt-3">
                  {result.data.moduleTitle} · {result.data.issuer} ·{" "}
                  {result.data.issuedAt?.slice(0, 10)}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
