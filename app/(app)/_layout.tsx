import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '../constants/Colors';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.background,
        },
        headerTitleStyle: {
          fontFamily: 'SpaceGrotesk-Bold',
          color: Colors.text,
        },
        headerTintColor: Colors.primary,
        contentStyle: {
          backgroundColor: Colors.background,
        },
      }}
    >
      <Stack.Screen
        name="create-task"
        options={{
          title: 'Create Task',
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="task/[id]"
        options={{
          title: 'Task Details',
        }}
      />
    </Stack>
  );
} 