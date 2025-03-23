import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { taskService } from '../../services/taskService';
import { Task } from '../../types/task';
import { MapPin, Calendar, IndianRupee, Clock, Tag, AlertCircle, Star } from 'lucide-react-native';
import Button from '../../components/shared/Button';
import { getUrgencyColor } from '../../utils/taskUtils';

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

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTask();
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
      setTask(taskData);
      setError(null);
    } catch (err) {
      console.error('Error loading task:', err);
      setError('Failed to load task details');
    } finally {
      setLoading(false);
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
            <Star size={18} color={getUrgencyColor(task.urgency)} />
            <Text style={styles.metadataText}>
              Urgency: {task.urgency}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>
            {task.description || 'No description provided.'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budget</Text>
          <View style={styles.infoRow}>
            <IndianRupee size={20} color={Colors.text} />
            <Text style={styles.infoValue}>
              ₹{task.budget.toLocaleString('en-IN')}
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
                  `${task.location.lat.toFixed(6)}, ${task.location.lng.toFixed(6)}`}
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

        <View style={styles.actions}>
          <Button 
            title="Apply for Task" 
            onPress={() => {
              Alert.alert('Coming Soon', 'This feature is under development');
            }}
            style={styles.mainButton}
          />
        </View>
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
    fontFamily: 'SpaceGrotesk-Medium',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  metadataSection: {
    marginBottom: 24,
    gap: 8,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  metadataText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.textSecondary,
  },
  section: {
    marginBottom: 24,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoValue: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.text,
    marginLeft: 12,
  },
  actions: {
    marginTop: 16,
  },
  mainButton: {
    marginBottom: 16,
  }
}); 