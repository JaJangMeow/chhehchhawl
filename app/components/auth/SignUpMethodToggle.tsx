import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/app/constants/Colors';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Mail, Phone } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

type SignUpMethod = 'email' | 'phone';

interface SignUpMethodToggleProps {
  method: SignUpMethod;
  onMethodChange: (method: SignUpMethod) => void;
  delay?: number;
}

export default function SignUpMethodToggle({
  method,
  onMethodChange,
  delay = 0
}: SignUpMethodToggleProps) {
  // Animation values for the slider
  const sliderPosition = useSharedValue(method === 'email' ? 0 : 1);
  
  // Animated style for the slider
  const sliderAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: withSpring(sliderPosition.value * 120, { damping: 15 }) }],
    };
  });

  const handleMethodChange = (newMethod: SignUpMethod) => {
    if (newMethod === method) return;
    
    // Update the slider position based on the selected method
    sliderPosition.value = newMethod === 'email' ? 0 : 1;
    
    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Call the parent component's method
    onMethodChange(newMethod);
  };

  return (
    <Animated.View 
      entering={FadeIn.delay(delay).duration(500)}
      style={styles.container}
    >
      <Text style={styles.label}>Sign Up With</Text>
      
      <View style={styles.toggleContainer}>
        {/* Animated slider */}
        <Animated.View 
          style={[styles.slider, sliderAnimatedStyle]} 
        />
        
        {/* Email option */}
        <TouchableOpacity 
          style={[styles.option, styles.leftOption]}
          onPress={() => handleMethodChange('email')}
          activeOpacity={0.7}
        >
          <Mail size={20} color={method === 'email' ? Colors.text : Colors.textSecondary} />
          <Text style={[
            styles.optionText,
            method === 'email' ? styles.activeText : styles.inactiveText
          ]}>
            Email
          </Text>
        </TouchableOpacity>
        
        {/* Phone option */}
        <TouchableOpacity 
          style={[styles.option, styles.rightOption]}
          onPress={() => handleMethodChange('phone')}
          activeOpacity={0.7}
        >
          <Phone size={20} color={method === 'phone' ? Colors.text : Colors.textSecondary} />
          <Text style={[
            styles.optionText,
            method === 'phone' ? styles.activeText : styles.inactiveText
          ]}>
            Phone
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  label: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    marginBottom: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.border,
    borderRadius: 16,
    height: 56,
    position: 'relative',
    overflow: 'hidden',
  },
  slider: {
    position: 'absolute',
    width: '50%',
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 16,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    zIndex: 1,
  },
  leftOption: {
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  rightOption: {
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  optionText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  activeText: {
    color: Colors.text,
  },
  inactiveText: {
    color: Colors.textSecondary,
  },
}); 