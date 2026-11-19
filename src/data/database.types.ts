// Generated from the local database by `npm run db:types`. Do not edit by hand:
// change a migration in supabase/migrations, then run the command again.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
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
        ComputedFields: never;
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
        Row: {
          blocked: string;
          blocker: string;
          created_at: string;
        };
        ComputedFields: never;
        Insert: {
          blocked: string;
          blocker: string;
          created_at?: string;
        };
        Update: {
          blocked?: string;
          blocker?: string;
          created_at?: string;
        };
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
        ComputedFields: never;
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
        Row: {
          event_id: string;
          joined_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          event_id: string;
          joined_at?: string;
          user_id: string;
        };
        Update: {
          event_id?: string;
          joined_at?: string;
          user_id?: string;
        };
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
        ComputedFields: never;
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
        ComputedFields: never;
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
        ComputedFields: never;
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
          about: string;
          action: string | null;
          content: Json | null;
          counts_toward_hide: boolean;
          created_at: string;
          details: string;
          event_id: string | null;
          id: string;
          message_id: string | null;
          reason: string;
          reported: string | null;
          reported_hash: string;
          reporter: string | null;
          request_id: string | null;
          reviewed_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          about?: string;
          action?: string | null;
          content?: Json | null;
          counts_toward_hide?: boolean;
          created_at?: string;
          details?: string;
          event_id?: string | null;
          id?: string;
          message_id?: string | null;
          reason: string;
          reported?: string | null;
          reported_hash: string;
          reporter?: string | null;
          request_id?: string | null;
          reviewed_at?: string | null;
        };
        Update: {
          about?: string;
          action?: string | null;
          content?: Json | null;
          counts_toward_hide?: boolean;
          created_at?: string;
          details?: string;
          event_id?: string | null;
          id?: string;
          message_id?: string | null;
          reason?: string;
          reported?: string | null;
          reported_hash?: string;
          reporter?: string | null;
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
      before_user_created: { Args: { event: Json }; Returns: Json };
      block_user: { Args: { target: string }; Returns: undefined };
      blocked_list: { Args: Record<PropertyKey, never>; Returns: Json[] };
      cancel_request: { Args: { request_id: string }; Returns: undefined };
      create_event: {
        Args: { description: string; emoji: string; lat: number; lng: number; starts_at_ms: number; title: string };
        Returns: Json;
      };
      delete_account: { Args: Record<PropertyKey, never>; Returns: undefined };
      delete_event: { Args: { event_id: string }; Returns: undefined };
      end_chat: { Args: { outcome: string; request_id: string }; Returns: undefined };
      events_near: { Args: { radius_m?: number }; Returns: Json[] };
      go_green: { Args: { accuracy: number; lat: number; lng: number; minutes: number; note?: string }; Returns: Json };
      go_offline: { Args: Record<PropertyKey, never>; Returns: undefined };
      join_event: { Args: { event_id: string }; Returns: undefined };
      leave_event: { Args: { event_id: string }; Returns: undefined };
      my_status: { Args: Record<PropertyKey, never>; Returns: Json };
      nearby: { Args: Record<PropertyKey, never>; Returns: Json[] };
      report_event: { Args: { details?: string; event_id: string; reason: string }; Returns: undefined };
      report_message: { Args: { details?: string; message_id: string; reason: string }; Returns: undefined };
      report_user: {
        Args: { details?: string; reason: string; request_id?: string; target: string };
        Returns: undefined;
      };
      request_person: { Args: { request_id: string }; Returns: Json };
      respond: { Args: { accept: boolean; request_id: string }; Returns: undefined };
      send_chat_message: { Args: { body: string; request_id: string }; Returns: Json };
      send_event_message: { Args: { body: string; event_id: string }; Returns: Json };
      send_request: { Args: { target: string }; Returns: Json };
      set_map_position: { Args: { lat: number; lng: number }; Returns: undefined };
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema['Tables'] & DefaultSchema['Views']) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
