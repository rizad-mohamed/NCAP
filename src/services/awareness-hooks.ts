import { useQuery } from "@tanstack/react-query";
import { useRepository } from "./repository-provider";
import { getAwarenessSummary, type AwarenessCollection } from "./awareness-repository";
import type { AwarenessKind, AwarenessRecord, AwarenessListInput } from "@/domain/awareness";
export function useAwarenessSummary() {
  return useQuery({
    queryKey: ["awareness", "summary", "public"],
    queryFn: getAwarenessSummary,
    refetchInterval: 30000,
  });
}
export function useAwarenessPage<K extends AwarenessKind>(
  kind: K,
  input: Omit<AwarenessListInput, "kind" | "admin"> = {},
) {
  const repository = useRepository();
  const collection = repository[kind] as unknown as AwarenessCollection<AwarenessRecord>;
  return useQuery({
    queryKey: ["repository", kind, collection.scope, input],
    queryFn: () => collection.query(input),
    refetchInterval: 30000,
  });
}
