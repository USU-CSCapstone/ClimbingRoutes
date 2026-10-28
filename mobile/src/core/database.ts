// Types for the Supabase tables in supabase/migrations/, in the shape `supabase gen types`
// writes. Written by hand for now; regenerate with
//   npx supabase gen types typescript --linked > src/core/database.ts
// once the project is linked, and keep the aliases at the bottom.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: '13' };
  public: {
    Tables: {
      profiles: {
        Row: { id: string; is_moderator: boolean; created_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      captures: {
        Row: {
          id: string;
          wall_uuid: string;
          captured_by: string;
          photo_count: number;
          status: Database['public']['Enums']['capture_status'];
          failure_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        /** The app sets only these; the rest are defaults or the worker's. */
        Insert: { wall_uuid: string; photo_count?: number };
        Update: { photo_count?: number; status?: 'uploading' | 'uploaded' };
        Relationships: [];
      };
      wall_models: {
        Row: {
          id: string;
          wall_uuid: string;
          version: number;
          glb_path: string;
          bytes: number;
          triangles: number | null;
          source_capture: string | null;
          status: Database['public']['Enums']['model_status'];
          review_note: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          wall_uuid: string;
          version: number;
          glb_path: string;
          bytes: number;
          triangles?: number | null;
          source_capture?: string | null;
          status?: Database['public']['Enums']['model_status'];
          review_note?: string | null;
        };
        Update: { status?: Database['public']['Enums']['model_status']; review_note?: string | null };
        Relationships: [
          {
            foreignKeyName: 'wall_models_source_capture_fkey';
            columns: ['source_capture'];
            isOneToOne: false;
            referencedRelation: 'captures';
            referencedColumns: ['id'];
          },
        ];
      };
      route_lines: {
        Row: {
          id: string;
          wall_model_id: string;
          climb_uuid: string;
          name: string;
          grade: string | null;
          points: Json;
          normals: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          wall_model_id: string;
          climb_uuid: string;
          name: string;
          grade?: string | null;
          points: Json;
          normals: Json;
        };
        Update: { name?: string; grade?: string | null; points?: Json; normals?: Json };
        Relationships: [
          {
            foreignKeyName: 'route_lines_wall_model_id_fkey';
            columns: ['wall_model_id'];
            isOneToOne: false;
            referencedRelation: 'wall_models';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_moderator: { Args: Record<PropertyKey, never>; Returns: boolean };
    };
    Enums: {
      capture_status: 'uploading' | 'uploaded' | 'processing' | 'processed' | 'failed';
      model_status: 'needs_review' | 'published' | 'rejected';
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type Tables = Database['public']['Tables'];
export type Profile = Tables['profiles']['Row'];
export type Capture = Tables['captures']['Row'];
export type WallModel = Tables['wall_models']['Row'];
export type RouteLine = Tables['route_lines']['Row'];
export type CaptureStatus = Database['public']['Enums']['capture_status'];
export type ModelStatus = Database['public']['Enums']['model_status'];
