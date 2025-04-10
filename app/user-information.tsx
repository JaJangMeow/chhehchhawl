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
import { Phone } from 'lucide-react-native';

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

type ProfileData = {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string;
  city: string;
  state: string;
  updated_at: string;
  created_at?: string;
  avatar_url?: string | null;
  dob?: string | null;
  gender?: string | null;
  aadhaar?: string | null;
  upi?: string | null;
};

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
  const [profileCompleted, setProfileCompleted] = useState(false);

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
        
        console.log('Loading profile data for user:', sessionUserId);
        
        // Fetch user profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionUserId)
          .single();
          
        if (profileError) {
          if (profileError.code !== 'PGRST116') {
            console.error('Error fetching profile:', profileError);
          } else {
            console.log('Profile not found, will create one on submit');
          }
        }
        
        if (profileData) {
          console.log('Found existing profile data:', profileData);
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
          
          // Check if profile is already completed with all required fields
          if (profileData.first_name && 
              profileData.last_name && 
              profileData.address && 
              profileData.city && 
              profileData.state && 
              profileData.dob && 
              profileData.gender && 
              profileData.aadhaar) {
            setProfileCompleted(true);
          }
        } else {
          // Use route params if no profile data exists yet
          if (params.identifier) {
            if (params.signUpMethod === 'email') {
              setEmail(params.identifier as string);
              const username = (params.identifier as string).split('@')[0];
              setFirstName(username);
            } else if (params.signUpMethod === 'phone') {
              setPhone(params.identifier as string);
            }
          }
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
    if (success || profileCompleted) {
      router.replace({
        pathname: '/(tabs)',
        params: { 
          from: 'signup'
        }
      });
    }
  }, [success, profileCompleted]);

  // Handle animation completion
  const handleAnimationComplete = () => {
    // Add small delay before navigation to ensure animations complete
    if (success) {
      setTimeout(() => {
        setProfileCompleted(true);
      }, 1000);
    }
  };

  // Validate all required fields
  const validateForm = () => {
    const errors: FormErrors = {};
    
    // Validate all required fields
    if (!firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    
    if (!lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    
    if (!dob) {
      errors.dob = 'Date of birth is required';
    }
    
    if (!gender) {
      errors.gender = 'Gender is required';
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
    
    if (!aadhaar.trim() || aadhaar.length !== 12) {
      errors.aadhaar = 'Valid Aadhaar number is required (12 digits)';
    }
    
    if (upi && !validateUPI(upi)) {
      errors.upi = 'Please enter a valid UPI ID';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNavigateToMain = () => {
    if (navigating) return;
    setNavigating(true);
    
    // Provide haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Add a short delay for better UX
    setTimeout(() => {
      // Navigate to the main tab screen
      router.replace({
        pathname: '/(tabs)',
        params: { 
          from: 'signup_completed',
          welcome: 'true'
        }
      });
    }, 300);
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
      
      // Use the full first name as entered by the user, just trimmed of whitespace
      const cleanFirstName = firstName.trim();
      
      console.log('Profile data to save:', {
        id: sessionUserId,
        first_name: cleanFirstName,
        last_name: lastName,
        email: email || sessionData.session.user.email,
        address,
        city,
        state,
        dob: dob ? dob.toISOString().split('T')[0] : null,
        gender,
        aadhaar,
        upi: upi || null
      });
      
      // Check if profile exists first
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', sessionUserId)
        .single();
        
      const profileExists = !checkError && existingProfile;
      console.log('Profile exists check:', profileExists ? 'Yes' : 'No');
      
      // Create profile data to upsert
      const profileData: ProfileData = {
        id: sessionUserId, // Always use session ID
        first_name: cleanFirstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`.trim(),
        email: email || sessionData.session.user.email || '',
        phone: phone || null,
        address,
        city,
        state,
        updated_at: new Date().toISOString(),
        dob: dob ? dob.toISOString().split('T')[0] : null,
        gender,
        aadhaar,
        upi: upi || null
      };
      
      // Add created_at if creating a new profile
      if (!profileExists) {
        profileData.created_at = new Date().toISOString();
      }
      
      // Explicitly set supabase to use the current auth context
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'id'
        });
      
      if (profileError) {
        console.error('Profile save error:', profileError);
        throw new Error('Error saving profile: ' + profileError.message);
      }
      
      console.log('Profile saved successfully');
      
      // Add haptic feedback and set success state
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
    } catch (e) {
      console.error('Save profile error:', e);
      setError(e instanceof Error ? e.message : String(e));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <BackgroundImage imageUri="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop" />
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <KeyboardAwareScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Animated.Text entering={FadeInDown.duration(1000).springify()} style={styles.headerText}>
            Let us know more about you
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(100).duration(1000).springify()} style={styles.subtitleText}>
            Please fill in your information
          </Animated.Text>

          <View style={styles.formContainer}>
            {signUpMethod === 'phone' ? (
              <View style={styles.readonlyInputContainer}>
                <Text style={styles.label}>Phone</Text>
                <View style={styles.phoneDisplayContainer}>
                  <Phone size={20} color={Colors.primary} />
                  <Text style={styles.phoneValue}>{phone || ''}</Text>
                </View>
              </View>
            ) : (
              <PhoneInput
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                delay={300}
                error={formErrors.phone}
              />
            )}

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
            
            {/* Date of Birth */}
            <DatePicker
              label="Date of Birth"
              value={dob}
              onChange={setDob}
              delay={200}
              error={formErrors.dob}
            />
            
            {/* Gender */}
            <GenderDropdown
              label="Gender"
              value={gender}
              onChange={setGender}
              delay={250}
              error={formErrors.gender}
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
            
            {/* Aadhaar Number */}
            <AadhaarInput
              label="Aadhaar Number"
              value={aadhaar}
              onChangeText={setAadhaar}
              delay={400}
              error={formErrors.aadhaar}
            />
            
            {/* UPI ID */}
            <UpiInput
              label="UPI ID (Optional)"
              value={upi}
              onChangeText={setUpi}
              delay={450}
              error={formErrors.upi}
            />

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
                title="Kan Lo Lawm A Che :)"
                onPress={handleSubmit}
                isLoading={loading}
                loadingText="Saving Information..."
                success={success}
                successText="Profile Completed!"
                style={styles.submitButton}
              />
            </Animated.View>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
  },
  formContainer: {
    gap: 16,
  },
  submitButton: {
    marginTop: 24,
  },
  readonlyInputContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  phoneDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f5f5f5',
  },
  phoneValue: {
    marginLeft: 8,
    fontSize: 16,
    color: Colors.text,
  },
  buttonContainer: {
    marginTop: 32,
    marginBottom: 40,
  },
  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  welcomeButton: {
    backgroundColor: '#4C9F70',
    paddingVertical: 18,
  },
  welcomeText: {
    textAlign: 'center',
    marginTop: 12,
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
