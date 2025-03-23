import React from 'react';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/app/hooks/useFrameworkReady';
import { useFonts } from 'expo-font';
import { SplashScreen } from 'expo-router';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { checkSessionStorageHealth, initializeAuth, isAuthenticated } from '@/app/lib/supabase';
import { ActivityIndicator, View, Text, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import the enhanced logging configuration
import '@/app/utils/logConfig';

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'SpaceGrotesk-Regular': SpaceGrotesk_400Regular,
    'SpaceGrotesk-Bold': SpaceGrotesk_700Bold,
  });

  const [authInitialized, setAuthInitialized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);
  
  // Check session storage in development mode
  useEffect(() => {
    if (__DEV__) {
      // Run session storage health check
      checkSessionStorageHealth().then(healthy => {
        if (healthy) {
          console.log('Session storage is working correctly');
        } else {
          console.warn('Session storage health check failed - auth persistence may be affected');
        }
      });
    }
  }, []);

  // Initialize authentication on app startup
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('Starting auth initialization from _layout');
        
        // Check for invalid token errors
        const authTokenStr = await AsyncStorage.getItem('supabase.auth.token');
        if (authTokenStr && authTokenStr.includes('Invalid Refresh Token')) {
          console.log('Found invalid token in storage, clearing it');
          await AsyncStorage.removeItem('supabase.auth.token');
        }
        
        await initializeAuth();
        console.log('Auth initialization complete from _layout');
        
        // Check if authentication worked
        const authStatus = await isAuthenticated();
        console.log('User authentication status:', authStatus ? 'authenticated' : 'not authenticated');
        
        setAuthInitialized(true);
      } catch (error: any) {
        console.error('Failed to initialize auth from _layout:', error);
        
        // Handle specific auth errors
        if (error.message && (
          error.message.includes('Refresh Token Not Found') || 
          error.message.includes('Invalid Refresh Token')
        )) {
          setAuthError('Your session has expired. Please log in again.');
          
          // Clear invalid token data
          try {
            await AsyncStorage.removeItem('supabase.auth.token');
            console.log('Cleared invalid token from storage');
          } catch (storageError) {
            console.error('Error clearing token storage:', storageError);
          }
        }
        
        // Continue anyway so the app can at least load
        setAuthInitialized(true);
      }
    };
    
    initAuth();
  }, []);

  // Display auth error if any
  useEffect(() => {
    if (authError) {
      Alert.alert('Authentication Error', authError);
      setAuthError(null); // Clear after showing
    }
  }, [authError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  // Wait until auth is initialized before rendering the app
  if (!authInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={{ marginTop: 10 }}>Initializing...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}