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
    return ['tasks'];
  }
}

export default SupabaseSchema; 