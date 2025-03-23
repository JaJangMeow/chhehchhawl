import React from 'react';
import { Stack } from 'expo-router';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import Colors from '../constants/Colors';

export default function TaskDetailRoute() {
  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Task Details',
          headerShown: true,
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }} 
      />
      <TaskDetailScreen />
    </>
  );
} 