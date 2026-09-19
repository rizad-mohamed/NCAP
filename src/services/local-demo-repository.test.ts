import { beforeEach, describe, expect, it } from "vitest";
import { announcements, demoUsers } from "@/data/admin";
import {
  articles,
  bestPractices,
  infographics,
  news,
  posters,
  tips,
  videos,
} from "@/data/awareness";
import { lessons, modules } from "@/data/learning";
import { questions } from "@/data/quizzes";
import {
  createLocalDemoRepository,
  type LocalDemoMutations,
  type LocalDemoSnapshot,
} from "./local-demo-repository";
import type { ContentStatus } from "@/data/types";
import type { RepositoryCollection } from "@/services";

describe("local demo repository", () => {
  let snapshot: LocalDemoSnapshot;
  let mutations: LocalDemoMutations;

  beforeEach(() => {
    snapshot = {
      lessons: [...lessons],
      modules: [...modules],
      articles: [...articles],
      cyberTips: [...tips],
      newsUpdates: [...news],
      bestPractices: [...bestPractices],
      posters: [...posters],
      infographics: [...infographics],
      videos: [...videos],
      questions: [...questions],
      topics: [],
      announcements: [...announcements],
      users: [...demoUsers],
      attempts: [],
      quizDrafts: {},
      certificateTemplate: {
        title: "Certificate",
        subtitle: "Demo",
        issuer: "NCAP",
        body: "Completed",
        signatoryName: "Director",
        signatoryTitle: "Programme Director",
        theme: "navy",
      },
      certificateRecords: [],
    };
    mutations = {
      setLessons: (records) => {
        snapshot.lessons = records;
      },
      setModules: (records) => {
        snapshot.modules = records;
      },
      setArticles: (records) => {
        snapshot.articles = records;
      },
      setCyberTips: (records) => {
        snapshot.cyberTips = records;
      },
      setNewsUpdates: (records) => {
        snapshot.newsUpdates = records;
      },
      setBestPractices: (records) => {
        snapshot.bestPractices = records;
      },
      setPosters: (records) => {
        snapshot.posters = records;
      },
      setInfographics: (records) => {
        snapshot.infographics = records;
      },
      setVideos: (records) => {
        snapshot.videos = records;
      },
      setQuestions: (records) => {
        snapshot.questions = records;
      },
      setTopics: (records) => {
        snapshot.topics = records;
      },
      setAnnouncements: (records) => {
        snapshot.announcements = records;
      },
      setUsers: (records) => {
        snapshot.users = records;
      },
      saveQuizDraft: (draft) => {
        snapshot.quizDrafts = { ...snapshot.quizDrafts, [draft.quizId]: draft };
      },
      clearQuizDraft: (quizId) => {
        const next = { ...snapshot.quizDrafts };
        delete next[quizId];
        snapshot.quizDrafts = next;
      },
      setCertificateTemplate: (template) => {
        snapshot.certificateTemplate = template;
      },
      setCertificateRecords: (records) => {
        snapshot.certificateRecords = records;
      },
    };
  });

  it("reads authoritative records and persists an upsert through injected mutations", async () => {
    const repository = createLocalDemoRepository(() => snapshot, mutations);
    const first = snapshot.articles[0]!;
    expect(await repository.articles.get(first.id)).toEqual(first);

    await repository.articles.save({ ...first, title: "Updated title" });
    expect(snapshot.articles.find((record) => record.id === first.id)?.title).toBe("Updated title");
  });

  it("supports drafts and certificate settings through the same boundary", async () => {
    const repository = createLocalDemoRepository(() => snapshot, mutations);
    const draft = {
      quizId: "quiz-1",
      moduleId: "module-1",
      questionIds: ["question-1"],
      answers: {},
      currentIndex: 0,
      submittedQuestionIds: [],
      startedAt: 1,
      deadlineAt: 2,
    };
    await repository.saveQuizDraft(draft);
    expect(await repository.readQuizDraft("quiz-1")).toEqual(draft);

    await repository.saveCertificateTemplate({
      ...snapshot.certificateTemplate,
      title: "Updated certificate",
    });
    expect((await repository.readCertificateTemplate()).title).toBe("Updated certificate");
  });

  it("normalizes cancellation and keeps static catalogue collections read-only", async () => {
    const repository = createLocalDemoRepository(() => snapshot, mutations);
    const controller = new AbortController();
    controller.abort();
    await expect(repository.articles.list(controller.signal)).rejects.toMatchObject({
      code: "cancelled",
    });
    await expect(repository.attempts.remove("attempt-1")).rejects.toMatchObject({
      code: "validation",
    });
  });

  it("persists module publication, edits, ordering, and deletion", async () => {
    const repository = createLocalDemoRepository(() => snapshot, mutations);
    const module = {
      ...snapshot.modules[0]!,
      id: "module-lifecycle",
      title: "Lifecycle module",
      status: "Draft" as const,
      order: 99,
    };
    await repository.modules.save(module);
    await repository.modules.save({
      ...module,
      title: "Published lifecycle module",
      status: "Published",
    });
    expect(await repository.modules.get(module.id)).toMatchObject({
      title: "Published lifecycle module",
      status: "Published",
      order: 99,
    });
    await repository.modules.save({ ...module, status: "Draft" });
    expect((await repository.modules.get(module.id))?.status).toBe("Draft");
    await repository.modules.remove(module.id);
    expect(await repository.modules.get(module.id)).toBeNull();
  });

  it("supports the complete CRUD and publication lifecycle for every awareness collection", async () => {
    const repository = createLocalDemoRepository(() => snapshot, mutations);
    const collections = [
      repository.articles,
      repository.cyberTips,
      repository.newsUpdates,
      repository.bestPractices,
      repository.posters,
      repository.infographics,
      repository.videos,
    ] as unknown as RepositoryCollection<{ id: string; title: string; status?: ContentStatus }>[];

    for (const [index, collection] of collections.entries()) {
      const id = `awareness-lifecycle-${index}`;
      const draft = { id, title: "Lifecycle draft", status: "Draft" as const };
      await collection.save(draft);
      expect((await collection.get(id))?.status).toBe("Draft");

      await collection.save({ ...draft, title: "Published version", status: "Published" });
      expect((await collection.list()).find((record) => record.id === id)).toMatchObject({
        title: "Published version",
        status: "Published",
      });

      await collection.save({ ...draft, title: "Edited version", status: "Draft" });
      expect((await collection.get(id))?.title).toBe("Edited version");
      await collection.save({ ...draft, title: "Republished version", status: "Published" });
      expect((await collection.get(id))?.status).toBe("Published");

      await collection.remove(id);
      expect(await collection.get(id)).toBeNull();
    }
  });
});
