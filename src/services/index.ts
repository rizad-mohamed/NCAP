import type {
  Announcement,
  Article,
  BestPractice,
  CyberTip,
  DemoUser,
  Infographic,
  Lesson,
  MediaAsset,
  NewsUpdate,
  LearningModule,
  Poster,
  QuizAttempt,
  QuizDraftAttempt,
  QuizQuestion,
  TopicRecord,
  VideoResource,
} from "@/data/types";

export type RepositoryErrorCode =
  | "cancelled"
  | "timeout"
  | "network"
  | "malformed-response"
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "validation"
  | "rate-limited"
  | "server"
  | "unknown";

export class RepositoryError extends Error {
  constructor(
    public readonly code: RepositoryErrorCode,
    message: string,
    public readonly status?: number,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "RepositoryError";
  }
}

const statusCodes: Partial<Record<number, RepositoryErrorCode>> = {
  401: "unauthenticated",
  403: "forbidden",
  404: "not-found",
  409: "conflict",
  422: "validation",
  429: "rate-limited",
  500: "server",
};

export function normalizeRepositoryError(error: unknown, status?: number): RepositoryError {
  if (error instanceof RepositoryError) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new RepositoryError("cancelled", "The request was cancelled.");
  }
  if (status) {
    const code = statusCodes[status] ?? (status >= 500 ? "server" : "unknown");
    return new RepositoryError(
      code,
      status >= 500
        ? "The service is temporarily unavailable."
        : "The request could not be completed.",
      status,
      status === 429 || status >= 500,
    );
  }
  if (error instanceof TypeError) {
    return new RepositoryError("network", "Check your connection and try again.", undefined, true);
  }
  return new RepositoryError("unknown", "Something went wrong. Please try again.");
}

export interface RepositoryCollection<T extends { id: string }> {
  scope?: string;
  snapshot?(): T[];
  list(signal?: AbortSignal): Promise<T[]>;
  get(id: string, signal?: AbortSignal): Promise<T | null>;
  save(record: T, signal?: AbortSignal): Promise<T>;
  remove(id: string, signal?: AbortSignal, version?: number): Promise<void>;
  replace(records: T[], signal?: AbortSignal): Promise<void>;
}

/** Injectable boundary shared by the local demo adapter and a future HTTP adapter. */
export interface NcapRepository {
  modules: RepositoryCollection<LearningModule>;
  lessons: RepositoryCollection<Lesson>;
  articles: RepositoryCollection<Article>;
  cyberTips: RepositoryCollection<CyberTip>;
  newsUpdates: RepositoryCollection<NewsUpdate>;
  bestPractices: RepositoryCollection<BestPractice>;
  posters: RepositoryCollection<Poster>;
  infographics: RepositoryCollection<Infographic>;
  videos: RepositoryCollection<VideoResource>;
  questions: RepositoryCollection<QuizQuestion>;
  topics: RepositoryCollection<TopicRecord>;
  announcements: RepositoryCollection<Announcement>;
  users: RepositoryCollection<DemoUser>;
  attempts: RepositoryCollection<QuizAttempt>;
  media: RepositoryCollection<MediaAsset>;
  readQuizDraft(quizId: string, signal?: AbortSignal): Promise<QuizDraftAttempt | null>;
  saveQuizDraft(draft: QuizDraftAttempt, signal?: AbortSignal): Promise<void>;
}

export const repositoryKeys = {
  collection: (name: keyof NcapRepository) => ["repository", name] as const,
  record: (name: keyof NcapRepository, id: string) => ["repository", name, id] as const,
  reports: (filters: Record<string, string>) => ["repository", "reports", filters] as const,
};
