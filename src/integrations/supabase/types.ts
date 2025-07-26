export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      budget_goals: {
        Row: {
          amount: number
          category: string
          created_at: string
          id: string
          period: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          id?: string
          period: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          period?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expense_comments: {
        Row: {
          comment: string
          created_at: string
          expense_id: string | null
          group_expense_id: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          expense_id?: string | null
          group_expense_id?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          expense_id?: string | null
          group_expense_id?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_comments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_comments_group_expense_id_fkey"
            columns: ["group_expense_id"]
            isOneToOne: false
            referencedRelation: "group_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_reports: {
        Row: {
          created_at: string
          filters: Json
          id: string
          name: string
          report_type: string
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters: Json
          id?: string
          name: string
          report_type: string
          settings: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          report_type?: string
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          date: string
          description: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      group_challenges: {
        Row: {
          challenge_type: string
          created_at: string
          created_by: string
          description: string | null
          group_id: string
          id: string
          is_active: boolean
          name: string
          rewards: Json | null
          rules: Json
          target_amount: number | null
          target_date: string | null
          updated_at: string
        }
        Insert: {
          challenge_type: string
          created_at?: string
          created_by: string
          description?: string | null
          group_id: string
          id?: string
          is_active?: boolean
          name: string
          rewards?: Json | null
          rules: Json
          target_amount?: number | null
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          challenge_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          group_id?: string
          id?: string
          is_active?: boolean
          name?: string
          rewards?: Json | null
          rules?: Json
          target_amount?: number | null
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_challenges_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "savings_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_expense_approvals: {
        Row: {
          approver_id: string
          comment: string | null
          created_at: string
          expense_id: string
          id: string
          status: string
        }
        Insert: {
          approver_id: string
          comment?: string | null
          created_at?: string
          expense_id: string
          id?: string
          status: string
        }
        Update: {
          approver_id?: string
          comment?: string | null
          created_at?: string
          expense_id?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_group_expense_approvals_approver_id"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "group_expense_approvals_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "group_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      group_expenses: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          category: string
          created_at: string
          date: string
          description: string | null
          group_id: string
          id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          category: string
          created_at?: string
          date?: string
          description?: string | null
          group_id: string
          id?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string
          date?: string
          description?: string | null
          group_id?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_group_expenses_approved_by"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_group_expenses_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "group_expenses_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "savings_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          created_at: string
          group_id: string
          id: string
          message: string
          message_type: string
          referenced_expense_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          message: string
          message_type?: string
          referenced_expense_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          message?: string
          message_type?: string
          referenced_expense_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_group_messages_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "savings_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_referenced_expense_id_fkey"
            columns: ["referenced_expense_id"]
            isOneToOne: false
            referencedRelation: "group_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      group_notifications: {
        Row: {
          created_at: string
          data: Json | null
          group_id: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          group_id: string
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          group_id?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_notifications_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "savings_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_permissions: {
        Row: {
          created_at: string
          granted_by: string
          group_id: string
          id: string
          permission: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by: string
          group_id: string
          id?: string
          permission: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string
          group_id?: string
          id?: string
          permission?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_permissions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "savings_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          currency: string | null
          email: string | null
          full_name: string | null
          id: string
          monthly_salary: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          monthly_salary?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          monthly_salary?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      savings_contributions: {
        Row: {
          amount: number
          created_at: string
          date: string
          description: string | null
          group_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date?: string
          description?: string | null
          group_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          description?: string | null
          group_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_savings_contributions_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "savings_contributions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "savings_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_group_invitations: {
        Row: {
          created_at: string
          group_id: string
          id: string
          invited_by: string
          invited_user_email: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          invited_by: string
          invited_user_email: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          invited_by?: string
          invited_user_email?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_group_invitations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "savings_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "savings_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "savings_group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      savings_groups: {
        Row: {
          created_at: string
          created_by: string
          current_amount: number
          description: string | null
          goal_amount: number
          id: string
          is_active: boolean
          name: string
          target_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          current_amount?: number
          description?: string | null
          goal_amount: number
          id?: string
          is_active?: boolean
          name: string
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          current_amount?: number
          description?: string | null
          goal_amount?: number
          id?: string
          is_active?: boolean
          name?: string
          target_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      weekly_insights: {
        Row: {
          created_at: string
          id: string
          insights: Json | null
          suggestions: string[] | null
          total_expenses: number
          updated_at: string
          user_id: string
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          insights?: Json | null
          suggestions?: string[] | null
          total_expenses: number
          updated_at?: string
          user_id: string
          week_end_date: string
          week_start_date: string
        }
        Update: {
          created_at?: string
          id?: string
          insights?: Json | null
          suggestions?: string[] | null
          total_expenses?: number
          updated_at?: string
          user_id?: string
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_is_group_admin: {
        Args: { group_id: string; user_id: string }
        Returns: boolean
      }
      user_is_group_member: {
        Args: { group_id: string; user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      expense_category:
        | "food_dining"
        | "transportation"
        | "shopping"
        | "entertainment"
        | "utilities"
        | "healthcare"
        | "education"
        | "travel"
        | "subscriptions"
        | "other"
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
      expense_category: [
        "food_dining",
        "transportation",
        "shopping",
        "entertainment",
        "utilities",
        "healthcare",
        "education",
        "travel",
        "subscriptions",
        "other",
      ],
    },
  },
} as const
