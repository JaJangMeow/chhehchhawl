import React, { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  AnimatableValue,
  AnimatedProps,
  AnimatedStyleProp,
  SharedValue,
  WithTimingConfig,
} from 'react-native-reanimated';

interface WrappedAnimatedViewProps {
  /**
   * Children to render inside the animated view
   */
  children: ReactNode;
  
  /**
   * Animation entry (like FadeIn, SlideIn) - applied to the wrapper
   */
  entering?: any;
  
  /**
   * Animation exit (like FadeOut, SlideOut) - applied to the wrapper
   */
  exiting?: any;
  
  /**
   * Animation styles with transforms or opacity - applied to the inner view
   */
  animatedStyle?: AnimatedStyleProp<ViewStyle>;
  
  /**
   * Static styles applied to the wrapper
   */
  wrapperStyle?: StyleProp<ViewStyle>;
  
  /**
   * Static styles applied to the inner view
   */
  style?: StyleProp<ViewStyle>;
  
  /**
   * Custom layout animation
   */
  layout?: any;
  
  /**
   * Any other props to pass to the outer Animated.View
   */
  [key: string]: any;
}

/**
 * A component that properly separates layout animations from property animations
 * to avoid warnings from React Native Reanimated
 */
export const WrappedAnimatedView = ({
  children,
  entering,
  exiting,
  animatedStyle,
  wrapperStyle,
  style,
  layout,
  ...rest
}: WrappedAnimatedViewProps) => {
  const outerProps = {
    entering,
    exiting,
    style: wrapperStyle,
    layout,
    ...rest
  };
  
  // Only apply animation props that have values
  const filteredOuterProps = Object.fromEntries(
    Object.entries(outerProps).filter(([_, v]) => v !== undefined)
  );
  
  return (
    <Animated.View {...filteredOuterProps}>
      {animatedStyle ? (
        <Animated.View style={[style, animatedStyle]}>
          {children}
        </Animated.View>
      ) : (
        <Animated.View style={style}>
          {children}
        </Animated.View>
      )}
    </Animated.View>
  );
};

export default WrappedAnimatedView; 