import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { RepositoryError } from "@/services";
export type LearningClient = SupabaseClient<Database>;
export async function requireLearner(client: LearningClient) {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user)
    throw new RepositoryError("unauthenticated", "Sign in to save your learning progress.");
  return user.id;
}
export async function requireLearningAdmin(client: LearningClient) {
  const user = await requireLearner(client);
  const { data, error } = await client.from("profiles").select("role").eq("id", user).single();
  if (error || data?.role !== "super_admin")
    throw new RepositoryError("forbidden", "Super Admin access is required.");
  return user;
}
