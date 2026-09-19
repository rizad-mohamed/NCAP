import type {
  Announcement,
  Article,
  BestPractice,
  CertificateRecord,
  CertificateTemplate,
  CyberTip,
  DemoUser,
  Infographic,
  Lesson,
  LearningModule,
  MediaAsset,
  NewsUpdate,
  Poster,
  QuizAttempt,
  QuizDraftAttempt,
  QuizQuestion,
  TopicRecord,
  VideoResource,
} from "@/data/types";
import type { NcapRepository, RepositoryCollection } from "@/services";
import { RepositoryError } from "@/services";

export interface LocalDemoSnapshot {
  lessons: Lesson[];
  modules: LearningModule[];
  articles: Article[];
  cyberTips: CyberTip[];
  newsUpdates: NewsUpdate[];
  bestPractices: BestPractice[];
  posters: Poster[];
  infographics: Infographic[];
  videos: VideoResource[];
  questions: QuizQuestion[];
  topics: TopicRecord[];
  announcements: Announcement[];
  users: DemoUser[];
  attempts: QuizAttempt[];
  quizDrafts: Record<string, QuizDraftAttempt>;
  certificateTemplate: CertificateTemplate;
  certificateRecords: CertificateRecord[];
}

export interface LocalDemoMutations {
  setLessons(records: Lesson[]): void;
  setModules(records: LearningModule[]): void;
  setArticles(records: Article[]): void;
  setCyberTips(records: CyberTip[]): void;
  setNewsUpdates(records: NewsUpdate[]): void;
  setBestPractices(records: BestPractice[]): void;
  setPosters(records: Poster[]): void;
  setInfographics(records: Infographic[]): void;
  setVideos(records: VideoResource[]): void;
  setQuestions(records: QuizQuestion[]): void;
  setTopics(records: TopicRecord[]): void;
  setAnnouncements(records: Announcement[]): void;
  setUsers(records: DemoUser[]): void;
  saveQuizDraft(draft: QuizDraftAttempt): void;
  clearQuizDraft(quizId: string): void;
  setCertificateTemplate(template: CertificateTemplate): void;
  setCertificateRecords(records: CertificateRecord[]): void;
}

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new RepositoryError("cancelled", "The request was cancelled.");
}

function collection<T extends { id: string }>(
  read: () => T[],
  write?: (records: T[]) => void,
): RepositoryCollection<T> {
  return {
    snapshot: read,
    async list(signal) {
      assertNotAborted(signal);
      return read();
    },
    async get(id, signal) {
      assertNotAborted(signal);
      return read().find((record) => record.id === id) ?? null;
    },
    async save(record, signal) {
      assertNotAborted(signal);
      if (!write) {
        throw new RepositoryError("validation", "This local demo collection is read-only.");
      }
      const records = read();
      write(
        records.some((item) => item.id === record.id)
          ? records.map((item) => (item.id === record.id ? record : item))
          : [...records, record],
      );
      return record;
    },
    async remove(id, signal) {
      assertNotAborted(signal);
      if (!write) {
        throw new RepositoryError("validation", "This local demo collection is read-only.");
      }
      write(read().filter((record) => record.id !== id));
    },
    async replace(records, signal) {
      assertNotAborted(signal);
      if (!write) {
        throw new RepositoryError("validation", "This local demo collection is read-only.");
      }
      write(records);
    },
  };
}

function mediaAssets(snapshot: LocalDemoSnapshot) {
  const records = [
    ...snapshot.modules.map((record) => record.image),
    ...snapshot.articles.map((record) => record.image),
    ...snapshot.posters.map((record) => record.image),
    ...snapshot.infographics.map((record) => record.image),
    ...snapshot.videos.map((record) => record.poster),
    ...snapshot.users.map((record) => record.avatar),
    snapshot.certificateTemplate.logo,
  ].filter((record): record is MediaAsset => Boolean(record));
  return [...new Map(records.map((record) => [record.id, record])).values()];
}

export function createLocalDemoRepository(
  read: () => LocalDemoSnapshot,
  mutations: LocalDemoMutations,
): NcapRepository {
  return {
    modules: collection(() => read().modules, mutations.setModules),
    lessons: collection(() => read().lessons, mutations.setLessons),
    articles: collection(() => read().articles, mutations.setArticles),
    cyberTips: collection(() => read().cyberTips, mutations.setCyberTips),
    newsUpdates: collection(() => read().newsUpdates, mutations.setNewsUpdates),
    bestPractices: collection(() => read().bestPractices, mutations.setBestPractices),
    posters: collection(() => read().posters, mutations.setPosters),
    infographics: collection(() => read().infographics, mutations.setInfographics),
    videos: collection(() => read().videos, mutations.setVideos),
    questions: collection(() => read().questions, mutations.setQuestions),
    topics: collection(() => read().topics, mutations.setTopics),
    announcements: collection(() => read().announcements, mutations.setAnnouncements),
    users: collection(() => read().users, mutations.setUsers),
    attempts: collection(() => read().attempts),
    certificateRecords: collection(
      () => read().certificateRecords,
      mutations.setCertificateRecords,
    ),
    media: collection(() => mediaAssets(read())),
    async readQuizDraft(quizId, signal) {
      assertNotAborted(signal);
      return read().quizDrafts[quizId] ?? null;
    },
    async saveQuizDraft(draft, signal) {
      assertNotAborted(signal);
      mutations.saveQuizDraft(draft);
    },
    async readCertificateTemplate(signal) {
      assertNotAborted(signal);
      return read().certificateTemplate;
    },
    async saveCertificateTemplate(template, signal) {
      assertNotAborted(signal);
      mutations.setCertificateTemplate(template);
    },
  };
}
