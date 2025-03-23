import { View, StyleSheet, Text, SafeAreaView, Platform, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, runOnJS } from 'react-native-reanimated';

// Import components
import { FormInput, PhoneInput, UpiInput, ErrorMessage } from '@/app/components/auth/FormInputs';
import { AuthHeader, BackButton } from '@/app/components/auth/AuthBasicComponents';
import DatePicker from '@/app/components/auth/DatePicker';
import GenderDropdown from '@/app/components/auth/GenderDropdown';
import AadhaarInput from '@/app/components/auth/AadhaarInput';
import AddressInput from '@/app/components/auth/AddressInput';
import ActionButton from '@/app/components/auth/ActionButton';
import BackgroundImage from '@/app/components/auth/BackgroundImage';
import { Colors } from '@/app/constants/Colors';

// Import services
import { supabase } from '@/app/lib/supabase';
import { validateIndianPhone, validateUPI } from '@/app/utils/validation';

type Gender = 'Male' | 'Female' | null;

type FormErrors = {
  firstName?: string;
  lastName?: string;
  dob?: string;
  gender?: string;
  phone?: string;
  address?: string;
  state?: string;
  city?: string;
  aadhaar?: string;
  upi?: string;
}

export default function UserInformationScreen() {
  const params = useLocalSearchParams();
  const [userId, setUserId] = useState<string>(params.userId as string || '');
  const [signUpMethod, setSignUpMethod] = useState<string>(params.signUpMethod as string || 'email');
  const [identifier, setIdentifier] = useState<string>(params.identifier as string || '');
  
  // Basic information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [gender, setGender] = useState<Gender>(null);
  
  // Contact information
  const [phone, setPhone] = useState(signUpMethod === 'phone' ? identifier : '');
  const [email, setEmail] = useState(signUpMethod === 'email' ? identifier : '');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  
  // Verification details
  const [aadhaar, setAadhaar] = useState('');
  const [upi, setUpi] = useState('');
  
  // Form state
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [navigating, setNavigating] = useState(false);

  // Check if user is authenticated and load existing profile data
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setInitialLoading(true);
        // Get current session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          router.replace('/login');
          return;
        }
        
        if (!data.session || !data.session.user) {
          console.log('No active session found, redirecting to login');
          router.replace('/login');
          return;
        }
        
        // Always use the session user ID
        const sessionUserId = data.session.user.id;
        setUserId(sessionUserId);
        
        // Fetch user profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionUserId)
          .single();
          
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileError);
        }
        
        if (profileData) {
          // Populate form fields with existing data
          setFirstName(profileData.first_name || '');
          setLastName(profileData.last_name || '');
          setAddress(profileData.address || '');
          setCity(profileData.city || '');
          setState(profileData.state || '');
          
          // Set read-only fields
          setEmail(profileData.email || data.session.user.email || '');
          setPhone(profileData.phone || '');
          if (profileData.dob) {
            setDob(new Date(profileData.dob));
          }
          setGender(profileData.gender as Gender || null);
          setAadhaar(profileData.aadhaar || '');
          setUpi(profileData.upi || '');
        }
        
        console.log('Profile data loaded successfully');
      } catch (e) {
        console.error('Profile load error:', e);
        setError('Failed to load profile data: ' + (e instanceof Error ? e.message : String(e)));
      } finally {
        setInitialLoading(false);
      }
    };
    
    loadUserProfile();
  }, []);

  // Navigate to tabs after success animation completes
  const navigateToTabs = useCallback(() => {
    if (success) {
      router.replace({
        pathname: '/(tabs)',
        params: { 
          from: 'signup'
        }
      });
    }
  }, [success]);

  // Handle animation completion
  const handleAnimationComplete = () => {
    // Add small delay before navigation to ensure animations complete
    if (success) {
      setTimeout(navigateToTabs, 1000);
    }
  };

  // Validate only name and address fields
  const validateForm = () => {
    const errors: FormErrors = {};
    
    // Only validate name and address fields
    if (!firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    
    if (!lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    
    if (!address.trim()) {
      errors.address = 'Address is required';
    }
    
    if (!city.trim()) {
      errors.city = 'City is required';
    }
    
    if (!state.trim()) {
      errors.state = 'State is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNavigateToMain = () => {
    if (navigating) return;
    setNavigating(true);
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/(tabs)');
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get current authenticated user's session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Session error: ' + sessionError.message);
      }
      
      if (!sessionData.session || !sessionData.session.user) {
        console.error('No active session found');
        throw new Error('No active session found. Please log in again.');
      }
      
      // Always use the current session user's ID
      const sessionUserId = sessionData.session.user.id;
      
      // Ensure first_name is only the actual first name (no spaces or additional names)
      const cleanFirstName = firstName.trim().split(' ')[0];
      
      console.log('Profile data to save:', {
        id: sessionUserId,
        first_name: cleanFirstName,
        last_name: lastName,
        email: email || sessionData.session.user.email,
        address,
        city,
        state
      });
      
      // Explicitly set supabase to use the current auth context
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: sessionUserId, // Always use session ID
          first_name: cleanFirstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`,
          email: email || sessionData.session.user.email,
          address,
          city,
          state,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });
      
      if (profileError) {
        console.error('Profile save error:', profileError);
        throw new Error('Failed to save profile: ' + profileError.message);
      }
      
      // Show success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
      console.log('Profile saved successfully');
      
      // Navigation will be handled by animation completion callback
    } catch (error: any) {
      console.error('Profile save error:', error);
      setError(error.message || 'An error occurred while saving your information');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Background image */}
      <BackgroundImage imageUri="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop" />
      
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid={true}
        enableResetScrollToCoords={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Stack.Screen
          options={{
            headerShown: false,
            animation: 'fade',
            animationDuration: 200,
            gestureEnabled: false,
          }}
        />
        
        <View style={styles.header}>
          <Animated.Text 
            style={styles.title}
            entering={FadeIn.duration(800)}
          >
            Edit Profile
          </Animated.Text>
          <Animated.Text 
            style={styles.subtitle}
            entering={FadeIn.delay(300).duration(800)}
          >
            You can only change your name and address
          </Animated.Text>
        </View>
        
        {initialLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading your profile...</Text>
          </View>
        ) : (
          <View style={styles.formContainer}>
            {/* First Name */}
            <FormInput
              label="First Name"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Your first name"
              icon="user"
              autoCapitalize="words"
              delay={100}
              error={formErrors.firstName}
            />

            {/* Last Name */}
            <FormInput
              label="Last Name"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Your last name"
              icon="user"
              autoCapitalize="words"
              delay={150}
              error={formErrors.lastName}
            />

            {/* Address with autocomplete */}
            <AddressInput
              label="Address"
              value={address}
              onChangeAddress={setAddress}
              onChangeCity={setCity}
              onChangeState={setState}
              delay={350}
              error={formErrors.address}
            />

            {/* State */}
            <FormInput
              label="State"
              value={state}
              onChangeText={setState}
              placeholder="Your state"
              icon="map-pin"
              autoCapitalize="words"
              delay={365}
              error={formErrors.state}
            />

            {/* City */}
            <FormInput
              label="City"
              value={city}
              onChangeText={setCity}
              placeholder="Your city"
              icon="map-pin"
              autoCapitalize="words"
              delay={375}
              error={formErrors.city}
            />

            {/* Read-only information label */}
            <View style={styles.infoMessage}>
              <Text style={styles.infoText}>
                Other profile information can only be updated by contacting support.
              </Text>
            </View>

            {/* General Error Message */}
            {error ? (
              <Animated.View entering={FadeInDown.duration(400)}>
                <ErrorMessage message={error} />
              </Animated.View>
            ) : null}

            {/* Submit Button */}
            <Animated.View
              entering={FadeInDown.delay(500).duration(600)}
              style={styles.buttonContainer}
              onLayout={handleAnimationComplete}
            >
              <ActionButton
                title="Save Changes"
                onPress={handleSubmit}
                isLoading={loading}
                loadingText="Saving Information..."
                success={success}
                successText="Profile Updated!"
              />
            </Animated.View>
          </View>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 50,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
  },
  formContainer: {
    padding: 24,
  },
  buttonContainer: {
    marginTop: 32,
    marginBottom: 40,
  },
  welcomeButtonContainer: {
    marginTop: 24,
    marginBottom: 40,
  },
  welcomeButton: {
    backgroundColor: '#4C9F70', // A different color for variety
  },
  welcomeText: {
    textAlign: 'center',
    marginTop: 8,
    color: Colors.textSecondary,
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 14,
  },
  infoMessage: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
    marginTop: 12,
  },
}); 
