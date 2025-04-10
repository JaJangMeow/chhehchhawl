import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image, Alert, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/app/constants/Colors';
import { supabase } from '@/app/lib/supabase';
import { User } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Edit, LogOut, Mail, Phone, MapPin, User as UserIcon, Calendar, CreditCard, Camera, ChevronUp, ChevronDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { Ionicons } from '@expo/vector-icons';

interface UserProfile {
  id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  dob?: string;
  gender?: 'Male' | 'Female';
  aadhaar?: string;
  upi?: string;
  avatar_url?: string;
}

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Fetch user profile from profiles table
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
        }

        setProfile(profileData || {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || '',
          first_name: user.user_metadata?.full_name?.split(' ')[0] || '',
          last_name: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
        });
      }
    } catch (error) {
      console.error('Error in profile fetch:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserData();
  }, []);

  const handleSignOut = async () => {
    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      // Navigate to welcome screen immediately
      router.replace('/');
    } catch (error) {
      console.error('Error during sign out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const confirmSignOut = () => {
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
          onPress: handleSignOut,
          style: 'destructive'
        }
      ]
    );
  };

  const pickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need permissions to access your photo library');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const uploadProfilePicture = async (uri: string) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to upload a profile picture');
      return;
    }
    
    try {
      setUploading(true);
      
      // Create a unique file path for the image - ensure proper extension
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      // Make sure we have a valid extension
      const validExt = ['jpg', 'jpeg', 'png'].includes(fileExt) ? fileExt : 'jpg';
      const fileName = `avatar_${user.id}_${Date.now()}.${validExt}`;
      const filePath = `avatars/${fileName}`;

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        Alert.alert('Error', 'File does not exist');
        return;
      }
      
      // Check file size (limit to 5MB)
      if (fileInfo.size && fileInfo.size > 5 * 1024 * 1024) {
        Alert.alert('Error', 'Image size is too large (max 5MB)');
        return;
      }

      // Read the file as base64
      const fileContent = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Log file details
      console.log('File extension:', validExt);
      console.log('Content type:', `image/${validExt === 'jpg' ? 'jpeg' : validExt}`);
      console.log('File path:', filePath);
      
      // Upload directly to Supabase Storage with proper content type
      console.log('Uploading image to path:', filePath);
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, decode(fileContent), {
          contentType: `image/${validExt === 'jpg' ? 'jpeg' : validExt}`,
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful, getting public URL');
      
      // Get the public URL
      const { data } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      if (!data || !data.publicUrl) {
        throw new Error('Failed to get public URL for uploaded image');
      }

      const publicUrl = data.publicUrl;
      console.log('Public URL:', publicUrl);

      // Update user profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        });

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw updateError;
      }

      // Update local state with new URL
      setProfile(prev => prev ? ({ ...prev, avatar_url: publicUrl }) : null);
      
      // Update global Supabase auth user data
      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });
      
      // Refresh the profile data
      await fetchUserData();
      
      Alert.alert('Success', 'Profile picture updated successfully');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      Alert.alert(
        'Error', 
        error instanceof Error ? error.message : 'Failed to upload profile picture. Please try again.'
      );
    } finally {
      setUploading(false);
    }
  };

  // Profile information item component
  const ProfileItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value?: string }) => {
    if (!value) return null;
    
    return (
      <View style={styles.profileItem}>
        <View style={styles.profileItemIcon}>
          {icon}
        </View>
        <View style={styles.profileItemContent}>
          <Text style={styles.profileItemLabel}>{label}</Text>
          <Text style={styles.profileItemValue}>{value}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      
      {/* Background gradient */}
      <LinearGradient
        colors={[Colors.background, '#121212']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >
          {/* User Avatar and Name */}
          <View style={styles.profileHeader}>
            <TouchableOpacity 
              style={styles.avatarContainer}
              onPress={pickImage}
              disabled={uploading}
            >
              {profile?.avatar_url ? (
                <>
                  <Image 
                    source={{ 
                      uri: profile.avatar_url
                    }} 
                    style={styles.avatarImage} 
                    onError={(e) => {
                      console.error('Image loading error:', e.nativeEvent.error);
                      // If image fails to load, fall back to the default avatar view
                      setProfile(prev => prev ? { ...prev, avatar_url: undefined } : null);
                    }}
                  />
                  {uploading && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator size="small" color="#fff" />
                    </View>
                  )}
                  <View style={styles.cameraIconContainer}>
                    <Camera size={16} color="#fff" />
                  </View>
                </>
              ) : (
                <View style={styles.avatar}>
                  {uploading ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <>
                      <UserIcon size={40} color={Colors.textSecondary} />
                      <View style={styles.cameraIconContainer}>
                        <Camera size={16} color="#fff" />
                      </View>
                    </>
                  )}
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.userName}>
              {profile?.full_name || profile?.first_name || user?.email?.split('@')[0] || 'User'}
            </Text>
            {profile?.email && (
              <Text style={styles.userEmail}>{profile.email}</Text>
            )}
          </View>
          
          {/* Profile Information */}
          <View style={styles.profileSection}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            <ProfileItem
              icon={<UserIcon size={20} color={Colors.textSecondary} />}
              label="First Name"
              value={profile?.first_name}
            />
            
            <ProfileItem
              icon={<UserIcon size={20} color={Colors.textSecondary} />}
              label="Last Name"
              value={profile?.last_name}
            />
            
            <ProfileItem
              icon={<Mail size={20} color={Colors.textSecondary} />}
              label="Email"
              value={profile?.email || user?.email}
            />
            
            <ProfileItem
              icon={<Phone size={20} color={Colors.textSecondary} />}
              label="Phone"
              value={profile?.phone}
            />
            
            <ProfileItem
              icon={<MapPin size={20} color={Colors.textSecondary} />}
              label="Address"
              value={profile?.address}
            />
            
            <ProfileItem
              icon={<MapPin size={20} color={Colors.textSecondary} />}
              label="City"
              value={profile?.city}
            />
            
            <ProfileItem
              icon={<Calendar size={20} color={Colors.textSecondary} />}
              label="Date of Birth"
              value={profile?.dob ? new Date(profile.dob).toLocaleDateString() : undefined}
            />

            <ProfileItem
              icon={<UserIcon size={20} color={Colors.textSecondary} />}
              label="Gender"
              value={profile?.gender}
            />
          </View>
          
          <View style={styles.profileSection}>
            <Text style={styles.sectionTitle}>Payment Information</Text>
            
            <ProfileItem
              icon={<CreditCard size={20} color={Colors.textSecondary} />}
              label="UPI ID"
              value={profile?.upi}
            />
            
            <ProfileItem
              icon={<CreditCard size={20} color={Colors.textSecondary} />}
              label="Aadhaar"
              value={profile?.aadhaar ? `XXXX XXXX ${profile.aadhaar.slice(-4)}` : undefined}
            />
          </View>
          
          {/* My Tasks Section */}
          <View style={styles.profileSection}>
            <Text style={styles.sectionTitle}>My Tasks</Text>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/my-posts')}
            >
              <View style={styles.actionButtonIcon}>
                <Ionicons name="list" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.actionButtonText}>My Posts</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          {/* Sign Out Button */}
          <TouchableOpacity onPress={confirmSignOut} style={styles.signOutButton}>
            <LogOut size={20} color={Colors.text} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
          
          {/* Add some white space at the bottom */}
          <View style={styles.bottomSpacing}></View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: Colors.textSecondary,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  userName: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
  },
  profileSection: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginBottom: 16,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  profileItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileItemContent: {
    flex: 1,
  },
  profileItemLabel: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  profileItemValue: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.text,
  },
  signOutButton: {
    backgroundColor: Colors.error,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  signOutText: {
    color: Colors.text,
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    marginLeft: 12,
  },
  actionButton: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.text,
    flex: 1,
  },
  bottomSpacing: {
    height: 60,
  },
});