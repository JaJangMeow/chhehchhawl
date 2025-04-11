import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import type { ExternalPathString } from 'expo-router';
import { Colors } from '@/app/constants/Colors';
import { ArrowRight } from 'lucide-react-native';
import Animated, { 
  FadeIn, 
  FadeInDown, 
  FadeInUp, 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/app/lib/supabase';
import Logo from '@/app/components/shared/Logo';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  
  // Animation values for button interactions
  const loginScale = useSharedValue(1);
  const signupScale = useSharedValue(1);
  
  // Check for existing session and redirect if needed
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session check error:', error);
          return;
        }
        
        if (data.session) {
          console.log('Existing session found, redirecting to app');
          router.replace('(tabs)' as any);
        }
      } catch (e) {
        console.error('Session check failed:', e);
      }
    };
    
    checkSession();
  }, []);

  // Animated styles for buttons
  const loginAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: loginScale.value }],
    };
  });

  const signupAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: signupScale.value }],
    };
  });

  // Button press animations with haptic feedback
  const handleLoginPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Scale animation
    loginScale.value = withSequence(
      withTiming(0.95, { duration: 150, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      withTiming(1, { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
    );
  };

  const handleSignupPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Scale animation
    signupScale.value = withSequence(
      withTiming(0.95, { duration: 150, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      withTiming(1, { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.content}>
        {/* Logo */}
        <Animated.View 
          style={styles.logoContainer}
          entering={FadeInDown.delay(200).duration(800).springify()}
        >
          <Logo size="large" />
        </Animated.View>
        
        {/* App name */}
        <Animated.View 
          style={styles.appNameContainer}
          entering={FadeInDown.delay(300).duration(800).springify()}
        >
          <Text style={styles.appName}>CHHEHCHHAWL</Text>
          <Text style={styles.tagline}>
            Feel less stressed and more mindful{'\n'}with local service
          </Text>
        </Animated.View>

        {/* Action buttons */}
        <Animated.View 
          style={styles.actions}
          entering={FadeInUp.delay(500).duration(800).springify()}
        >
          <Link href={'login' as ExternalPathString} asChild>
            <TouchableOpacity 
              onPress={handleLoginPress}
              style={styles.loginButton}
              activeOpacity={0.8}
            >
              <Animated.View style={[styles.buttonContent, loginAnimatedStyle]}>
                <Text style={styles.loginText}>login</Text>
                <ArrowRight size={20} color="#fff" />
              </Animated.View>
            </TouchableOpacity>
          </Link>

          <Animated.View 
            style={styles.signupContainer}
            entering={FadeInUp.delay(600).duration(800)}
          >
            <Text style={styles.noAccountText}>Don't have an account? </Text>
            <Link href={'signup' as ExternalPathString} asChild>
              <TouchableOpacity onPress={handleSignupPress}>
                <Animated.Text style={[styles.signupText, signupAnimatedStyle]}>
                  Sign up
                </Animated.Text>
              </TouchableOpacity>
            </Link>
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  appNameContainer: {
    alignItems: 'center',
    marginTop: -60,
  },
  appName: {
    color: '#fff',
    fontSize: 48,
    fontFamily: 'SpaceGrotesk-Bold',
    letterSpacing: 2,
    textAlign: 'center',
  },
  tagline: {
    color: '#A0A0A0',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
    marginTop: 'auto',
  },
  loginButton: {
    width: '100%',
    height: 56,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: '100%',
  },
  loginText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  noAccountText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  signupText: {
    color: Colors.primary,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
  },
});