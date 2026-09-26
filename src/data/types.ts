export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

/** Human-readable demo taxonomy label. Production APIs will use TopicRecord.id as the stable key. */
export type Topic = string;

export type ContentStatus = "Published" | "Draft";

export type UserRole = "learner" | "admin";
export type TopicStatus = "Active" | "Inactive";

export interface TopicRecord {
  id: string;
  name: Topic;
  slug: string;
  status: TopicStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MediaAsset {
  id: string;
  fileName: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
  width: number;
  height: number;
  altText: string;
  storageKey: string;
  status: "local-demo" | "ready";
}

export interface VideoAsset {
  id: string;
  fileName: string;
  mimeType: "video/mp4" | "video/webm";
  sizeBytes: number;
  width: number;
  height: number;
  durationSeconds: number;
  storageKey: string;
  status: "local-demo" | "ready";
}

export type LessonVideo =
  | {
      kind: "external";
      url: string;
      transcript: string;
    }
  | {
      kind: "upload";
      asset: VideoAsset;
      transcript: string;
    };

export type LessonBlock =
  | {
      kind: "paragraph";
      text: string;
      format?:
        | {
            bold?: boolean | undefined;
            italic?: boolean | undefined;
            underline?: boolean | undefined;
            align?: "left" | "center" | "right" | undefined;
          }
        | undefined;
    }
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
  video?: LessonVideo;
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
  order?: number;
  image?: MediaAsset | undefined;
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

export interface AwarenessMetadata {
  version?: number;
  language?: "en" | "si" | "ta";
  featured?: boolean;
}

export interface Article extends AwarenessMetadata {
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
  image?: MediaAsset | undefined;
  imageUrl?: string | undefined;
  tags?: string[];
  order?: number;
}

export interface CyberTip extends AwarenessMetadata {
  id: string;
  slug?: string;
  title: string;
  topic: Topic;
  text: string;
  status?: ContentStatus;
  author?: string;
  publishedAt?: string;
  tags?: string[];
  order?: number;
}

export interface NewsUpdate extends AwarenessMetadata {
  id: string;
  slug?: string;
  title: string;
  date: string;
  summary: string;
  tag: string;
  body?: string[];
  status?: ContentStatus;
  author?: string;
  tags?: string[];
  order?: number;
}

export interface BestPractice extends AwarenessMetadata {
  id: string;
  slug?: string;
  title: string;
  topic: Topic;
  steps: string[];
  summary?: string;
  status?: ContentStatus;
  author?: string;
  publishedAt?: string;
  tags?: string[];
  order?: number;
}

export interface Poster extends AwarenessMetadata {
  id: string;
  slug?: string;
  title: string;
  topic: Topic;
  description: string;
  format: "SVG" | "PNG" | "JPEG" | "WEBP";
  file: string;
  status: ContentStatus;
  image?: MediaAsset | undefined;
  author?: string;
  publishedAt?: string;
  tags?: string[];
  order?: number;
}

export interface Infographic extends AwarenessMetadata {
  id: string;
  slug?: string;
  title: string;
  category: Topic;
  alt: string;
  points: string[];
  file: string;
  status?: ContentStatus;
  image?: MediaAsset | undefined;
  author?: string;
  publishedAt?: string;
  tags?: string[];
  order?: number;
}

export interface VideoResource extends AwarenessMetadata {
  video?: VideoAsset | undefined;
  id: string;
  slug?: string;
  title: string;
  category: Topic;
  durationLabel: string;
  description: string;
  chapters: { label: string; at: string }[];
  transcript: string[];
  sourceUrl?: string;
  posterUrl?: string;
  poster?: MediaAsset | undefined;
  status?: ContentStatus;
  author?: string;
  publishedAt?: string;
  tags?: string[];
  order?: number;
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
  roles?: UserRole[];
  phone?: string;
  avatar?: MediaAsset | undefined;
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

export interface QuizDraftAttempt {
  quizId: string;
  moduleId: string;
  questionIds: string[];
  answers: Record<string, number>;
  currentIndex: number;
  submittedQuestionIds: string[];
  startedAt: number;
  deadlineAt: number;
}

export interface CertificatePolicy {
  completionPercent: 100;
  minimumBestQuizScore: number;
}

export interface CertificateTemplate {
  title: string;
  subtitle: string;
  issuer: string;
  body: string;
  signatoryName: string;
  signatoryTitle: string;
  theme: "navy" | "blue" | "teal";
  logo?: MediaAsset | undefined;
}

export interface CertificateRecord {
  id: string;
  userId: string;
  moduleId: string;
  status: "Issued" | "Revoked";
  issuedAt: string;
  revokedAt?: string;
  reference: string;
}
