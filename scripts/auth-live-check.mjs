import { readFileSync } from "node:fs";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

if (process.env.AUTH_STAGING_TESTS !== "1")
  throw new Error("Explicit confirmed-staging opt-in is required.");
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => {
      const i = line.indexOf("=");
      return [
        line.slice(0, i),
        line
          .slice(i + 1)
          .trim()
          .replace(/^(["'])(.*)\1$/, "$2"),
      ];
    }),
);
if (new URL(env.SUPABASE_URL).hostname !== "zsaefnfgauqvstptetdw.supabase.co")
  throw new Error(
    "Disposable Auth tests are restricted to the confirmed NCAP_V1.0 staging project.",
  );
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options);
const client = () => createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, options);
const ids = [];
const check = (value, message) => {
  if (!value) throw new Error(message);
};
const password = `${randomBytes(24).toString("base64url")}aA1!`;
async function create(name) {
  const email = `ncap-auth-live-${randomUUID()}@example.invalid`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: name, role: "super_admin" },
  });
  check(!error && data.user, "Disposable fixture creation failed.");
  ids.push(data.user.id);
  const session = client();
  const login = await session.auth.signInWithPassword({ email, password });
  check(!login.error, "Disposable sign-in failed.");
  return { id: data.user.id, email, client: session, token: login.data.session.access_token };
}
try {
  const baseline = await service
    .from("profiles")
    .select("id")
    .eq("role", "super_admin")
    .eq("status", "active");
  check(
    !baseline.error && baseline.data.length > 0,
    "An existing active administrator is required for safe cleanup.",
  );
  const admin = await create("Auth Test Admin");
  const alice = await create("Auth Test Alice");
  const bob = await create("Auth Test Bob");
  const profile = await alice.client.from("profiles").select("role").eq("id", alice.id).single();
  check(profile.data?.role === "learner", "Metadata elevated a learner role.");
  const bootstrap = await service
    .from("profiles")
    .update({ role: "super_admin" })
    .eq("id", admin.id);
  if (bootstrap.error)
    console.log(
      JSON.stringify({
        bootstrapErrorCode: bootstrap.error.code,
        constraintHelperDenied: bootstrap.error.message.includes("valid_profile_interests"),
      }),
    );
  check(!bootstrap.error, "Disposable admin bootstrap failed.");
  check(
    !(
      await alice.client
        .from("profiles")
        .update({ interests: ["Passwords"], language: "ta", phone: "+94123456789" })
        .eq("id", alice.id)
    ).error,
    "Profile persistence failed.",
  );
  const persisted = await alice.client
    .from("profiles")
    .select("interests,language,phone")
    .eq("id", alice.id)
    .single();
  check(
    persisted.data?.interests[0] === "Passwords" && persisted.data?.language === "ta",
    "Persisted fields did not match.",
  );
  check(
    (await alice.client.from("profiles").select("id").eq("id", bob.id)).data?.length === 0,
    "Cross-user profile read succeeded.",
  );
  const cross = await alice.client
    .from("profiles")
    .update({ display_name: "Intruder" })
    .eq("id", bob.id)
    .select("id");
  check(cross.data?.length === 0, "Cross-user profile update succeeded.");
  for (const mutation of [{ role: "super_admin" }, { status: "active" }])
    check(
      (await alice.client.from("profiles").update(mutation).eq("id", alice.id)).error,
      "Learner privileged field update succeeded.",
    );
  check(
    (await alice.client.rpc("admin_user_change", { target: bob.id, new_role: "super_admin" }))
      .error,
    "Learner privileged RPC succeeded.",
  );
  for (const change of [
    { new_role: "super_admin" },
    { new_role: "learner" },
    { new_status: "suspended", reason: "disposable security check" },
  ])
    check(
      !(await admin.client.rpc("admin_user_change", { target: alice.id, ...change })).error,
      "Administrator account mutation failed.",
    );
  check(
    (await alice.client.from("profiles").select("id")).error,
    "Suspended existing token accessed profiles.",
  );
  check(
    (await client().auth.signInWithPassword({ email: alice.email, password })).error,
    "Suspended account signed in.",
  );
  check(
    !(
      await admin.client.rpc("admin_user_change", {
        target: alice.id,
        new_status: "active",
        reason: "disposable restoration",
      })
    ).error,
    "Restoration failed.",
  );
  check(
    !(await client().auth.signInWithPassword({ email: alice.email, password })).error,
    "Restored account could not sign in.",
  );
  const oldSession = client();
  check(
    !(await oldSession.auth.signInWithPassword({ email: alice.email, password })).error,
    "Second-session login failed.",
  );
  check(
    (
      await alice.client.auth.updateUser({
        password: `${password}changed`,
        current_password: "WrongPassword123",
      })
    ).error,
    "Wrong current password was accepted.",
  );
  check(
    !(
      await alice.client.auth.updateUser({
        password: `${password}changed`,
        current_password: password,
      })
    ).error,
    "Verified password change failed.",
  );
  await alice.client.auth.signOut({ scope: "others" });
  check(
    (await oldSession.auth.refreshSession()).error,
    "Other refresh session survived password change.",
  );
  const audit = await admin.client
    .from("admin_user_audit")
    .select("actor_identity,target_identity,action")
    .eq("target_id", alice.id);
  check(
    !audit.error &&
      audit.data.length === 4 &&
      audit.data.every(
        (row) => row.actor_identity === admin.id && row.target_identity === alice.id,
      ),
    "Durable account audit failed.",
  );
  const throttle = client();
  check(
    (
      await throttle.rpc("auth_consume_attempt", {
        bucket_key: "a".repeat(64),
        max_attempts: 2,
        window_seconds: 60,
      })
    ).error,
    "Anonymous throttle execution succeeded.",
  );
  const bucket = createHash("sha256").update(randomUUID()).digest("hex");
  const attempts = await Promise.all(
    Array.from({ length: 12 }, () =>
      service.rpc("auth_consume_attempt", {
        bucket_key: bucket,
        max_attempts: 5,
        window_seconds: 60,
      }),
    ),
  );
  check(
    attempts.every((result) => !result.error) &&
      attempts.filter((result) => result.data === true).length === 5,
    "Concurrent shared throttle requests exceeded the limit.",
  );
  console.log(
    "PASS: metadata role isolation; profile persistence; cross-user read/write denial; privileged field/RPC denial; role assignment/removal; suspension, stale-token denial, restoration; durable audit; anonymous throttle denial; concurrent shared-counter bounds.",
  );
} finally {
  for (const id of ids.reverse()) {
    const { error } = await service.auth.admin.deleteUser(id);
    if (error) throw new Error("Disposable cleanup failed; inspect ncap-auth-live fixtures.");
  }
  console.log("Disposable authentication fixtures removed; durable audit records retained.");
}
