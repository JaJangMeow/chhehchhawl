import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, SafeAreaView } from 'react-native';
import { ArrowLeft, MapPin } from 'lucide-react-native';
import Colors from '@/app/constants/Colors';
import { logger } from '@/app/utils/logger';

interface TaskDetailsProps {
  task: {
    id: string;
    status: string;
    created_by: string;
    assigned_to?: string;
    title: string;
    description?: string;
    budget?: number;
    location?: {
      address?: string;
      lat?: number;
      lng?: number;
      display_name?: string;
    };
    building_name?: string;
    locality?: string;
    category?: string;
    categories?: string[];
    deadline?: string;
    created_at?: string;
  };
  currentUserId: string | null;
  onClose: () => void;
}

const TaskDetailsOverlay: React.FC<TaskDetailsProps> = ({ task, currentUserId, onClose }) => {
  // Get role type based on current user
  const userIsOwner = task.created_by === currentUserId;
  
  // Get status color
  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return Colors.warning;
      case 'assigned': return Colors.primary;
      case 'in_progress': return Colors.primary;
      case 'finished': return Colors.success;
      case 'completed': return Colors.success;
      case 'cancelled': return Colors.error;
      default: return Colors.primary;
    }
  };

  // Function to open Google Maps with the location
  const openMapsNavigation = () => {
    let url = '';
    
    // Get coordinates from location field only
    const lat = task.location?.lat;
    const lng = task.location?.lng;
    
    if (lat && lng) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    } else if (task.location?.address) {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.location.address)}`;
    } else if (task.building_name) {
      const query = task.locality 
        ? `${task.building_name}, ${task.locality}` 
        : task.building_name;
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    }
    
    if (url) {
      Linking.openURL(url).catch(err => {
        logger.error('Error opening maps navigation:', err);
        alert('Unable to open maps navigation. Please try again.');
      });
    } else {
      alert('This task does not have a location specified.');
    }
  };
  
  // Format the budget
  const formatBudget = (budget?: number) => {
    if (!budget && budget !== 0) return 'Not specified';
    return `₹${budget.toFixed(2)}`;
  };
  
  // Format the date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };
  
  // Check if location information exists
  const hasLocation = Boolean(
    task.location?.lat && task.location?.lng || 
    task.location?.address || 
    task.building_name
  );
  
  return (
    <View style={styles.taskDetailsFullScreenWrapper}>
      <View style={styles.taskDetailsFullScreenOverlay}>
        <SafeAreaView style={styles.taskDetailsFullScreenContainer}>
          <View style={styles.taskDetailsHeader}>
            <TouchableOpacity 
              onPress={onClose}
              style={styles.taskDetailsBackButton}
            >
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.taskDetailsTitle}>Task Details</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <ScrollView style={styles.taskDetailsScrollView}>
            <View style={styles.taskDetailsContent}>
              {/* Title Section */}
              <Text style={styles.taskDetailsSectionTitle}>Title</Text>
              <Text style={styles.taskDetailsText}>{task.title}</Text>
              
              {/* Description Section */}
              <Text style={styles.taskDetailsSectionTitle}>Description</Text>
              <Text style={styles.taskDetailsText}>
                {task.description || 'No description provided'}
              </Text>
              
              {/* Budget Section */}
              <Text style={styles.taskDetailsSectionTitle}>Budget</Text>
              <Text style={styles.taskDetailsText}>{formatBudget(task.budget)}</Text>
              
              {/* Deadline Section */}
              {task.deadline && (
                <>
                  <Text style={styles.taskDetailsSectionTitle}>Deadline</Text>
                  <Text style={styles.taskDetailsText}>{formatDate(task.deadline)}</Text>
                </>
              )}
              
              {/* Location Section */}
              <Text style={styles.taskDetailsSectionTitle}>Location</Text>
              <View style={styles.taskDetailsLocationContainer}>
                <Text style={styles.taskDetailsText}>
                  {task.location?.address || task.building_name || 'No location specified'}
                  {task.locality ? `, ${task.locality}` : ''}
                </Text>
                
                {hasLocation && (
                  <TouchableOpacity 
                    style={styles.taskDetailsMapButton}
                    onPress={openMapsNavigation}
                  >
                    <MapPin size={18} color={Colors.white} />
                    <Text style={styles.taskDetailsMapButtonText}>Navigate</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Status & Role Section */}
              <View style={styles.taskDetailsStatusRow}>
                <View style={styles.taskDetailsStatusSection}>
                  <Text style={styles.taskDetailsSectionTitle}>Status</Text>
                  <View style={[
                    styles.taskStatusBadge, 
                    { backgroundColor: getTaskStatusColor(task.status) }
                  ]}>
                    <Text style={styles.taskStatusBadgeText}>
                      {task.status.charAt(0).toUpperCase() + task.status.slice(1).replace('_', ' ')}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.taskDetailsStatusSection}>
                  <Text style={styles.taskDetailsSectionTitle}>Role</Text>
                  <View style={[
                    styles.taskRoleBadge, 
                    { 
                      backgroundColor: userIsOwner ? '#FFC107' : '#4CAF50'
                    }
                  ]}>
                    <Text style={styles.taskRoleBadgeText}>
                      {userIsOwner ? 'Owner' : 'Assigned'}
                    </Text>
                  </View>
                </View>
              </View>
              
              {/* Categories Section */}
              {task.categories && task.categories.length > 0 && (
                <>
                  <Text style={styles.taskDetailsSectionTitle}>Categories</Text>
                  <View style={styles.taskDetailsCategoriesContainer}>
                    {task.categories.map((category, index) => (
                      <View key={index} style={styles.taskDetailsCategoryBadge}>
                        <Text style={styles.taskDetailsCategoryText}>{category}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
              
              {/* Created Date Section */}
              <Text style={styles.taskDetailsSectionTitle}>Created</Text>
              <Text style={styles.taskDetailsText}>{formatDate(task.created_at)}</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  taskDetailsFullScreenWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#121212',
  },
  taskDetailsFullScreenOverlay: {
    flex: 1,
    backgroundColor: '#121212',
  },
  taskDetailsFullScreenContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  taskDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#121212',
  },
  taskDetailsBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  taskDetailsTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.white,
  },
  taskDetailsScrollView: {
    flex: 1,
    backgroundColor: '#121212',
  },
  taskDetailsContent: {
    padding: 16,
  },
  taskDetailsSectionTitle: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.gray,
    marginTop: 16,
    marginBottom: 4,
  },
  taskDetailsText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.white,
    marginBottom: 8,
  },
  taskDetailsLocationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  taskDetailsMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 10,
  },
  taskDetailsMapButtonText: {
    color: Colors.white,
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 14,
    marginLeft: 4,
  },
  taskDetailsStatusRow: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  taskDetailsStatusSection: {
    flex: 1,
  },
  taskStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  taskStatusBadgeText: {
    color: Colors.white,
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 14,
  },
  taskRoleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  taskRoleBadgeText: {
    color: Colors.white,
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 14,
  },
  taskDetailsCategoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  taskDetailsCategoryBadge: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  taskDetailsCategoryText: {
    color: Colors.white,
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 14,
  }
});

export default TaskDetailsOverlay;
