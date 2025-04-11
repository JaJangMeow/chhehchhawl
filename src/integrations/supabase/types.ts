export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
            isOneToOne: false
            referencedRelation: "conversation_details"
            referencedColumns: ["conversation_id"]
          },
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
            referencedRelation: "conversations_with_task_info_view"
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
      conversation_participants_backup: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string | null
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
          created_at?: string | null
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
          created_at?: string | null
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
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "safe_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: true
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_task_id"
            columns: ["task_id"]
            isOneToOne: true
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations_backup: {
        Row: {
          created_at: string | null
          created_by: string | null
          has_notifications: boolean | null
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
          has_notifications?: boolean | null
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
          has_notifications?: boolean | null
          id?: string | null
          is_group?: boolean | null
          last_message?: string | null
          last_message_at?: string | null
          name?: string | null
          task_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "task_acceptance_notification_messages"
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
            foreignKeyName: "messages_fixed_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversation_details"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "messages_fixed_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_fixed_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations_with_task_info_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_fixed_conversation_id_fkey"
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
      messages_backup: {
        Row: {
          content: string | null
          conversation_id: string | null
          created_at: string | null
          id: string | null
          is_notification: boolean | null
          is_read: boolean | null
          is_system_message: boolean | null
          notification_data: Json | null
          notification_type: string | null
          sender_id: string | null
        }
        Insert: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string | null
          is_notification?: boolean | null
          is_read?: boolean | null
          is_system_message?: boolean | null
          notification_data?: Json | null
          notification_type?: string | null
          sender_id?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string | null
          is_notification?: boolean | null
          is_read?: boolean | null
          is_system_message?: boolean | null
          notification_data?: Json | null
          notification_type?: string | null
          sender_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          content: string
          created_at: string
          data: Json | null
          id: string
          is_read: boolean | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "safe_users"
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
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "safe_users"
            referencedColumns: ["id"]
          },
        ]
      }
      schema_migrations: {
        Row: {
          applied_at: string | null
          description: string | null
          id: number
          version: string
        }
        Insert: {
          applied_at?: string | null
          description?: string | null
          id?: number
          version: string
        }
        Update: {
          applied_at?: string | null
          description?: string | null
          id?: number
          version?: string
        }
        Relationships: []
      }
      task_acceptance_conversations: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          task_acceptance_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          task_acceptance_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          task_acceptance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_acceptance_conversations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversation_details"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "task_acceptance_conversations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_acceptance_conversations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations_with_task_info_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_acceptance_conversations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "user_conversations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_acceptance_conversations_task_acceptance_id_fkey"
            columns: ["task_acceptance_id"]
            isOneToOne: false
            referencedRelation: "task_acceptances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_acceptance_conversations_task_acceptance_id_fkey"
            columns: ["task_acceptance_id"]
            isOneToOne: false
            referencedRelation: "task_acceptances_with_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_acceptance_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          task_acceptance_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          task_acceptance_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          task_acceptance_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_acceptance_notifications_task_acceptance_id_fkey"
            columns: ["task_acceptance_id"]
            isOneToOne: false
            referencedRelation: "task_acceptances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_acceptance_notifications_task_acceptance_id_fkey"
            columns: ["task_acceptance_id"]
            isOneToOne: false
            referencedRelation: "task_acceptances_with_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_acceptance_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "safe_users"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "task_acceptances_acceptor_id_fkey"
            columns: ["acceptor_id"]
            isOneToOne: false
            referencedRelation: "safe_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_acceptances_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_acceptances_task_owner_id_fkey"
            columns: ["task_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_conversations: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_conversations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversation_details"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "task_conversations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_conversations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations_with_task_info_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_conversations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "user_conversations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_conversations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_notifications: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          task_id: string | null
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          task_id?: string | null
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          task_id?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "safe_users"
            referencedColumns: ["id"]
          },
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
        Relationships: [
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "safe_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      conversation_details: {
        Row: {
          assigned_to: string | null
          avatar_url: string | null
          conversation_id: string | null
          conversation_name: string | null
          created_at: string | null
          created_by: string | null
          first_name: string | null
          has_notifications: boolean | null
          is_group: boolean | null
          last_message: string | null
          last_message_at: string | null
          last_name: string | null
          participant_id: string | null
          task_id: string | null
          task_owner: string | null
          task_status: string | null
          task_title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "safe_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: true
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_task_id"
            columns: ["task_id"]
            isOneToOne: true
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["task_owner"]
            isOneToOne: false
            referencedRelation: "safe_users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations_with_task_info_view: {
        Row: {
          id: string | null
          is_task_owner: boolean | null
          last_message: string | null
          last_message_at: string | null
          other_user_avatar_url: string | null
          other_user_first_name: string | null
          other_user_id: string | null
          other_user_last_name: string | null
          task_budget: number | null
          task_id: string | null
          task_owner_id: string | null
          task_status: string | null
          task_title: string | null
          unread_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: true
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_task_id"
            columns: ["task_id"]
            isOneToOne: true
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["task_owner_id"]
            isOneToOne: false
            referencedRelation: "safe_users"
            referencedColumns: ["id"]
          },
        ]
      }
      safe_users: {
        Row: {
          email: string | null
          id: string | null
          raw_user_meta_data: Json | null
        }
        Insert: {
          email?: string | null
          id?: string | null
          raw_user_meta_data?: Json | null
        }
        Update: {
          email?: string | null
          id?: string | null
          raw_user_meta_data?: Json | null
        }
        Relationships: []
      }
      task_acceptance_notification_messages: {
        Row: {
          acceptance_id: string | null
          acceptor_avatar: string | null
          acceptor_id: string | null
          acceptor_name: string | null
          content: string | null
          conversation_id: string | null
          created_at: string | null
          id: string | null
          notification_data: Json | null
          notification_type: string | null
          sender_id: string | null
          status: string | null
          task_id: string | null
          task_owner_id: string | null
          task_title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_fixed_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversation_details"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "messages_fixed_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_fixed_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations_with_task_info_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_fixed_conversation_id_fkey"
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
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["task_owner_id"]
            isOneToOne: false
            referencedRelation: "safe_users"
            referencedColumns: ["id"]
          },
        ]
      }
      task_acceptances_with_profiles: {
        Row: {
          acceptor_avatar_url: string | null
          acceptor_first_name: string | null
          acceptor_id: string | null
          created_at: string | null
          id: string | null
          message: string | null
          owner_avatar_url: string | null
          response_message: string | null
          status: string | null
          task_id: string | null
          task_owner_first_name: string | null
          task_owner_id: string | null
          task_status: string | null
          task_title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_acceptances_acceptor_id_fkey"
            columns: ["acceptor_id"]
            isOneToOne: false
            referencedRelation: "safe_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_acceptances_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
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
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "safe_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: true
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_task_id"
            columns: ["task_id"]
            isOneToOne: true
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_task: {
        Args: { p_task_id: string; p_user_id: string }
        Returns: {
          success: boolean
          message: string
          conversation_id: string
        }[]
      }
      accept_task_and_create_conversation: {
        Args:
          | { p_task_id: string; p_message?: string; p_user_id?: string }
          | { p_task_id: string; p_user_id?: string; p_message?: string }
        Returns: Json
      }
      accept_task_and_create_conversation_v2: {
        Args: { p_task_id: string; p_user_id: string; p_message?: string }
        Returns: Json
      }
      accept_task_and_create_conversation_v2_old: {
        Args: { p_task_id: string; p_user_id: string; p_message?: string }
        Returns: Json
      }
      accept_task_no_chat: {
        Args: { p_task_id: string; p_user_id: string; p_message?: string }
        Returns: {
          success: boolean
          message: string
          acceptance_id: string
        }[]
      }
      add_conversation_participant_safely: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: string
      }
      associate_task_with_conversation: {
        Args: { p_conversation_id: string; p_task_id: string }
        Returns: string
      }
      check_auth: {
        Args: Record<PropertyKey, never>
        Returns: {
          current_user_id: string
          is_authenticated: boolean
        }[]
      }
      confirm_task_complete: {
        Args: { p_task_id: string; p_user_id: string }
        Returns: boolean
      }
      confirm_task_completion: {
        Args: { p_task_id: string; p_user_id: string }
        Returns: boolean
      }
      create_conversation_for_task: {
        Args: { p_task_id: string; p_user_id: string; p_task_owner_id: string }
        Returns: string
      }
      create_task: {
        Args: {
          p_title: string
          p_description: string
          p_budget: number
          p_deadline?: string
          p_location?: Json
          p_categories?: string[]
          p_priority?: string
          p_urgent?: boolean
          p_building_name?: string
          p_locality?: string
          p_estimated_time?: number
          p_custom_time?: number
          p_task_visibility_hours?: number
          p_task_completion_hours?: number
          p_skill_requirements?: string[]
          p_context_flags?: Json
          p_payment_method?: string
          p_task_photos?: string[]
        }
        Returns: Json
      }
      create_task_acceptance: {
        Args: { p_task_id: string; p_acceptor_id: string; p_message?: string }
        Returns: string
      }
      create_task_acceptance_enhanced: {
        Args: { p_task_id: string; p_acceptor_id: string; p_message?: string }
        Returns: Json
      }
      create_task_acceptance_notification: {
        Args:
          | {
              p_task_id: string
              p_acceptor_id: string
              p_message?: string
              p_conversation_id?: string
            }
          | { p_task_id: string; p_acceptance_id: string; p_message?: string }
        Returns: Json
      }
      create_task_acceptance_with_conversation: {
        Args: { p_task_id: string; p_acceptor_id: string; p_message?: string }
        Returns: {
          acceptance_id: string
          conversation_id: string
          notification_id: string
        }[]
      }
      create_task_acceptance_with_notification: {
        Args: { p_task_id: string; p_acceptor_id: string }
        Returns: Json
      }
      create_task_json: {
        Args: { p_task_data: Json }
        Returns: Json
      }
      create_task_json_secure: {
        Args: { p_data: Json }
        Returns: string
      }
      create_task_secure: {
        Args: {
          p_title: string
          p_description: string
          p_budget: number
          p_deadline?: string
          p_location?: Json
          p_categories?: string[]
          p_priority?: string
          p_urgent?: boolean
          p_building_name?: string
          p_locality?: string
          p_estimated_time?: number
          p_custom_time?: number
          p_task_visibility_hours?: number
          p_task_completion_hours?: number
          p_skill_requirements?: string[]
          p_context_flags?: Json
          p_payment_method?: string
          p_task_photos?: string[]
        }
        Returns: string
      }
      debug_task_acceptance_notifications: {
        Args: { p_task_id?: string }
        Returns: {
          message_id: string
          message_type: string
          notification_data: Json
          task_id: string
          conversation_id: string
          created_at: string
        }[]
      }
      ensure_conversation_for_task: {
        Args: { p_task_id: string; p_user_id?: string }
        Returns: string
      }
      extract_name_from_email: {
        Args: { email: string }
        Returns: string
      }
      generate_profile_name: {
        Args: { user_id: string }
        Returns: string
      }
      get_acceptance_conversation_id: {
        Args: { p_acceptance_id: string }
        Returns: string
      }
      get_complete_user_profile: {
        Args: { user_id: string }
        Returns: Json
      }
      get_conversation_participants_direct: {
        Args: { p_conversation_id: string }
        Returns: {
          participant_id: string
          user_id: string
          first_name: string
          last_name: string
          avatar_url: string
        }[]
      }
      get_conversation_task_acceptances: {
        Args: { p_conversation_id: string }
        Returns: {
          id: string
          conversation_id: string
          task_id: string
          task_title: string
          task_owner_id: string
          acceptance_id: string
          acceptor_id: string
          acceptor_name: string
          acceptor_avatar: string
          status: string
          message: string
          created_at: string
        }[]
      }
      get_pending_task_acceptances: {
        Args:
          | { p_user_id?: string }
          | { p_user_id?: string; p_limit?: number; p_offset?: number }
        Returns: {
          id: string
          task_id: string
          task_title: string
          acceptor_id: string
          acceptor_name: string
          acceptor_avatar: string
          status: string
          message: string
          conversation_id: string
          created_at: string
          is_task_owner: boolean
        }[]
      }
      get_raw_conversation_ids_for_user: {
        Args: { user_id_input: string }
        Returns: {
          id: string
        }[]
      }
      get_task_acceptance_notifications: {
        Args: { p_user_id?: string }
        Returns: {
          id: string
          conversation_id: string
          message_id: string
          task_id: string
          task_title: string
          acceptance_id: string
          acceptor_id: string
          acceptor_name: string
          acceptor_avatar: string
          status: string
          is_task_owner: boolean
          created_at: string
        }[]
      }
      get_task_acceptance_notifications_by_conversation: {
        Args: { p_conversation_id: string }
        Returns: {
          id: string
          conversation_id: string
          message_id: string
          task_id: string
          task_title: string
          acceptance_id: string
          acceptor_id: string
          acceptor_name: string
          acceptor_avatar: string
          status: string
          is_task_owner: boolean
          created_at: string
        }[]
      }
      get_task_acceptances: {
        Args: { p_task_id: string }
        Returns: {
          id: string
          task_id: string
          acceptor_id: string
          acceptor_first_name: string
          acceptor_avatar_url: string
          status: string
          message: string
          created_at: string
          updated_at: string
        }[]
      }
      get_task_acceptances_enhanced: {
        Args: { p_task_id: string }
        Returns: {
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
        }[]
      }
      get_task_notifications_for_conversation: {
        Args: { p_conversation_id: string }
        Returns: {
          acceptance_id: string | null
          acceptor_avatar: string | null
          acceptor_id: string | null
          acceptor_name: string | null
          content: string | null
          conversation_id: string | null
          created_at: string | null
          id: string | null
          notification_data: Json | null
          notification_type: string | null
          sender_id: string | null
          status: string | null
          task_id: string | null
          task_owner_id: string | null
          task_title: string | null
        }[]
      }
      get_tasks_with_pending_acceptances: {
        Args: { p_owner_id: string }
        Returns: {
          task_id: string
          task_title: string
          acceptance_count: number
        }[]
      }
      get_unread_message_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_conversations: {
        Args: { p_user_id?: string } | Record<PropertyKey, never>
        Returns: {
          id: string
          task_id: string
          created_at: string
          updated_at: string
          last_message: string
          last_message_at: string
          is_group: boolean
          name: string
          created_by: string
          has_notifications: boolean
          participant_ids: string[]
          participant_names: string[]
          unread_count: number
        }[]
      }
      get_user_created_tasks: {
        Args: { user_id: string }
        Returns: {
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
        }[]
      }
      get_user_task_acceptances: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          task_id: string
          task_title: string
          task_status: string
          task_owner_id: string
          task_owner_first_name: string
          task_owner_avatar_url: string
          acceptor_id: string
          status: string
          message: string
          created_at: string
          updated_at: string
        }[]
      }
      get_user_task_acceptances_enhanced: {
        Args: { p_user_id: string }
        Returns: {
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
        }[]
      }
      get_user_task_conversations: {
        Args: Record<PropertyKey, never>
        Returns: Json[]
      }
      get_user_task_conversations_v2: {
        Args: Record<PropertyKey, never>
        Returns: Json[]
      }
      get_user_task_conversations_v3: {
        Args: Record<PropertyKey, never>
        Returns: Json[]
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
      is_conversation_member: {
        Args: { conv_id: string; user_id?: string }
        Returns: boolean
      }
      mark_messages_as_read: {
        Args: { p_conversation_id: string; p_user_id?: string }
        Returns: boolean
      }
      mark_task_as_finished: {
        Args: { p_task_id: string; p_user_id: string }
        Returns: boolean
      }
      mark_task_finished: {
        Args: { p_task_id: string; p_user_id: string }
        Returns: boolean
      }
      respond_to_acceptance: {
        Args: { p_acceptance_id: string; p_status: string; p_message?: string }
        Returns: Json
      }
      respond_to_task_acceptance: {
        Args: {
          p_notification_id: string
          p_task_id: string
          p_user_id: string
          p_response: string
        }
        Returns: boolean
      }
      respond_to_task_acceptance_enhanced: {
        Args: { p_acceptance_id: string; p_status: string; p_message?: string }
        Returns: Json
      }
      respond_to_task_acceptance_notification: {
        Args: {
          p_acceptance_id: string
          p_status: string
          p_message?: string
          p_user_id?: string
        }
        Returns: Json
      }
      respond_to_task_acceptance_request: {
        Args: { p_acceptance_id: string; p_user_id: string; p_response: string }
        Returns: {
          success: boolean
          message: string
        }[]
      }
      respond_to_task_acceptance_v2: {
        Args: { p_acceptance_id: string; p_user_id: string; p_response: string }
        Returns: boolean
      }
      safely_add_conversation_participant: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: boolean
      }
      send_message: {
        Args: {
          p_conversation_id: string
          p_sender_id: string
          p_content: string
        }
        Returns: {
          id: string
          created_at: string
        }[]
      }
      send_message_with_attachments: {
        Args: {
          p_conversation_id: string
          p_content: string
          p_attachments: Json
        }
        Returns: Json
      }
      sync_user_metadata_to_profile: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      test_get_user_conversations: {
        Args: { test_user_id: string }
        Returns: Json[]
      }
      update_task_acceptance_in_chat: {
        Args: { p_message_id: string; p_status: string }
        Returns: boolean
      }
    }
    Enums: {
      task_status:
        | "draft"
        | "open"
        | "in_progress"
        | "pending"
        | "pending_acceptance"
        | "completed"
        | "cancelled"
      task_status_enum:
        | "pending"
        | "open"
        | "assigned"
        | "confirmed"
        | "completed"
        | "canceled"
        | "cancelled"
        | "public"
        | "accepted"
        | "pending_acceptance"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      task_status: [
        "draft",
        "open",
        "in_progress",
        "pending",
        "pending_acceptance",
        "completed",
        "cancelled",
      ],
      task_status_enum: [
        "pending",
        "open",
        "assigned",
        "confirmed",
        "completed",
        "canceled",
        "cancelled",
        "public",
        "accepted",
        "pending_acceptance",
      ],
    },
  },
} as const
