import { supabase } from '../lib/supabase';
import { Tables, Insertable, Updatable } from '../types/supabase';

type Conversation = Tables<'conversations'>;
type ConversationInsert = Insertable<'conversations'>;
type ConversationUpdate = Updatable<'conversations'>;

type Message = Tables<'messages'>;
type MessageInsert = Insertable<'messages'>;
type MessageUpdate = Updatable<'messages'>;

/**
 * Get all conversations for the current user
 */
export const getConversations = async (userId: string) => {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }

  return data;
};

/**
 * Get a single conversation by id with its messages
 */
export const getConversationWithMessages = async (conversationId: string) => {
  // Get the conversation
  const { data: conversation, error: conversationError } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (conversationError) {
    console.error('Error fetching conversation:', conversationError);
    throw conversationError;
  }

  // Get the messages for the conversation
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (messagesError) {
    console.error('Error fetching messages:', messagesError);
    throw messagesError;
  }

  return {
    conversation,
    messages
  };
};

/**
 * Create a new conversation
 */
export const createConversation = async (conversation: ConversationInsert) => {
  const { data, error } = await supabase
    .from('conversations')
    .insert(conversation)
    .select()
    .single();

  if (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }

  return data;
};

/**
 * Update an existing conversation
 */
export const updateConversation = async (conversationId: string, updates: ConversationUpdate) => {
  const { data, error } = await supabase
    .from('conversations')
    .update(updates)
    .eq('id', conversationId)
    .select()
    .single();

  if (error) {
    console.error('Error updating conversation:', error);
    throw error;
  }

  return data;
};

/**
 * Delete a conversation along with its messages
 */
export const deleteConversation = async (conversationId: string) => {
  // Delete all messages in the conversation first
  const { error: messagesError } = await supabase
    .from('messages')
    .delete()
    .eq('conversation_id', conversationId);

  if (messagesError) {
    console.error('Error deleting messages:', messagesError);
    throw messagesError;
  }

  // Then delete the conversation
  const { error: conversationError } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId);

  if (conversationError) {
    console.error('Error deleting conversation:', conversationError);
    throw conversationError;
  }

  return true;
};

/**
 * Add a message to a conversation
 */
export const addMessage = async (message: MessageInsert) => {
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
    .single();

  if (error) {
    console.error('Error adding message:', error);
    throw error;
  }

  return data;
};

/**
 * Update a message
 */
export const updateMessage = async (messageId: string, updates: MessageUpdate) => {
  const { data, error } = await supabase
    .from('messages')
    .update(updates)
    .eq('id', messageId)
    .select()
    .single();

  if (error) {
    console.error('Error updating message:', error);
    throw error;
  }

  return data;
};

/**
 * Delete a message
 */
export const deleteMessage = async (messageId: string) => {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId);

  if (error) {
    console.error('Error deleting message:', error);
    throw error;
  }

  return true;
};

/**
 * Subscribe to new messages in a conversation
 */
export const subscribeToConversation = (conversationId: string, callback: (message: Message) => void) => {
  const subscription = supabase
    .channel(`conversation-${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        callback(payload.new as Message);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}; 