import React, { useState } from 'react';
import { Alert, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { taskService } from '../../services/taskService';
import { Task } from '../../types/task';

interface TaskDetailHeaderProps {
  task: Task;
  onTaskUpdate?: () => void;
}

const TaskDetailHeader: React.FC<TaskDetailHeaderProps> = ({ task, onTaskUpdate }) => {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState(false);

  // Handle task application/acceptance
  const handleApplyToTask = async () => {
    try {
      setActionLoading(true);
      
      // Use the enhanced task service to accept the task with chat notification
      const result = await taskService.acceptTask(task.id);
      
      if (result.success) {
        // Show success message
        Alert.alert(
          'Application Sent!', 
          'Your application has been sent to the task owner. You will be notified when they respond.'
        );
        
        // If we got a conversation ID back, navigate to the chat
        if (result.conversationId) {
          router.push(`/chat/${result.conversationId}` as any);
        } else {
          // Just refresh the task details if no conversation ID
          if (onTaskUpdate) onTaskUpdate();
        }
      } else {
        // Show error message
        Alert.alert('Error', result.error || 'Failed to apply for this task. Please try again.');
      }
    } catch (error) {
      console.error('Error applying to task:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Button
      title="Apply"
      onPress={handleApplyToTask}
      disabled={actionLoading}
    />
  );
};

export default TaskDetailHeader; 