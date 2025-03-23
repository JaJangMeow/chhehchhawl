import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, initializeAuth } from '@/app/lib/supabase';
import { Colors } from '@/app/constants/Colors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = (params?.returnTo as string) || '/(tabs)';

  // Check for existing tokens on mount and clear them if there's an invalid token
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error && (error.message?.includes('Refresh Token Not Found') || 
                     error.message?.includes('Invalid Refresh Token'))) {
          console.log('Found invalid session on login screen, clearing token storage');
          // Clear any invalid tokens
          await supabase.auth.signOut();
          await AsyncStorage.removeItem('supabase.auth.token');
        }
      } catch (e) {
        console.error('Error checking session on login screen:', e);
      }
    };
    
    checkExistingSession();
  }, []);
  
  const handleLogin = async () => {
    try {
      if (!email || !password) {
        setError('Please enter both email and password');
        return;
      }
      
      setError(null);
      setLoading(true);
      
      // Clear any existing tokens first to ensure clean login
      await AsyncStorage.removeItem('supabase.auth.token');
      console.log('Cleared existing tokens before login attempt');
      
      console.log('Attempting login with:', email);
      
      // Attempt login
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (loginError) {
        console.error('Login error:', loginError);
        setError(loginError.message || 'Failed to sign in');
        return;
      }
      
      if (!data?.session) {
        setError('No session returned after login');
        return;
      }
      
      console.log('Login successful, user ID:', data.session.user.id);
      
      // Reinitialize auth system with new token
      await initializeAuth();
      
      // Verify the session is valid
      const { data: sessionCheck, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session verification failed:', sessionError);
        setError('Failed to verify your session. Please try again.');
        return;
      }
      
      if (!sessionCheck?.session) {
        console.error('Session verification returned no session');
        setError('Session verification failed. Please try again.');
        return;
      }
      
      console.log('Session verified successfully');
      
      // Navigate to where the user came from or home
      console.log('Redirecting to:', returnTo);
      if (returnTo.startsWith('/(tabs)/chat')) {
        router.replace('/(tabs)/chat' as any);
      } else {
        router.replace('/(tabs)' as any);
      }
    } catch (err) {
      console.error('Unexpected login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = () => {
    router.push('/signup' as any);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Log in to your account</Text>
          
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={Colors.textSecondary}
              secureTextEntry
            />
          </View>
          
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Log In</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.signupButton}
            onPress={handleSignUp}
          >
            <Text style={styles.signupButtonText}>
              Don't have an account? <Text style={styles.signupLink}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  formContainer: {
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
    marginBottom: 32,
  },
  errorContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#F44336',
    fontFamily: 'SpaceGrotesk-Medium',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.text,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  signupButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  signupButtonText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
  },
  signupLink: {
    color: Colors.primary,
    fontFamily: 'SpaceGrotesk-Bold',
  }
}); 