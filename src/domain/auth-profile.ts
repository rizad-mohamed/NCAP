import { z } from "zod";

// Small raster avatars stay with the profile, so deletion and ownership share its RLS.
export const avatarSchema = z
  .object({
    id: z.string().uuid(),
    fileName: z.string().max(140),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    sizeBytes: z
      .number()
      .int()
      .min(1)
      .max(256 * 1024),
    width: z.number().int().min(1).max(1024),
    height: z.number().int().min(1).max(1024),
    altText: z.string().max(200),
    storageKey: z
      .string()
      .max(350_000)
      .regex(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/),
    status: z.literal("ready"),
  })
  .strict();
export const interestsSchema = z
  .array(z.string().trim().min(1).max(100))
  .max(30)
  .refine((values) => new Set(values).size === values.length, "Choose each interest once.");
