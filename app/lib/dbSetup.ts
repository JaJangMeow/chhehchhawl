import { supabase } from './supabase';
import { Alert } from 'react-native';
import { logger } from '../utils/logger';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get Supabase URL and anon key from environment variables
const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || '';
const SUPABASE_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || '';

// Add policy fix to the beginning of SQL_SCRIPT
const SQL_SCRIPT = `
-- Fix infinite recursion in conversation_participants policy
DROP POLICY IF EXISTS "participants_read_involved" ON public.conversation_participants;
CREATE POLICY "participants_read_involved" 
  ON public.conversation_participants 
  FOR SELECT 
  USING (
    -- Direct access to own records
    (user_id = auth.uid()) OR
    -- Access via task ownership or assignment
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN tasks t ON c.task_id = t.id
      WHERE c.id = conversation_id
      AND (t.created_by = auth.uid() OR t.assigned_to = auth.uid())
    )
  );

-- Add notification columns to messages table if they don't exist
DO $$ 
BEGIN
  -- Check if columns exist and add them if they don't
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'is_notification') THEN
    ALTER TABLE messages ADD COLUMN is_notification BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'is_system_message') THEN
    ALTER TABLE messages ADD COLUMN is_system_message BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'notification_type') THEN
    ALTER TABLE messages ADD COLUMN notification_type TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'notification_data') THEN
    ALTER TABLE messages ADD COLUMN notification_data JSONB;
  END IF;
END $$;

-- Function to accept a task and create a conversation with a notification
CREATE OR REPLACE FUNCTION accept_task_and_create_conversation(
  p_task_id UUID,
  p_user_id UUID
)
RETURNS TABLE(conversation_id UUID, notification_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_owner UUID;
  v_task_title TEXT;
  v_conversation_id UUID;
  v_notification_id UUID;
BEGIN
  -- Check if the task exists and get owner ID and title
  SELECT created_by, title INTO v_task_owner, v_task_title
  FROM tasks
  WHERE id = p_task_id;
  
  IF v_task_owner IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;
  
  -- Check if user is not the task owner
  IF p_user_id = v_task_owner THEN
    RAISE EXCEPTION 'You cannot accept your own task';
  END IF;
  
  -- Check if task already has an assigned user
  IF EXISTS (SELECT 1 FROM tasks WHERE id = p_task_id AND assigned_to IS NOT NULL) THEN
    RAISE EXCEPTION 'This task has already been assigned';
  END IF;
  
  -- Create a conversation for the task
  INSERT INTO conversations (task_id)
  VALUES (p_task_id)
  RETURNING id INTO v_conversation_id;
  
  -- Add participants to the conversation
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES 
    (v_conversation_id, p_user_id),
    (v_conversation_id, v_task_owner);
  
  -- Create a notification message for task acceptance
  INSERT INTO messages (
    conversation_id,
    sender_id,
    content,
    is_notification,
    notification_type,
    notification_data
  )
  VALUES (
    v_conversation_id,
    p_user_id,
    'Task acceptance notification',
    TRUE,
    'task_acceptance',
    json_build_object(
      'task_id', p_task_id,
      'task_title', v_task_title,
      'accepter_id', p_user_id,
      'owner_id', v_task_owner,
      'status', 'pending',
      'timestamp', NOW()
    )
  )
  RETURNING id INTO v_notification_id;
  
  -- Return the conversation and notification IDs
  RETURN QUERY SELECT v_conversation_id, v_notification_id;
END;
$$;

-- Function to respond to a task acceptance (confirm or reject)
CREATE OR REPLACE FUNCTION respond_to_task_acceptance(
  p_notification_id UUID,
  p_task_id UUID,
  p_user_id UUID,
  p_response TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_data JSONB;
  v_task_owner UUID;
  v_accepter_id UUID;
BEGIN
  -- Get the notification data
  SELECT notification_data INTO v_notification_data
  FROM messages
  WHERE id = p_notification_id AND is_notification = TRUE;
  
  IF v_notification_data IS NULL THEN
    RAISE EXCEPTION 'Notification not found';
  END IF;
  
  -- Extract owner and accepter IDs
  v_task_owner := (v_notification_data->>'owner_id')::UUID;
  v_accepter_id := (v_notification_data->>'accepter_id')::UUID;
  
  -- Check if the user is the task owner
  IF p_user_id != v_task_owner THEN
    RAISE EXCEPTION 'Only the task owner can respond to task acceptance requests';
  END IF;
  
  -- Validate response
  IF p_response != 'confirmed' AND p_response != 'rejected' THEN
    RAISE EXCEPTION 'Invalid response. Must be "confirmed" or "rejected"';
  END IF;
  
  -- Update the notification data
  UPDATE messages
  SET notification_data = jsonb_set(
    notification_data,
    '{status}',
    to_jsonb(p_response)
  )
  WHERE id = p_notification_id;
  
  -- If confirmed, update the task's assigned_to field
  IF p_response = 'confirmed' THEN
    UPDATE tasks
    SET 
      assigned_to = v_accepter_id,
      status = 'assigned'
    WHERE id = p_task_id;
    
    -- Add a system message about the confirmation
    INSERT INTO messages (
      conversation_id,
      sender_id,
      content,
      is_system_message
    )
    SELECT 
      conversation_id,
      p_user_id,
      'Task has been assigned. You can now begin working on it.',
      TRUE
    FROM messages
    WHERE id = p_notification_id;
  ELSE
    -- Add a system message about the rejection
    INSERT INTO messages (
      conversation_id,
      sender_id,
      content,
      is_system_message
    )
    SELECT 
      conversation_id,
      p_user_id,
      'Task request has been declined.',
      TRUE
    FROM messages
    WHERE id = p_notification_id;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Function to safely get conversations for a user without policy recursion
CREATE OR REPLACE FUNCTION get_user_conversations()
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT json_build_object(
    'id', c.id,
    'task_id', c.task_id,
    'created_at', c.created_at,
    'updated_at', c.updated_at,
    'last_message', c.last_message,
    'last_message_at', c.last_message_at,
    'task', json_build_object(
      'id', t.id,
      'title', t.title,
      'status', t.status,
      'budget', t.budget,
      'categories', t.categories
    ),
    'conversation_participants', (
      SELECT json_agg(json_build_object(
        'user_id', cp.user_id,
        'profile', json_build_object(
          'first_name', p.first_name,
          'avatar_url', p.avatar_url
        )
      ))
      FROM conversation_participants cp
      LEFT JOIN profiles p ON cp.user_id = p.id
      WHERE cp.conversation_id = c.id
    )
  )
  FROM conversations c
  JOIN conversation_participants cp ON c.id = cp.conversation_id
  JOIN tasks t ON c.task_id = t.id
  WHERE cp.user_id = user_id
  ORDER BY c.updated_at DESC;
END;
$$;`;

// Flag to track if error has been shown in this session
let errorShownInSession = false;

/**
 * Execute the database setup for task acceptance notifications
 * This function will check for issues and fix what it can directly
 * @returns Promise<boolean> indicating success or failure
 */
export const setupTaskAcceptanceNotifications = async (): Promise<boolean> => {
  try {
    logger.info('Setting up task acceptance notifications...');
    
    // Check if we've already shown the error this session
    const hasShownError = await AsyncStorage.getItem('db_error_shown');
    if (hasShownError === 'true' || errorShownInSession) {
      logger.info('Error already shown this session, skipping alerts');
      return false;
    }
    
    // Detect if we have the conversation_participants policy issue
    try {
      // Try to query conversation_participants to see if we have the recursion error
      const { data: testData, error: testError } = await supabase
        .from('conversation_participants')
        .select('id')
        .limit(1);
      
      if (testError && testError.message.includes('infinite recursion')) {
        logger.error('Detected infinite recursion in conversation_participants policy');
        
        // Display instructions for manual fix using the fix_database.sql script
        Alert.alert(
          'Database Policy Error',
          'The conversation_participants policy has an infinite recursion issue.\n\n' +
          'There is a fix_database.sql script in the app/db directory that should be run by an administrator in the Supabase SQL Editor to fix this and other database issues.\n\n' +
          'Please contact your administrator to run this script.'
        );
        
        // Mark error as shown in this session
        errorShownInSession = true;
        await AsyncStorage.setItem('db_error_shown', 'true');
        
        return false;
      }
    } catch (err) {
      logger.warn('Error checking for recursion policy issue:', err);
    }
    
    // Check for notification columns in messages table
    try {
      // This is a safe way to check if columns exist without direct SQL
      // First, create a test message with notification fields
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: '00000000-0000-0000-0000-000000000000', // Invalid UUID for test
          sender_id: '00000000-0000-0000-0000-000000000000', // Invalid UUID for test
          content: 'Test notification column',
          is_notification: true,
          is_system_message: true,
          notification_type: 'test',
          notification_data: { test: true }
        })
        .select();
      
      // If we get a foreign key error, the columns exist but the conversation doesn't
      // If we get a column doesn't exist error, then we need to add the columns
      if (insertError && !insertError.message.includes('violates foreign key constraint')) {
        logger.warn('Notification columns may be missing:', insertError.message);
        
        // Direct user to the fix_database.sql script
        Alert.alert(
          'Database Schema Update Required',
          'The notification columns need to be added to the messages table.\n\n' +
          'There is a fix_database.sql script in the app/db directory that should be run by an administrator in the Supabase SQL Editor to fix this and other database issues.\n\n' +
          'Please contact your administrator to run this script.'
        );
        
        // Mark error as shown in this session
        errorShownInSession = true;
        await AsyncStorage.setItem('db_error_shown', 'true');
        
        return false;
      }
    } catch (err) {
      logger.warn('Error checking notification columns:', err);
    }
    
    // Check if SQL functions exist
    try {
      // We can test for the function existence by trying to call it with invalid parameters
      const { error: funcError } = await supabase.rpc('accept_task_and_create_conversation', {
        p_task_id: '00000000-0000-0000-0000-000000000000',
        p_user_id: '00000000-0000-0000-0000-000000000000'
      });
      
      if (funcError && funcError.message.includes('function accept_task_and_create_conversation') && 
          funcError.message.includes('does not exist')) {
        logger.warn('Task acceptance functions missing');
        
        // Direct user to the fix_database.sql script
        Alert.alert(
          'Database Functions Missing',
          'The task acceptance functions need to be created.\n\n' +
          'There is a fix_database.sql script in the app/db directory that should be run by an administrator in the Supabase SQL Editor to fix this and other database issues.\n\n' +
          'Please contact your administrator to run this script.'
        );
        
        // Mark error as shown in this session
        errorShownInSession = true;
        await AsyncStorage.setItem('db_error_shown', 'true');
        
        return false;
      }
    } catch (err) {
      logger.warn('Error checking SQL functions:', err);
    }
    
    // If we get here, everything is good
    // Clear the error shown flag for next session
    await AsyncStorage.removeItem('db_error_shown');
    
    logger.info('Database setup check completed');
    return true;
    
  } catch (err: any) {
    logger.error('Database setup check failed:', err);
    Alert.alert(
      'Database Setup Error',
      'Failed to check database setup. Please try again or contact support.\n\n' +
      'There is a fix_database.sql script in the app/db directory that should be run by an administrator in the Supabase SQL Editor to fix common database issues.'
    );
    
    // Mark error as shown in this session
    errorShownInSession = true;
    await AsyncStorage.setItem('db_error_shown', 'true');
    
    return false;
  }
};

/**
 * Checks if the notification columns exist in the messages table
 * @returns Promise<boolean> indicating if setup is required
 */
export const checkIfSetupRequired = async (): Promise<boolean> => {
  try {
    // Try to query conversation_participants to detect recursion issue
    try {
      const { error: cpError } = await supabase
        .from('conversation_participants')
        .select('id')
        .limit(1);
      
      if (cpError && cpError.message.includes('infinite recursion')) {
        return true; // Setup required
      }
    } catch (err) {
      // Ignore
    }
    
    // Try to check if notification columns exist (indirectly)
    try {
      // Insert a test message with notification data to see if columns exist
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: '00000000-0000-0000-0000-000000000000', // Invalid UUID
          sender_id: '00000000-0000-0000-0000-000000000000', // Invalid UUID
          content: 'Test notification columns',
          is_notification: true, 
          notification_type: 'test',
          notification_data: { test: true }
        });
      
      // If the error is not about foreign key constraint, but about column not existing
      if (insertError && 
          !insertError.message.includes('violates foreign key constraint') &&
          (insertError.message.includes('column') || 
           insertError.message.includes('does not exist'))) {
        return true; // Setup required
      }
    } catch (err) {
      // Ignore
    }
    
    // Try to call functions to check if they exist
    try {
      const { error: funcError } = await supabase.rpc('accept_task_and_create_conversation', {
        p_task_id: '00000000-0000-0000-0000-000000000000',
        p_user_id: '00000000-0000-0000-0000-000000000000'
      });
      
      if (funcError && funcError.message.includes('does not exist')) {
        return true; // Setup required
      }
    } catch (err) {
      // Ignore
    }
    
    return false; // No setup needed if we get here
    
  } catch (err: any) {
    logger.error('Error checking setup requirements:', err);
    return true; // Assume setup is required if check fails
  }
};

/**
 * Default export for Expo Router compatibility.
 * This prevents the "missing the required default export" warning.
 */
export default function DbSetup() {
  return null;
}; 