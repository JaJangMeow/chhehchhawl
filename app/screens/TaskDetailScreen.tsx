import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity,
  Alert,
  Image,
  useWindowDimensions,
  Platform,
  TextInput
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';

import { taskService } from '../services/taskService';
import { taskAcceptanceService } from '../services/taskAcceptanceService';
import { chatService } from '../services/chatService';
import { Task, TaskStatus } from '../types/task';
import { EmptyState } from '../components/shared/EmptyState';
import Colors from '../constants/Colors';
import { logger } from '../utils/logger';
import { MapPin, Calendar, IndianRupee, Tag, AlertCircle, Star, Clock, Building2, User, CreditCard, Wrench, Info, Navigation, ChevronDown, ChevronUp, UserCheck } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import AcceptancesList from '../components/tasks/AcceptancesList';
import AcceptTaskButton from '@/app/components/tasks/AcceptTaskButton';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [isTaskOwner, setIsTaskOwner] = useState(false);
  const [showAcceptances, setShowAcceptances] = useState(false);
  const [hasAcceptances, setHasAcceptances] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [isUserTaskOwner, setIsUserTaskOwner] = useState(false);

  useEffect(() => {
    const fetchTask = async () => {
      if (!id) {
        setError('No task ID provided');
        setLoading(false);
        return;
      }

      try {
        const fetchedTask = await taskService.getTaskById(id);
        if (!fetchedTask) {
          setError('Task not found');
        } else {
          setTask(fetchedTask);
          
          // Check if current user is the task owner
          const userId = await supabase.auth.getUser();
          setIsTaskOwner(userId.data.user?.id === fetchedTask.created_by);
          
          // Check if task has pending acceptances
          setHasAcceptances(!!fetchedTask.has_pending_acceptances);
        }
      } catch (err: any) {
        logger.error('Error fetching task:', err);
        setError(err.message || 'Failed to load task');
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [id]);

  useEffect(() => {
    const checkTaskOwnership = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && task?.created_by === user.id) {
          setIsUserTaskOwner(true);
        } else {
          setIsUserTaskOwner(false);
        }
      } catch (error) {
        logger.error('Error checking task ownership:', error);
      }
    };
    
    if (task) {
      checkTaskOwnership();
    }
  }, [task]);

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No deadline';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Handle back navigation
  const handleBack = () => {
    router.back();
  };

  // Toggle acceptances panel
  const toggleAcceptances = () => {
    setShowAcceptances(!showAcceptances);
  };

  // Handle task refresh when acceptance status changes
  const handleAcceptanceUpdate = async () => {
    try {
      if (!id) return;
      
      const refreshedTask = await taskService.getTaskById(id);
      if (refreshedTask) {
        setTask(refreshedTask);
        
        // Update pending acceptances flag
        setHasAcceptances(!!refreshedTask.has_pending_acceptances);
      }
    } catch (err) {
      logger.error('Error refreshing task:', err);
    }
  };

  // Add this function to handle opening maps
  const openMaps = (coordinates: { latitude: number; longitude: number }) => {
    if (!coordinates) return;
    
    const { latitude, longitude } = coordinates;
    const url = Platform.select({
      ios: `maps:${latitude},${longitude}`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}`,
      default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    });
    
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          // Fallback to Google Maps web URL
          return Linking.openURL(
            `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
          );
        }
      })
      .catch((error) => {
        console.error('Error opening maps:', error);
        Alert.alert('Error', 'Could not open maps application');
      });
  };

  // Add a function to handle applying for a task
  const handleApplyForTask = async () => {
    if (!task) return;
    
    try {
      setIsApplying(true);
      
      const result = await taskAcceptanceService.acceptTask(task.id, applicationMessage);
      
      if (result.success) {
        Alert.alert(
          'Application Submitted',
          'Your application has been submitted successfully. The task owner will be notified.',
          [{ text: 'OK' }]
        );
        setApplicationMessage('');
      } else {
        Alert.alert('Error', result.message || 'Failed to apply for task');
      }
    } catch (error) {
      logger.error('Error applying for task:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsApplying(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading task details...</Text>
      </View>
    );
  }

  if (error || !task) {
    return (
      <EmptyState
        title="Task Not Found"
        message={error || "This task doesn't exist or has been removed."}
        icon="alert-circle-outline"
        buttonText="Go Back"
        onButtonPress={handleBack}
      />
    );
  }

  // Determine location text
  const locationText = task.location?.address || task.building_name || 'Remote';

  // Check if there are task photos
  const hasPhotos = task.task_photos && task.task_photos.length > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Photo Gallery */}
      {hasPhotos ? (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoGallery}
        >
          {task.task_photos?.map((photo, index) => (
            <Image 
              key={index}
              source={{ uri: photo }}
              style={[styles.taskImage, { width: width * 0.8 }]}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      ) : (
        <View style={[styles.placeholderImage, { width: width * 0.9 }]}>
          <Ionicons name="image-outline" size={50} color={Colors.textSecondary} />
          <Text style={styles.placeholderText}>No images</Text>
        </View>
      )}

      {/* Header with Title and Budget */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{task.title}</Text>
          {task.urgent && (
            <View style={styles.urgentBadge}>
              <AlertCircle size={14} color="#fff" />
              <Text style={styles.urgentText}>Urgent</Text>
            </View>
          )}
        </View>
        <Text style={styles.budget}>₹{(task?.budget || 0).toLocaleString('en-IN')}</Text>
      </View>

      {/* Status and Category */}
      <View style={styles.metadataContainer}>
        <View style={[
          styles.statusBadge, 
          { backgroundColor: task.status === 'pending' ? '#FFA72620' : 
                          task.status === 'assigned' ? '#29B6F620' : 
                          task.status === 'completed' ? '#66BB6A20' : 
                          '#EF535020' }
        ]}>
          <Text style={[
            styles.statusText, 
            { color: task.status === 'pending' ? '#FFA726' : 
                     task.status === 'assigned' ? '#29B6F6' : 
                     task.status === 'completed' ? '#66BB6A' : 
                     '#EF5350' }
          ]}>
            {task.status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
          </Text>
        </View>

        {task.categories && task.categories.length > 0 && (
          <View style={styles.categoryBadge}>
            <Tag size={14} color={Colors.textSecondary} />
            <Text style={styles.categoryText}>{task.categories[0]}</Text>
          </View>
        )}
      </View>

      {/* Task Acceptances Panel (only for task owner) */}
      {isTaskOwner && (
        <View style={styles.acceptancesPanel}>
          <TouchableOpacity 
            style={styles.acceptancesHeader} 
            onPress={toggleAcceptances}
          >
            <View style={styles.acceptancesInfo}>
              <UserCheck size={18} color={Colors.primary} />
              <Text style={styles.acceptancesTitle}>Task Applications</Text>
              {hasAcceptances && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>Pending</Text>
                </View>
              )}
            </View>
            {showAcceptances ? (
              <ChevronUp size={18} color={Colors.textSecondary} />
            ) : (
              <ChevronDown size={18} color={Colors.textSecondary} />
            )}
          </TouchableOpacity>
          
          {showAcceptances && (
            <View style={styles.acceptancesContent}>
              <AcceptancesList 
                taskId={task.id} 
                isOwner={true}
              />
            </View>
          )}
        </View>
      )}

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{task.description || 'No description provided.'}</Text>
      </View>

      {/* Task Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Task Details</Text>
        
        <View style={styles.detailsGrid}>
          {/* Location with coordinates */}
          <View style={styles.detailItem}>
            <MapPin size={16} color={Colors.primary} />
            <View style={styles.detailTexts}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>
                {typeof task?.location === 'string' 
                  ? task.location 
                  : task?.location?.address || 'Not specified'}
              </Text>
              {task?.coordinates && (
                <View style={styles.coordinatesContainer}>
                  <Text style={styles.coordinatesText}>
                    {task.coordinates.latitude.toFixed(6)}, {task.coordinates.longitude.toFixed(6)}
                  </Text>
                  <TouchableOpacity 
                    style={styles.mapsButton}
                    onPress={() => task.coordinates && openMaps(task.coordinates)}
                  >
                    <Navigation size={14} color={Colors.primary} />
                    <Text style={styles.mapsButtonText}>Open in Maps</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
          
          {/* Deadline */}
          <View style={styles.detailItem}>
            <View style={styles.detailIcon}>
              <Calendar size={18} color={Colors.textSecondary} />
            </View>
            <Text style={styles.detailLabel}>Deadline</Text>
            <Text style={styles.detailValue}>{formatDate(task.deadline)}</Text>
          </View>
          
          {/* Estimated Time */}
          <View style={styles.detailItem}>
            <View style={styles.detailIcon}>
              <Clock size={18} color={Colors.textSecondary} />
            </View>
            <Text style={styles.detailLabel}>Est. Time</Text>
            <Text style={styles.detailValue}>
              {task.estimated_time 
                ? `${Math.floor(task.estimated_time / 60)}h ${task.estimated_time % 60}m` 
                : 'Not specified'}
            </Text>
          </View>
          
          {/* Priority */}
          <View style={styles.detailItem}>
            <View style={styles.detailIcon}>
              <Star size={18} color={task.priority === 'high' ? '#F44336' : 
                                   task.priority === 'medium' ? '#FFC107' : 
                                   '#4CAF50'} />
            </View>
            <Text style={styles.detailLabel}>Priority</Text>
            <Text style={[
              styles.detailValue,
              { color: task.priority === 'high' ? '#F44336' : 
                       task.priority === 'medium' ? '#FFC107' : 
                       '#4CAF50' }
            ]}>
              {task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : 'Normal'}
            </Text>
          </View>
        </View>
      </View>

      {/* Additional Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Information</Text>
        
        <View style={styles.additionalInfo}>
          {/* Skills Required */}
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Wrench size={18} color={Colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Required Skills</Text>
              <Text style={styles.infoValue}>
                {task.skill_requirements && task.skill_requirements.length > 0 
                  ? task.skill_requirements.join(', ') 
                  : 'None required'}
              </Text>
            </View>
          </View>
          
          {/* Payment Method */}
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <CreditCard size={18} color={Colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Payment Method</Text>
              <Text style={styles.infoValue}>
                {task.payment_method
                  ? task.payment_method.charAt(0).toUpperCase() + task.payment_method.slice(1)
                  : 'Not specified'}
              </Text>
            </View>
          </View>
          
          {/* Posted Date */}
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Calendar size={18} color={Colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Posted</Text>
              <Text style={styles.infoValue}>
                {task.created_at ? formatDate(task.created_at) : 'Unknown'}
              </Text>
            </View>
          </View>

          {/* Task Visibility */}
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Info size={18} color={Colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Task Visibility</Text>
              <Text style={styles.infoValue}>
                {task.task_visibility_hours ? `${task.task_visibility_hours} hours` : 'Not specified'}
              </Text>
            </View>
          </View>

          {/* Completion Time */}
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Clock size={18} color={Colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Complete Within</Text>
              <Text style={styles.infoValue}>
                {task.task_completion_hours ? `${task.task_completion_hours} hours` : 'Not specified'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Apply Button - only show for non-owners */}
      {!isTaskOwner && (
        <AcceptTaskButton 
          taskId={task.id}
          onSuccess={(conversationId) => {
            if (conversationId) {
              router.push(`/chat/${conversationId}`);
            } else {
              Toast.show({
                type: 'success',
                text1: 'Task application sent!',
                text2: 'The task owner will review your application soon.'
              });
            }
          }}
        />
      )}

      {/* Acceptances Section */}
      {isUserTaskOwner && (
        <View style={styles.acceptancesSection}>
          <TouchableOpacity
            style={styles.acceptancesToggleButton}
            onPress={toggleAcceptances}
            activeOpacity={0.8}
          >
            <Text style={styles.acceptancesToggleText}>
              {showAcceptances ? 'Hide Applications' : 'View Applications'}
            </Text>
            {showAcceptances ? (
              <ChevronUp size={20} color={Colors.primary} />
            ) : (
              <ChevronDown size={20} color={Colors.primary} />
            )}
          </TouchableOpacity>
          
          {showAcceptances && task && (
            <AcceptancesList
              taskId={task.id}
              isOwner={true}
            />
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  photoGallery: {
    padding: 16,
  },
  taskImage: {
    height: 250,
    borderRadius: 16,
    marginRight: 8,
  },
  placeholderImage: {
    height: 200,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16,
  },
  placeholderText: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginBottom: 8,
  },
  budget: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.primary,
  },
  metadataContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.textSecondary,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244,67,54,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
    alignSelf: 'flex-start',
  },
  urgentText: {
    color: '#F44336',
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  section: {
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
  additionalInfo: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.text,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
  },
  coordinatesContainer: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 6,
  },
  coordinatesText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.textSecondary,
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(71, 133, 255, 0.1)',
    alignSelf: 'flex-start',
  },
  mapsButtonText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.primary,
  },
  detailTexts: {
    flex: 1,
  },
  acceptancesPanel: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  acceptancesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  acceptancesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  acceptancesTitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.text,
  },
  acceptancesContent: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    maxHeight: 400,
  },
  pendingBadge: {
    backgroundColor: 'rgba(255, 167, 38, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Medium',
    color: '#FFA726',
  },
  acceptancesSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 16,
  },
  acceptancesToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 16,
  },
  acceptancesToggleText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.primary,
  },
  applicationSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  applicationTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginBottom: 12,
  },
  applicationInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    color: Colors.text,
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  applicationButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applicationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
  },
}); 

