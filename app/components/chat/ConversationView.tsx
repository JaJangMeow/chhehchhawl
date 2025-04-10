import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Alert,
  Keyboard,
  Pressable,
  Animated,
  Image as RNImage,
  SafeAreaView,
  ScrollView,
  Linking
} from 'react-native';
import { Image } from 'expo-image';
import { Send, ChevronDown, ArrowDown, ArrowDownToLine, ArrowUp, X, Paperclip, Calendar, CheckCheck, Check, User, MapPin, Info, ExternalLink, Loader, Clock, CheckCircle, XCircle, AlertTriangle, AlertCircle, ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Colors from '@/app/constants/Colors';
import MessageItem from './MessageItem';
import { supabase, getUserId } from '@/app/lib/supabase';
import { chatService } from '@/app/services/chatService';
import { taskService } from '@/app/services/taskService';
import TaskAcceptanceCard from './TaskAcceptanceCard';
import TaskAcceptanceNotification from './TaskAcceptanceNotification';
import { logger } from '@/app/utils/logger';
import { taskAcceptanceService } from '@/app/services/taskAcceptanceService';
import { TaskConversation } from '@/app/services/chatService';
import { Toast } from "../common/Toast";
import { groupMessagesBySender, addUnreadIndicators } from './GroupMessages';
import { Message, MessageGroup } from '@/app/types/messages';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import * as DocumentPicker from 'expo-document-picker';

// Import UI components
import MessageList from './ui/MessageList';
import MessageInput from './ui/MessageInput';
import TaskStatusBanner from './ui/TaskStatusBanner';
import TaskActionButton from './ui/TaskActionButton';
import TaskDetailsOverlay from './ui/TaskDetailsOverlay';

// Import custom hooks
import { useMessages } from './hooks/useMessages';
import { useTypingIndicator } from './hooks/useTypingIndicator';
import { useTaskActions } from './hooks/useTaskActions';
import { useFileAttachments } from './hooks/useFileAttachments';

interface ConversationViewProps {
  conversationId: string;
  taskId?: string;
  initialShowTaskDetails?: boolean;
}

interface Task {
  id: string;
  status: string;
  created_by: string;
  assigned_to?: string;
  title: string;
  description?: string;
  budget?: number;
  location?: {
    address?: string;
    lat?: number;
    lng?: number;
    display_name?: string;
  };
  building_name?: string;
  locality?: string;
  category?: string;
  categories?: string[];
  deadline?: string;
  created_at?: string;
}

interface TaskAcceptanceNotification {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  task_id: string;
  task_title: string;
  status: 'pending' | 'confirmed' | 'rejected';
  created_at: string;
  acceptance_id: string;
}

export interface ConversationViewRef {
  showTaskDetails: () => void;
}

// Ensure any text is safely rendered with a Text component
const SafeText = ({ children }: { children?: React.ReactNode }) => {
  if (typeof children === 'string') {
    return <Text>{children}</Text>;
  }
  return <>{children}</>;
};

// Modified to use forwardRef for parent component access
const ConversationView = forwardRef<ConversationViewRef, ConversationViewProps>(({
  conversationId,
  taskId,
  initialShowTaskDetails = false
}, ref) => {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showTaskDetails, setShowTaskDetails] = useState(initialShowTaskDetails);
  const [newMessage, setNewMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Get current user ID on load
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const userId = await getUserId();
        setCurrentUserId(userId);
      } catch (error) {
        logger.error('Error getting user ID:', error);
      }
    };
    
    fetchUserId();
  }, []);
  
  // Initialize hooks
  const { 
    messages, 
    groupedMessages, 
    loading, 
    refreshing,
    error,
    sending: messageSending,
    loadMessages,
    sendMessage,
    handleRefresh,
    addSystemMessage
  } = useMessages(conversationId, currentUserId);
  
  // Use ref to track when initial load is complete
  const initialLoadCompleteRef = useRef(false);
  
  // Load messages once when conversation ID and user ID are available
  useEffect(() => {
    if (conversationId && currentUserId && !initialLoadCompleteRef.current) {
      initialLoadCompleteRef.current = true;
      // Small delay to ensure all initialization is complete
      setTimeout(() => {
        loadMessages();
      }, 100);
    }
  }, [conversationId, currentUserId, loadMessages]);
  
  const {
    isTyping,
    otherUserTyping,
    handleTyping,
    sendTypingStatus
  } = useTypingIndicator(conversationId, currentUserId);
  
  const {
    task,
    taskActionLoading,
    handleMarkFinished,
    handleConfirmComplete
  } = useTaskActions(
    taskId, 
    conversationId, 
    currentUserId,
    addSystemMessage,
    setToastMessage,
    setShowToast,
    loadMessages
  );
  
  const {
    sending: attachmentSending,
    handleAttachment,
  } = useFileAttachments(
    conversationId,
    setToastMessage,
    setShowToast,
    loadMessages
  );
  
  // Handles text input changes
  const handleInputChange = (text: string) => {
    setNewMessage(text);
    handleTyping();
  };
  
  // Handle message sending
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    Keyboard.dismiss();
    const success = await sendMessage(newMessage);
    if (success) {
      setNewMessage('');
      // Force refresh of message list
      loadMessages();
    }
  };
  
  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    showTaskDetails: () => {
      setShowTaskDetails(true);
    }
  }));
  
  // Animate in on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Message list */}
        <MessageList 
          groupedMessages={groupedMessages}
          messages={messages}
          loading={loading}
          refreshing={refreshing}
          currentUserId={currentUserId}
          onRefresh={handleRefresh}
          onLoadMessages={loadMessages}
        />
        
        {/* Task status banner (if task status is 'finished') */}
        <TaskStatusBanner
          task={task}
          currentUserId={currentUserId}
          taskActionLoading={taskActionLoading}
          onConfirmComplete={handleConfirmComplete}
        />
        
        {/* Message input */}
        <MessageInput
          value={newMessage}
          onChangeText={handleInputChange}
          onSend={handleSendMessage}
          onAttachment={handleAttachment}
          sending={messageSending || attachmentSending}
        />
        
        {/* Task action button (finish task) */}
        <TaskActionButton
          task={task}
          currentUserId={currentUserId}
          loading={taskActionLoading}
          onPress={handleMarkFinished}
        />
      </Animated.View>
      
      {/* Toast notification */}
      {showToast && (
        <Toast 
          message={toastMessage} 
          type="info" 
          onClose={() => setShowToast(false)} 
          duration={3000}
        />
      )}
      
      {/* Task details overlay */}
      {showTaskDetails && task && (
        <TaskDetailsOverlay 
          task={task}
          currentUserId={currentUserId}
          onClose={() => setShowTaskDetails(false)}
        />
      )}
    </SafeAreaView>
  );
});

export default ConversationView;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#111810',
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  messagesContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
  },
  messagesList: {
    flexGrow: 1,
    backgroundColor: '#000000',
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 5,
  },
  messageGroup: {
    marginBottom: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000000',
  },
  loadingText: {
    marginTop: 12,
    color: Colors.primary,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000000',
  },
  errorText: {
    color: Colors.error,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000000',
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#e0e0e0',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9e9e9e',
    marginTop: 10,
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 15,
  },
  notificationContainer: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary + '15', // Light tint of primary color
    alignSelf: 'center',
    marginVertical: 12,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  notificationText: {
    color: Colors.text,
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 15,
    textAlign: 'center',
  },
  systemMessageContainer: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#333333',
    alignSelf: 'center',
    marginVertical: 3,
    maxWidth: '90%',
  },
  systemMessage: {
    color: '#ffffff',
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  input: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    color: '#e0e0e0',
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  attachmentButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    marginRight: 8,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  scrollToBottomButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 100,
  },
  unreadIndicator: {
    backgroundColor: Colors.primary,
    position: 'absolute',
    right: 16,
    bottom: 70,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  unreadCount: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  typingIndicatorContainer: {
    padding: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  typingIndicatorText: {
    color: Colors.primary,
    fontSize: 13,
    fontFamily: 'SpaceGrotesk-Medium',
    fontStyle: 'italic',
  },
  keyboardContainer: {
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  taskActionContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#121212',
  },
  finishTaskButton: {
    backgroundColor: Colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  confirmCompletionButton: {
    backgroundColor: Colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  taskActionButtonText: {
    color: Colors.white,
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 15,
    marginLeft: 8,
  },
  confirmButtonText: {
    color: Colors.white,
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 15,
    marginLeft: 8,
  },
  waitingConfirmationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFC107', // Solid color instead of transparent
    borderTopWidth: 1,
    borderTopColor: '#FFC107',
    gap: 8,
  },
  waitingConfirmationText: {
    color: '#000000', // Changed to black for better contrast on solid yellow
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 14,
  },
  confirmationPromptContainer: {
    flexDirection: 'column',
    padding: 14,
    backgroundColor: Colors.primary, // Changed from '#FFC107' to theme color
    borderRadius: 8,
    marginHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.primary, // Changed to match background
  },
  confirmationPromptText: {
    color: Colors.white, // Changed from '#000000' to white for better contrast
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 14,
    marginLeft: 8,
    marginBottom: 12,
  },
  taskDetailsFullScreenWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    backgroundColor: '#121212',
  },
  taskDetailsFullScreenOverlay: {
    flex: 1,
    backgroundColor: '#121212',
  },
  taskDetailsFullScreenContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  taskDetailsBackButton: {
    padding: 10,
  },
  taskDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#121212',
  },
  taskDetailsTitle: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#e0e0e0',
  },
  taskDetailsScrollView: {
    flexGrow: 1,
    backgroundColor: '#121212',
  },
  taskDetailsContent: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#121212',
  },
  taskDetailsSectionTitle: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#9e9e9e',
    marginBottom: 6,
    marginTop: 16,
  },
  taskDetailsText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
    color: '#e0e0e0',
    marginBottom: 8,
  },
  taskDetailsStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  taskDetailsStatusSection: {
    flex: 1,
  },
  taskStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  taskStatusBadgeText: {
    color: Colors.white,
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 14,
  },
  taskRoleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  taskRoleBadgeText: {
    color: Colors.white,
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 14,
  },
  taskDetailsLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: Colors.cardBackground,
    borderRadius: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  taskDetailsMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    marginLeft: 8,
  },
  taskDetailsMapButtonText: {
    color: Colors.white,
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    marginLeft: 4,
  },
  taskDetailsCategoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    padding: 8,
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
  },
  taskDetailsCategoryBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: Colors.primary, // Removed transparency
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  taskDetailsCategoryText: {
    color: Colors.white,
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 12,
  },
  messageCompletedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#4CAF50', // Solid success color instead of transparent
    borderRadius: 8,
    marginVertical: 8,
  },
  messageCompletedText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  bottomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  taskCompletedContainer: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50', // Solid success color
    borderTopWidth: 1,
    borderTopColor: '#4CAF50',
  },
  taskCompletedText: {
    color: '#FFFFFF',
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 15,
    marginLeft: 8,
  },
  notificationsContainer: {
    padding: 12,
    paddingTop: 12,
  },
  messageListContent: {
    flexGrow: 1,
    paddingBottom: 12,
    paddingTop: 12,
  },
}); 