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
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          status: string
          budget: number
          created_by: string
          assigned_to: string | null
          location: Json | null
          deadline: string | null
          created_at: string
          updated_at: string
          
          // New fields for enhanced task data
          categories: string[]
          priority: string | null
          urgent: boolean
          building_name: string | null
          locality: string | null
          estimated_time: number | null
          custom_time: number | null
          task_visibility_hours: number | null
          task_completion_hours: number | null
          skill_requirements: string[]
          context_flags: Json | null
          payment_method: string | null
          task_photos: string[]
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status?: string
          budget: number
          created_by: string
          assigned_to?: string | null
          location?: Json | null
          deadline?: string | null
          created_at?: string
          updated_at?: string
          
          // New fields for enhanced task data
          categories?: string[]
          priority?: string | null
          urgent?: boolean
          building_name?: string | null
          locality?: string | null
          estimated_time?: number | null
          custom_time?: number | null
          task_visibility_hours?: number | null
          task_completion_hours?: number | null
          skill_requirements?: string[]
          context_flags?: Json | null
          payment_method?: string | null
          task_photos?: string[]
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: string
          budget?: number
          created_by?: string
          assigned_to?: string | null
          location?: Json | null
          deadline?: string | null
          created_at?: string
          updated_at?: string
          
          // New fields for enhanced task data
          categories?: string[]
          priority?: string | null
          urgent?: boolean
          building_name?: string | null
          locality?: string | null
          estimated_time?: number | null
          custom_time?: number | null
          task_visibility_hours?: number | null
          task_completion_hours?: number | null
          skill_requirements?: string[]
          context_flags?: Json | null
          payment_method?: string | null
          task_photos?: string[]
        }
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          first_name: string | null
          last_name: string | null
          full_name: string | null
          phone: string | null
          address: string | null
          city: string | null
          state: string | null
          dob: string | null
          gender: string | null
          aadhaar: string | null
          upi: string | null
          avatar_url: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          full_name?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          dob?: string | null
          gender?: string | null
          aadhaar?: string | null
          upi?: string | null
          avatar_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          full_name?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          dob?: string | null
          gender?: string | null
          aadhaar?: string | null
          upi?: string | null
          avatar_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      conversations: {
        Row: {
          id: string
          task_id: string
          created_at: string
          updated_at: string
          last_message: string | null
          last_message_at: string | null
          category: string | null
        }
        Insert: {
          id?: string
          task_id: string
          created_at?: string
          updated_at?: string
          last_message?: string | null
          last_message_at?: string | null
          category?: string | null
        }
        Update: {
          id?: string
          task_id?: string
          created_at?: string
          updated_at?: string
          last_message?: string | null
          last_message_at?: string | null
          category?: string | null
        }
      }
      conversation_participants: {
        Row: {
          id: string
          conversation_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          user_id?: string
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string
          is_read?: boolean
          created_at?: string
        }
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
  }
}

// Simple class to provide supabase database schema info at runtime
export class SupabaseSchema {
  static getTableNames(): string[] {
    return ['tasks', 'profiles', 'conversations', 'conversation_participants', 'messages'];
  }
}

export default SupabaseSchema; 