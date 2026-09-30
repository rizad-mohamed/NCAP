import { z } from "zod";
import {
  requireLearner,
  requireLearningAdmin,
  type LearningClient,
} from "@/server/learning/authorization";
import { RepositoryError } from "@/services";
import type { Json } from "@/types/database";

const announcementSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(160),
    body: z.string().trim().min(1).max(2000),
    audience: z.enum(["All Learners", "New Learners", "Administrators"]),
    active: z.boolean(),
    startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine((value) => value.endsAt >= value.startsAt, "End date must follow start date.");

function databaseError(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === "42501") throw new RepositoryError("forbidden", "Dashboard access denied.");
  if (error.code === "P0002")
    throw new RepositoryError("not-found", "This Dashboard record is unavailable.");
  if (["22023", "22P02", "23514"].includes(error.code ?? ""))
    throw new RepositoryError("validation", "Check the Dashboard details.");
  throw new RepositoryError("server", "Dashboard data is temporarily unavailable.");
}
export async function dashboardResult<T>(operation: () => Promise<T>) {
  try {
    return { ok: true as const, data: await operation() };
  } catch (error) {
    if (error instanceof z.ZodError)
      return {
        ok: false as const,
        code: "validation",
        message: error.issues[0]?.message ?? "Check the Dashboard details.",
      };
    if (error instanceof RepositoryError)
      return { ok: false as const, code: error.code, message: error.message };
    return {
      ok: false as const,
      code: "server",
      message: "Dashboard data is temporarily unavailable.",
    };
  }
}
export async function learnerDashboard(client: LearningClient, input: unknown) {
  await requireLearner(client);
  const activity_offset = z.number().int().min(0).max(100000).parse(input);
  const { data, error } = await client.rpc("dashboard_learner", { activity_offset });
  databaseError(error);
  return data;
}
export async function adminDashboard(client: LearningClient) {
  await requireLearningAdmin(client);
  const { data, error } = await client.rpc("dashboard_admin");
  databaseError(error);
  return data;
}
export async function adminReport(client: LearningClient, input: unknown) {
  await requireLearningAdmin(client);
  const filters = z
    .object({
      days: z.number().int().min(1).max(3660),
      moduleId: z.string().max(100).nullable(),
      quizId: z.string().max(100).nullable(),
      offset: z.number().int().min(0).max(100000),
    })
    .parse(input);
  const { data, error } = await client.rpc("dashboard_report", {
    days: filters.days,
    module_filter: filters.moduleId,
    quiz_filter: filters.quizId,
    attempt_offset: filters.offset,
    attempt_limit: 100,
  });
  databaseError(error);
  return data;
}
export async function adminAnnouncements(client: LearningClient) {
  await requireLearningAdmin(client);
  const { data, error } = await client.rpc("dashboard_announcements_admin");
  databaseError(error);
  return data;
}
export async function adminUsers(client: LearningClient, input: unknown) {
  await requireLearningAdmin(client);
  const { offset, limit, search } = z
    .object({
      offset: z.number().int().min(0).max(100000),
      limit: z.number().int().min(1).max(100),
      search: z.string().max(100),
    })
    .parse(input);
  const { data, error } = await client.rpc("dashboard_users", {
    page_offset: offset,
    page_limit: limit,
    search_text: search,
  });
  databaseError(error);
  return data;
}
export async function saveAnnouncement(client: LearningClient, input: unknown) {
  await requireLearningAdmin(client);
  const payload = announcementSchema.parse(input);
  const { error } = await client.rpc("dashboard_save_announcement", { payload: payload as Json });
  databaseError(error);
}
export async function deleteAnnouncement(client: LearningClient, input: unknown) {
  await requireLearningAdmin(client);
  const target = z.string().uuid().parse(input);
  const { error } = await client.rpc("dashboard_delete_announcement", { target });
  databaseError(error);
}
export async function beginLesson(client: LearningClient, input: unknown) {
  await requireLearner(client);
  const target = z.string().min(1).max(100).parse(input);
  const { data, error } = await client.rpc("dashboard_begin_lesson", { target });
  databaseError(error);
  return data;
}
export async function heartbeat(client: LearningClient, input: unknown) {
  await requireLearner(client);
  const target = z.string().uuid().parse(input);
  const { data, error } = await client.rpc("dashboard_heartbeat", { target });
  databaseError(error);
  return data;
}
