import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { NcapRepository } from "@/services";
import {
  createLocalDemoRepository,
  type LocalDemoMutations,
  type LocalDemoSnapshot,
} from "@/services/local-demo-repository";
import { useNcap } from "@/state/ncap-store";

const RepositoryContext = createContext<NcapRepository | null>(null);

export function NcapRepositoryProvider({ children }: { children: ReactNode }) {
  const store = useNcap();
  const repository = useMemo(() => {
    const snapshot: LocalDemoSnapshot = {
      lessons: store.lessons,
      modules: store.modules,
      articles: store.articles,
      cyberTips: store.cyberTips,
      newsUpdates: store.newsUpdates,
      bestPractices: store.bestPractices,
      posters: store.posters,
      infographics: store.infographics,
      videos: store.videos,
      questions: store.questions,
      topics: store.topics,
      announcements: store.announcements,
      users: store.users,
      attempts: store.attempts,
      quizDrafts: store.quizDrafts,
      certificateTemplate: store.certificateTemplate,
      certificateRecords: store.certificateRecords,
    };
    const mutations: LocalDemoMutations = {
      setLessons: store.setLessons,
      setModules: store.setModules,
      setArticles: store.setArticles,
      setCyberTips: store.setCyberTips,
      setNewsUpdates: store.setNewsUpdates,
      setBestPractices: store.setBestPractices,
      setPosters: store.setPosters,
      setInfographics: store.setInfographics,
      setVideos: store.setVideos,
      setQuestions: store.setQuestions,
      setTopics: store.setTopics,
      setAnnouncements: store.setAnnouncements,
      setUsers: store.setUsers,
      saveQuizDraft: store.saveQuizDraft,
      clearQuizDraft: store.clearQuizDraft,
      setCertificateTemplate: store.setCertificateTemplate,
      setCertificateRecords: store.setCertificateRecords,
    };
    return createLocalDemoRepository(() => snapshot, mutations);
  }, [store]);

  return <RepositoryContext.Provider value={repository}>{children}</RepositoryContext.Provider>;
}

export function useRepository() {
  const repository = useContext(RepositoryContext);
  if (!repository) throw new Error("useRepository must be used inside NcapRepositoryProvider");
  return repository;
}
