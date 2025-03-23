import { useCallback } from 'react';
import { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation
} from 'react-native-reanimated';

/**
 * Custom hook for handling scroll-based header animations
 * Separates scroll animation logic from the component
 */
export const useScrollHeaderAnimation = () => {
  // Scroll position tracking
  const scrollY = useSharedValue(0);
  
  // Scroll handler - optimized to capture scroll position
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  
  // Header animation style based on scroll position
  const headerStyle = useAnimatedStyle(() => {
    // Fade out slightly and move up as user scrolls
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
  
  return {
    scrollY,
    scrollHandler,
    headerStyle
  };
};

export default useScrollHeaderAnimation; 