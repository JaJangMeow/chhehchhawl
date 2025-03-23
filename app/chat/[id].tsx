import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { Colors } from '../constants/Colors';
import { ArrowLeft, Send, User } from 'lucide-react-native';
import { chatService, Message } from '../services/chatService';
import { formatPrice } from '../utils/formatters';
import { format, isToday, isYesterday } from 'date-fns';
import { supabase } from '../lib/supabase';
import { EmptyState } from '../components/shared/EmptyState';

export default function ChatDetail() {
  const { id } = useLocalSearchParams();
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [error, setError] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Load conversation and messages
  useEffect(() => {
    if (!id) {
      setError('Conversation ID is required');
      setLoading(false);
      return;
    }

    loadConversation();

    // Subscribe to new messages
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${id}`,
      }, (payload) => {
        // Add new message to the list
        const newMessage = payload.new as Message;
        setMessages(prevMessages => [...prevMessages, newMessage]);
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [id]);

  useEffect(() => {
    const getUserId = async () => {
      const { data } = await supabase.auth.getSession();
      setUserId(data.session?.user?.id || null);
    };
    getUserId();
  }, []);

  const loadConversation = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await chatService.getConversationWithMessages(id as string);
      setConversation(data.conversation);
      setMessages(data.messages);

      // Mark messages as read
      await chatService.markMessagesAsRead(id as string);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (err) {
      console.error('Error loading conversation:', err);
      setError('Failed to load conversation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !id) return;
    
    const trimmedMessage = messageText.trim();
    
    try {
      setSending(true);
      setMessageText('');
      await chatService.sendMessage(id as string, trimmedMessage);
      
    } catch (err) {
      console.error('Error sending message:', err);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      setMessageText(trimmedMessage);
    } finally {
      setSending(false);
    }
  };

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'h:mm a'); // e.g. "3:45 PM"
    } else if (isYesterday(date)) {
      return 'Yesterday at ' + format(date, 'h:mm a');
    } else {
      return format(date, 'MMM d') + ' at ' + format(date, 'h:mm a');
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMyMessage = item.sender_id === userId;
    
    // Check if we should show a date header
    const showDateHeader = index === 0 || (
      index > 0 && 
      new Date(item.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString()
    );
    
    // Get sender name
    const senderName = item.sender?.first_name || 'User';
    
    // Get sender avatar
    const senderAvatar = item.sender?.avatar_url;
    
    return (
      <>
        {showDateHeader && (
          <View style={styles.dateHeader}>
            <Text style={styles.dateHeaderText}>
              {format(new Date(item.created_at), 'EEEE, MMMM d')}
            </Text>
          </View>
        )}
        
        <View style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
        ]}>
          {!isMyMessage && (
            <View style={styles.avatarContainer}>
              {senderAvatar ? (
                <Image source={{ uri: senderAvatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{senderName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </View>
          )}
          
          <View style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble
          ]}>
            {!isMyMessage && (
              <Text style={styles.senderName}>{senderName}</Text>
            )}
            <Text style={styles.messageText}>{item.content}</Text>
            <Text style={styles.messageTime}>{formatMessageDate(item.created_at)}</Text>
          </View>
        </View>
      </>
    );
  };

  // Get other participant's name
  const getOtherParticipantName = () => {
    if (!conversation?.participants || conversation.participants.length === 0) {
      return 'Chat';
    }
    
    const participantWithProfile = conversation.participants.find((p: any) => p.profile);
    return participantWithProfile?.profile?.first_name || 'User';
  };

  // Get task title
  const getTaskTitle = () => {
    return conversation?.task?.title || 'Task';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading conversation...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Could not load conversation"
        message={error}
        icon="alert-circle"
        buttonText="Go Back"
        onButtonPress={() => router.back()}
      />
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: getOtherParticipantName(),
          headerTitle: () => (
            <View style={styles.headerContainer}>
              <Text style={styles.headerTitle}>{getOtherParticipantName()}</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {getTaskTitle()}
              </Text>
            </View>
          ),
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
          headerStyle: {
            backgroundColor: Colors.background,
          },
          headerShadowVisible: false,
        }}
      />
      
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyMessagesContainer}>
            <Text style={styles.emptyMessagesText}>
              No messages yet. Send your first message to start the conversation.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
          />
        )}
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={Colors.textSecondary}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            autoCapitalize="sentences"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!messageText.trim() || sending) && styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
            disabled={!messageText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.textSecondary,
  },
  messagesList: {
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateHeaderText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.textSecondary,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '80%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.cardBackground,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '100%',
  },
  myMessageBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: Colors.cardBackground,
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    color: '#fff',
    lineHeight: 22,
  },
  messageTime: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk-Regular',
    color: 'rgba(255,255,255,0.7)',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 12,
    color: Colors.text,
    fontSize: 16,
    maxHeight: 120,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    opacity: 0.6,
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyMessagesText: {
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
  },
}); 