import { useAnimatedScrollHandler, useSharedValue, WithSpringConfig, withSpring } from 'react-native-reanimated';

interface ScrollConfig {
  springConfig?: WithSpringConfig;
  enableSpringBounce?: boolean;
}

/**
 * Enhanced hook to handle scroll animations with configurable options
 * @param config Optional configuration for scroll behavior
 * @returns scroll handler and scroll position value
 */
export function useScrollAnimation(config: ScrollConfig = {}) {
  const scrollY = useSharedValue(0);
  const lastContentOffset = useSharedValue(0);
  const isScrolling = useSharedValue(false);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (config.enableSpringBounce) {
        // Add spring physics for smoother scrolling
        scrollY.value = withSpring(event.contentOffset.y, config.springConfig || {
          damping: 20,
          stiffness: 90
        });
      } else {
        scrollY.value = event.contentOffset.y;
      }
      lastContentOffset.value = event.contentOffset.y;
    },
    onBeginDrag: () => {
      isScrolling.value = true;
    },
    onEndDrag: () => {
      isScrolling.value = false;
    },
  });

  return {
    scrollHandler,
    scrollY,
    lastContentOffset,
    isScrolling,
  };
}

// Add default export to prevent Expo Router from treating this as a route
export default useScrollAnimation; 