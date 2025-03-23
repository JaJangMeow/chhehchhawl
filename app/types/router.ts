/**
 * Type definitions for Expo Router
 */

// Define all the app routes for type-safety in router.push() calls
export type AppRoute = 
  | '/(tabs)'
  | '/(tabs)/home'
  | '/(tabs)/chat'
  | '/(tabs)/tasks'
  | '/(tabs)/profile'
  | '/(auth)/login'
  | '/(auth)/signup'
  | '/chat/[id]';

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

export default AppRoute; 