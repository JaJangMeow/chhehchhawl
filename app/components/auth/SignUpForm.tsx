import { View, StyleSheet } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/app/lib/supabase';
import { Colors } from '@/app/constants/Colors';
import { FormInput, PhoneInput, ErrorMessage } from '@/app/components/auth/FormInputs';
import SignUpMethodToggle from './SignUpMethodToggle';
import TermsCheckbox from './TermsCheckbox';
import ActionButton from './ActionButton';
import { validateEmail, validatePassword, validateIndianPhone } from '@/app/utils/validation';
import * as Haptics from 'expo-haptics';

type SignUpMethod = 'email' | 'phone';

type FormErrors = {
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
}

export default function SignUpForm() {
  const [method, setMethod] = useState<SignUpMethod>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateForm = () => {
    const newErrors: FormErrors = {};
    let isValid = true;

    if (method === 'email') {
      if (!email) {
        newErrors.email = 'Email is required';
        isValid = false;
      } else if (!validateEmail(email)) {
        newErrors.email = 'Please enter a valid email';
        isValid = false;
      }
    } else {
      if (!phone) {
        newErrors.phone = 'Phone number is required';
        isValid = false;
      } else if (!validateIndianPhone(phone)) {
        newErrors.phone = 'Please enter a valid Indian phone number';
        isValid = false;
      }
    }

    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (!validatePassword(password)) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    if (!acceptedTerms) {
      newErrors.terms = 'You must accept the terms and conditions';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSignUp = async () => {
    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      setLoading(true);
      setErrors({});

      const { error } = await supabase.auth.signUp({
        email: method === 'email' ? email : `${phone}@temp.com`,
        password,
        phone: method === 'phone' ? phone : undefined,
      });

      if (error) throw error;

      setSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Navigate to user information screen after successful signup
      router.push('/user-information');
    } catch (error: any) {
      console.error('Sign up error:', error.message);
      setErrors({ 
        [method]: error.message 
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SignUpMethodToggle
        method={method}
        onMethodChange={setMethod}
        delay={200}
      />

      {method === 'email' ? (
        <FormInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          icon="mail"
          autoComplete="email"
          keyboardType="email-address"
          error={errors.email}
          delay={400}
        />
      ) : (
        <PhoneInput
          label="Phone Number"
          value={phone}
          onChangeText={setPhone}
          error={errors.phone}
          delay={400}
        />
      )}

      <FormInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Create a password"
        icon="lock"
        secureTextEntry
        error={errors.password}
        delay={500}
      />

      <FormInput
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Confirm your password"
        icon="lock"
        secureTextEntry
        error={errors.confirmPassword}
        delay={600}
      />

      <TermsCheckbox
        accepted={acceptedTerms}
        onToggle={setAcceptedTerms}
        delay={700}
      />

      <ActionButton
        title="Create Account"
        onPress={handleSignUp}
        isLoading={loading}
        success={success}
        delay={800}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 24,
  },
}); 
