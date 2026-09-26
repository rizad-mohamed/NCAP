import { z } from "zod";
import { RepositoryError, type RepositoryErrorCode } from "@/services";
export type LearningResult<T> =
  { ok: true; data: T } | { ok: false; code: RepositoryErrorCode; message: string };
export function learningDatabaseError(error: { code?: string } | null) {
  if (!error) return;
  if (["PT409", "40001", "23505"].includes(error.code ?? ""))
    throw new RepositoryError(
      "conflict",
      "This record changed or its name/order is already used. Reload and try again.",
    );
  if (error.code === "42501")
    throw new RepositoryError("forbidden", "You do not have permission for this Learning action.");
  if (error.code === "P0002")
    throw new RepositoryError("not-found", "This learning content is no longer available.");
  if (["23001", "23503", "23514", "22023", "22P02"].includes(error.code ?? ""))
    throw new RepositoryError(
      "validation",
      "Check the content and its relationships. Remove linked lessons before deleting a module; deactivate topics that are in use.",
    );
  throw new RepositoryError("server", "Learning is temporarily unavailable. Please try again.");
}
export async function learningResult<T>(action: () => Promise<T>): Promise<LearningResult<T>> {
  try {
    return { ok: true, data: await action() };
  } catch (error) {
    if (error instanceof z.ZodError)
      return {
        ok: false,
        code: "validation",
        message: error.issues[0]?.message ?? "Check the learning content.",
      };
    if (error instanceof RepositoryError)
      return { ok: false, code: error.code, message: error.message };
    return {
      ok: false,
      code: "server",
      message: "Learning is temporarily unavailable. Please try again.",
    };
  }
}
