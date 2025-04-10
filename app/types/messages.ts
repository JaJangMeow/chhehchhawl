/**
 * Message type definitions
 */

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  is_notification?: boolean;
  notification_type?: string;
  notification_data?: any;
  is_system_message?: boolean;
  sender?: {
    first_name?: string;
    avatar_url?: string;
  };
}

export interface MessageGroup {
  senderId: string | null;
  messages: Message[];
  showAvatar: boolean;
  isUnreadIndicator?: boolean;
  unreadCount?: number;
}

// Explicitly export default empty object to prevent treating as route
export default {}; 