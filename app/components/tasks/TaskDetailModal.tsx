import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  ScrollView,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { 
  MapPin, 
  Calendar, 
  IndianRupee, 
  Tag, 
  AlertCircle, 
  Star, 
  Clock, 
  Building2, 
  User, 
  CreditCard, 
  Wrench, 
  Info,
  X,
  MessageCircle
} from 'lucide-react-native';
import { Task } from '../../types/task';
import Colors from '../../constants/Colors';
import { formatPrice } from '../../utils/formatters';
import { getStatusColor, formatStatus, getTimeAgo, getUrgencyColor, formatDistance } from '../../utils/taskUtils';
import * as Haptics from 'expo-haptics';
import { taskService } from '../../services/taskService';
import { chatService } from '../../services/chatService';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

// Task priorities with colors
const TASK_PRIORITIES = {
  'low': { label: 'Low', color: '#4CAF50' },
  'medium': { label: 'Medium', color: '#FFC107' },
  'high': { label: 'High', color: '#F44336' }
};

// Task categories
const TASK_CATEGORIES = {
  'home': 'Home',
  'delivery': 'Delivery',
  'errands': 'Errands',
  'tech': 'Tech Support',
  'education': 'Education',
  'other': 'Other'
};

interface TaskDetailModalProps {
  task: Task | null;
  visible: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, visible, onClose, onRefresh }) => {
  const [accepting, setAccepting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  useEffect(() => {
    // Get the current user ID
    const getUser = async () => {
      const { data } = await supabase.auth.getSession();
      setCurrentUserId(data.session?.user?.id || null);
    };
    
    getUser();
  }, []);

  if (!task) return null;

  const photos = task.task_photos || [];
  const hasPhotos = photos.length > 0;
  const firstPhoto = hasPhotos ? photos[0] : null;

  const handleApply = async () => {
    if (!task) return;
    
    try {
      setAccepting(true);
      
      const result = await taskService.acceptTask(task.id);
      
      if (result.success) {
        // Show success message
        Alert.alert(
          'Task Accepted',
          'You have successfully accepted this task.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Close the modal
                onClose();
                
                // Refresh the task list if needed
                if (onRefresh) {
                  onRefresh();
                }
                
                // Navigation will be handled by taskService.acceptTask
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'There was a problem accepting this task. Please try again.');
      }
    } catch (error) {
      console.error('Error accepting task:', error);
    } finally {
      setAccepting(false);
    }
  };

  // Helper to determine if the task can be accepted by the current user
  const canAcceptTask = () => {
    if (!task || !currentUserId) return false;
    
    return (
      task.status === 'open' && 
      task.created_by !== currentUserId &&
      !task.assigned_to
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Close Button */}
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
          >
            <X size={24} color={Colors.text} />
          </TouchableOpacity>

          {/* Task Details */}
          <ScrollView style={styles.modalScrollContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>{task.title}</Text>
                {task.urgent && (
                  <View style={styles.urgentBadge}>
                    <AlertCircle size={14} color="#fff" />
                    <Text style={styles.urgentText}>Urgent</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Status and Category */}
            <View style={styles.modalMetaContainer}>
              {/* Status Badge */}
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}>
                <Text style={styles.statusText}>{getStatusLabel(task.status)}</Text>
              </View>
              
              {/* Category Badge */}
              {task.categories && task.categories.length > 0 && (
                <View style={styles.categoryBadge}>
                  <Tag size={14} color={Colors.textSecondary} />
                  <Text style={styles.categoryText}>
                    {TASK_CATEGORIES[task.categories[0] as keyof typeof TASK_CATEGORIES] || task.categories[0]}
                  </Text>
                </View>
              )}
            </View>

            {/* Summary Info */}
            <View style={styles.summaryContainer}>
              {/* Budget */}
              <View style={styles.summaryItem}>
                <IndianRupee size={16} color={Colors.textSecondary} />
                <Text style={styles.summaryText}>{formatPrice(task.budget)}</Text>
              </View>
              
              {/* Location */}
              {(task.location?.address || task.building_name) && (
                <View style={styles.summaryItem}>
                  <MapPin size={16} color={Colors.textSecondary} />
                  <Text style={styles.summaryText} numberOfLines={1}>
                    {task.location?.address || task.building_name || 'Location not specified'}
                  </Text>
                </View>
              )}
              
              {/* Deadline */}
              {task.deadline && (
                <View style={styles.summaryItem}>
                  <Calendar size={16} color={Colors.textSecondary} />
                  <Text style={styles.summaryText}>
                    {new Date(task.deadline).toLocaleDateString()}
                  </Text>
                </View>
              )}
              
              {/* Priority */}
              {task.priority && (
                <View style={styles.summaryItem}>
                  <Star size={16} color={Colors.textSecondary} />
                  <Text style={styles.summaryText}>
                    {TASK_PRIORITIES[task.priority as keyof typeof TASK_PRIORITIES]?.label || task.priority}
                  </Text>
                </View>
              )}
            </View>

            {/* Description */}
            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Description</Text>
              <View style={styles.descriptionContainer}>
                <Text style={styles.description}>{task.description || 'No description provided.'}</Text>
              </View>
            </View>

            {/* Task Details */}
            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Task Details</Text>
              <View style={styles.detailsGrid}>
                {/* Location */}
                <View style={styles.detailItem}>
                  <View style={styles.detailIcon}>
                    <MapPin size={18} color={Colors.textSecondary} />
                  </View>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>
                    {task.location?.address || task.building_name || 'Not specified'}
                  </Text>
                </View>
                
                {/* Deadline */}
                <View style={styles.detailItem}>
                  <View style={styles.detailIcon}>
                    <Calendar size={18} color={Colors.textSecondary} />
                  </View>
                  <Text style={styles.detailLabel}>Deadline</Text>
                  <Text style={styles.detailValue}>
                    {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
                  </Text>
                </View>
                
                {/* Estimated Time */}
                <View style={styles.detailItem}>
                  <View style={styles.detailIcon}>
                    <Clock size={18} color={Colors.textSecondary} />
                  </View>
                  <Text style={styles.detailLabel}>Estimated Time</Text>
                  <Text style={styles.detailValue}>
                    {task.estimated_time ? `${task.estimated_time} mins` : 'Not specified'}
                  </Text>
                </View>
                
                {/* Priority */}
                <View style={styles.detailItem}>
                  <View style={styles.detailIcon}>
                    <Star size={18} color={Colors.textSecondary} />
                  </View>
                  <Text style={styles.detailLabel}>Priority</Text>
                  <Text style={styles.detailValue}>
                    {TASK_PRIORITIES[task.priority as keyof typeof TASK_PRIORITIES]?.label || 'Medium'}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Photos Section */}
            {hasPhotos && (
              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Photos</Text>
                <View style={styles.photoGallery}>
                  {hasPhotos && firstPhoto ? (
                    <Image 
                      source={{ uri: firstPhoto }}
                      style={styles.modalImage}
                    />
                  ) : (
                    <View style={styles.placeholderImage}>
                      <Ionicons name="image-outline" size={32} color={Colors.textSecondary} />
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Apply Button */}
            {canAcceptTask() ? (
              <TouchableOpacity 
                style={styles.applyButton}
                onPress={handleApply}
                disabled={accepting}
              >
                {accepting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MessageCircle size={20} color="#fff" style={styles.buttonIcon} />
                    <Text style={styles.applyButtonText}>Accept & Chat</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.unavailableContainer}>
                <Text style={styles.unavailableText}>
                  {task.status !== 'open' ? 'This task is no longer available' : task.created_by === currentUserId ? 'You posted this task' : 'You cannot accept this task'}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  modalContent: {
    width: '100%',
    height: '90%',
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContent: {
    flexGrow: 1,
  },
  modalHeader: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginRight: 40,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginRight: 8,
    flexShrink: 1,
  },
  modalMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingHorizontal: 20,
    gap: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 4,
  },
  categoryText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.textSecondary,
  },
  summaryContainer: {
    padding: 20,
    paddingTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  summaryText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.text,
    maxWidth: 150,
  },
  modalSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginBottom: 16,
  },
  descriptionContainer: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  description: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.text,
    lineHeight: 24,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailItem: {
    flex: 1,
    minWidth: '45%',
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.text,
  },
  photoGallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalImage: {
    width: width - 32,
    height: 250,
    borderRadius: 16,
    marginRight: 8,
  },
  placeholderImage: {
    width: width - 32,
    height: 250,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244,67,54,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
    alignSelf: 'flex-start',
  },
  urgentText: {
    color: '#F44336',
    fontSize: 10,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  applyButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    margin: 16,
    alignItems: 'center',
  },
  applyButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.6,
  },
  applyButtonText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#fff',
  },
  unavailableContainer: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  unavailableText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    textAlign: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
});

export default TaskDetailModal; 