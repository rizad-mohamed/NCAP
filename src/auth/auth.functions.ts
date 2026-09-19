import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { AuthActionResult, AuthState, AuthUser } from "@/auth/types";
import { emailSchema, passwordSchema } from "@/domain/validation";
import { createSupabaseServerClient } from "@/server/auth/supabase";
import { getServerAuthEnv } from "@/server/auth/env";
import type { Database } from "@/types/database";

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  password: passwordSchema,
  language: z.enum(["en", "si", "ta"]),
});

const emailInputSchema = z.object({ email: emailSchema });
const passwordInputSchema = z.object({ password: passwordSchema });
const profileInputSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  language: z.enum(["en", "si", "ta"]),
  phone: z
    .string()
    .trim()
    .max(24)
    .refine((value) => !value || /^\+?[0-9 ()-]{7,24}$/.test(value)),
  notifications: z.boolean(),
});
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

function noStore() {
  setResponseHeaders(
    new Headers({
      "cache-control": "private, no-store",
      vary: "Cookie, Authorization",
    }),
  );
}

function authRedirect(path: "/auth/callback" | "/reset-password") {
  return new URL(path, getServerAuthEnv().APP_URL).toString();
}

async function toAuthUser(user: User, supabase: SupabaseClient<Database>): Promise<AuthUser> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id,email,display_name,role,language,phone,notifications,created_at")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    throw new Error("Your account profile is unavailable. Contact an administrator.");
  }

  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    role: profile.role,
    emailVerified: Boolean(user.email_confirmed_at),
    language: profile.language,
    phone: profile.phone,
    notifications: profile.notifications,
    createdAt: profile.created_at,
  };
}

export const getAuthState = createServerFn({ method: "GET" }).handler(
  async (): Promise<AuthState> => {
    noStore();
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { user: null };

    try {
      return { user: await toAuthUser(user, supabase) };
    } catch {
      await supabase.auth.signOut({ scope: "local" });
      return { user: null };
    }
  },
);

export const signIn = createServerFn({ method: "POST" })
  .validator(loginSchema)
  .handler(async ({ data }): Promise<AuthActionResult<AuthUser>> => {
    noStore();
    const supabase = createSupabaseServerClient();
    const { data: authData, error } = await supabase.auth.signInWithPassword(data);

    if (error || !authData.user) {
      const message =
        error?.code === "email_not_confirmed"
          ? "Verify your email address before signing in."
          : "The email address or password is incorrect.";
      return { ok: false, message };
    }

    try {
      return { ok: true, data: await toAuthUser(authData.user, supabase) };
    } catch (error) {
      await supabase.auth.signOut({ scope: "local" });
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Your account profile is unavailable.",
      };
    }
  });

export const register = createServerFn({ method: "POST" })
  .validator(registrationSchema)
  .handler(async ({ data }): Promise<AuthActionResult<{ requiresEmailVerification: boolean }>> => {
    noStore();
    const supabase = createSupabaseServerClient();
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: authRedirect("/auth/callback"),
        data: {
          display_name: data.name,
          language: data.language,
        },
      },
    });

    if (error) {
      return {
        ok: false,
        message:
          error.status === 429
            ? "Too many registration attempts. Please wait and try again."
            : "Unable to create the account. Check the details and try again.",
      };
    }

    return {
      ok: true,
      data: { requiresEmailVerification: !authData.session },
    };
  });

export const resendVerification = createServerFn({ method: "POST" })
  .validator(emailInputSchema)
  .handler(async ({ data }): Promise<AuthActionResult> => {
    noStore();
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: data.email,
      options: { emailRedirectTo: authRedirect("/auth/callback") },
    });

    if (error?.status === 429) {
      return { ok: false, message: "Please wait before requesting another email." };
    }
    return { ok: true, data: undefined };
  });

export const requestPasswordReset = createServerFn({ method: "POST" })
  .validator(emailInputSchema)
  .handler(async ({ data }): Promise<AuthActionResult> => {
    noStore();
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${authRedirect("/auth/callback")}?next=%2Freset-password`,
    });

    if (error?.status === 429) {
      return { ok: false, message: "Please wait before requesting another reset email." };
    }
    return { ok: true, data: undefined };
  });

export const updatePassword = createServerFn({ method: "POST" })
  .validator(passwordInputSchema)
  .handler(async ({ data }): Promise<AuthActionResult> => {
    noStore();
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "This password reset link is no longer valid." };

    const { error } = await supabase.auth.updateUser({ password: data.password });
    if (error) {
      return { ok: false, message: "Unable to update the password. Request a new reset link." };
    }
    return { ok: true, data: undefined };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .validator(profileInputSchema)
  .handler(async ({ data }): Promise<AuthActionResult<AuthUser>> => {
    noStore();
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Sign in again to update your profile." };

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: data.displayName,
        language: data.language,
        phone: data.phone,
        notifications: data.notifications,
      })
      .eq("id", user.id);
    if (error) return { ok: false, message: "Unable to update your profile." };

    return { ok: true, data: await toAuthUser(user, supabase) };
  });

export const changePassword = createServerFn({ method: "POST" })
  .validator(changePasswordSchema)
  .handler(async ({ data }): Promise<AuthActionResult> => {
    noStore();
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Sign in again to change your password." };

    const { error } = await supabase.auth.updateUser({
      password: data.newPassword,
      current_password: data.currentPassword,
    });
    if (error) return { ok: false, message: "The current password is incorrect." };
    return { ok: true, data: undefined };
  });

export const signOut = createServerFn({ method: "POST" }).handler(
  async (): Promise<AuthActionResult> => {
    noStore();
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    return error
      ? { ok: false, message: "Unable to sign out. Please try again." }
      : { ok: true, data: undefined };
  },
);
