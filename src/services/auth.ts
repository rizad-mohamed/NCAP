import { delay } from "@/services";

export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403 | 404 | 409 | 422 | 429 | 500,
  ) {
    super(message);
  }
}

/** API-ready demo adapter. Password values are validated in memory and never persisted or logged. */
export const DemoAuthService = {
  async requestPasswordReset(email: string) {
    await delay(undefined);
    return { accepted: Boolean(email) };
  },
  async resetPassword(_token: string, password: string) {
    await delay(undefined);
    return { changed: password.length >= 8 };
  },
  async changePassword(currentPassword: string, newPassword: string) {
    await delay(undefined);
    if (!currentPassword) throw new ServiceError("Enter your current password.", 422);
    return { changed: newPassword.length >= 8 };
  },
};
