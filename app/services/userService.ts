import { supabase } from '@/app/lib/supabase';
import { logger } from '../utils/logger';

interface UserProfile {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  id?: string;
  avatar_url?: string;
  phone?: string;
  updated_at?: string;
}

export const fetchUserProfile = async (): Promise<UserProfile> => {
  try {
    // First get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      logger.error('Auth error:', authError);
      throw authError;
    }
    
    if (!user) {
      logger.warn('No authenticated user found');
      return {};
    }
    
    // Log auth user data for debugging
    logger.log('Auth user data:', JSON.stringify({
      id: user.id,
      email: user.email,
      metadata: user.user_metadata
    }, null, 2));
    
    // Force refresh the user's auth data
    await supabase.auth.refreshSession();
    
    // Use the database function to get complete profile data
    logger.log('Fetching complete profile for user ID:', user.id);
    const { data: completeProfile, error: funcError } = await supabase
      .rpc('get_complete_user_profile', { user_id: user.id });
    
    if (funcError) {
      logger.error('Error fetching complete profile:', funcError);
      // Fall back to regular profile query
    } else if (completeProfile && Object.keys(completeProfile).length > 0) {
      logger.log('Successfully retrieved complete profile:', JSON.stringify(completeProfile, null, 2));
      
      // Make sure first_name is not empty
      if (completeProfile.first_name && completeProfile.first_name.trim()) {
        return completeProfile;
      }
    }
    
    // If the RPC function fails or returns empty data, fall back to the regular query
    logger.log('Falling back to standard profile fetch for user ID:', user.id);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url, email, phone, updated_at, full_name')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      if (profileError.code !== 'PGRST116') { // Ignore "not found" as we'll create it
        logger.error('Profile fetch error:', profileError);
      } else {
        logger.warn('No profile found for user, will create one');
      }
    }
    
    // Debug log to see what's coming from the database
    logger.log('Profile from database:', JSON.stringify(profile, null, 2));
    
    // If profile exists and has first_name, return it immediately
    if (profile && profile.first_name && profile.first_name.trim()) {
      // Format the full name if it's not already set
      if (!profile.full_name) {
        profile.full_name = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
      }
      
      logger.log('Using existing profile with first_name:', profile.first_name);
      return {
        ...profile,
        id: user.id,
        email: profile.email || user.email,
      };
    }
    
    // If profile doesn't exist or has no first_name, create or update it
    if (!profile || !profile.first_name) {
      // First try to get name from user metadata
      let firstName = '';
      let lastName = '';
      
      if (user.user_metadata?.first_name) {
        firstName = user.user_metadata.first_name;
      } else if (user.user_metadata?.full_name) {
        const nameParts = user.user_metadata.full_name.split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      } else if (user.email) {
        // Extract from email as last resort
        const emailName = user.email.split('@')[0];
        // Convert email username to proper name format (capitalize, replace underscores/dots)
        firstName = emailName
          .split(/[._-]/)
          .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join(' ');
      }
      
      // Create or update the profile with the derived name
      logger.log('Creating/updating profile with first_name:', firstName);
      const updatedProfile = await updateUserProfile({
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        email: user.email,
        full_name: `${firstName} ${lastName}`.trim()
      });
      
      if (updatedProfile) {
        logger.log('Successfully updated profile with first_name:', updatedProfile.first_name);
        return updatedProfile;
      } else {
        logger.error('Failed to update profile');
      }
    }
    
    // Final fallback to email-derived name
    const emailName = user.email ? user.email.split('@')[0] : 'User';
    const formattedEmailName = emailName
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
    
    logger.log('Using fallback name from email:', formattedEmailName);
    return {
      id: user.id,
      first_name: formattedEmailName,
      full_name: formattedEmailName,
      email: user.email,
      avatar_url: user.user_metadata?.avatar_url || '',
    };
    
  } catch (error) {
    logger.error('Error in fetchUserProfile:', error);
    // Return default values on error
    return {
      first_name: 'User',
      full_name: 'User',
      avatar_url: ''
    };
  }
};

/**
 * Update user profile with provided data
 */
export const updateUserProfile = async (profileData: Partial<UserProfile>): Promise<UserProfile | null> => {
  try {
    // Check if we need to get the current user ID
    const userId = profileData.id || (await supabase.auth.getUser()).data.user?.id;
    
    if (!userId) {
      logger.warn('No user ID found for profile update');
      return null;
    }
    
    // Add ID and updated timestamp
    const dataToUpdate = {
      ...profileData,
      id: userId,
      updated_at: new Date().toISOString()
    };
    
    // If the full_name isn't provided, generate it from first_name and last_name
    if (!dataToUpdate.full_name && (dataToUpdate.first_name || dataToUpdate.last_name)) {
      dataToUpdate.full_name = [dataToUpdate.first_name, dataToUpdate.last_name].filter(Boolean).join(' ');
    }
    
    // Update the profile
    const { data, error } = await supabase
      .from('profiles')
      .upsert(dataToUpdate)
      .select()
      .single();
      
    if (error) {
      logger.error('Error updating profile:', error);
      throw error;
    }
    
    logger.log('Profile updated successfully:', data);
    return data;
  } catch (error) {
    logger.error('Error in updateUserProfile:', error);
    return null;
  }
};

export default {
  fetchUserProfile,
  updateUserProfile
}; 