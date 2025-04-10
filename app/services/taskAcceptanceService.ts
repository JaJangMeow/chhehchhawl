import { supabase, getUserId, isAuthenticated } from '../lib/supabase';
import { logger } from '../utils/logger';
import { Alert } from 'react-native';
import { router } from 'expo-router';

// Types for task acceptances
export interface TaskAcceptance {
  id: string;
  task_id: string;
  task_title?: string;
  acceptor_id: string;
  acceptor_first_name?: string;
  acceptor_avatar_url?: string;
  task_owner_id?: string;
  task_owner_first_name?: string;
  status: 'pending' | 'confirmed' | 'rejected';
  message?: string;
  response_message?: string;
  created_at: string;
  updated_at: string;
}

export type AcceptanceStatus = 'pending' | 'confirmed' | 'rejected';

// Subset of data needed for displaying in UI
export interface AcceptancePreview {
  id: string;
  task_id: string;
  task_title: string;
  acceptor_id: string;
  acceptor_first_name: string;
  acceptor_avatar_url?: string;
  status: AcceptanceStatus;
  created_at: string;
}

export interface TaskAcceptanceNotification {
  id: string;
  task_acceptance_id: string;
  user_id: string;
  is_read: boolean;
  created_at: string;
}

// Interface for user's acceptance summary
export interface UserAcceptanceSummary {
  id: string;
  task_id: string;
  task_title?: string;
  acceptor_id?: string;
  acceptor_first_name?: string;
  acceptor_avatar_url?: string;
  task_owner_id?: string;
  task_owner_first_name?: string;
  status: AcceptanceStatus;
  created_at: string;
  updated_at: string;
  is_task_owner: boolean;
}

export class TaskAcceptanceService {
  // Helper method to get current user ID with proper error handling
  async getCurrentUserId(): Promise<string> {
    try {
      if (!await isAuthenticated()) {
        logger.warn('User not authenticated in task acceptance service');
        router.replace('/auth/sign-in' as any);
        throw new Error('Authentication required');
      }
      
      const userId = await getUserId();
      if (!userId) throw new Error('User ID not found');
      
      return userId;
    } catch (err) {
      logger.error('Error getting current user ID:', err);
      throw err;
    }
  }
  
  // Accept a task
  async acceptTask(taskId: string, message?: string): Promise<{ 
    success: boolean; 
    message: string;
    acceptanceId?: string;
    error?: string; 
  }> {
    try {
      const userId = await this.getCurrentUserId();
      
      // Call the function to create a task acceptance
      const { data, error } = await supabase.rpc('create_task_acceptance_enhanced', {
        p_task_id: taskId,
        p_acceptor_id: userId,
        p_message: message
      });
      
      if (error) {
        logger.error('Error accepting task:', error);
        return { 
          success: false, 
          message: error.message || 'Failed to accept task. Please try again.',
          error: error.message
        };
      }
      
      if (data && data.success === false) {
        return { 
          success: false, 
          message: data.message || 'Could not accept task',
          error: data.message
        };
      }
      
      return { 
        success: true, 
        message: data?.message || 'Task accepted successfully',
        acceptanceId: data?.acceptance_id
      };
    } catch (err: any) {
      logger.error('Error in acceptTask:', err);
      return { 
        success: false, 
        message: 'An unexpected error occurred. Please try again.',
        error: err.message
      };
    }
  }
  
  // Respond to a task acceptance request (confirm or reject)
  async respondToAcceptance(
    acceptanceId: string,
    status: 'confirmed' | 'rejected',
    message?: string
  ): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const userId = await this.getCurrentUserId();
      
      // Call the function to respond to a task acceptance
      const { data, error } = await supabase.rpc('respond_to_task_acceptance_enhanced', {
        p_acceptance_id: acceptanceId,
        p_status: status,
        p_message: message
      });
      
      if (error) {
        logger.error('Error responding to task acceptance:', error);
        return { 
          success: false, 
          message: error.message || `Failed to ${status} task acceptance. Please try again.`,
          error: error.message
        };
      }
      
      if (data && data.success === false) {
        return { 
          success: false, 
          message: data.message || 'Could not update acceptance',
          error: data.message
        };
      }
      
      return { 
        success: true, 
        message: data?.message || `Task acceptance ${status} successfully`
      };
    } catch (err: any) {
      logger.error('Error in respondToAcceptance:', err);
      return { 
        success: false, 
        message: 'An unexpected error occurred. Please try again.',
        error: err.message
      };
    }
  }
  
  // Get acceptances for a specific task
  async getTaskAcceptances(taskId: string): Promise<TaskAcceptance[]> {
    try {
      const userId = await this.getCurrentUserId();
      
      // Call the function to get task acceptances
      const { data, error } = await supabase.rpc('get_task_acceptances_enhanced', {
        p_task_id: taskId
      });
      
      if (error) {
        logger.error('Error getting task acceptances:', error);
        throw error;
      }
      
      return data || [];
    } catch (err: any) {
      logger.error('Error in getTaskAcceptances:', err);
      throw err;
    }
  }

  // Get all acceptances for tasks owned by the current user
  async getTaskOwnerAcceptances(): Promise<TaskAcceptance[]> {
    try {
      const userId = await this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('task_acceptances')
        .select(`
          id,
          task_id,
          task_title,
          acceptor_id,
          acceptor_first_name,
          acceptor_avatar_url,
          task_owner_id,
          task_owner_first_name,
          status,
          message,
          response_message,
          created_at,
          updated_at
        `)
        .eq('task_owner_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) {
        logger.error('Error getting owned task acceptances:', error);
        throw error;
      }
      
      return data || [];
    } catch (err) {
      logger.error('Error in getTaskOwnerAcceptances:', err);
      throw err;
    }
  }
  
  // Get all acceptances made by the current user
  async getUserAcceptances(): Promise<TaskAcceptance[]> {
    try {
      const userId = await this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('task_acceptances')
        .select(`
          id,
          task_id,
          task_title,
          acceptor_id,
          acceptor_first_name,
          acceptor_avatar_url,
          task_owner_id,
          task_owner_first_name,
          status,
          message,
          response_message,
          created_at,
          updated_at
        `)
        .eq('acceptor_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) {
        logger.error('Error getting user acceptances:', error);
        throw error;
      }
      
      return data || [];
    } catch (err) {
      logger.error('Error in getUserAcceptances:', err);
      throw err;
    }
  }
  
  // Get all acceptances for the current user (both as task owner and acceptor)
  async getAllUserAcceptances(): Promise<UserAcceptanceSummary[]> {
    try {
      const userId = await this.getCurrentUserId();
      
      // Get acceptances for tasks owned by the user
      const ownedTaskAcceptances = await this.getTaskOwnerAcceptances();
      
      // Get acceptances made by the user
      const userAcceptances = await this.getUserAcceptances();
      
      // Mark acceptances with whether the current user is the task owner
      const formattedOwnedAcceptances = ownedTaskAcceptances.map(acceptance => ({
        ...acceptance,
        is_task_owner: true
      }));
      
      const formattedUserAcceptances = userAcceptances.map(acceptance => ({
        ...acceptance,
        is_task_owner: false
      }));
      
      // Combine and sort by date
      const allAcceptances = [
        ...formattedOwnedAcceptances, 
        ...formattedUserAcceptances
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      return allAcceptances;
    } catch (err) {
      logger.error('Error in getAllUserAcceptances:', err);
      throw err;
    }
  }
  
  // Check if a task has pending acceptances
  async hasTaskPendingAcceptances(taskId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('task_acceptances')
        .select('id')
        .eq('task_id', taskId)
        .eq('status', 'pending')
        .limit(1);
        
      if (error) {
        logger.error('Error checking for pending acceptances:', error);
        throw error;
      }
      
      return (data?.length || 0) > 0;
    } catch (err) {
      logger.error('Error in hasTaskPendingAcceptances:', err);
      return false;
    }
  }
  
  // Subscribe to task acceptance updates
  subscribeToTaskAcceptanceUpdates(
    callback: () => void
  ): { unsubscribe: () => void } {
    try {
      // Create a real-time subscription to the task_acceptances table
      getUserId().then(userId => {
        if (!userId) return;
        
        const subscription = supabase
          .channel('task-acceptances-channel')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'task_acceptances',
            filter: `acceptor_id=eq.${userId}`,
          }, callback)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'task_acceptances',
            filter: `task_owner_id=eq.${userId}`,
          }, callback)
          .subscribe();
          
        return {
          unsubscribe: () => {
            subscription.unsubscribe();
          }
        };
      });
      
      // Return a function to unsubscribe
      return {
        unsubscribe: () => {
          // Default empty function if the subscription hasn't been created yet
        }
      };
    } catch (err) {
      logger.error('Error setting up task acceptance subscription:', err);
      return {
        unsubscribe: () => {}
      };
    }
  }

  // Get tasks with pending acceptances for the current user
  async getTasksWithPendingAcceptances(): Promise<{ taskId: string; taskTitle: string; count: number }[]> {
    try {
      const userId = await this.getCurrentUserId();
      
      if (!userId) {
        logger.error('No user ID found when fetching tasks with pending acceptances');
        return [];
      }

      // Query to get tasks owned by the current user that have pending acceptances
      const { data, error } = await supabase
        .from('task_acceptances')
        .select(`
          task_id,
          tasks!inner (
            title
          )
        `)
        .eq('task_owner_id', userId)
        .eq('status', 'pending');
        
      if (error) {
        logger.error('Error fetching tasks with pending acceptances:', error);
        throw error;
      }
      
      // Group by task and count
      const tasksMap = new Map<string, { taskId: string; taskTitle: string; count: number }>();
      
      data.forEach((acceptance) => {
        const taskId = acceptance.task_id;
        const taskTitle = (acceptance.tasks as any[])?.[0]?.title || 'Unknown Task';
        
        if (tasksMap.has(taskId)) {
          const existing = tasksMap.get(taskId)!;
          tasksMap.set(taskId, {
            ...existing,
            count: existing.count + 1
          });
        } else {
          tasksMap.set(taskId, {
            taskId,
            taskTitle,
            count: 1
          });
        }
      });
      
      return Array.from(tasksMap.values());
    } catch (err) {
      logger.error('Error in getTasksWithPendingAcceptances:', err);
      return [];
    }
  }

  // Accept a task with notification in chat
  async acceptTaskWithChatNotification(
    taskId: string,
    message?: string
  ): Promise<{ 
    success: boolean; 
    message?: string; 
    acceptanceId?: string;
    conversationId?: string;
    error?: string;
  }> {
    try {
      logger.log(`Accepting task ${taskId} with chat notification`);
      
      const userId = await this.getCurrentUserId();
      
      // Check if task exists and is available
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('created_by, assigned_to, status')
        .eq('id', taskId)
        .single();
        
      if (taskError) {
        logger.error('Error fetching task:', taskError);
        return { 
          success: false, 
          message: 'Task not found', 
          error: 'Task not found'
        };
      }
      
      // Check if user is trying to accept their own task
      if (taskData.created_by === userId) {
        return { 
          success: false, 
          message: 'You cannot accept your own task', 
          error: 'You cannot accept your own task'
        };
      }
      
      // Check if task is already assigned
      if (taskData.assigned_to) {
        // If it's already assigned to the current user, return success with appropriate message
        if (taskData.assigned_to === userId) {
          // Try to get the conversation ID for this task
          const { data: convoData } = await supabase
            .from('conversations')
            .select('id')
            .eq('task_id', taskId)
            .single();
            
          return { 
            success: true, 
            message: 'You have already accepted this task', 
            conversationId: convoData?.id,
            error: 'This task is already assigned to you'
          };
        }
        
        return { 
          success: false, 
          message: 'This task has already been assigned to someone else', 
          error: 'This task has already been assigned to someone else'
        };
      }
      
      // Use the rpc function instead of direct insert
      const { data, error } = await supabase.rpc('accept_task_and_create_conversation_v2', {
        p_task_id: taskId,
        p_user_id: userId,
        p_message: message || null
      });
      
      if (error) {
        logger.error('Error accepting task:', error);
        // Try fallback method if the v2 function doesn't exist
        if (error.code === 'PGRST116') {
          try {
            // Create the task acceptance directly 
            const { data: acceptanceData, error: acceptanceError } = await supabase
              .from('task_acceptances')
              .insert({
                task_id: taskId,
                acceptor_id: userId,
                task_owner_id: taskData.created_by,
                status: 'pending',
                message: message || null
              })
              .select('id')
              .single();
              
            if (acceptanceError) {
              logger.error('Error creating task acceptance directly:', acceptanceError);
              return { 
                success: false, 
                message: 'Failed to accept task', 
                error: acceptanceError.message 
              };
            }
            
            return {
              success: true,
              message: 'Task application submitted successfully',
              acceptanceId: acceptanceData.id
            };
          } catch (fallbackError) {
            logger.error('Error in fallback acceptance method:', fallbackError);
            return { 
              success: false, 
              message: 'Failed to accept task. Please try again later.', 
              error: 'Server error'
            };
          }
        }
        
        return { 
          success: false, 
          message: error.message, 
          error: error.message
        };
      }
      
      return { 
        success: true, 
        message: 'Task accepted successfully',
        acceptanceId: data?.notification_id,
        conversationId: data?.conversation_id
      };
    } catch (error) {
      logger.error('Error in acceptTaskWithChatNotification:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      };
    }
  }

  // Respond to a task acceptance with notification in chat
  async respondToAcceptanceWithChatNotification(
    acceptanceId: string, 
    status: 'confirmed' | 'rejected',
    message?: string
  ): Promise<{ 
    success: boolean; 
    message?: string;
  }> {
    try {
      logger.log(`Responding to task acceptance ${acceptanceId} with status ${status}`);

      // Use direct database call
      const { data, error } = await supabase.rpc(
        'respond_to_task_acceptance_notification',
        {
          p_acceptance_id: acceptanceId,
          p_status: status,
          p_message: message
        }
      );
      
      if (error) {
        logger.error('Error responding to task acceptance:', error);
        return { success: false, message: error.message };
      }

      return { success: true };
    } catch (error) {
      logger.error('Error in respondToAcceptanceWithChatNotification:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'An unknown error occurred' 
      };
    }
  }
}

// Create and export singleton instance
export const taskAcceptanceService = new TaskAcceptanceService();

// Default export
export default taskAcceptanceService; 