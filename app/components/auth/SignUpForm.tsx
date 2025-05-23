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
  general?: string;
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

      console.log(`Signing up with ${method}: ${method === 'email' ? email : phone}`);

      // Step 1: Sign up the user using Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: method === 'email' ? email : `${phone}@temp.com`,
        password,
        phone: method === 'phone' ? phone : undefined,
        options: {
          data: {
            signup_method: method,
            phone: method === 'phone' ? phone : null,
            first_name: method === 'email' ? email.split('@')[0] : phone,
            email_verified: method === 'email',
            phone_verified: method === 'phone',
          }
        }
      });

      if (signUpError) {
        console.error('Signup error:', signUpError.message);
        throw signUpError;
      }
      
      console.log('Signup successful, user data:', signUpData?.user?.id);
      
      // Step 2: Ensure we have a user
      if (!signUpData?.user) {
        throw new Error('Failed to create user account');
      }
      
      // Step 3: Check if profile exists, if not create it manually
      let profileExists = false;
      let retryCount = 0;
      const maxRetries = 3;

      // Try multiple times to ensure profile is created
      while (!profileExists && retryCount < maxRetries) {
        retryCount++;
        
        // Wait a moment before checking/creating profile (allow trigger to run)
        if (retryCount > 1) {
          console.log(`Retry ${retryCount} for profile creation...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', signUpData.user.id)
          .single();
        
        // If profile exists, we're good
        if (!profileError && profileData) {
          console.log('Profile exists, no need to create manually');
          profileExists = true;
          break;
        }
        
        // If profile doesn't exist after first check, create it manually
        if (!profileExists) {
          console.log(`Creating profile manually (attempt ${retryCount})...`);
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: signUpData.user.id,
              email: method === 'email' ? email : `${phone}@temp.com`,
              phone: method === 'phone' ? phone : null,
              first_name: method === 'email' ? email.split('@')[0] : phone,
              last_name: '',
              full_name: method === 'email' ? email.split('@')[0] : phone,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          
          if (insertError) {
            console.error(`Error creating profile (attempt ${retryCount}):`, insertError);
          } else {
            console.log('Profile created successfully');
            profileExists = true;
          }
        }
      }

      if (!profileExists) {
        console.warn('Failed to confirm profile creation after multiple attempts');
      }

      setSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Step 4: Navigate to user information screen after successful signup
      // Include the identifier in the params to help with form pre-filling
      router.push({
        pathname: '/user-information',
        params: { 
          userId: signUpData.user.id,
          signUpMethod: method,
          identifier: method === 'email' ? email : phone 
        }
      });
    } catch (error: any) {
      console.error('Sign up error:', error.message);
      
      // Handle specific error messages
      if (error.message.includes('already registered')) {
        setErrors({
          [method]: `This ${method} is already registered. Please log in instead.`,
          general: 'Account already exists'
        });
      } else {
        setErrors({ 
          [method]: error.message,
          general: 'Sign up failed'
        });
      }
      
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
        error={errors.terms}
      />

      {errors.general && (
        <ErrorMessage message={errors.general} />
      )}

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
