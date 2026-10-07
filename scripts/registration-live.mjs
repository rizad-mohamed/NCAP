import { loadEnv } from "vite";
import { createClient } from "@supabase/supabase-js";
import { randomUUID, randomBytes, createHmac } from "node:crypto";
import { spawn } from "node:child_process";

if (!process.argv.includes("--staging-project=zsaefnfgauqvstptetdw"))
  throw new Error("Explicit confirmed staging opt-in required.");
const env = loadEnv("development", process.cwd(), "");
const ref = new URL(env.SUPABASE_URL).hostname.split(".")[0];
if (ref !== "zsaefnfgauqvstptetdw") throw new Error("Staging project mismatch.");
const headers = {
  authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
  "content-type": "application/json",
};
const configUrl = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
const response = await fetch(configUrl, { headers });
if (!response.ok) throw new Error("Auth configuration read failed.");
const original = await response.json();
if (original.smtp_host || original.rate_limit_email_sent !== 2)
  throw new Error("Built-in two-email staging test preconditions changed; review before testing.");
async function confirmation(autoconfirm) {
  const r = await fetch(configUrl, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ mailer_autoconfirm: autoconfirm }),
  });
  if (!r.ok) throw new Error("Staging confirmation update failed.");
  for (let i = 0; i < 60; i++) {
    const settings = await fetch(`${env.SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY },
    });
    if (settings.ok && (await settings.json()).mailer_autoconfirm === autoconfirm) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Auth runtime settings did not converge.");
}
async function sql(query, readOnly = true) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, read_only: readOnly }),
  });
  if (!r.ok) throw new Error(`Staging database verification failed (${r.status}).`);
  return r.json();
}
const service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const emails = Array.from({ length: 3 }, () => `ncap-registration-${randomUUID()}@example.invalid`);
const bucket = createHmac("sha256", env.SUPABASE_SERVICE_ROLE_KEY)
  .update(`registration-probe:${randomUUID()}`)
  .digest("hex");
const password = `${randomBytes(24).toString("base64url")}aA1!`;
const check = (value, message) => {
  if (!value) throw new Error(message);
};
try {
  await confirmation(false);
  console.log(
    "Email confirmation verified enabled in the staging Auth runtime; built-in email quota is 2/hour.",
  );
  const outcomes = [];
  for (const email of emails) {
    const client = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error, data } = await client.auth.signUp({
      email,
      password,
      options: { data: { display_name: "Disposable registration", language: "en" } },
    });
    outcomes.push({
      status: error?.status ?? 200,
      code: error?.code ?? null,
      requiresVerification: !error && !data.session,
    });
  }
  check(
    outcomes.some((x) => x.code === "over_email_send_rate_limit"),
    "Email quota was not reproduced; do not infer the blocking layer.",
  );
  console.log(JSON.stringify({ upstreamSignupOutcomes: outcomes }));
  for (const expected of [true, true, true, true, true, false]) {
    const { data, error } = await service.rpc("auth_consume_attempt", {
      bucket_key: bucket,
      max_attempts: 5,
      window_seconds: 300,
    });
    check(!error && data === expected, "Live 5/300 counter threshold failed.");
  }
  check(
    (await sql(`select attempts from private.auth_attempt_limits where bucket='${bucket}'`))[0]
      ?.attempts === 6,
    "Live counter duplicated an increment.",
  );
  await sql(
    `update private.auth_attempt_limits set started_at=clock_timestamp()-interval '301 seconds' where bucket='${bucket}'`,
    false,
  );
  const results = await Promise.all(
    Array.from({ length: 12 }, () =>
      service.rpc("auth_consume_attempt", {
        bucket_key: bucket,
        max_attempts: 5,
        window_seconds: 300,
      }),
    ),
  );
  check(
    results.every((r) => !r.error) && results.filter((r) => r.data).length === 5,
    "Live expiry/concurrency bounds failed.",
  );
  check(
    (await sql(`select attempts from private.auth_attempt_limits where bucket='${bucket}'`))[0]
      ?.attempts === 12,
    "Concurrent requests duplicated an increment.",
  );
  const anonymous = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  check(
    (
      await anonymous.rpc("auth_consume_attempt", {
        bucket_key: bucket,
        max_attempts: 5,
        window_seconds: 300,
      })
    ).error,
    "Anonymous throttle execution was allowed.",
  );
  console.log(
    "Live database checks passed: five allowed/sixth denied, exact increments, expiry, twelve concurrent calls allow exactly five, anonymous denied.",
  );
  const selected = process.argv.find((x) => x.startsWith("--project="));
  const args = [
    "node_modules/@playwright/test/cli.js",
    "test",
    "e2e/registration-limits.spec.ts",
    "--workers=1",
    ...(selected ? [selected] : []),
  ];
  const child = spawn(process.execPath, args, {
    env: {
      ...process.env,
      REGISTRATION_STAGING_TESTS: "1",
      NODE_OPTIONS: "--dns-result-order=ipv4first",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const redact = (chunk) =>
    process.stdout.write(
      chunk
        .toString()
        .replaceAll(env.SUPABASE_SERVICE_ROLE_KEY, "[redacted]")
        .replaceAll(env.SUPABASE_ACCESS_TOKEN, "[redacted]"),
    );
  child.stdout.on("data", redact);
  child.stderr.on("data", redact);
  check(
    (await new Promise((resolve) => child.on("exit", resolve))) === 0,
    "Registration browser regression failed.",
  );
} finally {
  await confirmation(original.mailer_autoconfirm);
  for (const { id } of await sql(
    `select id from auth.users where email in (${emails.map((e) => `'${e}'`).join(",")})`,
  )) {
    const { error } = await service.auth.admin.deleteUser(id);
    check(!error, "Disposable signup cleanup failed.");
  }
  await sql(`delete from private.auth_attempt_limits where bucket='${bucket}'`, false);
  console.log(
    "Original staging confirmation configuration restored; owned disposable accounts/counters removed. Shared source counters retained.",
  );
}
