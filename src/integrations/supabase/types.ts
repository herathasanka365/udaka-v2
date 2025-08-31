export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          applied_at: string
          created_at: string
          creator_id: string
          event_id: string
          id: string
          message: string | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          applied_at?: string
          created_at?: string
          creator_id: string
          event_id: string
          id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          applied_at?: string
          created_at?: string
          creator_id?: string
          event_id?: string
          id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      availabilities: {
        Row: {
          available: boolean
          created_at: string
          creator_id: string
          date: string
          updated_at: string
        }
        Insert: {
          available?: boolean
          created_at?: string
          creator_id: string
          date: string
          updated_at?: string
        }
        Update: {
          available?: boolean
          created_at?: string
          creator_id?: string
          date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availabilities_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          client_id: string
          created_at: string
          creator_id: string
          end_date: string | null
          event_id: string
          event_role_id: string
          final_budget: number | null
          id: string
          notes: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          creator_id: string
          end_date?: string | null
          event_id: string
          event_role_id: string
          final_budget?: number | null
          id?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          creator_id?: string
          end_date?: string | null
          event_id?: string
          event_role_id?: string
          final_budget?: number | null
          id?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_event_role_id_fkey"
            columns: ["event_role_id"]
            isOneToOne: false
            referencedRelation: "event_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_profiles: {
        Row: {
          company_name: string | null
          created_at: string | null
          id: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          id: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
        }
        Relationships: []
      }
      creator_profiles: {
        Row: {
          age: number | null
          bio: string | null
          category: string
          created_at: string | null
          id: string
          keywords: string[] | null
          name: string
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          bio?: string | null
          category: string
          created_at?: string | null
          id: string
          keywords?: string[] | null
          name: string
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          bio?: string | null
          category?: string
          created_at?: string | null
          id?: string
          keywords?: string[] | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_roles: {
        Row: {
          created_at: string
          event_id: string
          id: string
          needed_count: number
          notes: string | null
          role_budget: number | null
          role_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          needed_count?: number
          notes?: string | null
          role_budget?: number | null
          role_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          needed_count?: number
          notes?: string | null
          role_budget?: number | null
          role_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_roles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          budget_total: number | null
          client_id: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          keywords: string[] | null
          location: string | null
          roles: Json | null
          status: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at: string
          views: number
        }
        Insert: {
          budget_total?: number | null
          client_id: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          keywords?: string[] | null
          location?: string | null
          roles?: Json | null
          status?: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at?: string
          views?: number
        }
        Update: {
          budget_total?: number | null
          client_id?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          keywords?: string[] | null
          location?: string | null
          roles?: Json | null
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
          updated_at?: string
          views?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_tier: string | null
          created_at: string | null
          display_name: string
          email: string
          id: string
          location: string | null
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          account_tier?: string | null
          created_at?: string | null
          display_name: string
          email: string
          id: string
          location?: string | null
          phone?: string | null
          role: string
          updated_at?: string | null
        }
        Update: {
          account_tier?: string | null
          created_at?: string | null
          display_name?: string
          email?: string
          id?: string
          location?: string | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      requests: {
        Row: {
          client_id: string
          created_at: string
          creator_id: string
          event_id: string
          event_role_id: string | null
          id: string
          message: string | null
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          creator_id: string
          event_id: string
          event_role_id?: string | null
          id?: string
          message?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          creator_id?: string
          event_id?: string
          event_role_id?: string | null
          id?: string
          message?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_event_role_id_fkey"
            columns: ["event_role_id"]
            isOneToOne: false
            referencedRelation: "event_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          created_at: string
          filters: Json | null
          id: string
          role: Database["public"]["Enums"]["search_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json | null
          id?: string
          role: Database["public"]["Enums"]["search_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json | null
          id?: string
          role?: Database["public"]["Enums"]["search_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      team: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          name: string
          photo_url: string | null
          role: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          age: number
          avatar_url: string | null
          created_at: string
          description: string | null
          email: string
          id: string
          keywords: string[] | null
          location: string | null
          name: string
          portfolio_urls: string[] | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          age: number
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          email: string
          id?: string
          keywords?: string[] | null
          location?: string | null
          name: string
          portfolio_urls?: string[] | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          age?: number
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          email?: string
          id?: string
          keywords?: string[] | null
          location?: string | null
          name?: string
          portfolio_urls?: string[] | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      application_status: "pending" | "accepted" | "rejected"
      event_status: "active" | "closed"
      notification_type:
        | "new_event"
        | "application"
        | "accepted"
        | "event_published"
        | "application_received"
        | "application_approved"
        | "application_rejected"
        | "application_updated"
        | "request_received"
        | "request_accepted"
        | "request_rejected"
        | "request_updated"
        | "booking_confirmed"
      search_role: "client" | "creator"
      user_role: "client" | "creator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      application_status: ["pending", "accepted", "rejected"],
      event_status: ["active", "closed"],
      notification_type: [
        "new_event",
        "application",
        "accepted",
        "event_published",
        "application_received",
        "application_approved",
        "application_rejected",
        "application_updated",
        "request_received",
        "request_accepted",
        "request_rejected",
        "request_updated",
        "booking_confirmed",
      ],
      search_role: ["client", "creator"],
      user_role: ["client", "creator"],
    },
  },
} as const
