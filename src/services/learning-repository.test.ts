import { beforeEach, describe, expect, it, vi } from "vitest";
import { withLearningRepository, queryLearning } from "./learning-repository";
import type { NcapRepository } from "@/services";
import type { LearningModule } from "@/data/types";
const api = vi.hoisted(() => ({ list: vi.fn(), save: vi.fn(), remove: vi.fn(), reorder: vi.fn() }));
vi.mock("@/learning/learning.functions", () => ({
  listLearning: api.list,
  saveLearning: api.save,
  deleteLearning: api.remove,
  reorderLearning: api.reorder,
}));
const record = { id: "m-one", version: 2, title: "Example", status: "Draft" } as LearningModule;
beforeEach(() => {
  vi.clearAllMocks();
  api.list.mockResolvedValue({ ok: true, data: { items: [record], total: 1 } });
  api.save.mockResolvedValue({ ok: true, data: { ...record, version: 3 } });
  api.remove.mockResolvedValue({ ok: true });
  api.reorder.mockResolvedValue({ ok: true });
});
describe("Learning repository and admin integration", () => {
  it("forwards search/filter constraints to server queries", async () => {
    await queryLearning({
      kind: "lessons",
      search: "passphrase",
      topicId: "topic-one",
      difficulty: "Beginner",
      moduleId: "m-one",
      offset: 100,
      limit: 50,
    });
    expect(api.list).toHaveBeenCalledWith({
      data: {
        kind: "lessons",
        search: "passphrase",
        topicId: "topic-one",
        difficulty: "Beginner",
        moduleId: "m-one",
        offset: 100,
        limit: 50,
      },
    });
  });
  it("saves and publishes through server functions with the viewed version", async () => {
    const repo = withLearningRepository({} as NcapRepository, true, "admin");
    await repo.modules.save({ ...record, status: "Published" });
    expect(api.save).toHaveBeenCalledWith({
      data: { kind: "modules", record: { ...record, status: "Published" } },
    });
    await repo.modules.remove(record.id);
    expect(api.remove).toHaveBeenCalledWith({
      data: { kind: "modules", target: record.id, expected_version: 3 },
    });
  });
  it("orders atomically rather than replacing entire collections", async () => {
    const repo = withLearningRepository({} as NcapRepository, true, "admin");
    await repo.modules.replace([{ ...record, order: 4 }]);
    expect(api.reorder).toHaveBeenCalledWith({
      data: { kind: "modules", records: [{ id: record.id, version: 2, order: 4 }] },
    });
    expect(api.save).not.toHaveBeenCalled();
  });
  it("uses distinct user/admin cache scopes and never exposes demo snapshots", () => {
    const a = withLearningRepository({} as NcapRepository, false, "alice"),
      b = withLearningRepository({} as NcapRepository, false, "bob");
    expect(a.modules.scope).not.toBe(b.modules.scope);
    expect(a.modules.snapshot).toBeUndefined();
  });
});
