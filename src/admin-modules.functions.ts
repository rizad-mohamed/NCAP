import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { createSupabaseServerClient } from "@/server/auth/supabase";
import {
  certificateResult,
  certificateRegistry,
  issueCertificate,
  revokeCertificate,
  certificateDocument,
  verifyCertificate,
  certificateTemplate,
  saveCertificateTemplate,
} from "@/server/certificates/service";
import { contentReport } from "@/server/reports/service";

function client() {
  setResponseHeaders(
    new Headers({ "cache-control": "private, no-store", vary: "Cookie, Authorization" }),
  );
  return createSupabaseServerClient();
}
export const getCertificateRegistry = createServerFn({ method: "GET" })
  .validator((v: unknown) => v)
  .handler(({ data }) => certificateResult(() => certificateRegistry(client(), data)));
export const createCertificate = createServerFn({ method: "POST" })
  .validator((v: unknown) => v)
  .handler(({ data }) => certificateResult(() => issueCertificate(client(), data)));
export const cancelCertificate = createServerFn({ method: "POST" })
  .validator((v: unknown) => v)
  .handler(({ data }) => certificateResult(() => revokeCertificate(client(), data)));
export const getCertificateDocument = createServerFn({ method: "GET" })
  .validator((v: unknown) => v)
  .handler(({ data }) => certificateResult(() => certificateDocument(client(), data)));
export const getCertificateVerification = createServerFn({ method: "GET" })
  .validator((v: unknown) => v)
  .handler(({ data }) => certificateResult(() => verifyCertificate(client(), data)));
export const getCertificateTemplate = createServerFn({ method: "GET" }).handler(() =>
  certificateResult(() => certificateTemplate(client())),
);
export const updateCertificateTemplate = createServerFn({ method: "POST" })
  .validator((v: unknown) => v)
  .handler(({ data }) => certificateResult(() => saveCertificateTemplate(client(), data)));
export const getContentReport = createServerFn({ method: "GET" })
  .validator((v: unknown) => v)
  .handler(({ data }) => certificateResult(() => contentReport(client(), data)));
export const exportContentReport = createServerFn({ method: "GET" })
  .validator((v: unknown) => v)
  .handler(({ data }) => certificateResult(() => contentReport(client(), data, true)));
