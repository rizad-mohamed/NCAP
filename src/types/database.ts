import type { AppRole } from "@/auth/types";
import type { AwarenessTable, ResourceRow, AssetRow } from "@/server/awareness/types";
import type { LearningTables } from "@/server/learning/types";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: LearningTables & {
      learning_media_assets: AwarenessTable<Omit<AssetRow, "resource_id">>;
      awareness_resources: AwarenessTable<ResourceRow>;
      awareness_media_assets: AwarenessTable<AssetRow>;
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          role: AppRole;
          language: "en" | "si" | "ta";
          phone: string;
          notifications: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name: string;
          role?: AppRole;
          language?: "en" | "si" | "ta";
          phone?: string;
          notifications?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          display_name?: string;
          language?: "en" | "si" | "ta";
          phone?: string;
          notifications?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      learning_list: { Args: { filters: Json }; Returns: Json };
      save_learning_record: { Args: { kind: string; payload: Json }; Returns: Json };
      delete_learning_record: {
        Args: { kind: string; target: string; expected_version: number };
        Returns: undefined;
      };
      reorder_learning_records: { Args: { kind: string; records: Json }; Returns: undefined };
      learning_state: { Args: Record<never, never>; Returns: Json };
      learning_statistics: { Args: Record<never, never>; Returns: Json };
      mutate_learning_state: { Args: { payload: Json }; Returns: Json };
      retire_learning_media: { Args: { target?: string }; Returns: undefined };
      awareness_summary: { Args: Record<never, never>; Returns: Json };
      save_awareness_resource: {
        Args: { payload: Json; expected_version?: number };
        Returns: ResourceRow;
      };
      delete_awareness_resource: {
        Args: { resource: string; expected_version: number };
        Returns: undefined;
      };
      quiz_catalogue: { Args: { admin?: boolean }; Returns: Json };
      quiz_admin_questions: { Args: { target: string | null }; Returns: Json };
      quiz_save_definition: { Args: { payload: Json }; Returns: Json };
      quiz_delete_definition: { Args: { target: string; expected_version: number }; Returns: undefined };
      quiz_save_question: { Args: { payload: Json }; Returns: Json };
      quiz_delete_question: { Args: { target: string; expected_version: number }; Returns: undefined };
      quiz_start: { Args: { target: string }; Returns: Json };
      quiz_attempt: { Args: { target: string }; Returns: Json };
      quiz_answer: { Args: { target: string; question: string; option_id: string }; Returns: Json };
      quiz_submit: { Args: { target: string }; Returns: Json };
      quiz_history: { Args: { target: string | null }; Returns: Json };
      quiz_eligibility: { Args: { target: string }; Returns: Json };
      quiz_admin_summary: { Args: Record<never, never>; Returns: Json };
      dashboard_begin_lesson: { Args: { target: string }; Returns: string };
      dashboard_heartbeat: { Args: { target: string }; Returns: number };
      dashboard_learner: { Args: { activity_offset?: number }; Returns: Json };
      dashboard_admin: { Args: Record<never, never>; Returns: Json };
      dashboard_report: { Args: { days?: number; module_filter?: string | null; quiz_filter?: string | null; attempt_offset?: number; attempt_limit?: number }; Returns: Json };
      dashboard_users: { Args: { page_offset?: number; page_limit?: number; search_text?: string }; Returns: Json };
      dashboard_announcements_admin: { Args: Record<never, never>; Returns: Json };
      dashboard_save_announcement: { Args: { payload: Json }; Returns: undefined };
      dashboard_delete_announcement: { Args: { target: string }; Returns: undefined };
    };
    Enums: {
      app_role: AppRole;
    };
    CompositeTypes: Record<never, never>;
  };
}
