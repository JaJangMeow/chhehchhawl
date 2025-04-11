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
  withRepeat,
  Easing,
  interpolate
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/app/lib/supabase';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  
  // Animation values
  const loginScale = useSharedValue(1);
  const signupScale = useSharedValue(1);
  const logoFloat = useSharedValue(0);
  const logoRotate = useSharedValue(0);
  const titleGlow = useSharedValue(0);
  
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

  // Start animations on component mount
  useEffect(() => {
    // Floating animation for logo
    logoFloat.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1, // Infinite repetition
      true // Reverse animation
    );
    
    // Subtle rotation for logo
    logoRotate.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    
    // Subtle glow effect for title
    titleGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.2, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
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
  
  // Animated style for floating logo
  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: interpolate(logoFloat.value, [0, 1], [0, -10]) },
        { rotate: `${interpolate(logoRotate.value, [0, 1], [0, 3])}deg` }
      ],
    };
  });
  
  // Animated style for glowing title
  const titleAnimatedStyle = useAnimatedStyle(() => {
    return {
      textShadowColor: Colors.primary,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: interpolate(titleGlow.value, [0, 1], [2, 5]),
      opacity: interpolate(titleGlow.value, [0.2, 1], [0.9, 1]),
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
          style={[styles.logoContainer, logoAnimatedStyle]}
          entering={FadeInDown.delay(200).duration(800).springify()}
        >
          <Image 
            source={require('../assets/images/logo.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>
        
        {/* App name */}
        <Animated.View 
          style={styles.appNameContainer}
          entering={FadeInDown.delay(300).duration(800).springify()}
        >
          <Animated.Text style={[styles.appName, titleAnimatedStyle]}>
            CHHEHCHHAWL
          </Animated.Text>
          <Text style={styles.tagline}>
            Connecting communities through local tasks,{'\n'}making daily life simpler and more meaningful
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
    marginTop: 20,
    width: '100%',
    maxHeight: 200,
    alignSelf: 'flex-end',
    position: 'relative',
    right: -20,
  },
  logoImage: {
    width: 200,
    height: 200,
    tintColor: Colors.primary,
  },
  appNameContainer: {
    alignItems: 'center',
    marginTop: -30,
  },
  appName: {
    color: '#fff',
    fontSize: 38,
    fontFamily: 'SpaceGrotesk-Bold',
    letterSpacing: 1,
    textAlign: 'center',
    width: '100%',
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
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
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