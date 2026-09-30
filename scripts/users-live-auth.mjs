import { readFile } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const envText = await readFile(new URL("../.env.local", import.meta.url), "utf8");
const env = Object.fromEntries(envText.split(/\r?\n/).filter((line) => line.includes("="))
  .map((line) => { const i = line.indexOf("="); return [line.slice(0, i), line.slice(i + 1)]; }));
const service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } });
const learner = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } });
const email = `ncap-users-live-${randomUUID()}@example.invalid`;
const password = `${randomBytes(32).toString("base64url")}aA1!`;
const ref = new URL(env.SUPABASE_URL).hostname.split(".")[0];
let id;
try {
  const { data: created, error: createError } = await service.auth.admin.createUser({ email,
    password, email_confirm: true, user_metadata: { display_name: "Users Live Check" } });
  if (createError || !created.user) throw new Error("Disposable user creation failed.");
  id = created.user.id;
  const { data: signedIn, error: signInError } = await learner.auth.signInWithPassword({ email, password });
  if (signInError || !signedIn.session) throw new Error("Disposable learner sign-in failed.");
  const headers = { apikey: env.SUPABASE_PUBLISHABLE_KEY,
    authorization: `Bearer ${signedIn.session.access_token}`, "content-type": "application/json" };
  const profileUrl = `${env.SUPABASE_URL}/rest/v1/profiles?select=id&id=eq.${id}`;
  const own = await fetch(profileUrl, { headers });
  if (!own.ok) throw new Error("Active learner profile read failed.");
  const adminList = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/admin_users_list`,
    { method: "POST", headers, body: "{}" });
  if (adminList.ok) throw new Error("Learner unexpectedly accessed admin listing.");
  const update = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST", headers: { authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
      "content-type": "application/json" },
    body: JSON.stringify({ query: `update public.profiles set status='suspended' where id='${id}'`, read_only: false }),
  });
  if (!update.ok) throw new Error("Disposable account suspension failed.");
  const blocked = await fetch(profileUrl, { headers });
  if (blocked.ok) throw new Error("Existing suspended token unexpectedly accessed the Data API.");
  console.log(`Live learner denial and existing-token suspension guard passed (${adminList.status}, ${blocked.status}).`);
} finally {
  if (id) {
    const { error } = await service.auth.admin.deleteUser(id);
    if (error) throw new Error("Disposable user cleanup failed; inspect Auth users with the ncap-users-live prefix.");
    console.log("Disposable Auth user and profile removed.");
  }
}
