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
  Button,
  SectionList,
  Platform,
  SafeAreaView
} from 'react-native';
import { Colors } from '@/app/constants/Colors';
import { chatService, Conversation, TaskConversation } from '@/app/services/chatService';
import { formatPrice } from '@/app/utils/formatters';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { getStatusColor } from '@/app/utils/taskUtils';
import { format, isToday, isYesterday } from 'date-fns';
import { MessageSquare, UserCircle, Bell, CheckCircle, ClipboardList, Briefcase, Users, Clock } from 'lucide-react-native';
import { EmptyState } from '@/app/components/shared/EmptyState';
import { isAuthenticated, getUserId, supabase, initializeAuth } from '@/app/lib/supabase';
import PendingAcceptancesSection from '@/app/components/chat/PendingAcceptancesSection';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Ensure text strings are safely rendered with a Text component
const SafeText = ({ children }: { children?: React.ReactNode }) => {
  if (typeof children === 'string') {
    return <Text>{children}</Text>;
  }
  return <>{children}</>;
};

// Define section types
interface ConversationSection {
  title: string;
  data: TaskConversation[];
  type: 'toAssign' | 'toDo' | 'applications';
  icon: React.ReactNode;
}

function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [tasksIDo, setTasksIDo] = useState<TaskConversation[]>([]);
  const [tasksIAssign, setTasksIAssign] = useState<TaskConversation[]>([]);
  const [sections, setSections] = useState<ConversationSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [taskConversations, setTaskConversations] = useState<TaskConversation[]>([]);
  
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
          loadTaskConversations();
        } else {
          console.log('User is not authenticated');
          setAuthChecking(false);
          setAuthError('You need to be logged in to view your conversations.');
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
            setAuthError('Failed to verify authentication. Please try again.');
            return;
          } else {
            // User is authenticated, clear any auth errors
            setAuthError(null);
          }
          
          // Load conversations
          await loadTaskConversations();
          
          // If we have a conversationId param, navigate to that conversation
          // But only if it's a normal conversation ID, not an application
          // We need to fetch the conversation first to check its type
          if (params.conversationId && typeof params.conversationId === 'string') {
            // Avoid navigating directly here, let the user tap the conversation
            // handleOpenConversation(params.conversationId as string); 
            // ^^^ Remove this line to prevent type error
          }
        } catch (err) {
          console.error('Error in checkAuthAndLoad:', err);
          setError('Failed to check authentication. Please try again.');
        }
      };
      
      checkAuthAndLoad();
    }, [params.conversationId])
  );
  
  const handleLogin = () => {
    console.log('Redirecting to login screen from chat');
    router.push({
      pathname: '/(auth)/login',
      params: { returnTo: '/(tabs)/chat' }
    });
  };
  
  const loadTaskConversations = async (isRefreshing = false) => {
    try {
      setError(null);
      
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      console.log('Attempting to load task conversations with improved method...');
      
      // Use our new improved service method to get task conversations
      const conversations = await chatService.getTaskConversationsV2();
      
      // Separate conversations into tasks to do and tasks to assign
      // Only filter out 'completed' tasks, keep 'finished' tasks visible
      // This ensures tasks stay in the chat until the Poster confirms completion
      const tasksToDoArray = conversations
        .filter(conv => !conv.is_task_owner)
        .filter(conv => conv.task_status !== 'completed'); // Keep 'finished' tasks visible
        
      const tasksToAssignArray = conversations
        .filter(conv => conv.is_task_owner)
        .filter(conv => conv.task_status !== 'completed'); // Keep 'finished' tasks visible
      
      console.log(`Successfully loaded ${tasksToDoArray.length} tasks to do and ${tasksToAssignArray.length} tasks to assign (excluding only completed tasks)`);
      
      // Convert Conversation[] to TaskConversation[] format
      const tasksIDo = tasksToDoArray.map(conv => ({
        conversation_id: conv.id,
        task_id: conv.task_id || '',
        task_title: conv.task_title || 'Task',
        task_status: conv.task_status || 'pending',
        task_budget: 0,
        other_user_id: conv.profiles?.[0]?.id || '',
        other_user_name: conv.profiles?.[0] ? `${conv.profiles[0].first_name} ${conv.profiles[0].last_name || ''}`.trim() : 'Unknown',
        other_user_avatar: conv.profiles?.[0]?.avatar_url || null,
        last_message: conv.last_message?.content || null,
        last_message_at: conv.last_message?.created_at || null,
        unread_count: conv.unread_count,
        is_task_owner: false
      }));
      
      const tasksIAssign = tasksToAssignArray.map(conv => ({
        conversation_id: conv.id,
        task_id: conv.task_id || '',
        task_title: conv.task_title || 'Task',
        task_status: conv.task_status || 'pending',
        task_budget: 0,
        other_user_id: conv.profiles?.[0]?.id || '',
        other_user_name: conv.profiles?.[0] ? `${conv.profiles[0].first_name} ${conv.profiles[0].last_name || ''}`.trim() : 'Unknown',
        other_user_avatar: conv.profiles?.[0]?.avatar_url || null,
        last_message: conv.last_message?.content || null,
        last_message_at: conv.last_message?.created_at || null,
        unread_count: conv.unread_count,
        is_task_owner: true
      }));
      
      // Final filter to ensure only completed tasks are excluded
      // Tasks marked as 'finished' by Tasker remain visible until Poster confirms completion
      const filteredTasksIDo = tasksIDo.filter(
        task => task.task_status !== 'completed' // Keep 'finished' tasks visible
      );
      
      const filteredTasksIAssign = tasksIAssign.filter(
        task => task.task_status !== 'completed' // Keep 'finished' tasks visible
      );
      
      // Store task conversation data
      setTasksIDo(filteredTasksIDo);
      setTasksIAssign(filteredTasksIAssign);
      
      // Create sections without Applications
      const newSections: ConversationSection[] = [
        {
          title: 'Tasks I Assign',
          data: filteredTasksIAssign,
          type: 'toAssign',
          icon: <Users size={18} color={Colors.primary} />
        },
        {
          title: 'Tasks To Do',
          data: filteredTasksIDo,
          type: 'toDo',
          icon: <Briefcase size={18} color={Colors.success} />
        }
      ];
      
      // Only include sections with data
      const filteredSections = newSections.filter(section => section.data.length > 0);
      
      setSections(filteredSections);
      
    } catch (error: any) {
      console.error('Error loading task conversations:', error);
      console.error('Error details:', error.message);
      
      if (error.message?.includes('log in to continue') || 
          error.message?.includes('Authentication failed')) {
        // Handle auth errors gracefully
        console.log('Authentication error detected, showing login button');
        setAuthError('Failed to verify authentication. Please try again.');
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
    loadTaskConversations(true);
  };

  const handleOpenConversation = (conversation: TaskConversation) => {
    // Navigate to conversation
    router.push({
      pathname: '/chat/[id]',
      params: { id: conversation.conversation_id }
    });
  };
  
  const renderTaskConversationItem = ({ item }: { item: TaskConversation }) => {
    // Format date for last message
    const formatMessageDate = (dateString?: string | null) => {
      if (!dateString) return '';
      
      const date = new Date(dateString);
      if (isToday(date)) {
        return format(date, 'h:mm a');
      } else if (isYesterday(date)) {
        return 'Yesterday';
      } else {
        return format(date, 'MMM d');
      }
    };
    
    // Determine the color for task status
    const statusColor = getStatusColor(item.task_status);
    
    // Handle click to open the conversation
    const handleItemPress = () => {
      handleOpenConversation(item);
    };
    
    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={handleItemPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Open conversation for ${item.task_title}`}
      >
        <View style={styles.avatarContainer}>
          {item.other_user_avatar ? (
            <Image
              source={{ uri: item.other_user_avatar }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {item.other_user_name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.conversationDetails}>
          <View style={styles.conversationHeader}>
            <Text style={styles.participantName}>{item.other_user_name}</Text>
            <Text style={styles.timeText}>{formatMessageDate(item.last_message_at)}</Text>
          </View>
          
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle} numberOfLines={1}>{item.task_title}</Text>
            
            <View style={styles.badgeContainer}>
              <View style={[styles.badge, { backgroundColor: statusColor }]}>
                <Text style={styles.badgeText}>
                  {item.task_status.charAt(0).toUpperCase() + item.task_status.slice(1).replace('_', ' ')}
                </Text>
              </View>
              
              {item.is_task_owner ? (
                <View style={[styles.badge, styles.ownerBadge]}>
                  <Text style={styles.badgeText}>Posted</Text>
                </View>
              ) : (
                <View style={[styles.badge, styles.assigneeBadge]}>
                  <Text style={styles.badgeText}>Assigned</Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.messagePreview}>
            <Text style={styles.messageText} numberOfLines={1}>
              {item.last_message || 'No messages yet'}
            </Text>
            
            {item.task_budget > 0 && (
              <Text style={styles.budgetText}>₹{formatPrice(item.task_budget)}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: ConversationSection }) => {
    return (
      <View style={styles.sectionHeader}>
        <SafeText>{section.icon}</SafeText>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{section.data.length}</Text>
        </View>
        {section.data.length === 0 && (
          <Text style={styles.emptyNotice}>No tasks available</Text>
        )}
      </View>
    );
  };

  // In the ChatScreen component, add fetching of task acceptance notifications
  useEffect(() => {
    const fetchTaskConversations = async () => {
      if (!userId) return;
      
      setLoading(true);
      try {
        // Fetch conversations where the user has tasks to do or tasks they assigned
        const result = await chatService.getTaskConversationsV2();
        
        if (result) {
          // Convert Conversation[] to TaskConversation[]
          const taskConvs = result.map(conv => ({
            conversation_id: conv.id,
            task_id: conv.task_id || '',
            task_title: conv.task_title || 'Task',
            task_status: conv.task_status || 'pending',
            task_budget: 0,
            other_user_id: conv.profiles?.[0]?.id || '',
            other_user_name: conv.profiles?.[0] ? `${conv.profiles[0].first_name} ${conv.profiles[0].last_name || ''}`.trim() : 'Unknown',
            other_user_avatar: conv.profiles?.[0]?.avatar_url || null,
            last_message: conv.last_message?.content || null,
            last_message_at: conv.last_message?.created_at || null,
            unread_count: conv.unread_count,
            is_task_owner: conv.is_task_owner || false
          }));
          setTaskConversations(taskConvs);
        }
      } catch (err: any) {
        console.error('[ERROR] Error fetching task conversations:', err);
        setError(err.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    if (userId) {
      fetchTaskConversations();
    }
  }, [userId]);

  if (authChecking) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Checking authentication...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (authError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.authErrorContainer}>
          <UserCircle size={80} color={Colors.primary} style={styles.authIcon} />
          <Text style={styles.authErrorTitle}>Authentication Required</Text>
          <Text style={styles.authErrorMessage}>
            Please log in to access your messages and task applications.
          </Text>
          <TouchableOpacity 
            style={styles.loginButton} 
            onPress={handleLogin}
            accessibilityRole="button"
            accessibilityLabel="Go to login screen"
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const showEmptyState = tasksIDo.length === 0 && tasksIAssign.length === 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Tasks & Chats</Text>
        
        {/* Task acceptance notification section */}
        <GestureHandlerRootView style={{ flex: 0 }}>
          <PendingAcceptancesSection />
        </GestureHandlerRootView>
        
        {error ? (
          <EmptyState
            title="Couldn't load task chats"
            message={error}
            icon="alert-circle"
            buttonText="Try Again"
            onButtonPress={() => loadTaskConversations()}
          />
        ) : showEmptyState ? (
          <View style={styles.emptyContainer}>
            <EmptyState
              title="No Task Assignments"
              message="When you create or accept a task that gets assigned, it will appear here for easy communication."
              icon="briefcase"
              buttonText="Browse Tasks"
              onButtonPress={() => router.push('/(tabs)/tasks')}
            />
          </View>
        ) : (
          <View style={styles.contentContainer}>
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.conversation_id}
              renderItem={renderTaskConversationItem}
              renderSectionHeader={renderSectionHeader}
              stickySectionHeadersEnabled={true}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={[Colors.primary]}
                  tintColor={Colors.primary}
                />
              }
              ListEmptyComponent={
                <EmptyState
                  title="No Task Assignments"
                  message="When you create or accept a task that gets assigned, it will appear here for easy communication."
                  icon="briefcase"
                  buttonText="Browse Tasks"
                  onButtonPress={() => router.push('/(tabs)/tasks')}
                />
              }
              showsVerticalScrollIndicator={false}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={10}
              scrollEventThrottle={16}
              onEndReachedThreshold={0.5}
              removeClippedSubviews={true}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
    paddingBottom: 120, // Extra padding at bottom to account for tab bar
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '40',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginLeft: 8,
  },
  countBadge: {
    backgroundColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  countText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.textSecondary,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
    marginBottom: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    // Enhanced shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
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
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  conversationDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  participantName: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
  },
  timeText: {
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
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
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
  authErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 32,
  },
  authIcon: {
    marginBottom: 16,
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
    lineHeight: 22,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    width: '100%',
  },
  emptyContainer: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 16,
  },
  emptyNotice: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  applicationItem: {
    backgroundColor: Colors.cardBackground,
  },
  ownerBadge: {
    backgroundColor: Colors.warning,
  },
  assigneeBadge: {
    backgroundColor: Colors.success,
  },
});

export default ChatScreen; 