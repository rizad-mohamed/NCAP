import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { NCAP_CONFIG } from "@/lib/config";
import { lessons as seedLessons, lessonsForModule, modules } from "@/data/learning";
import { articles as seedArticles, posters as seedPosters } from "@/data/awareness";
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
  DemoUser,
  Lesson,
  Poster,
  QuizAttempt,
  QuizQuestion,
} from "@/data/types";

export type Role = "guest" | "learner" | "admin";

export interface Session {
  role: Role;
  name: string;
  email: string;
  joinedAt: string;
  interests: string[];
  notifications: boolean;
}

interface StoreState {
  session: Session;
  completedLessons: string[];
  bookmarks: string[];
  attempts: QuizAttempt[];
  activities: ActivityItem[];
  issuedCertificates: { moduleId: string; issuedAt: string; reference: string }[];
  lessons: Lesson[];
  articles: Article[];
  posters: Poster[];
  questions: QuizQuestion[];
  announcements: Announcement[];
  users: DemoUser[];
}

const GUEST: Session = {
  role: "guest",
  name: "",
  email: "",
  joinedAt: "",
  interests: [],
  notifications: true,
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
    { id: "ac-1", kind: "quiz", label: "Completed the Passwords & MFA quiz — 70%", at: "2026-08-26 08:12" },
    { id: "ac-2", kind: "bookmark", label: "Bookmarked “Choosing the right second factor”", at: "2026-08-25 21:04" },
    { id: "ac-3", kind: "lesson", label: "Completed “Spotting a phishing message”", at: "2026-08-24 18:30" },
    { id: "ac-4", kind: "badge", label: "Earned the Phishing Spotter badge", at: "2026-08-22 19:45" },
    { id: "ac-5", kind: "quiz", label: "Completed the Digital Safety Fundamentals quiz — 90%", at: "2026-08-22 19:41" },
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
  articles: seedArticles,
  posters: seedPosters,
  questions: seedQuestions,
  announcements: seedAnnouncements,
  users: seedUsers,
});

const STORAGE_KEY = "ncap.state.v1";

const now = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

interface StoreValue extends StoreState {
  ready: boolean;
  signIn: (role: Exclude<Role, "guest">, name?: string, email?: string) => void;
  signOut: () => void;
  updateProfile: (patch: Partial<Session>) => void;
  toggleBookmark: (lessonId: string) => boolean;
  completeLesson: (lessonId: string) => void;
  recordAttempt: (attempt: Omit<QuizAttempt, "id" | "completedAt">) => QuizAttempt;
  issueCertificate: (moduleId: string) => void;
  logActivity: (kind: ActivityItem["kind"], label: string) => void;
  setLessons: (next: Lesson[]) => void;
  setArticles: (next: Article[]) => void;
  setPosters: (next: Poster[]) => void;
  setQuestions: (next: QuizQuestion[]) => void;
  setAnnouncements: (next: Announcement[]) => void;
  setUsers: (next: DemoUser[]) => void;
  resetDemo: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function NcapProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(emptyState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...emptyState(), ...(JSON.parse(raw) as StoreState) });
    } catch {
      /* ignore corrupt demo state */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const { lessons, articles, posters, questions, announcements, users, ...rest } = state;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...rest, lessons, articles, posters, questions, announcements, users }),
    );
  }, [state, ready]);

  const logActivity = useCallback((kind: ActivityItem["kind"], label: string) => {
    setState((s) => ({
      ...s,
      activities: [{ id: uid("ac"), kind, label, at: now() }, ...s.activities].slice(0, 30),
    }));
  }, []);

  const signIn = useCallback<StoreValue["signIn"]>((role, name, email) => {
    setState((s) => ({
      ...s,
      session: {
        role,
        name: name || (role === "admin" ? "Demo Administrator" : "Demo Learner"),
        email: email || (role === "admin" ? "admin@ncap.demo" : "learner@ncap.demo"),
        joinedAt: s.session.joinedAt || "2026-03-02",
        interests: s.session.interests.length ? s.session.interests : ["Phishing", "Password Security"],
        notifications: s.session.notifications,
      },
      completedLessons:
        role === "learner" && s.completedLessons.length === 0
          ? seedDemoProgress.completedLessons
          : s.completedLessons,
      bookmarks:
        role === "learner" && s.bookmarks.length === 0 ? seedDemoProgress.bookmarks : s.bookmarks,
      attempts: role === "learner" && s.attempts.length === 0 ? seedDemoProgress.attempts : s.attempts,
      activities:
        role === "learner" && s.activities.length === 0 ? seedDemoProgress.activities : s.activities,
    }));
  }, []);

  const signOut = useCallback(() => {
    setState((s) => ({ ...s, session: GUEST }));
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
            { id: uid("ac"), kind: "bookmark" as const, label: `Bookmarked “${lesson?.title ?? lessonId}”`, at: now() },
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
          { id: uid("ac"), kind: "lesson" as const, label: `Completed “${lesson?.title ?? lessonId}”`, at: now() },
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
        issuedCertificates: [...s.issuedCertificates, { moduleId, issuedAt: now().slice(0, 10), reference }],
        activities: [
          { id: uid("ac"), kind: "certificate" as const, label: `Certificate issued for ${modules.find((m) => m.id === moduleId)?.title ?? moduleId}`, at: now() },
          ...s.activities,
        ].slice(0, 30),
      };
    });
  }, []);

  const setLessons = useCallback((next: Lesson[]) => setState((s) => ({ ...s, lessons: next })), []);
  const setArticles = useCallback((next: Article[]) => setState((s) => ({ ...s, articles: next })), []);
  const setPosters = useCallback((next: Poster[]) => setState((s) => ({ ...s, posters: next })), []);
  const setQuestions = useCallback(
    (next: QuizQuestion[]) => setState((s) => ({ ...s, questions: next })),
    [],
  );
  const setAnnouncements = useCallback(
    (next: Announcement[]) => setState((s) => ({ ...s, announcements: next })),
    [],
  );
  const setUsers = useCallback((next: DemoUser[]) => setState((s) => ({ ...s, users: next })), []);

  const resetDemo = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setState(emptyState());
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      ready,
      signIn,
      signOut,
      updateProfile,
      toggleBookmark,
      completeLesson,
      recordAttempt,
      issueCertificate,
      logActivity,
      setLessons,
      setArticles,
      setPosters,
      setQuestions,
      setAnnouncements,
      setUsers,
      resetDemo,
    }),
    [
      state,
      ready,
      signIn,
      signOut,
      updateProfile,
      toggleBookmark,
      completeLesson,
      recordAttempt,
      issueCertificate,
      logActivity,
      setLessons,
      setArticles,
      setPosters,
      setQuestions,
      setAnnouncements,
      setUsers,
      resetDemo,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useNcap() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useNcap must be used inside NcapProvider");
  return ctx;
}

/** Derived learner statistics used by the dashboard, certificates and profile. */
export function useLearnerStats() {
  const { completedLessons, attempts, lessons } = useNcap();

  return useMemo(() => {
    const publishedLessons = lessons.filter((l) => l.status === "Published");
    const completed = publishedLessons.filter((l) => completedLessons.includes(l.id));
    const overall = publishedLessons.length
      ? Math.round((completed.length / publishedLessons.length) * 100)
      : 0;
    const quizAverage = attempts.length
      ? Math.round(attempts.reduce((sum, a) => sum + a.scorePercent, 0) / attempts.length)
      : 0;
    const minutes = completed.reduce((sum, l) => sum + l.minutes, 0);
    const moduleProgress = modules.map((m) => {
      const all = lessonsForModule(m.id);
      const done = all.filter((l) => completedLessons.includes(l.id));
      return {
        module: m,
        total: all.length,
        completed: done.length,
        percent: all.length ? Math.round((done.length / all.length) * 100) : 0,
      };
    });
    const best = (quizId: string) =>
      attempts.filter((a) => a.quizId === quizId).reduce((max, a) => Math.max(max, a.scorePercent), 0);
    const certificateEligible = modules.filter(
      (m) =>
        moduleProgress.find((p) => p.module.id === m.id)?.percent === 100 &&
        best(m.quizId) >= NCAP_CONFIG.certificateThresholdPercent,
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
  }, [completedLessons, attempts, lessons]);
}
