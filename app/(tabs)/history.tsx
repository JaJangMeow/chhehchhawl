import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Alert,
  SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/app/lib/supabase';
import { Task } from '@/app/types/task';
import { EmptyState } from '@/app/components/shared/EmptyState';
import Colors from '@/app/constants/Colors';
import { logger } from '@/app/utils/logger';
import { ArrowDownUp as SortDescending, CheckCircle, History } from 'lucide-react-native';
import TaskCard from '@/app/components/tasks/TaskCard';
import { Stack } from 'expo-router';
import { taskService } from '@/app/services/taskService';

export default function HistoryScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('recent');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'tasker' | 'poster'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

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

  // Fetch completed tasks
  const fetchHistoryTasks = async () => {
    try {
      setLoading(true);
      
      // Use the taskService to fetch history tasks (now only completed tasks)
      const historyTasks = await taskService.getHistoryTasks();
      setTasks(historyTasks);
    } catch (err: any) {
      logger.error('Error fetching completed tasks:', err);
      setError(err.message || 'Failed to load completed tasks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load tasks when component mounts or user changes
  useEffect(() => {
    fetchHistoryTasks();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHistoryTasks();
  };

  const handleTaskPress = (task: Task) => {
    router.push(`/task/${task.id}`);
  };

  const toggleSortOrder = () => {
    const newSort = sortBy === 'recent' ? 'oldest' : 'recent';
    setSortBy(newSort);
    
    // Sort the tasks
    const sortedTasks = [...tasks].sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at).getTime();
      const dateB = new Date(b.updated_at || b.created_at).getTime();
      return newSort === 'recent' ? dateB - dateA : dateA - dateB;
    });
    
    setTasks(sortedTasks);
  };

  // Toggle view mode between grid and list
  const toggleViewMode = () => {
    setViewMode(viewMode === 'grid' ? 'list' : 'grid');
  };

  // Filter tasks based on the user's role
  const getFilteredTasks = () => {
    if (!currentUserId) return [];
    
    if (historyFilter === 'all') return tasks;
    
    return tasks.filter(task => {
      if (historyFilter === 'tasker') {
        return task.assigned_to === currentUserId; // Tasks the user completed as a tasker
      } else {
        return task.created_by === currentUserId; // Tasks completed for the user as a poster
      }
    });
  };

  // Determine the user's role in the task
  const getUserRoleInTask = (task: Task): 'tasker' | 'poster' | null => {
    if (!currentUserId) return null;
    
    if (task.assigned_to === currentUserId) {
      return 'tasker';
    } else if (task.created_by === currentUserId) {
      return 'poster';
    }
    
    return null;
  };

  const renderEmptyState = () => {
    if (loading) return null;
    
    let message = "No completed tasks found.";
    if (historyFilter === 'tasker') {
      message = "You haven't completed any tasks for others yet.";
    } else if (historyFilter === 'poster') {
      message = "No tasks have been completed for you yet.";
    }
    
    return (
      <EmptyState
        title="No completed tasks"
        message={message}
        icon="check-circle"
      />
    );
  };

  const renderTaskCard = ({ item: task }: { item: Task }) => {
    const userRole = getUserRoleInTask(task);
    
    return (
      <View style={[
        styles.taskCard,
        viewMode === 'grid' ? styles.gridTaskCard : styles.listTaskCard
      ]}>
        {userRole && (
          <View style={[
            styles.roleIndicator,
            userRole === 'tasker' ? styles.taskerIndicator : styles.posterIndicator
          ]}>
            <Text style={styles.roleText}>
              {userRole === 'tasker' ? 'Completed by You' : 'Completed for You'}
            </Text>
          </View>
        )}
        <TaskCard
          task={task}
          onPress={() => handleTaskPress(task)}
          currentUserId={currentUserId}
          viewType={viewMode}
        />
      </View>
    );
  };

  const renderFilterOptions = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[
          styles.filterOption,
          historyFilter === 'all' && styles.activeFilterOption
        ]}
        onPress={() => setHistoryFilter('all')}
      >
        <Text style={[
          styles.filterText,
          historyFilter === 'all' && styles.activeFilterText
        ]}>All</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.filterOption,
          historyFilter === 'tasker' && styles.activeFilterOption
        ]}
        onPress={() => setHistoryFilter('tasker')}
      >
        <Text style={[
          styles.filterText,
          historyFilter === 'tasker' && styles.activeFilterText
        ]}>Completed by You</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.filterOption,
          historyFilter === 'poster' && styles.activeFilterOption
        ]}
        onPress={() => setHistoryFilter('poster')}
      >
        <Text style={[
          styles.filterText,
          historyFilter === 'poster' && styles.activeFilterText
        ]}>Completed for You</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.pageHeader}>
      <View style={styles.titleContainer}>
        <History size={24} color={Colors.primary} />
        <Text style={styles.pageTitle}>Task History</Text>
      </View>
      
      <View style={styles.headerActions}>
        <TouchableOpacity 
          style={styles.iconButton}
          onPress={toggleViewMode}
          accessibilityLabel={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
        >
          <Text style={styles.iconButtonText}>
            {viewMode === 'grid' ? 'Grid View' : 'List View'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.iconButton}
          onPress={toggleSortOrder}
          accessibilityLabel={`Sort by ${sortBy === 'recent' ? 'newest' : 'oldest'}`}
        >
          <SortDescending size={18} color={Colors.text} />
          <Text style={styles.iconButtonText}>
            {sortBy === 'recent' ? 'Newest' : 'Oldest'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: false
        }} 
      />
      
      {/* Custom Page Header */}
      {renderHeader()}
      
      {/* Filter options */}
      {renderFilterOptions()}
      
      {/* Error message if needed */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}
      
      {/* Task list */}
      {!loading && !error && (
        <FlatList
          data={getFilteredTasks()}
          renderItem={renderTaskCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.taskList,
            viewMode === 'list' ? styles.taskColumnList : null,
            getFilteredTasks().length === 0 && styles.emptyTaskList
          ]}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={viewMode === 'grid' ? 'grid' : 'list'} // Force re-render when changing layout
          columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh} 
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 42,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageTitle: {
    fontSize: 22,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconButtonText: {
    fontSize: 12,
    color: Colors.text,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeFilterOption: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 12,
    color: Colors.text,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#FFF1F0',
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFCCC7',
  },
  errorText: {
    color: '#F5222D',
    fontFamily: 'SpaceGrotesk-Medium',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  taskList: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  taskColumnList: {
    gap: 12,
  },
  emptyTaskList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  taskCard: {
    position: 'relative',
    marginBottom: 12,
  },
  gridTaskCard: {
    width: '48%',
  },
  listTaskCard: {
    width: '100%',
  },
  roleIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  taskerIndicator: {
    backgroundColor: '#4CAF50',
  },
  posterIndicator: {
    backgroundColor: '#FFC107',
  },
  roleText: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk-Medium',
    color: '#FFF',
  },
}); 