import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { Colors } from '@/app/constants/Colors';
import { Calendar } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface DatePickerProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  minimumAge?: number;
  delay?: number;
  error?: string;
}

export default function DatePicker({
  label,
  value,
  onChange,
  minimumAge = 16,
  delay = 0,
  error
}: DatePickerProps) {
  const [show, setShow] = useState(false);
  const [dateText, setDateText] = useState('Select date');

  useEffect(() => {
    if (value) {
      const formattedDate = value.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      setDateText(formattedDate);
    } else {
      setDateText('Select date');
    }
  }, [value]);

  const showDatepicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShow(true);
  };

  const handleChange = (event: any, selectedDate?: Date) => {
    setShow(Platform.OS === 'ios');
    
    if (selectedDate) {
      // Check if the selected date meets the minimum age requirement
      const today = new Date();
      const birthDate = new Date(selectedDate);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      if (age < minimumAge) {
        // User is too young
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        // We still set the date but the parent component will handle validation
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      onChange(selectedDate);
    } else {
      setShow(false);
    }
  };

  return (
    <Animated.View 
      entering={FadeIn.delay(delay).duration(500)}
      style={styles.container}
    >
      <Text style={styles.label}>{label}</Text>
      
      <TouchableOpacity
        style={[styles.pickerButton, error ? styles.errorBorder : null]}
        onPress={showDatepicker}
      >
        <Calendar size={20} color={Colors.textSecondary} />
        <Text style={value ? styles.dateText : styles.placeholderText}>
          {dateText}
        </Text>
      </TouchableOpacity>
      
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}

      {show && (
        <DateTimePicker
          testID="dateTimePicker"
          value={value || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    color: Colors.text,
    fontSize: 16,
    marginBottom: 8,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  dateText: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  placeholderText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
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