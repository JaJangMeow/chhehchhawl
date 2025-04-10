import { supabase } from '../lib/supabase';
import { Tables, Insertable, Updatable } from '../types/supabase';

type Task = Tables<'tasks'>;
type TaskInsert = Insertable<'tasks'>;
type TaskUpdate = Updatable<'tasks'>;

/**
 * Get all tasks for the current user
 */
export const getTasks = async (userId: string) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('due_date', { ascending: true });

  if (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }

  return data;
};

/**
 * Get a single task by id
 */
export const getTaskById = async (taskId: string) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (error) {
    console.error('Error fetching task:', error);
    throw error;
  }

  return data;
};

/**
 * Create a new task
 */
export const createTask = async (task: TaskInsert) => {
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single();

  if (error) {
    console.error('Error creating task:', error);
    throw error;
  }

  return data;
};

/**
 * Update an existing task
 */
export const updateTask = async (taskId: string, updates: TaskUpdate) => {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('Error updating task:', error);
    throw error;
  }

  return data;
};

/**
 * Delete a task
 */
export const deleteTask = async (taskId: string) => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('Error deleting task:', error);
    throw error;
  }

  return true;
};

/**
 * Assign a task to a user
 */
export const assignTask = async (taskId: string, userId: string) => {
  const { data, error } = await supabase
    .from('tasks')
    .update({ assigned_to: userId })
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('Error assigning task:', error);
    throw error;
  }

  return data;
};

/**
 * Search tasks by title or description
 */
export const searchTasks = async (query: string, userId: string) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`);

  if (error) {
    console.error('Error searching tasks:', error);
    throw error;
  }

  return data;
}; 