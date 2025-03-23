import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/app/constants/Colors';
import Animated, { FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';
import { ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

// *** AuthHeader Component ***
interface AuthHeaderProps {
  title: string;
  subtitle: string;
}

export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <View style={styles.header}>
      <Animated.Text
        entering={FadeInDown.duration(800).springify()}
        style={styles.title}
      >
        {title}
      </Animated.Text>
      
      <Animated.Text
        entering={FadeInDown.delay(200).duration(800).springify()}
        style={styles.subtitle}
      >
        {subtitle}
      </Animated.Text>
    </View>
  );
}

// *** BackButton Component ***
interface BackButtonProps {
  onPress?: () => void;
}

export function BackButton({ onPress }: BackButtonProps) {
  const handlePress = () => {
    // Enhanced haptic feedback for better tactile response
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Try-catch block to handle potential navigation errors
    try {
      if (onPress) {
        onPress();
      } else {
        // Use setTimeout to ensure the haptic feedback completes
        setTimeout(() => {
          router.back();
        }, 10);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback to home navigation if back navigation fails
      router.replace('/');
    }
  };

  return (
    <Animated.View
      entering={SlideInRight.duration(400)}
    >
      <TouchableOpacity 
        onPress={handlePress} 
        style={styles.backButton}
        activeOpacity={0.7}
        // Enhanced touch handling
        delayPressIn={0}
        pressRetentionOffset={20}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      >
        <ArrowLeft size={24} color={Colors.text} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// *** ErrorMessage Component ***
interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

// *** SignInLink Component ***
export function SignInLink() {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/login');
  };

  return (
    <Animated.View 
      style={styles.signInContainer}
      entering={FadeInUp.duration(600).delay(700)}
    >
      <View style={styles.linkContainer}>
        <Text style={styles.signInText}>Already have an account?</Text>
        <TouchableOpacity onPress={handlePress}>
          <Text style={styles.linkText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// Combined styles for all components
const styles = StyleSheet.create({
  // AuthHeader styles
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  title: {
    color: Colors.text,
    fontSize: 32,
    fontFamily: 'SpaceGrotesk-Bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    textAlign: 'center',
    maxWidth: '90%',
  },

  // BackButton styles
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 1,
  },

  // ErrorMessage styles
  errorContainer: {
    backgroundColor: Colors.error,
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  errorText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
  },

  // SignInLink styles
  signInContainer: {
    marginTop: 30,
    paddingBottom: 30,
    width: '100%',
    alignItems: 'center',
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  linkText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
}); 

// Export a default object with all components
export default {
  AuthHeader,
  BackButton,
  ErrorMessage,
  SignInLink
}; 