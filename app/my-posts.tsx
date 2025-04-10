import React from 'react';
import { Stack } from 'expo-router';
import MyPostsScreen from '@/app/screens/MyPostsScreen';

export default function MyPostsPage() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <MyPostsScreen />
    </>
  );
} 