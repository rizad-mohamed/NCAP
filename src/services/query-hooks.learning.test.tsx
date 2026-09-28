import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { NcapRepository } from "./index";
import type { TopicRecord } from "@/data/types";
import {
  useRepositoryList,
  useSaveRepositoryRecord,
  useRemoveRepositoryRecord,
} from "./query-hooks";

const original: TopicRecord = {
  id: "topic-test",
  name: "Before",
  slug: "before",
  status: "Active",
  version: 1,
  createdAt: "2026-09-27",
  updatedAt: "2026-09-27",
};

it("Learning save returns the persisted record and waits for refreshed lists before reopening an editor", async () => {
  const saved = { ...original, name: "After", version: 2 };
  let refresh!: (records: TopicRecord[]) => void;
  const repository = {
    topics: {
      scope: "admin:test",
      list: vi
        .fn()
        .mockResolvedValueOnce([original])
        .mockImplementation(
          () =>
            new Promise((resolve) => {
              refresh = resolve;
            }),
        ),
      save: vi.fn().mockResolvedValue(saved),
    },
  } as unknown as NcapRepository;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result, unmount } = renderHook(
    () => ({
      list: useRepositoryList(repository, "topics"),
      save: useSaveRepositoryRecord(repository, "topics"),
    }),
    { wrapper },
  );
  await waitFor(() => expect(result.current.list.data).toEqual([original]));
  let completed = false;
  let mutation!: Promise<unknown>;
  act(() => {
    mutation = result.current.save.mutateAsync(saved).then(() => {
      completed = true;
    });
  });
  await waitFor(() => expect(result.current.list.data).toEqual([saved]));
  expect(completed).toBe(false);
  await act(async () => {
    refresh([saved]);
    await mutation;
  });
  expect(completed).toBe(true);
  expect(result.current.list.data?.[0]?.version).toBe(2);
  unmount();
  client.clear();
});

it("Learning deletion removes the saved record from its account-scoped cache", async () => {
  const repository = {
    topics: {
      scope: "admin:test",
      list: vi.fn().mockResolvedValueOnce([original]).mockResolvedValue([]),
      remove: vi.fn().mockResolvedValue(undefined),
    },
  } as unknown as NcapRepository;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["repository", "topics", "admin:other"], [original]);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result, unmount } = renderHook(
    () => ({
      list: useRepositoryList(repository, "topics"),
      remove: useRemoveRepositoryRecord(repository, "topics"),
    }),
    { wrapper },
  );
  await waitFor(() => expect(result.current.list.data).toEqual([original]));
  await act(async () => {
    await result.current.remove.mutateAsync({ id: original.id, version: 1 });
  });
  await waitFor(() => expect(result.current.list.data).toEqual([]));
  expect(client.getQueryData(["repository", "topics", "admin:other"])).toEqual([original]);
  unmount();
  client.clear();
});
