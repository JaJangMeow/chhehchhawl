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

interface AcceptancesListProps {
  taskId: string;
  isOwner: boolean;
}

const AcceptancesList: React.FC<AcceptancesListProps> = ({ taskId, isOwner }) => {
  const [acceptances, setAcceptances] = useState<TaskAcceptance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<AcceptanceStatus>('all');
  const [currentUserId, setCurrentUserId] = useState("");
  const router = useRouter();

  // Get current user ID
  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    
    fetchUserId();
  }, []);

  // Fetch task acceptances
  const fetchAcceptances = useCallback(async () => {
    try {
      setLoading(true);
      const data = await taskAcceptanceService.getTaskAcceptances(taskId);
      setAcceptances(data);
    } catch (error) {
      logger.error('Error fetching acceptances:', error);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  // Initial data fetch
  useEffect(() => {
    fetchAcceptances();
  }, [fetchAcceptances]);

  // Set up real-time subscription
  useEffect(() => {
    const handleAcceptanceChange = (newAcceptance: TaskAcceptance) => {
      setAcceptances(currentAcceptances => {
        // Check if this acceptance already exists in our list
        const existingIndex = currentAcceptances.findIndex(a => a.id === newAcceptance.id);
        
        if (existingIndex >= 0) {
          // Update existing acceptance
          const updatedAcceptances = [...currentAcceptances];
          updatedAcceptances[existingIndex] = newAcceptance;
          return updatedAcceptances;
        } else {
          // Add new acceptance
          return [newAcceptance, ...currentAcceptances];
        }
      });
    };

    // Subscribe to changes for this task's acceptances
    const subscription = supabase
      .channel(`task-acceptances-${taskId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'task_acceptances',
        filter: `task_id=eq.${taskId}`
      }, (payload: any) => {
        // Fetch the updated acceptance with all the joined data
        taskAcceptanceService.getTaskAcceptances(taskId)
          .then(data => {
            const updatedAcceptance = data.find(a => a.id === payload.new?.id);
            if (updatedAcceptance) {
              handleAcceptanceChange(updatedAcceptance);
            }
          })
          .catch(error => {
            logger.error('Error fetching updated acceptance:', error);
          });
      })
      .subscribe();
    
    // Clean up subscription
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [taskId]);

  // Handle refresh action
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAcceptances();
    setRefreshing(false);
  };

  // Handle status change of an acceptance
  const handleStatusChange = () => {
    // Just refresh the whole list when a status changes
    fetchAcceptances();
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
            ? 'No task acceptances yet'
            : `No ${statusFilter} acceptances`}
        </Text>
        {isOwner && (
          <Text style={styles.emptySubtext}>
            When someone applies for this task, it will appear here.
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
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
          <Text style={styles.loadingText}>Loading acceptances...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAcceptances}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <AcceptanceCard 
              acceptance={item}
              onUpdateStatus={handleStatusChange}
              currentUserId={currentUserId}
              isTaskOwner={isOwner}
            />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 8,
  },
  emptySubtext: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    textAlign: 'center',
  },
});

export default AcceptancesList; 