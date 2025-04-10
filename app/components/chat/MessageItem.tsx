import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Pressable, Linking, ActivityIndicator } from 'react-native';
import { format } from 'date-fns';
import { supabase } from '@/app/lib/supabase';
import { getUserId } from '@/app/lib/supabase';
import Colors from '@/app/constants/Colors';
import TaskAcceptanceCard from '../tasks/TaskAcceptanceCard';
import { useRouter } from 'expo-router';
import { formatRelativeTime } from '@/app/utils/timeUtils';
import { CheckCircle2, XCircle, Clock, FileText, Image as ImageIcon, ExternalLink } from 'lucide-react-native';
import TaskAcceptanceNotification from './TaskAcceptanceNotification';
import { Image as ExpoImage } from 'expo-image';
import * as Haptics from 'expo-haptics';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  user_id?: string;
  content: string;
  created_at: string;
  is_read: boolean;
  is_notification?: boolean;
  is_system_message?: boolean;
  notification_type?: string;
  notification_data?: any;
  sender?: {
    first_name?: string;
    avatar_url?: string;
  };
}

interface MessageItemProps {
  message: Message;
  currentUserId: string;
  showAvatar?: boolean;
  refreshMessages?: () => void;
  showSender?: boolean;
  isDeleted?: boolean;
}

export default function MessageItem({ 
  message, 
  currentUserId, 
  showAvatar = true,
  refreshMessages,
  showSender = false,
  isDeleted = false
}: MessageItemProps) {
  const router = useRouter();
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [accepterProfile, setAccepterProfile] = useState<any>(null);
  const [ownerProfile, setOwnerProfile] = useState<any>(null);
  const [isTaskOwner, setIsTaskOwner] = useState(false);
  const [isNotification, setIsNotification] = useState(false);
  const [notificationData, setNotificationData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [senderName, setSenderName] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  const [showFullImage, setShowFullImage] = useState<boolean>(false);

  // Check for image content
  const isImageMessage = message.content.includes('[Image]');
  const isDocumentMessage = message.content.includes('[Document:');
  
  // Extract the URL from the message content
  const extractUrl = () => {
    if (isImageMessage) {
      return message.content.replace('[Image] ', '');
    } else if (isDocumentMessage) {
      const match = message.content.match(/\[(Document:[^\]]+)\]\s+(https?:\/\/[^\s]+)/);
      return match ? match[2] : '';
    }
    return '';
  };
  
  // Extract document name from message
  const extractDocumentName = () => {
    if (isDocumentMessage) {
      const match = message.content.match(/\[Document:\s*([^\]]+)\]/);
      return match ? match[1] : 'Document';
    }
    return 'Document';
  };

  useEffect(() => {
    setIsCurrentUser(message.sender_id === currentUserId);
    
    // Process notifications
    const checkNotification = async () => {
      if (message.is_notification && message.notification_type === 'task_acceptance') {
        setIsNotification(true);
        
        // Extract notification data
        const notifData = message.notification_data || {};
        setNotificationData(notifData);
        
        // Determine if current user is task owner
        const taskOwnerCheck = notifData.owner_id === currentUserId;
        setIsTaskOwner(taskOwnerCheck);
        
        // Load profiles for both accepter and owner
        if (notifData.accepter_id) {
          const { data: accepterData } = await supabase
            .from('profiles')
            .select('first_name, avatar_url')
            .eq('id', notifData.accepter_id)
            .single();
          
          setAccepterProfile(accepterData);
        }
        
        if (notifData.owner_id) {
          const { data: ownerData } = await supabase
            .from('profiles')
            .select('first_name, avatar_url')
            .eq('id', notifData.owner_id)
            .single();
          
          setOwnerProfile(ownerData);
        }
      }
    };
    
    checkNotification();
  }, [message, currentUserId]);

  useEffect(() => {
    // Get sender info if message is from another user
    if (message.sender_id !== currentUserId) {
      if (message.sender?.first_name) {
        setSenderName(message.sender.first_name);
        setAvatarUrl(message.sender.avatar_url || null);
      } else if (message.is_system_message || message.sender_id === '00000000-0000-0000-0000-000000000000') {
        // Handle system messages
        setSenderName('System');
        setAvatarUrl(null);
      } else {
        fetchSenderInfo();
      }
    }
  }, [message, currentUserId]);

  const fetchSenderInfo = async () => {
    try {
      // Skip fetching for system messages
      if (message.is_system_message || message.sender_id === '00000000-0000-0000-0000-000000000000') {
        setSenderName('System');
        setAvatarUrl(null);
        return;
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, avatar_url')
        .eq('id', message.sender_id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setSenderName(data.first_name || 'User');
        setAvatarUrl(data.avatar_url);
      }
    } catch (error) {
      console.error('Error fetching sender info:', error);
    }
  };

  // Handle notification status changes
  const handleStatusChange = (status: string) => {
    if (refreshMessages) {
      refreshMessages();
    }
  };

  // Handle task acceptance notification
  if (message.is_notification && message.notification_type === 'task_acceptance' && message.notification_data) {
    // Process the message to ensure it has all required fields
    const processedMessage = {
      id: message.id,
      content: message.content || '',
      task_acceptance: {
        id: message.notification_data.acceptance_id || '',
        status: message.notification_data.status || 'pending',
        task_id: message.notification_data.task_id || '',
        created_by: message.notification_data.acceptor_id || message.sender_id
      }
    };
    
    return (
      <TaskAcceptanceNotification
        message={processedMessage}
        isTaskOwner={currentUserId !== message.notification_data.acceptor_id}
      />
    );
  }
  
  // Handle task status update notifications
  if (message.is_system_message && message.notification_type === 'task_status') {
    const taskData = message.notification_data;
    if (!taskData) return null;
    
    let statusText = '';
    let StatusIcon = null;
    let statusColor = '';
    
    switch (taskData.status) {
      case 'confirmed':
        statusText = 'Task Accepted';
        StatusIcon = CheckCircle2;
        statusColor = Colors.success;
        break;
      case 'rejected':
        statusText = 'Task Rejected';
        StatusIcon = XCircle;
        statusColor = Colors.error;
        break;
      case 'pending':
        statusText = 'Task Request Pending';
        StatusIcon = Clock;
        statusColor = Colors.warning;
        break;
      default:
        return null;
    }
    
    return (
      <View style={styles.systemMessageContainer}>
        <View style={[styles.systemMessage, { borderColor: statusColor }]}>
          {StatusIcon && <StatusIcon size={18} color={statusColor} style={styles.statusIcon} />}
          <Text style={[styles.systemMessageText, { color: statusColor }]}>
            {statusText}
          </Text>
          {taskData.task_id && (
            <TouchableOpacity
              style={[styles.viewDetailsButton, { backgroundColor: statusColor + '15' }]}
              onPress={() => router.push(`/tasks/${taskData.task_id}` as any)}
            >
              <Text style={[styles.viewDetailsText, { color: statusColor }]}>
                View Task
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.timeText}>
          {formatRelativeTime(message.created_at)}
        </Text>
      </View>
    );
  }

  // Render system message
  if (message.is_system_message) {
    return (
      <View style={styles.systemMessageContainer}>
        <View style={styles.systemMessage}>
        <Text style={styles.systemMessageText}>{message.content}</Text>
        </View>
        <Text style={styles.timeText}>
          {formatRelativeTime(message.created_at)}
        </Text>
      </View>
    );
  }

  // Render avatar for other users' messages
  const renderAvatar = () => {
    if (!showAvatar) return null;
    
    return (
      <View style={styles.avatarContainer}>
        {avatarUrl ? (
          <ExpoImage
            source={{ uri: avatarUrl }}
            style={styles.avatar}
            contentFit="cover"
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {senderName?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
        )}
      </View>
    );
  };
  
  // Style for message bubbles
  const messageContainerStyle = useMemo(() => {
    const isMyMessage = message.sender_id === currentUserId;
    return [
      styles.messageContainer,
      isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
      isDeleted && styles.deletedMessageContainer,
    ];
  }, [message.sender_id, currentUserId, isDeleted]);
  
  // Format the timestamp
  const formattedTime = (() => {
    try {
      return format(new Date(message.created_at), 'h:mm a');
    } catch (e) {
      return '';
    }
  })();

  // Handle clicking on a document message
  const handleDocumentPress = () => {
    const url = extractUrl();
    if (url) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Linking.openURL(url);
    }
  };
  
  // Handle clicking on an image message
  const handleImagePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowFullImage(!showFullImage);
  };

  // Render image content
  const renderImageContent = () => {
    const imageUrl = extractUrl();
    
    return (
      <TouchableOpacity onPress={handleImagePress} activeOpacity={0.8}>
        <View style={styles.imageContainer}>
          {imageLoading && (
            <View style={styles.imageLoadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          )}
          <ExpoImage
            source={{ uri: imageUrl }}
            style={showFullImage ? styles.fullSizeImage : styles.thumbnailImage}
            contentFit="cover"
            transition={200}
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
          />
        </View>
      </TouchableOpacity>
    );
  };
  
  // Render document content
  const renderDocumentContent = () => {
    const documentName = extractDocumentName();
    
    return (
      <TouchableOpacity onPress={handleDocumentPress} activeOpacity={0.8} style={styles.documentContainer}>
        <FileText size={24} color={Colors.primary} />
        <View style={styles.documentInfo}>
          <Text style={styles.documentName} numberOfLines={1}>
            {documentName}
          </Text>
          <Text style={styles.documentAction}>
            Tap to open <ExternalLink size={12} color={Colors.textSecondary} />
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[
      styles.container,
      isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer
    ]}>
      {/* Show avatar for other users' messages */}
      {!isCurrentUser && showAvatar && renderAvatar()}
      
      {/* Message content */}
      <Pressable style={messageContainerStyle}>
        {showSender && !isCurrentUser && (
          <Text style={styles.senderName}>{senderName}</Text>
        )}
        <View style={[
          styles.messageBubble,
          isImageMessage && styles.imageBubble,
          isDocumentMessage && styles.documentBubble
        ]}>
          {isImageMessage ? (
            renderImageContent()
          ) : isDocumentMessage ? (
            renderDocumentContent()
          ) : (
          <View>
          <Text style={[
            styles.messageText,
              isCurrentUser ? styles.myMessageText : styles.otherMessageText,
              isDeleted && styles.deletedMessageText
            ]}>
              {isDeleted ? 'This message was deleted' : message.content}
            </Text>
            <View style={styles.timeContainer}>
              <Text style={[
                styles.timeText,
                isCurrentUser && styles.myTimeText
              ]}>
                {formattedTime}
          </Text>
            </View>
          </View>
          )}
        </View>
        
        {/* Empty space for alignment when showing current user's message */}
        {isCurrentUser && showAvatar && (
          <View style={styles.avatarPlaceholder} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 1,
    paddingHorizontal: 8,
  },
  currentUserContainer: {
    justifyContent: 'flex-end',
  },
  otherUserContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 6,
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  messageContainer: {
    maxWidth: '80%',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginVertical: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    marginRight: 4,
    maxWidth: '75%',
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 1,
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#2a2a2a', 
    borderRadius: 12,
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
    paddingTop: 6,
    paddingBottom: 1,
  },
  deletedMessageContainer: {
    backgroundColor: '#f5f5f5',
    borderColor: 'rgba(0,0,0,0.05)',
  },
  messageBubble: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 0,
  },
  currentUserMessage: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  otherUserMessage: {
    backgroundColor: Colors.cardBackground,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 18,
    fontFamily: 'SpaceGrotesk-Regular',
    marginBottom: 0,
    textAlign: 'right',
  },
  myMessageText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '400',
  },
  otherMessageText: {
    color: '#ffffff',
    textAlign: 'right',
  },
  deletedMessageText: {
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#9e9e9e',
  },
  timestamp: {
    fontSize: 11,
    color: Colors.textSecondary,
    alignSelf: 'flex-end',
    marginTop: 5,
    opacity: 0.9,
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 12,
  },
  systemMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '90%',
  },
  statusIcon: {
    marginRight: 10,
  },
  systemMessageText: {
    fontSize: 13,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '500',
  },
  viewDetailsButton: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: -4,
    marginBottom: 0,
  },
  timeText: {
    fontSize: 8,
    color: '#cccccc',
    fontFamily: 'SpaceGrotesk-Regular',
  },
  myTimeText: {
    color: '#dddddd',
    fontSize: 8,
  },
  imageContainer: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  thumbnailImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  fullSizeImage: {
    width: 280,
    height: 210,
    borderRadius: 12,
  },
  imageLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    backgroundColor: '#000000',
  },
  imageBubble: {
    padding: 4,
    backgroundColor: Colors.background,
  },
  documentBubble: {
    padding: 12,
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  documentInfo: {
    marginLeft: 10,
    flex: 1,
  },
  documentName: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk-Medium',
    color: '#e0e0e0',
  },
  documentAction: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk-Regular',
    color: '#888888',
  },
}); 