import { Tabs, usePathname } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Home, ListIcon, MessageCircle, History, User } from 'lucide-react-native';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming, 
  withSequence, 
  Easing,
  interpolateColor, 
  FadeIn 
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';

function TabBarIcon({ name, color }: { name: React.ReactNode; color: string }) {
  return (
    <View style={styles.iconContainer}>
      {name}
    </View>
  );
}

// List of valid tabs we want to show
const validTabs = ['index', 'tasks', 'chat', 'history', 'profile'];

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.tabBarBackground,
          borderTopWidth: 0,
          position: 'absolute',
          elevation: 5,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.3,
          shadowRadius: 5,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          borderTopColor: 'transparent',
          zIndex: 100,
        },
        tabBarBackground: () => (
          <BlurView 
            intensity={80} 
            tint="dark" 
            style={StyleSheet.absoluteFill}
          >
            <View 
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: `${Colors.tabBarBackground}CA` }
              ]}
            />
          </BlurView>
        ),
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarShowLabel: false,
        tabBarButton: (props) => <TabButton {...props} />,
      }}>
      {/* Home Tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabBarIcon name={<Home size={24} color={color} strokeWidth={2} />} color={color} />,
        }}
      />
      
      {/* Tasks Tab */}
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color }) => <TabBarIcon name={<ListIcon size={24} color={color} strokeWidth={2} />} color={color} />,
        }}
      />
      
      {/* Chat Tab */}
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <TabBarIcon name={<MessageCircle size={24} color={color} strokeWidth={2} />} color={color} />,
        }}
      />
      
      {/* History Tab */}
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <TabBarIcon name={<History size={24} color={color} strokeWidth={2} />} color={color} />,
        }}
      />
      
      {/* Profile Tab */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon name={<User size={24} color={color} strokeWidth={2} />} color={color} />,
        }}
      />
    </Tabs>
  );
}

function TabButton(props: any) {
  const { onPress, accessibilityState, children } = props;
  const focused = accessibilityState.selected;
  
  // Animation values
  const scale = useSharedValue(1);
  const underlineWidth = useSharedValue(0);
  const underlineOpacity = useSharedValue(0);
  
  // Separate animated styles
  const buttonScaleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }]
    };
  });
  
  // Style for underline indicator
  const underlineStyle = useAnimatedStyle(() => {
    return {
      width: withTiming(underlineWidth.value, { duration: 200 }),
      opacity: withTiming(underlineOpacity.value, { duration: 200 }),
      backgroundColor: Colors.primary
    };
  });
  
  // When focused changes, animate the underline
  useEffect(() => {
    if (focused) {
      // Expand the underline when active
      underlineWidth.value = 32;
      underlineOpacity.value = 1;
    } else {
      // Hide the underline when inactive
      underlineWidth.value = 0;
      underlineOpacity.value = 0;
    }
  }, [focused, underlineWidth, underlineOpacity]);
  
  const handlePress = () => {
    // Button press animation
    scale.value = withSequence(
      withTiming(0.9, { duration: 50, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 150, easing: Easing.inOut(Easing.quad) })
    );
    
    // Haptic feedback for tab changes
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    onPress();
  };
  
  return (
    <Pressable
      onPress={handlePress}
      style={styles.button}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
    >
      {/* Wrapper for scale animation */}
      <Animated.View style={[styles.buttonContentWrapper, buttonScaleStyle]}>
        {/* Content to be scaled */}
        <View style={styles.buttonContent}>
          {/* Icon wrapper */}
          <View style={styles.iconWrapper}>
            {children}
          </View>
          
          {/* Underline indicator */}
          <Animated.View style={[styles.underlineIndicator, underlineStyle]} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
    height: 24,
  },
  button: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContentWrapper: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconWrapper: {
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  underlineIndicator: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.primary,
    position: 'absolute',
    bottom: 6,
  },
});