import { mediaInputSchema } from "./awareness";

// The configured Supabase plan caps each upload at 50 MiB.
export const LEARNING_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const learningMediaInputSchema = mediaInputSchema.refine(
  (media) => media.sizeBytes <= LEARNING_VIDEO_MAX_BYTES,
  "Learning videos must be 50 MiB or smaller.",
);
