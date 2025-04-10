import { supabase } from '@/app/lib/supabase';
import { Database } from '@/app/types/supabase';
import { logger } from '@/app/utils/logger';

/**
 * A centralized service for database operations
 */
export class DbService {
  /**
   * Insert a record into a table
   */
  async insertInto(table: string, data: any, returnSingle = false) {
    try {
      const query = supabase.from(table).insert(data);
      
      if (returnSingle) {
        const { data: result, error } = await query.select().single();
        if (error) throw error;
        return result;
      } else {
        const { data: result, error } = await query.select();
        if (error) throw error;
        return result;
      }
    } catch (error) {
      logger.error(`Error inserting into ${table}:`, error);
      throw error;
    }
  }

  /**
   * Update records in a table
   */
  async updateTable(table: string, data: any, conditions: Record<string, any>, returnSingle = false) {
    try {
      let query = supabase.from(table).update(data);
      
      // Apply conditions
      for (const [column, value] of Object.entries(conditions)) {
        query = query.eq(column, value);
      }
      
      if (returnSingle) {
        const { data: result, error } = await query.select().single();
        if (error) throw error;
        return result;
      } else {
        const { data: result, error } = await query.select();
        if (error) throw error;
        return result;
      }
    } catch (error) {
      logger.error(`Error updating ${table}:`, error);
      throw error;
    }
  }

  /**
   * Query records from a table
   */
  async selectFrom(
    table: string,
    options: {
      columns?: string,
      conditions?: Record<string, any>,
      orderBy?: { column: string, ascending?: boolean },
      limit?: number,
      offset?: number,
      returnSingle?: boolean
    } = {}
  ) {
    try {
      // Build the query
      let query = supabase.from(table).select(options.columns || '*');
      
      // Apply conditions
      if (options.conditions) {
        for (const [column, value] of Object.entries(options.conditions)) {
          query = query.eq(column, value);
        }
      }
      
      // Apply ordering
      if (options.orderBy) {
        query = query.order(
          options.orderBy.column, 
          { ascending: options.orderBy.ascending ?? false }
        );
      }
      
      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.offset) {
        query = query.range(
          options.offset, 
          options.offset + (options.limit || 10) - 1
        );
      }
      
      // Execute query and return results
      if (options.returnSingle) {
        const { data: result, error } = await query.single();
        if (error) throw error;
        return result;
      } else {
        const { data: result, error } = await query;
        if (error) throw error;
        return result;
      }
    } catch (error) {
      logger.error(`Error selecting from ${table}:`, error);
      throw error;
    }
  }

  /**
   * Delete records from a table
   */
  async deleteFrom(table: string, conditions: Record<string, any>) {
    try {
      let query = supabase.from(table).delete();
      
      // Apply conditions
      for (const [column, value] of Object.entries(conditions)) {
        query = query.eq(column, value);
      }
      
      const { error } = await query;
      if (error) throw error;
      return true;
    } catch (error) {
      logger.error(`Error deleting from ${table}:`, error);
      throw error;
    }
  }

  /**
   * Get profile data for a user
   */
  async getProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error fetching profile:', error);
      return null;
    }
  }

  /**
   * Get a task by ID
   */
  async getTask(taskId: string) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error fetching task:', error);
      return null;
    }
  }

  /**
   * Get tasks created by or assigned to a user
   */
  async getUserTasks(userId: string) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .or(`created_by.eq.${userId},assigned_to.eq.${userId}`)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching user tasks:', error);
      return [];
    }
  }

  /**
   * Get all tasks
   */
  async getAllTasks() {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching all tasks:', error);
      return [];
    }
  }

  /**
   * Create a conversation for a task
   */
  async createConversation(taskId: string, participants: string[]) {
    try {
      // First create the conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({ task_id: taskId })
        .select()
        .single();
        
      if (convError) throw convError;
      
      // Add participants
      const participantPromises = participants.map(userId => 
        supabase
          .from('conversation_participants')
          .insert({
            conversation_id: conversation.id,
            user_id: userId
          })
      );
      
      await Promise.all(participantPromises);
      
      return conversation;
    } catch (error) {
      logger.error('Error creating conversation:', error);
      throw error;
    }
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(conversationId: string, senderId: string, content: string) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content
        })
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error;
    }
  }
}

// Create a singleton instance
export const dbService = new DbService();

export default dbService; 