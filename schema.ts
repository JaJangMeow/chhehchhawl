
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      conversations: {
        Row: {
          created_at: string
          created_by: string | null
          has_notifications: boolean | null
          id: string
          is_group: boolean | null
          last_message: string | null
          last_message_at: string | null
          name: string | null
          task_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          has_notifications?: boolean | null
          id?: string
          is_group?: boolean | null
          last_message?: string | null
          last_message_at?: string | null
          name?: string | null
          task_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          has_notifications?: boolean | null
          id?: string
          is_group?: boolean | null
          last_message?: string | null
          last_message_at?: string | null
          name?: string | null
          task_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_notification: boolean | null
          is_read: boolean | null
          is_system_message: boolean | null
          notification_data: Json | null
          notification_type: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_notification?: boolean | null
          is_read?: boolean | null
          is_system_message?: boolean | null
          notification_data?: Json | null
          notification_type?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_notification?: boolean | null
          is_read?: boolean | null
          is_system_message?: boolean | null
          notification_data?: Json | null
          notification_type?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          aadhaar: string | null
          address: string | null
          avatar_url: string | null
          city: string | null
          created_at: string | null
          dob: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          gender: string | null
          id: string
          last_name: string | null
          phone: string | null
          state: string | null
          updated_at: string | null
          upi: string | null
        }
        Insert: {
          aadhaar?: string | null
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          dob?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          upi?: string | null
        }
        Update: {
          aadhaar?: string | null
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          dob?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          upi?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      tasks: {
        Row: {
          accepted_by: string | null
          assigned_at: string | null
          assigned_to: string | null
          budget: number
          building_name: string | null
          categories: string[] | null
          category: string | null
          completion_date: string | null
          context_flags: Json | null
          created_at: string | null
          created_by: string | null
          custom_time: number | null
          deadline: string | null
          description: string | null
          estimated_time: number | null
          has_pending_acceptances: boolean | null
          id: string
          locality: string | null
          location: Json | null
          payment_method: string | null
          price: number | null
          priority: string | null
          search_vector: unknown | null
          skill_requirements: string[] | null
          status: string
          task_completion_hours: number | null
          task_photos: string[] | null
          task_visibility_hours: number | null
          title: string
          updated_at: string | null
          urgent: boolean | null
        }
        Insert: {
          accepted_by?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          budget?: number
          building_name?: string | null
          categories?: string[] | null
          category?: string | null
          completion_date?: string | null
          context_flags?: Json | null
          created_at?: string | null
          created_by?: string | null
          custom_time?: number | null
          deadline?: string | null
          description?: string | null
          estimated_time?: number | null
          has_pending_acceptances?: boolean | null
          id?: string
          locality?: string | null
          location?: Json | null
          payment_method?: string | null
          price?: number | null
          priority?: string | null
          search_vector?: unknown | null
          skill_requirements?: string[] | null
          status?: string
          task_completion_hours?: number | null
          task_photos?: string[] | null
          task_visibility_hours?: number | null
          title: string
          updated_at?: string | null
          urgent?: boolean | null
        }
        Update: {
          accepted_by?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          budget?: number
          building_name?: string | null
          categories?: string[] | null
          category?: string | null
          completion_date?: string | null
          context_flags?: Json | null
          created_at?: string | null
          created_by?: string | null
          custom_time?: number | null
          deadline?: string | null
          description?: string | null
          estimated_time?: number | null
          has_pending_acceptances?: boolean | null
          id?: string
          locality?: string | null
          location?: Json | null
          payment_method?: string | null
          price?: number | null
          priority?: string | null
          search_vector?: unknown | null
          skill_requirements?: string[] | null
          status?: string
          task_completion_hours?: number | null
          task_photos?: string[] | null
          task_visibility_hours?: number | null
          title?: string
          updated_at?: string | null
          urgent?: boolean | null
        }
        Relationships: []
      }
      task_acceptances: {
        Row: {
          acceptor_avatar_url: string | null
          acceptor_first_name: string | null
          acceptor_id: string
          created_at: string
          id: string
          message: string | null
          response_message: string | null
          status: string
          task_id: string
          task_owner_first_name: string | null
          task_owner_id: string | null
          task_title: string | null
          updated_at: string
        }
        Insert: {
          acceptor_avatar_url?: string | null
          acceptor_first_name?: string | null
          acceptor_id: string
          created_at?: string
          id?: string
          message?: string | null
          response_message?: string | null
          status?: string
          task_id: string
          task_owner_first_name?: string | null
          task_owner_id?: string | null
          task_title?: string | null
          updated_at?: string
        }
        Update: {
          acceptor_avatar_url?: string | null
          acceptor_first_name?: string | null
          acceptor_id?: string
          created_at?: string
          id?: string
          message?: string | null
          response_message?: string | null
          status?: string
          task_id?: string
          task_owner_first_name?: string | null
          task_owner_id?: string | null
          task_title?: string | null
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updatable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

