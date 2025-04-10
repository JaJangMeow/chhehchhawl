import { supabase } from '../lib/supabase';
import { Tables, Insertable, Updatable } from '../types/supabase';

type Profile = Tables<'profiles'>;
type ProfileInsert = Insertable<'profiles'>;
type ProfileUpdate = Updatable<'profiles'>;

/**
 * Get the current user's profile
 */
export const getCurrentProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }

  return data;
};

/**
 * Get a user profile by id
 */
export const getProfileById = async (profileId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }

  return data;
};

/**
 * Create a new user profile
 */
export const createProfile = async (profile: ProfileInsert) => {
  const { data, error } = await supabase
    .from('profiles')
    .insert(profile)
    .select()
    .single();

  if (error) {
    console.error('Error creating profile:', error);
    throw error;
  }

  return data;
};

/**
 * Update an existing user profile
 */
export const updateProfile = async (profileId: string, updates: ProfileUpdate) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', profileId)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    throw error;
  }

  return data;
};

/**
 * Upload a profile avatar image
 */
export const uploadAvatar = async (userId: string, file: File) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}-${Math.random()}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  // Upload the file to storage
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading avatar:', uploadError);
    throw uploadError;
  }

  // Get the public URL for the file
  const { data: publicURL } = await supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  // Update the user's profile with the new avatar URL
  const { data, error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicURL.publicUrl })
    .eq('user_id', userId)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating profile with avatar:', updateError);
    throw updateError;
  }

  return data;
};

/**
 * Search profiles by username or full name
 */
export const searchProfiles = async (query: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`);

  if (error) {
    console.error('Error searching profiles:', error);
    throw error;
  }

  return data;
}; 