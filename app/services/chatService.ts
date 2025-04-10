import { supabase, getUserId, isAuthenticated, initializeAuth } from '../lib/supabase';
import { logger } from '../utils/logger';
import { Alert } from 'react-native';
import { router } from 'expo-router';

// Define types for chat entities
export interface Conversation {
  id: string;
  task_id?: string;
  task_title?: string;
  task_status?: string;
  is_task_owner?: boolean;
  last_message?: any;
  last_message_at?: string;
  unread_count: number;
  profiles?: Array<{
    id: string;
    first_name: string;
    last_name?: string;
    avatar_url?: string;
  }>;
  participants?: any[]; // For backward compatibility
  created_at?: string;
  updated_at?: string;
  is_group?: boolean;
  name?: string;
}

// Define enhanced task conversation interface
export interface TaskConversation {
  conversation_id: string;
  task_id: string;
  task_title: string;
  task_status: string;
  task_budget: number;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  task_categories?: string[];
  updated_at?: string;
  created_at?: string;
  is_task_owner?: boolean;
  notification_id?: string;
  notification_type?: string;
  notification_data?: any;
  task_owner_id?: string;
  acceptance_id?: string;
  acceptance_status?: 'pending' | 'confirmed' | 'rejected';
  conversation_id_real?: string;
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
  is_system_message?: boolean;
  is_notification?: boolean;
  notification_type?: string;
  notification_data?: any;
  sender?: {
    first_name?: string;
    avatar_url?: string;
  };
}

export interface TaskAcceptanceNotification {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string;
  task_id: string;
  task_title: string;
  status: string;
  created_at: string;
  notification_data?: any;
}

export interface TaskConversationsResult {
  tasksIDo: TaskConversation[];
  tasksIAssign: TaskConversation[];
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
          task:tasks!conversations_task_id_fkey(id, title, status, categories)
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
      
      // Get the conversation with a more specific query that avoids ambiguity
      const { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .select(`
          id,
          task_id,
          created_at,
          updated_at,
          last_message,
          last_message_at,
          is_group,
          name,
          conversation_participants!conversation_participants_conversation_id_fkey(
            user_id, 
            profile:profiles(
              id,
              first_name, 
              last_name,
              avatar_url
            )
          )
        `)
        .eq('id', conversationId)
        .single();
      
      if (conversationError) {
        logger.error('Error fetching conversation:', conversationError);
        throw conversationError;
      }
      
      // Initialize the conversation object with required fields
      const conversation: Conversation = {
        id: conversationData.id,
        task_id: conversationData.task_id,
        unread_count: 0,
        created_at: conversationData.created_at,
        updated_at: conversationData.updated_at,
        last_message: conversationData.last_message,
        last_message_at: conversationData.last_message_at,
        is_group: conversationData.is_group,
        name: conversationData.name,
        participants: conversationData.conversation_participants || [],
        profiles: [] // Will populate below
      };
      
      // Process participants to extract profiles safely
      if (Array.isArray(conversationData.conversation_participants)) {
        // Use a type-safe approach to extract profiles
        const validProfiles: Array<{
          id: string;
          first_name: string;
          last_name?: string;
          avatar_url?: string;
        }> = [];
        
        for (const participant of conversationData.conversation_participants) {
          if (!participant || !participant.user_id) continue;
          
          let profileData: any = null;
          
          // Handle both array and object formats for profile
          if (participant.profile) {
            if (Array.isArray(participant.profile) && participant.profile.length > 0) {
              profileData = participant.profile[0];
            } else if (typeof participant.profile === 'object') {
              profileData = participant.profile;
            }
          }
          
          if (profileData) {
            validProfiles.push({
              id: participant.user_id,
              first_name: profileData.first_name || '',
              last_name: profileData.last_name,
              avatar_url: profileData.avatar_url
            });
          }
        }
        
        conversation.profiles = validProfiles;
      }
      
      // If task_id exists, get task details in a separate query
      if (conversationData.task_id) {
        const { data: task, error: taskError } = await supabase
          .from('tasks')
          .select('id, title, status, categories, created_by')
          .eq('id', conversationData.task_id)
          .single();
        
        if (!taskError && task) {
          // Add task data to conversation
          conversation.task_title = task.title;
          conversation.task_status = task.status;
          // Check if current user is the task owner
          conversation.is_task_owner = task.created_by === userId;
        }
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
      
      // Calculate unread count and mark messages as read for the current user
      const unreadMessages = messagesData?.filter(message => 
        !message.is_read && message.sender_id !== userId
      ) || [];
      
      // Update unread count
      conversation.unread_count = unreadMessages.length;
      
      if (unreadMessages.length > 0) {
        // Update all unread messages that aren't from the current user
        const unreadIds = unreadMessages.map(msg => msg.id);
        
        // Mark as read in the database
        const { error: updateError } = await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadIds);
          
        if (updateError) {
          logger.error('Error marking messages as read:', updateError);
          // Continue anyway
        } else {
          // Update the messages in our local data
          messagesData?.forEach(msg => {
            if (unreadIds.includes(msg.id)) {
              msg.is_read = true;
            }
          });
          
          logger.log(`Marked ${unreadIds.length} messages as read`);
        }
      }
      
      return {
        conversation,
        messages: messagesData || [],
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
  
  // Get or create a conversation for a task
  async getOrCreateConversationForTask(
    taskId: string,
    taskOwnerId: string
  ): Promise<string> {
    try {
      logger.log('Checking if conversation exists for task:', taskId);
      
      // First, check if a conversation already exists for this task
      const { data: existingConv, error: findError } = await supabase
        .from('conversations')
        .select('id')
        .eq('task_id', taskId)
        .limit(1);
        
      if (findError) {
        logger.error('Error finding existing conversation:', findError);
        throw findError;
      }
      
      // If conversation exists, return its ID
      if (existingConv && existingConv.length > 0) {
        logger.log('Found existing conversation:', existingConv[0].id);
        
        // Check if current user is a participant in this conversation
        const userId = await this.getCurrentUserId();
        const { data: participants, error: partError } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', existingConv[0].id)
          .eq('user_id', userId);
          
        // If not a participant, add the current user
        if (!partError && (!participants || participants.length === 0)) {
          logger.log('Adding current user to existing conversation');
          await supabase
            .from('conversation_participants')
            .insert({
              conversation_id: existingConv[0].id,
              user_id: userId
            });
        }
        
        return existingConv[0].id;
      }
      
      // Get the task details to create a conversation
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('title')
        .eq('id', taskId)
        .single();
        
      if (taskError) {
        logger.error('Error fetching task details:', taskError);
        throw taskError;
      }
      
      // Create a new conversation
      return await this.createConversationSafely(
        taskId,
        taskOwnerId,
        taskData.title
      );
    } catch (error) {
      logger.error('Error in getOrCreateConversationForTask:', error);
      throw error;
    }
  }
  
  // Create a conversation safely (handling possible duplicates)
  async createConversationSafely(
    taskId: string, 
    taskOwnerId: string, 
    taskTitle: string
  ): Promise<string> {
    try {
      // Double-check if a conversation was created in the meantime
      const { data: checkAgain, error: checkError } = await supabase
        .from('conversations')
        .select('id')
        .eq('task_id', taskId)
        .limit(1);
        
      if (!checkError && checkAgain && checkAgain.length > 0) {
        logger.log('Conversation was created in the meantime:', checkAgain[0].id);
        return checkAgain[0].id;
      }
      
      // Get current user ID
      const userId = await this.getCurrentUserId();
      
      // Create the conversation first to avoid race conditions
      const { data: conversationData, error: convError } = await supabase
        .from('conversations')
        .insert({
          task_id: taskId,
          created_by: userId,
          is_group: false,
          name: `Task: ${taskTitle}`
        })
        .select('id')
        .single();
        
      if (convError) {
        // If we hit a duplicate constraint error, try to fetch the existing conversation
        if (convError.code === '23505') {
          logger.warn('Duplicate task_id constraint, fetching existing conversation');
          const { data: existingConv, error: fetchError } = await supabase
            .from('conversations')
            .select('id')
            .eq('task_id', taskId)
            .limit(1)
            .single();
            
          if (fetchError) {
            logger.error('Error fetching conversation after constraint error:', fetchError);
            throw fetchError;
          }
          
          return existingConv.id;
        }
        
        logger.error('Error creating conversation:', convError);
        throw convError;
      }
      
      // Now attempt to create profiles if needed before adding participants
      // This helps ensure the foreign key constraints won't fail
      const userIds = [userId, taskOwnerId].filter((id, index, self) => 
        id && self.indexOf(id) === index); // Unique IDs only
        
      for (const id of userIds) {
        // Check if profile exists
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', id)
          .single();
          
        if (profileError) {
          // Create a basic profile
          try {
            // Get user email directly from auth.users table instead of admin API
            const { data: userData, error: userError } = await supabase
              .from('auth.users')
              .select('email')
              .eq('id', id)
              .single();
              
            let defaultName = `User_${id.substring(0, 5)}`;
            let email = '';
            
            if (!userError && userData) {
              email = userData.email || '';
              if (email) {
                defaultName = email.split('@')[0];
              }
            }
            
            await supabase
              .from('profiles')
              .insert({
                id: id,
                first_name: defaultName,
                last_name: '',
                email: email,
                updated_at: new Date().toISOString()
              });
              
            logger.log(`Created profile for user ${id}`);
          } catch (err) {
            logger.warn(`Could not create profile for user ${id}, will try to add as participant anyway:`, err);
          }
        }
      }
      
      // Now try to add participants
      const participants = userIds.map(id => ({
        conversation_id: conversationData.id,
        user_id: id
      }));
      
      if (participants.length > 0) {
        try {
          await supabase
            .from('conversation_participants')
            .insert(participants);
            
          logger.log(`Added ${participants.length} participants to conversation`);
        } catch (partError) {
          logger.warn('Error adding participants, but conversation was created:', partError);
          // Continue without participants - the database trigger should handle this
        }
      }
      
      // Add a system message about the task acceptance
      try {
        await supabase
          .from('messages')
          .insert({
            conversation_id: conversationData.id,
            sender_id: userId,
            content: 'Task acceptance request sent',
            is_read: false,
            is_system_message: true,
            is_notification: true,
            notification_type: 'task_acceptance_request',
            notification_data: {
              task_id: taskId,
              task_title: taskTitle,
              acceptor_id: userId
            }
          });
          
        logger.log('Added system message to conversation');
      } catch (msgError) {
        logger.warn('Error adding system message, but conversation was created:', msgError);
        // Continue anyway as the conversation is created
      }
      
      return conversationData.id;
    } catch (error) {
      logger.error('Error in createConversationSafely:', error);
      throw error;
    }
  }
  
  // For backward compatibility
  async startTaskAcceptanceConversation(
    taskId: string, 
    taskOwnerId: string, 
    taskTitle: string
  ): Promise<string> {
    return this.createConversationSafely(taskId, taskOwnerId, taskTitle);
  }

  // Get task acceptance notifications in a conversation
  async getTaskAcceptanceNotifications(conversationId: string): Promise<TaskAcceptanceNotification[]> {
    try {
      // Use the database function to get task acceptance notifications
      const { data, error } = await supabase.rpc(
        'get_task_acceptance_notifications_by_conversation',
        { p_conversation_id: conversationId }
      );
      
      if (error) {
        logger.error('Error getting task acceptance notifications:', error);
        throw error;
      }
      
      return data || [];
    } catch (err) {
      logger.error('Error in getTaskAcceptanceNotifications:', err);
      throw err;
    }
  }
  
  // Create a task acceptance that integrates with the chat system
  async acceptTaskWithChat(taskId: string, message?: string): Promise<{ 
    success: boolean; 
    acceptanceId?: string;
    conversationId?: string;
    notificationId?: string;
    error?: string; 
  }> {
    try {
      const userId = await this.getCurrentUserId();
      
      // Call the function to create a task acceptance with conversation
      const { data, error } = await supabase.rpc('create_task_acceptance_with_conversation', {
        p_task_id: taskId,
        p_acceptor_id: userId,
        p_message: message || null
      });
      
      if (error) {
        logger.error('Error accepting task with chat:', error);
        return { success: false, error: error.message };
      }
      
      return { 
        success: true, 
        acceptanceId: data?.acceptance_id,
        conversationId: data?.conversation_id,
        notificationId: data?.notification_id
      };
    } catch (err: any) {
      logger.error('Error in acceptTaskWithChat:', err);
      return { success: false, error: err.message };
    }
  }
  
  // Update task acceptance status in chat (confirm or reject)
  async respondToTaskAcceptanceInChat(
    notificationId: string,
    acceptanceId: string,
    response: 'confirmed' | 'rejected'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const userId = await this.getCurrentUserId();
      
      // First try to update via direct database call instead of using taskAcceptanceService
      if (acceptanceId) {
        // Direct implementation instead of using taskAcceptanceService
        const { data, error } = await supabase.rpc('respond_to_task_acceptance', {
          p_acceptance_id: acceptanceId,
          p_status: response,
          p_message: response === 'confirmed' 
            ? 'Your application has been accepted! You can now start working on this task.'
            : 'Your application was declined. Please check other available tasks.'
        });
        
        if (error) {
          throw new Error(error.message || `Failed to ${response} task`);
        }
      } else {
        // Get the notification message details first
        const { data: msgData, error: msgError } = await supabase
          .from('messages')
          .select('notification_data, conversation_id')
          .eq('id', notificationId)
          .single();
          
        if (msgError) {
          logger.error('Error getting notification message:', msgError);
          throw msgError;
        }
        
        // Update the notification status in the message data
        const { error: updateError } = await supabase
          .from('messages')
          .update({
            notification_data: {
              ...msgData.notification_data,
              status: response
            }
          })
          .eq('id', notificationId);
          
        if (updateError) {
          logger.error('Error updating notification status:', updateError);
          throw updateError;
        }
        
        // Add a system message about the response
        const message = response === 'confirmed' 
          ? 'Task has been assigned. You can now begin working on it.'
          : 'Task request has been declined.';
          
        await this.sendSystemMessage(
          msgData.conversation_id,
          message
        );
        
        // If confirming, update the task status
        if (response === 'confirmed') {
          const taskId = msgData.notification_data.task_id;
          const applicantId = msgData.notification_data.accepter_id;
          
          if (taskId && applicantId) {
            const { error: taskError } = await supabase
              .from('tasks')
              .update({
                status: 'assigned',
                assigned_to: applicantId,
                assigned_at: new Date().toISOString(),
                has_pending_acceptances: false
              })
              .eq('id', taskId);
              
            if (taskError) {
              logger.error('Error updating task status:', taskError);
              throw taskError;
            }
          }
        }
      }
      
      return { success: true };
    } catch (err: any) {
      logger.error('Error in respondToTaskAcceptanceInChat:', err);
      return { success: false, error: err.message };
    }
  }
  
  // Send a system message in a conversation
  async sendSystemMessage(conversationId: string, content: string): Promise<Message> {
    try {
      const userId = await this.getCurrentUserId();
      
      // Insert the system message
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          content,
          is_system_message: true,
          is_read: false,
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      logger.error('Error sending system message:', error);
      throw error;
    }
  }

  /**
   * Fetches task conversations for the current user and categorizes them
   * into "Tasks To Do" (tasks the user is assigned) and "Tasks I Assign" (tasks owned by the user)
   */
  async getTaskConversations(): Promise<TaskConversationsResult> {
    try {
      console.log('Fetching task conversations from service');
      
      const userId = await getUserId();
      if (!userId) {
        throw new Error('User ID not found. Please log in to continue.');
      }
      
      // Use a direct Supabase query with properly specified foreign key references
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          task_id,
          last_message,
          last_message_at,
          updated_at,
          tasks!conversations_task_id_fkey ( 
            id, 
            title, 
            status, 
            budget, 
            created_by
          ),
          conversation_participants!conversation_participants_conversation_id_fkey (
            user_id, 
            profiles:profiles!conversation_participants_user_id_fkey(
              id,
              first_name, 
              last_name, 
              avatar_url
            )
          ),
          messages(
            id,
            is_read,
            sender_id,
            created_at
          )
        `)
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching task conversations:', error);
        
        // Try an alternative approach if the first query fails
        return await this.getTaskConversationsAlternative(userId);
      }
      
      console.log(`Received ${data?.length || 0} task conversations from database`);
      
      // Separate tasks into "to do" and "I assign" categories
      const tasksIDo: TaskConversation[] = [];
      const tasksIAssign: TaskConversation[] = [];
      
      // Process the results
      if (data && data.length > 0) {
        data.forEach((conv: any) => {
          // Get the task details
          const task = conv.tasks;
          const taskOwnerId = task?.created_by;
          
          // Find the other participant (not the current user)
          const otherParticipant = conv.conversation_participants.find(
            (p: any) => p.user_id !== userId
          );
          
          // Get the other user's profile information
          const otherUserProfile = otherParticipant?.profile;
          
          // Calculate unread messages count
          const unreadCount = (conv.messages || []).filter(
            (m: any) => !m.is_read && m.sender_id !== userId
          ).length;
          
          // Format the other user's name
          const firstName = otherUserProfile?.first_name || '';
          const lastName = otherUserProfile?.last_name || '';
          const otherUserName = firstName + (lastName ? ` ${lastName}` : '');
          
          // Create a TaskConversation object
          const taskConversation: TaskConversation = {
            conversation_id: conv.id,
            task_id: conv.task_id,
            task_title: task?.title || 'Unknown Task',
            task_status: task?.status || 'unknown',
            task_budget: task?.budget || 0,
            task_owner_id: taskOwnerId,
            other_user_id: otherParticipant?.user_id || '',
            other_user_name: otherUserName || 'Unknown User',
            other_user_avatar: otherUserProfile?.avatar_url || null,
            last_message: conv.last_message,
            last_message_at: conv.last_message_at,
            unread_count: unreadCount,
            is_task_owner: taskOwnerId === userId
          };
          
          // Categorize the task based on ownership
          if (taskOwnerId === userId) {
            tasksIAssign.push(taskConversation);
          } else {
            tasksIDo.push(taskConversation);
          }
        });
      }
      
      console.log(`Categorized ${tasksIDo.length} tasks to do and ${tasksIAssign.length} tasks I assign`);
      
      return { tasksIDo, tasksIAssign };
    } catch (error: any) {
      console.error('ChatService.getTaskConversations error:', error);
      throw error;
    }
  }
  
  // Alternative method for getting task conversations if the main method fails
  private async getTaskConversationsAlternative(userId: string): Promise<TaskConversationsResult> {
    try {
      console.log('Using alternative method to fetch task conversations');
      
      // Get direct task data instead of using the profiles relationship
      // First get tasks where user is assigned (Tasks To Do)
      const { data: assignedTasks, error: assignedError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          status,
          budget,
          created_by
        `)
        .eq('assigned_to', userId)
        .not('status', 'in', '("completed","finished")') // Exclude completed and finished tasks
        .order('updated_at', { ascending: false });
        
      if (assignedError) {
        console.error('Error fetching assigned tasks:', assignedError);
        throw assignedError;
      }
      
      // Then get tasks created by user (Tasks I Assign)
      const { data: ownedTasks, error: ownedError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          status,
          budget,
          created_by,
          assigned_to
        `)
        .eq('created_by', userId)
        .not('assigned_to', 'is', null)
        .not('status', 'in', '("completed","finished")') // Exclude completed and finished tasks
        .order('updated_at', { ascending: false });
        
      if (ownedError) {
        console.error('Error fetching owned tasks:', ownedError);
        throw ownedError;
      }
      
      // Get profiles for all users we need to display
      const userIdsToFetch = new Set<string>();
      
      // Add creators of assigned tasks
      assignedTasks?.forEach(task => {
        if (task.created_by) userIdsToFetch.add(task.created_by);
      });
      
      // Add assignees of owned tasks
      ownedTasks?.forEach(task => {
        if (task.assigned_to) userIdsToFetch.add(task.assigned_to);
      });
      
      // Convert Set to array
      const userIds = Array.from(userIdsToFetch);
      
      // Fetch all profiles in one query
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', userIds);
        
      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
      }
      
      // Create a map for quick profile lookup
      const profileMap: Record<string, any> = {};
      profiles?.forEach(profile => {
        profileMap[profile.id] = profile;
      });
      
      console.log(`Retrieved ${assignedTasks?.length || 0} assigned tasks and ${ownedTasks?.length || 0} owned tasks`);
      
      // Utility function to safely get user data
      const getUserData = (userId: string) => {
        const profile = profileMap[userId] || {};
        return {
          name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown User',
          avatar: profile.avatar_url || null
        };
      };
      
      // Convert assigned tasks to TaskConversation format
      const tasksIDo: TaskConversation[] = (assignedTasks || []).map(task => {
        const taskOwner = getUserData(task.created_by);
        
        return {
          conversation_id: `task_${task.id}`, // Generate a virtual conversation ID
          task_id: task.id,
          task_title: task.title || 'Unknown Task',
          task_status: task.status || 'unknown',
          task_budget: task.budget || 0,
          task_owner_id: task.created_by,
          other_user_id: task.created_by || '',
          other_user_name: taskOwner.name,
          other_user_avatar: taskOwner.avatar,
          last_message: null,
          last_message_at: null,
          unread_count: 0,
          is_task_owner: false
        };
      });
      
      // Convert owned tasks to TaskConversation format
      const tasksIAssign: TaskConversation[] = (ownedTasks || []).map(task => {
        const assignee = getUserData(task.assigned_to);
        
        return {
          conversation_id: `task_${task.id}`, // Generate a virtual conversation ID
          task_id: task.id,
          task_title: task.title || 'Unknown Task',
          task_status: task.status || 'unknown',
          task_budget: task.budget || 0,
          task_owner_id: task.created_by,
          other_user_id: task.assigned_to || '',
          other_user_name: assignee.name,
          other_user_avatar: assignee.avatar,
          last_message: null,
          last_message_at: null,
          unread_count: 0,
          is_task_owner: true
        };
      });
      
      return { tasksIDo, tasksIAssign };
    } catch (error) {
      console.error('Error in getTaskConversationsAlternative:', error);
      // Return empty arrays if all else fails
      return { tasksIDo: [], tasksIAssign: [] };
    }
  }

  /**
   * Get task conversations for the current user
   * Uses the v3 stored procedure for better message and profile data
   * 
   * NOTE: We deliberately keep tasks with 'finished' status in the chat list
   * and only filter out tasks with 'completed' status.
   * This ensures tasks remain visible until the Poster confirms completion,
   * allowing them to review and confirm the task is done.
   */
  async getTaskConversationsV2(): Promise<Conversation[]> {
    try {
      logger.log('Fetching task conversations with v3 function');
      
      // First, ensure we have a valid user ID to avoid auth errors
      let userId: string | null = null;
      try {
        userId = await this.getCurrentUserId();
        if (!userId) {
          logger.error('No user ID found in getTaskConversationsV2');
          throw new Error('Authentication failed: No user ID found');
        }
      } catch (authError) {
        logger.error('Authentication error in getTaskConversationsV2:', authError);
        throw authError; // Re-throw auth errors to trigger login flow
      }
      
      // Try the v3 stored procedure first
      try {
        const { data, error } = await supabase.rpc('get_user_task_conversations_v3');
        
        if (error) {
          logger.error('Error using get_user_task_conversations_v3:', error);
          // Fall back to direct query if RPC fails
          return await this.getTaskConversationsDirectQuery();
        }
        
        // Only filter out completed tasks, keep finished tasks visible
        // This ensures conversations remain visible until the Poster confirms completion
        const filteredData = (data || []).filter(
          (conv: Conversation) => conv.task_status !== 'completed'
        );
        
        return filteredData;
      } catch (rpcError) {
        logger.error('Exception calling get_user_task_conversations_v3:', rpcError);
        // Fall back to direct query if RPC throws exception
        return await this.getTaskConversationsDirectQuery();
      }
    } catch (error) {
      // Only throw authentication errors, all other errors should return empty array
      if (error instanceof Error && 
          (error.message.includes('Authentication failed') || 
           error.message.includes('log in'))) {
        throw error;
      }
      
      logger.error('Error in getTaskConversationsV2:', error);
      return [];
    }
  }
  
  /**
   * Fallback method to get conversations directly from the database
   * Used when the stored procedure fails
   * 
   * NOTE: We deliberately keep tasks with 'finished' status in the chat list
   * and only filter out tasks with 'completed' status.
   * This ensures tasks remain visible until the Poster confirms completion.
   */
  private async getTaskConversationsDirectQuery(): Promise<Conversation[]> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        logger.error('No user ID found in getTaskConversationsDirectQuery');
        return [];
      }
      
      // Directly query the database with properly specified joins
      // Only exclude 'completed' tasks, keep 'finished' tasks visible
      // This ensures conversations remain visible until the Poster confirms completion
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          task_id,
          created_at,
          updated_at,
          last_message,
          last_message_at,
          tasks:task_id (
            id, 
            title, 
            status, 
            created_by, 
            assigned_to
          ),
          conversation_participants (
            user_id,
            profiles:user_id (
              id, 
              first_name, 
              last_name, 
              avatar_url
            )
          )
        `)
        .or(`conversation_participants.user_id.eq.${userId}`)
        .not('tasks.status', 'in', '("completed")'); // Only filter out completed tasks
      
      if (error) {
        logger.error('Error in direct query for conversations:', error);
        return [];
      }
      
      // Process the data to match the expected Conversation format
      return (data || []).map((conv: any) => {
        // Use 'any' type to bypass TypeScript errors
        const taskData: any = conv.tasks || {};
        const isTaskOwner = taskData.created_by === userId;
        
        // Filter to get other participants (not the current user)
        const otherParticipants = ((conv.conversation_participants || []) as any[])
          .filter(p => p.user_id !== userId)
          .map(p => {
            // Extract profile data as 'any'
            const profileData: any = Array.isArray(p.profiles) 
              ? (p.profiles.length > 0 ? p.profiles[0] : {}) 
              : (p.profiles || {});
            
            return {
              id: p.user_id,
              first_name: profileData.first_name || '',
              last_name: profileData.last_name || '',
              avatar_url: profileData.avatar_url
            };
          });
        
        return {
          id: conv.id,
          task_id: conv.task_id,
          task_title: taskData.title || '',
          task_status: taskData.status || 'pending',
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          last_message: conv.last_message,
          last_message_at: conv.last_message_at,
          is_task_owner: isTaskOwner,
          unread_count: 0, // Default since we can't calculate this easily
          profiles: otherParticipants
        };
      });
    } catch (error) {
      logger.error('Error in getTaskConversationsDirectQuery:', error);
      return [];
    }
  }

  /**
   * Creates a task acceptance notification
   * @param taskId - The ID of the task
   * @param acceptanceId - The ID of the task acceptance
   * @param message - Optional message to include
   * @returns Success status and message
   */
  async createTaskAcceptanceNotification(
    taskId: string,
    acceptanceId: string,
    message?: string
  ): Promise<{ success: boolean; error?: string; conversationId?: string }> {
    try {
      logger.log(`Creating task acceptance notification for task ${taskId} and acceptance ${acceptanceId}`);
      
      const { data, error } = await supabase.rpc(
        'create_task_acceptance_notification',
        {
          p_task_id: taskId,
          p_acceptance_id: acceptanceId,
          p_message: message
        }
      );
      
      if (error) {
        logger.error('Error creating task acceptance notification:', error);
        return { success: false, error: error.message };
      }
      
      return { 
        success: true, 
        conversationId: data.conversation_id
      };
    } catch (error) {
      logger.error('Error in createTaskAcceptanceNotification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  }

  /**
   * Responds to a task acceptance notification (confirm/reject)
   * @param acceptanceId - The ID of the task acceptance
   * @param status - The new status (confirmed/rejected)
   * @param message - Optional message to include
   * @returns Success status and message
   */
  async respondToTaskAcceptanceNotification(
    acceptanceId: string,
    status: 'confirmed' | 'rejected',
    message?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Use RPC to update the acceptance status
      const { data, error } = await supabase.rpc('respond_to_task_acceptance', {
        p_acceptance_id: acceptanceId,
        p_status: status,
        p_message: message || (status === 'confirmed' 
          ? 'Your application has been accepted! You can now start working on this task.'
          : 'Your application was declined. Please check other available tasks.')
      });
      
      if (error) {
        logger.error('Error responding to task acceptance:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (err: any) {
      logger.error('Error in respondToTaskAcceptanceNotification:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Ensures a conversation exists for a task and returns its ID
   * Creates a new conversation if one doesn't exist
   */
  async ensureConversationForTask(taskId: string): Promise<string> {
    try {
      logger.log(`Ensuring conversation exists for task ${taskId}`);
      
      const { data, error } = await supabase.rpc(
        'ensure_conversation_for_task',
        { p_task_id: taskId }
      );
      
      if (error) {
        logger.error('Error ensuring conversation for task:', error);
        throw error;
      }
      
      logger.log(`Conversation confirmed with ID: ${data}`);
      return data;
    } catch (error: any) {
      logger.error('Error in ensureConversationForTask:', error);
      throw error;
    }
  }

  // Get task applications (pending acceptances)
  async getTaskApplications(): Promise<TaskConversation[]> {
    try {
      // Use RPC to get task applications
      const { data, error } = await supabase.rpc('get_task_applications');
      
      if (error) {
        logger.error('Error fetching task applications:', error);
        throw error;
      }
      
      // Filter out applications for completed or finished tasks
      // For applications, we remove both completed AND finished tasks
      // because applications are no longer relevant once a task has been assigned
      // and marked as finished or completed
      const filteredApplications = (data || []).filter(
        (app: any) => app.task_status !== 'completed' && app.task_status !== 'finished'
      );
      
      return filteredApplications;
    } catch (err) {
      logger.error('Error in getTaskApplications:', err);
      return []; // Return empty array instead of throwing, to avoid breaking UI
    }
  }
}

// Export a singleton instance
export const chatService = new ChatService(); 

// Add default export
export default chatService; 