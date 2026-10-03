import type { AuthActionResult } from "./types";

/** Transport failures must release form loading states without exposing server details. */
export async function authAction<T>(
  operation: () => Promise<AuthActionResult<T>>,
): Promise<AuthActionResult<T>> {
  try {
    return await operation();
  } catch {
    return { ok: false, message: "The request could not be completed. Please try again." };
  }
}
