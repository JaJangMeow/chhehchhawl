import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/app/constants/Colors';
import AcceptanceCard from './AcceptanceCard';
import { TaskAcceptance, taskAcceptanceService } from '@/app/services/taskAcceptanceService';
import { supabase } from '@/app/lib/supabase';
import { logger } from '@/app/utils/logger';

type AcceptanceStatus = 'all' | 'pending' | 'confirmed' | 'rejected';

const MyAcceptancesSection: React.FC = () => {
  const [acceptances, setAcceptances] = useState<TaskAcceptance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<AcceptanceStatus>('all');
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  // Get the current user ID
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          setUserId(data.user.id);
        }
      } catch (error) {
        logger.error('Error fetching user ID:', error);
      }
    };
    
    fetchUserId();
  }, []);

  // Fetch user's acceptances
  const fetchAcceptances = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      console.log('Fetching user acceptances...');
      const data = await taskAcceptanceService.getUserAcceptances();
      console.log(`Fetched ${data.length} acceptances`);
      setAcceptances(data);
    } catch (error) {
      logger.error('Error fetching user acceptances:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial data fetch
  useEffect(() => {
    if (userId) {
      fetchAcceptances();
    }
  }, [userId, fetchAcceptances]);

  // Set up real-time subscription
  useEffect(() => {
    if (!userId) return;
    
    console.log('Setting up task acceptance subscription');
    const subscription = taskAcceptanceService.subscribeToTaskAcceptanceUpdates(() => {
      console.log('Received task acceptance update, refreshing...');
      fetchAcceptances();
    });
    
    // Clean up subscription
    return () => {
      console.log('Cleaning up task acceptance subscription');
      subscription.unsubscribe();
    };
  }, [userId, fetchAcceptances]);

  // Handle refresh action
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAcceptances();
    setRefreshing(false);
  };

  // Filter acceptances by status
  const filteredAcceptances = statusFilter === 'all' 
    ? acceptances 
    : acceptances.filter(a => a.status === statusFilter);

  // Render an empty state when there are no acceptances
  const renderEmptyState = () => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {statusFilter === 'all' 
            ? 'You haven\'t applied for any tasks yet'
            : `No ${statusFilter} task applications`}
        </Text>
        <TouchableOpacity
          style={styles.findTasksButton}
          onPress={() => router.push('/tasks' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.findTasksButtonText}>Browse Tasks</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Navigate to task details
  const handleTaskPress = (taskId: string) => {
    router.push({
      pathname: '/task/[id]',
      params: { id: taskId }
    } as any);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>My Task Applications</Text>
      
      {/* Filter options */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by status:</Text>
        <View style={styles.filterButtonsContainer}>
          <FilterButton 
            label="All" 
            active={statusFilter === 'all'} 
            onPress={() => setStatusFilter('all')} 
          />
          <FilterButton 
            label="Pending" 
            active={statusFilter === 'pending'} 
            onPress={() => setStatusFilter('pending')} 
          />
          <FilterButton 
            label="Confirmed" 
            active={statusFilter === 'confirmed'} 
            onPress={() => setStatusFilter('confirmed')} 
          />
          <FilterButton 
            label="Rejected" 
            active={statusFilter === 'rejected'} 
            onPress={() => setStatusFilter('rejected')} 
          />
        </View>
      </View>

      {/* Acceptances list */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your applications...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAcceptances}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleTaskPress(item.task_id)}
            >
              <View style={styles.acceptanceItem}>
                {/* Task title */}
                <View style={styles.taskTitleContainer}>
                  <Text style={styles.taskTitle}>
                    {item.task_title || 'Task'}
                  </Text>
                  <StatusBadge status={item.status} />
                </View>
                
                {/* Task owner */}
                {item.task_owner_first_name && (
                  <Text style={styles.taskOwner}>
                    Posted by: {item.task_owner_first_name}
                  </Text>
                )}
                
                {/* Message section (if there is a message) */}
                {item.message ? (
                  <View style={styles.messageContainer}>
                    <Text style={styles.messageLabel}>Your message:</Text>
                    <Text style={styles.messageText}>{item.message}</Text>
                  </View>
                ) : null}
                
                {/* Response message section (if there is a response) */}
                {item.response_message ? (
                  <View style={styles.responseContainer}>
                    <Text style={styles.responseLabel}>Response:</Text>
                    <Text style={styles.responseText}>{item.response_message}</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </View>
  );
};

// Filter button component
interface FilterButtonProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

const FilterButton: React.FC<FilterButtonProps> = ({ label, active, onPress }) => (
  <TouchableOpacity
    style={[
      styles.filterButton,
      active && styles.activeFilterButton
    ]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Text 
      style={[
        styles.filterButtonText,
        active && styles.activeFilterButtonText
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

// Status badge component
interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  // Get the appropriate status styling
  const getStatusStyle = () => {
    switch (status) {
      case 'confirmed':
        return { text: 'Confirmed', color: '#4CAF50' };
      case 'rejected':
        return { text: 'Rejected', color: '#F44336' };
      default:
        return { text: 'Pending', color: '#FFC107' };
    }
  };
  
  const statusStyle = getStatusStyle();
  
  return (
    <View style={[styles.statusBadge, { backgroundColor: statusStyle.color + '20' }]}>
      <Text style={[styles.statusText, { color: statusStyle.color }]}>
        {statusStyle.text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginBottom: 16,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  filterButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeFilterButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.textSecondary,
  },
  activeFilterButtonText: {
    color: Colors.primary,
  },
  acceptanceItem: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  taskTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  taskOwner: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  messageContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  messageLabel: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.text,
  },
  responseContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 12,
  },
  responseLabel: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.text,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
    textAlign: 'center',
    marginBottom: 16,
  },
  findTasksButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  findTasksButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
  },
});

export default MyAcceptancesSection; 