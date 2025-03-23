import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/app/constants/Colors';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';

// Create animated components
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface ActionButtonProps {
  title: string;
  onPress: () => void;
  isLoading?: boolean;
  loadingText?: string;
  success?: boolean;
  successText?: string;
  style?: any;
  delay?: number;
}

export default function ActionButton({ 
  title, 
  onPress, 
  isLoading = false, 
  loadingText = 'Loading...', 
  success = false,
  successText = 'Success!',
  style,
  delay = 0 
}: ActionButtonProps) {
  const buttonScale = useSharedValue(1);
  const successScale = useSharedValue(0);
  
  // Animated style for button color (no transform)
  const buttonColorStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: success ? withTiming(Colors.success, { duration: 300 }) : Colors.primary,
    };
  });
  
  // Separate animated style for button scale
  const buttonScaleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });
  
  const successIconStyle = useAnimatedStyle(() => {
    return {
      opacity: successScale.value,
    };
  });
  
  // Separate scale style for success icon
  const successScaleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: successScale.value }],
    };
  });

  // Update success animation when success state changes
  if (success) {
    successScale.value = withSpring(1, { damping: 12 });
  }
  
  const handlePress = () => {
    if (isLoading || success) return;
    
    // Button press animation
    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });
    
    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    onPress();
  };

  return (
    <Animated.View 
      entering={FadeInDown.delay(delay).duration(500)}
    >
      {/* Outer container with entry animation */}
      <View style={styles.buttonWrapper}>
        {/* Button with color animation */}
        <Animated.View style={[styles.buttonContainer, buttonColorStyle, style]}>
          {/* Touchable area with scale animation */}
          <AnimatedTouchableOpacity 
            onPress={handlePress} 
            style={[styles.button, buttonScaleStyle]} 
            disabled={isLoading || success}
          >
            {success ? (
              <Animated.View style={[styles.successContainer, successIconStyle]}>
                {/* Wrapper for scale animation */}
                <Animated.View style={successScaleStyle}>
                  <Check size={24} color={Colors.text} />
                </Animated.View>
                <Text style={styles.buttonText}>{successText}</Text>
              </Animated.View>
            ) : (
              <Text style={styles.buttonText}>
                {isLoading ? loadingText : title}
              </Text>
            )}
          </AnimatedTouchableOpacity>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  buttonWrapper: {
    width: '100%',
  },
  buttonContainer: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    overflow: 'hidden',
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.text,
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
}); 