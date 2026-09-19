import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_URL: z.string().url().max(2048),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(20).max(4096),
  APP_URL: z.string().url().max(2048),
});

export type ServerAuthEnv = z.infer<typeof serverEnvSchema>;

/** Read per request so Cloudflare runtime bindings are available. */
export function getServerAuthEnv(): ServerAuthEnv {
  const parsed = serverEnvSchema.safeParse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
    APP_URL: process.env.APP_URL,
  });

  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid server authentication configuration: ${missing}`);
  }

  return parsed.data;
}
