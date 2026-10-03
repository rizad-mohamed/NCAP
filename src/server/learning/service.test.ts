import { describe, it, expect, vi } from "vitest";
import { requireLearningAdmin } from "./authorization";
import type { LearningClient } from "./authorization";
import { learningResult, learningDatabaseError } from "./errors";
import {
  deleteLearningRecord,
  listLearningRecords,
  saveLearningRecord,
  updateLearningState,
} from "./service";
function client(role = "learner", signedIn = true) {
  const rpc = vi.fn().mockResolvedValue({ data: { items: [], total: 0 }, error: null });
  const single = vi.fn().mockResolvedValue({ data: { role }, error: null });
  const maybeSingle = vi.fn().mockResolvedValue({ data: { id: "q-authored" }, error: null });
  const eq = vi.fn(() => ({ eq, single, maybeSingle }));
  const c = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: signedIn ? { id: "current-user" } : null },
        error: null,
      }),
    },
    from: vi.fn(() => ({ select: () => ({ eq }) })),
    rpc,
  };
  return { client: c as unknown as LearningClient, rpc, maybeSingle, eq };
}
describe("Learning server authorization and safe errors", () => {
  const authoredModule = {
    id: "m-authored",
    title: "Authored module",
    description: "Live assessment relationship",
    topicId: "t-safety",
    topic: "Safety",
    difficulty: "Beginner",
    minutes: 10,
    order: 1,
    status: "Draft",
    objectives: ["Learn safely"],
    quizId: "q-authored",
  };
  it("accepts authored assessment relationships from the database rather than bundled seeds", async () => {
    const c = client("super_admin");
    await saveLearningRecord(c.client, { kind: "modules", record: authoredModule });
    expect(c.eq).toHaveBeenCalledWith("id", "q-authored");
    expect(c.eq).toHaveBeenCalledWith("module_id", "m-authored");
    expect(c.rpc).toHaveBeenCalledWith(
      "save_learning_record",
      expect.objectContaining({ kind: "modules" }),
    );
  });
  it("rejects missing or unrelated assessments and fails safely on lookup errors", async () => {
    const c = client("super_admin");
    c.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(
      saveLearningRecord(c.client, { kind: "modules", record: authoredModule }),
    ).rejects.toMatchObject({ code: "validation" });
    c.maybeSingle.mockResolvedValueOnce({ data: null, error: { code: "unavailable" } });
    await expect(
      saveLearningRecord(c.client, { kind: "modules", record: authoredModule }),
    ).rejects.toMatchObject({ code: "server" });
    expect(c.rpc).not.toHaveBeenCalled();
  });
  it("allows the authoritative database to decide deletion after a seeded quiz is removed", async () => {
    const c = client("super_admin");
    await deleteLearningRecord(c.client, {
      kind: "modules",
      target: "m-fundamentals",
      expected_version: 1,
    });
    expect(c.rpc).toHaveBeenCalledWith("delete_learning_record", {
      kind: "modules",
      target: "m-fundamentals",
      expected_version: 1,
    });
  });
  it("rejects a queued mutation from an account that has since signed out", async () => {
    const c = client();
    await expect(
      updateLearningState(c.client, {
        action: "complete",
        lessonId: "l-one",
        expectedUserId: "00000000-0000-4000-8000-000000000999",
      }),
    ).rejects.toMatchObject({ code: "conflict" });
    expect(c.rpc).not.toHaveBeenCalled();
  });
  it("requires a verified session and database role", async () => {
    await expect(requireLearningAdmin(client("learner", false).client)).rejects.toMatchObject({
      code: "unauthenticated",
    });
    await expect(requireLearningAdmin(client().client)).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(requireLearningAdmin(client("super_admin").client)).resolves.toBe("current-user");
  });
  it("rejects unauthorized admin reads and writes before RPC", async () => {
    const c = client();
    await expect(
      listLearningRecords(c.client, { kind: "lessons", admin: true }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      saveLearningRecord(c.client, { kind: "lessons", record: {} }),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(c.rpc).not.toHaveBeenCalled();
  });
  it("validates before mutation and strips client supplied ownership", async () => {
    const c = client();
    await expect(
      updateLearningState(c.client, { action: "complete", lessonId: "bad/id" }),
    ).rejects.toBeDefined();
    expect(c.rpc).not.toHaveBeenCalled();
    await updateLearningState(c.client, {
      action: "complete",
      lessonId: "l-one",
      userId: "victim",
    });
    expect(c.rpc).toHaveBeenCalledWith("mutate_learning_state", {
      payload: { action: "complete", lessonId: "l-one" },
    });
  });
  it.each(["23503", "23001", "23514"])(
    "maps relationship/validation error %s safely",
    async (code) => {
      const result = await learningResult(async () => learningDatabaseError({ code }));
      expect(result).toMatchObject({ ok: false, code: "validation" });
    },
  );
  it("does not serialize internal database details", async () => {
    const result = await learningResult(async () => {
      throw new Error("secret database host/password");
    });
    expect(result).toMatchObject({ ok: false, code: "server" });
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});
