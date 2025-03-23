import { supabase, getUserId } from '../lib/supabase';
import { Task, CreateTaskPayload, TaskStatus, TaskModel } from '../types/task';
import { logger } from '../utils/logger';
import { chatService } from './chatService';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { AppRoute } from '../types/router';

export class TaskService {
  // Fetch tasks created by or assigned to the current user
  async getTasks(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data as Task[];
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
      // Get user ID from the payload or try to get from authenticated user
      let userId = taskData.created_by;
      
      // If no user ID provided, try to get it from authenticated user
      if (!userId) {
        try {
          const session = await supabase.auth.getSession();
          const user = await supabase.auth.getUser();
          
          userId = session?.data?.session?.user?.id || user?.data?.user?.id;
          logger.log('Got user ID from session:', userId);
        } catch (authError) {
          logger.error('Auth error getting user:', authError);
        }
      }
      
      // Use a default user ID if no user ID found and we're in development
      if (!userId && __DEV__) {
        userId = 'default-test-user-id';
        logger.warn('Using DEFAULT TEST user ID for development:', userId);
      }
      
      // Log what user ID we're using
      logger.log('Creating task with user ID:', userId);
      
      // Extract created_by and metadata fields from taskData
      const { created_by, metadata, ...restTaskData } = taskData;
      
      // Get main category from the first item in categories array or use a default
      const categories = metadata?.categories || [];
      const mainCategory = categories.length > 0 ? categories[0] : 'General';
      
      // Map metadata fields to table columns
      const taskDataToInsert = {
        ...restTaskData,
        created_by: userId,
        status: 'pending',
        // Include both category (string) and categories (array) for compatibility
        category: mainCategory,
        categories: categories,
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
      
      // Insert the task into the database
      const { data, error } = await supabase
        .from('tasks')
        .insert(taskDataToInsert)
        .select('*')
        .single();
        
      if (error) {
        logger.error('Error creating task:', error);
        throw new Error(`Failed to create task: ${error.message}`);
      }
      
      logger.log('Task created successfully:', data);
      return data;
    } catch (err) {
      logger.error('Error in createTask:', err);
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

  // Accept a task and assign it to the current user
  async acceptTask(taskId: string): Promise<{ success: boolean, conversationId: string | null }> {
    try {
      // Get current user
      const userId = await getUserId();
      
      if (!userId) {
        Alert.alert('Authentication Required', 'Please log in to accept tasks.');
        router.push('/(auth)/login' as any);
        throw new Error('User not authenticated');
      }
      
      // Get the task to check if it's available
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();
      
      if (taskError) {
        throw taskError;
      }
      
      if (!task) {
        throw new Error('Task not found');
      }
      
      if (task.status !== 'pending' && task.status !== 'open') {
        Alert.alert('Task Unavailable', 'This task is not available for acceptance.');
        throw new Error('This task is not available for acceptance');
      }
      
      if (task.created_by === userId) {
        Alert.alert('Cannot Accept Own Task', 'You cannot accept your own task.');
        throw new Error('You cannot accept your own task');
      }
      
      // Update the task status to 'assigned'
      const { data: updatedTask, error: updateError } = await supabase
        .from('tasks')
        .update({
          status: 'assigned',
          assigned_to: userId,
          assigned_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select()
        .single();
      
      if (updateError) {
        throw updateError;
      }
      
      // Create a conversation between task creator and the user who accepted it
      try {
        const conversationId = await chatService.startTaskAcceptanceConversation(
          taskId,
          task.created_by,
          task.title
        );
        
        // Redirect to the chat page
        setTimeout(() => {
          router.push({
            pathname: '/chat/[id]' as any,
            params: { id: conversationId }
          });
        }, 500);
        
        return { success: true, conversationId };
      } catch (chatError) {
        logger.error('Error creating conversation:', chatError);
        
        // Still return success for the task acceptance, even if chat creation failed
        Alert.alert(
          'Task Accepted', 
          'Task has been assigned to you, but there was an issue starting the chat. Please go to the Messages tab.'
        );
        return { success: true, conversationId: null };
      }
    } catch (err: any) {
      logger.error('Error accepting task:', err);
      
      if (!err.message?.includes('own task') && !err.message?.includes('not available')) {
        Alert.alert('Error', 'Failed to accept task. Please try again.');
      }
      
      return { success: false, conversationId: null };
    }
  }
}

// Create and export a singleton instance
export const taskService = new TaskService();

// Add default export
export default taskService; 