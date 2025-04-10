import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { taskService } from '../services/taskService';
import { Task } from '../types/task';
import TaskCard from '../components/tasks/TaskCard';
import { EmptyState } from '../components/shared/EmptyState';
import Colors from '../constants/Colors';
import { logger } from '../utils/logger';

export default function TasksListScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch tasks from database
  const fetchTasks = async () => {
    try {
      // Clear previous error if any
      setError(null);
      
      const fetchedTasks = await taskService.getAllTasks();
      logger.log('Fetched tasks:', fetchedTasks.length);
      setTasks(fetchedTasks);
    } catch (err: any) {
      logger.error('Error fetching tasks:', err);
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, []);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTasks();
  }, []);

  // Handle task press
  const handleTaskPress = (task: Task) => {
    router.push(`/tasks/${task.id}` as any);
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short', 
        year: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Render task item
  const renderTaskItem = ({ item }: { item: Task }) => (
    <TaskCard task={item} onPress={handleTaskPress} />
  );

  // Render list header
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.header}>All Tasks</Text>
      <Text style={styles.subheader}>
        {tasks.length === 0 
          ? 'No tasks available'
          : `${tasks.length} task${tasks.length > 1 ? 's' : ''} available`
        }
      </Text>
    </View>
  );

  // Render empty component
  const renderEmptyComponent = () => {
    // Don't show empty state while loading
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      );
    }

    // Show error state if there's an error
    if (error) {
      return (
        <EmptyState
          title="Failed to load tasks"
          message={error}
          icon="alert-circle-outline"
          buttonText="Try Again"
          onButtonPress={fetchTasks}
        />
      );
    }

    // Show empty state if no tasks
    return (
      <EmptyState
        title="No tasks found"
        message="There are no tasks available at the moment. Pull down to refresh or create a new task."
        icon="search-outline"
        buttonText="Create Task"
        onButtonPress={() => router.push('/create-task' as any)}
      />
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={tasks}
        renderItem={renderTaskItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      />

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/create-task' as any)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 90, // Extra space for FAB
  },
  headerContainer: {
    marginBottom: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  subheader: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: Colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
}); 

