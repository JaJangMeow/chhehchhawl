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
      conversation_participants: {
        Row: {
          conversation_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "user_conversations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_group: boolean | null
          last_message: string | null
          last_message_at: string | null
          name: string | null
          task_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_group?: boolean | null
          last_message?: string | null
          last_message_at?: string | null
          name?: string | null
          task_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_group?: boolean | null
          last_message?: string | null
          last_message_at?: string | null
          name?: string | null
          task_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          message_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          message_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          message_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          is_system_message: boolean | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          is_system_message?: boolean | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          is_system_message?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "user_conversations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          budget: number | null
          building_name: string | null
          categories: string[] | null
          category: string | null
          context_flags: Json | null
          created_at: string | null
          created_by: string | null
          custom_time: number | null
          deadline: string | null
          description: string | null
          estimated_time: number | null
          id: string
          locality: string | null
          location: Json | null
          payment_method: string | null
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
          assigned_to?: string | null
          budget?: number | null
          building_name?: string | null
          categories?: string[] | null
          category?: string | null
          context_flags?: Json | null
          created_at?: string | null
          created_by?: string | null
          custom_time?: number | null
          deadline?: string | null
          description?: string | null
          estimated_time?: number | null
          id?: string
          locality?: string | null
          location?: Json | null
          payment_method?: string | null
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
          assigned_to?: string | null
          budget?: number | null
          building_name?: string | null
          categories?: string[] | null
          category?: string | null
          context_flags?: Json | null
          created_at?: string | null
          created_by?: string | null
          custom_time?: number | null
          deadline?: string | null
          description?: string | null
          estimated_time?: number | null
          id?: string
          locality?: string | null
          location?: Json | null
          payment_method?: string | null
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
    }
    Views: {
      user_conversations_view: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string | null
          is_group: boolean | null
          last_message: string | null
          last_message_at: string | null
          name: string | null
          task_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          is_group?: boolean | null
          last_message?: string | null
          last_message_at?: string | null
          name?: string | null
          task_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          is_group?: boolean | null
          last_message?: string | null
          last_message_at?: string | null
          name?: string | null
          task_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_task_and_create_conversation: {
        Args: {
          p_task_id: string
          p_user_id: string
        }
        Returns: {
          conversation_id: string
        }[]
      }
      check_auth: {
        Args: Record<PropertyKey, never>
        Returns: {
          current_user_id: string
          is_authenticated: boolean
        }[]
      }
      get_conversation_participants_direct: {
        Args: {
          p_conversation_id: string
        }
        Returns: {
          participant_id: string
          user_id: string
          first_name: string
          last_name: string
          avatar_url: string
        }[]
      }
      get_raw_conversation_ids_for_user: {
        Args: {
          user_id_input: string
        }
        Returns: {
          id: string
        }[]
      }
      get_unread_message_count: {
        Args: {
          p_user_id: string
        }
        Returns: number
      }
      insert_message_direct: {
        Args: {
          p_conversation_id: string
          p_sender_id: string
          p_content: string
        }
        Returns: {
          id: string
        }[]
      }
      mark_messages_as_read: {
        Args: {
          p_conversation_id: string
        }
        Returns: boolean
      }
      send_message_with_attachments: {
        Args: {
          p_conversation_id: string
          p_content: string
          p_attachments: Json
        }
        Returns: Json
      }
    }
    Enums: {
      task_status_enum:
        | "pending"
        | "open"
        | "assigned"
        | "confirmed"
        | "completed"
        | "canceled"
        | "cancelled"
        | "public"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updatable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
