import { supabase, getUserId } from '../lib/supabase';
import { Task, CreateTaskPayload, TaskStatus, TaskModel } from '../types/task';
import { logger } from '../utils/logger';
import { chatService } from './chatService';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { AppRoute } from '../types/router';
import { TaskAcceptance, taskAcceptanceService } from './taskAcceptanceService';

export class TaskService {
  // Fetch tasks created by or assigned to the current user
  async getTasks(): Promise<Task[]> {
    const userId = await getUserId();
    if (!userId) {
      logger.warn('No user ID available for getTasks');
      return [];
    }
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .not('status', 'in', '("completed")') // Only exclude completed tasks, keep finished tasks visible
        .order('created_at', { ascending: false });
        
      if (error) {
        logger.error('Error in getTasks:', error);
        throw error;
      }
      
      // Validate task status to make sure no tasks are incorrectly marked
      // This ensures "finished" tasks aren't mistakenly shown as "completed"
      const validatedTasks = (data || []).map(task => {
        // Extra validation to ensure "finished" tasks don't appear as "completed"
        // This is a safety measure in case of database inconsistencies
        if (task.status === 'completed' && !task.completion_date) {
          task.status = 'finished'; // Force back to finished state if missing completion date
        }
        return task;
      });
      
      logger.log(`Fetched ${validatedTasks.length} active tasks`);
      return validatedTasks as Task[];
    } catch (error) {
      logger.error('Error in getTasks:', error);
      throw error;
    }
  }
  
  // Fetch a specific task by ID
  async getTaskById(id: string): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    return data as Task;
  }
  
  // Create a new task
  async createTask(taskData: CreateTaskPayload): Promise<Task> {
    try {
      logger.log('Creating task with data:', JSON.stringify(taskData, null, 2));
      
      // Extract metadata fields
      const { metadata, ...baseTaskData } = taskData;
      
      // Prepare task data with metadata fields flattened
      const taskDataToInsert = {
        ...baseTaskData,
        categories: metadata?.categories || [],
        priority: metadata?.priority || 'medium',
        urgent: metadata?.urgent || false,
        estimated_time: metadata?.estimatedTime,
        custom_time: metadata?.customTime,
        task_visibility_hours: metadata?.taskVisibilityHours || 48,
        task_completion_hours: metadata?.taskCompletionHours,
        skill_requirements: metadata?.skillRequirements || [],
        context_flags: metadata?.contextFlags || {},
        payment_method: metadata?.paymentMethod || 'online',
        task_photos: metadata?.taskPhotos || [],
        building_name: metadata?.buildingName,
        locality: metadata?.locality,
      };
      
      // 1. Try the new secure function first (highest priority)
      try {
        const { data: secureData, error: secureError } = await supabase.rpc(
          'create_task_json_secure',
          { p_data: taskDataToInsert }
        );
        
        if (!secureError) {
          // If successful, fetch the full task details
          const { data: taskData, error: fetchError } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', secureData)
            .single();
            
          if (fetchError) {
            logger.warn('Error fetching created task:', fetchError);
            throw fetchError;
          }
          
          logger.log('Task created successfully using secure function:', taskData);
          return taskData as Task;
        }
        
        // Log the error and try the next method
        logger.warn('Error using create_task_json_secure RPC function:', secureError);
      } catch (secureError) {
        logger.warn('Exception in secure function call:', secureError);
      }
      
      // 2. Fall back to original functions
      try {
        const { data, error } = await supabase.rpc(
          'create_task_json',
          { p_task_data: taskDataToInsert }
        );
        
        if (error) {
          logger.warn('Error using create_task_json RPC function:', error);
          throw error; // Try the fallback method
        }
        
        logger.log('Task created successfully using standard RPC function:', data);
        return data as Task;
      } catch (rpcError) {
        // 3. Final fallback: direct insert
        logger.warn('Falling back to direct insert method', rpcError);
        
        // Make sure we have a user ID for created_by
        let userId = null;
        try {
          const session = await supabase.auth.getSession();
          userId = session?.data?.session?.user?.id;
          
          if (!userId) {
            const user = await supabase.auth.getUser();
            userId = user?.data?.user?.id;
          }
          
          logger.log('Got user ID for fallback method:', userId);
        } catch (authError) {
          logger.error('Auth error getting user for fallback method:', authError);
          throw new Error('Authentication required to create tasks');
        }
        
        if (!userId) {
          throw new Error('Authentication required to create tasks');
        }
        
        // Use direct insert with the authenticated user ID
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            ...taskDataToInsert,
            created_by: userId,
            status: 'pending'
          })
          .select('*')
          .single();
          
        if (error) {
          // Check if it's a permission issue
          if (error.code === '42501' || error.message.includes('permission denied')) {
            logger.error('Permission denied error:', error);
            throw new Error('You don\'t have permission to create tasks. Please try again later or contact support.');
          }
          
          logger.error('Error creating task with fallback method:', error);
          throw new Error(`Failed to create task: ${error.message}`);
        }
        
        logger.log('Task created successfully using fallback method:', data);
        return data as Task;
      }
    } catch (err: any) {
      logger.error('Error in createTask:', err);
      
      // Improve error messages for common issues
      if (err.message?.includes('permission denied')) {
        throw new Error('Permission denied: The app doesn\'t have access to create tasks. Please contact support.');
      } else if (err.message?.includes('authentication required')) {
        throw new Error('Please sign in to create tasks.');
      } else if (err.message?.includes('duplicate key')) {
        throw new Error('This task appears to be a duplicate. Please try again with different details.');
      }
      
      // Pass through other errors
      throw err;
    }
  }
  
  // Update task status (for assigned users)
  async updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data as Task;
  }
  
  // Update a task (for task creators)
  async updateTask(id: string, taskData: Partial<CreateTaskPayload>): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update(taskData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data as Task;
  }
  
  // Delete a task
  async deleteTask(id: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }

  // Get all tasks
  async getAllTasks(): Promise<Task[]> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        logger.error('Error fetching tasks:', error);
        throw new Error(`Failed to fetch tasks: ${error.message}`);
      }
      
      logger.log(`Fetched ${data?.length} tasks`);
      return data || [];
    } catch (err) {
      logger.error('Error in getAllTasks:', err);
      throw err;
    }
  }

  // Get task counts for a user
  async getUserTaskCounts(userId: string): Promise<{ posted: number, taken: number }> {
    try {
      if (!userId) {
        console.log('Invalid userId provided to getUserTaskCounts');
        return { posted: 0, taken: 0 };
      }

      // First check if the tasks table exists
      const { data: tableInfo, error: tableError } = await supabase
        .from('tasks')
        .select('id')
        .limit(1);
        
      if (tableError) {
        console.log('Error checking tasks table:', tableError.message);
        return { posted: 0, taken: 0 };
      }

      // Count tasks posted by the user (created_by field)
      const { count: postedCount, error: postedError } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId);
      
      if (postedError) {
        console.log('Error counting posted tasks:', postedError.message);
        return { posted: 0, taken: 0 };
      }
      
      let takenCount = 0;
      
      try {
        // Check if assigned_to column exists by trying a simple count query
        const { count, error: takenError } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_to', userId);
        
        if (!takenError) {
          takenCount = count || 0;
        } else {
          // If there's an error, the column might not exist, so we'll just use 0
          console.log('Note: Could not count taken tasks - assigned_to field may not be available yet');
        }
      } catch (err) {
        // Silently handle this error as the column might not exist yet
        console.log('Note: Could not count taken tasks - feature may not be fully implemented');
      }
      
      return {
        posted: postedCount || 0,
        taken: takenCount
      };
    } catch (err) {
      // Return default values on error without showing an error message
      return { posted: 0, taken: 0 };
    }
  }

  // Accept a task with explanatory message
  async acceptTask(taskId: string, message?: string): Promise<{ 
    success: boolean; 
    conversationId: string | null;
    notificationId: string | null;
    error?: string; 
  }> {
    try {
      // Get current user ID
      const user = await supabase.auth.getUser();
      const userId = user.data?.user?.id;
      
      if (!userId) {
        return { 
          success: false, 
          conversationId: null,
          notificationId: null,
          error: 'Authentication required. Please log in to accept tasks.' 
        };
      }
      
      logger.log(`User ${userId} is accepting task ${taskId}`);
      
      // Use the revised chat-integrated task acceptance
      const result = await taskAcceptanceService.acceptTaskWithChatNotification(taskId, message);
      
      return {
        success: result.success,
        conversationId: result.conversationId || null,
        notificationId: result.acceptanceId || null,
        error: result.error
      };
    } catch (err: any) {
      logger.error('Error accepting task:', err);
      return { 
        success: false, 
        conversationId: null,
        notificationId: null,
        error: err.message || 'An error occurred while accepting the task.' 
      };
    }
  }

  // Respond to task acceptance (confirm or reject)
  async respondToTaskAcceptance(
    acceptanceId: string,
    status: 'confirmed' | 'rejected',
    message?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Use the enhanced taskAcceptanceService method that includes chat notifications
      const result = await taskAcceptanceService.respondToAcceptanceWithChatNotification(
        acceptanceId,
        status,
        message
      );
      
      if (result.success && status === 'confirmed') {
        // If confirmed, update task visibility to remove it from task page
        try {
          // First get the task_id for this acceptance
          const { data: acceptance, error: acceptanceError } = await supabase
            .from('task_acceptances')
            .select('task_id')
            .eq('id', acceptanceId)
            .single();
            
          if (acceptanceError || !acceptance?.task_id) {
            logger.warn('Could not find acceptance or task_id:', acceptanceError);
          } else {
            // Update the task visibility
            const { error: updateError } = await supabase
              .from('tasks')
              .update({ 
                is_visible_in_feed: false,
                status: 'assigned',
                updated_at: new Date().toISOString()
              })
              .eq('id', acceptance.task_id);
              
            if (updateError) {
              logger.warn('Error updating task visibility:', updateError);
            }
            
            // Reject all other pending acceptances for this task
            const { error: rejectError } = await supabase
              .from('task_acceptances')
              .update({ 
                status: 'rejected',
                response_message: 'Another tasker was selected for this task',
                updated_at: new Date().toISOString()
              })
              .eq('task_id', acceptance.task_id)
              .neq('id', acceptanceId)
              .eq('status', 'pending');
              
            if (rejectError) {
              logger.warn('Error rejecting other acceptances:', rejectError);
            }
          }
        } catch (err) {
          logger.error('Error in task visibility update:', err);
          // Continue despite error - the main acceptance update already succeeded
        }
      }
      
      return { 
        success: result.success, 
        message: result.message || `Task acceptance ${status} successfully`
      };
    } catch (err: any) {
      logger.error('Error responding to task acceptance:', err);
      return { 
        success: false, 
        message: err.message || 'Failed to update task acceptance status'
      };
    }
  }

  // Mark a task as finished (for assigned users/taskers)
  async markTaskFinished(taskId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const userId = await getUserId();
      
      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }
      
      // Check if the user is assigned to this task
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('status, assigned_to, created_by, title')
        .eq('id', taskId)
        .single();
        
      if (taskError) {
        logger.error('Error fetching task:', taskError);
        return { success: false, error: 'Could not find task information' };
      }
      
      // Verify user is the assigned tasker
      if (taskData.assigned_to !== userId) {
        return { success: false, error: 'You are not assigned to this task' };
      }
      
      // Verify task is in "assigned" status
      if (taskData.status !== 'assigned') {
        return { success: false, error: `Cannot mark as finished. Task status is ${taskData.status}` };
      }
      
      // Update task status to "finished" (not completed!)
      // This is a critical change to ensure the task stays in the finished state
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          status: 'finished', // ONLY set to 'finished', never 'completed'
          updated_at: new Date().toISOString(),
          // Remove finished_at as it doesn't exist in the schema
        })
        .eq('id', taskId)
        .eq('status', 'assigned')
        .eq('assigned_to', userId);
        
      if (updateError) {
        logger.error('Error updating task status:', updateError);
        return { success: false, error: 'Failed to mark task as finished' };
      }
      
      // Double-check that the task was properly set to 'finished'
      const { data: verifyData, error: verifyError } = await supabase
        .from('tasks')
        .select('status')
        .eq('id', taskId)
        .single();
        
      if (verifyError || verifyData?.status !== 'finished') {
        logger.error('Task verification failed after marking as finished:', verifyError || 'Incorrect status');
        return { success: false, error: 'Failed to verify task was marked as finished' };
      }
      
      // Add a system message in the conversation
      try {
        const { data: conversationData } = await supabase
          .from('conversations')
          .select('id')
          .eq('task_id', taskId)
          .single();
        
        if (conversationData?.id) {
          await supabase
            .from('messages')
            .insert({
              conversation_id: conversationData.id,
              sender_id: userId,
              content: `Task "${taskData.title}" marked as finished. Waiting for confirmation from task owner. The task is not completed until the owner confirms.`,
              is_system_message: true,
              created_at: new Date().toISOString()
            });
        }
      } catch (err) {
        // Log but don't fail if system message creation fails
        logger.warn('Failed to add system message for task finished:', err);
      }
      
      // Create a notification for the task owner
      try {
        // First get owner's profile name to personalize the notification
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('id', userId)
          .single();
          
        const taskerName = userProfile?.first_name || 'The tasker';
        
        // Add notification for task owner
        await supabase
          .from('task_notifications')
          .insert({
            task_id: taskId,
            user_id: taskData.created_by,
            type: 'task_finished',
            content: `${taskerName} has marked task "${taskData.title}" as finished. Please review and confirm completion in the chat.`,
            is_read: false,
            created_at: new Date().toISOString()
          });
      } catch (err) {
        // Log but don't fail if notification creation fails
        logger.warn('Failed to add notification for task finished:', err);
      }
      
      return { success: true };
    } catch (err: any) {
      logger.error('Error in markTaskFinished:', err);
      return { success: false, error: err.message || 'Failed to mark task as finished' };
    }
  }
  
  // Confirm task completion (for task posters/creators)
  async confirmTaskComplete(taskId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const userId = await getUserId();
      
      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }
      
      logger.log(`User ${userId} attempting to confirm completion of task ${taskId}`);
      
      // Check if the user is the creator of this task
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('status, assigned_to, created_by, title')
        .eq('id', taskId)
        .single();
        
      if (taskError) {
        logger.error('Error fetching task for confirmation:', taskError);
        return { success: false, error: 'Could not find task information' };
      }
      
      // Verify user is the task creator
      if (taskData.created_by !== userId) {
        logger.warn(`User ${userId} attempted to confirm task ${taskId} but is not the owner (created_by: ${taskData.created_by})`);
        return { success: false, error: 'Only the task creator can confirm completion' };
      }
      
      // Verify task is in "finished" status
      if (taskData.status !== 'finished') {
        logger.warn(`Attempted to confirm task ${taskId} with incorrect status: ${taskData.status}. Task must be in 'finished' state first.`);
        return { success: false, error: `Cannot confirm completion. Task status is ${taskData.status}. The tasker must mark it as finished first.` };
      }
      
      logger.log(`Confirming completion of task ${taskId} - all validation checks passed.`);
      
      // Update task status to "completed"
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completion_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
          // Removed is_visible_in_feed field as it doesn't exist in schema
        })
        .eq('id', taskId)
        .eq('status', 'finished') // Must be in finished state
        .eq('created_by', userId); // Must be confirmed by owner
        
      if (updateError) {
        logger.error('Error updating task status to completed:', updateError);
        return { success: false, error: 'Failed to confirm task completion' };
      }
      
      // Verify the task was actually updated to completed state
      const { data: verifyData, error: verifyError } = await supabase
        .from('tasks')
        .select('status')
        .eq('id', taskId)
        .single();
        
      if (verifyError) {
        logger.error('Error verifying task completion status:', verifyError);
        return { success: false, error: 'Failed to verify task was marked as completed' };
      }
      
      if (verifyData?.status !== 'completed') {
        logger.error(`Task verification failed after confirmation: Status is ${verifyData?.status} instead of 'completed'`);
        return { success: false, error: 'Failed to verify task was marked as completed' };
      }
      
      logger.log(`Successfully confirmed task ${taskId} as completed`);
      
      // Add a system message in the conversation
      try {
        const { data: conversationData } = await supabase
          .from('conversations')
          .select('id')
          .eq('task_id', taskId)
          .single();
        
        if (conversationData?.id) {
          await supabase
            .from('messages')
            .insert({
              conversation_id: conversationData.id,
              sender_id: userId,
              content: `Task "${taskData.title}" has been completed and moved to Task History! Thank you for using ChhehChhawl.`,
              is_system_message: true,
              created_at: new Date().toISOString()
            });
          
          logger.log(`Added system message for task ${taskId} completion`);
        }
      } catch (err) {
        // Log but don't fail if system message creation fails
        logger.warn('Failed to add system message for task completion:', err);
      }
      
      return { success: true };
    } catch (err: any) {
      logger.error('Error in confirmTaskComplete:', err);
      return { success: false, error: err.message || 'Failed to confirm task completion' };
    }
  }

  // Add a new function to accept a task or update existing code if needed
  async acceptTaskWithMessage(
    taskId: string, 
    message?: string
  ): Promise<{ success: boolean; message: string; acceptanceId?: string }> {
    try {
      return await taskAcceptanceService.acceptTask(taskId, message);
    } catch (error) {
      logger.error('Error in acceptTaskWithMessage:', error);
      return { 
        success: false, 
        message: 'Failed to accept task. Please try again.' 
      };
    }
  }

  // Fetch history tasks (finished and completed)
  async getHistoryTasks(): Promise<Task[]> {
    try {
      const userId = await getUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .or(`created_by.eq.${userId},assigned_to.eq.${userId}`)
        .eq('status', 'completed')  // Only include fully completed tasks
        .order('updated_at', { ascending: false });
        
      if (error) {
        logger.error('Error fetching history tasks:', error);
        throw new Error(`Failed to fetch history tasks: ${error.message}`);
      }
      
      logger.log(`Fetched ${data?.length} completed history tasks`);
      return data || [];
    } catch (err) {
      logger.error('Error in getHistoryTasks:', err);
      throw err;
    }
  }
}

// Create and export a singleton instance
export const taskService = new TaskService();

// Add default export
export default taskService; 