import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Platform
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Colors } from '@/app/constants/Colors';
import { ArrowLeft, User, AlertTriangle } from 'lucide-react-native';
import ConversationView, { ConversationViewRef } from '@/app/components/chat/ConversationView';
import { supabase, isAuthenticated, getUserId } from '@/app/lib/supabase';
import { logger } from '@/app/utils/logger';

interface Participant {
  id: string;
  first_name: string;
  last_name: string | null;
  avatar_url: string | null;
}

export default function ChatDetailScreen() {
  const params = useLocalSearchParams();
  const { id: conversationId, taskId: taskIdParam, isApplication, acceptanceId, acceptanceStatus, isTaskOwner } = params;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(taskIdParam as string || null);
  const [taskTitle, setTaskTitle] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isUserInConversation, setIsUserInConversation] = useState<boolean>(false);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const conversationViewRef = useRef<ConversationViewRef>(null);
  
  // Convert string params to proper types
  const isAppFlag = isApplication === 'true';
  const isOwnerFlag = isTaskOwner === 'true';
  
  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      // First check if user is authenticated
      try {
        const isAuth = await isAuthenticated();
        if (!isAuth) {
          throw new Error('You need to be logged in to view this conversation');
        }
        
        const userId = await getUserId();
        setCurrentUserId(userId);
        
        // Now fetch conversation details
        await fetchConversationDetails(userId);
      } catch (error: any) {
        logger.error('Error in chat screen:', error);
        setError(error.message || 'Failed to load conversation');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthAndFetchData();
  }, [conversationId]);

  const fetchConversationDetails = async (userId: string | null) => {
    if (!conversationId || !userId) return;
    
    try {
      // Get conversation details with task info and participants
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          task_id,
          tasks!conversations_task_id_fkey(title),
          participants:conversation_participants!conversation_participants_conversation_id_fkey(
            user_id, 
            profiles:profiles!conversation_participants_user_id_fkey(
              id, 
              first_name, 
              last_name, 
              avatar_url
            )
          )
        `)
        .eq('id', conversationId)
        .maybeSingle();
      
      if (error) throw error;
      
      if (!data) {
        // Handle case when no conversation is found
        setError(`Conversation not found. It may have been deleted or you don't have access to it.`);
        return;
      }
      
      // Set task info
      if (data.task_id) {
        setTaskId(data.task_id);
        // Handle task title from foreign key relationship
        const taskData = data.tasks;
        if (taskData) {
          // Type-safe approach for accessing the task title
          if (Array.isArray(taskData) && taskData.length > 0) {
            setTaskTitle(taskData[0]?.title);
          } else if (typeof taskData === 'object') {
            // Direct access when it's an object
            setTaskTitle((taskData as any).title);
          }
        } else {
          // Task referenced in conversation doesn't exist anymore
          logger.warn(`Task ID ${data.task_id} referenced in conversation ${conversationId} not found`);
          // Still keep the taskId for potential use but indicate no title
          setTaskTitle("Task no longer available");
        }
      }
      
      // Extract participants
      const participantsList: Participant[] = [];
      let userIsInConversation = false;
      
      // Process participants
      if (data.participants) {
        const participantsArray = Array.isArray(data.participants) 
          ? data.participants 
          : [data.participants];
          
        participantsArray.forEach((participant: any) => {
          if (participant.profiles) {
            // Handle both array and single object profile cases
            const profileData = Array.isArray(participant.profiles) 
              ? participant.profiles[0] 
              : participant.profiles;
              
            if (profileData) {
              participantsList.push({
                id: profileData.id,
                first_name: profileData.first_name,
                last_name: profileData.last_name,
                avatar_url: profileData.avatar_url
              });
            }
            
            // Check if current user is in this conversation
            if (participant.user_id === userId) {
              userIsInConversation = true;
            }
          }
        });
      }
      
      setParticipants(participantsList);
      setIsUserInConversation(userIsInConversation);
      
      // Set error if user is not in conversation
      if (!userIsInConversation) {
        setError('You are not a participant in this conversation');
      }
    } catch (err: any) {
      logger.error('Error fetching conversation:', err);
      setError(err.message || 'Failed to load conversation details');
    }
  };
  
  const navigateBack = () => {
    router.back();
  };
  
  const renderHeader = () => {
    // Get first participant that isn't the current user
    const otherParticipant = participants.find(p => p.id !== currentUserId);
    
    return (
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={navigateBack} 
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          {otherParticipant ? (
            <Text style={styles.headerName}>
              {otherParticipant.first_name} {otherParticipant.last_name || ''}
            </Text>
          ) : (
            <Text style={styles.headerName}>Chat</Text>
          )}
        </View>
        
        {/* Task info button */}
        {taskId && (
          <TouchableOpacity 
            style={styles.headerTaskButton}
            accessibilityRole="button"
            accessibilityLabel="View task details"
            onPress={() => {
              if (conversationViewRef.current) {
                conversationViewRef.current.showTaskDetails();
              }
            }}
          >
            <AlertTriangle size={22} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    );
  };
  
  if (loading) {
  return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        {renderHeader()}
        <View style={styles.errorContainer}>
          <AlertTriangle size={60} color={Colors.error} style={styles.errorIcon} />
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.returnButton} 
            onPress={navigateBack}
            accessibilityRole="button"
            accessibilityLabel="Return to chats"
          >
            <Text style={styles.returnButtonText}>Return to Chats</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      {renderHeader()}
      
      {/* Main content */}
      <View style={styles.container}>
        {isUserInConversation && conversationId ? (
        <ConversationView 
            ref={conversationViewRef}
            conversationId={conversationId as string} 
            taskId={taskId as string | undefined}
            initialShowTaskDetails={showTaskDetails}
          />
        ) : (
          <View style={styles.errorContainer}>
            <User size={60} color={Colors.primary} style={styles.errorIcon} />
            <Text style={styles.errorTitle}>Access Denied</Text>
            <Text style={styles.errorText}>
              You don't have permission to view this conversation.
            </Text>
            <TouchableOpacity 
              style={styles.returnButton} 
              onPress={navigateBack}
              accessibilityRole="button"
              accessibilityLabel="Return to chats"
            >
              <Text style={styles.returnButtonText}>Return to Chats</Text>
            </TouchableOpacity>
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
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.cardBackground,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
  },
  headerTaskButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 27, 94, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    color: Colors.textSecondary,
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  returnButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  returnButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
  },
}); 