// FormInputs.tsx - Common form input components with path aliases
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import React, { ReactNode, useState, useEffect } from 'react';
import { Colors } from '@/app/constants/Colors';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Mail, Lock, User, AtSign, MapPin, Phone, CreditCard } from 'lucide-react-native';
import { formStyles } from '@/app/styles/forms';
import { validateIndianPhone, validateUPI } from '@/app/utils/validation';

// Base input props
interface BaseInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  error?: string;
  delay?: number;
}

// Form input with icon
interface FormInputProps extends BaseInputProps {
  icon: 'mail' | 'lock' | 'user' | 'at-sign' | 'map-pin' | ReactNode;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'email' | 'password' | 'password-new' | 'name' | 'tel' | 'username' | 'off' | undefined;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
}

export function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  secureTextEntry = false,
  autoCapitalize = 'none',
  autoComplete,
  keyboardType = 'default',
  delay = 0,
  error
}: FormInputProps) {
  const renderIcon = () => {
    if (typeof icon === 'string') {
      switch (icon) {
        case 'mail':
          return <Mail size={20} color={Colors.textSecondary} />;
        case 'lock':
          return <Lock size={20} color={Colors.textSecondary} />;
        case 'user':
          return <User size={20} color={Colors.textSecondary} />;
        case 'at-sign':
          return <AtSign size={20} color={Colors.textSecondary} />;
        case 'map-pin':
          return <MapPin size={20} color={Colors.textSecondary} />;
        default:
          return null;
      }
    }
    return icon;
  };

  return (
    <Animated.View 
      style={formStyles.container}
      entering={FadeIn.delay(delay).duration(500)}
    >
      <Text style={formStyles.label}>{label}</Text>
      <View style={[formStyles.inputContainer, error ? formStyles.errorBorder : null]}>
        {renderIcon()}
        <TextInput
          style={formStyles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.textSecondary}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          value={value}
          onChangeText={onChangeText}
        />
      </View>
      {error ? (
        <Text style={formStyles.errorText}>{error}</Text>
      ) : null}
    </Animated.View>
  );
}

// Phone input component
interface PhoneInputProps extends Omit<BaseInputProps, 'placeholder'> {}

export function PhoneInput({
  label,
  value,
  onChangeText,
  delay = 0,
  error
}: PhoneInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  
  useEffect(() => {
    let formatted = value.replace(/\D/g, '');
    if (formatted.length > 0) {
      setDisplayValue(`+91 ${formatted}`);
    } else {
      setDisplayValue(isFocused ? '+91 ' : '');
    }
  }, [value, isFocused]);

  const handleChange = (text: string) => {
    if (!text.startsWith('+91 ')) {
      text = '+91 ' + text.replace('+91 ', '');
    }
    const digits = text.replace(/\D/g, '').slice(text.startsWith('+91') ? 2 : 0);
    const trimmedDigits = digits.substring(0, 10);
    onChangeText(trimmedDigits);
  };

  return (
    <Animated.View 
      style={formStyles.container}
      entering={FadeIn.delay(delay).duration(500)}
    >
      <Text style={formStyles.label}>{label}</Text>
      <View style={[formStyles.inputContainer, error ? formStyles.errorBorder : null]}>
        <Phone size={20} color={Colors.textSecondary} />
        <TextInput
          style={formStyles.input}
          value={displayValue}
          onChangeText={handleChange}
          placeholder="+91 XXXXXXXXXX"
          placeholderTextColor={Colors.textSecondary}
          keyboardType="phone-pad"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          maxLength={14}
        />
      </View>
      {error ? (
        <Text style={formStyles.errorText}>{error}</Text>
      ) : value && !validateIndianPhone(value) ? (
        <Text style={formStyles.errorText}>Please enter a valid Indian mobile number</Text>
      ) : (
        <Text style={formStyles.helperText}>Enter a 10-digit Indian mobile number</Text>
      )}
    </Animated.View>
  );
}

// UPI input component
interface UpiInputProps extends Omit<BaseInputProps, 'placeholder'> {}

export function UpiInput({
  label,
  value,
  onChangeText,
  delay = 0,
  error
}: UpiInputProps) {
  const handleChange = (text: string) => {
    const formatted = text.toLowerCase().trim().replace(/\s/g, '');
    onChangeText(formatted);
  };

  return (
    <Animated.View 
      style={formStyles.container}
      entering={FadeIn.delay(delay).duration(500)}
    >
      <View style={formStyles.labelContainer}>
        <Text style={formStyles.label}>{label}</Text>
        <CreditCard size={16} color={Colors.textSecondary} style={formStyles.labelIcon} />
      </View>
      <View style={[formStyles.inputContainer, error ? formStyles.errorBorder : null]}>
        <CreditCard size={20} color={Colors.textSecondary} />
        <TextInput
          style={formStyles.input}
          value={value}
          onChangeText={handleChange}
          placeholder="username@upi"
          placeholderTextColor={Colors.textSecondary}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>
      {error ? (
        <Text style={formStyles.errorText}>{error}</Text>
      ) : value && !validateUPI(value) ? (
        <Text style={formStyles.errorText}>Format: username@provider (e.g. johndoe@okicici)</Text>
      ) : (
        <Text style={formStyles.helperText}>Required for payments and verifications</Text>
      )}
    </Animated.View>
  );
}

// Add ErrorMessage component export
export function ErrorMessage({ message }: { message: string }) {
  return (
    <View style={formStyles.errorContainer}>
      <Text style={formStyles.errorText}>{message}</Text>
    </View>
  );
}

// Export a default object with all components
export default {
  FormInput,
  PhoneInput,
  UpiInput,
  ErrorMessage
}; 