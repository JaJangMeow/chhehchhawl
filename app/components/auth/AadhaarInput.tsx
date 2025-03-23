import { View, Text, StyleSheet, TextInput } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { Colors } from '@/app/constants/Colors';
import { CreditCard } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface AadhaarInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  delay?: number;
  error?: string;
}

export default function AadhaarInput({
  label,
  value,
  onChange,
  delay = 0,
  error
}: AadhaarInputProps) {
  // Split the value into three parts
  const [part1, setPart1] = useState(value.substring(0, 4) || '');
  const [part2, setPart2] = useState(value.substring(4, 8) || '');
  const [part3, setPart3] = useState(value.substring(8, 12) || '');
  
  // Create refs for each input to allow focus management
  const input1Ref = useRef<TextInput>(null);
  const input2Ref = useRef<TextInput>(null);
  const input3Ref = useRef<TextInput>(null);

  useEffect(() => {
    // When the value changes externally, update our parts
    setPart1(value.substring(0, 4) || '');
    setPart2(value.substring(4, 8) || '');
    setPart3(value.substring(8, 12) || '');
  }, [value]);

  useEffect(() => {
    // When our parts change, update the overall value
    const combinedValue = part1 + part2 + part3;
    onChange(combinedValue);
  }, [part1, part2, part3, onChange]);

  const handlePart1Change = (text: string) => {
    // Only allow numbers
    const cleaned = text.replace(/[^0-9]/g, '');
    setPart1(cleaned);
    
    // Auto-advance to next field if this one is full
    if (cleaned.length === 4) {
      input2Ref.current?.focus();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePart2Change = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setPart2(cleaned);
    
    if (cleaned.length === 4) {
      input3Ref.current?.focus();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (cleaned.length === 0 && part1.length > 0) {
      // If backspacing on an empty field, go back to previous field
      input1Ref.current?.focus();
    }
  };

  const handlePart3Change = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setPart3(cleaned);
    
    if (cleaned.length === 0 && part2.length > 0) {
      input2Ref.current?.focus();
    } else if (cleaned.length === 4) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      input3Ref.current?.blur();
    }
  };

  return (
    <Animated.View 
      entering={FadeIn.delay(delay).duration(500)}
      style={styles.container}
    >
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        <CreditCard size={18} color={Colors.textSecondary} />
      </View>
      
      <View style={styles.inputsContainer}>
        <TextInput
          ref={input1Ref}
          style={[styles.input, error ? styles.errorBorder : null]}
          value={part1}
          onChangeText={handlePart1Change}
          maxLength={4}
          keyboardType="numeric"
          placeholder="XXXX"
          placeholderTextColor={Colors.textSecondary}
        />
        <Text style={styles.separator}>-</Text>
        <TextInput
          ref={input2Ref}
          style={[styles.input, error ? styles.errorBorder : null]}
          value={part2}
          onChangeText={handlePart2Change}
          maxLength={4}
          keyboardType="numeric"
          placeholder="XXXX"
          placeholderTextColor={Colors.textSecondary}
        />
        <Text style={styles.separator}>-</Text>
        <TextInput
          ref={input3Ref}
          style={[styles.input, error ? styles.errorBorder : null]}
          value={part3}
          onChangeText={handlePart3Change}
          maxLength={4}
          keyboardType="numeric"
          placeholder="XXXX"
          placeholderTextColor={Colors.textSecondary}
        />
      </View>
      
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  label: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  inputsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: Colors.border,
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    textAlign: 'center',
    letterSpacing: 2,
  },
  separator: {
    color: Colors.textSecondary,
    fontSize: 20,
    marginHorizontal: 8,
  },
  errorBorder: {
    borderColor: Colors.error,
    borderWidth: 1,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'SpaceGrotesk-Regular',
  },
}); 