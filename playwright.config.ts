import { defineConfig, devices } from "@playwright/test";
import { loadEnv } from "vite";

const localEnv = loadEnv("development", process.cwd(), "");
const testSupabaseUrl =
  process.env.SUPABASE_URL || localEnv.SUPABASE_URL || "http://127.0.0.1:54321";
const testSupabasePublishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  localEnv.SUPABASE_PUBLISHABLE_KEY ||
  "playwright-local-placeholder-key";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  timeout: 60_000,
  workers: process.env.CI ? 2 : 1,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:4173", trace: "retain-on-failure" },
  webServer: {
    command:
      "npx wrangler dev --config .output/server/wrangler.json --ip 127.0.0.1 --port 4173 --show-interactive-dev-session false --log-level warn",
    url: "http://127.0.0.1:4173",
    // Never silently test a running development server instead of the built worker.
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      CLOUDFLARE_INCLUDE_PROCESS_ENV: "true",
      SUPABASE_URL: testSupabaseUrl,
      SUPABASE_PUBLISHABLE_KEY: testSupabasePublishableKey,
      APP_URL: "http://127.0.0.1:4173",
    },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 14"] } },
  ],
});
