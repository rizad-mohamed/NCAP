export type AppRole = "learner" | "super_admin";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: AppRole;
  emailVerified: boolean;
}

export interface AuthState {
  user: AuthUser | null;
}
