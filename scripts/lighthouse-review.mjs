import { chromium } from "@playwright/test";
import { loadEnv } from "vite";
import { execFileSync, spawn } from "node:child_process";
import { realpathSync } from "node:fs";
import { mkdir, readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";

const config = loadEnv("development", process.cwd(), "");
const origin = "http://127.0.0.1:4174";
const summaries = [];
const profile = await mkdtemp(join(tmpdir(), "ncap-lighthouse-"));
const npmCli =
  process.platform === "win32"
    ? join(
        dirname(
          execFileSync("where.exe", ["npm.cmd"], { encoding: "utf8" }).trim().split(/\r?\n/)[0],
        ),
        "node_modules/npm/bin/npm-cli.js",
      )
    : realpathSync(execFileSync("which", ["npm"], { encoding: "utf8" }).trim());
const worker = spawn(
  process.execPath,
  [
    "node_modules/wrangler/bin/wrangler.js",
    "dev",
    "--config",
    ".output/server/wrangler.json",
    "--ip",
    "127.0.0.1",
    "--port",
    "4174",
    "--show-interactive-dev-session",
    "false",
    "--log-level",
    "error",
  ],
  {
    stdio: "ignore",
    env: {
      ...process.env,
      CLOUDFLARE_INCLUDE_PROCESS_ENV: "true",
      SUPABASE_URL: process.env.SUPABASE_URL || config.SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY:
        process.env.SUPABASE_PUBLISHABLE_KEY || config.SUPABASE_PUBLISHABLE_KEY,
      APP_URL: origin,
    },
  },
);
let context;
async function login(role) {
  // Lighthouse instruments the audited browser. Start a fresh Playwright process
  // before using its injected locator scripts for the next account login.
  await context.close();
  context = await chromium.launchPersistentContext(profile, {
    headless: true,
    args: ["--remote-debugging-port=9222"],
  });
  await context.clearCookies();
  const page = await context.newPage();
  try {
    await page.goto(`${origin}/login`, { waitUntil: "networkidle" });
    await page.getByLabel("Email address").fill(process.env[`E2E_${role}_EMAIL`]);
    await page.locator('input[name="password"]').fill(process.env[`E2E_${role}_PASSWORD`]);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.waitForURL(role === "ADMIN" ? /\/admin$/ : /\/dashboard$/);
  } finally {
    await page.close();
  }
}
async function audit(route, name) {
  const output = `test-results/lighthouse-${name}.json`;
  await new Promise((resolveAudit, reject) => {
    // All CLI arguments are internally fixed route/report names, never credential values.
    const child = spawn(
      process.execPath,
      [
        npmCli,
        "exec",
        "--yes",
        "--package=lighthouse@13.5.0",
        "--",
        "lighthouse",
        `${origin}${route}`,
        "--port=9222",
        "--disable-storage-reset",
        "--output=json",
        `--output-path=${output}`,
        "--quiet",
      ],
      { stdio: "ignore" },
    );
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolveAudit() : reject(new Error(`Lighthouse ${name} failed (${code}).`)),
    );
  });
  const result = JSON.parse(await readFile(output, "utf8"));
  const scores = Object.fromEntries(
    Object.entries(result.categories).map(([key, value]) => [key, Math.round(value.score * 100)]),
  );
  const issues = Object.entries(result.audits)
    .filter(
      ([, value]) =>
        value.score !== null &&
        value.score < 1 &&
        value.details &&
        !["manual", "notApplicable", "informative"].includes(value.scoreDisplayMode),
    )
    .map(([id, value]) => ({ id, title: value.title, displayValue: value.displayValue }));
  console.log(
    JSON.stringify({
      route,
      finalUrl: result.finalDisplayedUrl,
      scores,
      lcp: result.audits["largest-contentful-paint"].numericValue,
      cls: result.audits["cumulative-layout-shift"].numericValue,
      issues,
    }),
  );
  summaries.push({
    route,
    scores,
    lcp: result.audits["largest-contentful-paint"].numericValue,
    cls: result.audits["cumulative-layout-shift"].numericValue,
  });
  await writeFile("lighthouse-results.local", JSON.stringify(summaries, null, 2));
  if (result.runtimeError || !result.finalDisplayedUrl.startsWith(`${origin}${route}`))
    throw new Error(`Lighthouse ${name} audited an unexpected route or failed.`);
}
try {
  await mkdir("test-results", { recursive: true });
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      if ((await fetch(origin)).ok) {
        ready = true;
        break;
      }
    } catch {
      /* Worker startup. */
    }
    await new Promise((done) => setTimeout(done, 1000));
  }
  if (!ready) throw new Error("Lighthouse Worker did not start.");
  context = await chromium.launchPersistentContext(profile, {
    headless: true,
    args: ["--remote-debugging-port=9222"],
  });
  for (const [route, name] of [
    ["/", "home"],
    ["/awareness", "awareness-hub"],
    ["/awareness/articles", "awareness"],
    ["/learn", "learning"],
  ])
    await audit(route, name);
  if (process.env.E2E_LEARNER_EMAIL && process.env.E2E_ADMIN_EMAIL) {
    await login("LEARNER");
    await audit("/dashboard", "dashboard");
    await login("ADMIN");
    for (const [route, name] of [
      ["/admin/users", "users"],
      ["/admin/reports", "reports"],
      ["/admin/certificates", "certificates"],
    ])
      await audit(route, name);
  }
} finally {
  await context?.close();
  worker.kill();
  // Only remove the unique temporary profile created by this process.
  if (resolve(profile).startsWith(resolve(tmpdir()) + sep) && profile.includes("ncap-lighthouse-"))
    await rm(profile, { recursive: true, force: true });
}
