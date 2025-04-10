import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { format, isToday, isYesterday } from 'date-fns';
import { Check, CheckCheck, UserIcon, CheckCircle, Clock, XCircle } from 'lucide-react-native';
import Colors from '@/app/constants/Colors';
import { Conversation } from '@/app/services/chatService';

interface ConversationItemProps {
  conversation: Conversation;
  userId: string;
}

export default function ConversationItem({ conversation, userId }: ConversationItemProps) {
  const router = useRouter();
  
  // Format the date appropriately
  const formatLastMessageDate = (date: string | null) => {
    if (!date) return '';
    
    const messageDate = new Date(date);
    
    if (isToday(messageDate)) {
      return format(messageDate, 'h:mm a');
    } else if (isYesterday(messageDate)) {
      return 'Yesterday';
    } else {
      return format(messageDate, 'MMM d');
    }
  };
  
  // Determine if there are unread messages for the current user
  const hasUnreadMessages = conversation.unread_count > 0;
  
  // Get the conversation partner's profile
  const partnerProfile = conversation.profiles?.find(
    profile => profile.id !== userId
  );
  
  // Handle click on the conversation
  const handlePress = () => {
    router.push(`/conversation/${conversation.id}` as any);
  };
  
  // Get notification preview if the last message is a notification
  const getNotificationPreview = () => {
    if (!conversation.last_message || !conversation.last_message.is_notification) return null;
    
    try {
      const notificationData = conversation.last_message.notification_data;
      
      if (!notificationData) return 'Notification';
      
      // Check for task acceptance notification
      if (conversation.last_message.notification_type === 'task_acceptance') {
        const status = notificationData.status || 'pending';
        
        if (notificationData.acceptor_id === userId) {
          // Current user is the applicant
          return 'You applied for this task';
        } else {
          // Current user is the task owner
          switch (status) {
            case 'confirmed':
              return `You accepted ${notificationData.acceptor_name}'s application`;
            case 'rejected':
              return `You declined ${notificationData.acceptor_name}'s application`;
            default:
              return `${notificationData.acceptor_name} applied for your task`;
          }
        }
      }
      
      return 'Notification';
    } catch (error) {
      console.error('Error parsing notification data:', error);
      return 'Notification';
    }
  };
  
  // Get the status icon for task acceptance notifications
  const getNotificationStatusIcon = () => {
    if (!conversation.last_message || 
        !conversation.last_message.is_notification ||
        conversation.last_message.notification_type !== 'task_acceptance') {
      return null;
    }
    
    try {
      const notificationData = conversation.last_message.notification_data;
      if (!notificationData) return null;
      
      const status = notificationData.status || 'pending';
      
      switch (status) {
        case 'confirmed':
          return <CheckCircle size={16} color={Colors.success} />;
        case 'rejected':
          return <XCircle size={16} color={Colors.error} />;
        default:
          return <Clock size={16} color={Colors.warning} />;
      }
    } catch (error) {
      return null;
    }
  };
  
  // Generate avatar url or initial for the conversation partner
  const getAvatarContent = () => {
    if (partnerProfile?.avatar_url) {
      return (
        <Image
          source={{ uri: partnerProfile.avatar_url }}
          style={styles.avatar}
          contentFit="cover"
        />
      );
    }
    
    return (
      <View style={styles.avatarPlaceholder}>
        {partnerProfile?.first_name ? (
          <Text style={styles.initialText}>
            {partnerProfile.first_name.charAt(0).toUpperCase()}
          </Text>
        ) : (
          <UserIcon size={20} color="#fff" />
        )}
      </View>
    );
  };
  
  // Get the message status indicator
  const getMessageStatus = () => {
    if (conversation.last_message?.sender_id === userId) {
      // Message was sent by the current user
      if (conversation.last_message?.is_read) {
        return <CheckCheck size={16} color={Colors.success} />;
      } else {
        return <Check size={16} color={Colors.textSecondary} />;
      }
    }
    
    return null;
  };
  
  // Get the right content for the last message
  const getLastMessageContent = () => {
    if (!conversation.last_message) {
      return 'No messages yet';
    }
    
    if (conversation.last_message.is_notification) {
      return getNotificationPreview();
    }
    
    return conversation.last_message.content || '';
  };
  
  // Build the display name for the partner
  const getPartnerName = () => {
    if (!partnerProfile) {
      if (conversation.task_title) {
        return conversation.task_title;
      }
      return 'Unknown User';
    }
    
    return `${partnerProfile.first_name || ''} ${partnerProfile.last_name || ''}`.trim() || 'Unknown User';
  };
  
  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed
      ]}
      onPress={handlePress}
    >
      {getAvatarContent()}
      
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text 
            style={[
              styles.name, 
              hasUnreadMessages && styles.unreadName
            ]}
            numberOfLines={1}
          >
            {getPartnerName()}
          </Text>
          
          <Text style={styles.time}>
            {formatLastMessageDate(conversation.last_message?.created_at || null)}
          </Text>
        </View>
        
        <View style={styles.messageRow}>
          <View style={styles.messagePreview}>
            {getNotificationStatusIcon()}
            
            <Text
              style={[
                styles.message, 
                hasUnreadMessages && styles.unreadMessage,
                getNotificationStatusIcon() && styles.messageWithIcon
              ]}
              numberOfLines={1}
            >
              {getLastMessageContent()}
            </Text>
          </View>
          
          <View style={styles.statusContainer}>
            {getMessageStatus()}
            
            {hasUnreadMessages ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pressed: {
    opacity: 0.7,
    backgroundColor: Colors.background + '80',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  initialText: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  unreadName: {
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
  },
  time: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messagePreview: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  messageWithIcon: {
    marginLeft: 4,
  },
  unreadMessage: {
    color: Colors.text,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Medium',
    paddingHorizontal: 4,
  },
}); 