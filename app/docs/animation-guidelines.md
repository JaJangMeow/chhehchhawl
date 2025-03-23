# Animation Best Practices

This guide provides best practices for using animations in our React Native app to avoid common pitfalls and warnings.

## Table of Contents
1. [Avoiding Reanimated Warnings](#avoiding-reanimated-warnings)
2. [Using WrappedAnimatedView](#using-wrappedanimatedview)
3. [Animation Performance Tips](#animation-performance-tips)
4. [Common Animation Patterns](#common-animation-patterns)

## Avoiding Reanimated Warnings

React Native Reanimated often generates warnings like:
```
Property "opacity" of AnimatedComponent(View) may be overwritten by a layout animation. 
Please wrap your component with an animated view and apply the layout animation on the wrapper.
```

These occur when mixing:
- **Layout Animations** (FadeIn, FadeOut, etc.)
- **Property Animations** (transform, opacity, etc.)

### Solution:

1. **Separate animations using nested views**:
   - Apply layout animations (FadeIn, SlideIn, etc.) to the outer view
   - Apply property animations (transform, opacity) to the inner view

2. **Use our custom `WrappedAnimatedView` component** which properly separates these concerns

## Using WrappedAnimatedView

Our custom `WrappedAnimatedView` component cleanly separates layout animations from property animations:

```jsx
// BEFORE - Generates warnings
<Animated.View 
  style={[styles.container, animatedStyle]} // Property animation
  entering={FadeIn.duration(300)} // Layout animation
>
  {children}
</Animated.View>

// AFTER - No warnings
<WrappedAnimatedView
  entering={FadeIn.duration(300)} // Layout animation goes to outer view
  animatedStyle={animatedStyle} // Property animation goes to inner view
  style={styles.container} // Static styles
>
  {children}
</WrappedAnimatedView>
```

## Animation Performance Tips

1. **Use Memoized Values**:
   - Memoize animation values with `useMemo`
   - Memoize animation styles with `useAnimatedStyle`

2. **Optimize Scroll Handlers**:
   - Use `scrollEventThrottle={16}` (60fps) 
   - Implement with `useAnimatedScrollHandler`

3. **Minimize Animated Nodes**:
   - Animate as few properties as possible
   - Use `transform` instead of positioning properties

4. **Use Optimized Components**:
   - Create specialized components for animations
   - Reuse animation logic through custom hooks

## Common Animation Patterns

### Card Animation
```jsx
import { animatePulse } from '@/app/utils/animationUtils';

// Trigger pulse animation
const handlePress = () => {
  scaleValue.value = animatePulse(1, 0.95, 1);
  
  // Call the onPress handler
  onPress();
};
```

### Entrance Animation
```jsx
<WrappedAnimatedView
  entering={FadeInDown.delay(delay).duration(800)}
  style={styles.container}
>
  {children}
</WrappedAnimatedView>
```

### Property Animation
```jsx
const opacity = useSharedValue(1);

// Create animated style
const fadeStyle = useAnimatedStyle(() => {
  return { opacity: opacity.value };
});

<WrappedAnimatedView
  animatedStyle={fadeStyle}
  style={styles.container}
>
  {children}
</WrappedAnimatedView>
```

By following these guidelines, we can create smooth animations without warnings or performance issues. 