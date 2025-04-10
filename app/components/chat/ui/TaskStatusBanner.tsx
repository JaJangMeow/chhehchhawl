import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Colors from '@/app/constants/Colors';
import { CheckCheck } from 'lucide-react-native';

interface TaskStatusBannerProps {
  task: any;
  currentUserId: string | null;
  taskActionLoading: boolean;
  onConfirmComplete: () => void;
}

const TaskStatusBanner: React.FC<TaskStatusBannerProps> = ({
  task,
  currentUserId,
  taskActionLoading,
  onConfirmComplete
}) => {
  if (!task || task.status !== 'finished' || !currentUserId) {
    return null;
  }

  const isTasker = task.assigned_to === currentUserId;
  const isPoster = task.created_by === currentUserId;

  return (
    <View style={styles.container}>
      {isTasker && (
        <View style={styles.bannerContainer}>
          <Text style={styles.bannerText}>
            Waiting for poster to confirm task completion
          </Text>
        </View>
      )}
      
      {isPoster && (
        <View style={styles.confirmationPromptContainer}>
          <Text style={styles.confirmationPromptText}>
            Tasker has marked this task as finished
          </Text>
          <TouchableOpacity
            style={[
              styles.confirmCompletionButton,
              taskActionLoading && styles.disabledButton
            ]}
            onPress={onConfirmComplete}
            disabled={taskActionLoading}
          >
            {taskActionLoading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <CheckCheck size={16} color={Colors.white} style={styles.buttonIcon} />
                <Text style={styles.confirmButtonText}>Confirm Task Completion</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#121212',
  },
  bannerContainer: {
    backgroundColor: '#333',
    padding: 10,
    alignItems: 'center',
  },
  bannerText: {
    color: Colors.white,
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 14,
  },
  confirmationPromptContainer: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    alignItems: 'center',
  },
  confirmationPromptText: {
    color: Colors.white,
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 14,
    marginBottom: 10,
  },
  confirmCompletionButton: {
    backgroundColor: Colors.success,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  confirmButtonText: {
    color: Colors.white,
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.7,
  }
});

export default TaskStatusBanner; 