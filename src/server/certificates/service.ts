import { z } from "zod";
import {
  certificateListSchema,
  certificateIssueSchema,
  certificateRevokeSchema,
  certificateTemplateSchema,
  type Certificate,
} from "@/domain/certificates";
import {
  requireLearner,
  requireLearningAdmin,
  type LearningClient,
} from "@/server/learning/authorization";
import { RepositoryError } from "@/services";
import type { Json } from "@/types/database";

export function certificateError(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === "42501")
    throw new RepositoryError("forbidden", "You cannot perform this operation.");
  if (error.code === "PT409" || error.code === "23505")
    throw new RepositoryError("conflict", "This record changed. Refresh before saving.");
  if (error.code === "P0002") throw new RepositoryError("not-found", "Certificate unavailable.");
  if (error.code === "54000")
    throw new RepositoryError(
      "validation",
      "Select a smaller date range or a module. Exports are limited to 10,000 attempts.",
    );
  if (["22023", "22P02", "23503", "23514"].includes(error.code ?? ""))
    throw new RepositoryError(
      "validation",
      "Check the details and eligibility. Certificate logos must be PNG or JPEG.",
    );
  throw new RepositoryError("server", "The operation could not be completed. Please try again.");
}
export async function certificateResult<T>(operation: () => Promise<T>) {
  try {
    return { ok: true as const, data: await operation() };
  } catch (error) {
    if (error instanceof z.ZodError)
      return {
        ok: false as const,
        code: "validation",
        message: error.issues[0]?.message ?? "Check the details.",
      };
    if (error instanceof RepositoryError)
      return { ok: false as const, code: error.code, message: error.message };
    return {
      ok: false as const,
      code: "server",
      message: "The operation could not be completed. Please try again.",
    };
  }
}
export async function certificateRegistry(client: LearningClient, input: unknown) {
  await requireLearner(client);
  const filters = certificateListSchema.parse(input);
  const { data, error } = await client.rpc("certificate_registry", {
    page_offset: filters.offset,
    page_limit: filters.limit,
    module_filter: filters.moduleId,
    search_text: filters.search,
  });
  certificateError(error);
  return data;
}
export async function issueCertificate(client: LearningClient, input: unknown) {
  await requireLearningAdmin(client);
  const target = certificateIssueSchema.parse(input);
  const { data, error } = await client.rpc("certificate_issue", {
    learner: target.userId,
    module_target: target.moduleId,
  });
  certificateError(error);
  return data;
}
export async function revokeCertificate(client: LearningClient, input: unknown) {
  await requireLearningAdmin(client);
  const target = certificateRevokeSchema.parse(input);
  const { data, error } = await client.rpc("certificate_revoke", {
    target: target.id,
    reason: target.reason,
  });
  certificateError(error);
  return data;
}
export async function certificateDocument(
  client: LearningClient,
  input: unknown,
): Promise<Certificate> {
  await requireLearner(client);
  const target = z.string().uuid().parse(input);
  const { data, error } = await client.rpc("certificate_document", { target });
  certificateError(error);
  return data as unknown as Certificate;
}
export async function verifyCertificate(client: LearningClient, input: unknown) {
  const parsed = z.string().uuid().safeParse(input);
  if (!parsed.success) return { valid: false, status: "Unverified" };
  const { data, error } = await client.rpc("certificate_verify", {
    certificate_reference: parsed.data,
  });
  certificateError(error);
  return data;
}
export async function certificateTemplate(client: LearningClient) {
  await requireLearningAdmin(client);
  const { data, error } = await client.rpc("certificate_template_get");
  certificateError(error);
  return data;
}
export async function saveCertificateTemplate(client: LearningClient, input: unknown) {
  await requireLearningAdmin(client);
  const { version, ...payload } = certificateTemplateSchema.parse(input);
  const { data, error } = await client.rpc("certificate_template_save", {
    payload: payload as Json,
    expected_version: version,
  });
  certificateError(error);
  return data;
}
