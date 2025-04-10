/**
 * Type definitions for Expo Router
 */

// Define all the app routes for type-safety in router.push() calls
export type AppRoute = 
  | '/(tabs)'
  | '/(tabs)/index'
  | '/(tabs)/tasks'
  | '/(tabs)/history'
  | '/(tabs)/profile'
  | '/(auth)/login'
  | '/(auth)/signup'
  | '/chat/[id]'
  | '/tasks/[id]';

// Route parameters structure
export interface RouteParams {
  id?: string;
  [key: string]: any;
}

// Use to properly type router.push() calls
declare global {
  namespace ReactNavigation {
    interface RootParamList {
      [key: string]: object | undefined;
    }
  }
}

/**
 * Default export for Expo Router compatibility.
 * This prevents the "missing the required default export" warning.
 */
export default function RouteTypes() {
  return null;
} 