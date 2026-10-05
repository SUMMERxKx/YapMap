// Generated from the Supabase project's schema (supabase/migrations). Regenerate with the
// Supabase MCP `generate_typescript_types` tool (or `supabase gen types typescript`)
// whenever a migration changes tables or functions.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      availability: {
        Row: {
          accuracy_m: number | null;
          expires_at: string;
          location: unknown;
          note: string;
          started_at: string;
          state: string;
          user_id: string;
        };
        Insert: {
          accuracy_m?: number | null;
          expires_at: string;
          location: unknown;
          note?: string;
          started_at?: string;
          state?: string;
          user_id: string;
        };
        Update: {
          accuracy_m?: number | null;
          expires_at?: string;
          location?: unknown;
          note?: string;
          started_at?: string;
          state?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'availability_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      blocks: {
        Row: { blocked: string; blocker: string; created_at: string };
        Insert: { blocked: string; blocker: string; created_at?: string };
        Update: { blocked?: string; blocker?: string; created_at?: string };
        Relationships: [
          {
            foreignKeyName: 'blocks_blocked_fkey';
            columns: ['blocked'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'blocks_blocker_fkey';
            columns: ['blocker'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_requests: {
        Row: {
          created_at: string;
          ended_at: string | null;
          expires_at: string;
          from_user: string;
          id: string;
          responded_at: string | null;
          status: string;
          to_user: string;
        };
        Insert: {
          created_at?: string;
          ended_at?: string | null;
          expires_at?: string;
          from_user: string;
          id?: string;
          responded_at?: string | null;
          status?: string;
          to_user: string;
        };
        Update: {
          created_at?: string;
          ended_at?: string | null;
          expires_at?: string;
          from_user?: string;
          id?: string;
          responded_at?: string | null;
          status?: string;
          to_user?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_requests_from_user_fkey';
            columns: ['from_user'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chat_requests_to_user_fkey';
            columns: ['to_user'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      event_members: {
        Row: { event_id: string; joined_at: string; user_id: string };
        Insert: { event_id: string; joined_at?: string; user_id: string };
        Update: { event_id?: string; joined_at?: string; user_id?: string };
        Relationships: [
          {
            foreignKeyName: 'event_members_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      events: {
        Row: {
          created_at: string;
          description: string;
          emoji: string;
          host: string;
          id: string;
          location: unknown;
          starts_at: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          description?: string;
          emoji?: string;
          host: string;
          id?: string;
          location: unknown;
          starts_at: string;
          title: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          emoji?: string;
          host?: string;
          id?: string;
          location?: unknown;
          starts_at?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'events_host_fkey';
            columns: ['host'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          created_at: string;
          event_id: string | null;
          id: string;
          request_id: string | null;
          sender: string;
          sender_name: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          event_id?: string | null;
          id?: string;
          request_id?: string | null;
          sender: string;
          sender_name?: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          event_id?: string | null;
          id?: string;
          request_id?: string | null;
          sender?: string;
          sender_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'chat_requests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_fkey';
            columns: ['sender'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          first_name: string;
          gender: string;
          id: string;
          interests: string[];
          intro: string;
          is_adult: boolean;
          last_name: string;
          photo_path: string | null;
          photo_paths: string[];
          show_gender: boolean;
          status: string;
          verified: boolean;
        };
        Insert: {
          created_at?: string;
          first_name: string;
          gender: string;
          id: string;
          interests: string[];
          intro: string;
          is_adult: boolean;
          last_name: string;
          photo_path?: string | null;
          photo_paths?: string[];
          show_gender?: boolean;
          status?: string;
          verified?: boolean;
        };
        Update: {
          created_at?: string;
          first_name?: string;
          gender?: string;
          id?: string;
          interests?: string[];
          intro?: string;
          is_adult?: boolean;
          last_name?: string;
          photo_path?: string | null;
          photo_paths?: string[];
          show_gender?: boolean;
          status?: string;
          verified?: boolean;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          action: string | null;
          created_at: string;
          details: string;
          id: string;
          reason: string;
          reported: string;
          reporter: string;
          request_id: string | null;
          reviewed_at: string | null;
        };
        Insert: {
          action?: string | null;
          created_at?: string;
          details?: string;
          id?: string;
          reason: string;
          reported: string;
          reporter: string;
          request_id?: string | null;
          reviewed_at?: string | null;
        };
        Update: {
          action?: string | null;
          created_at?: string;
          details?: string;
          id?: string;
          reason?: string;
          reported?: string;
          reporter?: string;
          request_id?: string | null;
          reviewed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'reports_reported_fkey';
            columns: ['reported'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_reporter_fkey';
            columns: ['reporter'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'chat_requests';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      block_user: { Args: { target: string }; Returns: undefined };
      blocked_list: { Args: never; Returns: Json[] };
      create_event: {
        Args: {
          description: string;
          emoji: string;
          lat: number;
          lng: number;
          starts_at_ms: number;
          title: string;
        };
        Returns: Json;
      };
      delete_account: { Args: never; Returns: undefined };
      end_chat: { Args: { outcome: string; request_id: string }; Returns: undefined };
      events_near: { Args: { lat: number; lng: number; radius_m?: number }; Returns: Json[] };
      go_green: {
        Args: { accuracy: number; lat: number; lng: number; minutes: number; note?: string };
        Returns: undefined;
      };
      go_offline: { Args: never; Returns: undefined };
      join_event: { Args: { event_id: string }; Returns: undefined };
      leave_event: { Args: { event_id: string }; Returns: undefined };
      my_status: { Args: never; Returns: Json };
      nearby: { Args: never; Returns: Json[] };
      report_user: {
        Args: { details?: string; reason: string; request_id?: string; target: string };
        Returns: undefined;
      };
      request_person: { Args: { request_id: string }; Returns: Json };
      respond: { Args: { accept: boolean; request_id: string }; Returns: undefined };
      send_chat_message: { Args: { body: string; request_id: string }; Returns: undefined };
      send_event_message: { Args: { body: string; event_id: string }; Returns: undefined };
      send_request: { Args: { target: string }; Returns: Json };
      update_note: { Args: { note: string }; Returns: undefined };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database['public'];

/** Row type for a table, e.g. `Tables<'messages'>`. */
export type Tables<Name extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][Name]['Row'];
