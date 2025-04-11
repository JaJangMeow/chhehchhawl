import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, X, Clock, User, MessageCircle } from 'lucide-react-native';
import Colors from '@/app/constants/Colors';
import { formatRelativeTime } from '@/app/utils/timeUtils';
import { taskAcceptanceService, TaskAcceptance } from '@/app/services/taskAcceptanceService';
import { supabase } from '@/app/lib/supabase';
import { logger } from '@/app/utils/logger';
import * as Haptics from 'expo-haptics';
import { taskService } from '@/app/services/taskService';
import { formatDistance } from 'date-fns';

interface AcceptanceCardProps {
  acceptance: TaskAcceptance;
  onUpdateStatus?: () => void;
  currentUserId: string;
  isTaskOwner: boolean;
}

const AcceptanceCard = ({
  acceptance,
  onUpdateStatus,
  currentUserId,
  isTaskOwner
}: AcceptanceCardProps) => {
  const router = useRouter();
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'rejected'>(
    acceptance.status as 'pending' | 'confirmed' | 'rejected'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptorProfile, setAcceptorProfile] = useState<any>(null);
  const [subscriptionActive, setSubscriptionActive] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!acceptance.acceptor_first_name) {
          const { data } = await supabase
            .from('profiles')
            .select('first_name, avatar_url')
            .eq('id', acceptance.acceptor_id)
            .single();
          
          setAcceptorProfile(data);
        } else {
          setAcceptorProfile({
            first_name: acceptance.acceptor_first_name,
            avatar_url: acceptance.acceptor_avatar_url
          });
        }
      } catch (err) {
        logger.error('Error fetching profile:', err);
      }
    };
    
    fetchProfile();
  }, [acceptance]);

  useEffect(() => {
    if (subscriptionActive) return;
    
    const subscription = taskAcceptanceService.subscribeToTaskAcceptanceUpdates(
      acceptance.id,
      (payload: any) => {
        if (payload.new && payload.new.status) {
          setStatus(payload.new.status);
          if (onUpdateStatus) {
            onUpdateStatus();
          }
        }
      }
    );
    
    setSubscriptionActive(true);
    
    return () => {
      subscription.unsubscribe();
      setSubscriptionActive(false);
    };
  }, [acceptance.id, onUpdateStatus, subscriptionActive]);

  const handleConfirm = async () => {
    if (!isTaskOwner) return;
    
    setLoading(true);
    setError(null);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const result = await taskService.respondToTaskAcceptance(
        acceptance.id,
        'confirmed'
      );
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to confirm task');
      }
      
      setStatus('confirmed');
      if (onUpdateStatus) {
        onUpdateStatus();
      }
    } catch (error: any) {
      logger.error('Error confirming task acceptance:', error);
      setError(error.message || 'Failed to confirm task acceptance');
      Alert.alert('Error', error.message || 'Failed to confirm task acceptance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!isTaskOwner) return;
    
    setLoading(true);
    setError(null);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const result = await taskService.respondToTaskAcceptance(
        acceptance.id,
        'rejected'
      );
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to reject task');
      }
      
      setStatus('rejected');
      if (onUpdateStatus) {
        onUpdateStatus();
      }
    } catch (error: any) {
      logger.error('Error rejecting task acceptance:', error);
      setError(error.message || 'Failed to reject task acceptance');
      Alert.alert('Error', error.message || 'Failed to reject task acceptance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const navigateToTask = () => {
    router.push(`/tasks/${acceptance.task_id}` as any);
  };

  const renderStatusBadge = () => {
    let StatusIcon;
    let statusText;
    let statusColor;
    
    switch (status) {
      case 'confirmed':
        StatusIcon = Check;
        statusText = 'Confirmed';
        statusColor = Colors.success;
        break;
      case 'rejected':
        StatusIcon = X;
        statusText = 'Rejected';
        statusColor = Colors.error;
        break;
      case 'pending':
      default:
        StatusIcon = Clock;
        statusText = 'Pending';
        statusColor = Colors.warning;
        break;
    }
    
    return (
      <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
        <StatusIcon color={statusColor} size={14} />
        <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
      </View>
    );
  };

  const getTimeAgo = () => {
    try {
      return formatRelativeTime(acceptance.created_at);
    } catch (error) {
      return '';
    }
  };

  const timeAgo = getTimeAgo();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileInfo}>
          <View style={styles.avatarContainer}>
            {acceptorProfile?.avatar_url ? (
              <Image 
                source={{ uri: acceptorProfile.avatar_url }} 
                style={styles.avatar} 
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={16} color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.nameContainer}>
            <Text style={styles.name}>
              {acceptorProfile?.first_name || 'Anonymous'}
            </Text>
            <Text style={styles.timestamp}>
              {timeAgo}
            </Text>
          </View>
        </View>
        {renderStatusBadge()}
      </View>
      
      {acceptance.message && (
        <View style={styles.messageContainer}>
          <Text style={styles.message}>{acceptance.message}</Text>
        </View>
      )}
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.viewTaskButton}
          onPress={navigateToTask}
        >
          <Text style={styles.viewTaskText}>View Task</Text>
        </TouchableOpacity>
        
        {isTaskOwner && status === 'pending' && (
          <View style={styles.buttonsContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.rejectButton]}
              onPress={handleReject}
              disabled={loading}
            >
              {loading ? 
                <ActivityIndicator size="small" color="#fff" /> : 
                <Text style={styles.actionButtonText}>Reject</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.confirmButton]}
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading ? 
                <ActivityIndicator size="small" color="#fff" /> : 
                <Text style={styles.actionButtonText}>Confirm</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 8,
    marginHorizontal: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    justifyContent: 'center',
  },
  name: {
    fontWeight: '600',
    fontSize: 16,
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  messageContainer: {
    borderLeftWidth: 3,
    borderLeftColor: '#e1e1e1',
    paddingLeft: 12,
    marginBottom: 16,
  },
  message: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  actionsContainer: {
    marginTop: 8,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: Colors.success,
  },
  rejectButton: {
    backgroundColor: Colors.error,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  viewTaskButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewTaskText: {
    color: Colors.primary,
    fontWeight: '500',
  }
});

export default AcceptanceCard;
