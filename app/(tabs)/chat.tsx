import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  RefreshControl,
  Alert,
  Button
} from 'react-native';
import { Colors } from '@/app/constants/Colors';
import { chatService, Conversation } from '@/app/services/chatService';
import { formatPrice } from '@/app/utils/formatters';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { getStatusColor } from '@/app/utils/taskUtils';
import { format, isToday, isYesterday } from 'date-fns';
import { MessageSquare, UserCircle } from 'lucide-react-native';
import { EmptyState } from '@/app/components/shared/EmptyState';
import { isAuthenticated, getUserId, supabase, initializeAuth } from '@/app/lib/supabase';

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState(false);
  
  // First load - ensure auth is initialized
  useEffect(() => {
    const ensureInitialized = async () => {
      try {
        console.log('Initializing auth from Chat screen');
        await initializeAuth();
        console.log('Auth initialization complete in chat screen');
        
        // Try to load conversations after auth is initialized
        // This prevents the login screen from flashing if user is already logged in
        const isAuth = await isAuthenticated();
        if (isAuth) {
          console.log('User is authenticated, preloading conversations');
          setAuthChecking(false);
          loadConversations();
        } else {
          console.log('User is not authenticated');
          setAuthChecking(false);
          setAuthError(true);
        }
      } catch (err) {
        console.error('Failed to initialize auth in chat screen:', err);
        setAuthChecking(false);
      }
    };
    
    ensureInitialized();
  }, []);
  
  // Load conversations when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const checkAuthAndLoad = async () => {
        // Skip if we're already checking auth
        if (authChecking) {
          console.log('Already checking auth, skipping duplicate check');
          return;
        }
        
        setError(null);
        
        try {
          // First try to initialize auth if not already done
          if(!supabase) {
            console.log('Supabase client not initialized properly');
            setError('Service connection error. Please restart the app.');
            return;
          }
          
          // Check if user is authenticated
          const authStatus = await isAuthenticated();
          console.log('Auth status in chat screen (focus effect):', authStatus ? 'authenticated' : 'not authenticated');
          
          if (!authStatus) {
            console.log('User not authenticated, showing login options');
            setAuthError(true);
            return;
          } else {
            // User is authenticated, clear any auth errors
            setAuthError(false);
          }
          
          // If conversations are already loaded, only reload if requested via conversationId param
          if (conversations.length > 0 && !params.conversationId) {
            console.log('Conversations already loaded, skipping reload');
          } else {
            // Load conversations
            await loadConversations();
          }
          
          // If we have a conversationId param, navigate to that conversation
          if (params.conversationId) {
            handleOpenConversation(params.conversationId as string);
          }
        } catch (err) {
          console.error('Error in checkAuthAndLoad:', err);
          setError('Failed to check authentication. Please try again.');
        }
      };
      
      checkAuthAndLoad();
    }, [params.conversationId, conversations.length])
  );
  
  const handleLogin = () => {
    console.log('Redirecting to login screen from chat');
    router.push({
      pathname: '/(auth)/login',
      params: { returnTo: '/(tabs)/chat' }
    });
  };
  
  const loadConversations = async (isRefreshing = false) => {
    try {
      setError(null);
      
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      console.log('Attempting to load conversations...');
      const data = await chatService.getConversations();
      console.log(`Successfully loaded ${data.length} conversations`);
      
      // Log conversation data to help debug
      if (data.length > 0) {
        console.log('First conversation structure:', JSON.stringify({
          id: data[0].id,
          task_id: data[0].task_id,
          has_participants: !!data[0].participants,
          has_conversation_participants: !!data[0].conversation_participants,
          participant_count: (data[0].participants || []).length + (data[0].conversation_participants || []).length,
          has_task: !!data[0].task
        }));
      }
      
      setConversations(data);
    } catch (error: any) {
      console.error('Error loading conversations:', error);
      console.error('Error details:', error.message);
      
      if (error.message?.includes('log in to continue') || 
          error.message?.includes('Authentication failed')) {
        // Handle auth errors gracefully
        console.log('Authentication error detected, showing login button');
        setAuthError(true);
      } else {
        // Show alert for other errors
        console.log('Non-authentication error, showing generic error message');
        setError('Failed to load conversations. Please try again.');
        Alert.alert('Error', 'Failed to load conversations. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const handleRefresh = () => {
    loadConversations(true);
  };

  const handleOpenConversation = (conversationId: string) => {
    router.push({
      pathname: '/chat/[id]',
      params: { id: conversationId }
    });
  };
  
  const renderConversationItem = ({ item }: { item: Conversation }) => {
    // Format date for last message
    const formatMessageDate = (dateString?: string) => {
      if (!dateString) return '';
      
      const date = new Date(dateString);
      if (isToday(date)) {
        return format(date, 'h:mm a'); // e.g. "3:45 PM"
      } else if (isYesterday(date)) {
        return 'Yesterday';
      } else {
        return format(date, 'MMM d'); // e.g. "Jan 5"
      }
    };
    
    // Get other participant
    const getOtherParticipant = () => {
      // Check for participants (backward compatibility) 
      const allParticipants = item.participants || 
                             item.conversation_participants || [];
      
      if (!allParticipants || allParticipants.length === 0) {
        console.log('No participants found for conversation:', item.id);
        return { name: 'Unknown', avatar: null };
      }
      
      // Find the first participant that has a profile
      const participantWithProfile = allParticipants.find((p: any) => p.profile);
      if (participantWithProfile) {
        // Simply use the avatar URL as is
        return {
          name: participantWithProfile.profile.first_name || 'User',
          avatar: participantWithProfile.profile.avatar_url
        };
      }
      
      return { name: 'Unknown', avatar: null };
    };
    
    const { name, avatar } = getOtherParticipant();
    const lastMessageTime = item.last_message_at ? formatMessageDate(item.last_message_at) : '';
    const task = item.task || {};
    
    return (
      <TouchableOpacity 
        style={styles.conversationItem}
        onPress={() => handleOpenConversation(item.id)}
      >
        {/* Avatar */}
        <View style={styles.avatar}>
          {avatar ? (
            <Image 
              source={{ uri: avatar }}
              style={styles.avatarImage}
              onError={() => console.error(`Failed to load avatar for ${name}`)} 
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>
        
        {/* Conversation Info */}
        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text style={styles.personName}>{name}</Text>
            <Text style={styles.messageTime}>{lastMessageTime}</Text>
          </View>
          
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle} numberOfLines={1}>
              {task.title || 'Task'}
            </Text>
            
            {task.status && (
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(task.status)}20` }]}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(task.status) }]} />
                <Text style={[styles.statusText, { color: getStatusColor(task.status) }]}>
                  {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.messagePreview}>
            <Text style={styles.messageText} numberOfLines={1}>
              {item.last_message || 'No messages yet'}
            </Text>
            
            {task.budget && (
              <Text style={styles.budgetText}>₹{formatPrice(task.budget)}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (authChecking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Checking authentication...</Text>
      </View>
    );
  }
  
  if (authError) {
    return (
      <View style={styles.authErrorContainer}>
        <UserCircle size={80} color={Colors.primary} style={styles.authIcon} />
        <Text style={styles.authErrorTitle}>Authentication Required</Text>
        <Text style={styles.authErrorMessage}>
          Please log in to access your messages and chat with task owners.
        </Text>
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Messages</Text>
      
      {error ? (
        <EmptyState
          title="Couldn't load conversations"
          message={error}
          icon="alert-circle"
          buttonText="Try Again"
          onButtonPress={() => loadConversations()}
        />
      ) : conversations.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          message="When you accept a task, you'll be able to chat with the task creator here."
          icon="message-circle"
          buttonText="Find Tasks"
          onButtonPress={() => router.push('/(tabs)/tasks')}
        />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversationItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
    paddingTop: 80,
  },
  title: {
    color: Colors.text,
    fontSize: 32,
    fontFamily: 'SpaceGrotesk-Bold',
    marginBottom: 24,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatar: {
    marginRight: 16,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  conversationInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  personName: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
  },
  messageTime: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
  },
  taskInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskTitle: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.primary,
    marginRight: 8,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  messagePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  budgetText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#4CAF50',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.7,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  authErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 20,
  },
  authIcon: {
    marginBottom: 20,
    opacity: 0.8,
  },
  authErrorTitle: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  authErrorMessage: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginTop: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
  },
}); 