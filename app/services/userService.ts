import { supabase } from '@/app/lib/supabase';

interface UserProfile {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  id?: string;
  avatar_url?: string;
}

export const fetchUserProfile = async (): Promise<UserProfile> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {};
    }
    
    // Get user profile from database
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, full_name, avatar_url')
      .eq('id', user.id)
      .single();
    
    if (profile) {
      return {
        full_name: profile.full_name || '',
        first_name: profile.first_name || '',
        id: user.id,
        email: user.email,
        avatar_url: profile.avatar_url || ''
      };
    } else {
      // Fallback to user metadata or email
      const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || '';
      const firstName = userName.split(' ')[0];
      
      return {
        full_name: userName,
        first_name: firstName,
        id: user.id,
        email: user.email,
        avatar_url: ''
      };
    }
  } catch (error) {
    console.log('Error fetching user:', error);
    // Return default values on error
    return {
      first_name: 'Friend',
      full_name: '',
      avatar_url: ''
    };
  }
};

export default {
  fetchUserProfile
}; 