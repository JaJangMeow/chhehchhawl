import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/app/constants/Colors';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface TermsCheckboxProps {
  accepted: boolean;
  onToggle: (value: boolean) => void;
  delay?: number;
}

export default function TermsCheckbox({ accepted, onToggle, delay = 0 }: TermsCheckboxProps) {
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
              checkboxAnimatedStyle
            ]}
          >
            {accepted && <Check size={16} color={Colors.text} />}
          </Animated.View>
        </View>
        <Text style={styles.termsText}>
          I accept the Terms & Conditions
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  termsText: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
  },
}); 