import { supabase, getUserId, isAuthenticated, initializeAuth } from '../lib/supabase';
import { logger } from '../utils/logger';
import { Alert } from 'react-native';
import { router } from 'expo-router';

// Define types for chat entities
export interface Conversation {
  id: string;
  task_id: string;
  created_at: string;
  updated_at: string;
  last_message?: string;
  last_message_at?: string;
  participants?: any[];
  conversation_participants?: any[];
  task?: any;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  profile?: any;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  sender?: any;
}

export class ChatService {
  // Helper method to get current user ID with proper error handling
  async getCurrentUserId(): Promise<string> {
    try {
      // First ensure auth is initialized
      await initializeAuth();
      
      // Check if user is authenticated
      const isAuth = await isAuthenticated();
      if (!isAuth) {
        logger.error('Authentication check failed');
        throw new Error('Authentication failed');
      }
      
      const userId = await getUserId();
      
      if (!userId) {
        logger.error('Authentication error: No user session found');
        throw new Error('Please log in to continue. Your session may have expired.');
      }
      
      return userId;
    } catch (error) {
      logger.error('Error in getCurrentUserId:', error);
      
      // Forward the error to the calling method instead of showing alert here
      // This way the UI can handle auth errors more gracefully
      throw new Error('Authentication failed. Please log in again.');
    }
  }

  // Get all conversations for the current user
  async getConversations(): Promise<Conversation[]> {
    try {
      // Get current user ID using the helper method
      const userId = await this.getCurrentUserId();
      
      // Get all conversations where the user is a participant
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_participants!inner(user_id, profile:profiles(first_name, avatar_url)),
          task:tasks(id, title, status, categories)
        `)
        .eq('conversation_participants.user_id', userId)
        .order('updated_at', { ascending: false });
      
      if (error) {
        logger.error('Database query error in getConversations:', error);
        throw error;
      }

      // Check if data is valid
      if (!data || !Array.isArray(data)) {
        logger.error('Invalid conversation data returned:', data);
        return [];
      }

      // For each conversation, get the other participant
      const conversations = data.map((conversation: any) => {
        try {
          // Filter out participants that aren't the current user
          const otherParticipants = conversation.conversation_participants?.filter(
            (p: any) => p.user_id !== userId
          ) || [];
          
          return {
            ...conversation,
            participants: otherParticipants, // Keep 'participants' for backward compatibility
          };
        } catch (err) {
          logger.error('Error processing conversation:', err);
          // Return the conversation without filtering participants if there's an error
          return conversation;
        }
      });
      
      return conversations;
    } catch (error) {
      logger.error('Error getting conversations:', error);
      // Re-throw the error to be handled by the UI
      throw error;
    }
  }
  
  // Get a single conversation with its messages
  async getConversationWithMessages(conversationId: string): Promise<{ conversation: Conversation, messages: Message[] }> {
    try {
      // Get current user ID using helper method
      const userId = await this.getCurrentUserId();
      
      // Get the conversation
      const { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_participants(user_id, profile:profiles(first_name, avatar_url)),
          task:tasks(id, title, status, categories)
        `)
        .eq('id', conversationId)
        .single();
      
      if (conversationError) {
        logger.error('Error fetching conversation:', conversationError);
        throw conversationError;
      }
      
      // Get the messages for this conversation
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(first_name, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (messagesError) {
        logger.error('Error fetching messages:', messagesError);
        throw messagesError;
      }
      
      // For backward compatibility with the UI
      if (conversationData && conversationData.conversation_participants) {
        conversationData.participants = conversationData.conversation_participants;
      }
      
      return {
        conversation: conversationData,
        messages: messagesData,
      };
    } catch (error) {
      logger.error('Error getting conversation with messages:', error);
      throw error;
    }
  }
  
  // Send a message in a conversation
  async sendMessage(conversationId: string, content: string): Promise<Message> {
    try {
      // Get current user ID using helper method
      const userId = await this.getCurrentUserId();
      
      // First, update the conversation's last message and last_message_at
      const { error: updateError } = await supabase
        .from('conversations')
        .update({
          last_message: content,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);
      
      if (updateError) {
        throw updateError;
      }
      
      // Then, insert the new message
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          content,
          is_read: false,
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error;
    }
  }
  
  // Mark all messages in a conversation as read
  async markMessagesAsRead(conversationId: string): Promise<void> {
    try {
      // Get current user ID using helper method
      const userId = await this.getCurrentUserId();
      
      // Update all unread messages sent by other users
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .eq('is_read', false);
      
      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Error marking messages as read:', error);
      throw error;
    }
  }
  
  // Create a new conversation for a task
  async createConversation(taskId: string, taskPosterId: string): Promise<string> {
    try {
      // Get current user ID using helper method
      const userId = await this.getCurrentUserId();
      
      logger.info(`Creating conversation for task ${taskId} between ${userId} and ${taskPosterId}`);
      
      // Create a new conversation
      const { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          task_id: taskId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (conversationError) {
        logger.error('Error creating conversation:', conversationError);
        throw conversationError;
      }
      
      // Add participants to the conversation
      const participants = [
        { user_id: userId, conversation_id: conversationData.id },
        { user_id: taskPosterId, conversation_id: conversationData.id }
      ];
      
      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert(participants);
      
      if (participantsError) {
        logger.error('Error adding participants:', participantsError);
        throw participantsError;
      }
      
      return conversationData.id;
    } catch (error) {
      logger.error('Error creating conversation:', error);
      throw error;
    }
  }
  
  // Function to get or create a conversation when a task is accepted
  async getOrCreateConversationForTask(taskId: string, taskOwnerId: string): Promise<string> {
    try {
      const userId = await this.getCurrentUserId();
      
      // Check if a conversation already exists for this task between these users
      const { data: existingConversations, error: queryError } = await supabase
        .from('conversations')
        .select(`
          id,
          conversation_participants!inner(user_id)
        `)
        .eq('task_id', taskId)
        .eq('conversation_participants.user_id', userId);
        
      if (queryError) throw queryError;
      
      // If a conversation exists, return its ID
      if (existingConversations && existingConversations.length > 0) {
        // Verify the task owner is also in this conversation
        for (const conv of existingConversations) {
          const { data: participants, error: participantsError } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conv.id);
            
          if (participantsError) throw participantsError;
          
          const participantIds = participants.map(p => p.user_id);
          if (participantIds.includes(taskOwnerId)) {
            return conv.id;
          }
        }
      }
      
      // If no conversation exists, create one
      return await this.createConversation(taskId, taskOwnerId);
    } catch (error) {
      logger.error('Error getting or creating conversation:', error);
      throw error;
    }
  }
  
  // Function to start a conversation with first message when task is accepted
  async startTaskAcceptanceConversation(taskId: string, taskOwnerId: string, taskTitle: string): Promise<string> {
    try {
      // Get or create the conversation
      const conversationId = await this.getOrCreateConversationForTask(taskId, taskOwnerId);
      
      // Send the initial message
      await this.sendMessage(
        conversationId, 
        `I've accepted your task "${taskTitle}". I'm ready to help!`
      );
      
      return conversationId;
    } catch (error) {
      logger.error('Error starting task acceptance conversation:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const chatService = new ChatService(); 

// Add default export
export default chatService; 