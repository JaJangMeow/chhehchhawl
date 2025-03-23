import { View, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { AuthHeader, BackButton, SignInLink } from '@/app/components/auth/AuthBasicComponents';
import SignUpForm from '@/app/components/auth/SignUpForm';
import BackgroundImage from '@/app/components/auth/BackgroundImage';
import { Colors } from '@/app/constants/Colors';

// Prevent the splash screen from auto-hiding before asset loading is complete
SplashScreen.preventAutoHideAsync();

export default function SignUpScreen() {
  // ... rest of the file ...
} 
