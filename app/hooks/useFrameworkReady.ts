import { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

export function useFrameworkReady() {
  useEffect(() => {
    // Initialize any required polyfills or framework-level setup
    if (Platform.OS !== 'web') {
      // Add any native-specific initialization here
    }
  }, []);
}

// Add default export to prevent Expo Router from treating this as a route
export default useFrameworkReady; 