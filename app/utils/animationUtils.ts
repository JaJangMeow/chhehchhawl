import { withTiming, withSpring, withSequence, withDelay, Easing } from 'react-native-reanimated';

/**
 * Animation presets and utilities to maintain consistency
 * and prevent Reanimated warnings across the app
 */

// Optimized easing functions
export const EASINGS = {
  DEFAULT: Easing.bezier(0.25, 0.1, 0.25, 1),
  BOUNCE: Easing.bezier(0.175, 0.885, 0.32, 1.275),
  ELASTIC: Easing.elastic(0.5),
  SHINE: Easing.in(Easing.ease)
};

// Animation durations
export const DURATIONS = {
  QUICK: 150,
  SHORT: 300,
  MEDIUM: 500,
  LONG: 800,
  EXTRA_LONG: 1500
};

// Preset spring animations
export const SPRINGS = {
  GENTLE: {
    damping: 15,
    mass: 1,
    stiffness: 120,
    overshootClamping: false
  },
  BOUNCY: {
    damping: 12,
    mass: 1,
    stiffness: 200,
    overshootClamping: false
  },
  WOBBLY: {
    damping: 8,
    mass: 1,
    stiffness: 150,
    overshootClamping: false
  },
  STIFF: {
    damping: 20,
    mass: 1,
    stiffness: 250,
    overshootClamping: false
  }
};

// Common animation types
export const animateTiming = (toValue: number, duration = DURATIONS.MEDIUM, easing = EASINGS.DEFAULT) => {
  return withTiming(toValue, { duration, easing });
};

export const animateSpring = (toValue: number, config = SPRINGS.GENTLE) => {
  return withSpring(toValue, config);
};

export const animatePulse = (
  initialValue: number,
  pulseValue: number,
  finalValue: number,
  config = { 
    duration1: DURATIONS.SHORT, 
    duration2: DURATIONS.MEDIUM, 
    easing: EASINGS.DEFAULT 
  }
) => {
  return withSequence(
    withTiming(pulseValue, { duration: config.duration1, easing: config.easing }),
    withTiming(finalValue, { duration: config.duration2, easing: config.easing })
  );
};

export const animateShine = (width: number, duration = DURATIONS.EXTRA_LONG) => {
  return withTiming(width, { duration, easing: EASINGS.SHINE });
};

// Animation best practices documentation
export const animationGuidelines = {
  avoidWarnings: `
    To avoid Reanimated warnings:
    1. Use WrappedAnimatedView to separate layout animations from property animations
    2. Apply layout animations (FadeIn, etc.) to outer View
    3. Apply property animations (transform, opacity) to inner View
    4. Use consistent animation durations from DURATIONS object
  `,
  performanceTips: `
    For best animation performance:
    1. Use non-JS driven animations when possible
    2. Memoize animation styles with useAnimatedStyle
    3. Minimize the number of animated nodes
    4. Use translateX/Y instead of left/top for positioning
  `
};

export default {
  EASINGS,
  DURATIONS,
  SPRINGS,
  animateTiming,
  animateSpring,
  animatePulse,
  animateShine,
  animationGuidelines
}; 