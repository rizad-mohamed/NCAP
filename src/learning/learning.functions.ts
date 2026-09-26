import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/server/auth/supabase";
import { learningResult } from "@/server/learning/errors";
import {
  listLearningRecords,
  saveLearningRecord,
  deleteLearningRecord,
  reorderLearningRecords,
  readLearningState,
  updateLearningState,
} from "@/server/learning/service";
import { prepareMedia, finishMedia, retireMedia, mediaUrl } from "@/server/learning/media";
function client() {
  setResponseHeaders(
    new Headers({ "cache-control": "private, no-store", vary: "Cookie, Authorization" }),
  );
  return createSupabaseServerClient();
}
export const listLearning = createServerFn({ method: "GET" })
  .validator((v: unknown) => v)
  .handler(({ data }) => learningResult(() => listLearningRecords(client(), data)));
export const saveLearning = createServerFn({ method: "POST" })
  .validator((v: unknown) => v)
  .handler(({ data }) => learningResult(() => saveLearningRecord(client(), data)));
export const deleteLearning = createServerFn({ method: "POST" })
  .validator((v: unknown) => v)
  .handler(({ data }) => learningResult(() => deleteLearningRecord(client(), data)));
export const reorderLearning = createServerFn({ method: "POST" })
  .validator((v: unknown) => v)
  .handler(({ data }) => learningResult(() => reorderLearningRecords(client(), data)));
export const getLearningState = createServerFn({ method: "GET" }).handler(() =>
  learningResult(() => readLearningState(client())),
);
export const mutateLearningState = createServerFn({ method: "POST" })
  .validator((v: unknown) => v)
  .handler(({ data }) => learningResult(() => updateLearningState(client(), data)));
export const prepareLearningMedia = createServerFn({ method: "POST" })
  .validator((v: unknown) => v)
  .handler(({ data }) => learningResult(() => prepareMedia(client(), data)));
export const finishLearningMedia = createServerFn({ method: "POST" })
  .validator((v: unknown) => v)
  .handler(({ data }) =>
    learningResult(() => finishMedia(client(), z.string().uuid().parse(data))),
  );
export const discardLearningMedia = createServerFn({ method: "POST" })
  .validator((v: unknown) => v)
  .handler(({ data }) =>
    learningResult(() => retireMedia(client(), z.string().uuid().parse(data))),
  );
export const learningMediaUrl = createServerFn({ method: "GET" })
  .validator((v: unknown) => v)
  .handler(({ data }) => learningResult(() => mediaUrl(client(), z.string().uuid().parse(data))));
