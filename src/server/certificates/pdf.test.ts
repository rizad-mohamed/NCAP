// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderCertificatePdf } from "./pdf";
import type { Certificate } from "@/domain/certificates";

const certificate: Certificate = {
  id: "00000000-0000-4000-8000-000000000010",
  reference: "00000000-0000-4000-8000-000000000011",
  user_id: "00000000-0000-4000-8000-000000000012",
  module_id: "m-safe",
  attempt_id: "00000000-0000-4000-8000-000000000013",
  issued_at: "2026-10-03T06:30:00.000Z",
  status: "Issued",
  revoked_at: null,
  revocation_reason: null,
  logo_id: null,
  evidence: {
    eligible: true,
    completionPercent: 100,
    bestScore: 90,
    threshold: 80,
    learnerName: "Alice Learner",
    moduleTitle: "Safe accounts",
    lessons: [],
  },
  template: {
    title: "Certificate of Completion",
    subtitle: "National Cybersecurity Awareness Platform",
    issuer: "NCAP Sri Lanka",
    body: "This recognises successful completion.",
    signatoryName: "Programme Director",
    signatoryTitle: "NCAP",
    theme: "navy",
    version: 1,
  },
};
describe("certificate PDF", () => {
  it("renders the immutable certificate facts as a PDF", async () => {
    const bytes = await renderCertificatePdf(certificate);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.byteLength).toBeGreaterThan(2000);
  });
  it.each(["පරිශීලක", "தமிழ் கற்றவர்", "Alice පරිශීලක தமிழ்"])(
    "renders Sinhala/Tamil and mixed learner names: %s",
    async (learnerName) => {
      const bytes = await renderCertificatePdf({
        ...certificate,
        evidence: { ...certificate.evidence, learnerName },
      });
      expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
      expect(bytes.byteLength).toBeGreaterThan(2000);
    },
  );
  it("rejects unsupported template characters instead of corrupting names", async () => {
    await expect(
      renderCertificatePdf({
        ...certificate,
        evidence: { ...certificate.evidence, learnerName: "漢字" },
      }),
    ).rejects.toMatchObject({ code: "validation" });
  });
});
