import type { Json } from "@/types/database";
export type LearningTable<T> = {
  Row: T;
  Insert: Partial<T>;
  Update: Partial<T>;
  Relationships: [];
};
type Timestamps = { created_at: string; updated_at: string };
export type TopicRow = Timestamps & {
  id: string;
  name: string;
  slug: string;
  status: "Active" | "Inactive";
  version: number;
};
type ContentRow = Timestamps & {
  id: string;
  topic_id: string;
  title: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  minutes: number;
  display_order: number;
  status: "Draft" | "Published";
  version: number;
};
export type ModuleRow = ContentRow & {
  description: string;
  quiz_id: string;
  image_id: string | null;
};
export type LessonRow = ContentRow & {
  module_id: string;
  summary: string;
  video_id: string | null;
  video_url: string | null;
  transcript: string;
};
export type LearningTables = {
  learning_topics: LearningTable<TopicRow>;
  learning_modules: LearningTable<ModuleRow>;
  learning_lessons: LearningTable<LessonRow>;
  learning_module_objectives: LearningTable<{ module_id: string; position: number; text: string }>;
  learning_lesson_objectives: LearningTable<{ lesson_id: string; position: number; text: string }>;
  learning_lesson_blocks: LearningTable<{ lesson_id: string; position: number; content: Json }>;
  learning_completions: LearningTable<{ user_id: string; lesson_id: string; completed_at: string }>;
  learning_bookmarks: LearningTable<{ user_id: string; lesson_id: string; created_at: string }>;
  learning_video_resume: LearningTable<{
    user_id: string;
    lesson_id: string;
    source: string;
    seconds: number;
    updated_at: string;
  }>;
  learning_activity: LearningTable<{
    id: string;
    user_id: string;
    lesson_id: string | null;
    kind: "lesson" | "bookmark" | "opened";
    label: string;
    created_at: string;
  }>;
  learning_audit: LearningTable<{
    id: number;
    actor_id: string | null;
    kind: string;
    record_id: string;
    action: string;
    before_data: Json;
    after_data: Json;
    created_at: string;
  }>;
};
