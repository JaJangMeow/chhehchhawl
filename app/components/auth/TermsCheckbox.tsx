import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/app/constants/Colors';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface TermsCheckboxProps {
  accepted: boolean;
  onToggle: (value: boolean) => void;
  delay?: number;
  error?: string;
}

export default function TermsCheckbox({ accepted, onToggle, delay = 0, error }: TermsCheckboxProps) {
  const checkboxScale = useSharedValue(1);
  
  const checkboxAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: checkboxScale.value }],
    };
  });
  
  const handlePress = () => {
    // Animate checkbox scale
    checkboxScale.value = withSequence(
      withTiming(1.2, { duration: 150 }),
      withTiming(1, { duration: 150 })
    );
    
    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Call the toggle function with the new value
    onToggle(!accepted);
  };
  
  const highlightCheckbox = () => {
    checkboxScale.value = withSequence(
      withTiming(1.2, { duration: 200 }),
      withTiming(0.8, { duration: 200 }),
      withTiming(1.2, { duration: 200 }),
      withTiming(1, { duration: 200 })
    );
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(500)}
    >
      <TouchableOpacity
        style={styles.termsContainer}
        onPress={handlePress}
      >
        {/* Wrapper View to avoid layout animation conflicts */}
        <View style={styles.checkboxWrapper}>
          <Animated.View 
            style={[
              styles.checkbox, 
              accepted && styles.checkboxChecked,
              error && styles.checkboxError,
              checkboxAnimatedStyle
            ]}
          >
            {accepted && <Check size={16} color={Colors.text} />}
          </Animated.View>
        </View>
        <Text style={[styles.termsText, error && styles.errorText]}>
          I accept the Terms & Conditions
        </Text>
      </TouchableOpacity>
      
      {error && (
        <Text style={styles.errorMessage}>{error}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  checkboxWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxError: {
    borderColor: Colors.error,
    borderWidth: 2,
  },
  termsText: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  errorText: {
    color: Colors.error,
  },
  errorMessage: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 36,
    fontFamily: 'SpaceGrotesk-Regular',
    marginBottom: 8,
  }
}); 