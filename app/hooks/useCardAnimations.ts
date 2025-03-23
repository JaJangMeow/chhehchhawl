import { useCallback } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import { DURATIONS, EASINGS, animatePulse, animateShine } from '@/app/utils/animationUtils';

/**
 * Custom hook for handling card animations
 * Separates animation logic from component for better maintainability
 */
export const useCardAnimations = (cardWidth = 400) => {
  // Scale animation for card press effect
  const scale = useSharedValue(1);
  
  // Shine effect animation values
  const shine = useSharedValue(-100);
  const localShine = useSharedValue(-100);
  const localShineOpacity = useSharedValue(0);
  
  // Glow effect animation values
  const glow = useSharedValue(0);
  const clickGlow = useSharedValue(0);
  
  // Animation handlers
  const triggerShineEffect = useCallback(() => {
    shine.value = -100;
    shine.value = animateShine(cardWidth + 100, DURATIONS.EXTRA_LONG);
  }, [shine, cardWidth]);
  
  const triggerLocalShineEffect = useCallback(() => {
    localShine.value = -100;
    localShineOpacity.value = 0.9;
    
    localShine.value = animateShine(cardWidth + 100, DURATIONS.MEDIUM);
    localShineOpacity.value = animatePulse(
      0.9, 0.9, 0, 
      { duration1: DURATIONS.MEDIUM, duration2: DURATIONS.SHORT, easing: EASINGS.DEFAULT }
    );
  }, [localShine, localShineOpacity, cardWidth]);
  
  const triggerPressEffect = useCallback(() => {
    // More pronounced scale pulse
    scale.value = animatePulse(1, 0.92, 1, {
      duration1: DURATIONS.QUICK,
      duration2: DURATIONS.SHORT,
      easing: EASINGS.BOUNCE
    });
    
    // Stronger glow pulse
    clickGlow.value = animatePulse(0, 0.9, 0, 
      { duration1: DURATIONS.QUICK, duration2: DURATIONS.MEDIUM, easing: EASINGS.DEFAULT }
    );
    
    // Trigger shine effect
    triggerLocalShineEffect();
  }, [scale, clickGlow, triggerLocalShineEffect]);
  
  const triggerGlowEffect = useCallback(() => {
    // More visible glow animation
    glow.value = animatePulse(0, 0.7, 0,
      { duration1: DURATIONS.MEDIUM, duration2: DURATIONS.LONG, easing: EASINGS.BOUNCE }
    );
  }, [glow]);
  
  return {
    // Animation values
    scale,
    shine,
    glow,
    localShine,
    localShineOpacity,
    clickGlow,
    
    // Animation triggers
    triggerPressEffect,
    triggerShineEffect,
    triggerGlowEffect,
    triggerLocalShineEffect
  };
};

export default useCardAnimations; 