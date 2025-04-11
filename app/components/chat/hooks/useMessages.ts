import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/app/lib/supabase';
import { groupMessagesBySender, addUnreadIndicators } from '../GroupMessages';
import { Message } from '@/app/types/messages';
import { chatService } from '@/app/services/chatService';
import { logger } from '@/app/utils/logger';

const useMessages = (conversationId: string | undefined, currentUserId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [groupedMessages, setGroupedMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [sending, setSending] = useState(false);
  
  const messagesRef = useRef<Message[]>([]);
  const loadingRef = useRef(false);
  const lastLoadTimeRef = useRef(0);
  
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  
  useEffect(() => {
    if (!messages.length) return;
    
    const groups = groupMessagesBySender(messages);
    const groupsWithUnread = addUnreadIndicators(groups, currentUserId);
    setGroupedMessages(groupsWithUnread);
  }, [messages, currentUserId]);
  
  const loadMessages = useCallback(async (isRefreshing = false) => {
    try {
      if (!conversationId || !currentUserId) {
        return;
      }
      
      const now = Date.now();
      if (now - lastLoadTimeRef.current < 1000 && !isRefreshing) {
        return;
      }
      lastLoadTimeRef.current = now;
      
      if (loadingRef.current && !isRefreshing) {
        return;
      }
      loadingRef.current = true;
      
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      setError(null);
      
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
      
      if (!messagesData || messagesData.length === 0) {
        setMessages([]);
        setGroupedMessages([]);
      } else {
        setMessages(messagesData);
        markUnreadMessages(messagesData);
      }
    } catch (err: any) {
      logger.error('Error loading messages:', err);
      setError(err.message || 'Failed to load messages. Please try again.');
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [conversationId, currentUserId]);
  
  const markUnreadMessages = async (messagesData: Message[]) => {
    if (!currentUserId || !messagesData?.length) return;
    
    try {
      const unreadMessages = messagesData.filter(message => 
        !message.is_read && message.sender_id !== currentUserId
      );
      
      if (unreadMessages.length === 0) return;
      
      const unreadIds = unreadMessages.map(msg => msg.id);
      
      try {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadIds);
      } catch (error) {
        logger.warn('Error marking messages as read:', error);
      }
    } catch (error) {
      logger.warn('Error in markUnreadMessages:', error);
    }
  };
  
  const sendMessage = async (content: string) => {
    if (!content.trim() || !currentUserId) return false;
    
    setSending(true);
    try {
      await chatService.sendMessage(conversationId, content.trim());
      
      loadMessages();
      
      return true;
    } catch (error: any) {
      logger.error('Error sending message:', error);
      return false;
    } finally {
      setSending(false);
    }
  };
  
  const addSystemMessage = (content: string) => {
    const systemMessage: Message = {
      id: `sys-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: '00000000-0000-0000-0000-000000000000',
      content,
      created_at: new Date().toISOString(),
      is_read: true,
      is_system_message: true,
      sender: {
        first_name: 'System',
        avatar_url: null
      }
    };
    setMessages(prev => [...prev, systemMessage]);
  };
  
  useEffect(() => {
    if (!conversationId || !currentUserId) return;
    
    loadMessages();
    
    const subscription = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload: { eventType: string; new: any }) => {
        logger.log('Message change received:', payload.eventType, payload.new?.id);
        setSubscriptionActive(true);
        
        if (payload.eventType === 'INSERT') {
          const fetchNewMessage = async () => {
            try {
              const { data, error } = await supabase
                .from('messages')
                .select(`
                  id,
                  conversation_id,
                  sender_id,
                  content,
                  created_at,
                  is_read,
                  is_notification,
                  notification_type,
                  notification_data,
                  is_system_message,
                  sender:profiles(first_name, avatar_url)
                `)
                .eq('id', payload.new.id)
                .single();
              
              if (error) throw error;
              
              if (data) {
                const currentMessages = messagesRef.current;
                if (!currentMessages.some(msg => msg.id === data.id)) {
                  setMessages(prev => [...prev, data as Message]);
                  
                  if (data.sender_id !== currentUserId) {
                    try {
                      await supabase
                        .from('messages')
                        .update({ is_read: true })
                        .eq('id', data.id);
                    } catch (err: unknown) {
                      logger.warn('Error marking message as read:', err);
                    }
                  }
                }
              }
            } catch (err) {
              logger.error('Error fetching new message details:', err);
            }
          };
          
          fetchNewMessage();
        } else if (payload.eventType === 'UPDATE') {
          setMessages(currentMessages => {
            return currentMessages.map(msg => {
              if (msg.id === payload.new.id) {
                const updatedMsg = { ...msg, ...payload.new };
                
                if (payload.new.notification_data && msg.notification_data) {
                  updatedMsg.notification_data = {
                    ...msg.notification_data,
                    ...payload.new.notification_data
                  };
                }
                
                return updatedMsg;
              }
              return msg;
            });
          });
        }
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [conversationId, currentUserId, loadMessages]);
  
  const handleRefresh = useCallback(() => {
    loadMessages(true);
  }, [loadMessages]);
  
  return {
    messages,
    groupedMessages,
    loading,
    refreshing,
    error,
    sending,
    loadMessages,
    sendMessage,
    handleRefresh,
    addSystemMessage
  };
};

export { useMessages };
export default useMessages;
