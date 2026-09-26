import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { awarenessKinds } from "@/domain/awareness";
import { createSupabaseServerClient } from "@/server/auth/supabase";
import { awarenessResult } from "@/server/awareness/errors";
import { getResource, listResources, summary } from "@/server/awareness/queries";
import { saveResource, deleteResource } from "@/server/awareness/service";
import { prepareMedia, finishMedia, retireMedia, mediaUrl } from "@/server/awareness/media";
function client() {
  setResponseHeaders(
    new Headers({ "cache-control": "private, no-store", vary: "Cookie, Authorization" }),
  );
  return createSupabaseServerClient();
}
// Parse inside the result boundary so invalid inputs never serialize raw validation errors.
export const listAwareness = createServerFn({ method: "GET" })
  .validator((v: unknown) => v)
  .handler(({ data }) => awarenessResult(() => listResources(client(), data)));
export const awarenessSummary = createServerFn({ method: "GET" }).handler(() =>
  awarenessResult(() => summary(client())),
);
export const getAwareness = createServerFn({ method: "GET" })
  .validator((v: unknown) => v)
  .handler(({ data }) =>
    awarenessResult(() => {
      const args = z
        .object({
          kind: z.enum(awarenessKinds),
          key: z.string().min(1).max(180),
          admin: z.boolean().default(false),
        })
        .parse(data);
      return getResource(client(), args.kind, args.key, args.admin);
    }),
  );
export const saveAwareness = createServerFn({ method: "POST" })
  .validator((v: unknown) => v)
  .handler(({ data }) =>
    awarenessResult(() => {
      const args = z.object({ kind: z.enum(awarenessKinds), record: z.unknown() }).parse(data);
      return saveResource(client(), args.kind, args.record);
    }),
  );
export const deleteAwareness = createServerFn({ method: "POST" })
  .validator((v: unknown) => v)
  .handler(({ data }) =>
    awarenessResult(() => {
      const args = z
        .object({ id: z.string().uuid(), version: z.number().int().positive() })
        .parse(data);
      return deleteResource(client(), args.id, args.version);
    }),
  );
export const prepareAwarenessMedia = createServerFn({ method: "POST" })
  .validator((v: unknown) => v)
  .handler(({ data }) => awarenessResult(() => prepareMedia(client(), data)));
export const finishAwarenessMedia = createServerFn({ method: "POST" })
  .validator((v: unknown) => v)
  .handler(({ data }) =>
    awarenessResult(() => finishMedia(client(), z.string().uuid().parse(data))),
  );
export const discardAwarenessMedia = createServerFn({ method: "POST" })
  .validator((v: unknown) => v)
  .handler(({ data }) =>
    awarenessResult(() => retireMedia(client(), z.string().uuid().parse(data))),
  );
export const awarenessMediaUrl = createServerFn({ method: "GET" })
  .validator((v: unknown) => v)
  .handler(({ data }) =>
    awarenessResult(() => {
      const args = z
        .object({ id: z.string().uuid(), download: z.boolean().default(false) })
        .parse(data);
      return mediaUrl(client(), args.id, args.download);
    }),
  );
