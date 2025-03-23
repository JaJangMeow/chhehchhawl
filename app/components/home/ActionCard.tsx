import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ReactNode, memo, useCallback, useEffect } from 'react';
import { Colors } from '../../constants/Colors';
import Animated, { 
  FadeInDown, 
  useAnimatedStyle,
  SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import WrappedAnimatedView from '../shared/WrappedAnimatedView';
import useCardAnimations from '@/app/hooks/useCardAnimations';

interface ActionCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  onPress: () => void;
  scaleValue: SharedValue<number>;
  shineValue: SharedValue<number>;
  glowValue: SharedValue<number>;
  delay: number;
}

// Memoized action card for performance optimization
const ActionCard = memo(({ 
  title, 
  description, 
  icon, 
  onPress, 
  scaleValue, 
  shineValue, 
  glowValue,
  delay 
}: ActionCardProps) => {
  // Use our custom hook for card animations
  const {
    localShine,
    localShineOpacity,
    clickGlow,
    scale,
    triggerPressEffect,
    triggerShineEffect,
  } = useCardAnimations();
  
  // Connect parent scale value to our local scale
  useEffect(() => {
    // Avoid directly accessing .value during render
    if (scale && scaleValue) {
      scale.value = scaleValue.value;
    }
  }, [scale, scaleValue]); 
  
  // Scale animation style
  const scaleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleValue.value }],
    };
  }, []);
  
  // Global shine animation style
  const shineStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shineValue.value }],
      opacity: 0.6, // Increased base opacity
    };
  }, []);
  
  // Local shine animation style for clicks
  const localShineStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: localShine.value }],
      opacity: localShineOpacity.value,
    };
  }, []);
  
  // Glow animation style
  const glowStyle = useAnimatedStyle(() => {
    return {
      opacity: glowValue.value,
    };
  }, []);
  
  // Click glow effect animation
  const clickGlowStyle = useAnimatedStyle(() => {
    return {
      opacity: clickGlow.value,
      transform: [{ scale: 1.05 }], // Slightly reduced scale for more natural look
    };
  }, []);

  // Handle card press with enhanced haptic feedback and animations
  const handlePress = useCallback(() => {
    // Enhanced haptic feedback for better tactile response
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Use the animation handlers from our hook
    triggerPressEffect();
    
    // Add slight delay before calling onPress to allow animations to start
    setTimeout(() => {
      // Call the provided onPress handler
      onPress();
    }, 10);
  }, [triggerPressEffect, onPress]);
  
  return (
    // Main card wrapper with layout animation (FadeInDown)
    <WrappedAnimatedView
      entering={FadeInDown.delay(delay).duration(800)}
      style={styles.cardWrapper}
    >
      {/* Use WrappedAnimatedView for scale to properly separate animations */}
      <WrappedAnimatedView
        animatedStyle={scaleStyle}
        style={styles.scaleWrapper}
      >
        <TouchableOpacity
          style={styles.card}
          onPress={handlePress}
          activeOpacity={0.95}
          // Enhanced touch handling
          delayPressIn={0}
          pressRetentionOffset={20}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          {/* Red glow effect - persistent */}
          <WrappedAnimatedView
            animatedStyle={glowStyle}
            style={styles.glowEffect}
          >
            <LinearGradient
              colors={[
                `${Colors.primary}10`, 
                `${Colors.primary}60`, 
                `${Colors.primary}10`
              ]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 1, y: 1 }}
            />
          </WrappedAnimatedView>
          
          {/* Click glow effect - triggered on click */}
          <WrappedAnimatedView
            animatedStyle={clickGlowStyle}
            style={styles.clickGlowEffect}
          >
            <LinearGradient
              colors={[
                `${Colors.primary}20`, 
                `${Colors.primary}80`, 
                `${Colors.primary}20`
              ]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 1, y: 1 }}
            />
          </WrappedAnimatedView>
          
          {/* Global shine effect - controlled by parent */}
          <WrappedAnimatedView
            animatedStyle={shineStyle}
            style={styles.shineEffect}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.shine}
            />
          </WrappedAnimatedView>
          
          {/* Local shine effect - triggered on click */}
          <WrappedAnimatedView
            animatedStyle={localShineStyle}
            style={styles.shineEffect}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.shine}
            />
          </WrappedAnimatedView>
          
          <View style={styles.cardContent}>
            <View style={styles.cardIcon}>
              {icon}
            </View>
            <View style={styles.cardTextContent}>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardDescription}>{description}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </WrappedAnimatedView>
    </WrappedAnimatedView>
  );
});

const styles = StyleSheet.create({
  cardWrapper: {
    width: '100%',
    marginBottom: 20,
  },
  scaleWrapper: {
    width: '100%',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden', // Important for effects
    position: 'relative',
  },
  glowEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  clickGlowEffect: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    zIndex: 3,
    borderRadius: 20,
  },
  shineEffect: {
    position: 'absolute',
    width: 60,
    height: '300%',
    top: -100,
    zIndex: 3,
    transform: [{ skewX: '-20deg' }],
  },
  shine: {
    width: '100%',
    height: '100%',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 4, // Ensure content is above all effects
  },
  cardIcon: {
    width: 60,
    height: 60,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginRight: 16,
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  cardTextContent: {
    flex: 1,
  },
  cardTitle: {
    color: Colors.text,
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Bold',
    marginBottom: 4,
  },
  cardDescription: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
  },
});

export default ActionCard; 