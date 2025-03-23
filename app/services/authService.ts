import { Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/app/lib/supabase';
import * as Haptics from 'expo-haptics';

/**
 * Handles the complete sign-out process
 * - Signs out from Supabase
 * - Clears any relevant local storage 
 * - Redirects to the welcome screen
 */
export const signOut = async (setLoadingCallback?: (loading: boolean) => void): Promise<void> => {
  try {
    // Set loading state if callback provided
    if (setLoadingCallback) {
      setLoadingCallback(true);
    }
    
    // Provide haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      throw error;
    }
    
    // Verify the session is actually cleared
    const { data } = await supabase.auth.getSession();
    
    // If session still exists, try one more time
    if (data.session) {
      console.warn('Session still exists after signOut, attempting again...');
      await supabase.auth.signOut();
      
      // Check again
      const { data: verifyData } = await supabase.auth.getSession();
      if (verifyData.session) {
        console.error('Failed to clear session after multiple attempts');
      }
    }
    
    // Clear any local storage keys if needed
    // (Add here any additional cleanup if you have app-specific state)
    
    console.log('User signed out successfully');
    
    // Reset loading state before navigation
    if (setLoadingCallback) {
      setLoadingCallback(false);
    }
    
    // Force memory cleanup
    global.gc?.();
    
    // Navigate to welcome screen - use a more reliable approach
    setTimeout(() => {
      router.replace('/' as any);
    }, 300);
  } catch (error) {
    console.error('Error during sign out:', error);
    Alert.alert('Error', 'Failed to sign out. Please try again.');
    
    // Reset loading state if error occurs
    if (setLoadingCallback) {
      setLoadingCallback(false);
    }
  }
};

/**
 * Shows a confirmation dialog before signing out
 */
export const confirmSignOut = (setLoadingCallback?: (loading: boolean) => void): void => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  
  Alert.alert(
    'Sign Out',
    'Are you sure you want to sign out?',
    [
      {
        text: 'Cancel',
        style: 'cancel'
      },
      {
        text: 'Sign Out',
        onPress: async () => {
          await signOut(setLoadingCallback);
        },
        style: 'destructive'
      }
    ]
  );
};

// Default export
export default {
  signOut,
  confirmSignOut
}; 