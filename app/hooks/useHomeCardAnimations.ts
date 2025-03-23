import { useCallback } from 'react';
import { useWindowDimensions } from 'react-native';
import { 
  useSharedValue,
  withTiming, 
  withSequence,
  withDelay,
  Easing
} from 'react-native-reanimated';
import { DURATIONS, EASINGS, animateShine, animatePulse } from '@/app/utils/animationUtils';

/**
 * Custom hook for managing all home screen card animations
 * Centralizes animation logic and provides consistent animations
 */
export const useHomeCardAnimations = () => {
  const { width } = useWindowDimensions();
  
  // Card shine values
  const findTaskShine = useSharedValue(-100);
  const postTaskShine = useSharedValue(-100);
  const chatShine = useSharedValue(-100);
  
  // Card glow values
  const findTaskGlow = useSharedValue(0);
  const postTaskGlow = useSharedValue(0);
  const chatGlow = useSharedValue(0);
  
  // Card scale values
  const findTaskScale = useSharedValue(1);
  const postTaskScale = useSharedValue(1);
  const chatScale = useSharedValue(1);
  
  /**
   * Triggers shine animation across all cards
   * @param staggered Whether to stagger the animations with delays
   */
  const triggerAllShineEffects = useCallback((staggered = true) => {
    // Helper function for consistent animation
    const animateCardShine = (shineValue: any, delayMs = 0) => {
      // Reset to initial position
      shineValue.value = -100;
      
      // Animate shine across card
      shineValue.value = withDelay(
        delayMs,
        animateShine(width + 100, DURATIONS.MEDIUM)
      );
    };

    if (staggered) {
      // Trigger animations with staggered delays for a sequential effect
      animateCardShine(findTaskShine, 0);
      animateCardShine(postTaskShine, 150);
      animateCardShine(chatShine, 300);
    } else {
      // Trigger all simultaneously
      animateCardShine(findTaskShine);
      animateCardShine(postTaskShine);
      animateCardShine(chatShine);
    }
  }, [width, findTaskShine, postTaskShine, chatShine]);
  
  /**
   * Triggers glow animation for all cards
   * @param staggered Whether to stagger the animations with delays
   */
  const triggerAllGlowEffects = useCallback((staggered = true) => {
    // Helper function for consistent animation
    const animateCardGlow = (glowValue: any, delayMs = 0) => {
      glowValue.value = withDelay(
        delayMs,
        animatePulse(0, 0.8, 0, { 
          duration1: DURATIONS.SHORT, 
          duration2: DURATIONS.MEDIUM, 
          easing: EASINGS.DEFAULT 
        })
      );
    };

    if (staggered) {
      // Trigger animations with staggered delays
      animateCardGlow(findTaskGlow, 0);
      animateCardGlow(postTaskGlow, 150);
      animateCardGlow(chatGlow, 300);
    } else {
      // Trigger all simultaneously
      animateCardGlow(findTaskGlow);
      animateCardGlow(postTaskGlow);
      animateCardGlow(chatGlow);
    }
  }, [findTaskGlow, postTaskGlow, chatGlow]);
  
  /**
   * Triggers pulse animation for all card scales
   */
  const triggerAllScaleEffects = useCallback(() => {
    // Subtle scale pulse for each card
    findTaskScale.value = animatePulse(1, 1.03, 1, {
      duration1: DURATIONS.SHORT,
      duration2: DURATIONS.MEDIUM,
      easing: EASINGS.BOUNCE
    });
    
    postTaskScale.value = withDelay(
      100,
      animatePulse(1, 1.03, 1, {
        duration1: DURATIONS.SHORT,
        duration2: DURATIONS.MEDIUM,
        easing: EASINGS.BOUNCE
      })
    );
    
    chatScale.value = withDelay(
      200,
      animatePulse(1, 1.03, 1, {
        duration1: DURATIONS.SHORT,
        duration2: DURATIONS.MEDIUM,
        easing: EASINGS.BOUNCE
      })
    );
  }, [findTaskScale, postTaskScale, chatScale]);
  
  /**
   * Triggers all card animations effects (shine, glow, scale)
   */
  const triggerAllCardAnimations = useCallback(() => {
    triggerAllShineEffects();
    triggerAllGlowEffects();
    triggerAllScaleEffects();
  }, [triggerAllShineEffects, triggerAllGlowEffects, triggerAllScaleEffects]);
  
  return {
    // Animation shared values
    findTaskShine,
    findTaskGlow,
    findTaskScale,
    postTaskShine,
    postTaskGlow,
    postTaskScale,
    chatShine,
    chatGlow,
    chatScale,
    
    // Animation trigger functions
    triggerAllShineEffects,
    triggerAllGlowEffects,
    triggerAllScaleEffects,
    triggerAllCardAnimations
  };
};

export default useHomeCardAnimations; 