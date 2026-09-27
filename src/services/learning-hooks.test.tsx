import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { AuthUser } from "@/auth/types";
import { emptyLearningState } from "@/domain/learning";
import { useLearningStore } from "./learning-hooks";
const api = vi.hoisted(() => ({ list: vi.fn(), state: vi.fn(), mutate: vi.fn(), toast: vi.fn() }));
vi.mock("@/learning/learning.functions", () => ({
  getLearningState: api.state,
  mutateLearningState: api.mutate,
}));
vi.mock("./learning-repository", () => ({
  allLearning: api.list,
  unwrapLearning: async (request: Promise<{ ok: boolean; data: unknown; message?: string }>) => {
    const result = await request;
    if (!result.ok) throw new Error(result.message);
    return result.data;
  },
}));
vi.mock("sonner", () => ({ toast: { error: api.toast } }));
const user = (id: string) => ({ id, role: "learner" }) as AuthUser;
function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return {
    client,
    Wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  api.list.mockImplementation(async (kind: string) =>
    kind === "lessons"
      ? [{ id: "lesson", title: "Lesson" }]
      : kind === "modules"
        ? [{ id: "module", title: "Module" }]
        : [],
  );
  api.state.mockResolvedValue({ ok: true, data: { ...emptyLearningState } });
  api.mutate.mockResolvedValue({ ok: true, data: { ...emptyLearningState } });
});
describe("Learning frontend persistence integration", () => {
  it("loads modules and lessons from the server with pending state", async () => {
    const { Wrapper } = wrapper();
    const { result, unmount } = renderHook(() => useLearningStore(user("alice"), false), {
      wrapper: Wrapper,
    });
    expect(result.current.learningPending).toBe(true);
    await waitFor(() => expect(result.current.learningPending).toBe(false));
    expect(result.current.modules[0]?.id).toBe("module");
    expect(result.current.lessons[0]?.id).toBe("lesson");
    unmount();
  });
  it("completion and bookmarks survive remounting in a new device query cache", async () => {
    let state = { ...emptyLearningState };
    api.state.mockImplementation(async () => ({ ok: true, data: state }));
    api.mutate.mockImplementation(async ({ data }) => {
      state = {
        ...state,
        ...(data.action === "complete"
          ? { completedLessons: [data.lessonId] }
          : { bookmarks: data.saved ? [data.lessonId] : [] }),
      };
      return { ok: true, data: state };
    });
    const { Wrapper } = wrapper();
    const first = renderHook(() => useLearningStore(user("alice"), false), { wrapper: Wrapper });
    await waitFor(() => expect(first.result.current.learningPending).toBe(false));
    await act(async () => {
      await first.result.current.completeLesson("lesson");
    });
    await act(async () => {
      expect(await first.result.current.toggleBookmark("lesson")).toBe(true);
    });
    expect(first.result.current.completedLessons).toEqual(["lesson"]);
    first.unmount();
    const device = wrapper();
    const second = renderHook(() => useLearningStore(user("alice"), false), {
      wrapper: device.Wrapper,
    });
    await waitFor(() => expect(second.result.current.bookmarks).toEqual(["lesson"]));
    expect(second.result.current.completedLessons).toEqual(["lesson"]);
    second.unmount();
  });
  it("does not expose a previous learner's state when accounts change or sign out", async () => {
    api.state
      .mockResolvedValueOnce({
        ok: true,
        data: { ...emptyLearningState, bookmarks: ["private-alice"] },
      })
      .mockResolvedValue({ ok: true, data: emptyLearningState });
    const { Wrapper } = wrapper();
    const { result, rerender, unmount } = renderHook(
      ({ current }: { current: AuthUser | null }) => useLearningStore(current, false),
      { initialProps: { current: user("alice") as AuthUser | null }, wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.bookmarks).toEqual(["private-alice"]));
    rerender({ current: user("bob") });
    expect(result.current.bookmarks).toEqual([]);
    await waitFor(() => expect(result.current.learningPending).toBe(false));
    rerender({ current: null });
    expect(result.current.bookmarks).toEqual([]);
    unmount();
  });
  it("keeps progress unchanged on failed saves and displays safe errors", async () => {
    api.mutate.mockResolvedValue({ ok: false, message: "Sign in to save your learning progress." });
    const { Wrapper } = wrapper();
    const { result, unmount } = renderHook(() => useLearningStore(user("alice"), false), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.learningPending).toBe(false));
    await act(async () => {
      await expect(result.current.completeLesson("lesson")).rejects.toThrow("Sign in");
    });
    expect(result.current.completedLessons).toEqual([]);
    expect(api.toast).toHaveBeenCalled();
    unmount();
  });
  it("exposes backend load failures rather than seeded content", async () => {
    api.list.mockRejectedValue(new Error("Learning is temporarily unavailable."));
    const { Wrapper } = wrapper();
    const { result, unmount } = renderHook(() => useLearningStore(null, false), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.learningError?.message).toContain("unavailable"));
    expect(result.current.modules).toEqual([]);
    expect(result.current.lessons).toEqual([]);
    unmount();
  });
});
