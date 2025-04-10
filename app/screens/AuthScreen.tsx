import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Image,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as Haptics from 'expo-haptics';
import { updateUserProfile } from '../services/userService';
import { logger } from '../utils/logger';

// Create a redirect URI
const redirectUri = makeRedirectUri({
  scheme: 'chhehchhawl',
  path: 'auth/callback',
});

export default function AuthScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  
  const handleGoogleSignIn = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsGoogleLoading(true);
      
      // Request Google OAuth login
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) {
        logger.error('Google sign in error:', error);
        Alert.alert('Sign In Error', error.message);
        return;
      }
      
      if (data?.url) {
        // Open the OAuth URL in a browser
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
        
        if (result.type === 'success') {
          // Parse the deep link URL that's returned on success
          const url = result.url;
          
          // Process the URL if needed
          if (url) {
            // At this point, user has been authenticated
            // Reload the session to get the latest user data
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
              logger.error('Session retrieval error:', sessionError);
              Alert.alert('Error', 'Failed to retrieve your session. Please try again.');
              return;
            }
            
            if (sessionData?.session) {
              // Try to update the profile with Google data
              const { data: { user } } = await supabase.auth.getUser();
              
              if (user && user.user_metadata) {
                await updateUserProfile({
                  first_name: user.user_metadata.full_name?.split(' ')[0] || '',
                  last_name: user.user_metadata.full_name?.split(' ').slice(1).join(' ') || '',
                  avatar_url: user.user_metadata.avatar_url || ''
                });
              }
              
              // Navigate to the main app
              router.replace("/" as any);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Google auth error:', error);
      Alert.alert('Authentication Error', 'Failed to sign in with Google. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };
  
  const handleEmailSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      setIsEmailLoading(true);
      // Navigate to email sign in screen
      router.push("/email-signin" as any);
    } catch (error) {
      logger.error('Navigation error:', error);
      Alert.alert('Error', 'Could not open email sign in. Please try again.');
    } finally {
      setIsEmailLoading(false);
    }
  };
  
  const handleAnonymousSignIn = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsLoading(true);
      
      // Sign in anonymously
      const { data, error } = await supabase.auth.signInAnonymously();
      
      if (error) {
        logger.error('Anonymous sign in error:', error);
        Alert.alert('Sign In Error', error.message);
        return;
      }
      
      if (data?.user) {
        // Navigate to the main app
        router.replace("/" as any);
      }
    } catch (error) {
      logger.error('Anonymous auth error:', error);
      Alert.alert('Authentication Error', 'Failed to sign in as guest. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background gradient */}
      <LinearGradient
        colors={[Colors.background, '#121212']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      
      {/* Content container */}
      <View style={styles.contentContainer}>
        {/* Logo and branding */}
        <View style={styles.brandingContainer}>
          <Image 
            source={require('../../assets/images/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.appNameContainer}>
            <Text style={styles.appNameTop}>Chheh</Text>
            <Text style={styles.appNameBottom}>ChhawL</Text>
          </View>
          <Text style={styles.tagline}>Find and Offer Help, Together</Text>
        </View>
        
        {/* Auth buttons */}
        <View style={styles.authContainer}>
          <TouchableOpacity 
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={isGoogleLoading}
            activeOpacity={0.8}
            accessibilityLabel="Sign in with Google"
            accessibilityRole="button"
          >
            {isGoogleLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Image 
                  source={require('../../assets/images/google-icon.png')} 
                  style={styles.googleIcon}
                />
                <Text style={styles.googleButtonText}>Sign in with Google</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.emailButton}
            onPress={handleEmailSignIn}
            disabled={isEmailLoading}
            activeOpacity={0.8}
            accessibilityLabel="Sign in with Email"
            accessibilityRole="button"
          >
            {isEmailLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Feather name="mail" size={20} color="#FFF" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Sign in with Email</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.guestButton}
            onPress={handleAnonymousSignIn}
            disabled={isLoading}
            activeOpacity={0.8}
            accessibilityLabel="Continue as guest"
            accessibilityRole="button"
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.text} size="small" />
            ) : (
              <>
                <Ionicons name="person-outline" size={20} color={Colors.text} style={styles.buttonIcon} />
                <Text style={styles.guestButtonText}>Continue as Guest</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Footer text */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            By signing in, you agree to our{' '}
            <Text style={styles.footerLink}>Terms</Text> and{' '}
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  brandingContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  appNameContainer: {
    alignItems: 'center',
  },
  appNameTop: {
    fontSize: 32,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    lineHeight: 38,
  },
  appNameBottom: {
    fontSize: 32,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.primary,
    lineHeight: 38,
  },
  tagline: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  authContainer: {
    width: '100%',
    marginBottom: 40,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  googleButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  buttonIcon: {
    marginRight: 12,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  guestButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  footerContainer: {
    width: '100%',
    alignItems: 'center',
  },
  footerText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  footerLink: {
    color: Colors.primary,
    fontFamily: 'SpaceGrotesk-Medium',
  },
}); 