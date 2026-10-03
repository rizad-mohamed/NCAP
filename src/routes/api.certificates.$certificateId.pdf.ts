import { createFileRoute } from "@tanstack/react-router";
import { createSupabaseServerClient } from "@/server/auth/supabase";
import { certificateDocument, certificateResult } from "@/server/certificates/service";
import { renderCertificatePdf } from "@/server/certificates/pdf";
import { RepositoryError } from "@/services";

export const Route = createFileRoute("/api/certificates/$certificateId/pdf")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const headers = new Headers({
          "cache-control": "private, no-store",
          vary: "Cookie, Authorization",
          "x-content-type-options": "nosniff",
        });
        const result = await certificateResult(async () => {
          const client = createSupabaseServerClient();
          const record = await certificateDocument(client, params.certificateId);
          let logo: Uint8Array | undefined;
          if (record.logo_id) {
            const path = record.template.logo?.storageKey?.replace(/^learning-media\//, "");
            if (!path) throw new RepositoryError("server", "Certificate logo unavailable.");
            const { data, error } = await client.storage.from("learning-media").download(path);
            if (error || !data)
              throw new RepositoryError(
                "server",
                "Certificate logo unavailable. Please try again.",
              );
            logo = new Uint8Array(await data.arrayBuffer());
          }
          return { record, pdf: await renderCertificatePdf(record, logo) };
        });
        if (!result.ok)
          return Response.json(
            { message: result.message },
            {
              status:
                result.code === "unauthenticated"
                  ? 401
                  : result.code === "forbidden"
                    ? 403
                    : result.code === "not-found"
                      ? 404
                      : result.code === "validation"
                        ? 400
                        : 503,
              headers,
            },
          );
        headers.set("content-type", "application/pdf");
        headers.set(
          "content-disposition",
          `inline; filename="NCAP-${result.data.record.reference}.pdf"`,
        );
        return new Response(new Uint8Array(result.data.pdf), { headers });
      },
    },
  },
});
