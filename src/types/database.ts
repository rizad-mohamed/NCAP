import type { AppRole } from "@/auth/types";
import type { AwarenessTable, ResourceRow, AssetRow } from "@/server/awareness/types";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
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
      awareness_summary: { Args: Record<never, never>; Returns: Json };
      save_awareness_resource: { Args: { payload: Json; expected_version?: number }; Returns: ResourceRow };
      delete_awareness_resource: { Args: { resource: string; expected_version: number }; Returns: undefined };
    };
    Enums: {
      app_role: AppRole;
    };
    CompositeTypes: Record<never, never>;
  };
}
