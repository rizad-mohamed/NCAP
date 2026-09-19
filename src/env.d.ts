/// <reference types="vite/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    readonly SUPABASE_URL?: string;
    readonly SUPABASE_PUBLISHABLE_KEY?: string;
    readonly APP_URL?: string;
    readonly NODE_ENV?: "development" | "production" | "test";
  }
}
