# ChhehChhawl Project Documentation

## 1. Project Overview

ChhehChhawl is a mobile application built using React Native and Expo, designed to facilitate task management, communication, and collaboration. The app allows users to create tasks, find tasks, chat with other users, and manage their profiles.

## 2. Hardware Requirements

### Device Requirements:
- **Android**: Compatible with Android 5.0 (Lollipop) or newer
- **iOS**: Compatible with iOS 12.0 or newer
- **Memory**: Minimum 2GB RAM recommended
- **Storage**: At least 100MB of free storage space

### Hardware Access:
The application requires access to the following device hardware:
- **Camera**: For profile pictures and task-related photos
- **Location Services**: For location-based tasks and geolocation features
- **Internet Connection**: Required for all app functionality
- **Storage Access**: For saving images and documents

## 3. Software Configuration

### Development Environment:
- **Node.js**: v16 or later
- **Expo CLI**: Latest version
- **EAS CLI**: Latest version
- **Supabase Account**: For backend database

### Tech Stack:
- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Routing**: Expo Router
- **Database**: Supabase
- **UI Components**: Custom components with Tailwind CSS styling
- **State Management**: React Context API and local state
- **Authentication**: Supabase Auth


## 4. Project Structure

### Main Directories:
- **app/**: Main application code using Expo Router
  - **(auth)/**: Authentication screens (login, signup)
  - **(tabs)/**: Main application tabs (home, tasks, chat, profile)
  - **components/**: Reusable UI components
  - **constants/**: App constants and configuration
  - **lib/**: Core utilities and services
  - **services/**: API and business logic
  - **hooks/**: Custom React hooks
  - **db/**: Database setup and SQL scripts
- **assets/**: Static assets like images and fonts
- **types/**: TypeScript type definitions

## 5. Key Modules and Code Snippets

### Authentication Module
The application uses Supabase for authentication. Here's the core Supabase setup:

```typescript
// app/lib/supabase.ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const initializeAuth = async (): Promise<void> => {
  // Implementation to initialize authentication
};

export const isAuthenticated = async (): Promise<boolean> => {
  // Implementation to check if user is authenticated
};

export const getUserId = async (): Promise<string | null> => {
  // Implementation to get current user ID
};
```

### Home Screen Module
The home screen is the main entry point with task management cards:

```typescript
// Simplified version of app/(tabs)/index.tsx
export default function HomeScreen() {
  const [userName, setUserName] = useState('User');
  const [userAvatar, setUserAvatar] = useState('');
  const [taskCounts, setTaskCounts] = useState({ posted: 0, taken: 0 });
  
  // Load user profile on component mount
  useEffect(() => {
    loadUserProfile();
    loadTaskCounts();
  }, []);
  
  // UI rendering with action cards
  return (
    <View style={styles.container}>
      {/* Header with user greeting */}
      <View style={styles.header}>
        <Text>Hello, {userName}</Text>
        {/* User avatar */}
      </View>
      
      {/* Action cards for finding tasks, posting tasks, and chats */}
      <ActionCard 
        title="Find a Task"
        description="Browse available tasks near you"
        onPress={() => router.push('/tasks')}
      />
      
      <ActionCard 
        title="Post a Task"
        description="Create a new task for others to complete"
        onPress={() => router.push('/create-task')}
      />
      
      <ActionCard 
        title="My Chats"
        description="View your conversations"
        onPress={() => router.push('/chat')}
      />
    </View>
  );
}
```

### Location Services Module
The app uses Expo Location for geolocation features:

```typescript
// LocationPicker.tsx (simplified)
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

const LocationPicker = ({ value, onChange }) => {
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({});
      const currentLocation = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
      
      setTempLocation(currentLocation);
      // Update map and form
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };
  
  return (
    <View>
      {/* UI for location picker with map */}
      <MapView
        region={mapRegion}
        onPress={handleMapPress}
      >
        {tempLocation && (
          <Marker
            coordinate={{
              latitude: tempLocation.lat,
              longitude: tempLocation.lng,
            }}
          />
        )}
      </MapView>
      
      <Button
        title="Use Current Location"
        onPress={getCurrentLocation}
      />
    </View>
  );
};
```

### Database Setup
The application requires specific database configuration:

```sql
-- Key functions in fix_database.sql (simplified)

-- Function to get conversations for a user
CREATE OR REPLACE FUNCTION get_user_conversations()
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT json_build_object(
    'id', c.id,
    'task_id', c.task_id,
    'task', json_build_object(
      'id', t.id,
      'title', t.title,
      'status', t.status
    ),
    'conversation_participants', (
      SELECT json_agg(...)
      FROM conversation_participants cp
      LEFT JOIN profiles p ON cp.user_id = p.id
      WHERE cp.conversation_id = c.id
    )
  )
  FROM conversations c
  JOIN conversation_participants cp ON c.id = cp.conversation_id
  JOIN tasks t ON c.task_id = t.id
  WHERE cp.user_id = auth.uid()
  ORDER BY c.updated_at DESC;
END;
$$;

-- Function to accept a task and create a conversation
CREATE OR REPLACE FUNCTION accept_task_and_create_conversation(
  p_task_id UUID,
  p_user_id UUID
)
RETURNS TABLE(conversation_id UUID, notification_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_owner UUID;
  v_conversation_id UUID;
  v_notification_id UUID;
BEGIN
  -- Implementation to accept a task and create conversation
  -- ...
  RETURN QUERY SELECT v_conversation_id, v_notification_id;
END;
$$;
```

## Enhanced Chat Module

### Task Acceptance Workflow

The chat module has been enhanced to improve the task acceptance and confirmation workflow:

1. **Pending Task Requests**
   - When a user applies for a task, the task owner sees a notification with "Accept" and "Decline" buttons within the chat.
   - Pending requests display in the "Applications" section of the chat list.
   - Task owners can make an immediate decision without leaving the chat interface.

2. **Task Confirmation Flow**
   - When a user accepts a task request, the conversation is automatically moved to the "Tasks I Assign" category.
   - For task acceptors, their applications display a "Pending Confirmation" status until the task owner confirms.
   - Once confirmed, the conversation automatically moves to the "Tasks To Do" category.

3. **Status Display**
   - Applications display clear visual indicators of their status:
     - Pending Decision: Waiting for task owner's response
     - Awaiting Response: Waiting for poster's confirmation
     - Task Assigned: Confirmed and ready to start
     - Application Declined: Request rejected

### Chat Categories

Conversations are now organized into distinct categories for better workflow management:

1. **Applications**
   - Task requests that require the owner's decision (accept/reject)
   - Displayed with "Pending Decision" status for task owners

2. **Pending Confirmation**
   - Tasks that the user has applied for but are awaiting final confirmation
   - Displayed with "Awaiting Response" status

3. **Tasks To Do**
   - Tasks that have been confirmed and assigned to the current user
   - Ready for the user to start working on

4. **Tasks I Assign**
   - Tasks that the current user has posted and assigned to other users
   - The user is responsible for managing these tasks

The enhanced chat module provides a streamlined workflow for task management, making it easier for users to track the status of their task applications and assignments.

## 6. Building and Running the Application

### Development Setup:
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables in `.env` file
4. Run the development server: `npm run dev`

### Building for Production:
For Android:
```bash
eas build --platform android --profile preview-apk
```

For iOS:
```bash
eas build --platform ios --profile preview
```

## 7. Database Requirements

The application requires a Supabase database with the following configuration:
- Tables for users, tasks, conversations, messages
- Secure RLS policies for data access control
- Functions for task management and conversation handling
- Database setup scripts to be run in order:
  1. `ensure_tables_exist.sql`
  2. `create_task_conversations_table.sql`
  3. `get_task_conversations.sql`
  4. `fix_task_acceptance_chat.sql`

## 8. Permissions

The application requires the following permissions:
- Location (fine and coarse)
- Camera
- Storage (read/write)
- Internet access
- Vibration (for haptic feedback)
