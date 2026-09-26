import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
afterEach(cleanup);
const mocks = vi.hoisted(() => ({ page: vi.fn(), summary: vi.fn(), record: vi.fn() }));
vi.mock("@/services/awareness-hooks", () => ({
  useAwarenessPage: mocks.page,
  useAwarenessSummary: mocks.summary,
}));
vi.mock("@/services/query-hooks", () => ({ useRepositoryRecord: mocks.record }));
vi.mock("@/services/repository-provider", () => ({ useRepository: () => ({}) }));
vi.mock("@/services/awareness-media", () => ({ AwarenessMediaService: { objectUrl: vi.fn() } }));
vi.mock("@/features/public/home/HomePage", () => ({ HomePage: () => null }));
vi.mock("@/components/layout/AppShell", () => ({
  AppLink: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
  PageCrumbs: () => null,
}));
import {
  AwarenessHubPage,
  ArticlesPage,
  ArticleDetailPage,
  ResourceListingPage,
} from "./PublicPages";
import { articles, videos } from "@/data/awareness";
const ready = (data: unknown) => ({ data, isPending: false, error: null, refetch: vi.fn() });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.page.mockReturnValue(ready({ items: [], total: 0 }));
  mocks.summary.mockReturnValue(
    ready({
      kinds: { articles: { count: 16, topics: ["MFA", "Phishing"] } },
      featured: articles[0],
    }),
  );
  mocks.record.mockReturnValue(ready(null));
});
describe("backend Awareness screens", () => {
  it("shows a pending state instead of demo data", () => {
    mocks.summary.mockReturnValue({ isPending: true, error: null, refetch: vi.fn() });
    render(<AwarenessHubPage />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading Awareness");
    expect(screen.queryByText(articles[0]!.title)).toBeNull();
  });
  it("reports backend errors with retry", () => {
    const refetch = vi.fn();
    mocks.summary.mockReturnValue({
      isPending: false,
      error: new Error("Try again later"),
      refetch,
    });
    render(<AwarenessHubPage />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalled();
  });
  it("uses the backend featured resource", () => {
    render(<AwarenessHubPage />);
    expect(screen.getByText(articles[0]!.title)).toBeInTheDocument();
  });
  it("sends article search, filter, and sort to the repository query", () => {
    mocks.page.mockReturnValue(ready({ items: [articles[0]], total: 1 }));
    render(<ArticlesPage />);
    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "phishing" } });
    expect(mocks.page).toHaveBeenLastCalledWith(
      "articles",
      expect.objectContaining({ search: "phishing", sort: "newest" }),
    );
    const selects = screen.getAllByRole("combobox");
    const sort = selects.find((el) => el.textContent?.includes("Newest"))!;
    fireEvent.change(sort, { target: { value: "Title" } });
    expect(mocks.page).toHaveBeenLastCalledWith(
      "articles",
      expect.objectContaining({ sort: "title" }),
    );
    expect(screen.getByRole("heading", { name: articles[0]!.title })).toBeInTheDocument();
  });
  it("loads detail by slug and renders structured text", () => {
    mocks.record.mockReturnValue(ready(articles[0]));
    render(<ArticleDetailPage slug={articles[0]!.slug} />);
    expect(mocks.record).toHaveBeenCalledWith({}, "articles", articles[0]!.slug);
    expect(screen.getByText(articles[0]!.body[0]!)).toBeInTheDocument();
  });
  it("keeps transcript and chapter previews available without a video asset", () => {
    mocks.page.mockReturnValue(ready({ items: [videos[0]], total: 1 }));
    render(<ResourceListingPage kind="videos" />);
    fireEvent.click(
      screen.getByRole("button", { name: `Open transcript preview ${videos[0]!.title}` }),
    );
    expect(screen.getByRole("heading", { name: "Chapters" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Transcript" })).toBeInTheDocument();
    expect(screen.getByText(videos[0]!.transcript[0]!)).toBeInTheDocument();
  });
});
