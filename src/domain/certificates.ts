import { z } from "zod";
import type { CertificateTemplate } from "@/data/types";
import type { Json } from "@/types/database";

export const certificateListSchema = z.object({
  offset: z.number().int().min(0).max(100000).default(0),
  limit: z.number().int().min(1).max(100).default(20),
  moduleId: z.string().max(100).nullable().default(null),
  search: z.string().trim().max(100).default(""),
});
export const certificateIssueSchema = z
  .object({ userId: z.string().uuid(), moduleId: z.string().min(1).max(100) })
  .strict();
export const certificateRevokeSchema = z
  .object({ id: z.string().uuid(), reason: z.string().trim().min(1).max(1000) })
  .strict();
export const certificateTemplateSchema = z.object({
  title: z.string().trim().min(1).max(100),
  subtitle: z.string().max(160),
  issuer: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(320),
  signatoryName: z.string().max(160),
  signatoryTitle: z.string().max(160),
  theme: z.enum(["navy", "blue", "teal"]),
  version: z.number().int().positive(),
  logo: z.object({ id: z.string().uuid() }).passthrough().optional(),
});
export type StoredCertificateTemplate = CertificateTemplate & { version: number };
export interface CertificateEvidence {
  eligible: boolean;
  completionPercent: number;
  bestScore: number;
  threshold: number;
  learnerName: string;
  moduleTitle: string;
  lessons: { id: string; version: number; completedAt: string }[];
}
export interface Certificate {
  id: string;
  reference: string;
  user_id: string;
  module_id: string;
  attempt_id: string;
  issued_at: string;
  status: "Issued" | "Revoked";
  revoked_at: string | null;
  revocation_reason: string | null;
  logo_id: string | null;
  evidence: CertificateEvidence;
  template: StoredCertificateTemplate;
  audit?: { action: string; at: string; details: Json }[];
}
export interface CertificateRow {
  userId: string;
  learnerName: string;
  moduleId: string;
  moduleTitle: string;
  eligibility: CertificateEvidence;
  record: Certificate | null;
}
export interface CertificateRegistry {
  total: number;
  issuedCount: number;
  items: CertificateRow[];
}
export interface CertificateVerification {
  valid: boolean;
  status: "Issued" | "Revoked" | "Unverified";
  reference?: string;
  moduleTitle?: string;
  issuer?: string;
  issuedAt?: string;
}
