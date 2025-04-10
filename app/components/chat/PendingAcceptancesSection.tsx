import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase, getUserId } from '@/app/lib/supabase';
import Colors from '@/app/constants/Colors';
import TaskAcceptanceCard from './TaskAcceptanceCard';
import { logger } from '@/app/utils/logger';
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface TaskAcceptance {
  id: string;
  task_id: string;
  task_title: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  status: 'pending' | 'confirmed' | 'rejected';
  created_at: string;
  acceptance_id?: string;
  isTaskOwner?: boolean;
  conversation_id?: string;
}

export default function TaskRequestsSection() {
  const [acceptances, setAcceptances] = useState<TaskAcceptance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [taskAcceptanceChannel, setTaskAcceptanceChannel] = useState<any>(null);
  const [conversationChannel, setConversationChannel] = useState<any>(null);
  const [taskVisibilityChannel, setTaskVisibilityChannel] = useState<any>(null);
  const router = useRouter();
  
  // Fetch user ID and task acceptances on mount
  useEffect(() => {
    const fetchUserAndAcceptances = async () => {
      try {
        // Get current user ID
        const id = await getUserId();
        setUserId(id);
        
        if (id) {
          // Fetch both acceptances for user's tasks and acceptances made by the user
          await fetchAcceptances(id);
          
          // Set up real-time subscriptions
          const { taskAcceptanceSubscription, taskSubscription } = setupAcceptanceSubscription(id);
          const conversationSubscription = setupConversationSubscription(id);
          
          // Store subscriptions for cleanup
          setTaskAcceptanceChannel(taskAcceptanceSubscription);
          setConversationChannel(conversationSubscription);
          setTaskVisibilityChannel(taskSubscription);
        }
      } catch (err) {
        logger.error('Error fetching user and acceptances:', err);
        setError('Failed to load task requests. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserAndAcceptances();
    
    // Clean up subscription on unmount
    return () => {
      cleanup();
    };
  }, []);
  
  // Set up real-time subscription for task acceptances
  const setupAcceptanceSubscription = (currentUserId: string) => {
    const taskAcceptanceSubscription = supabase
      .channel('task-acceptances-changes')
      // Listen for changes to acceptances where the user is the task owner
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'task_acceptances',
        filter: `task_owner_id=eq.${currentUserId}`,
      }, (payload: { new: any, old: any, eventType: string }) => {
        if (payload.eventType === 'UPDATE') {
          // If status changed to confirmed or rejected, remove from list immediately
          if (payload.new && (payload.new.status === 'confirmed' || payload.new.status === 'rejected')) {
            setAcceptances(prevAcceptances => 
              prevAcceptances.filter(acceptance => 
                acceptance.acceptance_id !== payload.new.id
              )
            );
            
            // If a task was confirmed, also remove all other acceptances for that task
            if (payload.new.status === 'confirmed' && payload.new.task_id) {
              setAcceptances(prevAcceptances => 
                prevAcceptances.filter(acceptance => 
                  acceptance.task_id !== payload.new.task_id
                )
              );
            }
          } else {
            // Otherwise refresh to get the latest data
            fetchAcceptances(currentUserId);
          }
        } else if (payload.eventType === 'INSERT') {
          // Refresh to get new acceptances
          fetchAcceptances(currentUserId);
        }
      })
      // Listen for changes to acceptances made by the user
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'task_acceptances',
        filter: `acceptor_id=eq.${currentUserId}`,
      }, (payload: { new: any, old: any, eventType: string }) => {
        if (payload.eventType === 'UPDATE') {
          // If status changed to confirmed or rejected, remove from list
          if (payload.new && (payload.new.status === 'confirmed' || payload.new.status === 'rejected')) {
            setAcceptances(prevAcceptances => 
              prevAcceptances.filter(acceptance => 
                acceptance.acceptance_id !== payload.new.id
              )
            );
          } else {
            // Otherwise refresh to get the latest data
            fetchAcceptances(currentUserId);
          }
        } else if (payload.eventType === 'INSERT') {
          // Refresh to get new acceptances
          fetchAcceptances(currentUserId);
        }
      })
      .subscribe();
      
    // Also subscribe to task table changes to handle visibility
    const taskSubscription = supabase
      .channel('tasks-visibility-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'tasks',
      }, (payload: { new: any, old: any }) => {
        // If a task's visibility changed or was assigned, update our list
        if (payload.new && payload.new.is_visible_in_feed === false && 
            payload.old && payload.old.is_visible_in_feed === true) {
          // Remove all acceptances for this task
          setAcceptances(prevAcceptances => 
            prevAcceptances.filter(acceptance => 
              acceptance.task_id !== payload.new.id
            )
          );
        }
        
        // If task status changed to assigned, remove all related acceptances
        if (payload.new && payload.new.status === 'assigned' &&
            payload.old && payload.old.status !== 'assigned') {
          setAcceptances(prevAcceptances => 
            prevAcceptances.filter(acceptance => 
              acceptance.task_id !== payload.new.id
            )
          );
        }
      })
      .subscribe();
    
    return { taskAcceptanceSubscription, taskSubscription };
  };
  
  // Set up real-time subscription for conversations
  const setupConversationSubscription = (currentUserId: string) => {
    const subscription = supabase
      .channel('conversations-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'conversations',
      }, () => {
        // When a new conversation is created, refresh acceptance data
        // This will update conversation_id links for task acceptances
        fetchAcceptances(currentUserId);
      })
      .subscribe();
      
    return subscription;
  };
  
  // Clean up subscriptions
  const cleanup = () => {
    supabase.removeChannel(taskAcceptanceChannel);
    supabase.removeChannel(conversationChannel);
    supabase.removeChannel(taskVisibilityChannel);
  };
  
  // Fetch task acceptances for the current user
  const fetchAcceptances = async (currentUserId: string) => {
    try {
      setLoading(true);
      
      // Get acceptances for tasks owned by the user
      const { data: ownedTaskAcceptances, error: ownedError } = await supabase
        .from('task_acceptances')
        .select(`
          id,
          task_id,
          task_title,
          acceptor_id,
          acceptor_first_name,
          acceptor_avatar_url,
          status,
          created_at
        `)
        .eq('task_owner_id', currentUserId)
        .eq('status', 'pending') // Only get pending acceptances
        .order('created_at', { ascending: false });
        
      if (ownedError) {
        throw ownedError;
      }
      
      // Get acceptances made by the user
      const { data: userAcceptances, error: userError } = await supabase
        .from('task_acceptances')
        .select(`
          id,
          task_id,
          task_title,
          task_owner_id,
          task_owner_first_name,
          status,
          created_at
        `)
        .eq('acceptor_id', currentUserId)
        .eq('status', 'pending') // Only get pending acceptances
        .order('created_at', { ascending: false });
        
      if (userError) {
        throw userError;
      }
      
      // Get conversations related to tasks directly (no nested query)
      const taskIds = [
        ...(ownedTaskAcceptances || []).map(a => a.task_id),
        ...(userAcceptances || []).map(a => a.task_id)
      ].filter(Boolean);
      
      // Only proceed with conversation lookup if we have task IDs
      let taskToConversationMap: Record<string, string> = {};
      
      if (taskIds.length > 0) {
        // Add a fallback ID to avoid empty IN clause
        const taskIdsForQuery = taskIds;
        
        const { data: taskConversations, error: convError } = await supabase
          .from('conversations')
          .select('id, task_id')
          .in('task_id', taskIdsForQuery);
          
        if (convError) throw convError;
        
        // Create a map of task_id to conversation_id
        taskToConversationMap = (taskConversations || []).reduce((map, conv) => {
          if (conv.task_id) {
            map[conv.task_id] = conv.id;
          }
          return map;
        }, {} as Record<string, string>);
      }
      
      // Format owned task acceptances
      const formattedOwnedAcceptances = ownedTaskAcceptances.map(acceptance => ({
        id: acceptance.id,
        task_id: acceptance.task_id,
        task_title: acceptance.task_title,
        sender_id: acceptance.acceptor_id,
        sender_name: acceptance.acceptor_first_name,
        sender_avatar: acceptance.acceptor_avatar_url,
        status: acceptance.status,
        created_at: acceptance.created_at,
        isTaskOwner: true,
        acceptance_id: acceptance.id,
        conversation_id: acceptance.task_id ? taskToConversationMap[acceptance.task_id] : undefined
      }));
      
      // Format user's acceptances
      const formattedUserAcceptances = userAcceptances.map(acceptance => ({
        id: acceptance.id,
        task_id: acceptance.task_id,
        task_title: acceptance.task_title,
        sender_id: currentUserId,
        sender_name: 'You',
        status: acceptance.status,
        created_at: acceptance.created_at,
        isTaskOwner: false,
        acceptance_id: acceptance.id,
        conversation_id: acceptance.task_id ? taskToConversationMap[acceptance.task_id] : undefined
      }));
      
      // Combine and sort by date
      const allAcceptances = [
        ...formattedOwnedAcceptances, 
        ...formattedUserAcceptances
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setAcceptances(allAcceptances);
      setError(null);
    } catch (err) {
      logger.error('Error fetching acceptances:', err);
      setError('Failed to load task acceptances.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle refresh of task acceptances
  const handleRefresh = async () => {
    if (!userId) return;
    await fetchAcceptances(userId);
  };
  
  // Toggle section expansion
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  // Handle when status is updated (confirmation/rejection)
  const handleStatusUpdate = async (acceptanceId: string, status: 'confirmed' | 'rejected') => {
    // Immediately remove the acceptance from the list
    setAcceptances(prevAcceptances => 
      prevAcceptances.filter(acceptance => 
        acceptance.acceptance_id !== acceptanceId
      )
    );
    
    // If confirmed, find the related conversation and navigate to it
    if (status === 'confirmed') {
      const acceptance = acceptances.find(a => a.acceptance_id === acceptanceId);
      if (acceptance?.conversation_id) {
        // Navigate in the callback to give time for the acceptance to be processed
        setTimeout(() => {
          router.push(`/chat/${acceptance.conversation_id}`);
        }, 500);
      }
    }
    
    // Refresh in the background to ensure data consistency
    setTimeout(() => {
      if (userId) {
        fetchAcceptances(userId);
      }
    }, 1000);
  };
  
  // Open the conversation for a task
  const handleOpenChat = (conversationId: string) => {
    if (conversationId) {
      router.push(`/chat/${conversationId}`);
    }
  };
  
  // Filter to only show pending acceptances
  const pendingAcceptances = acceptances.filter(acceptance => 
    acceptance.status === 'pending'
  );
  
  // Don't render if there are no pending acceptances
  if (pendingAcceptances.length === 0 && !loading) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.header, expanded ? { borderBottomWidth: 1 } : { borderBottomWidth: 0 }]}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <Text style={styles.title}>Task Requests</Text>
        <View style={styles.headerRight}>
          {pendingAcceptances.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingAcceptances.length}</Text>
            </View>
          )}
          {expanded ? (
            <ChevronUp size={20} color={Colors.text} />
          ) : (
            <ChevronDown size={20} color={Colors.text} />
          )}
        </View>
      </TouchableOpacity>
      
      {expanded ? (
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading requests...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <AlertCircle size={20} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <View style={styles.scrollContainer}>
              <FlatList
                data={pendingAcceptances}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TaskAcceptanceCard
                    id={item.id}
                    taskId={item.task_id}
                    taskTitle={item.task_title}
                    senderId={item.sender_id}
                    senderName={item.sender_name}
                    senderAvatar={item.sender_avatar}
                    status={item.status as 'pending' | 'confirmed' | 'rejected'}
                    isTaskOwner={item.isTaskOwner || false}
                    createdAt={item.created_at}
                    acceptanceId={item.acceptance_id}
                    conversationId={item.conversation_id}
                    onStatusUpdate={handleStatusUpdate}
                    onOpenChat={handleOpenChat}
                  />
                )}
                contentContainerStyle={styles.list}
                scrollEnabled={true}
                nestedScrollEnabled={true}
              />
            </View>
          )}
          
          {pendingAcceptances.length > 0 && (
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => router.push('/chat')}
              accessibilityRole="button"
              accessibilityLabel="View all in chat"
            >
              <Text style={styles.viewAllText}>View all in Chat</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomColor: Colors.border,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: Colors.warning,
    borderRadius: 10,
    marginRight: 8,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Bold',
    paddingHorizontal: 6,
  },
  title: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
  },
  content: {
    padding: 16,
  },
  scrollContainer: {
    maxHeight: 300,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    color: Colors.textSecondary,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    color: Colors.error,
    marginLeft: 8,
    textAlign: 'center',
    fontFamily: 'SpaceGrotesk-Medium',
  },
  list: {
    paddingBottom: 0,
  },
  viewAllButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary + '10',
    borderRadius: 8,
    alignItems: 'center',
  },
  viewAllText: {
    color: Colors.primary,
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 14,
  },
}); 