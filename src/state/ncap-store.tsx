import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  announcements as seedAnnouncements,
  badges as badgeCatalogue,
  demoUsers as seedUsers,
} from "@/data/admin";
import type {
  ActivityItem,
  Announcement,
  Article,
  BestPractice,
  CyberTip,
  DemoUser,
  Infographic,
  Lesson,
  LearningModule,
  NewsUpdate,
  Poster,
  QuizAttempt,
  QuizDraftAttempt,
  QuizQuestion,
  TopicRecord,
  VideoResource,
} from "@/data/types";
import { persistedStateEnvelopeSchema, recoverPersistedSections } from "@/domain/validation";
import type { AuthUser } from "@/auth/types";
import { useLearningStore } from "@/services/learning-hooks";
import { useRouterState } from "@tanstack/react-router";

export type Role = "guest" | "learner" | "admin";

export interface Session {
  role: Role;
  name: string;
  email: string;
  joinedAt: string;
  interests: string[];
  notifications: boolean;
  phone: string;
  avatar?: import("@/data/types").MediaAsset | undefined;
}

interface StoreState {
  session: Session;
  completedLessons: string[];
  bookmarks: string[];
  attempts: QuizAttempt[];
  activities: ActivityItem[];
  lessons: Lesson[];
  modules: LearningModule[];
  articles: Article[];
  cyberTips: CyberTip[];
  newsUpdates: NewsUpdate[];
  bestPractices: BestPractice[];
  posters: Poster[];
  questions: QuizQuestion[];
  infographics: Infographic[];
  videos: VideoResource[];
  topics: TopicRecord[];
  announcements: Announcement[];
  users: DemoUser[];
  quizDrafts: Record<string, QuizDraftAttempt>;
}

const GUEST: Session = {
  role: "guest",
  name: "",
  email: "",
  joinedAt: "",
  interests: [],
  notifications: true,
  phone: "",
};

const emptyState = (): StoreState => ({
  session: GUEST,
  completedLessons: [],
  bookmarks: [],
  attempts: [],
  activities: [],
  lessons: [],
  modules: [],
  articles: [],
  cyberTips: [],
  newsUpdates: [],
  bestPractices: [],
  posters: [],
  questions: [],
  infographics: [],
  videos: [],
  topics: [],
  announcements: seedAnnouncements,
  users: seedUsers.map((user, index) => ({
    ...user,
    roles: index === 0 ? ["learner", "admin"] : ["learner"],
    phone: "",
  })),
  quizDrafts: {},
});

const STORAGE_KEY = "ncap.demo.v2";
const LEGACY_STORAGE_KEY = "ncap.state.v1";

const now = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

interface StoreValue extends StoreState {
  statistics?: import("@/domain/learning").LearningState["statistics"];
  learningPending: boolean;
  learningError: Error | null;
  learningSaving: boolean;
  resume: Record<string, { source: string; seconds: number }>;
  saveResume: (lessonId: string, source: string, seconds: number) => Promise<void>;
  ready: boolean;
  updateProfile: (patch: Partial<Session>) => void;
  toggleBookmark: (lessonId: string) => Promise<boolean>;
  completeLesson: (lessonId: string) => Promise<void>;
  recordAttempt: (attempt: Omit<QuizAttempt, "id" | "completedAt">) => QuizAttempt;
  logActivity: (kind: ActivityItem["kind"], label: string) => void;
  setLessons: (next: Lesson[]) => void;
  setModules: (next: LearningModule[]) => void;
  setArticles: (next: Article[]) => void;
  setCyberTips: (next: CyberTip[]) => void;
  setNewsUpdates: (next: NewsUpdate[]) => void;
  setBestPractices: (next: BestPractice[]) => void;
  setPosters: (next: Poster[]) => void;
  setQuestions: (next: QuizQuestion[]) => void;
  setInfographics: (next: Infographic[]) => void;
  setVideos: (next: VideoResource[]) => void;
  setTopics: (next: TopicRecord[]) => void;
  setAnnouncements: (next: Announcement[]) => void;
  setUsers: (next: DemoUser[]) => void;
  saveQuizDraft: (draft: QuizDraftAttempt) => void;
  clearQuizDraft: (quizId: string) => void;
  resetDemo: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);
interface SessionPreferencesValue {
  session: Session;
  ready: boolean;
  updateProfile: StoreValue["updateProfile"];
}
const SessionPreferencesContext = createContext<SessionPreferencesValue | null>(null);

function sessionFromAuth(user: AuthUser | null, previous: Session = GUEST): Session {
  if (!user) return GUEST;
  return {
    role: user.role === "super_admin" ? "admin" : "learner",
    name: user.displayName,
    email: user.email,
    joinedAt: user.createdAt.slice(0, 10),
    interests: previous.interests.length ? previous.interests : ["Phishing", "Password Security"],
    notifications: user.notifications,
    phone: user.phone,
    avatar: previous.avatar,
  };
}

function withAuthenticatedDemoState(state: StoreState, user: AuthUser | null): StoreState {
  const session = sessionFromAuth(user, state.session);
  if (session.role !== "learner")
    return { ...state, session, attempts: [], questions: [], quizDrafts: {} };
  return {
    ...state,
    session,
    completedLessons: [],
    bookmarks: [],
    lessons: [],
    modules: [],
    topics: [],
    attempts: [],
    questions: [],
    quizDrafts: {},
    activities: [],
  };
}

export function NcapProvider({
  children,
  authUser,
}: {
  children: ReactNode;
  authUser: AuthUser | null;
}) {
  const admin = useRouterState({ select: (s) => s.location.pathname.startsWith("/admin") });
  const learning = useLearningStore(authUser, admin);
  const [state, setState] = useState<StoreState>(() =>
    withAuthenticatedDemoState(emptyState(), authUser),
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw =
        window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        const envelope = persistedStateEnvelopeSchema.safeParse(parsed);
        const restored = envelope.success
          ? envelope.data.state
          : typeof parsed === "object" && parsed !== null
            ? parsed
            : {};
        const recovered = recoverPersistedSections(
          restored,
          emptyState() as unknown as Record<string, unknown>,
        ) as unknown as StoreState;
        setState(withAuthenticatedDemoState(recovered, authUser));
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    } catch {
      /* ignore corrupt demo state */
    }
    setReady(true);
  }, [authUser]);

  useEffect(() => {
    if (!ready) return;
    setState((current) => withAuthenticatedDemoState(current, authUser));
  }, [authUser, ready]);

  useLayoutEffect(() => {
    if (!ready) return;
    const persistedState = {
      ...state,
      session: {
        ...state.session,
        role: "guest" as const,
        name: "",
        email: "",
        joinedAt: "",
        phone: "",
      },
    };
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 2, state: persistedState }, (key, value) =>
        [
          "modules",
          "lessons",
          "topics",
          "completedLessons",
          "bookmarks",
          "activities",
          "articles",
          "cyberTips",
          "newsUpdates",
          "bestPractices",
          "posters",
          "infographics",
          "videos",
          "attempts",
          "questions",
          "quizDrafts",
        ].includes(key)
          ? undefined
          : value,
      ),
    );
  }, [state, ready]);

  const logActivity = useCallback((kind: ActivityItem["kind"], label: string) => {
    setState((s) => ({
      ...s,
      activities: [{ id: uid("ac"), kind, label, at: now() }, ...s.activities].slice(0, 30),
    }));
  }, []);

  const updateProfile = useCallback((patch: Partial<Session>) => {
    setState((s) => ({ ...s, session: { ...s.session, ...patch } }));
  }, []);

  const recordAttempt = useCallback<StoreValue["recordAttempt"]>((attempt) => {
    const full: QuizAttempt = { ...attempt, id: uid("at"), completedAt: now() };
    setState((s) => ({
      ...s,
      attempts: [full, ...s.attempts],
      activities: [
        {
          id: uid("ac"),
          kind: "quiz" as const,
          label: `Completed a quiz attempt — ${full.scorePercent}%`,
          at: full.completedAt,
        },
        ...s.activities,
      ].slice(0, 30),
    }));
    return full;
  }, []);

  const setLessons = useCallback(
    (next: Lesson[]) => setState((s) => ({ ...s, lessons: next })),
    [],
  );
  const setModules = useCallback(
    (next: LearningModule[]) => setState((s) => ({ ...s, modules: next })),
    [],
  );
  const setArticles = useCallback(
    (next: Article[]) => setState((s) => ({ ...s, articles: next })),
    [],
  );
  const setCyberTips = useCallback(
    (next: CyberTip[]) => setState((s) => ({ ...s, cyberTips: next })),
    [],
  );
  const setNewsUpdates = useCallback(
    (next: NewsUpdate[]) => setState((s) => ({ ...s, newsUpdates: next })),
    [],
  );
  const setBestPractices = useCallback(
    (next: BestPractice[]) => setState((s) => ({ ...s, bestPractices: next })),
    [],
  );
  const setPosters = useCallback(
    (next: Poster[]) => setState((s) => ({ ...s, posters: next })),
    [],
  );
  const setQuestions = useCallback(
    (next: QuizQuestion[]) => setState((s) => ({ ...s, questions: next })),
    [],
  );
  const setInfographics = useCallback(
    (next: Infographic[]) => setState((s) => ({ ...s, infographics: next })),
    [],
  );
  const setVideos = useCallback(
    (next: VideoResource[]) => setState((s) => ({ ...s, videos: next })),
    [],
  );
  const setTopics = useCallback(
    (next: TopicRecord[]) => setState((s) => ({ ...s, topics: next })),
    [],
  );
  const setAnnouncements = useCallback(
    (next: Announcement[]) => setState((s) => ({ ...s, announcements: next })),
    [],
  );
  const setUsers = useCallback((next: DemoUser[]) => setState((s) => ({ ...s, users: next })), []);
  const saveQuizDraft = useCallback((draft: QuizDraftAttempt) => {
    setState((s) => ({ ...s, quizDrafts: { ...s.quizDrafts, [draft.quizId]: draft } }));
  }, []);
  const clearQuizDraft = useCallback((quizId: string) => {
    setState((s) => {
      const quizDrafts = { ...s.quizDrafts };
      delete quizDrafts[quizId];
      return { ...s, quizDrafts };
    });
  }, []);

  const resetDemo = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    setState(withAuthenticatedDemoState(emptyState(), authUser));
  }, [authUser]);

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      ready,
      updateProfile,
      recordAttempt,
      logActivity,
      setLessons,
      setModules,
      setArticles,
      setCyberTips,
      setNewsUpdates,
      setBestPractices,
      setPosters,
      setQuestions,
      setInfographics,
      setVideos,
      setTopics,
      setAnnouncements,
      setUsers,
      saveQuizDraft,
      clearQuizDraft,
      resetDemo,
      ...learning,
    }),
    [
      state,
      ready,
      updateProfile,
      recordAttempt,
      logActivity,
      setLessons,
      setModules,
      setArticles,
      setCyberTips,
      setNewsUpdates,
      setBestPractices,
      setPosters,
      setQuestions,
      setInfographics,
      setVideos,
      setTopics,
      setAnnouncements,
      setUsers,
      saveQuizDraft,
      clearQuizDraft,
      resetDemo,
      learning,
    ],
  );

  const sessionPreferences = useMemo<SessionPreferencesValue>(
    () => ({ session: state.session, ready, updateProfile }),
    [state.session, ready, updateProfile],
  );

  return (
    <SessionPreferencesContext.Provider value={sessionPreferences}>
      <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
    </SessionPreferencesContext.Provider>
  );
}

export function useSessionPreferences() {
  const ctx = useContext(SessionPreferencesContext);
  if (!ctx) throw new Error("useSessionPreferences must be used inside NcapProvider");
  return ctx;
}

/** @deprecated Prefer focused session or repository hooks for new components. */
export function useNcap() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useNcap must be used inside NcapProvider");
  return ctx;
}

/** Derived learner statistics used by the dashboard, certificates and profile. */
export function useLearnerStats() {
  const { completedLessons, attempts, lessons, modules, statistics } = useNcap();

  return useMemo(() => {
    const publishedLessons = lessons.filter(
      (lesson) =>
        lesson.status === "Published" &&
        modules.some((module) => module.id === lesson.moduleId && module.status === "Published"),
    );
    const completed = publishedLessons.filter((l) => completedLessons.includes(l.id));
    const overall = publishedLessons.length
      ? Math.round((completed.length / publishedLessons.length) * 100)
      : 0;
    const quizAverage = attempts.length
      ? Math.round(attempts.reduce((sum, a) => sum + a.scorePercent, 0) / attempts.length)
      : 0;
    const minutes = completed.reduce((sum, l) => sum + l.minutes, 0);
    const moduleProgress = modules
      .filter((module) => module.status === "Published")
      .map((m) => {
        const all = lessons.filter(
          (lesson) => lesson.moduleId === m.id && lesson.status === "Published",
        );
        const done = all.filter((l) => completedLessons.includes(l.id));
        return {
          module: m,
          total: all.length,
          completed: done.length,
          percent: all.length ? Math.round((done.length / all.length) * 100) : 0,
        };
      });
    const best = (quizId: string) =>
      attempts
        .filter((a) => a.quizId === quizId)
        .reduce((max, a) => Math.max(max, a.scorePercent), 0);
    const earnedBadges = new Set<string>();
    if (completed.length >= 1) earnedBadges.add("b-first-lesson");
    if (best("q-phishing") >= 80) earnedBadges.add("b-phishing");
    if (moduleProgress.find((p) => p.module.id === "m-passwords")?.percent === 100)
      earnedBadges.add("b-mfa");
    if (new Set(completed.map((l) => l.moduleId)).size >= 3) earnedBadges.add("b-explorer");
    if (attempts.length >= 2 && completed.length >= 5) earnedBadges.add("b-streak");

    return {
      overall: statistics?.overall ?? overall,
      quizAverage,
      completedCount: statistics?.completedCount ?? completed.length,
      totalLessons: statistics?.totalLessons ?? publishedLessons.length,
      hours: Math.round(((statistics?.minutes ?? minutes) / 60) * 10) / 10,
      moduleProgress,
      bestScore: best,
      badges: badgeCatalogue.map((b) => ({ ...b, earned: earnedBadges.has(b.id) })),
    };
  }, [completedLessons, attempts, lessons, modules, statistics]);
}
