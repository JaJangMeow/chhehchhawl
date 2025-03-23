import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../../constants/Colors';
import { Calendar, Clock } from 'lucide-react-native';

interface DateTimePickerProps {
  label: string;
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  mode?: 'date' | 'time' | 'datetime';
  required?: boolean;
  error?: string;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  mode = 'datetime',
  required,
  error,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>(mode === 'datetime' ? 'date' : mode);
  
  const togglePicker = () => {
    if (Platform.OS === 'ios') {
      setShowPicker(!showPicker);
    } else {
      setShowPicker(true);
      if (mode === 'datetime') {
        setPickerMode('date');
      }
    }
  };
  
  const handleChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    if (mode === 'datetime' && pickerMode === 'date' && selectedDate && Platform.OS === 'android') {
      // On Android, after selecting date, show time picker
      setPickerMode('time');
      setShowPicker(true);
      onChange(selectedDate);
      return;
    }
    
    if (selectedDate !== undefined) {
      // If we already have a value and we're picking time on Android
      if (value && pickerMode === 'time' && Platform.OS === 'android') {
        const newDate = new Date(value);
        newDate.setHours(selectedDate.getHours());
        newDate.setMinutes(selectedDate.getMinutes());
        onChange(newDate);
      } else {
        onChange(selectedDate);
      }
    }
  };
  
  const formatDate = (date?: Date): string => {
    if (!date) return placeholder;
    
    const options: Intl.DateTimeFormatOptions = {};
    
    if (mode === 'date' || mode === 'datetime') {
      options.year = 'numeric';
      options.month = 'short';
      options.day = 'numeric';
    }
    
    if (mode === 'time' || mode === 'datetime') {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    
    return date.toLocaleString(undefined, options);
  };
  
  const iconComponent = mode === 'time' ? (
    <Clock size={20} color={Colors.textSecondary} />
  ) : (
    <Calendar size={20} color={Colors.textSecondary} />
  );
  
  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        {required && <Text style={styles.required}>*</Text>}
      </View>
      
      <TouchableOpacity
        style={[styles.picker, error ? styles.pickerError : {}]}
        onPress={togglePicker}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.pickerText,
          !value && styles.placeholderText
        ]}>
          {formatDate(value)}
        </Text>
        {iconComponent}
      </TouchableOpacity>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      {showPicker && (
        <RNDateTimePicker
          value={value || new Date()}
          mode={pickerMode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          minimumDate={new Date()}
          themeVariant="dark"
          textColor={Colors.text}
          accentColor={Colors.primary}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.text,
  },
  required: {
    fontSize: 16,
    color: Colors.error,
    marginLeft: 4,
  },
  picker: {
    backgroundColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerError: {
    borderColor: Colors.error,
  },
  pickerText: {
    fontSize: 16,
    color: Colors.text,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  placeholderText: {
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.error,
    marginTop: 4,
  },
});

export default DateTimePicker; 