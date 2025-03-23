# Animation Hooks Architecture

This document outlines our strategy for managing animations through custom hooks to prevent React Native Reanimated warnings and improve code maintainability.

## Table of Contents

1. [Overall Architecture](#overall-architecture)
2. [Custom Animation Hooks](#custom-animation-hooks)
3. [Integration with Components](#integration-with-components)
4. [Performance Considerations](#performance-considerations)

## Overall Architecture

Our animation architecture follows these core principles:

1. **Separation of Concerns**: Animation logic is extracted from components into specialized hooks.
2. **Reusable Animation Patterns**: Common animation patterns are abstracted into reusable functions.
3. **Centralized Animation Values**: Related animation values are managed together in the same hook.
4. **Clean Component API**: Components receive only the animation values they need.

## Custom Animation Hooks

We have implemented several specialized hooks for different animation needs:

### useCardAnimations

```tsx
// app/hooks/useCardAnimations.ts
import { useSharedValue } from 'react-native-reanimated';
import { animatePulse, animateShine } from '@/app/utils/animationUtils';

export const useCardAnimations = (cardWidth = 400) => {
  // Animation shared values
  const scale = useSharedValue(1);
  const shine = useSharedValue(-100);
  // ...more values
  
  // Animation trigger functions
  const triggerPressEffect = useCallback(() => {
    scale.value = animatePulse(1, 0.95, 1);
    // ...more animations
  }, [scale]);
  
  return {
    scale,
    shine,
    // ...more values and functions
    triggerPressEffect,
  };
};
```

### useHomeCardAnimations

```tsx
// app/hooks/useHomeCardAnimations.ts
import { useSharedValue } from 'react-native-reanimated';

export const useHomeCardAnimations = () => {
  // Card animation values for multiple cards
  const findTaskShine = useSharedValue(-100);
  const postTaskShine = useSharedValue(-100);
  // ...more values
  
  // Trigger functions for coordinated animations
  const triggerAllCardAnimations = useCallback(() => {
    // Coordinated animations for multiple cards
  }, []);
  
  return {
    findTaskShine,
    postTaskShine,
    // ...more values
    triggerAllCardAnimations,
  };
};
```

### useScrollHeaderAnimation

```tsx
// app/hooks/useScrollHeaderAnimation.ts
import { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';

export const useScrollHeaderAnimation = () => {
  const scrollY = useSharedValue(0);
  
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  
  const headerStyle = useAnimatedStyle(() => {
    // Animation styles based on scrollY
  });
  
  return {
    scrollY,
    scrollHandler,
    headerStyle,
  };
};
```

## Integration with Components

Components integrate with animation hooks following these patterns:

### 1. Local Component Animations

For animations specific to a single component instance:

```tsx
const MyComponent = () => {
  const { scale, shine, triggerAnimation } = useCardAnimations();
  
  return (
    <TouchableOpacity onPress={triggerAnimation}>
      <WrappedAnimatedView animatedStyle={...}>
        {/* Component content */}
      </WrappedAnimatedView>
    </TouchableOpacity>
  );
};
```

### 2. Parent-Controlled Animations

For animations controlled by a parent component:

```tsx
// Parent component
const ParentComponent = () => {
  const { cardShine, triggerShineEffect } = useHomeCardAnimations();
  
  return (
    <View>
      <ChildComponent shineValue={cardShine} />
      <Button onPress={triggerShineEffect} title="Animate" />
    </View>
  );
};

// Child component
const ChildComponent = ({ shineValue }) => {
  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shineValue.value }]
  }));
  
  return <WrappedAnimatedView animatedStyle={shineStyle} />;
};
```

## Performance Considerations

Our hook-based animation architecture provides several performance benefits:

1. **Reduced Re-renders**: By using `useAnimatedStyle` and `useAnimatedProps` inside hooks, we minimize component re-renders.

2. **Worklet Optimizations**: Animation worklets defined in hooks run on the UI thread without requiring communication with the JS thread.

3. **Consistent Animation Timing**: By centralizing animation duration and easing functions, we ensure consistent feel across the app.

4. **Memory Optimizations**: Hooks properly clean up animations on component unmount to prevent memory leaks.

5. **Selective Updates**: Only the specific animation values that change trigger updates, preventing cascading re-renders.

---

By following this architecture, we've successfully eliminated Reanimated warnings while making the animation code more maintainable and reusable across the application. 