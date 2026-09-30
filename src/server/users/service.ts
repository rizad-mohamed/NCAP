import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { RepositoryError } from "@/services";

type Client = SupabaseClient<Database>;
const uuid = z.string().uuid();
const listSchema = z.object({
  offset: z.number().int().min(0).max(1_000_000),
  limit: z.number().int().min(1).max(100),
  search: z.string().trim().max(100),
  role: z.enum(["", "learner", "super_admin"]),
  status: z.enum(["", "active", "suspended", "disabled"]),
  sort: z.enum(["created", "name", "email"]),
  direction: z.enum(["asc", "desc"]),
});
const changeSchema = z.object({
  target: uuid,
  role: z.enum(["learner", "super_admin"]).optional(),
  status: z.enum(["active", "suspended", "disabled"]).optional(),
  reason: z.string().trim().max(500).default(""),
}).refine((value) => Boolean(value.role) !== Boolean(value.status), "Choose one account change.")
  .refine((value) => !value.status || value.status === "active" || value.reason.length >= 3,
    "Provide a reason for restricting an account.");

async function requireAdmin(client: Client) {
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new RepositoryError("unauthenticated", "Sign in again.");
  const { data: profile, error: profileError } = await client.from("profiles")
    .select("role,status").eq("id", user.id).single();
  if (profileError || profile?.role !== "super_admin" || profile.status !== "active")
    throw new RepositoryError("forbidden", "Super Admin access is required.");
  return user.id;
}
function check(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === "42501") throw new RepositoryError("forbidden", "Super Admin access is required.");
  if (error.code === "P0002") throw new RepositoryError("not-found", "User unavailable.");
  if (["22023", "23514"].includes(error.code ?? ""))
    throw new RepositoryError("validation", "This account change is not allowed.");
  throw new RepositoryError("server", "User management is temporarily unavailable.");
}
export async function result<T>(operation: () => Promise<T>) {
  try { return { ok: true as const, data: await operation() }; }
  catch (error) {
    if (error instanceof z.ZodError) return { ok: false as const, code: "validation", message: error.issues[0]?.message ?? "Invalid request." };
    if (error instanceof RepositoryError) return { ok: false as const, code: error.code, message: error.message };
    return { ok: false as const, code: "server", message: "User management is temporarily unavailable." };
  }
}
export async function listUsers(client: Client, input: unknown) {
  await requireAdmin(client);
  const v = listSchema.parse(input);
  const { data, error } = await client.rpc("admin_users_list", {
    page_offset: v.offset, page_limit: v.limit, search_text: v.search,
    role_filter: v.role, status_filter: v.status, sort_field: v.sort, sort_direction: v.direction,
  });
  check(error);
  return data;
}
export async function userDetails(client: Client, input: unknown) {
  await requireAdmin(client);
  const { data, error } = await client.rpc("admin_user_details", { target: uuid.parse(input) });
  check(error);
  return data;
}
export async function changeUser(client: Client, input: unknown) {
  const actor = await requireAdmin(client);
  const v = changeSchema.parse(input);
  if (v.target === actor) throw new RepositoryError("validation", "You cannot change your own access.");
  const { error } = await client.rpc("admin_user_change", {
    target: v.target, new_role: v.role ?? null, new_status: v.status ?? null, reason: v.reason,
  });
  check(error);
}
