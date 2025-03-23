import React from 'react';
import CreateTaskScreen from '../screens/CreateTaskScreen';
import { Stack } from 'expo-router';
import { Colors } from '../constants/Colors';

export default function CreateTaskRoute() {
  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Create Task',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.primary,
          headerTitleStyle: {
            fontFamily: 'SpaceGrotesk-Bold',
            color: Colors.text,
          },
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <CreateTaskScreen />
    </>
  );
} 