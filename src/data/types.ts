export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export type Topic =
  | "Password Security"
  | "MFA"
  | "Phishing"
  | "Social Engineering"
  | "Device Security"
  | "Mobile Security"
  | "Safe Browsing"
  | "Privacy"
  | "Social Media"
  | "Online Banking"
  | "Backups";

export type ContentStatus = "Published" | "Draft";

export type LessonBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "callout"; tone: "tip" | "warning" | "note"; title: string; text: string }
  | { kind: "example"; title: string; text: string }
  | {
      kind: "check";
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    };

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  summary: string;
  topic: Topic;
  difficulty: Difficulty;
  minutes: number;
  order: number;
  status: ContentStatus;
  updatedAt: string;
  objectives: string[];
  blocks: LessonBlock[];
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  topic: Topic;
  difficulty: Difficulty;
  minutes: number;
  status: ContentStatus;
  objectives: string[];
  quizId: string;
}

export interface QuizQuestion {
  id: string;
  moduleId: string;
  topic: Topic;
  difficulty: Difficulty;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  status: ContentStatus;
}

export interface Quiz {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  topic: Topic;
  difficulty: Difficulty;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  category: Topic | "General";
  summary: string;
  author: string;
  readingMinutes: number;
  publishedAt: string;
  status: ContentStatus;
  body: string[];
}

export interface CyberTip {
  id: string;
  title: string;
  topic: Topic;
  text: string;
}

export interface NewsUpdate {
  id: string;
  title: string;
  date: string;
  summary: string;
  tag: string;
}

export interface BestPractice {
  id: string;
  title: string;
  topic: Topic;
  steps: string[];
}

export interface Poster {
  id: string;
  title: string;
  topic: Topic;
  description: string;
  format: "SVG";
  file: string;
  status: ContentStatus;
}

export interface Infographic {
  id: string;
  title: string;
  category: Topic;
  alt: string;
  points: string[];
  file: string;
}

export interface VideoResource {
  id: string;
  title: string;
  category: Topic;
  durationLabel: string;
  description: string;
  chapters: { label: string; at: string }[];
  transcript: string[];
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: "All Learners" | "New Learners" | "Administrators";
  active: boolean;
  startsAt: string;
  endsAt: string;
}

export type UserStatus = "Active" | "Inactive" | "Suspended";
export type LanguageCode = "en" | "si" | "ta";

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  language: LanguageCode;
  progressPercent: number;
  quizAverage: number;
  lessonsCompleted: number;
  attempts: number;
  certificates: number;
  lastActivity: string;
  joinedAt: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  moduleId: string;
  scorePercent: number;
  correct: number;
  total: number;
  seconds: number;
  completedAt: string;
  byTopic: { topic: Topic; correct: number; total: number }[];
}

export interface ActivityItem {
  id: string;
  kind: "lesson" | "quiz" | "badge" | "bookmark" | "certificate" | "admin";
  label: string;
  at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
}
