import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { taskService } from '../services/taskService';
import { Task } from '../types/task';
import { EmptyState } from '../components/shared/EmptyState';
import Colors from '../constants/Colors';
import { logger } from '../utils/logger';
import { Calendar, IndianRupee, Tag, AlertCircle, Clock, Trash2 } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { formatDistance, getTimeAgo, getUrgencyColor, truncateDescription, getStatusColor, formatStatus } from '../utils/taskUtils';
import { formatPrice } from '../utils/formatters';
import MyAcceptancesSection from '../components/tasks/MyAcceptancesSection';
import { taskAcceptanceService } from '../services/taskAcceptanceService';

export default function MyPostsScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null); // Track task being deleted
  const [pendingAcceptanceTasks, setPendingAcceptanceTasks] = useState<{ taskId: string; taskTitle: string; count: number }[]>([]);
  const [loadingAcceptances, setLoadingAcceptances] = useState(false);

  // Fetch current user ID
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

  // Fetch tasks when component loads or user ID changes
  useEffect(() => {
    if (currentUserId) {
      fetchTasks();
      fetchTasksWithPendingAcceptances();
    }
  }, [currentUserId]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      // Get all tasks
      const allTasks = await taskService.getAllTasks();
      
      // Filter to only show tasks created by current user
      const myPosts = currentUserId 
        ? allTasks.filter(task => task.created_by === currentUserId)
        : [];
        
      setTasks(myPosts);
      setError(null);
    } catch (err: any) {
      logger.error('Error fetching tasks:', err);
      setError(err.message || 'Failed to load your tasks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTasksWithPendingAcceptances = async () => {
    try {
      setLoadingAcceptances(true);
      const tasks = await taskAcceptanceService.getTasksWithPendingAcceptances();
      setPendingAcceptanceTasks(tasks);
    } catch (error) {
      logger.error('Error fetching tasks with pending acceptances:', error);
    } finally {
      setLoadingAcceptances(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    Promise.all([
      fetchTasks(),
      fetchTasksWithPendingAcceptances()
    ]).finally(() => {
      setRefreshing(false);
    });
  };

  const confirmDeleteTask = (task: Task) => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTask(task.id),
        },
      ],
      { cancelable: true }
    );
  };

  const deleteTask = async (taskId: string) => {
    try {
      setDeleting(taskId);
      
      // First check if this task is already assigned to someone
      const task = tasks.find(t => t.id === taskId);
      
      if (task?.status === 'assigned' && task?.assigned_to) {
        Alert.alert(
          'Cannot Delete',
          'This task has already been assigned to someone. You cannot delete it at this time.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Delete the task
      await taskService.deleteTask(taskId);
      
      // Update the local state to remove the deleted task
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      
      // Show success message
      Alert.alert('Success', 'Task has been deleted successfully.');
    } catch (error: any) {
      logger.error('Error deleting task:', error);
      Alert.alert('Error', error.message || 'Failed to delete task. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const renderTaskItem = ({ item }: { item: Task }) => {
    const isDeleting = deleting === item.id;
    
    return (
      <View style={styles.taskItem}>
        <TouchableOpacity 
          style={styles.taskContent}
          onPress={() => router.push(`/tasks/${item.id}` as any)}
          activeOpacity={0.7}
          disabled={isDeleting}
        >
          <View style={styles.taskHeader}>
            <Text style={styles.taskTitle} numberOfLines={2}>{item.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{formatStatus(item.status)}</Text>
            </View>
          </View>
          
          <Text style={styles.taskDescription} numberOfLines={2}>
            {truncateDescription(item.description || '', 80)}
          </Text>
          
          <View style={styles.taskDetails}>
            <View style={styles.taskDetailItem}>
              <Calendar size={14} color={Colors.textSecondary} />
              <Text style={styles.taskDetailText}>
                {item.deadline ? format(new Date(item.deadline), 'MMM d, yyyy') : 'No deadline'}
              </Text>
            </View>
            
            <View style={styles.taskDetailItem}>
              <IndianRupee size={14} color={Colors.textSecondary} />
              <Text style={styles.taskDetailText}>{formatPrice(item.budget || 0)}</Text>
            </View>
            
            {item.categories && item.categories.length > 0 && (
              <View style={styles.taskDetailItem}>
                <Tag size={14} color={Colors.textSecondary} />
                <Text style={styles.taskDetailText}>{
                  Array.isArray(item.categories) 
                    ? item.categories[0] 
                    : item.category || 'General'
                }</Text>
              </View>
            )}
            
            {item.urgent && (
              <View style={styles.taskDetailItem}>
                <AlertCircle size={14} color={getUrgencyColor('high')} />
                <Text style={[styles.taskDetailText, { color: getUrgencyColor('high') }]}>Urgent</Text>
              </View>
            )}
            
            <View style={styles.taskDetailItem}>
              <Clock size={14} color={Colors.textSecondary} />
              <Text style={styles.taskDetailText}>{getTimeAgo(item.created_at)}</Text>
            </View>
          </View>
          
          {item.has_pending_acceptances && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>Pending Applications</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.deleteButton,
            isDeleting && styles.deleteButtonDisabled,
            item.status === 'assigned' && styles.deleteButtonDisabled
          ]}
          onPress={() => confirmDeleteTask(item)}
          disabled={isDeleting || item.status === 'assigned'}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Trash2 size={18} color={
              item.status === 'assigned'
                ? 'rgba(255, 255, 255, 0.3)'
                : '#fff'
            } />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your tasks...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <EmptyState
          title="Error Loading Tasks"
          message={error}
          icon="alert-circle-outline"
          buttonText="Try Again"
          onButtonPress={fetchTasks}
        />
      );
    }

    return (
      <EmptyState
        title="No Tasks Yet"
        message="You haven't created any tasks yet. Tap the button below to create your first task!"
        icon="create-outline"
        buttonText="Create a Task"
        onButtonPress={() => router.push('/tasks/create' as any)}
      />
    );
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.sectionTitle}>My Posted Tasks</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* My Applications Section */}
        <View style={styles.applicationsSection}>
          <MyAcceptancesSection />
        </View>
        
        {/* My Posted Tasks Section */}
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTaskItem}
          contentContainerStyle={styles.tasksList}
          ListEmptyComponent={renderEmptyState}
          ListHeaderComponent={tasks.length > 0 ? renderHeader : null}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary]}
            />
          }
        />

        {/* Pending Acceptances Section */}
        <View style={styles.pendingAcceptancesSection}>
          <Text style={styles.sectionTitle}>Task Applications</Text>
          
          {loadingAcceptances ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading applications...</Text>
            </View>
          ) : pendingAcceptanceTasks.length > 0 ? (
            <>
              <Text style={styles.acceptancesInfo}>
                You have applications for {pendingAcceptanceTasks.length} of your tasks
              </Text>
              {pendingAcceptanceTasks.map(task => (
                <TouchableOpacity
                  key={task.taskId}
                  style={styles.pendingAcceptanceItem}
                  onPress={() => router.push({
                    pathname: '/task/[id]',
                    params: { id: task.taskId }
                  } as any)}
                  activeOpacity={0.8}
                >
                  <View style={styles.pendingAcceptanceContent}>
                    <Text style={styles.pendingAcceptanceTitle}>{task.taskTitle}</Text>
                    <View style={styles.pendingCountBadge}>
                      <Text style={styles.pendingCountText}>{task.count}</Text>
                    </View>
                  </View>
                  <Text style={styles.pendingAcceptanceSubtitle}>
                    {task.count} {task.count === 1 ? 'person' : 'people'} applied
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <Text style={styles.emptyText}>
              No pending applications for your tasks
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  applicationsSection: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  tasksList: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  taskItem: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  taskContent: {
    flex: 1,
    padding: 16,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  taskDescription: {
    color: Colors.textSecondary,
    marginBottom: 12,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  taskDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  taskDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskDetailText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  deleteButton: {
    backgroundColor: Colors.error,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonDisabled: {
    backgroundColor: 'rgba(239, 83, 80, 0.5)',
  },
  pendingBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 167, 38, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  pendingBadgeText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Medium',
    color: '#FFA726',
  },
  pendingAcceptancesSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  acceptancesInfo: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  pendingAcceptanceItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pendingAcceptanceContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pendingAcceptanceTitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.text,
    flex: 1,
  },
  pendingCountBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  pendingCountText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
  },
  pendingAcceptanceSubtitle: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
}); 