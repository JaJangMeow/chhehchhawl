import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';
import Constants from 'expo-constants';

// Get Supabase URL and key from environment variables or Constants
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL and Anon Key must be provided. Check your environment variables.');
}

// Create a more robust AsyncStorage wrapper
const customStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      // Check for the specific auth key that Supabase uses
      if (key === 'supabase.auth.token') {
        console.log('Getting auth token from storage');
        const result = await AsyncStorage.getItem(key);
        console.log('Auth token retrieved:', result ? 'Found token' : 'No token found');
        return result;
      }
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Error getting item from storage:', error);
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      // Log when we store auth token
      if (key === 'supabase.auth.token') {
        console.log('Storing auth token in AsyncStorage');
      }
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Error setting item in storage:', error);
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing item from storage:', error);
    }
  }
};

// Initialize the Supabase client with more debugging
console.log('Initializing Supabase client with URL:', supabaseUrl ? 'URL present' : 'URL missing');

// Create Supabase client with improved settings
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    debug: __DEV__, // Enable auth debugging in dev mode
  },
});

// Cache to hold the session
let cachedSession: any = null;
let isInitialized = false;
let initializing = false;

// Check if a user is already logged in at startup
export const initializeAuth = async (): Promise<void> => {
  if (isInitialized || initializing) return;
  
  try {
    initializing = true;
    console.log('Initializing auth system...');
    
    // First try to get the session directly from storage
    try {
      const authTokenJson = await AsyncStorage.getItem('supabase.auth.token');
      if (authTokenJson) {
        console.log('Found existing auth token in storage');
        try {
          const tokenData = JSON.parse(authTokenJson);
          if (tokenData?.currentSession) {
            cachedSession = tokenData.currentSession;
            console.log('Successfully parsed session from storage');
          }
        } catch (parseError) {
          console.log('Failed to parse stored session:', parseError);
        }
      } else {
        console.log('No auth token found in storage');
      }
    } catch (storageError) {
      console.error('Error accessing AsyncStorage:', storageError);
    }
    
    // Get the current session through Supabase
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
    } else if (data?.session) {
      console.log('Got active session from Supabase');
      cachedSession = data.session;
      
      // Save the session token again to ensure it's stored properly
      try {
        const json = JSON.stringify({
          currentSession: data.session
        });
        await AsyncStorage.setItem('supabase.auth.token', json);
        console.log('Manually saved session token to AsyncStorage');
      } catch (saveError) {
        console.error('Error saving session to AsyncStorage:', saveError);
      }
    } else {
      console.log('No active session returned from Supabase');
      
      // If we have a cached session, try to restore it
      if (cachedSession?.access_token) {
        console.log('Trying to restore session from cached token');
        try {
          const { data: setData, error: setError } = await supabase.auth.setSession({
            access_token: cachedSession.access_token,
            refresh_token: cachedSession.refresh_token,
          });
          
          if (setError) {
            console.error('Error setting session:', setError);
            cachedSession = null; // Clear invalid cache
          } else if (setData?.session) {
            console.log('Successfully restored session');
            cachedSession = setData.session;
          }
        } catch (setSessionError) {
          console.error('Error in setSession:', setSessionError);
          cachedSession = null;
        }
      }
    }
    
    isInitialized = true;
    console.log('Auth initialization complete, user is:', cachedSession ? 'logged in' : 'not logged in');
  } catch (err) {
    console.error('Unexpected error during auth initialization:', err);
  } finally {
    initializing = false;
  }
};

// Improved authentication check
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    // Ensure auth is initialized
    if (!isInitialized && !initializing) {
      await initializeAuth();
    }
    
    // Check if we have a cached session first
    if (cachedSession?.access_token) {
      const now = Math.floor(Date.now() / 1000);
      
      // If token is not expired, consider user authenticated
      if (cachedSession.expires_at && cachedSession.expires_at > now) {
        console.log('User authenticated (cached session)');
        return true;
      }
    }
    
    // Get fresh session from Supabase
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
    
    if (data?.session) {
      cachedSession = data.session;
      console.log('User authenticated (fresh session)');
      return true;
    }
    
    console.log('User is not authenticated');
    return false;
  } catch (error) {
    console.error('Error in isAuthenticated:', error);
    return false;
  }
};

// Helper to get user ID with better error handling
export const getUserId = async (): Promise<string | null> => {
  try {
    // Ensure auth is initialized
    if (!isInitialized && !initializing) {
      await initializeAuth();
    }
    
    // Check cached session first
    if (cachedSession?.user?.id) {
      return cachedSession.user.id;
    }
    
    // Get fresh session
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
    
    if (data?.session?.user) {
      cachedSession = data.session;
      return data.session.user.id;
    }
    
    return null;
  } catch (error) {
    console.error('Error in getUserId:', error);
    return null;
  }
}; 

/**
 * Check if session storage is working correctly
 * This is a simplified version that just tests basic AsyncStorage functionality
 */
export const checkSessionStorageHealth = async (): Promise<boolean> => {
  if (!__DEV__) {
    console.log('Session storage health check is only available in development mode');
    return true;
  }
  
  try {
    // Create a test object
    const testObj = {
      test: 'data',
      timestamp: new Date().toISOString()
    };
    
    const testKey = 'session-storage-test';
    const testValue = JSON.stringify(testObj);
    
    console.log(`[StorageTest] Testing storage with ${testValue.length} bytes of data`);
    
    // Test storing
    await AsyncStorage.setItem(testKey, testValue);
    console.log('[StorageTest] Successfully stored test data');
    
    // Test retrieving
    const retrieved = await AsyncStorage.getItem(testKey);
    
    if (!retrieved) {
      console.error('[StorageTest] Failed to retrieve test data');
      return false;
    }
    
    // Validate content
    if (retrieved === testValue) {
      console.log('[StorageTest] Retrieved data matches original data ✅');
    } else {
      console.error('[StorageTest] Data integrity check failed ❌');
      return false;
    }
    
    // Test deleting
    await AsyncStorage.removeItem(testKey);
    console.log('[StorageTest] Successfully cleaned up test data');
    
    console.log('[StorageTest] All storage tests passed ✅');
    return true;
  } catch (e) {
    console.error('[StorageTest] Storage test failed:', e);
    return false;
  }
};

// Default export that includes all the exported items
export default {
  supabase,
  initializeAuth,
  isAuthenticated,
  getUserId,
  checkSessionStorageHealth
};

export const troubleshootSignUp = async (email: string): Promise<void> => {
  console.log('Troubleshooting signup for:', email);
  
  try {
    // Check if user already exists in auth.users
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    
    console.log('Current session:', session ? 'Active' : 'None');
    
    // Get users and filter manually since filter param isn't supported
    const { data: usersData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.log('Error checking for existing user:', userError.message);
    } else if (usersData && usersData.users) {
      // Find user with matching email
      const user = usersData.users.find(u => u.email === email);
      
      if (user) {
        console.log('User already exists:', user);
        
        // Check if profile exists for this user
        const userId = user.id;
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (profileError) {
          console.log('Error checking for profile:', profileError.message);
          
          // Try to create profile if it doesn't exist
          if (profileError.code === 'PGRST116') {
            console.log('Profile does not exist, attempting to create one');
            const { error: createError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                email: email,
                first_name: email.split('@')[0],
                last_name: '',
                full_name: email.split('@')[0],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
              
            if (createError) {
              console.log('Failed to create profile:', createError.message);
            } else {
              console.log('Profile created successfully');
            }
          }
        } else {
          console.log('Profile exists:', profileData);
        }
      } else {
        console.log('User does not exist');
      }
    } else {
      console.log('No users data available');
    }
  } catch (e) {
    console.error('Troubleshooting error:', e);
  }
}; 