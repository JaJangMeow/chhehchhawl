declare module 'expo-auth-session' {
  export interface MakeRedirectUriOptions {
    scheme?: string;
    path?: string;
    native?: string;
    useProxy?: boolean;
    isTripleSlashed?: boolean;
    preferLocalhost?: boolean;
    localhost?: 'localhost' | '127.0.0.1';
    port?: string | number;
  }
  
  export function makeRedirectUri(options?: MakeRedirectUriOptions): string;

  export interface AuthRequest {
    // Add properties as needed
  }
} 