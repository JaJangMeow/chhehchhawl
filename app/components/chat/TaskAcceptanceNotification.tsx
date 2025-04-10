import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';
import Colors from '@/app/constants/Colors';

interface TaskAcceptanceNotificationProps {
  message: {
    content: string;
    task_acceptance?: {
      id: string;
      status: 'pending' | 'confirmed' | 'rejected';
      task_id: string;
      created_by: string;
    };
  };
  isTaskOwner: boolean;
}

const TaskAcceptanceNotification: React.FC<TaskAcceptanceNotificationProps> = ({
  message,
  isTaskOwner,
}) => {
  // Extract task acceptance info from message
  const taskAcceptance = message.task_acceptance;
  
  if (!taskAcceptance) {
    return null;
  }

  const status = taskAcceptance.status;

  // Render appropriate icon based on status
  const renderStatusIcon = () => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle size={20} color={Colors.success} />;
      case 'rejected':
        return <XCircle size={20} color={Colors.error} />;
      case 'pending':
      default:
        return <AlertCircle size={20} color={Colors.warning} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={[
          styles.statusContainer,
          status === 'confirmed' && styles.confirmedContainer,
          status === 'rejected' && styles.rejectedContainer,
          status === 'pending' && styles.pendingContainer,
        ]}>
          {renderStatusIcon()}
          <Text style={styles.statusText}>
            {status === 'confirmed' 
              ? 'Task Accepted' 
              : status === 'rejected' 
                ? 'Task Declined' 
                : 'Task Request Pending'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
    overflow: 'hidden',
  },
  content: {
    padding: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  pendingContainer: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
  },
  confirmedContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  rejectedContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
});

export default TaskAcceptanceNotification; 