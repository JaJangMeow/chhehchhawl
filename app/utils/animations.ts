import { Easing, WithSpringConfig, WithTimingConfig } from 'react-native-reanimated';

// Common easing functions
export const FAST_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);
export const SHINE_EASING = Easing.in(Easing.ease);
export const BOUNCE_EASING = Easing.bezier(0.68, -0.6, 0.32, 1.6);

// Common spring configurations
export const SPRING_CONFIG: WithSpringConfig = {
  damping: 20,
  stiffness: 90,
  mass: 1,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 2,
};

// Common timing configurations
export const TIMING_CONFIG: WithTimingConfig = {
  duration: 300,
  easing: FAST_EASING,
};

// Animation durations
export const DURATIONS = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 800,
};

// Animation delays
export const DELAYS = {
  NONE: 0,
  SHORT: 100,
  MEDIUM: 200,
  LONG: 400,
  VERY_LONG: 600,
};

// Common animation presets
export const ANIMATION_PRESETS = {
  BUTTON_PRESS: {
    scale: 0.95,
    duration: DURATIONS.FAST,
  },
  CARD_PRESS: {
    scale: 0.98,
    duration: DURATIONS.FAST,
  },
  FADE_IN: {
    opacity: [0, 1],
    duration: DURATIONS.NORMAL,
  },
  SLIDE_UP: {
    translateY: [50, 0],
    duration: DURATIONS.NORMAL,
  },
} as const;

export default {
  FAST_EASING,
  SHINE_EASING,
  BOUNCE_EASING,
  SPRING_CONFIG,
  TIMING_CONFIG,
  DURATIONS,
  DELAYS,
  ANIMATION_PRESETS,
}; 