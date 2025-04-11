import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView, Image } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { taskService } from '../../services/taskService';
import { Task } from '../../types/task';
import { MapPin, Calendar, IndianRupee, Clock, Tag, AlertCircle, Star, User } from 'lucide-react-native';
import Button from '../../components/shared/Button';
import { getUrgencyColor } from '../../utils/taskUtils';
import { supabase } from '@/app/lib/supabase';

// Available task categories
const TASK_CATEGORIES = {
  'home': 'Home',
  'delivery': 'Delivery',
  'errands': 'Errands',
  'tech': 'Tech Support',
  'education': 'Education',
  'other': 'Other'
};

// Task priorities with colors
const TASK_PRIORITIES = {
  'low': { label: 'Low', color: '#4CAF50' },
  'medium': { label: 'Medium', color: '#FFC107' },
  'high': { label: 'High', color: '#F44336' }
};

interface UserProfile {
  id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  email?: string;
  phone?: string;
  updated_at?: string;
}

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [involvedUser, setInvolvedUser] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<'owner' | 'assigned' | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  useEffect(() => {
    // First get the current user ID
    const fetchCurrentUser = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user?.id) {
          setCurrentUserId(data.session.user.id);
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
    
    fetchCurrentUser().then(() => loadTask());
  }, [id]);

  const loadTask = async () => {
    if (!id) {
      setError('Task ID is missing');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const taskData = await taskService.getTaskById(id as string);
      
      if (!taskData) {
        setError('Task not found');
        setLoading(false);
        return;
      }
      
      setTask(taskData);
      
      // Determine user role and fetch the other involved user
      if (currentUserId && taskData) {
        if (taskData.created_by === currentUserId) {
          setUserRole('owner');
          if (taskData.assigned_to) {
            await fetchUserProfile(taskData.assigned_to);
          }
        } else if (taskData.assigned_to === currentUserId) {
          setUserRole('assigned');
          if (taskData.created_by) {
            await fetchUserProfile(taskData.created_by);
          }
        }
      }
      
      setError(null);
    } catch (err) {
      console.error('Error loading task:', err);
      setError('Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      setLoadingUser(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, full_name, avatar_url, email, phone, updated_at')
        .eq('id', userId)
        .single();
        
      if (error) throw error;
      
      setInvolvedUser(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoadingUser(false);
    }
  };

  // Get status color based on task status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FFA726'; // Orange
      case 'in_progress':
        return '#29B6F6'; // Blue
      case 'completed':
        return '#66BB6A'; // Green
      case 'cancelled':
        return '#EF5350'; // Red
      default:
        return Colors.textSecondary;
    }
  };

  // Format status label
  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No deadline';
    
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  // Get category name
  const getCategoryName = (categoryId: string) => {
    return TASK_CATEGORIES[categoryId as keyof typeof TASK_CATEGORIES] || 'Other';
  };

  // Get priority data
  const getPriorityData = (priorityId: string) => {
    return TASK_PRIORITIES[priorityId as keyof typeof TASK_PRIORITIES] || TASK_PRIORITIES.medium;
  };

  // Get formatted user name
  const getFormattedUserName = (user: UserProfile | null) => {
    if (!user) return 'Unknown User';
    
    if (user.full_name) return user.full_name;
    
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    
    if (user.first_name) return user.first_name;
    
    return 'Unknown User';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !task) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Task not found'}</Text>
        <Button 
          title="Go Back" 
          onPress={() => router.back()}
          variant="outline"
          style={{ marginTop: 20 }}
        />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Task Details',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.primary,
          headerTitleStyle: {
            fontFamily: 'SpaceGrotesk-Bold',
            color: Colors.text,
          },
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>{task.title}</Text>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: getStatusColor(task.status) + '20' }
          ]}>
            <Text style={[
              styles.statusText, 
              { color: getStatusColor(task.status) }
            ]}>
              {formatStatus(task.status)}
            </Text>
          </View>
        </View>
        
        {/* Task metadata section */}
        <View style={styles.metadataSection}>
          {/* Category */}
          <View style={styles.metadataItem}>
            <Tag size={18} color={Colors.textSecondary} />
            <Text style={styles.metadataText}>
              Category: {task.category}
            </Text>
          </View>
          
          {/* Priority/Urgency */}
          <View style={styles.metadataItem}>
            <Star size={18} color={getUrgencyColor(task.priority || 'medium')} />
            <Text style={styles.metadataText}>
              Priority: {task.priority || 'medium'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>
            {task.description || 'No description provided.'}
          </Text>
        </View>

        {/* User information section */}
        {task.status === 'completed' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {userRole === 'owner' ? 'Completed By' : 'Completed For'}
            </Text>
            
            {loadingUser ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <View style={styles.userInfoContainer}>
                <View style={styles.avatarContainer}>
                  {involvedUser?.avatar_url ? (
                    <Image 
                      source={{ uri: involvedUser.avatar_url }} 
                      style={styles.userAvatar} 
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.userAvatarPlaceholder}>
                      <User size={20} color={Colors.textSecondary} />
                    </View>
                  )}
                </View>
                
                <View style={styles.userDetailsContainer}>
                  <Text style={styles.userName}>
                    {getFormattedUserName(involvedUser)}
                  </Text>
                  {involvedUser?.email && (
                    <Text style={styles.userEmail}>{involvedUser.email}</Text>
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budget</Text>
          <View style={styles.infoRow}>
            <IndianRupee size={20} color={Colors.text} />
            <Text style={styles.infoValue}>
              ₹{(task.budget || 0).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {task.location && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.infoRow}>
              <MapPin size={20} color={Colors.text} />
              <Text style={styles.infoValue}>
                {task.location.address || 
                  ((task.location.lat !== undefined && task.location.lng !== undefined) ? 
                    `${task.location.lat.toFixed(6)}, ${task.location.lng.toFixed(6)}` : 
                    'Location coordinates not available')}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Created At</Text>
          <View style={styles.infoRow}>
            <Clock size={20} color={Colors.text} />
            <Text style={styles.infoValue}>
              {formatDate(task.created_at)}
            </Text>
          </View>
        </View>

        {task.completion_date && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completed At</Text>
            <View style={styles.infoRow}>
              <Clock size={20} color={Colors.text} />
              <Text style={styles.infoValue}>
                {formatDate(task.completion_date)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 20,
  },
  errorText: {
    color: Colors.error,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginBottom: 10,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  metadataSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.cardBackground,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  metadataText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.text,
  },
  section: {
    marginBottom: 20,
    backgroundColor: Colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.text,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoValue: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.text,
  },
  actions: {
    marginTop: 20,
  },
  mainButton: {
    marginBottom: 10,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userAvatar: {
    width: '100%',
    height: '100%',
  },
  userAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
  },
  userDetailsContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
  },
});
