export type AppRole = "learner" | "super_admin";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: AppRole;
  emailVerified: boolean;
  language: "en" | "si" | "ta";
  phone: string;
  notifications: boolean;
  interests?: string[];
  avatar?: import("zod").infer<typeof import("@/domain/auth-profile").avatarSchema> | undefined;
  createdAt: string;
}

export interface AuthState {
  user: AuthUser | null;
}

export type AuthActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; message: string };
