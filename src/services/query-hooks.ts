import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NcapRepository, RepositoryCollection } from "@/services";
import { normalizeRepositoryError, repositoryKeys } from "@/services";

type CollectionName = {
  [K in keyof NcapRepository]: NcapRepository[K] extends RepositoryCollection<{ id: string }>
    ? K
    : never;
}[keyof NcapRepository];

type CollectionRecord<K extends CollectionName> =
  NcapRepository[K] extends RepositoryCollection<infer T> ? T : never;

export function useRepositoryList<K extends CollectionName>(repository: NcapRepository, name: K) {
  const queryClient = useQueryClient();
  const collection = repository[name] as unknown as RepositoryCollection<CollectionRecord<K>>;
  const queryKey = useMemo(() => repositoryKeys.collection(name), [name]);
  const snapshot = collection.snapshot?.();
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      collection.list(signal).catch((error) => Promise.reject(normalizeRepositoryError(error))),
    initialData: snapshot,
  });
  useEffect(() => {
    if (snapshot) queryClient.setQueryData(queryKey, snapshot);
  }, [queryClient, queryKey, snapshot]);
  // A local adapter snapshot is already authoritative React state. Returning it directly avoids
  // a stale query-cache frame after hydration or a fast cross-workspace navigation. HTTP adapters
  // omit snapshot() and continue to use the asynchronous query result.
  return snapshot ? { ...query, data: snapshot } : query;
}

export function useRepositoryRecord<K extends CollectionName>(
  repository: NcapRepository,
  name: K,
  id: string,
) {
  const collection = repository[name] as unknown as RepositoryCollection<CollectionRecord<K>>;
  return useQuery({
    queryKey: repositoryKeys.record(name, id),
    queryFn: ({ signal }) =>
      collection.get(id, signal).catch((error) => Promise.reject(normalizeRepositoryError(error))),
    enabled: Boolean(id),
  });
}

export function useSaveRepositoryRecord<K extends CollectionName>(
  repository: NcapRepository,
  name: K,
) {
  const queryClient = useQueryClient();
  const collection = repository[name] as unknown as RepositoryCollection<CollectionRecord<K>>;
  return useMutation({
    mutationFn: (record: CollectionRecord<K>) =>
      collection.save(record).catch((error) => Promise.reject(normalizeRepositoryError(error))),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: repositoryKeys.collection(name) });
    },
  });
}

export function useRemoveRepositoryRecord<K extends CollectionName>(
  repository: NcapRepository,
  name: K,
) {
  const queryClient = useQueryClient();
  const collection = repository[name] as unknown as RepositoryCollection<CollectionRecord<K>>;
  return useMutation({
    mutationFn: (id: string) =>
      collection.remove(id).catch((error) => Promise.reject(normalizeRepositoryError(error))),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: repositoryKeys.collection(name) });
    },
  });
}
