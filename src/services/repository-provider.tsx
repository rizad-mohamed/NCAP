import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { NcapRepository } from "@/services";
import {
  createLocalDemoRepository,
  type LocalDemoMutations,
  type LocalDemoSnapshot,
} from "@/services/local-demo-repository";
import { useNcap } from "@/state/ncap-store";
import { useAuth } from "@/auth/AuthProvider";
import { useRouterState } from "@tanstack/react-router";
import { withAwarenessRepository } from "./awareness-repository";
import { withLearningRepository } from "./learning-repository";
import { useI18n } from "@/lib/i18n";

const RepositoryContext = createContext<NcapRepository | null>(null);

export function NcapRepositoryProvider({ children }: { children: ReactNode }) {
  const store = useNcap();
  const { user } = useAuth();
  const { language } = useI18n();
  const admin = useRouterState({ select: (state) => state.location.pathname.startsWith("/admin") });
  const awareness = useMemo(
    () => withAwarenessRepository({} as NcapRepository, admin, user?.id, language),
    [admin, user?.id, language],
  );
  const learning = useMemo(
    () => withLearningRepository({} as NcapRepository, admin, user?.id, language),
    [admin, user?.id, language],
  );
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
    };
    return { ...createLocalDemoRepository(() => snapshot, mutations), ...awareness, ...learning };
  }, [store, awareness, learning]);

  return <RepositoryContext.Provider value={repository}>{children}</RepositoryContext.Provider>;
}

export function useRepository() {
  const repository = useContext(RepositoryContext);
  if (!repository) throw new Error("useRepository must be used inside NcapRepositoryProvider");
  return repository;
}
