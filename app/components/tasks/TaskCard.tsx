import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Task } from '../../types/task';
import Colors from '../../constants/Colors';
import { MapPin, Clock } from 'lucide-react-native';
import { formatDistance, getTimeAgo, getUrgencyColor, truncateDescription } from '../../utils/taskUtils';

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

interface TaskCardProps {
  task: Task;
  onPress: (task: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onPress }) => {
  const locationText = task.location?.address || 'Remote';
  const distance = task.distance || 0;
  const urgencyColor = getUrgencyColor(task);

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
    return status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  };
  
  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No deadline';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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
  
  return (
    <TouchableOpacity 
      style={styles.taskCard} 
      onPress={() => onPress(task)}
    >
      <View style={styles.taskContent}>
        {/* Title with urgency indicator */}
        <View style={styles.titleContainer}>
          <View style={[styles.urgencyDot, { backgroundColor: urgencyColor }]} />
          <Text style={styles.taskTitle} numberOfLines={2}>
            {task.title}
          </Text>
        </View>
        
        {/* Description */}
        <Text style={styles.taskDescription} numberOfLines={3}>
          {truncateDescription(task.description)}
        </Text>
        
        {/* Bottom info: location and time posted */}
        <View style={styles.taskFooter}>
          <View style={styles.metaItem}>
            <MapPin size={14} color={Colors.textSecondary} />
            <Text style={styles.metaText}>
              {formatDistance(distance)}
            </Text>
          </View>
          
          <View style={styles.metaItem}>
            <Clock size={14} color={Colors.textSecondary} />
            <Text style={styles.metaText}>
              {getTimeAgo(task.created_at)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  taskCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  taskContent: {
    gap: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urgencyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
  },
  taskDescription: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
  }
});

export default TaskCard; 