import { Message, MessageGroup } from '@/app/types/messages';

/**
 * Groups messages by sender for better UI display
 * @param messages - The array of messages to group
 * @returns An array of message groups
 */
export const groupMessagesBySender = (messages: Message[] | null): MessageGroup[] => {
  if (!messages || messages.length === 0) {
    return [];
  }
  
  const groups: MessageGroup[] = [];
  let currentGroup: MessageGroup = {
    senderId: null,
    messages: [],
    showAvatar: true
  };
  
  messages.forEach((message, index) => {
    // Start a new group if:
    // 1. This is a system message or notification
    // 2. It's from a different sender than the current group
    // 3. It's more than 5 minutes from the previous message
    const isSystemMessage = message.is_system_message || message.is_notification;
    const isDifferentSender = message.sender_id !== currentGroup.senderId;
    const isPreviousMessageOld = index > 0 && 
      new Date(message.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() > 5 * 60 * 1000;
    
    if (isSystemMessage || isDifferentSender || isPreviousMessageOld || currentGroup.senderId === null) {
      // Save the current group if it has messages
      if (currentGroup.messages.length > 0) {
        groups.push(currentGroup);
      }
      
      // Start a new group
      currentGroup = {
        senderId: message.sender_id,
        messages: [message],
        showAvatar: !isSystemMessage
      };
    } else {
      // Add to the current group
      currentGroup.messages.push(message);
    }
  });
  
  // Add the last group
  if (currentGroup.messages.length > 0) {
    groups.push(currentGroup);
  }
  
  return groups;
};

/**
 * Adds unread indicators to grouped messages if needed
 * @param groups - The message groups
 * @param currentUserId - The current user's ID
 * @returns Message groups with unread indicators
 */
export const addUnreadIndicators = (groups: MessageGroup[], currentUserId: string | null): any[] => {
  if (!groups.length || !currentUserId) return groups;
  
  // Check for unread messages
  let hasUnreadMessages = false;
  let firstUnreadGroupIndex = -1;
  
  // Find the first unread message that wasn't sent by the current user
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    for (const message of group.messages) {
      if (!message.is_read && message.sender_id !== currentUserId) {
        hasUnreadMessages = true;
        firstUnreadGroupIndex = i;
        break;
      }
    }
    if (hasUnreadMessages) break;
  }
  
  // If no unread messages, return the original groups
  if (!hasUnreadMessages || firstUnreadGroupIndex === -1) {
    return groups;
  }
  
  // Count unread messages
  let unreadCount = 0;
  for (let i = firstUnreadGroupIndex; i < groups.length; i++) {
    const group = groups[i];
    for (const message of group.messages) {
      if (!message.is_read && message.sender_id !== currentUserId) {
        unreadCount++;
      }
    }
  }
  
  // Insert unread indicator before the first unread message
  const result = [...groups];
  result.splice(firstUnreadGroupIndex, 0, {
    senderId: null,
    messages: [],
    showAvatar: false,
    isUnreadIndicator: true,
    unreadCount: unreadCount
  });
  
  return result;
};

// This empty export prevents the file from being treated as a route
export default {}; 