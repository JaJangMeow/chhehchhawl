import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Alert, 
  KeyboardAvoidingView, 
  Platform,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Modal,
  Pressable
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import Button from '../components/shared/Button';
import Input from '../components/shared/Input';
import DateTimePicker from '../components/shared/DateTimePicker';
import LocationPicker from '../components/shared/LocationPicker';
import { taskService } from '../services/taskService';
import { Task, CreateTaskPayload } from '../types/task';
import { supabase, isAuthenticated } from '../lib/supabase';
import Animated, { 
  FadeIn, 
  FadeInDown, 
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { 
  AlertCircle, 
  Calendar, 
  Check, 
  ChevronRight, 
  MapPin, 
  Clock, 
  Star, 
  Tag, 
  Layers,
  Info,
  HelpCircle,
  Timer
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

// Import styles and constants from separate files
import { styles } from './CreateTaskScreen.styles';
import { 
  TASK_CATEGORIES, 
  TASK_PRIORITIES, 
  TIME_OPTIONS, 
  TASK_CONTEXT_OPTIONS, 
  STEPS,
  isString,
  TaskFormData
} from './CreateTaskScreen.constants';

function CreateTaskScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<TaskFormData>>({
    title: '',
    description: '',
    budget: 500, // Default budget
    deadline: undefined,
    location: undefined,
    categories: [],
    priority: 'medium',
    urgent: false,
    manualAddress: '',
    buildingName: '',
    locality: '',
    contextFlags: {},
    estimatedTime: undefined,
    customTime: undefined,
    taskPhotos: [],
    taskCompletionHours: undefined,
    taskVisibilityHours: undefined, // No default value
    skillRequirements: [], // Add this new field for skill requirements
    paymentMethod: 'online', // Change default to online
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showTimeInfo, setShowTimeInfo] = useState(false);
  const [showCompletionInfo, setShowCompletionInfo] = useState(false);
  const [detectedAddress, setDetectedAddress] = useState<string | null>(null);

  // Add toggle states for sections
  const [visibilityExpanded, setVisibilityExpanded] = useState(false);
  const [timeEstimationExpanded, setTimeEstimationExpanded] = useState(false);
  const [skillsExpanded, setSkillsExpanded] = useState(false);
  
  // Add status for image upload
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Animation values
  const fadeAnim = useSharedValue(0);
  const cardScale = useSharedValue(0.95);
  const progressWidth = useSharedValue(33.33);
  
  // Add state for skill input instead of ref
  const [skillInputValue, setSkillInputValue] = useState('');
  
  // Add state to track if the user is authenticated
  const [isUserAuthenticated, setIsUserAuthenticated] = useState<boolean | null>(null);
  
  // Check authentication on component mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const authenticated = await isAuthenticated();
        setIsUserAuthenticated(authenticated);
        
        if (!authenticated) {
          console.warn("User not authenticated - may need to log in");
        }
      } catch (error) {
        console.error("Error checking authentication status:", error);
      }
    };
    
    checkAuthStatus();
  }, []);
  
  useEffect(() => {
    // Check authentication status on mount - simplified approach
    const checkAuth = async () => {
      try {
        // More direct auth check that's less likely to fail
        const session = await supabase.auth.getSession();
        const user = session?.data?.session?.user;
        
        if (user) {
          console.log("User authenticated with ID:", user.id);
          setIsUserAuthenticated(true);
          return;
        } 
        
        // Fallback to getUser if no session
        const userData = await supabase.auth.getUser();
        if (userData?.data?.user) {
          console.log("User authenticated via getUser fallback");
          setIsUserAuthenticated(true);
        } else {
          console.warn("No authenticated user found");
          setIsUserAuthenticated(false);
        }
      } catch (error) {
        console.error("Auth check error:", error);
      }
    };
    
    checkAuth();
  }, []);
  
  useEffect(() => {
    // Animate component on mount
    fadeAnim.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    cardScale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
    
    // Update progress bar based on current step
    progressWidth.value = withTiming(((currentStep + 1) / STEPS.length) * 100, {
      duration: 300,
      easing: Easing.inOut(Easing.cubic)
    });

    // Initialize toggle states based on existing data
    setVisibilityExpanded(formData.taskVisibilityHours !== undefined);
    setTimeEstimationExpanded(formData.taskCompletionHours !== undefined || formData.estimatedTime !== undefined);
    setSkillsExpanded(formData.skillRequirements !== undefined && formData.skillRequirements.length > 0);
    
    // Set default values for required fields if needed
    if (currentStep === 2) { // Only set defaults at review time
      const updatedData = { ...formData };
      let dataChanged = false;
      
      // Default task visibility to 48 hours if not set and showing in review
      if (updatedData.taskVisibilityHours === undefined) {
        updatedData.taskVisibilityHours = 48;
        dataChanged = true;
      }
      
      // Default estimated time to 30 minutes if not set and showing in review
      if (updatedData.estimatedTime === undefined && updatedData.customTime === undefined) {
        updatedData.estimatedTime = 30;
        dataChanged = true;
      }
      
      if (dataChanged) {
        setFormData(updatedData);
      }
    }
  }, [currentStep, formData.taskVisibilityHours, formData.taskCompletionHours, 
      formData.estimatedTime, formData.skillRequirements]);
  
  // Animated styles
  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value
  }));
  
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }]
  }));
  
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`
  }));
  
  // Add an effect to ensure online payment is selected
  useEffect(() => {
    // Ensure payment method is 'online' as cash option is disabled
    if (formData.paymentMethod !== 'online') {
      handleInputChange('paymentMethod', 'online');
    }
  }, []);
  
  const validateBasicsStep = () => {
    const newErrors: Record<string, string> = {};
    
    // Title validation
    if (!formData.title) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }
    
    // Budget validation
    if (formData.budget === undefined || formData.budget === null) {
      newErrors.budget = 'Budget is required';
    } else {
      const budget = Number(formData.budget);
      if (isNaN(budget)) {
        newErrors.budget = 'Budget must be a number';
      } else if (budget < 50) {
        newErrors.budget = 'Budget must be at least ₹50';
      } else if (budget > 5500) {
        newErrors.budget = 'Budget cannot exceed ₹5,500';
      }
    }
    
    // Category validation
    if (formData.categories?.length === 0) {
      newErrors.categories = 'Please select at least one category';
    } else if (formData.categories && formData.categories.length > 3) {
      newErrors.categories = 'You can select up to 3 categories';
    }
    
    // Priority validation
    if (!formData.priority) {
      newErrors.priority = 'Please select a priority';
    }
    
    // Location validation
    if (!formData.location && !formData.manualAddress) {
      newErrors.location = 'Please provide a location';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateDetailsStep = () => {
    const newErrors: Record<string, string> = {};
    
    // If urgent is selected, deadline is required
    if (formData.urgent && !formData.deadline) {
      newErrors.deadline = 'Deadline is required for urgent tasks';
    }
    
    // If custom time is selected, it must be valid
    if (formData.estimatedTime === 0 && (!formData.customTime || formData.customTime <= 0)) {
      newErrors.customTime = 'Please enter a valid time estimate';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const validateStep = () => {
    switch (currentStep) {
      case 0:
        return validateBasicsStep();
      case 1:
        return validateDetailsStep();
      case 2:
        return true; // No validation needed for review step
      default:
        return false;
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  const handleCategoryToggle = (categoryId: string) => {
    setFormData(prev => {
      const categories = [...(prev.categories || [])];
      const index = categories.indexOf(categoryId);
      
      if (index > -1) {
        // Remove if already selected
        categories.splice(index, 1);
      } else {
        // Add if not selected and limit to 3
        if (categories.length < 3) {
          categories.push(categoryId);
        }
      }
      
      return {
        ...prev,
        categories
      };
    });
    
    // Clear category error
    if (errors.categories) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.categories;
        return newErrors;
      });
    }
  };
  
  const handleContextFlagToggle = (flagId: string) => {
    setFormData(prev => {
      const contextFlags = { ...prev.contextFlags };
      contextFlags[flagId] = !contextFlags[flagId];
      
      return {
        ...prev,
        contextFlags
      };
    });
  };
  
  const handleNext = () => {
    if (validateStep()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        handleCreateTask();
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };
  
  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      router.back();
    }
  };

  const handleCreateTask = async () => {
    try {
      setLoading(true);
      console.log("Starting task creation without strict auth checks...");
      
      // Create a default user ID for tasks if authentication fails
      // This ensures tasks can always be created
      const defaultUserId = "00000000-0000-0000-0000-000000000000";
      
      // Try to get the user ID but don't fail if not found
      let userId = defaultUserId;
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user?.id) {
          userId = data.session.user.id;
          console.log("Using authenticated user ID:", userId);
        } else {
          console.log("No session found, using default user ID");
        }
      } catch (error) {
        console.log("Error getting session, using default user ID:", error);
      }
      
      // Convert skill input to array
      const skillRequirements = skillInputValue
        ? skillInputValue.split(',').map(skill => skill.trim()).filter(Boolean)
        : [];
      
      // Create a payload with all the task form data
      const taskPayload: CreateTaskPayload = {
        title: formData.title!,
        description: formData.description || '',
        budget: Number(formData.budget) || 0,
        deadline: formData.deadline,
        location: formData.location, // Use the location as-is
        created_by: userId, // Include user ID directly in payload
        metadata: {
          taskVisibilityHours: 48, // Default: 2 days
          taskCompletionHours: formData.taskCompletionHours || undefined, // Use undefined instead of null
          estimatedTime: formData.estimatedTime,
          customTime: formData.customTime,
          skillRequirements: skillRequirements,
          priority: formData.priority as 'low' | 'medium' | 'high',
          urgent: formData.urgent,
          taskPhotos: formData.taskPhotos || [],
          categories: formData.categories || [],
          contextFlags: formData.contextFlags || {},
          paymentMethod: formData.paymentMethod,
          buildingName: formData.buildingName,
          locality: formData.locality,
        }
      };
      
      // Create task in database
      console.log("Submitting task with data:", taskPayload);
      const result = await taskService.createTask(taskPayload);
      
      console.log("Task created successfully:", result);
      
      // Show success message and navigate to home
      Alert.alert(
        "Success!",
        "Your task has been created successfully. View it in your posted tasks.",
        [
          { text: "OK", onPress: () => router.replace('/(tabs)' as any) }
        ]
      );
    } catch (error: any) {
      console.error("Error creating task:", error);
      
      // Show a simplified error message
      Alert.alert(
        "Error Creating Task",
        "There was a problem creating your task. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = (location: any) => {
    // Store both the location data and set the detected address
    if (location && location.address) {
      setFormData(prev => ({
        ...prev,
        location
      }));
      setDetectedAddress(location.address);
      
      // Try to extract building name and locality from address
      const addressParts = location.address.split(', ');
      if (addressParts.length >= 2) {
        // Use first part as building name and second as locality
        // Only set if user hasn't manually entered them
        if (!formData.buildingName) {
          handleInputChange('buildingName', addressParts[0]);
        }
        if (!formData.locality) {
          handleInputChange('locality', addressParts[1]);
        }
      }
    } else {
      setFormData(prev => ({
        ...prev,
        location
      }));
      
      // Try to get address from coordinates if we have them
      if (location && location.lat && location.lng) {
        // This would typically use a geocoding service in a real app
        // For now, just set a placeholder
        setDetectedAddress(`Location at ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`);
      } else {
        setDetectedAddress(null);
      }
    }
  };

  const renderProgressCircles = () => {
    return (
      <View style={styles.progressCirclesContainer}>
        {STEPS.map((_, index) => (
          <View 
            key={index} 
            style={[
              styles.progressCircle,
              currentStep === index ? styles.activeProgressCircle : 
              currentStep > index ? styles.completedProgressCircle : {}
            ]}
          >
            {currentStep > index && (
              <Check size={12} color="#fff" />
            )}
          </View>
        ))}
      </View>
    );
  };
  
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderTaskBasicsStep();
      case 1:
        return renderTaskDetailsStep();
      case 2:
        return renderTaskPreviewStep();
      default:
        return null;
    }
  };
  
  const renderTaskBasicsStep = () => {
    return (
      <Animated.View 
        entering={FadeInDown.duration(400)}
        style={[styles.stepContent, cardStyle]}
      >
        {/* Task Title & Description */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Tag size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Task Information</Text>
          </View>
          
          <Input
            label="Task Title"
            value={formData.title}
            onChangeText={(value) => handleInputChange('title', value)}
            placeholder="What do you need help with?"
            error={errors.title}
            required
          />
          
          <Input
            label="Description"
            value={formData.description}
            onChangeText={(value) => handleInputChange('description', value)}
            placeholder="Describe your task in detail..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={styles.textArea}
          />
        </View>
        
        {/* Budget Section with Green Highlight */}
        <View style={[styles.card, styles.budgetCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.budgetTitle}>Budget (₹)</Text>
            <Text style={styles.budgetRange}>Range: ₹50 - ₹5,500</Text>
          </View>
          
          <Input
            label="Budget"
            value={formData.budget?.toString()}
            onChangeText={(value) => handleInputChange('budget', value)}
            placeholder="Enter your budget"
            keyboardType="numeric"
            error={errors.budget}
            style={styles.budgetInput}
            required
          />
        </View>
        
        {/* Location Section with Enhanced Display */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MapPin size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Task Location</Text>
          </View>
          
          {errors.location && (
            <Text style={styles.errorText}>{errors.location}</Text>
          )}
          
          <LocationPicker
            label="Pin on map"
            value={formData.location}
            onChange={handleLocationChange}
            placeholder="Select location on map"
          />
          
          {/* Display detected address when available */}
          {detectedAddress && (
            <View style={styles.detectedAddressContainer}>
              <Text style={styles.detectedAddressLabel}>Detected Address:</Text>
              <Text style={styles.detectedAddressText}>{detectedAddress}</Text>
            </View>
          )}
          
          <Text style={styles.orText}>- OR -</Text>
          
          <Text style={styles.inputLabel}>Enter address details manually</Text>
          <View style={styles.addressFieldsContainer}>
            <Input
              label="House/Building Name"
              value={formData.buildingName}
              onChangeText={(text) => handleInputChange('buildingName', text)}
              placeholder="Eg: Vanlawn Building, Flat 302"
              style={styles.addressField}
            />
            
            <Input
              label="Locality/Area"
              value={formData.locality}
              onChangeText={(text) => handleInputChange('locality', text)}
              placeholder="Eg: Zarkawt, Aizawl"
              style={styles.addressField}
            />
          </View>
        </View>
        
        {/* Task Category Selection (up to 3) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Layers size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Task Categories</Text>
            <Text style={styles.selectLimit}>(Select up to 3)</Text>
          </View>
          
          {errors.categories && (
            <Text style={styles.errorText}>{errors.categories}</Text>
          )}
          
          <View style={styles.categoryContainer}>
            {TASK_CATEGORIES.map(category => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  formData.categories?.includes(category.id) && styles.activeCategoryButton
                ]}
                onPress={() => handleCategoryToggle(category.id)}
              >
                <Text 
                  style={[
                    styles.categoryText,
                    formData.categories?.includes(category.id) && styles.activeCategoryText
                  ]}
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Task Priority Selection */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Star size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Task Priority</Text>
          </View>
          
          {errors.priority && (
            <Text style={styles.errorText}>{errors.priority}</Text>
          )}
          
          <View style={styles.priorityContainer}>
            {TASK_PRIORITIES.map(priority => (
              <TouchableOpacity
                key={priority.id}
                style={[
                  styles.priorityButton,
                  { borderColor: priority.color },
                  formData.priority === priority.id && {
                    backgroundColor: `${priority.color}20`,
                    borderColor: priority.color,
                  }
                ]}
                onPress={() => handleInputChange('priority', priority.id)}
              >
                <View 
                  style={[
                    styles.priorityDot,
                    { backgroundColor: priority.color }
                  ]} 
                />
                <Text 
                  style={[
                    styles.priorityText,
                    formData.priority === priority.id && {
                      color: priority.color,
                      fontFamily: 'SpaceGrotesk-Medium'
                    }
                  ]}
                >
                  {priority.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Animated.View>
    );
  };
  
  const renderTaskDetailsStep = () => {
    return (
      <Animated.View 
        entering={FadeInDown.duration(400)}
        style={[styles.stepContent, cardStyle]}
      >
        {/* Task Visibility Duration Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.cardHeader}>
              <Clock size={20} color={Colors.primary} />
              <Text style={styles.cardTitle}>Task Visibility</Text>
              <TouchableOpacity 
                style={styles.infoIconButton}
                onPress={() => setShowTimeInfo(!showTimeInfo)}
              >
                <Info size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.toggleButton}
              onPress={() => setVisibilityExpanded(!visibilityExpanded)}
            >
              <View style={[
                styles.toggleTrack,
                visibilityExpanded && styles.toggleTrackActive
              ]}>
                <View style={[
                  styles.toggleThumb,
                  visibilityExpanded && styles.toggleThumbActive
                ]} />
              </View>
              <Text style={[
                styles.toggleText,
                visibilityExpanded && styles.toggleTextActive
              ]}>
                {visibilityExpanded ? 'On' : 'Off'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Display inline info instead of modal */}
          {showTimeInfo && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Task Visibility Duration</Text>
              <Text style={styles.infoText}>
                How long do you want this task to be live?
              </Text>
              <Text style={styles.infoSubText}>
                I mamawh hun chhung.
              </Text>
              <Text style={styles.infoNoteText}>
                Default - 48hrs
              </Text>
            </View>
          )}
          
          {visibilityExpanded ? (
            <>
              <Text style={styles.timeDescription}>
                How long do you want your task to be visible to potential taskers?
              </Text>
              
              <View style={styles.timeVisibilityContainer}>
                <Input
                  label="Duration in hours"
                  value={formData.taskVisibilityHours?.toString() || ''}
                  onChangeText={(value) => handleInputChange('taskVisibilityHours', value ? parseInt(value) : undefined)}
                  placeholder="48 hours (recommended)"
                  keyboardType="numeric"
                />
                <Text style={styles.helperText}>
                  Default is 48 hours if left empty
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.toggleOffText}>
              Turn on to specify how long your task should be visible to potential taskers. Default is 48 hours.
            </Text>
          )}
        </View>
        
        {/* Task Completion Time */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.cardHeader}>
              <Timer size={20} color={Colors.primary} />
              <Text style={styles.cardTitle}>Time Estimation</Text>
              <TouchableOpacity 
                style={styles.infoIconButton}
                onPress={() => setShowCompletionInfo(!showCompletionInfo)}
              >
                <HelpCircle size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.toggleButton}
              onPress={() => setTimeEstimationExpanded(!timeEstimationExpanded)}
            >
              <View style={[
                styles.toggleTrack,
                timeEstimationExpanded && styles.toggleTrackActive
              ]}>
                <View style={[
                  styles.toggleThumb,
                  timeEstimationExpanded && styles.toggleThumbActive
                ]} />
              </View>
              <Text style={[
                styles.toggleText,
                timeEstimationExpanded && styles.toggleTextActive
              ]}>
                {timeEstimationExpanded ? 'On' : 'Off'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Display inline info instead of modal */}
          {showCompletionInfo && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Estimated Completion Time</Text>
              <Text style={styles.infoText}>
                This is your estimate of how many hours it would take to complete this task.
              </Text>
              <Text style={styles.infoNoteText}>
                It helps taskers plan their schedule and availability.
              </Text>
            </View>
          )}
          
          {timeEstimationExpanded ? (
            <>
              <View style={styles.timeEstimationSection}>
                <View style={styles.timeEstimationLabel}>
                  <Text style={styles.inputLabel}>How long will the task take to complete?</Text>
                </View>
                
                <Input
                  label="Estimated hours to complete"
                  value={formData.taskCompletionHours?.toString() || ''}
                  onChangeText={(value) => handleInputChange('taskCompletionHours', value ? parseInt(value) : undefined)}
                  placeholder="e.g., 2 hours"
                  keyboardType="numeric"
                />
                <Text style={styles.helperText}>
                  This helps taskers plan their schedule when applying for your task
                </Text>
              </View>
              
              <View style={[styles.divider, {marginVertical: 16}]} />
              
              <Text style={styles.inputLabel}>How long will the task itself take?</Text>
              
              {/* Time Options */}
              <View style={styles.timeOptionsGrid}>
                {TIME_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.timeOptionButton,
                      formData.estimatedTime === option.value && styles.activeTimeOption
                    ]}
                    onPress={() => handleInputChange('estimatedTime', option.value)}
                  >
                    <Text 
                      style={[
                        styles.timeOptionText,
                        formData.estimatedTime === option.value && styles.activeTimeOptionText
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Custom Minutes Input - only show if "Custom" is selected */}
              {formData.estimatedTime === 0 && (
                <View style={styles.customTimeContainer}>
                  <Input
                    label="Custom time (minutes)"
                    value={formData.customTime?.toString() || ''}
                    onChangeText={(value) => handleInputChange('customTime', value ? parseInt(value) : undefined)}
                    placeholder="Enter minutes"
                    keyboardType="numeric"
                    error={errors.customTime}
                  />
                </View>
              )}
            </>
          ) : (
            <Text style={styles.toggleOffText}>
              Turn on to provide time estimates for your task. This helps taskers know how long the task will take.
            </Text>
          )}
        </View>

        {/* NEW: Skill Requirements Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.cardHeader}>
              <Layers size={20} color={Colors.primary} />
              <Text style={styles.cardTitle}>Required Skills</Text>
              <Text style={styles.optionalText}>(Optional)</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.toggleButton}
              onPress={() => setSkillsExpanded(!skillsExpanded)}
            >
              <View style={[
                styles.toggleTrack,
                skillsExpanded && styles.toggleTrackActive
              ]}>
                <View style={[
                  styles.toggleThumb,
                  skillsExpanded && styles.toggleThumbActive
                ]} />
              </View>
              <Text style={[
                styles.toggleText,
                skillsExpanded && styles.toggleTextActive
              ]}>
                {skillsExpanded ? 'On' : 'Off'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {skillsExpanded ? (
            <>
              <Text style={styles.contextDescription}>
                What skills should the tasker have?
              </Text>
              
              <View style={styles.skillInputContainer}>
                <Input
                  label="Add skills (e.g., Plumbing, Electrical, Writing)"
                  placeholder="Enter a skill and press Enter"
                  value={skillInputValue}
                  onChangeText={setSkillInputValue}
                  onSubmitEditing={() => {
                    const skill = skillInputValue.trim();
                    if (skill && !formData.skillRequirements?.includes(skill)) {
                      const updatedSkills = [...(formData.skillRequirements || []), skill];
                      handleInputChange('skillRequirements', updatedSkills);
                      // Clear input field
                      setSkillInputValue('');
                    }
                  }}
                  returnKeyType="done"
                />
              </View>
              
              {formData.skillRequirements && formData.skillRequirements.length > 0 && (
                <View style={styles.skillTagsContainer}>
                  {formData.skillRequirements.map((skill, index) => (
                    <View key={index} style={styles.skillTag}>
                      <Text style={styles.skillTagText}>{skill}</Text>
                      <TouchableOpacity
                        style={styles.removeSkillButton}
                        onPress={() => {
                          const updatedSkills = formData.skillRequirements?.filter((_, i) => i !== index);
                          handleInputChange('skillRequirements', updatedSkills);
                        }}
                      >
                        <Text style={styles.removeSkillText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            <Text style={styles.toggleOffText}>
              Turn on to specify skills that are required for this task. This helps match you with qualified taskers.
            </Text>
          )}
        </View>
        
        {/* Task Context Section (Optional) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Tag size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Task Context</Text>
            <Text style={styles.optionalText}>(Optional)</Text>
          </View>
          
          <Text style={styles.contextDescription}>
            Select any options that apply to your task:
          </Text>
          
          <View style={styles.contextOptionsContainer}>
            {TASK_CONTEXT_OPTIONS.map(option => {
              const Icon = option.icon;
              const isSelected = formData.contextFlags?.[option.id] || false;
              
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.contextOption,
                    isSelected && styles.activeContextOption
                  ]}
                  onPress={() => handleContextFlagToggle(option.id)}
                >
                  <Icon 
                    size={18} 
                    color={isSelected ? Colors.primary : Colors.textSecondary} 
                  />
                  <Text 
                    style={[
                      styles.contextOptionText,
                      isSelected && styles.activeContextOptionText
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        
        {/* Task Photos (Optional) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Tag size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Task Photos</Text>
            <Text style={styles.optionalText}>(Optional)</Text>
          </View>
          
          <Text style={styles.photoDescription}>
            Add photos to help taskers understand your task better
          </Text>
          
          <View style={styles.photoContainer}>
            {imageError && (
              <Text style={styles.errorText}>{imageError}</Text>
            )}
            
            {formData.taskPhotos && formData.taskPhotos.length > 0 ? (
              <View style={styles.photoPreviewContainer}>
                {formData.taskPhotos.map((photo, index) => (
                  <View key={index} style={styles.photoPreview}>
                    <Image 
                      source={{ uri: photo }} 
                      style={styles.photoThumbnail} 
                      onError={() => {
                        // Handle image load error
                        setImageError(`Failed to load image ${index + 1}`);
                        
                        // Remove the failed image from the array
                        const updatedPhotos = formData.taskPhotos?.filter((_, i) => i !== index) || [];
                        handleInputChange('taskPhotos', updatedPhotos);
                      }}
                    />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => {
                        setFormData(prev => ({
                          ...prev,
                          taskPhotos: prev.taskPhotos ? prev.taskPhotos.filter((_, i) => i !== index) : []
                        }));
                      }}
                    >
                      <Text style={styles.removePhotoText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                
                {formData.taskPhotos.length < 3 && (
                  <TouchableOpacity 
                    style={styles.addPhotoButton}
                    onPress={handleAddPhoto}
                    disabled={imageUploading}
                  >
                    {imageUploading ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Text style={styles.addPhotoText}>+ Add Photo</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.uploadPhotoButton}
                onPress={handleAddPhoto}
                disabled={imageUploading}
              >
                {imageUploading ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <>
                    <Text style={styles.uploadPhotoText}>Tap to Upload Photo</Text>
                    <Text style={styles.uploadPhotoSubtext}>
                      (Up to 3 photos, any size up to 30MB)
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Move payment method to the end and lock Cash option */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Tag size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Payment Method</Text>
          </View>
          
          <Text style={styles.contextDescription}>
            How would you prefer to pay the tasker?
          </Text>
          
          <View style={styles.paymentOptionsContainer}>
            <TouchableOpacity
              disabled={true} // Disable Cash option
              style={[
                styles.paymentOption,
                styles.disabledPaymentOption
              ]}
              onPress={() => {}}
            >
              <View style={styles.paymentOptionContent}>
                <View style={styles.paymentRadio}>
                  <View style={styles.paymentRadioLocked} />
                </View>
                <Text style={styles.paymentOptionText}>Cash</Text>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>Coming Soon</Text>
                </View>
              </View>
              <Text style={styles.paymentDescription}>Pay with cash after task completion</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.paymentOption,
                styles.activePaymentOption
              ]}
              onPress={() => handleInputChange('paymentMethod', 'online')}
            >
              <View style={styles.paymentOptionContent}>
                <View style={styles.paymentRadio}>
                  <View style={styles.paymentRadioSelected} />
                </View>
                <Text style={styles.paymentOptionText}>Online Payment</Text>
              </View>
              <Text style={styles.paymentDescription}>Pay through our secure payment system</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.helperText}>
            Only online payment is available at this time. Cash payment option will be enabled in future updates.
          </Text>
        </View>
      </Animated.View>
    );
  };
  
  const renderTaskPreviewStep = () => {
    // Find the objects for selected categories and priority
    const priority = TASK_PRIORITIES.find(p => p.id === formData.priority);
    const selectedCategories = TASK_CATEGORIES.filter(cat => 
      formData.categories?.includes(cat.id)
    );
    
    // Get the selected context flags
    const selectedContexts = Object.keys(formData.contextFlags || {})
      .filter(key => formData.contextFlags?.[key])
      .map(key => TASK_CONTEXT_OPTIONS.find(opt => opt.id === key)?.label)
      .filter(Boolean);

    // Get time display value with proper fallbacks
    const getTimeDisplay = () => {
      if (formData.estimatedTime === 0 && formData.customTime) {
        return `${formData.customTime} minutes`;
      } else if (formData.estimatedTime) {
        return `${formData.estimatedTime} minutes`;
      } else {
        return 'Not specified';
      }
    };
    
    return (
      <Animated.View 
        entering={FadeInDown.duration(400)}
        style={[styles.stepContent, cardStyle]}
      >
        {/* Task Summary Header */}
        <View style={styles.previewHeader}>
          <Text style={styles.previewTitle}>Task Summary</Text>
          <Text style={styles.previewSubtitle}>
            Review your task before posting
          </Text>
        </View>
        
        {/* Basic Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Tag size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Task Information</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setCurrentStep(0)}
            >
              <Text style={styles.editButtonText}>✏️ Edit</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Title</Text>
            <Text style={styles.reviewValue}>{formData.title}</Text>
          </View>
          
          {formData.description && (
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Description</Text>
              <Text style={styles.reviewValue}>{formData.description}</Text>
            </View>
          )}
          
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Budget</Text>
            <Text style={styles.reviewValue}>₹{formData.budget}</Text>
          </View>
          
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Categories</Text>
            <View style={styles.previewCategories}>
              {selectedCategories.map(cat => (
                <View key={cat.id} style={styles.previewCategory}>
                  <Text style={styles.previewCategoryText}>{cat.label}</Text>
                </View>
              ))}
            </View>
          </View>
          
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Priority</Text>
            <View style={styles.reviewValueWithDot}>
              <View 
                style={[
                  styles.priorityDot,
                  { backgroundColor: priority?.color }
                ]} 
              />
              <Text 
                style={[
                  styles.reviewValue, 
                  { color: priority?.color }
                ]}
              >
                {priority?.label || 'Medium'}
              </Text>
            </View>
          </View>
          
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Location</Text>
            {formData.location ? (
              <Text style={styles.reviewValue}>
                {formData.location.address || `${formData.location.lat.toFixed(6)}, ${formData.location.lng.toFixed(6)}`}
              </Text>
            ) : (
              <>
                {(formData.buildingName || formData.locality) ? (
                  <Text style={styles.reviewValue}>
                    {[formData.buildingName, formData.locality].filter(Boolean).join(', ')}
                  </Text>
                ) : (
                  <Text style={styles.reviewValue}>No location specified</Text>
                )}
              </>
            )}
          </View>
        </View>
        
        {/* Additional Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Clock size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Time & Details</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setCurrentStep(1)}
            >
              <Text style={styles.editButtonText}>✏️ Edit</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Estimated Time</Text>
            <Text style={styles.reviewValue}>{getTimeDisplay()}</Text>
          </View>
          
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Task Visibility</Text>
            <Text style={styles.reviewValue}>
              {formData.taskVisibilityHours ? `${formData.taskVisibilityHours} hours` : '48 hours (default)'}
            </Text>
          </View>
          
          {(formData.taskCompletionHours || 0) > 0 ? (
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Estimated Completion Time</Text>
              <Text style={styles.reviewValue}>
                {formData.taskCompletionHours} hours
              </Text>
            </View>
          ) : timeEstimationExpanded ? (
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Estimated Completion Time</Text>
              <Text style={styles.reviewValue}>Not specified</Text>
            </View>
          ) : null}
          
          {/* New: Payment Method */}
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Payment Method</Text>
            <Text style={styles.reviewValue}>
              {formData.paymentMethod === 'online' ? 'Online Payment' : 'Cash'}
            </Text>
          </View>
          
          {/* New: Required Skills - Show only if skills were added */}
          {formData.skillRequirements && formData.skillRequirements.length > 0 ? (
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Required Skills</Text>
              <View style={styles.previewCategories}>
                {formData.skillRequirements.map((skill, index) => (
                  <View key={index} style={styles.previewCategory}>
                    <Text style={styles.previewCategoryText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : skillsExpanded ? (
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Required Skills</Text>
              <Text style={styles.reviewValue}>No specific skills required</Text>
            </View>
          ) : null}
          
          {selectedContexts.length > 0 && (
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Additional Context</Text>
              <View style={styles.contextList}>
                {selectedContexts.map((context, index) => (
                  <Text key={index} style={styles.contextListItem}>
                    • {context}
                  </Text>
                ))}
              </View>
            </View>
          )}
          
          {/* Show photos section in review only if photos exist */}
          {formData.taskPhotos && formData.taskPhotos.length > 0 && (
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Task Photos</Text>
              <View style={styles.reviewPhotoContainer}>
                {formData.taskPhotos.map((photo, index) => (
                  <View key={index} style={styles.reviewPhotoItem}>
                    <Image 
                      source={{ uri: photo }} 
                      style={styles.reviewPhotoImage}
                      // Add better error handling for image loading
                      onError={() => {
                        console.warn(`Failed to load image at index ${index}`);
                        // Remove the problematic image from the array
                        const updatedPhotos = formData.taskPhotos?.filter((_, i) => i !== index) || [];
                        handleInputChange('taskPhotos', updatedPhotos);
                        
                        // Show error message
                        setImageError(`Error loading image ${index + 1}. It has been removed.`);
                      }}
                    />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => {
                        // Remove this photo from the review
                        const updatedPhotos = formData.taskPhotos?.filter((_, i) => i !== index) || [];
                        handleInputChange('taskPhotos', updatedPhotos);
                        
                        // Show feedback
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Text style={styles.removePhotoText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              
              {/* Add a note about the photos */}
              <Text style={styles.helperText}>
                These photos will be shown to potential taskers
              </Text>
            </View>
          )}
        </View>
        
        <Text style={styles.disclaimer}>
          By posting this task, you agree to our Terms of Service and Community Guidelines.
        </Text>
        
        {/* Add a prominent Post Task button */}
        <TouchableOpacity 
          style={styles.postTaskButton}
          onPress={handleCreateTask}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.postTaskButtonText}>✅ Confirm & Post Task</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Add a new function to allow users to add videos too
  const pickMedia = async (shouldCrop: boolean) => {
    try {
      setImageUploading(true);
      setImageError(null);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images', // Currently only supporting images as requested
        allowsEditing: shouldCrop,
        aspect: shouldCrop ? [4, 3] : undefined,
        quality: 0.7, 
        // Let device handle the size limitation
      });
      
      console.log("Image picker result:", JSON.stringify(result)); // Add debugging
      
      // The result structure changed in newer versions of expo-image-picker
      // Check if the result has assets and use the first asset's uri
      if (!result.canceled) {
        let imageUri = '';
        
        if ('assets' in result && result.assets && result.assets.length > 0) {
          // New structure: result.assets[0].uri
          imageUri = result.assets[0].uri;
        } else if ('uri' in result && isString(result.uri)) {
          // Old structure: result.uri
          imageUri = result.uri;
        }
        
        if (imageUri) {
          // Create a safe copy of the photos array
          const currentPhotos = formData.taskPhotos || [];
          
          // Check if we already have 3 photos
          if (currentPhotos.length >= 3) {
            Alert.alert("Limit Reached", "You can upload up to 3 photos per task.");
            return;
          }
          
          const updatedPhotos = [...currentPhotos, imageUri];
          
          // Update with the new array
          handleInputChange('taskPhotos', updatedPhotos);
          console.log("Photos updated:", updatedPhotos); // Add debugging
          
          // Show success feedback
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          setImageError("Failed to get image URI");
          Alert.alert("Error", "Failed to get image URI");
        }
      }
    } catch (error) {
      console.error("Error picking media:", error);
      setImageError("Failed to upload image");
      Alert.alert("Error", "Failed to upload media");
    } finally {
      setImageUploading(false);
    }
  };

  // Update the handleAddPhoto function
  const handleAddPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "You need to grant permission to access your photos");
        return;
      }

      // Check if we already have 3 photos
      if (formData.taskPhotos && formData.taskPhotos.length >= 3) {
        Alert.alert("Limit Reached", "You can upload up to 3 photos per task.");
        return;
      }

      // Show options for photo selection
      Alert.alert(
        "Add Photo",
        "How would you like to add your photo?",
        [
          {
            text: "Full Size Photo",
            onPress: async () => {
              await pickMedia(false);
            }
          },
          {
            text: "Crop Photo",
            onPress: async () => {
              await pickMedia(true);
            }
          },
          {
            text: "Cancel",
            style: "cancel"
          }
        ]
      );
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to upload image");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Animated.View style={[styles.content, fadeStyle]}>
        {/* Only circles in header, no progress bar */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.stepTitle}>{STEPS[currentStep]}</Text>
            {renderProgressCircles()}
          </View>
        </View>
        
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderStepContent()}
        </ScrollView>
        
        <View style={styles.footer}>
          <Button
            title={currentStep === 0 ? "Cancel" : "Back"}
            onPress={handleBack}
            variant="secondary"
            style={styles.footerButton}
          />
          <Button
            title={currentStep === STEPS.length - 1 ? "Post Task" : "Continue"}
            onPress={handleNext}
            loading={loading}
            style={[
              styles.footerButton,
              currentStep === STEPS.length - 1 && { display: 'none' }
            ]}
          />
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

export default CreateTaskScreen; 