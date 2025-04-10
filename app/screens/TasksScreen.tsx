import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Modal,
  Dimensions,
  Image,
  ScrollView,
  Alert,
  SafeAreaView,
  TextInput,
  Platform,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Location from 'expo-location';
import { BlurView } from 'expo-blur';
import Slider from '@react-native-community/slider';
import * as Linking from 'expo-linking';

import { taskService } from '../services/taskService';
import { Task } from '../types/task';
import { EmptyState } from '../components/shared/EmptyState';
import Colors from '../constants/Colors';
import { logger } from '../utils/logger';
import { MapPin, Calendar, IndianRupee, Tag, AlertCircle, Star, Clock, Building2, User, CreditCard, Wrench, Info, Navigation, Grid, List, ArrowDownUp as SortDescending, Filter } from 'lucide-react-native';
import { calculateDistance } from '../utils/taskUtils';
import TaskCard from '../components/tasks/TaskCard';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';
import SortModal from '../components/tasks/SortModal';
import FilterModal from '../components/tasks/FilterModal';
import { supabase } from '../lib/supabase';
import { formatDistance, getTimeAgo, getUrgencyColor, truncateDescription, getStatusColor, formatStatus } from '../utils/taskUtils';
import { formatPrice } from '../utils/formatters';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const CARD_WIDTH = (width - 48) / COLUMN_COUNT; // 48 = padding (16) * 2 + gap (16)
const CARD_ASPECT_RATIO = 1; // Square cards

export default function TasksScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState<string>('recent');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [tempFilters, setTempFilters] = useState<{
    status: string[];
    category: string[];
    urgency: boolean | null;
    minBudget: number | null;
    maxBudget: number | null;
    maxDistance: number | null;
    minDistance: number | null;
    distanceRange: string | null;
  }>({
    status: [],
    category: [],
    urgency: null,
    minBudget: null,
    maxBudget: null,
    maxDistance: null,
    minDistance: null,
    distanceRange: null,
  });
  const [filters, setFilters] = useState<typeof tempFilters>({
    status: [],
    category: [],
    urgency: null,
    minBudget: null,
    maxBudget: null,
    maxDistance: null,
    minDistance: null,
    distanceRange: null,
  });
  const [userLocation, setUserLocation] = useState<{
    coords: { latitude: number; longitude: number };
    address: string;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [tasksView, setTasksView] = useState<'all' | 'posted' | 'accepted'>('all');
  const [acceptingTask, setAcceptingTask] = useState(false);
  const [taskDetailModalVisible, setTaskDetailModalVisible] = useState(false);

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

  const fetchTasks = async () => {
    try {
      const fetchedTasks = await taskService.getTasks();
      
      // Calculate distances if user location is available
      if (userLocation) {
        const tasksWithDistance = fetchedTasks.map(task => {
          // If task has location coordinates, calculate distance
          if (task.location?.lat && task.location?.lng) {
            const distance = calculateDistance(
              userLocation.coords.latitude,
              userLocation.coords.longitude,
              task.location.lat,
              task.location.lng
            );
            return { ...task, distance };
          }
          // Default large distance for tasks without coordinates
          return { ...task, distance: 9999 };
        });
        setTasks(tasksWithDistance);
        setFilteredTasks(tasksWithDistance);
      } else {
        setTasks(fetchedTasks);
        setFilteredTasks(fetchedTasks);
      }
    } catch (err: any) {
      logger.error('Error fetching tasks:', err);
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      // Request permission to access location
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setLocationError('Permission to access location was denied');
        return;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      // Get address for the location
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const address = reverseGeocode[0] 
        ? `${reverseGeocode[0].street || ''}, ${reverseGeocode[0].district || ''}, ${reverseGeocode[0].city || ''}`
        : 'Unknown location';

      setUserLocation({
        coords: location.coords,
        address: address.replace(/^, |, $/, '')  // Remove leading/trailing commas
      });

      // Recalculate distances for all tasks
      if (tasks.length > 0) {
        const tasksWithDistance = tasks.map(task => {
          if (task.location?.lat && task.location?.lng) {
            const distance = calculateDistance(
              location.coords.latitude,
              location.coords.longitude,
              task.location.lat,
              task.location.lng
            );
            return { ...task, distance };
          }
          return { ...task, distance: 9999 };
        });
        setTasks(tasksWithDistance);
        
        // If currently sorting by distance, re-sort the filtered tasks
        if (filters.distanceRange === 'near') {
          const sorted = [...filteredTasks].sort((a, b) => 
            (a.distance || 9999) - (b.distance || 9999)
          );
          setFilteredTasks(sorted);
        } else {
          // Just update distances without changing sort order
          setFilteredTasks(current => 
            current.map(task => {
              const updatedTask = tasksWithDistance.find(t => t.id === task.id);
              return updatedTask || task;
            })
          );
        }
      }
    } catch (error: any) {
      setLocationError(`Couldn't get location: ${error.message}`);
    }
  };

  // Start location tracking when component mounts
  useEffect(() => {
    getCurrentLocation();
    
    // Set up location subscription
    let locationSubscription: Location.LocationSubscription;
    
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 100, // Update every 100 meters
            timeInterval: 60000 // Or every minute
          },
          (location) => {
            // We'll get current address in a separate function to keep this callback light
            updateLocationWithoutAddress(location);
          }
        );
      }
    })();
    
    // Clean up subscription on unmount
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  // Update location coords without getting address (for frequent updates)
  const updateLocationWithoutAddress = (location: Location.LocationObject) => {
    setUserLocation(current => current ? {
      ...current,
      coords: location.coords
    } : null);
    
    // Update distances for tasks if needed
    if (tasks.length > 0) {
      const tasksWithDistance = tasks.map(task => {
        if (task.location?.lat && task.location?.lng) {
          const distance = calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            task.location.lat,
            task.location.lng
          );
          return { ...task, distance };
        }
        return { ...task, distance: 9999 };
      });
      
      // Update distances without changing sort order (unless sorting by distance)
      if (filters.distanceRange === 'near') {
        setFilteredTasks([...tasksWithDistance].sort((a, b) => 
          (a.distance || 9999) - (b.distance || 9999)
        ));
      } else {
        setFilteredTasks(current => 
          current.map(task => {
            const updatedTask = tasksWithDistance.find(t => t.id === task.id);
            return updatedTask || task;
          })
        );
      }
    }
  };

  // Fetch tasks after getting location
  useEffect(() => {
    fetchTasks();
  }, [userLocation?.coords.latitude, userLocation?.coords.longitude]);

  // Update tempFilters when filter modal opens
  useEffect(() => {
    if (filterModalVisible) {
      setTempFilters({ ...filters });
    }
  }, [filterModalVisible, filters]);

  // Apply sorting and filtering whenever sortBy or filters change
  useEffect(() => {
    let result = [...tasks];
    
    // Apply filters
    if (filters.status.length > 0) {
      result = result.filter(task => filters.status.includes(task.status));
    }
    
    if (filters.category.length > 0) {
      result = result.filter(task => 
        task.categories && task.categories.some(cat => filters.category.includes(cat))
      );
    }
    
    if (filters.urgency !== null) {
      result = result.filter(task => task.urgent === filters.urgency);
    }
    
    if (filters.minBudget !== null) {
      result = result.filter(task => {
        const budget = task.price || task.budget || 0;
        return budget >= (filters.minBudget || 0);
      });
    }
    
    if (filters.maxBudget !== null) {
      result = result.filter(task => {
        const budget = task.price || task.budget || 0;
        return budget <= (filters.maxBudget || Infinity);
      });
    }
    
    if (filters.minDistance !== null || filters.maxDistance !== null) {
      result = result.filter(task => {
        // Check min distance if set
        if (filters.minDistance !== null && (!task.distance || task.distance < filters.minDistance)) {
          return false;
        }
        
        // Check max distance if set
        if (filters.maxDistance !== null && (task.distance && task.distance > filters.maxDistance)) {
          return false;
        }
        
        return true;
      });
    }
    
    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'nearest':
          return (a.distance || Infinity) - (b.distance || Infinity);
        case 'farthest':
          return (b.distance || 0) - (a.distance || 0);
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'highest_budget':
          return (b.price || b.budget || 0) - (a.price || a.budget || 0);
        case 'lowest_budget':
          return (a.price || a.budget || 0) - (b.price || b.budget || 0);
        case 'urgency_high':
          if (a.urgent && !b.urgent) return -1;
          if (!a.urgent && b.urgent) return 1;
          return 0;
        default:
          return 0;
      }
    });
    
    setFilteredTasks(result);
  }, [tasks, sortBy, filters]);

  useEffect(() => {
    // Apply filters and view type when tasks or filters change
    filterTasks();
  }, [tasks, filters, tasksView]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTasks().finally(() => setRefreshing(false));
  };

  const handleCreateTask = () => {
    router.push('/create-task' as any);
  };

  const handleTaskPress = (task: Task) => {
    setSelectedTask(task);
  };

  const toggleSortModal = () => {
    setSortModalVisible(!sortModalVisible);
  };

  const toggleFilterModal = () => {
    setFilterModalVisible(!filterModalVisible);
  };

  const applySorting = (sortOption: string) => {
    setSortBy(sortOption);
    setSortModalVisible(false);
  };

  const applyFilters = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setFilterModalVisible(false);
  };

  const resetFilters = () => {
    setFilters({
      status: [],
      category: [],
      urgency: null,
      minBudget: null,
      maxBudget: null,
      maxDistance: null,
      minDistance: null,
      distanceRange: null,
    });
    setFilterModalVisible(false);
  };

  const renderTaskCard = ({ item: task }: { item: Task }) => {
    return (
      <TaskCard 
        task={task} 
        onPress={handleTaskPress} 
        viewType={viewType}
        currentUserId={currentUserId}
      />
    );
  };

  const renderTaskModal = () => {
    if (!selectedTask) return null;

    const photos = selectedTask.task_photos || [];
    const hasPhotos = photos.length > 0;
    const firstPhoto = hasPhotos ? photos[0] : null;

    return (
      <Modal
        visible={!!selectedTask}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedTask(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Close Button */}
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setSelectedTask(null)}
              >
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>

              {/* Task Details */}
              <ScrollView style={styles.modalScrollContent}>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <Text style={styles.modalTitle}>{selectedTask.title}</Text>
                    {selectedTask.urgent && (
                      <View style={styles.urgentBadge}>
                        <AlertCircle size={14} color="#fff" />
                        <Text style={styles.urgentText}>Urgent</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Status and Category */}
                <View style={styles.metadataContainer}>
                  <View style={[
                    styles.statusBadge, 
                    { backgroundColor: selectedTask.status === 'pending' ? '#FFA72620' : 
                                    selectedTask.status === 'assigned' ? '#29B6F620' : 
                                    selectedTask.status === 'completed' ? '#66BB6A20' : 
                                    '#EF535020' }
                  ]}>
                    <Text style={[
                      styles.statusText, 
                      { color: selectedTask.status === 'pending' ? '#FFA726' : 
                               selectedTask.status === 'assigned' ? '#29B6F6' : 
                               selectedTask.status === 'completed' ? '#66BB6A' : 
                               '#EF5350' }
                    ]}>
                      {selectedTask.status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Text>
                  </View>

                  {selectedTask.categories && selectedTask.categories.length > 0 && (
                    <View style={styles.categoryBadge}>
                      <Tag size={14} color={Colors.textSecondary} />
                      <Text style={styles.categoryText}>{selectedTask.categories[0]}</Text>
                    </View>
                  )}
                </View>

                {/* Budget - Moved here with green border */}
                <View style={styles.budgetContainer}>
                  <View style={styles.budgetContent}>
                    <IndianRupee size={18} color="#4CAF50" />
                    <Text style={styles.budgetText}>
                      {formatPrice(selectedTask.budget)}
                    </Text>
                  </View>
                </View>

                {/* Description */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Description</Text>
                  <View style={styles.descriptionContainer}>
                    <Text style={styles.description}>{selectedTask.description || 'No description provided.'}</Text>
                  </View>
                </View>

                {/* Task Details */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Task Details</Text>
                  
                  <View style={styles.detailsGrid}>
                    {/* Location */}
                    <View style={styles.detailItem}>
                      <View style={styles.detailIcon}>
                        <MapPin size={18} color={Colors.textSecondary} />
                      </View>
                      <Text style={styles.detailLabel}>Location</Text>
                      <Text style={styles.detailValue}>{selectedTask.location?.address || 'Remote'}</Text>
                    </View>
                    
                    {/* Deadline */}
                    <View style={styles.detailItem}>
                      <View style={styles.detailIcon}>
                        <Calendar size={18} color={Colors.textSecondary} />
                      </View>
                      <Text style={styles.detailLabel}>Deadline</Text>
                      <Text style={styles.detailValue}>
                        {selectedTask.deadline ? format(new Date(selectedTask.deadline), 'MMM d, yyyy') : 'No deadline'}
                      </Text>
                    </View>
                    
                    {/* Estimated Time */}
                    <View style={styles.detailItem}>
                      <View style={styles.detailIcon}>
                        <Clock size={18} color={Colors.textSecondary} />
                      </View>
                      <Text style={styles.detailLabel}>Est. Time</Text>
                      <Text style={styles.detailValue}>
                        {selectedTask.estimated_time 
                          ? `${Math.floor(selectedTask.estimated_time / 60)}h ${selectedTask.estimated_time % 60}m` 
                          : 'Not specified'}
                      </Text>
                    </View>
                    
                    {/* Priority */}
                    <View style={styles.detailItem}>
                      <View style={styles.detailIcon}>
                        <Star size={18} color={selectedTask.priority === 'high' ? '#F44336' : 
                                         selectedTask.priority === 'medium' ? '#FFC107' : 
                                         '#4CAF50'} />
                      </View>
                      <Text style={styles.detailLabel}>Priority</Text>
                      <Text style={[
                        styles.detailValue,
                        { color: selectedTask.priority === 'high' ? '#F44336' : 
                                 selectedTask.priority === 'medium' ? '#FFC107' : 
                                 '#4CAF50' }
                      ]}>
                        {selectedTask.priority ? selectedTask.priority.charAt(0).toUpperCase() + selectedTask.priority.slice(1) : 'Normal'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Additional Information */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Additional Information</Text>
                  
                  <View style={styles.additionalInfo}>
                    {/* Skills Required */}
                    <View style={styles.infoItem}>
                      <View style={styles.infoIcon}>
                        <Wrench size={18} color={Colors.textSecondary} />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Required Skills</Text>
                        <Text style={styles.infoValue}>
                          {selectedTask.skill_requirements && selectedTask.skill_requirements.length > 0 
                            ? selectedTask.skill_requirements.join(', ') 
                            : 'None required'}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Payment Method */}
                    <View style={styles.infoItem}>
                      <View style={styles.infoIcon}>
                        <CreditCard size={18} color={Colors.textSecondary} />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Payment Method</Text>
                        <Text style={styles.infoValue}>
                          {selectedTask.payment_method
                            ? selectedTask.payment_method.charAt(0).toUpperCase() + selectedTask.payment_method.slice(1)
                            : 'Not specified'}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Posted Date */}
                    <View style={styles.infoItem}>
                      <View style={styles.infoIcon}>
                        <Calendar size={18} color={Colors.textSecondary} />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Posted</Text>
                        <Text style={styles.infoValue}>
                          {selectedTask.created_at ? format(new Date(selectedTask.created_at), 'MMM d, yyyy') : 'Unknown'}
                        </Text>
                      </View>
                    </View>

                    {/* Task Visibility */}
                    <View style={styles.infoItem}>
                      <View style={styles.infoIcon}>
                        <Info size={18} color={Colors.textSecondary} />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Task Visibility</Text>
                        <Text style={styles.infoValue}>
                          {selectedTask.task_visibility_hours ? `${selectedTask.task_visibility_hours} hours` : 'Not specified'}
                        </Text>
                      </View>
                    </View>

                    {/* Completion Time */}
                    <View style={styles.infoItem}>
                      <View style={styles.infoIcon}>
                        <Clock size={18} color={Colors.textSecondary} />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Complete Within</Text>
                        <Text style={styles.infoValue}>
                          {selectedTask.task_completion_hours ? `${selectedTask.task_completion_hours} hours` : 'Not specified'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Photo Gallery - Moved to bottom */}
                {hasPhotos && (
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Photos</Text>
                    <View style={styles.photoGallery}>
                      {hasPhotos && firstPhoto ? (
                        <Image 
                          source={{ uri: firstPhoto }}
                          style={styles.modalImage}
                        />
                      ) : (
                        <View style={styles.placeholderImage}>
                          <Ionicons name="image-outline" size={32} color={Colors.textSecondary} />
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Apply Button */}
                <View style={styles.modalFooter}>
                  {selectedTask && selectedTask.created_by !== currentUserId && (
                    <TouchableOpacity 
                      style={[styles.applyButton, { flex: 1, margin: 0 }]}
                      onPress={() => {
                        handleAcceptTask(selectedTask.id, selectedTask.description);
                        setSelectedTask(null);
                      }}
                    >
                      <Text style={styles.applyButtonText}>Apply</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Sort Options Modal
  const renderSortModal = () => {
    const sortOptions = [
      { id: 'distance_near', label: 'Nearest First' },
      { id: 'distance_far', label: 'Furthest First' },
      { id: 'recent', label: 'Most Recent' },
      { id: 'oldest', label: 'Oldest First' },
      { id: 'deadline_soon', label: 'Deadline (Soonest)' },
      { id: 'priority_high', label: 'Highest Priority' },
    ];

    return (
      <Modal
        visible={sortModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={toggleSortModal}
      >
        <BlurView intensity={20} style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalOverlayTouch} 
            activeOpacity={1} 
            onPress={toggleSortModal}
          >
            <View style={styles.sortModalContainer}>
              <View style={styles.sortModalContent}>
                <Text style={styles.sortModalTitle}>Sort Tasks</Text>
                
                {sortOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.sortOption,
                      sortBy === option.id && styles.selectedSortOption
                    ]}
                    onPress={() => applySorting(option.id)}
                  >
                    <Text 
                      style={[
                        styles.sortOptionText,
                        sortBy === option.id && styles.selectedSortOptionText
                      ]}
                    >
                      {option.label}
                    </Text>
                    {sortBy === option.id && (
                      <Ionicons name="checkmark" size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </BlurView>
      </Modal>
    );
  };

  // Filter Options Modal
  const renderFilterModal = () => {
    // Extract all unique categories from tasks
    const allCategories = Array.from(
      new Set(
        tasks
          .filter(task => task.categories && task.categories.length > 0)
          .flatMap(task => task.categories || [])
      )
    );

    const statusOptions = [
      { id: 'pending', label: 'Pending' },
      { id: 'assigned', label: 'Assigned' },
      { id: 'completed', label: 'Completed' },
      { id: 'cancelled', label: 'Cancelled' },
    ];

    const toggleStatusFilter = (status: string) => {
      if (tempFilters.status.includes(status)) {
        setTempFilters({
          ...tempFilters,
          status: tempFilters.status.filter(s => s !== status)
        });
      } else {
        setTempFilters({
          ...tempFilters,
          status: [...tempFilters.status, status]
        });
      }
    };

    const toggleCategoryFilter = (category: string) => {
      if (tempFilters.category.includes(category)) {
        setTempFilters({
          ...tempFilters,
          category: tempFilters.category.filter(c => c !== category)
        });
      } else {
        setTempFilters({
          ...tempFilters,
          category: [...tempFilters.category, category]
        });
      }
    };

    const setUrgencyFilter = (urgency: boolean | null) => {
      setTempFilters({
        ...tempFilters,
        urgency
      });
    };

    // Get estimated max distance across all tasks for the slider
    const maxPossibleDistance = Math.max(...tasks.map(task => task.distance || 0), 10000);
    const distanceMarks = [2000, 5000, 10000, 20000];

    return (
      <Modal
        visible={filterModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={toggleFilterModal}
      >
        <View style={styles.filterModalContainer}>
          <View style={styles.filterModalContent}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filter Tasks</Text>
              <TouchableOpacity onPress={toggleFilterModal}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterScrollContent}>
              {/* Status Filters */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Status</Text>
                <View style={styles.filterOptions}>
                  {statusOptions.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.filterChip,
                        tempFilters.status.includes(option.id) && styles.selectedFilterChip
                      ]}
                      onPress={() => toggleStatusFilter(option.id)}
                    >
                      <Text 
                        style={[
                          styles.filterChipText,
                          tempFilters.status.includes(option.id) && styles.selectedFilterChipText
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Category Filters */}
              {allCategories.length > 0 && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Categories</Text>
                  <View style={styles.filterOptions}>
                    {allCategories.map((category) => (
                      <TouchableOpacity
                        key={category}
                        style={[
                          styles.filterChip,
                          tempFilters.category.includes(category) && styles.selectedFilterChip
                        ]}
                        onPress={() => toggleCategoryFilter(category)}
                      >
                        <Text 
                          style={[
                            styles.filterChipText,
                            tempFilters.category.includes(category) && styles.selectedFilterChipText
                          ]}
                        >
                          {category}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Urgency Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Urgency</Text>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      tempFilters.urgency === true && styles.selectedFilterChip
                    ]}
                    onPress={() => setUrgencyFilter(tempFilters.urgency === true ? null : true)}
                  >
                    <Text 
                      style={[
                        styles.filterChipText,
                        tempFilters.urgency === true && styles.selectedFilterChipText
                      ]}
                    >
                      Urgent Only
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      tempFilters.urgency === false && styles.selectedFilterChip
                    ]}
                    onPress={() => setUrgencyFilter(tempFilters.urgency === false ? null : false)}
                  >
                    <Text 
                      style={[
                        styles.filterChipText,
                        tempFilters.urgency === false && styles.selectedFilterChipText
                      ]}
                    >
                      Non-Urgent Only
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Budget Range */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Budget Range</Text>
                <View style={styles.budgetInputContainer}>
                  <View style={styles.budgetInput}>
                    <Text style={styles.budgetInputLabel}>Min ₹</Text>
                    <TextInput
                      style={styles.budgetInputField}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={Colors.textSecondary}
                      value={tempFilters.minBudget?.toString() || ''}
                      onChangeText={(text) => setTempFilters({
                        ...tempFilters,
                        minBudget: text ? parseInt(text, 10) : null
                      })}
                    />
                  </View>
                  <Text style={styles.budgetSeparator}>to</Text>
                  <View style={styles.budgetInput}>
                    <Text style={styles.budgetInputLabel}>Max ₹</Text>
                    <TextInput
                      style={styles.budgetInputField}
                      keyboardType="numeric"
                      placeholder="Any"
                      placeholderTextColor={Colors.textSecondary}
                      value={tempFilters.maxBudget?.toString() || ''}
                      onChangeText={(text) => setTempFilters({
                        ...tempFilters,
                        maxBudget: text ? parseInt(text, 10) : null
                      })}
                    />
                  </View>
                </View>
              </View>

              {/* Distance Filter - New */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Distance</Text>
                <View style={styles.distanceOptionsContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.distanceOption,
                      tempFilters.distanceRange === 'nearby' && styles.selectedDistanceOption
                    ]}
                    onPress={() => setTempFilters({...tempFilters, distanceRange: 'nearby', maxDistance: 1000})}
                  >
                    <MapPin size={16} color={tempFilters.distanceRange === 'nearby' ? Colors.primary : Colors.textSecondary} />
                    <Text style={[
                      styles.distanceOptionText,
                      tempFilters.distanceRange === 'nearby' && styles.selectedDistanceOptionText
                    ]}>
                      &lt;1km
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.distanceOption,
                      tempFilters.distanceRange === 'close' && styles.selectedDistanceOption
                    ]}
                    onPress={() => setTempFilters({...tempFilters, distanceRange: 'close', minDistance: 1000, maxDistance: 5000})}
                  >
                    <Navigation size={16} color={tempFilters.distanceRange === 'close' ? Colors.primary : Colors.textSecondary} />
                    <Text style={[
                      styles.distanceOptionText,
                      tempFilters.distanceRange === 'close' && styles.selectedDistanceOptionText
                    ]}>
                      1-5km
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.distanceOption,
                      tempFilters.distanceRange === 'medium' && styles.selectedDistanceOption
                    ]}
                    onPress={() => setTempFilters({...tempFilters, distanceRange: 'medium', minDistance: 5000, maxDistance: 50000})}
                  >
                    <Navigation size={16} color={tempFilters.distanceRange === 'medium' ? Colors.primary : Colors.textSecondary} />
                    <Text style={[
                      styles.distanceOptionText,
                      tempFilters.distanceRange === 'medium' && styles.selectedDistanceOptionText
                    ]}>
                      5-50km
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.distanceOption,
                      tempFilters.distanceRange === 'far' && styles.selectedDistanceOption
                    ]}
                    onPress={() => setTempFilters({...tempFilters, distanceRange: 'far', minDistance: 50000, maxDistance: null})}
                  >
                    <MapPin size={16} color={tempFilters.distanceRange === 'far' ? Colors.primary : Colors.textSecondary} />
                    <Text style={[
                      styles.distanceOptionText,
                      tempFilters.distanceRange === 'far' && styles.selectedDistanceOptionText
                    ]}>
                      &gt;50km
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {tempFilters.distanceRange && (
                  <TouchableOpacity
                    style={styles.resetDistanceButton}
                    onPress={() => setTempFilters({
                      ...tempFilters, 
                      distanceRange: null, 
                      minDistance: null, 
                      maxDistance: null
                    })}
                  >
                    <Text style={styles.resetDistanceText}>Reset Distance Filter</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>

            <View style={styles.filterActions}>
              <TouchableOpacity 
                style={styles.resetButton}
                onPress={resetFilters}
              >
                <Text style={styles.resetButtonText}>Reset All</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.applyButton}
                onPress={() => applyFilters(tempFilters)}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Handle accepting a task
  const handleAcceptTask = async (taskId: string, message?: string) => {
    try {
      setAcceptingTask(true);
      
      // Call the service to accept the task
      const result = await taskService.acceptTask(taskId, message);
      
      if (result.success) {
        // If we have a conversation ID, navigate to the chat
        if (result.conversationId) {
          Alert.alert(
            'Task Accepted!',
            'You can now chat with the task owner to discuss details.',
            [
              {
                text: 'View Chat',
                onPress: () => {
                  // Close the modal first
                  setTaskDetailModalVisible(false);
                  setSelectedTask(null);
                  
                  // Navigate to the chat
                  setTimeout(() => {
                    router.push(`/chat/${result.conversationId}` as any);
                  }, 300);
                },
              },
              {
                text: 'Later',
                style: 'cancel',
                onPress: () => {
                  // Just close the modal and refresh the task list
                  setTaskDetailModalVisible(false);
                  setSelectedTask(null);
                  fetchTasks();
                },
              },
            ]
          );
        } else {
          // Just show success and close the modal
          Alert.alert(
            'Success', 
            'Task accepted successfully! You will find this task in your assigned tasks list.',
            [
              {
                text: 'OK',
                onPress: () => {
                  setTaskDetailModalVisible(false);
                  setSelectedTask(null);
                  fetchTasks();
                }
              }
            ]
          );
        }
      } else {
        // Handle specific cases based on error message
        if (result.error?.includes('already assigned to you')) {
          // This task is already accepted by the current user
          Alert.alert(
            'Already Accepted',
            'You have already accepted this task. Would you like to view the conversation?',
            [
              {
                text: 'View Chat',
                onPress: () => {
                  // Close the modal first
                  setTaskDetailModalVisible(false);
                  setSelectedTask(null);
                  
                  // Navigate to the chat if available
                  if (result.conversationId) {
                    setTimeout(() => {
                      router.push(`/chat/${result.conversationId}` as any);
                    }, 300);
                  }
                },
              },
              {
                text: 'Later',
                style: 'cancel',
                onPress: () => {
                  setTaskDetailModalVisible(false);
                  setSelectedTask(null);
                },
              },
            ]
          );
        } else if (result.error?.includes('own task')) {
          // User is trying to accept their own task
          Alert.alert(
            'Cannot Accept Own Task',
            'You cannot accept a task that you posted.',
            [{ text: 'OK', onPress: () => {} }]
          );
          // We can close the modal since this is a clear case
          setTaskDetailModalVisible(false);
          setSelectedTask(null);
        } else if (result.error?.includes('already been assigned')) {
          // Task was assigned to someone else
          Alert.alert(
            'Task Already Assigned',
            'This task has already been assigned to someone else.',
            [{ 
              text: 'OK', 
              onPress: () => {
                setTaskDetailModalVisible(false);
                setSelectedTask(null);
                fetchTasks(); // Refresh to get latest state
              } 
            }]
          );
        } else {
          // For other errors, show the message
          Alert.alert(
            'Error', 
            result.error || 'Failed to accept task. Please try again.',
            [{ text: 'OK', onPress: () => {} }]
          );
        }
      }
    } catch (error: any) {
      logger.error('Error accepting task:', error);
      Alert.alert(
        'Error', 
        error.message || 'An unexpected error occurred. Please try again.',
        [{ text: 'OK', onPress: () => {} }]
      );
    } finally {
      setAcceptingTask(false);
    }
  };

  // Modify the filterTasks function to include task view filtering
  const filterTasks = () => {
    if (!tasks || tasks.length === 0) {
      setFilteredTasks([]);
      return;
    }

    // First filter by assignment status if needed
    let tasksByStatus = [...tasks];
    
    if (tasksView !== 'all' && currentUserId) {
      if (tasksView === 'posted') {
        tasksByStatus = tasks.filter(task => task.created_by === currentUserId);
      } else if (tasksView === 'accepted') {
        tasksByStatus = tasks.filter(task => task.assigned_to === currentUserId);
      }
    }
    
    // Then apply the other filters
    let result = tasksByStatus;

    // Category filter
    if (filters.category && filters.category.length > 0) {
      result = result.filter(task => {
        // Check if any of the task categories match the selected category
        if (Array.isArray(task.categories)) {
          return task.categories.some(category => filters.category.includes(category));
        }
        // Fallback to string category if array not available
        return filters.category.includes(task.category as string);
      });
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      result = result.filter(task => filters.status.includes(task.status));
    }

    // Urgency filter
    if (filters.urgency !== null) {
      result = result.filter(task => task.urgent === filters.urgency);
    }

    // Budget filters
    if (filters.minBudget !== null) {
      result = result.filter(task => {
        const budget = task.price || task.budget || 0;
        return budget >= (filters.minBudget || 0);
      });
    }

    if (filters.maxBudget !== null) {
      result = result.filter(task => {
        const budget = task.price || task.budget || 0;
        return budget <= (filters.maxBudget || Infinity);
      });
    }

    // Distance filters
    if (userLocation && filters.distanceRange) {
      // Sort by distance if distance filter is active
      if (filters.distanceRange === 'near') {
        result = result.sort((a, b) => (a.distance || 9999) - (b.distance || 9999));
      } else if (filters.distanceRange === 'far') {
        result = result.sort((a, b) => (b.distance || 0) - (a.distance || 0));
      }
    }

    // Apply sorting
    if (sortBy === 'recent') {
      result = result.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else if (sortBy === 'budget_high') {
      result = result.sort((a, b) => {
        const budgetA = a.price || a.budget || 0;
        const budgetB = b.price || b.budget || 0;
        return budgetB - budgetA;
      });
    } else if (sortBy === 'budget_low') {
      result = result.sort((a, b) => {
        const budgetA = a.price || a.budget || 0;
        const budgetB = b.price || b.budget || 0;
        return budgetA - budgetB;
      });
    }

    setFilteredTasks(result);
  };

  // Add task view toggle in the header UI
  const renderTaskViewToggle = () => (
    <View style={styles.taskViewToggle}>
      <TouchableOpacity
        style={[
          styles.viewToggleButton,
          tasksView === 'all' && styles.activeViewToggleButton
        ]}
        onPress={() => setTasksView('all')}
      >
        <Text style={[
          styles.viewToggleText,
          tasksView === 'all' && styles.activeViewToggleText
        ]}>All</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.viewToggleButton,
          tasksView === 'posted' && styles.activeViewToggleButton
        ]}
        onPress={() => setTasksView('posted')}
      >
        <Text style={[
          styles.viewToggleText,
          tasksView === 'posted' && styles.activeViewToggleText
        ]}>Posted</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.viewToggleButton,
          tasksView === 'accepted' && styles.activeViewToggleButton
        ]}
        onPress={() => setTasksView('accepted')}
      >
        <Text style={[
          styles.viewToggleText,
          tasksView === 'accepted' && styles.activeViewToggleText
        ]}>Accepted</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading tasks...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          title="Error"
          message={error}
          icon="alert-circle-outline"
          buttonText="Try Again"
          onButtonPress={handleRefresh}
        />
      </SafeAreaView>
    );
  }

  if (tasks.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          title="No Tasks Found"
          message="There are no tasks available at the moment."
          icon="list-outline"
          buttonText="Create Task"
          onButtonPress={handleCreateTask}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBarContainer}>
        <View style={styles.statusBarSpacing} />
        <View style={styles.topBar}>
          <View style={styles.topBarContent}>
            <Text style={styles.topBarTitle}>Tasks</Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={handleCreateTask}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {/* Task View Toggle */}
      {renderTaskViewToggle()}
      
      <View style={styles.locationFilterBar}>
        <View style={styles.userLocationContainer}>
          <MapPin size={18} color={Colors.primary} />
          <Text 
            style={styles.userLocationText} 
            numberOfLines={1}
          >
            {userLocation?.address || 'Fetching location...'}
          </Text>
        </View>
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={toggleSortModal}
          >
            <SortDescending size={18} color={Colors.text} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={toggleFilterModal}
          >
            <Filter size={18} color={Colors.text} />
            {(filters.status.length > 0 || filters.category.length > 0 || filters.urgency !== null || filters.minBudget !== null || filters.maxBudget !== null) && (
              <View style={styles.filterBadge} />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setViewType(viewType === 'grid' ? 'list' : 'grid')}
          >
            {viewType === 'grid' ? 
              <List size={18} color={Colors.text} /> : 
              <Grid size={18} color={Colors.text} />
            }
          </TouchableOpacity>
        </View>
      </View>
      
      <FlatList
        key={`tasks-${viewType}`}
        data={filteredTasks}
        renderItem={renderTaskCard}
        keyExtractor={(item) => item.id}
        numColumns={viewType === 'grid' ? COLUMN_COUNT : 1}
        contentContainerStyle={styles.listContent}
        onRefresh={handleRefresh}
        refreshing={refreshing} 
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={viewType === 'grid' ? styles.row : undefined}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="search" size={50} color={Colors.textSecondary} />
            <Text style={styles.emptyTitle}>No matching tasks</Text>
            <Text style={styles.emptyText}>Try changing your filters or create a new task</Text>
            <TouchableOpacity 
              style={styles.resetFiltersButton}
              onPress={resetFilters}
            >
              <Text style={styles.resetFiltersText}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      {renderTaskModal()}
      {renderSortModal()}
      {renderFilterModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  locationFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 2,
  },
  userLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  userLocationText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.text,
    marginLeft: 8,
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  listContent: {
    padding: 12,
    paddingBottom: 100,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  resetFiltersButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  resetFiltersText: {
    color: 'white',
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 14,
  },
  addTaskButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  topBarContainer: {
    backgroundColor: Colors.primary,
  },
  statusBarSpacing: {
    height: Platform.OS === 'android' ? 35 : 10, // Extra space for notification bar
  },
  topBar: {
    backgroundColor: Colors.primary,
    paddingTop: 10,
    paddingBottom: 14, // Increased for better spacing
    borderBottomLeftRadius: 28, // Increased curves
    borderBottomRightRadius: 28, // Increased curves
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 6,
    marginBottom: 4, // Add spacing between top bar and filter bar
  },
  topBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  topBarTitle: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20, // Perfect circle
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoGallery: {
    padding: 16,
  },
  modalImage: {
    width: width - 32,
    height: 250,
    borderRadius: 16,
    marginRight: 8,
  },
  placeholderImage: {
    width: width - 32,
    height: 250,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalScrollContent: {
    flex: 1,
  },
  modalHeader: {
    padding: 16,
    paddingBottom: 8, // Reduced bottom padding
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginBottom: 16,
  },
  metadataContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.textSecondary,
  },
  modalSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginBottom: 16,
  },
  descriptionContainer: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  description: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.text,
    lineHeight: 24,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailItem: {
    flex: 1,
    minWidth: '45%',
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.text,
  },
  additionalInfo: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.text,
  },
  applyButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    margin: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#fff',
  },
  filterModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 28, // Increased roundness
    borderTopRightRadius: 28, // Increased roundness
    height: '80%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  filterScrollContent: {
    flex: 1,
  },
  filterSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  selectedFilterChip: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.text,
  },
  selectedFilterChipText: {
    color: '#fff',
  },
  budgetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  budgetInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  budgetInputLabel: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.textSecondary,
    marginRight: 4,
  },
  budgetInputField: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.text,
  },
  budgetSeparator: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.textSecondary,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    marginRight: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
  },
  sortModalContainer: {
    width: '80%',
    borderRadius: 16, // Increased roundness
    overflow: 'hidden',
  },
  sortModalContent: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16, // Increased roundness
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  sortModalTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginBottom: 16,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  selectedSortOption: {
    backgroundColor: 'rgba(63, 137, 249, 0.1)',
  },
  sortOptionText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.text,
  },
  selectedSortOptionText: {
    color: Colors.primary,
  },
  filterModalTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginBottom: 16,
  },
  budgetContainer: {
    marginHorizontal: 16,
    marginBottom: 0,
  },
  budgetContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)', // Light green background
    borderWidth: 1,
    borderColor: '#4CAF50', // Green border
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  budgetText: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#4CAF50',
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244,67,54,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
    alignSelf: 'flex-start',
  },
  urgentText: {
    color: '#F44336',
    fontSize: 10,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  distanceOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 16,
    gap: 8,
  },
  distanceOption: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  selectedDistanceOption: {
    backgroundColor: 'rgba(71, 133, 255, 0.15)',
    borderColor: Colors.primary,
  },
  distanceOptionText: {
    marginLeft: 6,
    fontSize: 13,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.textSecondary,
  },
  selectedDistanceOptionText: {
    color: Colors.primary,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  resetDistanceButton: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginTop: 8,
  },
  resetDistanceText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.primary,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalOverlayTouch: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskViewToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: Colors.cardBackground,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  viewToggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  activeViewToggleButton: {
    backgroundColor: Colors.primary,
  },
  viewToggleText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.textSecondary,
  },
  activeViewToggleText: {
    color: '#fff',
  },
}); 

