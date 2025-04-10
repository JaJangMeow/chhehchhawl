import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/app/lib/supabase';
import { Check, X, Clock, AlertCircle, ExternalLink } from 'lucide-react-native';
import Colors from '@/app/constants/Colors';
import { logger } from '@/app/utils/logger';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content?: string;
  created_at: string;
  is_read: boolean;
  is_notification?: boolean;
  is_system_message?: boolean;
  notification_type?: string;
  notification_data?: {
    task_id: string;
    task_title: string;
    accepter_id: string;
    owner_id: string;
    status: 'pending' | 'confirmed' | 'rejected';
    timestamp?: string;
  };
}

interface TaskAcceptanceCardProps {
  message: Message;
  currentUserId: string;
  onUpdateStatus?: () => void;
}

export default function TaskAcceptanceCard({
  message,
  currentUserId,
  onUpdateStatus
}: TaskAcceptanceCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('pending');
  const [error, setError] = useState<string | null>(null);
  const [isTaskOwner, setIsTaskOwner] = useState(false);
  const [accepterProfile, setAccepterProfile] = useState<any>(null);
  const [ownerProfile, setOwnerProfile] = useState<any>(null);

  // Ensure notificationData is properly typed
  const notificationData = message.notification_data || {
    task_id: '',
    task_title: '',
    accepter_id: '',
    owner_id: '',
    status: 'pending' as const,
    timestamp: ''
  };

  // Initialize component state
  useEffect(() => {
    const initializeCard = async () => {
      if (!notificationData) {
        setError('Missing notification data');
        return;
      }

      // Set initial status
      if (notificationData.status) {
        setStatus(notificationData.status);
      }

      // Determine if current user is task owner
      const taskOwnerCheck = notificationData.owner_id === currentUserId;
      setIsTaskOwner(taskOwnerCheck);

      // Load profiles for both accepter and owner
      try {
        if (notificationData.accepter_id) {
          const { data: accepterData } = await supabase
            .from('profiles')
            .select('first_name, avatar_url')
            .eq('id', notificationData.accepter_id)
            .single();
          
          setAccepterProfile(accepterData);
        }
        
        if (notificationData.owner_id) {
          const { data: ownerData } = await supabase
            .from('profiles')
            .select('first_name, avatar_url')
            .eq('id', notificationData.owner_id)
            .single();
          
          setOwnerProfile(ownerData);
        }
      } catch (err) {
        logger.error('Error loading profiles:', err);
      }
    };

    initializeCard();
  }, [message, currentUserId]);

  // Subscribe to real-time updates for this notification message
  useEffect(() => {
    const messageSubscription = supabase
      .channel('message-update')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `id=eq.${message.id}`
        },
        (payload) => {
          logger.log('Message updated:', payload);
          if (payload.new && payload.new.notification_data) {
            try {
              const updatedNotificationData = payload.new.notification_data;
              // Update the status if it changed
              if (updatedNotificationData.status && updatedNotificationData.status !== status) {
                setStatus(updatedNotificationData.status);
                if (onUpdateStatus) onUpdateStatus();
              }
            } catch (err) {
              logger.error('Error parsing notification data:', err);
            }
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(messageSubscription);
    };
  }, [message.id, status, onUpdateStatus]);

  const handleViewTask = () => {
    try {
      if (!notificationData?.task_id) {
        Alert.alert('Error', 'Task ID is missing');
        return;
      }
      
      router.push(`/tasks/${notificationData.task_id}` as any);
    } catch (err) {
      logger.error('Navigation error:', err);
      Alert.alert('Error', 'Could not navigate to task. Please try again.');
    }
  };

  const handleConfirm = async () => {
    if (!isTaskOwner) return;
    
    setLoading(true);
    setError(null);
    try {
      if (!notificationData.task_id || !notificationData.owner_id) {
        throw new Error('Missing task or owner information');
      }
      
      const { data, error } = await supabase.rpc('respond_to_task_acceptance', {
        p_notification_id: message.id,
        p_task_id: notificationData.task_id,
        p_user_id: notificationData.owner_id,
        p_response: 'confirmed'
      });
      
      if (error) throw error;
      
      setStatus('confirmed');
      if (onUpdateStatus) onUpdateStatus();
      
    } catch (error: any) {
      logger.error('Error confirming task:', error);
      setError(error.message || 'Failed to confirm task');
      Alert.alert('Error', error.message || 'Failed to confirm task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!isTaskOwner) return;
    
    setLoading(true);
    setError(null);
    try {
      if (!notificationData.task_id || !notificationData.owner_id) {
        throw new Error('Missing task or owner information');
      }
      
      const { data, error } = await supabase.rpc('respond_to_task_acceptance', {
        p_notification_id: message.id,
        p_task_id: notificationData.task_id,
        p_user_id: notificationData.owner_id,
        p_response: 'rejected'
      });
      
      if (error) throw error;
      
      setStatus('rejected');
      if (onUpdateStatus) onUpdateStatus();
      
    } catch (error: any) {
      logger.error('Error rejecting task:', error);
      setError(error.message || 'Failed to reject task');
      Alert.alert('Error', error.message || 'Failed to reject task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to render the profile image
  const renderProfileImage = (profile: any) => {
    if (profile?.avatar_url) {
      return (
        <Image 
          source={{ uri: profile.avatar_url }} 
          style={styles.avatar} 
        />
      );
    }
    
    return (
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarInitial}>
          {profile?.first_name?.charAt(0)?.toUpperCase() || '?'}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={Colors.primary} size="small" />
        <Text style={styles.loadingText}>Processing...</Text>
      </View>
    );
  }

  // Display error state if there's an error
  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <AlertCircle size={20} color={Colors.error} />
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => setError(null)}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Task owner sees the request from accepter
  if (isTaskOwner)
    return (
      <View style={[styles.container, getContainerStyle(status)]}>
        <View style={styles.header}>
          <View style={styles.profileSection}>
            {renderProfileImage(accepterProfile)}
            <Text style={styles.title}>Task Request</Text>
          </View>
          {status === 'pending' && (
            <View style={styles.statusBadge}>
              <Clock size={12} color={Colors.warning} />
              <Text style={styles.statusText}>Pending</Text>
            </View>
          )}
          {status === 'confirmed' && (
            <View style={[styles.statusBadge, styles.confirmedBadge]}>
              <Check size={12} color={Colors.success} />
              <Text style={[styles.statusText, styles.confirmedText]}>Confirmed</Text>
            </View>
          )}
          {status === 'rejected' && (
            <View style={[styles.statusBadge, styles.rejectedBadge]}>
              <X size={12} color={Colors.error} />
              <Text style={[styles.statusText, styles.rejectedText]}>Declined</Text>
            </View>
          )}
        </View>
        
        <View style={styles.cardBody}>
          <Text style={styles.message}>
            <Text style={styles.username}>{accepterProfile?.first_name || 'Someone'}</Text> wants to take your task "
            <Text style={styles.taskTitle}>{notificationData.task_title || 'Untitled Task'}</Text>"
          </Text>
        </View>
        
        {status === 'pending' && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.confirmButton]} 
              onPress={handleConfirm}
            >
              <Check size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Confirm</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.rejectButton]} 
              onPress={handleReject}
            >
              <X size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {status !== 'pending' && (
          <TouchableOpacity 
            style={styles.viewTaskButton} 
            onPress={handleViewTask}
          >
            <ExternalLink size={16} color="#fff" />
            <Text style={styles.viewTaskText}>View Task</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  
  // Accepter sees their own request and status
  return (
    <View style={[styles.container, getContainerStyle(status)]}>
      <View style={styles.header}>
        <View style={styles.profileSection}>
          {renderProfileImage(ownerProfile)}
          <Text style={styles.title}>Task Acceptance</Text>
        </View>
        {status === 'pending' && (
          <View style={styles.statusBadge}>
            <Clock size={12} color={Colors.warning} />
            <Text style={styles.statusText}>Pending</Text>
          </View>
        )}
        {status === 'confirmed' && (
          <View style={[styles.statusBadge, styles.confirmedBadge]}>
            <Check size={12} color={Colors.success} />
            <Text style={[styles.statusText, styles.confirmedText]}>Confirmed</Text>
          </View>
        )}
        {status === 'rejected' && (
          <View style={[styles.statusBadge, styles.rejectedBadge]}>
            <X size={12} color={Colors.error} />
            <Text style={[styles.statusText, styles.rejectedText]}>Declined</Text>
          </View>
        )}
      </View>
      
      <View style={styles.cardBody}>
        <Text style={styles.message}>
          You requested to take task "{notificationData.task_title || 'Untitled Task'}" from <Text style={styles.username}>{ownerProfile?.first_name || 'Someone'}</Text>
        </Text>
      </View>
      
      {status === 'pending' && (
        <View style={styles.pendingNote}>
          <AlertCircle size={16} color={Colors.warning} />
          <Text style={styles.pendingNoteText}>Waiting for owner to confirm your request</Text>
        </View>
      )}
      
      {status !== 'pending' && (
        <TouchableOpacity 
          style={styles.viewTaskButton} 
          onPress={handleViewTask}
        >
          <ExternalLink size={16} color="#fff" />
          <Text style={styles.viewTaskText}>View Task</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Helper to get container style based on status
const getContainerStyle = (status: string) => {
  switch (status) {
    case 'confirmed':
      return styles.confirmedContainer;
    case 'rejected':
      return styles.rejectedContainer;
    default:
      return {};
  }
};

// Styles
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
    overflow: 'hidden',
  },
  confirmedContainer: {
    borderLeftColor: Colors.success,
  },
  rejectedContainer: {
    borderLeftColor: Colors.error,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    borderLeftColor: Colors.border,
  },
  loadingText: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderLeftColor: Colors.error,
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    marginVertical: 8,
    color: Colors.error,
    fontSize: 14,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.background,
    borderRadius: 4,
    marginTop: 8,
  },
  retryButtonText: {
    color: Colors.primary,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confirmedBadge: {
    backgroundColor: Colors.success + '20',
  },
  rejectedBadge: {
    backgroundColor: Colors.error + '20',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.warning,
    marginLeft: 4,
  },
  confirmedText: {
    color: Colors.success,
  },
  rejectedText: {
    color: Colors.error,
  },
  cardBody: {
    padding: 16,
  },
  message: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  username: {
    fontWeight: '600',
  },
  taskTitle: {
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    flex: 1,
  },
  confirmButton: {
    backgroundColor: Colors.success,
    borderBottomLeftRadius: 8,
  },
  rejectButton: {
    backgroundColor: Colors.error,
    borderBottomRightRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 15,
  },
  viewTaskButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewTaskText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  pendingNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '10',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  pendingNoteText: {
    marginLeft: 8,
    color: Colors.textSecondary,
    fontSize: 14,
  },
}); 