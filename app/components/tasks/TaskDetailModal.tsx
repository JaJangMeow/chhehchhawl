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
  ActivityIndicator,
  Platform,
  TextInput
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
  MessageCircle,
  Map
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
import * as Linking from 'expo-linking';

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

type TaskDetailModalProps = {
  isVisible: boolean;
  onClose: () => void;
  task: Task | null;
  onAccept: (taskId: string, message?: string) => Promise<void>;
  isAccepting?: boolean;
};

export function TaskDetailModal({
  isVisible,
  onClose,
  task,
  onAccept,
  isAccepting = false
}: TaskDetailModalProps) {
  const [applyLoading, setApplyLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [applicationMessage, setApplicationMessage] = useState('');
  
  useEffect(() => {
    // Get the current user ID
    const getUser = async () => {
      const { data } = await supabase.auth.getSession();
      setCurrentUserId(data.session?.user?.id || null);
    };
    
    getUser();
  }, []);

  // Reset message when modal closes or changes tasks
  useEffect(() => {
    if (!isVisible) {
      setApplicationMessage('');
    }
  }, [isVisible, task?.id]);

  if (!task) return null;

  const photos = task.task_photos || [];
  const hasPhotos = photos.length > 0;
  const firstPhoto = hasPhotos ? photos[0] : null;

  // Handle apply button press
  const handleApply = async () => {
    if (!task) return;
    
    setApplyLoading(true);
    try {
      await onAccept(task.id, applicationMessage);
    } catch (error) {
      console.error('Error in apply button handler:', error);
    } finally {
      setApplyLoading(false);
    }
  };
  
  // Format price
  const formatPrice = (price?: number | null) => {
    if (price === undefined || price === null) return '₹0';
    return `₹${price.toLocaleString('en-IN')}`;
  };
  
  // Determine if the Apply button should be disabled
  const isApplyDisabled = !task || task.status !== 'pending' || applyLoading || isAccepting;

  // Helper to determine if the task can be accepted by the current user
  const canAcceptTask = () => {
    if (!task || !currentUserId) return false;
    
    return (
      (task.status === 'pending' || task.status === 'open') && 
      task.created_by !== currentUserId &&
      !task.assigned_to
    );
  };

  // Custom implementation of getStatusLabel
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'open':
      case 'pending':
        return 'Open';
      case 'assigned':
        return 'Assigned';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
      case 'canceled':
        return 'Cancelled';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <ScrollView style={styles.modalScrollContent} bounces={false}>
            {/* Header with Status and Back Action */}
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={onClose}
              >
                <Ionicons name="arrow-back" size={24} color={Colors.text} />
              </TouchableOpacity>
              
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}>
                <Text style={styles.statusText}>{getStatusLabel(task.status)}</Text>
              </View>
            </View>
            
            {/* Title area */}
            <View style={styles.titleContainer}>
              <Text style={styles.modalTitle}>{task.title}</Text>
              
              {task.urgent && (
                <View style={styles.urgentBadge}>
                  <AlertCircle size={14} color="#fff" />
                  <Text style={styles.urgentText}>Urgent</Text>
                </View>
              )}
            </View>

            {/* Main Details */}
            <View style={styles.mainDetails}>
              {/* Price */}
              <View style={styles.detailCard}>
                <View style={styles.detailIconContainer}>
                  <IndianRupee size={20} color={Colors.primary} />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Budget</Text>
                  <Text style={styles.detailValue}>{formatPrice(task.price || task.budget)}</Text>
                </View>
              </View>
              
              {/* Location */}
              <View style={styles.detailCard}>
                <View style={styles.detailIconContainer}>
                  <MapPin size={20} color={Colors.primary} />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{task.location?.address || task.building_name || 'Not specified'}</Text>
                </View>
              </View>
              
              {/* Posted date */}
              <View style={styles.detailCard}>
                <View style={styles.detailIconContainer}>
                  <Calendar size={20} color={Colors.primary} />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Posted</Text>
                  <Text style={styles.detailValue}>{getTimeAgo(task.created_at)}</Text>
                </View>
              </View>
              
              {/* Deadline if available */}
              {task.deadline && (
                <View style={styles.detailCard}>
                  <View style={styles.detailIconContainer}>
                    <Clock size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Deadline</Text>
                    <Text style={styles.detailValue}>{new Date(task.deadline).toLocaleDateString()}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Description */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Description</Text>
              <View style={styles.descriptionContainer}>
                <Text style={styles.description}>{task.description || 'No description provided.'}</Text>
              </View>
            </View>
            
            {/* Photos Section */}
            {hasPhotos && (
              <View style={styles.sectionContainer}>
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

            {/* Map link if coordinates available */}
            {task.coordinates && (
              <View style={styles.sectionContainer}>
                <TouchableOpacity 
                  style={styles.mapButton}
                  onPress={() => {
                    if (task.coordinates) {
                      const { latitude, longitude } = task.coordinates;
                      const url = `https://maps.google.com/?q=${latitude},${longitude}`;
                      Linking.openURL(url);
                    }
                  }}
                >
                  <Map size={18} color={Colors.primary} />
                  <Text style={styles.mapButtonText}>View Location on Map</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Apply Button - Integrated in scroll view */}
            {canAcceptTask() ? (
              <View style={styles.actionContainer}>
                <TextInput
                  style={styles.messageInput}
                  placeholder="Add a message to the task owner (optional)"
                  value={applicationMessage}
                  onChangeText={setApplicationMessage}
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                />
                
                <TouchableOpacity 
                  style={styles.applyButton}
                  onPress={handleApply}
                  disabled={isApplyDisabled}
                >
                  {applyLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <MessageCircle size={20} color="#fff" style={styles.buttonIcon} />
                      <Text style={styles.applyButtonText}>Accept & Chat</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.actionContainer}>
                {/* Empty container to maintain consistent sizing */}
                <View style={styles.emptySpace} />
              </View>
            )}
            
            {/* Extra padding at bottom */}
            <View style={styles.bottomPadding} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Add default export to fix the warning
export default TaskDetailModal;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalContent: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  titleContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  actionContainer: {
    padding: 16,
    marginTop: 16,
  },
  applyButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bottomPadding: {
    height: 24,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    color: '#fff',
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244,67,54,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  urgentText: {
    color: '#F44336',
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  mainDetails: {
    padding: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailCard: {
    flexDirection: 'row',
    width: '45%', // Two cards per row with gap
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    gap: 12,
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.text,
  },
  sectionContainer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: Colors.primary,
    marginBottom: 12,
  },
  descriptionContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  description: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.text,
    lineHeight: 24,
  },
  photoGallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalImage: {
    width: width - 48,
    height: 220,
    borderRadius: 16,
  },
  placeholderImage: {
    width: width - 48,
    height: 220,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  mapButtonText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.primary,
  },
  applyButtonText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#fff',
  },
  emptySpace: {
    height: 48, // Same height as the apply button
  },
  buttonIcon: {
    marginRight: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginTop: 12,
  },
  modalScrollContent: {
    flexGrow: 1,
    backgroundColor: Colors.background,
  },
  messageInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: Colors.cardBackground,
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 15,
    color: Colors.text,
    minHeight: 80,
  },
}); 