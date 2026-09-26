import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { RepositoryError } from "@/services";
export type AwarenessClient = SupabaseClient<Database>;
export async function requireAwarenessAdmin(client: AwarenessClient) {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) throw new RepositoryError("unauthenticated", "Sign in to manage Awareness.");
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profileError || profile?.role !== "super_admin")
    throw new RepositoryError("forbidden", "Super Admin access is required.");
  return user.id;
}
