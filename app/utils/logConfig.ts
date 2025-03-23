import { LogBox, YellowBox } from 'react-native';

/**
 * Configure LogBox to suppress specific warnings
 * This helps keep the console clean during development
 */
export const configureLogBox = () => {
  // Handle both LogBox (newer) and YellowBox (older) APIs
  const logger = LogBox || YellowBox;
  
  if (!logger) return;
  
  // Suppress specific warning patterns
  logger.ignoreLogs([
    // Ignore all NOBRIDGE logs
    /NOBRIDGE/,
    
    // Ignore Reanimated animation warnings
    /\[Reanimated\]/,
    /Property .* of AnimatedComponent\(View\) may be overwritten by a layout animation/,
    
    // Common React Native warnings that are often not actionable
    /Require cycle/,
    /Animated: .useNativeDriver. is not supported/,
    /AsyncStorage has been extracted from react-native/,
    /VirtualizedLists should never be nested/,
    
    // Add any other warnings you want to suppress here
  ]);
  
  // Configure native console behavior if in development
  if (__DEV__ && (global as any).HermesInternal) {
    // Specific Hermes configuration
    console.debug('Running on Hermes JavaScript engine');
  }
};

// Configure Reanimated
export const configureReanimated = () => {
  if (__DEV__) {
    // For TypeScript compatibility
    const GLOBAL = global as any;
    
    // Disable debug features that can cause performance issues
    GLOBAL.__REACT_NATIVE_DEBUG_ENABLED__ = false;
    GLOBAL.__REACT_NATIVE_STRICT_MODE_ENABLED__ = false;
    
    // Configure Reanimated warnings
    if (GLOBAL._REANIMATED) {
      GLOBAL._REANIMATED.setGlobalConsoleWarnIgnoreList([
        'useSharedValue API has changed',
        'Property',
        'may be overwritten by a layout animation',
        'Please wrap your component',
      ]);
    }
  }
};

// Execute configurations immediately
configureLogBox();
configureReanimated();

// Default export for imports that don't call the functions explicitly
export default { configureLogBox, configureReanimated }; 