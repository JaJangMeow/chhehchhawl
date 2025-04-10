import { View, Text, StyleSheet, Image, TouchableOpacity, Platform, Alert, Modal, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Colors } from '../constants/Colors';
import Animated, { 
  FadeIn,
  useAnimatedProps,
  FadeInRight,
  FadeOutRight,
  useAnimatedScrollHandler
} from 'react-native-reanimated';
import { ListIcon, PlusIcon, MessageCircle, ChevronDown, Bell, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { fetchUserProfile, updateUserProfile } from '@/app/services/userService';
import ActionCard from '@/app/components/home/ActionCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import WrappedAnimatedView from '@/app/components/shared/WrappedAnimatedView';
import useScrollHeaderAnimation from '../hooks/useScrollHeaderAnimation';
import useHomeCardAnimations from '../hooks/useHomeCardAnimations';
import { supabase } from '@/app/lib/supabase';
import { taskService } from '../services/taskService';
import { useFocusEffect } from 'expo-router';

// Create an optimized animated ScrollView
const AnimatedScrollView = Animated.createAnimatedComponent(Animated.ScrollView);

// Memoized components for better performance
const BackgroundPattern = React.memo(() => (
  <View style={styles.patternOverlay}>
    <View style={styles.dotPattern} />
  </View>
));

// Memoized notification badge component
const NotificationBadge = React.memo(() => (
  <View style={styles.notificationBadge} />
));

// Modal component for task stats
const StatsCard = ({ visible, onClose, loading, counts }: { 
  visible: boolean, 
  onClose: () => void, 
  loading: boolean, 
  counts: { posted: number, taken: number } 
}) => {
  if (!visible) return null;
  
  return (
    <Animated.View 
      style={styles.statsCardContainer}
      entering={FadeIn.duration(300)}
      exiting={FadeIn.duration(300)}
    >
      <View style={styles.statsCard}>
        <View style={styles.statsCardHeader}>
          <Text style={styles.statsCardTitle}>Your Tasks</Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
          >
            <X size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading stats...</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{counts.posted}</Text>
                <Text style={styles.statLabel}>Tasks Posted</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{counts.taken}</Text>
                <Text style={styles.statLabel}>Tasks Taken</Text>
              </View>
            </View>
            
            <View style={styles.earningsSection}>
              <Text style={styles.earningsTitle}>Earnings</Text>
              <Text style={styles.earningsLabelComingSoon}>Coming Soon</Text>
              <Text style={styles.earningsComingSoonText}>
                Task earnings tracking and analytics will be available in the next update.
              </Text>
            </View>
          </>
        )}
      </View>
    </Animated.View>
  );
};

export default function HomeScreen() {
  const [userName, setUserName] = useState('User');
  const [userAvatar, setUserAvatar] = useState('');
  const [isLearnMoreExpanded, setIsLearnMoreExpanded] = useState(false);
  const [isAppNameVisible, setIsAppNameVisible] = useState(false);
  const [taskStatsVisible, setTaskStatsVisible] = useState(false);
  const [taskCounts, setTaskCounts] = useState({ posted: 0, taken: 0 });
  const [taskStatsLoading, setTaskStatsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const insets = useSafeAreaInsets();
  
  // Use our custom hooks for animations
  const { scrollHandler, headerStyle } = useScrollHeaderAnimation();
  
  const { 
    // Card animation values
    findTaskScale,
    findTaskShine,
    findTaskGlow,
    postTaskScale,
    postTaskShine,
    postTaskGlow,
    chatScale,
    chatShine,
    chatGlow,
    // Animation triggers
    triggerAllCardAnimations
  } = useHomeCardAnimations();
  
  // Learn more chevron animation
  const [learnMoreRotation, setLearnMoreRotation] = useState(0);
  
  // Memoize load profile function
  const loadUserProfile = useCallback(async () => {
    try {
      console.log('Loading user profile...');
      const userProfile = await fetchUserProfile();
      console.log('User profile data:', JSON.stringify(userProfile, null, 2));
      
      // Always prioritize first_name from the profile
      if (userProfile.first_name && userProfile.first_name.trim()) {
        console.log('Setting name from first_name:', userProfile.first_name);
        setUserName(userProfile.first_name.trim());
      } else if (userProfile.full_name && userProfile.full_name.trim()) {
        // Get first word from full name as first name
        const firstName = userProfile.full_name.split(' ')[0];
        console.log('Setting name from full_name:', firstName);
        setUserName(firstName);
      } else if (userProfile.email) {
        // Last resort - derive from email
        const emailName = userProfile.email.split('@')[0];
        const formattedName = emailName
          .split(/[._-]/)
          .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join(' ');
        console.log('Setting name from email:', formattedName);
        setUserName(formattedName);
        
        // Since we had to use the email name as fallback, let's try to update the profile
        // with this name to ensure consistency in the future
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            console.log('Updating profile with derived name from email');
            updateUserProfile({
              id: user.id,
              first_name: formattedName,
              full_name: formattedName
            }).then(updatedProfile => {
              console.log('Profile updated with derived name:', updatedProfile);
            });
          }
        });
      }
      
      // Set the user avatar if available
      if (userProfile.avatar_url) {
        // Ensure the avatar URL is always fresh by adding a cache-busting param
        const cacheBuster = new Date().getTime();
        const avatarUrl = userProfile.avatar_url.includes('?') 
          ? `${userProfile.avatar_url}&cb=${cacheBuster}`
          : `${userProfile.avatar_url}?cb=${cacheBuster}`;
        setUserAvatar(avatarUrl);
      }
      
      // Store the user ID for task counting
      if (userProfile.id) {
        setUserId(userProfile.id);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setIsFirstLoad(false);
    }
  }, []);
  
  // Run a one-time sync of all user profiles to ensure data is up to date
  useEffect(() => {
    const syncUserProfiles = async () => {
      try {
        console.log('Running one-time sync of user profiles');
        const { error } = await supabase.rpc('sync_user_metadata_to_profile');
        if (error) {
          console.error('Error syncing user profiles:', error);
        } else {
          console.log('User profiles synced successfully');
        }
      } catch (error) {
        console.error('Error in profile sync:', error);
      }
    };
    
    syncUserProfiles();
  }, []);
  
  // Load user data when the component mounts
  useEffect(() => {
    loadUserProfile();
    triggerAllCardAnimations();
  }, []);
  
  // Refresh user profile whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // This will run when the screen is focused
      console.log('Screen focused, refreshing user profile');
      loadUserProfile();
      return () => {
        // This will run when the screen is unfocused
      };
    }, [loadUserProfile])
  );
  
  // Load task stats when userId changes
  useEffect(() => {
    const loadTaskCounts = async () => {
      if (userId) {
        try {
          setTaskStatsLoading(true);
          const counts = await taskService.getUserTaskCounts(userId);
          setTaskCounts(counts);
        } catch (error) {
          console.log('Error loading task counts:', error);
          // Keep the default values in state
        } finally {
          setTaskStatsLoading(false);
        }
      }
    };
    
    loadTaskCounts();
  }, [userId]);
  
  // Enhanced card press handler
  const handleCardPress = useCallback((route: string) => {
    // Provide stronger haptic feedback for a more satisfying click
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    try {
      // Add a small delay before navigation for a better animation experience
      // This allows the card animations to play before navigating away
      setTimeout(() => {
        // Navigate to the appropriate screen
        router.push(route as any);
      }, 100);
    } catch (error) {
      console.error('Navigation error:', error);
      // Show error feedback to user
      Alert.alert('Navigation Error', 'Could not navigate to the requested screen.');
    }
  }, []);

  const handleNotification = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Navigate to notifications or show notification panel
    try {
      console.log('Notification pressed');
      // TODO: Implement notification screen navigation
      Alert.alert('Notifications', 'Notification feature coming soon!');
    } catch (error) {
      console.error('Notification error:', error);
    }
  }, []);
  
  // Toggle app name visibility
  const toggleAppName = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Simple state toggle with proper error handling
    try {
      setIsAppNameVisible(prev => !prev);
    } catch (error) {
      console.error('Toggle error:', error);
    }
  }, []);
  
  // Handle learn more toggle with optimized animation
  const handleLearnMoreToggle = useCallback(() => {
    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Rotate the chevron
    setLearnMoreRotation(prev => prev === 0 ? 180 : 0);
    
    // Toggle the expanded state
    setIsLearnMoreExpanded(prev => !prev);
  }, []);
  
  // Show task stats modal
  const handleAvatarPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTaskStatsVisible(true);
    
    // Refresh stats when opening modal
    if (userId) {
      const loadTaskCounts = async () => {
        try {
          setTaskStatsLoading(true);
          const counts = await taskService.getUserTaskCounts(userId);
          setTaskCounts(counts);
        } catch (error) {
          console.log('Error loading task counts:', error);
        } finally {
          setTaskStatsLoading(false);
        }
      };
      
      loadTaskCounts();
    }
  };
  
  const navBarHeight = useMemo(() => 60 + insets.bottom, [insets.bottom]);
  
  // Optimized scroll view props
  const scrollViewProps = useAnimatedProps(() => ({}));

  // Memoized content container style for better performance
  const contentContainerStyle = useMemo(() => [
    styles.scrollContent, 
    { paddingBottom: navBarHeight + 20, paddingTop: 20 }
  ], [navBarHeight]);
  
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background gradient */}
      <LinearGradient
        colors={[Colors.background, '#121212']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      
      {/* Subtle pattern overlay */}
      <BackgroundPattern />

      {/* Stats Card */}
      <StatsCard
        visible={taskStatsVisible}
        onClose={() => setTaskStatsVisible(false)}
        loading={taskStatsLoading}
        counts={taskCounts}
      />
      
      {/* Opaque Top Bar - Enlarged */}
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <View style={styles.topBarContent}>
          {/* Left section with profile avatar */}
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={handleAvatarPress}
            accessibilityLabel="View your task statistics"
            accessibilityHint="Shows your posted and taken tasks"
          >
            {userAvatar ? (
              <Image
                source={{ uri: userAvatar }}
                style={styles.avatar}
                fadeDuration={0}
                onError={(e) => {
                  console.error('Avatar loading error:', e.nativeEvent.error);
                  // If image fails to load, fall back to default avatar
                  setUserAvatar('');
                }}
              />
            ) : (
              <Image
                source={require('../../assets/images/default-avatar.png')}
                style={styles.avatar}
                fadeDuration={0}
              />
            )}
          </TouchableOpacity>

          {/* Center section with app name */}
          <View style={styles.appNameContainer}>
            {isAppNameVisible && (
              <WrappedAnimatedView
                entering={FadeInRight.duration(300).springify()}
                exiting={FadeOutRight.duration(300)}
                style={styles.appTitleContainer}
              >
                <Text 
                  style={styles.appTitleTop}
                  onPress={toggleAppName}
                >
                  Chheh
                </Text>
                <Text 
                  style={styles.appTitleBottom}
                  onPress={toggleAppName}
                >
                  ChhawL
                </Text>
              </WrappedAnimatedView>
            )}
          </View>
          
          {/* Right section with icons */}
          <View style={styles.iconsGroup}>
            {/* Notification icon */}
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={handleNotification}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              accessibilityLabel="Notifications"
              accessibilityRole="button"
            >
              <Bell size={24} color={Colors.text} strokeWidth={2.2} />
              <NotificationBadge />
            </TouchableOpacity>
            
            {/* App Logo */}
            <TouchableOpacity 
              style={styles.logoContainer}
              onPress={toggleAppName}
              activeOpacity={0.7}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              accessibilityLabel="Toggle app name visibility"
              accessibilityRole="button"
            >
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.logo}
                resizeMode="contain"
                fadeDuration={0} // Disable fade animation for performance
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      <AnimatedScrollView
        contentContainerStyle={contentContainerStyle}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        animatedProps={scrollViewProps}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true} // Enable clipping for better performance
        overScrollMode="never" // Disable overscrolling on Android
        keyboardShouldPersistTaps="handled" // Better keyboard handling
      >
        {/* Welcome Header */}
        <WrappedAnimatedView
          entering={FadeIn.duration(500)}
          animatedStyle={headerStyle}
          style={styles.welcomeHeader}
        >
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
          <Text style={styles.subtitle}>Ready to make a difference today?</Text>
        </WrappedAnimatedView>
        
        {/* Find Tasks Card */}
        <ActionCard
          title="Find Task"
          description="Browse available tasks near you"
          icon={<ListIcon size={30} color={Colors.text} />}
          onPress={() => handleCardPress("/tasks")}
          scaleValue={findTaskScale}
          shineValue={findTaskShine}
          glowValue={findTaskGlow}
          delay={200}
        />
        
        {/* Post Task Card */}
        <ActionCard
          title="Post Task"
          description="Create a new task for helpers"
          icon={<PlusIcon size={30} color={Colors.text} />}
          onPress={() => handleCardPress("/create-task")}
          scaleValue={postTaskScale}
          shineValue={postTaskShine}
          glowValue={postTaskGlow}
          delay={300}
        />
        
        {/* Chat Card */}
        <ActionCard
          title="Chat"
          description="Message your task contacts"
          icon={<MessageCircle size={30} color={Colors.text} />}
          onPress={() => handleCardPress("/chat")}
          scaleValue={chatScale}
          shineValue={chatShine}
          glowValue={chatGlow}
          delay={400}
        />
        
        {/* Learn More Section */}
        <View style={styles.learnMoreSection}>
          <TouchableOpacity 
            style={styles.learnMoreHeader}
            onPress={handleLearnMoreToggle}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Learn more about ChhehChhawL"
            accessibilityHint="Expands to show more information about the app"
          >
            <Text style={styles.learnMoreTitle}>Learn more</Text>
            <WrappedAnimatedView
              style={[
                styles.chevronContainer,
                { transform: [{ rotate: `${learnMoreRotation}deg` }] }
              ]}
            >
              <ChevronDown size={24} color={Colors.textSecondary} />
            </WrappedAnimatedView>
          </TouchableOpacity>
          
          {isLearnMoreExpanded && (
            <View style={styles.learnMoreContent}>
              <Text style={styles.learnMoreContentText}>
                ChhehChhawL is a community platform for finding and offering help within your local area. 
                Whether you need assistance with daily tasks or want to offer your skills to others, 
                our platform connects people in need with willing helpers. Join our growing community today!
              </Text>
            </View>
          )}
        </View>
      </AnimatedScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  patternOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dotPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.04,
    backgroundColor: '#000',
    width: '100%',
    height: '100%',
  },
  // Updated top bar styles
  topBar: {
    backgroundColor: Colors.tabBarBackground,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)', 
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
    height: Platform.OS === 'ios' ? 126 : 110,
  },
  topBarContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end', 
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  // App name styles - updated to match design
  appNameContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  appTitleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  appTitleTop: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    lineHeight: 28,
  },
  appTitleBottom: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.primary,
    lineHeight: 28,
  },
  // Icons group styles
  iconsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 110,
    marginBottom: 2,
  },
  // Avatar styles
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    marginRight: 12,
    marginBottom: 0,
    backgroundColor: Colors.cardBackground,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  // Notification and logo styles
  notificationButton: {
    padding: 8,
    position: 'relative',
    backgroundColor: 'transparent',
    marginRight: 16,
    borderWidth: 0,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: Colors.tabBarBackground,
  },
  logoContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  welcomeHeader: {
    marginBottom: 30,
    paddingTop: 10,
  },
  welcomeTextContainer: {
    marginBottom: 8,
  },
  greeting: {
    fontSize: 24,
    color: Colors.text,
    fontFamily: 'SpaceGrotesk-Regular',
    marginBottom: 4,
  },
  userName: {
    fontSize: 32,
    color: Colors.primary,
    fontFamily: 'SpaceGrotesk-Bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  learnMoreSection: {
    marginVertical: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  learnMoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  learnMoreTitle: {
    color: Colors.text,
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  chevronContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  learnMoreContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  learnMoreContentText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    lineHeight: 24,
  },
  // Remove modal styles and add stats card styles
  statsCardContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 140 : 120,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 20,
  },
  statsCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  statsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsCardTitle: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  statItem: {
    alignItems: 'center',
    padding: 10,
  },
  statValue: {
    fontSize: 32,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.textSecondary,
    marginTop: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.textSecondary,
    marginTop: 10,
  },
  earningsSection: {
    marginTop: 16,
    alignItems: 'center',
    paddingTop: 16,
  },
  earningsTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginBottom: 8,
  },
  earningsLabelComingSoon: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.primary,
    marginVertical: 8,
  },
  earningsComingSoonText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 12,
  },
  earningsValue: {
    fontSize: 42,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#4CAF50', // Green color for money
    marginBottom: 16,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  activeTimeRange: {
    backgroundColor: Colors.primary,
  },
  timeRangeText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.textSecondary,
  },
  activeTimeRangeText: {
    color: Colors.text,
  },
  closeButton: {
    padding: 6,
  },
});