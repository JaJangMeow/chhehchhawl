import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/app/lib/supabase';

const useTypingIndicator = (conversationId: string, currentUserId: string | null) => {
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Set up subscription for typing indicators
  useEffect(() => {
    if (!conversationId || !currentUserId) return;
    
    // Subscribe to typing indicators
    const typingChannel = supabase
      .channel(`typing:${conversationId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        // If someone else is typing
        if (payload.payload.user_id !== currentUserId) {
          setOtherUserTyping(true);
          
          // Reset typing indicator after 3 seconds
          setTimeout(() => {
            setOtherUserTyping(false);
          }, 3000);
        }
      })
      .subscribe();
    
    return () => {
      typingChannel.unsubscribe();
    };
  }, [conversationId, currentUserId]);
  
  // Handle text input changes
  const handleTyping = () => {
    if (!conversationId || !currentUserId) return;
    
    // If not already marked as typing
    if (!isTyping) {
      setIsTyping(true);
      
      // Broadcast typing event
      supabase
        .channel(`typing:${conversationId}`)
        .send({
          type: 'broadcast',
          event: 'typing',
          payload: { user_id: currentUserId }
        });
    }
    
    // Clear previous timeout if exists
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }
    
    // Set timeout to reset typing status
    const timeout = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
    
    typingTimeout.current = timeout as unknown as NodeJS.Timeout;
  };
  
  // Send typing status to other users
  const sendTypingStatus = async (isTypingStatus: boolean) => {
    if (!conversationId || !currentUserId) return;
    
    try {
      await supabase.rpc('update_typing_status', {
        p_conversation_id: conversationId,
        p_user_id: currentUserId,
        p_is_typing: isTypingStatus
      });
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  };
  
  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
    };
  }, []);
  
  return {
    isTyping,
    otherUserTyping,
    handleTyping,
    sendTypingStatus
  };
};

export { useTypingIndicator };
export default useTypingIndicator; 