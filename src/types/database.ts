import type { AppRole } from "@/auth/types";
import type { AwarenessTable, ResourceRow, AssetRow } from "@/server/awareness/types";
import type { LearningTables } from "@/server/learning/types";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: LearningTables & {
      // Read-only relationship projection used by Learning's assessment validation.
      quiz_definitions: {
        Row: { id: string; module_id: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      learning_media_assets: AwarenessTable<Omit<AssetRow, "resource_id">>;
      awareness_resources: AwarenessTable<ResourceRow>;
      awareness_media_assets: AwarenessTable<AssetRow>;
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          role: AppRole;
          status: "active" | "suspended" | "disabled";
          language: "en" | "si" | "ta";
          phone: string;
          notifications: boolean;
          interests: string[];
          avatar: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name: string;
          role?: AppRole;
          status?: "active" | "suspended" | "disabled";
          language?: "en" | "si" | "ta";
          phone?: string;
          notifications?: boolean;
          interests?: string[];
          avatar?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          display_name?: string;
          language?: "en" | "si" | "ta";
          phone?: string;
          notifications?: boolean;
          interests?: string[];
          avatar?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      auth_consume_attempt: {
        Args: { bucket_key: string; max_attempts: number; window_seconds: number };
        Returns: boolean;
      };
      certificate_registry: {
        Args: {
          page_offset: number;
          page_limit: number;
          module_filter: string | null;
          search_text: string;
        };
        Returns: Json;
      };
      certificate_issue: { Args: { learner: string; module_target: string }; Returns: Json };
      certificate_revoke: { Args: { target: string; reason: string }; Returns: Json };
      certificate_document: { Args: { target: string }; Returns: Json };
      certificate_verify: { Args: { certificate_reference: string }; Returns: Json };
      certificate_template_get: { Args: Record<never, never>; Returns: Json };
      certificate_template_save: {
        Args: { payload: Json; expected_version: number };
        Returns: Json;
      };
      admin_content_report: {
        Args: {
          days: number;
          module_filter: string | null;
          quiz_filter: string | null;
          page_offset: number;
        };
        Returns: Json;
      };
      admin_content_report_export: {
        Args: { days: number; module_filter: string | null; quiz_filter: string | null };
        Returns: Json;
      };
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
      quiz_delete_definition: {
        Args: { target: string; expected_version: number };
        Returns: undefined;
      };
      quiz_save_question: { Args: { payload: Json }; Returns: Json };
      quiz_delete_question: {
        Args: { target: string; expected_version: number };
        Returns: undefined;
      };
      quiz_start: { Args: { target: string }; Returns: Json };
      quiz_attempt: { Args: { target: string }; Returns: Json };
      quiz_answer: { Args: { target: string; question: string; option_id: string }; Returns: Json };
      quiz_submit: { Args: { target: string }; Returns: Json };
      quiz_history: { Args: { target: string | null }; Returns: Json };
      quiz_eligibility: { Args: { target: string }; Returns: Json };
      quiz_admin_summary: { Args: Record<never, never>; Returns: Json };
      content_translation_list: {
        Args: {
          target_kind: string;
          target_ids: string[];
          target_language: string;
          admin_mode: boolean;
        };
        Returns: Json;
      };
      content_translation_save: { Args: { payload: Json }; Returns: Json };
      notifications_sync: { Args: Record<never, never>; Returns: number };
      notifications_list: {
        Args: { page_before: string | null; before_id: string | null; page_limit: number };
        Returns: Json;
      };
      notifications_set_read: { Args: { target: string; is_read: boolean }; Returns: undefined };
      notifications_read_all: { Args: Record<never, never>; Returns: undefined };
      dashboard_begin_lesson: { Args: { target: string }; Returns: string };
      dashboard_heartbeat: { Args: { target: string }; Returns: number };
      dashboard_learner: { Args: { activity_offset?: number }; Returns: Json };
      dashboard_admin: { Args: Record<never, never>; Returns: Json };
      dashboard_report: {
        Args: {
          days?: number;
          module_filter?: string | null;
          quiz_filter?: string | null;
          attempt_offset?: number;
          attempt_limit?: number;
        };
        Returns: Json;
      };
      dashboard_users: {
        Args: { page_offset?: number; page_limit?: number; search_text?: string };
        Returns: Json;
      };
      dashboard_announcements_admin: { Args: Record<never, never>; Returns: Json };
      dashboard_save_announcement: { Args: { payload: Json }; Returns: undefined };
      dashboard_delete_announcement: { Args: { target: string }; Returns: undefined };
      admin_users_list: {
        Args: {
          page_offset?: number;
          page_limit?: number;
          search_text?: string;
          role_filter?: string;
          status_filter?: string;
          sort_field?: string;
          sort_direction?: string;
        };
        Returns: Json;
      };
      admin_user_details: { Args: { target: string }; Returns: Json };
      admin_user_change: {
        Args: {
          target: string;
          new_role?: AppRole | null;
          new_status?: string | null;
          reason?: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: AppRole;
    };
    CompositeTypes: Record<never, never>;
  };
}
