import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Platform } from 'react-native';
import { Link, router } from 'expo-router';
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
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/app/lib/supabase';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  
  // Animation values for button interactions
  const loginScale = useSharedValue(1);
  const signupScale = useSharedValue(1);
  const loginGlow = useSharedValue(0);
  const signupGlow = useSharedValue(0);
  
  // Animation for floating elements
  const floatingY = useSharedValue(0);
  
  // Parallax effect for background
  const parallaxY = useSharedValue(0);

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
          router.replace('/(tabs)');
        }
      } catch (e) {
        console.error('Session check failed:', e);
      }
    };
    
    checkSession();
  }, []);

  // Start floating animation on component mount
  useEffect(() => {
    // Gentle floating animation
    const animate = () => {
      floatingY.value = withSequence(
        withTiming(10, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(-10, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      );
      
      // Loop the animation
      setTimeout(animate, 4000);
    };
    
    animate();
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
  
  // Glow effect animations
  const loginGlowStyle = useAnimatedStyle(() => {
    return {
      opacity: loginGlow.value,
    };
  });
  
  const signupGlowStyle = useAnimatedStyle(() => {
    return {
      opacity: signupGlow.value,
    };
  });
  
  // Floating animation for illustration
  const floatingStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: floatingY.value }],
    };
  });
  
  // Parallax effect for background
  const parallaxStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: interpolate(parallaxY.value, [0, 1], [0, -20]) }
      ],
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
    
    // Glow animation
    loginGlow.value = withTiming(0.5, { duration: 150 });
    loginGlow.value = withDelay(
      200,
      withTiming(0, { duration: 500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
    );
  };

  const handleSignupPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Scale animation
    signupScale.value = withSequence(
      withTiming(0.95, { duration: 150, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      withTiming(1, { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
    );
    
    // Glow animation
    signupGlow.value = withTiming(0.5, { duration: 150 });
    signupGlow.value = withDelay(
      200,
      withTiming(0, { duration: 500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Enhanced background with parallax effect */}
      <Animated.View style={[styles.backgroundContainer, parallaxStyle]}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop' }}
          style={styles.backgroundImage}
        />
      </Animated.View>
      
      {/* Gradient overlay with improved colors */}
      <LinearGradient
        colors={[
          'rgba(30, 30, 30, 0.7)',
          'rgba(20, 20, 20, 0.85)',
          'rgba(10, 10, 10, 0.95)'
        ]}
        style={styles.overlay}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      
      {/* Subtle pattern overlay */}
      <View style={styles.patternOverlay}>
        <View style={styles.dotPattern} />
      </View>
      
      {/* Main content */}
      <View style={[styles.content, { paddingBottom: insets.bottom + 16 }]}>
        {/* Logo and app name */}
        <Animated.View 
          style={[styles.logoContainer, floatingStyle]}
          entering={FadeInDown.delay(200).duration(1000).springify()}
        >
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
        
        {/* Header content */}
        <Animated.View 
          style={styles.header}
          entering={FadeInDown.delay(300).duration(800).springify()}
        >
          <Text style={styles.welcome}>Welcome to</Text>
          <View style={styles.titleContainer}>
            <Text style={styles.titleTop}>Chheh</Text>
            <Text style={styles.titleBottom}>ChhawL</Text>
          </View>
          <Text style={styles.subtitle}>
            Connect, help, and grow together
          </Text>
        </Animated.View>

        {/* Action buttons with enhanced animations */}
        <Animated.View 
          style={styles.actions}
          entering={FadeInUp.delay(600).duration(800).springify()}
        >
          <Link href="/login" asChild>
            <TouchableOpacity 
              onPress={handleLoginPress}
              style={styles.loginButton}
              activeOpacity={0.9}
            >
              {/* Glow effect */}
              <Animated.View style={[styles.buttonGlow, loginGlowStyle]} />
              
              <Animated.View style={[styles.buttonContent, loginAnimatedStyle]}>
                <Text style={styles.loginText}>Login</Text>
                <ArrowRight size={20} color={Colors.text} />
              </Animated.View>
            </TouchableOpacity>
          </Link>

          <Link href="/signup" asChild>
            <TouchableOpacity 
              onPress={handleSignupPress}
              style={styles.signupButton}
              activeOpacity={0.9}
            >
              {/* Glow effect */}
              <Animated.View style={[styles.buttonGlowOutline, signupGlowStyle]} />
              
              <Animated.View style={[styles.buttonContent, signupAnimatedStyle]}>
                <Text style={styles.signupText}>Create Account</Text>
                <ArrowRight size={20} color={Colors.primary} />
              </Animated.View>
            </TouchableOpacity>
          </Link>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backgroundContainer: {
    position: 'absolute',
    width: width + 40, // Slightly larger for parallax effect
    height: height + 40,
    left: -20,
    top: -20,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    opacity: 0.7,
  },
  overlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  patternOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.4,
  },
  dotPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.05,
    backgroundColor: 'transparent',
    backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
    backgroundSize: '20px 20px',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  logo: {
    width: 100,
    height: 100,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  welcome: {
    color: Colors.text,
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Regular',
    textAlign: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  titleTop: {
    color: Colors.text,
    fontSize: 42,
    fontFamily: 'SpaceGrotesk-Bold',
    lineHeight: 44,
  },
  titleBottom: {
    color: Colors.primary,
    fontSize: 42,
    fontFamily: 'SpaceGrotesk-Bold',
    lineHeight: 44,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Regular',
    textAlign: 'center',
    marginTop: 10,
    maxWidth: '80%',
  },
  actions: {
    gap: 16,
    marginBottom: Platform.OS === 'ios' ? 10 : 30,
    width: '100%',
  },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  signupButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    overflow: 'hidden',
    position: 'relative',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 2,
  },
  loginText: {
    color: Colors.text,
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  signupText: {
    color: Colors.primary,
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  buttonGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    backgroundColor: Colors.primary,
    opacity: 0,
    borderRadius: 20,
    zIndex: 1,
  },
  buttonGlowOutline: {
    position: 'absolute',
    left: -10,
    top: -10,
    right: -10,
    bottom: -10,
    borderColor: Colors.primary,
    borderWidth: 2,
    opacity: 0,
    borderRadius: 20,
    zIndex: 1,
  },
});