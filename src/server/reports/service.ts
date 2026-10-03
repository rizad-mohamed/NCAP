import { z } from "zod";
import { requireLearningAdmin, type LearningClient } from "@/server/learning/authorization";
import { certificateError } from "@/server/certificates/service";

export const reportFiltersSchema = z.object({
  days: z.number().int().min(1).max(3660),
  moduleId: z.string().max(100).nullable(),
  quizId: z.string().max(100).nullable(),
  offset: z.number().int().min(0).max(100000).default(0),
});
export async function contentReport(client: LearningClient, input: unknown, exporting = false) {
  await requireLearningAdmin(client);
  const filters = reportFiltersSchema.parse(input);
  const args = { days: filters.days, module_filter: filters.moduleId, quiz_filter: filters.quizId };
  const { data, error } = exporting
    ? await client.rpc("admin_content_report_export", args)
    : await client.rpc("admin_content_report", { ...args, page_offset: filters.offset });
  certificateError(error);
  return data;
}
