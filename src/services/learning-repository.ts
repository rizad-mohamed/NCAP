import type { NcapRepository, RepositoryCollection } from "@/services";
import { RepositoryError, normalizeRepositoryError } from "@/services";
import {
  learningKinds,
  type LearningKind,
  type LearningRecord,
  type LearningListInput,
} from "@/domain/learning";
import {
  listLearning,
  saveLearning,
  deleteLearning,
  reorderLearning,
} from "@/learning/learning.functions";
import type { LearningResult } from "@/server/learning/errors";

export async function unwrapLearning<T>(request: Promise<LearningResult<T>>): Promise<T> {
  try {
    const result = await request;
    if (!result.ok) throw new RepositoryError(result.code, result.message);
    return result.data;
  } catch (error) {
    throw normalizeRepositoryError(error);
  }
}
export async function queryLearning(input: LearningListInput) {
  return unwrapLearning(listLearning({ data: input }));
}
export async function allLearning(kind: LearningKind, admin: boolean) {
  const items: LearningRecord[] = [];
  while (true) {
    const page = await queryLearning({ kind, admin, offset: items.length, limit: 100 });
    items.push(...page.items);
    if (!page.items.length || items.length >= page.total) return items;
  }
}
export function withLearningRepository(
  local: NcapRepository,
  admin: boolean,
  userId?: string,
): NcapRepository {
  const overrides: Partial<NcapRepository> = {};
  for (const kind of learningKinds) {
    const versions = new Map<string, number>();
    const remember = (r: LearningRecord) => {
      if (r.version) versions.set(r.id, r.version);
      return r;
    };
    const collection: RepositoryCollection<LearningRecord> = {
      scope: admin ? `admin:${userId}` : `learning:${userId ?? "public"}`,
      async list() {
        return (await allLearning(kind, admin)).map(remember);
      },
      async get(id) {
        const page = await queryLearning({ kind, admin, id });
        return page.items[0] ? remember(page.items[0]) : null;
      },
      async save(record) {
        return remember(await unwrapLearning(saveLearning({ data: { kind, record } })));
      },
      async remove(id, _signal, version) {
        await unwrapLearning(
          deleteLearning({
            data: { kind, target: id, expected_version: version ?? versions.get(id) },
          }),
        );
      },
      async replace(records) {
        if (kind === "topics") throw new RepositoryError("validation", "Save topics individually.");
        await unwrapLearning(
          reorderLearning({
            data: {
              kind,
              records: records.map((r) => ({
                id: r.id,
                version: r.version,
                order: "order" in r ? r.order : undefined,
              })),
            },
          }),
        );
      },
    };
    Object.assign(overrides, { [kind]: collection });
  }
  return { ...local, ...overrides };
}
