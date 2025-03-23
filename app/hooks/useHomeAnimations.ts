import { useCallback, useEffect, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { 
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  interpolate,
  Extrapolation,
  cancelAnimation,
  Easing,
  useAnimatedScrollHandler
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

// Performance optimized easing functions
const FAST_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);
const SHINE_EASING = Easing.in(Easing.ease);

interface UseHomeAnimationsProps {
  isLearnMoreExpanded: boolean;
  setIsLearnMoreExpanded: (value: boolean) => void;
}

const useHomeAnimations = ({ isLearnMoreExpanded, setIsLearnMoreExpanded }: UseHomeAnimationsProps) => {
  const { width } = useWindowDimensions();
  
  // *** Animation Values ***
  // Scroll position
  const scrollY = useSharedValue(0);
  
  // Card animations
  const findTaskShine = useSharedValue(-100);
  const postTaskShine = useSharedValue(-100);
  const chatShine = useSharedValue(-100);
  
  const findTaskGlow = useSharedValue(0);
  const postTaskGlow = useSharedValue(0);
  const chatGlow = useSharedValue(0);
  
  const findTaskScale = useSharedValue(1);
  const postTaskScale = useSharedValue(1);
  const chatScale = useSharedValue(1);
  
  // UI animations
  const learnMoreRotation = useSharedValue(0);
  const nameHighlight = useSharedValue(0);
  
  // *** Animated Styles ***
  // Header animation for scroll - optimized for performance
  const headerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 80],
      [1, 0.9],
      Extrapolation.CLAMP
    );
    
    const translateY = interpolate(
      scrollY.value,
      [0, 80],
      [0, -10],
      Extrapolation.CLAMP
    );
    
    return {
      opacity,
      transform: [{ translateY }],
    };
  });
  
  // Learn more animation
  const learnMoreStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${learnMoreRotation.value}deg` }],
    };
  });
  
  // *** Animation Handlers ***
  // Optimized scroll handler
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  
  // Animation function for name highlight with reduced frequency
  const pulseAnimation = useCallback(() => {
    nameHighlight.value = withSequence(
      withTiming(1, { duration: 1800, easing: FAST_EASING }),
      withTiming(0, { duration: 1800, easing: FAST_EASING }),
      withDelay(2000, withTiming(0, { duration: 100 }, () => {
        runOnJS(pulseAnimation)();
      }))
    );
  }, [nameHighlight]);
  
  // Start name highlight animation on mount
  useEffect(() => {
    // Only start the animation after a delay to allow the UI to settle
    const timer = setTimeout(() => {
      pulseAnimation();
    }, 1500);
    
    // Clean up animation on unmount
    return () => {
      clearTimeout(timer);
      cancelAnimation(nameHighlight);
    };
  }, [pulseAnimation]);
  
  // Trigger all card animations for initial display - optimized for performance
  const triggerPulseAnimation = useCallback(() => {
    // Optimized shine effect for all cards - faster animation
    const triggerCardShine = (shineValue: any, delayMs: number) => {
      shineValue.value = -100;
      shineValue.value = withDelay(delayMs, 
        withTiming(width + 100, { duration: 600, easing: SHINE_EASING })
      );
    };
    
    // Optimized glow effect for all cards - faster animation
    const triggerCardGlow = (glowValue: any, delayMs: number) => {
      glowValue.value = withDelay(delayMs,
        withSequence(
          withTiming(0.8, { duration: 150 }),
          withTiming(0, { duration: 450 })
        )
      );
    };
    
    // Trigger animations with shorter, staggered delays
    triggerCardShine(findTaskShine, 0);
    triggerCardGlow(findTaskGlow, 0);
    
    triggerCardShine(postTaskShine, 150);
    triggerCardGlow(postTaskGlow, 150);
    
    triggerCardShine(chatShine, 300);
    triggerCardGlow(chatGlow, 300);
  }, [width]);
  
  // Handle learn more toggle - optimized animation
  const handleLearnMoreToggle = useCallback(() => {
    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Rotate the chevron - using faster animation
    learnMoreRotation.value = withTiming(
      isLearnMoreExpanded ? 0 : 180,
      { duration: 200, easing: FAST_EASING }
    );
    
    // Toggle the expanded state
    setIsLearnMoreExpanded(!isLearnMoreExpanded);
  }, [isLearnMoreExpanded, setIsLearnMoreExpanded, learnMoreRotation]);
  
  return {
    scrollHandler,
    headerStyle,
    findTaskScale,
    findTaskShine,
    findTaskGlow,
    postTaskScale,
    postTaskShine,
    postTaskGlow,
    chatScale,
    chatShine,
    chatGlow,
    learnMoreStyle,
    handleLearnMoreToggle,
    triggerPulseAnimation
  };
};

export default useHomeAnimations; 