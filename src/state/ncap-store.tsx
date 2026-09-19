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
import { lessons as seedLessons, modules as seedModules } from "@/data/learning";
import {
  articles as seedArticles,
  bestPractices as seedBestPractices,
  infographics as seedInfographics,
  news as seedNewsUpdates,
  posters as seedPosters,
  tips as seedCyberTips,
  videos as seedVideos,
} from "@/data/awareness";
import { questions as seedQuestions } from "@/data/quizzes";
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
  CertificateRecord,
  CertificateTemplate,
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
  Topic,
  TopicRecord,
  VideoResource,
} from "@/data/types";
import { persistedStateEnvelopeSchema, recoverPersistedSections } from "@/domain/validation";
import { topicSlug } from "@/domain/rules";
import { evaluateCertificateEligibility } from "@/domain/rules";
import type { AuthUser } from "@/auth/types";

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
  issuedCertificates: { moduleId: string; issuedAt: string; reference: string }[];
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
  certificateTemplate: CertificateTemplate;
  certificateRecords: CertificateRecord[];
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

const topicNames: Topic[] = [
  "Password Security",
  "MFA",
  "Phishing",
  "Social Engineering",
  "Device Security",
  "Mobile Security",
  "Safe Browsing",
  "Privacy",
  "Social Media",
  "Online Banking",
  "Backups",
];

const seedTopics: TopicRecord[] = topicNames.map((name, index) => ({
  id: `topic-${String(index + 1).padStart(2, "0")}`,
  name,
  slug: topicSlug(name),
  status: "Active",
  createdAt: "2026-01-01",
  updatedAt: "2026-08-31",
}));

const seedCertificateTemplate: CertificateTemplate = {
  title: "Certificate of Completion",
  subtitle: "National Cybersecurity Awareness Platform · Foundation Release",
  issuer: "NCAP Sri Lanka",
  body: "This recognises the successful completion of the learning module and its assessment.",
  signatoryName: "Programme Director",
  signatoryTitle: "National Cybersecurity Awareness Platform",
  theme: "navy",
};

const seedDemoProgress = {
  completedLessons: [
    "l-what-is-risk",
    "l-four-habits",
    "l-verify-before-act",
    "l-passphrases",
    "l-password-manager",
    "l-reuse",
    "l-spot-phishing",
  ],
  bookmarks: ["l-mfa", "l-otp-scams", "l-backups"],
  attempts: [
    {
      id: "at-seed-1",
      quizId: "q-fundamentals",
      moduleId: "m-fundamentals",
      scorePercent: 90,
      correct: 9,
      total: 10,
      seconds: 372,
      completedAt: "2026-08-22 19:41",
      byTopic: [
        { topic: "Safe Browsing", correct: 4, total: 4 },
        { topic: "Social Engineering", correct: 2, total: 2 },
        { topic: "Password Security", correct: 1, total: 2 },
        { topic: "Privacy", correct: 2, total: 2 },
      ],
    },
    {
      id: "at-seed-2",
      quizId: "q-passwords",
      moduleId: "m-passwords",
      scorePercent: 70,
      correct: 7,
      total: 10,
      seconds: 425,
      completedAt: "2026-08-26 08:12",
      byTopic: [
        { topic: "Password Security", correct: 4, total: 5 },
        { topic: "MFA", correct: 3, total: 5 },
      ],
    },
  ] as QuizAttempt[],
  activities: [
    {
      id: "ac-1",
      kind: "quiz",
      label: "Completed the Passwords & MFA quiz — 70%",
      at: "2026-08-26 08:12",
    },
    {
      id: "ac-2",
      kind: "bookmark",
      label: "Bookmarked “Choosing the right second factor”",
      at: "2026-08-25 21:04",
    },
    {
      id: "ac-3",
      kind: "lesson",
      label: "Completed “Spotting a phishing message”",
      at: "2026-08-24 18:30",
    },
    {
      id: "ac-4",
      kind: "badge",
      label: "Earned the Phishing Spotter badge",
      at: "2026-08-22 19:45",
    },
    {
      id: "ac-5",
      kind: "quiz",
      label: "Completed the Digital Safety Fundamentals quiz — 90%",
      at: "2026-08-22 19:41",
    },
  ] as ActivityItem[],
};

const emptyState = (): StoreState => ({
  session: GUEST,
  completedLessons: [],
  bookmarks: [],
  attempts: [],
  activities: [],
  issuedCertificates: [],
  lessons: seedLessons,
  modules: seedModules.map((module, order) => ({ ...module, order: order + 1 })),
  articles: seedArticles,
  cyberTips: seedCyberTips.map((item, order) => ({ ...item, status: "Published", order })),
  newsUpdates: seedNewsUpdates.map((item, order) => ({ ...item, status: "Published", order })),
  bestPractices: seedBestPractices.map((item, order) => ({ ...item, status: "Published", order })),
  posters: seedPosters,
  questions: seedQuestions,
  infographics: seedInfographics.map((item) => ({ ...item, status: item.status ?? "Published" })),
  videos: seedVideos.map((item, order) => ({ ...item, status: "Published", order })),
  topics: seedTopics,
  announcements: seedAnnouncements,
  users: seedUsers.map((user, index) => ({
    ...user,
    roles: index === 0 ? ["learner", "admin"] : ["learner"],
    phone: "",
  })),
  quizDrafts: {},
  certificateTemplate: seedCertificateTemplate,
  certificateRecords: [],
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
  ready: boolean;
  updateProfile: (patch: Partial<Session>) => void;
  toggleBookmark: (lessonId: string) => boolean;
  completeLesson: (lessonId: string) => void;
  recordAttempt: (attempt: Omit<QuizAttempt, "id" | "completedAt">) => QuizAttempt;
  issueCertificate: (moduleId: string) => void;
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
  setCertificateTemplate: (next: CertificateTemplate) => void;
  setCertificateRecords: (next: CertificateRecord[]) => void;
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
  if (session.role !== "learner") return { ...state, session };
  return {
    ...state,
    session,
    completedLessons:
      state.completedLessons.length === 0
        ? seedDemoProgress.completedLessons
        : state.completedLessons,
    bookmarks: state.bookmarks.length === 0 ? seedDemoProgress.bookmarks : state.bookmarks,
    attempts: state.attempts.length === 0 ? seedDemoProgress.attempts : state.attempts,
    activities: state.activities.length === 0 ? seedDemoProgress.activities : state.activities,
  };
}

export function NcapProvider({
  children,
  authUser,
}: {
  children: ReactNode;
  authUser: AuthUser | null;
}) {
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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, state: persistedState }));
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

  const toggleBookmark = useCallback((lessonId: string) => {
    let added = false;
    setState((s) => {
      const has = s.bookmarks.includes(lessonId);
      added = !has;
      const lesson = s.lessons.find((l) => l.id === lessonId);
      const activities = has
        ? s.activities
        : [
            {
              id: uid("ac"),
              kind: "bookmark" as const,
              label: `Bookmarked “${lesson?.title ?? lessonId}”`,
              at: now(),
            },
            ...s.activities,
          ].slice(0, 30);
      return {
        ...s,
        bookmarks: has ? s.bookmarks.filter((b) => b !== lessonId) : [...s.bookmarks, lessonId],
        activities,
      };
    });
    return added;
  }, []);

  const completeLesson = useCallback((lessonId: string) => {
    setState((s) => {
      if (s.completedLessons.includes(lessonId)) return s;
      const lesson = s.lessons.find((l) => l.id === lessonId);
      return {
        ...s,
        completedLessons: [...s.completedLessons, lessonId],
        activities: [
          {
            id: uid("ac"),
            kind: "lesson" as const,
            label: `Completed “${lesson?.title ?? lessonId}”`,
            at: now(),
          },
          ...s.activities,
        ].slice(0, 30),
      };
    });
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

  const issueCertificate = useCallback((moduleId: string) => {
    setState((s) => {
      if (s.issuedCertificates.some((c) => c.moduleId === moduleId)) return s;
      const reference = `NCAP-DEMO-${moduleId.replace("m-", "").slice(0, 4).toUpperCase()}-${Math.floor(
        1000 + Math.random() * 8999,
      )}`;
      return {
        ...s,
        issuedCertificates: [
          ...s.issuedCertificates,
          { moduleId, issuedAt: now().slice(0, 10), reference },
        ],
        activities: [
          {
            id: uid("ac"),
            kind: "certificate" as const,
            label: `Certificate issued for ${s.modules.find((m) => m.id === moduleId)?.title ?? moduleId}`,
            at: now(),
          },
          ...s.activities,
        ].slice(0, 30),
      };
    });
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
  const setCertificateTemplate = useCallback(
    (next: CertificateTemplate) => setState((s) => ({ ...s, certificateTemplate: next })),
    [],
  );
  const setCertificateRecords = useCallback(
    (next: CertificateRecord[]) => setState((s) => ({ ...s, certificateRecords: next })),
    [],
  );

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
      toggleBookmark,
      completeLesson,
      recordAttempt,
      issueCertificate,
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
      setCertificateTemplate,
      setCertificateRecords,
      resetDemo,
    }),
    [
      state,
      ready,
      updateProfile,
      toggleBookmark,
      completeLesson,
      recordAttempt,
      issueCertificate,
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
      setCertificateTemplate,
      setCertificateRecords,
      resetDemo,
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
  const { completedLessons, attempts, lessons, modules } = useNcap();

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
    const certificateEligible = modules.filter(
      (module) =>
        evaluateCertificateEligibility({
          moduleId: module.id,
          quizId: module.quizId,
          lessons,
          completedLessonIds: completedLessons,
          attempts,
        }).eligible,
    );
    const earnedBadges = new Set<string>();
    if (completed.length >= 1) earnedBadges.add("b-first-lesson");
    if (best("q-phishing") >= 80) earnedBadges.add("b-phishing");
    if (moduleProgress.find((p) => p.module.id === "m-passwords")?.percent === 100)
      earnedBadges.add("b-mfa");
    if (new Set(completed.map((l) => l.moduleId)).size >= 3) earnedBadges.add("b-explorer");
    if (attempts.length >= 2 && completed.length >= 5) earnedBadges.add("b-streak");

    return {
      overall,
      quizAverage,
      completedCount: completed.length,
      totalLessons: publishedLessons.length,
      hours: Math.round((minutes / 60) * 10) / 10,
      moduleProgress,
      bestScore: best,
      certificateEligible,
      badges: badgeCatalogue.map((b) => ({ ...b, earned: earnedBadges.has(b.id) })),
    };
  }, [completedLessons, attempts, lessons, modules]);
}
