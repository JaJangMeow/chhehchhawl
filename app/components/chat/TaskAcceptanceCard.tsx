import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Check, X, Clock, AlertCircle, CheckCircle, XCircle, MessageCircle } from 'lucide-react-native';
import Colors from '@/app/constants/Colors';
import { taskService } from '@/app/services/taskService';
import { getUserId } from '@/app/lib/supabase';
import { supabase } from '@/app/lib/supabase';

interface TaskAcceptanceCardProps {
  id: string;
  taskId: string;
  taskTitle: string;
  acceptanceId?: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  status: 'pending' | 'confirmed' | 'rejected';
  isTaskOwner: boolean;
  createdAt: string;
  conversationId?: string;
  onStatusUpdate?: (acceptanceId: string, status: 'confirmed' | 'rejected') => void;
  onOpenChat?: (conversationId: string) => void;
}

export default function TaskAcceptanceCard({
  id,
  taskId,
  taskTitle,
  acceptanceId,
  senderId,
  senderName,
  senderAvatar,
  status,
  isTaskOwner,
  createdAt,
  conversationId,
  onStatusUpdate,
  onOpenChat
}: TaskAcceptanceCardProps) {
  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(status);
  const router = useRouter();

  // Format how long ago the acceptance was created
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  const timeAgo = formatDate(createdAt);

  // Handle confirmation of task acceptance
  const handleConfirm = async () => {
    if (!isTaskOwner) return;
    
    Alert.alert(
      "Confirm Task Assignment",
      `Are you sure you want to assign this task to ${senderName}? This will make the task unavailable to other users and reject all other pending applications.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Confirm", 
          onPress: async () => {
            setLoading(true);

            try {
              // Immediately notify parent component to update UI (optimistic update)
              if (onStatusUpdate) {
                onStatusUpdate(acceptanceId || id, 'confirmed');
              }
              
              const result = await taskService.respondToTaskAcceptance(
                acceptanceId || id,
                'confirmed',
                'Your application has been accepted! You can now start working on this task.'
              );

              if (result.success) {
                setCurrentStatus('confirmed');
                
                if (conversationId) {
                  // Short delay to allow the database changes to propagate
                  setTimeout(() => {
                    Alert.alert(
                      'Success', 
                      'Task has been assigned. Opening chat with the tasker.',
                      [
                        {
                          text: 'OK',
                          onPress: () => {
                            if (onOpenChat && conversationId) onOpenChat(conversationId);
                          }
                        }
                      ]
                    );
                  }, 500);
                } else {
                  Alert.alert('Success', 'Task has been assigned to this user.');
                }
              } else {
                Alert.alert('Error', result.message || 'Failed to confirm task acceptance.');
              }
            } catch (error) {
              console.error('Error confirming task acceptance:', error);
              Alert.alert('Error', 'Something went wrong while confirming the task acceptance.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Handle rejection of task acceptance
  const handleReject = async () => {
    if (!isTaskOwner) return;
    
    Alert.alert(
      "Reject Task Application",
      `Are you sure you want to reject ${senderName}'s application for this task?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reject", 
          onPress: async () => {
            setLoading(true);

            try {
              // Immediately notify parent component to update UI (optimistic update)
              if (onStatusUpdate) {
                onStatusUpdate(acceptanceId || id, 'rejected');
              }
              
              const result = await taskService.respondToTaskAcceptance(
                acceptanceId || id,
                'rejected',
                'Your application has been declined. Please check other available tasks.'
              );

              if (result.success) {
                setCurrentStatus('rejected');
                Alert.alert('Success', 'Task application has been rejected.');
              } else {
                Alert.alert('Error', result.message || 'Failed to reject task acceptance.');
              }
            } catch (error) {
              console.error('Error rejecting task acceptance:', error);
              Alert.alert('Error', 'Something went wrong while rejecting the task acceptance.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Handle view task details
  const handleViewTask = async () => {
    try {
      // First check if the task exists
      const { data, error } = await supabase
        .from('tasks')
        .select('id')
        .eq('id', taskId)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking task:', error);
        Alert.alert('Error', 'Could not access task details');
        return;
      }
      
      if (!data) {
        Alert.alert('Task Not Found', 'This task may have been deleted');
        return;
      }
      
      // If task exists, navigate to it
      router.push(`/tasks/${taskId}` as any);
    } catch (err) {
      console.error('Error checking task:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  // Handle opening chat
  const handleOpenChat = () => {
    if (conversationId && onOpenChat) {
      onOpenChat(conversationId);
    }
  };

  // Get status display text and color
  const getStatusDetails = () => {
    switch (currentStatus) {
      case 'confirmed':
        return {
          text: 'Confirmed',
          icon: <CheckCircle size={16} color="#4CAF50" />,
          color: '#4CAF50',
        };
      case 'rejected':
        return {
          text: 'Rejected',
          icon: <XCircle size={16} color="#F44336" />,
          color: '#F44336',
        };
      default:
        return {
          text: 'Pending',
          icon: <Clock size={16} color="#FF9800" />,
          color: '#FF9800',
        };
    }
  };

  const statusDetails = getStatusDetails();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {isTaskOwner ? 'Task Application' : 'Your Application'}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: `${statusDetails.color}20` }]}>
          {statusDetails.icon}
          <Text style={[styles.statusText, { color: statusDetails.color }]}>
            {statusDetails.text}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.userInfoContainer}>
          <View style={styles.avatarContainer}>
            {senderAvatar ? (
              <Image
                source={{ uri: senderAvatar }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {senderName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.userTextContainer}>
            <Text style={styles.userName}>{senderName}</Text>
            <Text style={styles.applyingText}>
              {isTaskOwner ? 'applying for ' : 'applied to '}
              <Text style={styles.taskTitle}>{taskTitle}</Text>
            </Text>
            <Text style={styles.timeAgo}>{timeAgo}</Text>
          </View>
        </View>

        {/* Show Confirm/Reject buttons for task owners with pending applications */}
        {isTaskOwner && currentStatus === 'pending' && (
          <View style={styles.actionsContainer}>
            {loading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.confirmButton]}
                  onPress={handleConfirm}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel="Confirm application"
                >
                  <Check size={16} color="#fff" />
                  <Text style={styles.actionText}>Confirm</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={handleReject}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel="Reject application"
                >
                  <X size={16} color="#fff" />
                  <Text style={styles.actionText}>Reject</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Show waiting message for users who applied to tasks (not task owners) */}
        {!isTaskOwner && currentStatus === 'pending' && (
          <View style={styles.waitingContainer}>
            <Clock size={16} color={Colors.warning} />
            <Text style={styles.waitingText}>Waiting for task owner to review your application</Text>
          </View>
        )}

        {/* Show confirmation messages */}
        {currentStatus === 'confirmed' && (
          <View style={styles.confirmedContainer}>
            <CheckCircle size={16} color="#4CAF50" />
            <Text style={styles.confirmedText}>
              {isTaskOwner
                ? `You've assigned this task to ${senderName}`
                : "You've been assigned to this task"}
            </Text>
          </View>
        )}

        {/* Show rejection messages */}
        {currentStatus === 'rejected' && (
          <View style={styles.rejectedContainer}>
            <XCircle size={16} color="#F44336" />
            <Text style={styles.rejectedText}>
              {isTaskOwner
                ? `You've rejected this application`
                : "Your application was not accepted"}
            </Text>
          </View>
        )}

        {/* Action buttons - changed ordering for better UX */}
        <View style={styles.bottomButtons}>
          {/* Chat button for confirmed applications or task owners */}
          {conversationId && (currentStatus === 'confirmed' || (isTaskOwner && currentStatus === 'pending')) && (
            <TouchableOpacity 
              style={[
                styles.chatButton,
                currentStatus === 'pending' ? styles.secondaryButton : styles.chatButton
              ]} 
              onPress={handleOpenChat}
              accessibilityRole="button"
              accessibilityLabel="Open chat"
            >
              <MessageCircle size={16} color={currentStatus === 'pending' ? Colors.primary : "#fff"} />
              <Text style={[
                styles.viewTaskText,
                currentStatus === 'pending' ? { color: Colors.primary } : { color: '#fff' }
              ]}>
                {currentStatus === 'confirmed' ? 'Open Chat' : 'Message Applicant'}
              </Text>
            </TouchableOpacity>
          )}

          {/* View task button */}
          <TouchableOpacity 
            style={[
              styles.viewTaskButton, 
              conversationId && (currentStatus === 'confirmed' || isTaskOwner) 
                ? styles.secondaryButton 
                : {}
            ]} 
            onPress={handleViewTask}
            accessibilityRole="button"
            accessibilityLabel="View task details"
          >
            <Text style={[
              styles.viewTaskText,
              conversationId && (currentStatus === 'confirmed' || isTaskOwner) 
                ? { color: Colors.primary } 
                : {}
            ]}>
              View Task
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.cardBackground,
  },
  title: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Medium',
    marginLeft: 4,
  },
  content: {
    padding: 16,
  },
  userInfoContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.border,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.primary,
  },
  userTextContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginBottom: 2,
  },
  applyingText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  taskTitle: {
    color: Colors.primary,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  timeAgo: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
  },
  confirmButton: {
    backgroundColor: Colors.success,
    marginRight: 8,
  },
  rejectButton: {
    backgroundColor: Colors.error,
    marginLeft: 8,
  },
  actionText: {
    color: Colors.white,
    marginLeft: 6,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  waitingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '10',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  waitingText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.warning,
  },
  confirmedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '10',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  confirmedText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.success,
  },
  rejectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '10',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  rejectedText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.error,
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  viewTaskButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  chatButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  viewTaskText: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    marginLeft: 6,
  },
}); 