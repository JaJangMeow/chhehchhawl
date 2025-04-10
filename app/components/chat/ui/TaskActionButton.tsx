import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import Colors from '@/app/constants/Colors';

interface TaskActionButtonProps {
  task: {
    id: string;
    status: string;
    assigned_to?: string;
  } | null;
  currentUserId: string | null;
  loading: boolean;
  onPress: () => void;
}

const TaskActionButton: React.FC<TaskActionButtonProps> = ({
  task,
  currentUserId,
  loading,
  onPress
}) => {
  if (!task) return null;
  
  // Only show the button if:
  // 1. Current user is the assigned tasker
  // 2. Task status is 'assigned'
  const shouldShowButton = task.assigned_to === currentUserId && task.status === 'assigned';
  
  if (!shouldShowButton) return null;
  
  return (
    <View style={styles.taskActionContainer}>
      <TouchableOpacity
        style={styles.finishTaskButton}
        onPress={onPress}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <>
            <CheckCircle size={20} color={Colors.white} />
            <Text style={styles.taskActionButtonText}>Finish Task</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  taskActionContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#121212',
  },
  finishTaskButton: {
    backgroundColor: Colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  taskActionButtonText: {
    color: Colors.white,
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 15,
    marginLeft: 8,
  }
});

export default TaskActionButton; 