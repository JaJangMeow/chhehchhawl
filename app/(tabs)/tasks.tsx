import React from 'react';
import { Stack } from 'expo-router';
import TasksScreen from '../screens/TasksScreen';
import Colors from '../constants/Colors';

export default function TasksTabScreen() {
  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Tasks',
          headerStyle: {
            backgroundColor: Colors.background,
          },
          headerTintColor: Colors.primary,
          headerTitleStyle: {
            fontFamily: 'SpaceGrotesk-Bold',
            color: Colors.text,
            fontSize: 20,
          },
          headerShadowVisible: false,
          headerTitleAlign: 'left',
        }} 
      />
      <TasksScreen />
    </>
  );
} 