import React, { useState, useEffect } from 'react';
import { View, Text, SectionList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isYesterday } from 'date-fns';
import { chatService, Conversation } from '../../services/chatService';
import { supabase } from '../../lib/supabase';
import Colors from '../../constants/Colors';
import { EmptyState } from '../shared/EmptyState';
import { logger } from '../../utils/logger';
import { Filter, Briefcase, CheckCircle, Clock } from 'lucide-react-native';

// Define TaskType interface to satisfy TS type checking
interface TaskType {
  id?: string;
  title?: string;
  status?: string;
  created_by?: string;
  assigned_to?: string;
  has_pending_acceptances?: boolean;
}

// Original Conversation interface for reference (partial implementation)
interface BaseConversation {
  id: string;
  participants?: Array<{
    id: string;
    profile?: {
      first_name?: string;
      avatar_url?: string;
    };
  }>;
  last_message?: string;
  last_message_at?: string;
  created_at: string;
  updated_at?: string;
  unread_count: number;
}

// Define TaskAcceptance interface
interface TaskAcceptance {
  id: string;
  task_id: string;
  task_title: string;
  acceptor_id: string;
  acceptor_first_name?: string;
  task_owner_id: string;
  task_owner_first_name?: string;
  status: 'pending' | 'confirmed' | 'rejected';
  created_at: string;
  conversation_id?: string;
}

// Extend the Conversation interface for local use
interface ExtendedConversation extends Omit<Conversation, 'unread_count'> {
  task?: TaskType;
  is_application?: boolean;
  acceptance_id?: string;
  acceptance_status?: 'pending' | 'confirmed' | 'rejected';
  task_id?: string;
  unread_count?: number;
  conversation_id?: string;
}

interface ConversationListProps {
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function ConversationList({ onRefresh, refreshing = false }: ConversationListProps) {
  const router = useRouter();
  const [conversations, setConversations] = useState<ExtendedConversation[]>([]);
  const [acceptances, setAcceptances] = useState<TaskAcceptance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'posted' | 'assigned' | 'applications'>('all');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user ID
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user?.id) {
          setCurrentUserId(data.session.user.id);
        }
      } catch (error) {
        logger.error('Error fetching current user:', error);
      }
    };
    
    fetchCurrentUser();
  }, []);

  const fetchConversations = async () => {
    try {
      // Reset error if any
      setError(null);
      
      const fetchedConversations = await chatService.getConversations();
      logger.log(`Fetched ${fetchedConversations.length} conversations`);
      
      // Cast to ExtendedConversation[] to satisfy TypeScript
      setConversations(fetchedConversations as ExtendedConversation[]);
    } catch (err: any) {
      logger.error('Error fetching conversations:', err);
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  // Fetch task acceptances
  const fetchAcceptances = async () => {
    if (!currentUserId) return;
    
    try {
      // Get acceptances for tasks owned by the user with conversations via join
      const { data: ownedTaskAcceptances, error: ownedError } = await supabase
        .from('task_acceptances')
        .select(`
          id,
          task_id,
          task_title,
          acceptor_id,
          acceptor_first_name,
          task_owner_id,
          status,
          created_at
        `)
        .eq('task_owner_id', currentUserId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
        
      if (ownedError) throw ownedError;
      
      // Get acceptances made by the user
      const { data: userAcceptances, error: userError } = await supabase
        .from('task_acceptances')
        .select(`
          id,
          task_id,
          task_title,
          task_owner_id,
          task_owner_first_name,
          acceptor_id,
          status,
          created_at
        `)
        .eq('acceptor_id', currentUserId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
        
      if (userError) throw userError;
      
      // Get conversations related to tasks
      const { data: taskConversations, error: convError } = await supabase
        .from('conversations')
        .select('id, task_id')
        .in('task_id', [
          ...(ownedTaskAcceptances || []).map(a => a.task_id),
          ...(userAcceptances || []).map(a => a.task_id)
        ].filter(Boolean));
        
      if (convError) throw convError;
      
      // Create a map of task_id to conversation_id
      const taskToConversationMap = (taskConversations || []).reduce((map, conv) => {
        if (conv.task_id) {
          map[conv.task_id] = conv.id;
        }
        return map;
      }, {} as Record<string, string>);
      
      // Add conversation_id to each acceptance
      const ownedWithConversations = (ownedTaskAcceptances || []).map(acceptance => ({
        ...acceptance,
        conversation_id: acceptance.task_id ? taskToConversationMap[acceptance.task_id] : undefined
      }));
      
      const userWithConversations = (userAcceptances || []).map(acceptance => ({
        ...acceptance,
        conversation_id: acceptance.task_id ? taskToConversationMap[acceptance.task_id] : undefined
      }));
      
      // Combine both types of acceptances
      setAcceptances([
        ...ownedWithConversations,
        ...userWithConversations
      ]);
      
    } catch (err) {
      logger.error('Error fetching acceptances:', err);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchConversations();
  }, []);

  // Fetch acceptances when user ID is available
  useEffect(() => {
    if (currentUserId) {
      fetchAcceptances();
    }
  }, [currentUserId]);

  // Set up subscription for real-time updates when acceptances are confirmed
  useEffect(() => {
    if (!currentUserId) return;
    
    // Create a channel for task acceptances
    const acceptanceChannel = supabase
      .channel('task-acceptances-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'task_acceptances',
        filter: `acceptor_id=eq.${currentUserId}`,
      }, () => {
        fetchAcceptances();
        fetchConversations();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'task_acceptances',
        filter: `task_owner_id=eq.${currentUserId}`,
      }, () => {
        fetchAcceptances();
        fetchConversations();
      })
      .subscribe();
      
    // Create a channel for task status updates  
    const taskChannel = supabase
      .channel('task-status-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'tasks',
      }, () => {
        fetchConversations();
      })
      .subscribe();
      
    // Create a channel for conversation updates
    const conversationChannel = supabase
      .channel('conversation-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
      }, () => {
        fetchConversations();
      })
      .subscribe();
      
    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(acceptanceChannel);
      supabase.removeChannel(taskChannel);
      supabase.removeChannel(conversationChannel);
    };
  }, [currentUserId]);

  // Filter conversations based on selected type
  const filteredConversations = conversations.filter(conversation => {
    if (!currentUserId) return true;
    
    if (filterType === 'posted') {
      return conversation.task?.created_by === currentUserId;
    } else if (filterType === 'assigned') {
      return conversation.task?.assigned_to === currentUserId;
    } else if (filterType === 'applications') {
      return conversation.task?.has_pending_acceptances === true;
    }
    
    return true;
  });

  // Format date/time for conversation list items
  const formatConversationTime = (dateString?: string): string => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    
    // If message is from today, show time only
    if (isToday(date)) {
      return format(date, 'h:mm a');
    }
    
    // If message is from yesterday, show 'Yesterday'
    if (isYesterday(date)) {
      return 'Yesterday';
    }
    
    // If message is from this year, show date only
    if (date.getFullYear() === new Date().getFullYear()) {
      return format(date, 'MMM d');
    }
    
    // Otherwise show date and year
    return format(date, 'MMM d, yyyy');
  };

  // Handle conversation press
  const handleConversationPress = (item: ExtendedConversation | TaskAcceptance) => {
    // Check if item is a TaskAcceptance
    if ('conversation_id' in item && item.conversation_id) {
      router.push(`/chat/${item.conversation_id}` as any);
    } else if ('id' in item) {
      // For regular conversations
      router.push(`/chat/${item.id}` as any);
    }
  };

  // Handle refresh request
  const handleRefresh = async () => {
    if (onRefresh) {
      onRefresh();
    } else {
      setLoading(true);
      await Promise.all([fetchConversations(), fetchAcceptances()]);
    }
  };

  // Handle filter toggle
  const toggleFilter = () => {
    if (filterType === 'all') setFilterType('posted');
    else if (filterType === 'posted') setFilterType('assigned');
    else if (filterType === 'assigned') setFilterType('applications');
    else setFilterType('all');
  };

  // Filter conversations into categories
  const categorizeConversations = () => {
    if (!currentUserId) {
      return {
        tasksIDo: [],
        tasksIAssign: [],
        applications: []
      };
    }
    
    // Tasks the user is assigned to do
    const tasksIDo = filteredConversations.filter(conversation => 
      conversation.task?.assigned_to === currentUserId && 
      ['assigned', 'in_progress', 'finished', 'completed'].includes(conversation.task?.status || '')
    );
    
    // Tasks the user has created/posted and assigned to others
    const tasksIAssign = filteredConversations.filter(conversation => 
      conversation.task?.created_by === currentUserId && 
      ['assigned', 'in_progress', 'finished', 'completed'].includes(conversation.task?.status || '') &&
      conversation.task?.assigned_to !== currentUserId
    );
    
    // Transform acceptances into a format compatible with conversations
    const applications = acceptances.map(acceptance => {
      const isTaskOwner = acceptance.task_owner_id === currentUserId;
      const otherPersonId = isTaskOwner ? acceptance.acceptor_id : acceptance.task_owner_id;
      const otherPersonName = isTaskOwner ? acceptance.acceptor_first_name : acceptance.task_owner_first_name;
      
      // First convert to unknown, then to ExtendedConversation to satisfy TypeScript
      return {
        id: acceptance.id,
        task_id: acceptance.task_id,
        task: {
          id: acceptance.task_id,
          title: acceptance.task_title,
          status: 'pending_acceptance',
          created_by: acceptance.task_owner_id,
          assigned_to: acceptance.acceptor_id,
          has_pending_acceptances: true
        },
        last_message: isTaskOwner 
          ? `${otherPersonName || 'Someone'} wants to help with this task` 
          : 'Waiting for confirmation on your application',
        participants: [{
          id: otherPersonId,
          profile: {
            first_name: otherPersonName || 'User',
          }
        }],
        created_at: acceptance.created_at,
        updated_at: acceptance.created_at,
        is_application: true,
        acceptance_id: acceptance.id,
        acceptance_status: acceptance.status,
        conversation_id: acceptance.conversation_id,
        unread_count: 0
      } as unknown as ExtendedConversation;
    });
    
    return { tasksIDo, tasksIAssign, applications };
  };
  
  const { tasksIDo, tasksIAssign, applications } = categorizeConversations();
  
  // Create sections for the SectionList
  const sections = [
    { title: 'Applications', data: applications, icon: 'clock' },
    { title: 'Tasks To Do', data: tasksIDo, icon: 'briefcase' },
    { title: 'Tasks I Assign', data: tasksIAssign, icon: 'check' },
  ].filter(section => section.data.length > 0); // Only show sections with conversations

  // Render section header with improved styling and icon
  const renderSectionHeader = ({ section }: { section: { title: string; data: ExtendedConversation[] | TaskAcceptance[]; icon: string } }) => {
    return (
      <View style={styles.sectionHeader}>
        {section.icon === 'briefcase' ? (
          <Briefcase size={18} color={Colors.primary} style={styles.sectionIcon} />
        ) : section.icon === 'check' ? (
          <CheckCircle size={18} color={Colors.primary} style={styles.sectionIcon} />
        ) : (
          <Clock size={18} color={Colors.primary} style={styles.sectionIcon} />
        )}
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Text style={styles.sectionCount}>({section.data.length})</Text>
      </View>
    );
  };

  // Render conversation filter toggle
  const renderFilterToggle = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity 
        style={[
          styles.filterButton, 
          filterType === 'all' ? styles.activeFilter : undefined
        ]} 
        onPress={() => setFilterType('all')}
      >
        <Text style={[
          styles.filterText,
          filterType === 'all' ? styles.activeFilterText : undefined
        ]}>All</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[
          styles.filterButton, 
          filterType === 'applications' ? styles.activeFilter : undefined
        ]} 
        onPress={() => setFilterType('applications')}
      >
        <Text style={[
          styles.filterText,
          filterType === 'applications' ? styles.activeFilterText : undefined
        ]}>Applications</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[
          styles.filterButton, 
          filterType === 'posted' ? styles.activeFilter : undefined
        ]} 
        onPress={() => setFilterType('posted')}
      >
        <Text style={[
          styles.filterText,
          filterType === 'posted' ? styles.activeFilterText : undefined
        ]}>Posted</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[
          styles.filterButton, 
          filterType === 'assigned' ? styles.activeFilter : undefined
        ]} 
        onPress={() => setFilterType('assigned')}
      >
        <Text style={[
          styles.filterText,
          filterType === 'assigned' ? styles.activeFilterText : undefined
        ]}>Assigned</Text>
      </TouchableOpacity>
    </View>
  );

  // Render a conversation item
  const renderConversationItem = ({ item }: { item: ExtendedConversation }) => {
    // Get other participant's name
    const otherParticipants = item.participants || [];
    const otherParticipant = otherParticipants.length > 0 ? otherParticipants[0]?.profile : null;
    const participantName = otherParticipant?.first_name || 'Unknown';
    
    // Format task status
    const taskStatus = item.task?.status || 'Unknown';
    const statusText = taskStatus.charAt(0).toUpperCase() + taskStatus.slice(1).replace(/_/g, ' ');
    
    // Determine if user is task creator or assigned person
    const isTaskCreator = item.task?.created_by === currentUserId;
    const isTaskAssignee = item.task?.assigned_to === currentUserId;
    const isApplication = item.is_application === true;
    
    return (
      <TouchableOpacity
        style={[styles.conversationItem, isApplication && styles.applicationItem]}
        onPress={() => handleConversationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {otherParticipant?.avatar_url ? (
            <Ionicons name="person-circle" size={50} color={Colors.primary} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {participantName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.conversationDetails}>
          <View style={styles.conversationHeader}>
            <Text style={styles.participantName}>{participantName}</Text>
            <Text style={styles.timeText}>{formatConversationTime(item.last_message_at || item.updated_at || item.created_at)}</Text>
          </View>
          
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle} numberOfLines={1}>{item.task?.title || 'Untitled Task'}</Text>
            
            <View style={styles.badgeContainer}>
              {isApplication && (
                <View style={[styles.badge, styles.applicationBadge]}>
                  <Text style={styles.badgeText}>Pending</Text>
                </View>
              )}
              
              {isTaskCreator ? (
                <View style={[styles.badge, styles.ownerBadge]}>
                  <Text style={styles.badgeText}>Posted</Text>
                </View>
              ) : null}
              
              {isTaskAssignee ? (
                <View style={[styles.badge, styles.assigneeBadge]}>
                  <Text style={styles.badgeText}>Assigned</Text>
                </View>
              ) : null}
              
              {!isApplication && (
              <View style={[
                styles.badge, 
                taskStatus === 'pending' ? styles.pendingBadge : 
                taskStatus === 'assigned' ? styles.assignedBadge : 
                taskStatus === 'completed' ? styles.completedBadge : 
                styles.defaultBadge
              ]}>
                <Text style={styles.badgeText}>{statusText}</Text>
              </View>
              )}
            </View>
          </View>
          
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.last_message || 'Start a conversation...'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Render a separator between conversation items
  const renderSeparator = () => <View style={styles.separator} />;

  // Render the empty state component
  const renderEmptyComponent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      );
    }
    
    if (error) {
      return (
        <EmptyState
          title="Error Loading Conversations"
          message={error}
          buttonText="Try Again"
          onButtonPress={handleRefresh}
        />
      );
    }
    
    return (
      <EmptyState
        title="No Conversations"
        message="You don't have any active task conversations yet. Accept a task or have someone accept your tasks to start a conversation."
        buttonText="Browse Tasks"
        onButtonPress={() => router.push('/tasks' as any)}
      />
    );
  };

  return (
    <View style={styles.container}>
      {renderFilterToggle()}
      
      {loading && conversations.length === 0 && acceptances.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : sections.length > 0 ? (
        <SectionList
          sections={sections}
        renderItem={renderConversationItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item: any) => item.id || Math.random().toString()}
        ItemSeparatorComponent={renderSeparator}
          stickySectionHeadersEnabled={true}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={handleRefresh}
          ListEmptyComponent={renderEmptyComponent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={5}
      />
      ) : (
        renderEmptyComponent()
      )}
    </View>
  );
}

// Add default export
export default ConversationList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    marginBottom: 16,
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 4,
  },
  activeFilter: {
    backgroundColor: Colors.primary + '20',
  },
  filterText: {
    color: Colors.textSecondary,
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 14,
  },
  activeFilterText: {
    color: Colors.primary,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Colors.cardBackground,
  },
  applicationItem: {
    backgroundColor: Colors.cardBackground + '90',
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.primary,
  },
  conversationDetails: {
    flex: 1,
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
    color: Colors.textSecondary,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  taskInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskTitle: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.primary,
    flex: 1,
  },
  badgeContainer: {
    flexDirection: 'row',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 4,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk-Medium',
    color: '#fff',
  },
  ownerBadge: {
    backgroundColor: Colors.primary,
  },
  assigneeBadge: {
    backgroundColor: '#9C27B0',
  },
  applicationBadge: {
    backgroundColor: Colors.warning,
  },
  pendingBadge: {
    backgroundColor: '#FF9800',
  },
  assignedBadge: {
    backgroundColor: '#2196F3',
  },
  completedBadge: {
    backgroundColor: '#4CAF50',
  },
  defaultBadge: {
    backgroundColor: '#9E9E9E',
  },
  lastMessage: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: Colors.textSecondary,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
  },
  sectionCount: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.textSecondary,
    marginLeft: 4,
  },
}); 