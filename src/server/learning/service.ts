import { z } from "zod";
import {
  learningId,
  learningKinds,
  learningListSchema,
  learningSchemas,
  learnerMutationSchema,
  type LearningRecord,
  type LearningState,
} from "@/domain/learning";
import { RepositoryError } from "@/services";
import type { Json } from "@/types/database";
import { requireLearner, requireLearningAdmin, type LearningClient } from "./authorization";
import { learningDatabaseError } from "./errors";

export async function listLearningRecords(client: LearningClient, input: unknown) {
  const filters = learningListSchema.parse(input);
  if (filters.admin) await requireLearningAdmin(client);
  const { data, error } = await client.rpc("learning_list", { filters });
  learningDatabaseError(error);
  return data as unknown as { items: LearningRecord[]; total: number };
}
export async function saveLearningRecord(client: LearningClient, input: unknown) {
  await requireLearningAdmin(client);
  const { kind, record } = z
    .object({ kind: z.enum(learningKinds), record: z.unknown() })
    .parse(input);
  const payload = learningSchemas[kind].parse(record);
  if ("quizId" in payload && payload.quizId) {
    const { data: quiz, error } = await client
      .from("quiz_definitions")
      .select("id")
      .eq("id", payload.quizId)
      .eq("module_id", payload.id)
      .maybeSingle();
    learningDatabaseError(error);
    if (!quiz)
      throw new RepositoryError("validation", "Choose an assessment belonging to this module.");
  }
  const { data, error } = await client.rpc("save_learning_record", {
    kind,
    payload: payload as Json,
  });
  learningDatabaseError(error);
  return data as unknown as LearningRecord;
}
export async function deleteLearningRecord(client: LearningClient, input: unknown) {
  await requireLearningAdmin(client);
  const args = z
    .object({
      kind: z.enum(learningKinds),
      target: learningId,
      expected_version: z.number().int().positive(),
    })
    .parse(input);
  // The database's quiz foreign key protects linked modules, including dynamically authored quizzes.
  const { error } = await client.rpc("delete_learning_record", args);
  learningDatabaseError(error);
}
export async function reorderLearningRecords(client: LearningClient, input: unknown) {
  await requireLearningAdmin(client);
  const args = z
    .object({
      kind: z.enum(["modules", "lessons"]),
      records: z
        .array(
          z.object({
            id: learningId,
            version: z.number().int().positive(),
            order: z.number().int().min(1).max(9999),
          }),
        )
        .min(1)
        .max(1000),
    })
    .parse(input);
  const { error } = await client.rpc("reorder_learning_records", args);
  learningDatabaseError(error);
}
export async function readLearningState(client: LearningClient): Promise<LearningState> {
  await requireLearner(client);
  const { data, error } = await client.rpc("learning_state");
  learningDatabaseError(error);
  return data as unknown as LearningState;
}
export async function updateLearningState(
  client: LearningClient,
  input: unknown,
): Promise<LearningState> {
  const userId = await requireLearner(client);
  const { expectedUserId, ...payload } = learnerMutationSchema.parse(input);
  if (expectedUserId && expectedUserId !== userId)
    throw new RepositoryError(
      "conflict",
      "Your signed-in account changed. Reload before saving learning progress.",
    );
  const { data, error } = await client.rpc("mutate_learning_state", { payload });
  learningDatabaseError(error);
  return data as unknown as LearningState;
}
