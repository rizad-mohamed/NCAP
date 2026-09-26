import { z } from "zod";
import { RepositoryError, type RepositoryErrorCode } from "@/services";
export type AwarenessResult<T> =
  { ok: true; data: T } | { ok: false; code: RepositoryErrorCode; message: string };
export function databaseError(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === "40001" || error.code === "23505")
    throw new RepositoryError(
      "conflict",
      "This record changed or its slug is already used. Reload and try again.",
    );
  if (error.code === "42501")
    throw new RepositoryError("forbidden", "Super Admin access is required.");
  if (error.code === "P0002")
    throw new RepositoryError("not-found", "This resource is no longer available.");
  if (error.code === "23514" || error.code === "23503")
    throw new RepositoryError("validation", "Check the content and media before saving.");
  throw new RepositoryError("server", "Awareness is temporarily unavailable. Please try again.");
}
export async function awarenessResult<T>(action: () => Promise<T>): Promise<AwarenessResult<T>> {
  try {
    return { ok: true, data: await action() };
  } catch (error) {
    if (error instanceof z.ZodError)
      return {
        ok: false,
        code: "validation",
        message: error.issues[0]?.message ?? "Check the resource details.",
      };
    if (error instanceof RepositoryError)
      return { ok: false, code: error.code, message: error.message };
    return {
      ok: false,
      code: "server",
      message: "Awareness is temporarily unavailable. Please try again.",
    };
  }
}
