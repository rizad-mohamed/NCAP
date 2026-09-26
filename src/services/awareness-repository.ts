import type { NcapRepository, RepositoryCollection } from "@/services";
import { RepositoryError, normalizeRepositoryError } from "@/services";
import {
  awarenessKinds,
  type AwarenessKind,
  type AwarenessRecord,
  type AwarenessListInput,
} from "@/domain/awareness";
import {
  listAwareness,
  getAwareness,
  saveAwareness,
  deleteAwareness,
  awarenessSummary,
} from "@/awareness/awareness.functions";
import type { AwarenessResult } from "@/server/awareness/errors";
export async function unwrapAwareness<T>(request: Promise<AwarenessResult<T>>): Promise<T> {
  try {
    const result = await request;
    if (!result.ok) throw new RepositoryError(result.code, result.message);
    return result.data;
  } catch (error) {
    throw normalizeRepositoryError(error);
  }
}
export interface AwarenessCollection<T extends AwarenessRecord> extends RepositoryCollection<T> {
  query(input: Omit<AwarenessListInput, "kind" | "admin">): Promise<{ items: T[]; total: number }>;
}
export const getAwarenessSummary = () => unwrapAwareness(awarenessSummary());
export function withAwarenessRepository(
  local: NcapRepository,
  admin: boolean,
  userId?: string,
): NcapRepository {
  const overrides: Partial<NcapRepository> = {};
  for (const kind of awarenessKinds) {
    // Version comes from the record the administrator actually viewed, never a refetch during delete.
    const versions = new Map<string, number>();
    const remember = (r: AwarenessRecord) => {
      if (r.version) versions.set(r.id, r.version);
      return r;
    };
    const query = async (input: Omit<AwarenessListInput, "kind" | "admin">) => {
      const result = await unwrapAwareness(listAwareness({ data: { ...input, kind, admin } }));
      result.items.forEach(remember);
      return result;
    };
    const collection: AwarenessCollection<AwarenessRecord> = {
      scope: admin ? `admin:${userId}` : "public",
      query,
      async list() {
        let offset = 0;
        const items: AwarenessRecord[] = [];
        while (true) {
          const page = await query({ offset, limit: 100 });
          items.push(...page.items);
          offset += page.items.length;
          if (!page.items.length || offset >= page.total) return items;
        }
      },
      async get(key) {
        const r = await unwrapAwareness(getAwareness({ data: { kind, key, admin } }));
        return r ? remember(r) : null;
      },
      async save(record) {
        return remember(await unwrapAwareness(saveAwareness({ data: { kind, record } })));
      },
      async remove(id, _signal, expectedVersion) {
        const version = expectedVersion ?? versions.get(id);
        if (!version)
          throw new RepositoryError("conflict", "Reload the record before deleting it.");
        await unwrapAwareness(deleteAwareness({ data: { id, version } }));
      },
      async replace() {
        throw new RepositoryError("validation", "Save Awareness records individually.");
      },
    };
    Object.assign(overrides, { [kind]: collection });
  }
  return { ...local, ...overrides };
}
