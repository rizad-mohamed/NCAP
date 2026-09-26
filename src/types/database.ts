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
    };
    Enums: {
      app_role: AppRole;
    };
    CompositeTypes: Record<never, never>;
  };
}
