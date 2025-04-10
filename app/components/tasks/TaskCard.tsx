import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { Task } from '../../types/task';
import Colors from '../../constants/Colors';
import { MapPin, Clock, User, UserCheck } from 'lucide-react-native';
import { formatDistance, getTimeAgo, getUrgencyColor, truncateDescription } from '../../utils/taskUtils';
import { supabase } from '../../lib/supabase';

interface TaskCardProps {
  task: Task;
  onPress: (task: Task) => void;
  viewType?: 'grid' | 'list';
  currentUserId?: string | null;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onPress, viewType = 'grid', currentUserId }) => {
  const distance = task.distance || 0;
  const urgencyColor = getUrgencyColor(task);
  
  // Animation values
  const scaleAnim = React.useRef(new Animated.Value(0.97)).current;
  const opacityAnim = React.useRef(new Animated.Value(0.7)).current;
  
  // Task assignment badges
  const isCreator = task.created_by === currentUserId;
  const isAssigned = task.assigned_to !== null;
  const isAssignee = task.assigned_to === currentUserId;
  
  // Animate in when component mounts
  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  }, []);
  
  // Animation for press
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };
  
  const animatedCardStyle = {
    transform: [{ scale: scaleAnim }],
    opacity: opacityAnim,
  };
  
  return (
    <Animated.View style={[
      animatedCardStyle, 
      viewType === 'grid' ? styles.animatedViewGrid : styles.animatedViewList
    ]}>
      <TouchableOpacity 
        style={[
          styles.taskCard, 
          viewType === 'list' ? styles.taskCardList : styles.taskCardGrid
        ]} 
        onPress={() => onPress(task)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={styles.taskContent}>
          {/* Title with urgency indicator */}
          <View style={styles.titleContainer}>
            <View style={[styles.urgencyDot, { backgroundColor: urgencyColor }]} />
            <Text style={styles.taskTitle} numberOfLines={viewType === 'list' ? 2 : 1}>
              {task.title}
            </Text>
          </View>
          
          {/* Description */}
          <Text style={styles.taskDescription} numberOfLines={viewType === 'list' ? 3 : 2}>
            {truncateDescription(task.description, viewType === 'list' ? 120 : 60)}
          </Text>
          
          {/* Assignment/Creator status badges */}
          <View style={styles.badgeContainer}>
            {isCreator && (
              <View style={[styles.badge, styles.creatorBadge]}>
                <User size={10} color="#fff" />
                <Text style={styles.badgeText}>Posted by you</Text>
              </View>
            )}
            
            {isAssignee && (
              <View style={[styles.badge, styles.assigneeBadge]}>
                <UserCheck size={10} color="#fff" />
                <Text style={styles.badgeText}>Assigned to you</Text>
              </View>
            )}
            
            {isAssigned && !isAssignee && (
              <View style={[styles.badge, styles.assignedBadge]}>
                <UserCheck size={10} color="#fff" />
                <Text style={styles.badgeText}>Assigned</Text>
              </View>
            )}
          </View>
          
          {/* Bottom info: distance and time posted */}
          <View style={styles.metaContainer}>
            <View style={styles.metaItem}>
              <MapPin size={12} color={Colors.textSecondary} />
              <Text style={styles.metaText}>
                {formatDistance(distance)}
              </Text>
            </View>
            
            <View style={styles.metaItem}>
              <Clock size={12} color={Colors.textSecondary} />
              <Text style={styles.metaText}>
                {getTimeAgo(task.created_at)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  animatedViewGrid: {
    width: '48.5%', // Slightly less than 50% to account for gap
    aspectRatio: 1, // Perfect square
  },
  animatedViewList: {
    width: '100%',
    marginBottom: 8,
  },
  taskCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    // Enhanced shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  taskCardGrid: {
    padding: 12,
    height: '100%',
  },
  taskCardList: {
    padding: 16,
    flexDirection: 'column',
  },
  taskContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  urgencyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  taskTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
  },
  taskDescription: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
    lineHeight: 18,
    flex: 1,
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  creatorBadge: {
    backgroundColor: Colors.primary,
  },
  assigneeBadge: {
    backgroundColor: '#4CAF50', // Green
  },
  assignedBadge: {
    backgroundColor: '#FFC107', // Amber
  },
  badgeText: {
    fontSize: 9,
    fontFamily: 'SpaceGrotesk-Medium',
    color: '#fff',
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.textSecondary,
  }
});

export default TaskCard; 