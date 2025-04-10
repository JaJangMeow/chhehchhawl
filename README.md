# ChhehChhawl App

## Project Structure

This project uses Expo Router for file-based routing. The main source code is organized as follows:

### Main Directories

- **app/** - The main application directory, using Expo Router for file-based routing
  - **(auth)/** - Authentication routes (login, signup)
  - **(tabs)/** - Main application tabs
  - **types/** - TypeScript type definitions
  - **components/** - React components (organized by feature)
    - **auth/** - Authentication related components
    - **home/** - Home screen components
    - **tasks/** - Task-related components
    - **chat/** - Chat-related components
    - **shared/** - Shared components used across features
  - **services/** - API and business logic services
  - **lib/** - Shared libraries and utilities
  - **constants/** - Constants and configuration
  - **utils/** - Utility functions
  - **hooks/** - Custom React hooks

- **assets/** - Global assets for the entire app
  - **fonts/** - Custom fonts
  - **images/** - Images and icons

## Project Organization Notes

- The project uses path aliases with `@/*` pointing to the root directory.
- All component imports should use `@/app/components/*` paths.
- All asset imports should use relative paths from the root assets folder.
- The codebase has been consolidated to eliminate duplicate files and folders.

## Import Examples

```typescript
// Correct way to import components
import { Button } from '@/app/components/shared/Button';
import { TaskCard } from '@/app/components/tasks/TaskCard';

// Correct way to import services and utilities
import { supabase } from '@/app/lib/supabase';
import { taskService } from '@/app/services/taskService';

// Correct way to import assets
import { Image } from 'react-native';
// From anywhere in the app:
<Image source={require('../../assets/images/logo.png')} />
```

## Routing Structure

The application uses Expo Router for navigation:

- `/` - Main entry point
- `/(auth)/login` - Login screen
- `/(auth)/signup` - Signup screen
- `/(tabs)/` - Main tab navigation
  - `/(tabs)/home` - Home screen
  - `/(tabs)/chat` - Chat screen
  - `/(tabs)/tasks` - Tasks screen
  - `/(tabs)/profile` - Profile screen 

## Task Acceptance Fix - Status Update

The task acceptance functionality has been fixed and is now working properly. The fix involved:

1. Creating the missing `accept_task_and_create_conversation_v2` database function
2. Ensuring proper error handling with a fallback mechanism 
3. Implementing a reusable component for consistent user experience

For detailed information about the fix, please refer to the documentation in `app/docs/TASK_ACCEPTANCE_FIX.md`.

## Database Setup

To set up the required database functions:

1. Log into your Supabase dashboard
2. Navigate to the SQL Editor
3. Run the following SQL scripts from the `app/db/scripts` directory **in this order**:
   - `ensure_tables_exist.sql` - Ensures all required tables and columns exist
   - `create_task_conversations_table.sql` - Creates the linking table between tasks and conversations
   - `get_task_conversations.sql` - Creates function to fetch task conversations categorized by "Tasks I Assign" and "Tasks To Do"
   - `fix_task_acceptance_chat.sql` - Adds functions for task acceptance notifications

These scripts set up the necessary database functions and tables for the application to work correctly.

## Database Setup

This application requires a specific database configuration for task acceptance notifications and chat functionality. If you encounter database-related errors in the app, follow these steps:

### Fix Database Errors

1. **Run the Fix Script**: The app includes a fix script at `app/db/fix_database.sql` that resolves common database issues.
2. **Administrator Access**: You need administrator access to your Supabase project to run this script.
3. **Running the Script**:
   - Log in to your Supabase dashboard
   - Navigate to the SQL Editor
   - Open the `app/db/fix_database.sql` file from this project
   - Copy and paste the entire contents into the SQL Editor
   - Execute the script

### What This Script Fixes

The fix script addresses the following issues:

- **Infinite Recursion**: Fixes the conversation_participants policy to prevent infinite recursion errors
- **Notification Columns**: Adds required notification columns to the messages table
- **SQL Functions**: Creates necessary functions for task acceptance and conversation management:
  - `get_user_conversations()`: Safely retrieves user conversations without policy recursion
  - `accept_task_and_create_conversation()`: Handles task acceptance and creates notifications
  - `respond_to_task_acceptance()`: Allows task owners to confirm or reject task requests

### Troubleshooting

If you still encounter database issues after running the script:

1. Check the Supabase logs for specific errors
2. Ensure your user has proper permissions
3. Verify that the SQL script executed without errors
4. Restart the application after applying database changes 

## Task Acceptance Fix

We've addressed an issue with task acceptance functionality:

1. **Database Function Fix**: There was a function overloading issue with the database function used for accepting tasks. We've created a new version of the function (`accept_task_and_create_conversation_v2`) to resolve this.

2. **Client-Side Fallback**: The application now has a fallback mechanism in case the database function is not available, ensuring task acceptance works reliably.

3. **New AcceptTaskButton Component**: We've created a reusable component for task acceptance that provides a consistent experience across the app.

### Using the AcceptTaskButton Component

```jsx
import AcceptTaskButton from '@/app/components/tasks/AcceptTaskButton';

// Basic usage
<AcceptTaskButton taskId={task.id} />

// Customized
<AcceptTaskButton 
  taskId={task.id}
  buttonText="Apply for this Task"
  showMessageInput={true}
  size="medium"
  onSuccess={(conversationId) => {
    // Handle success
  }}
/>
```

### Options:

- `taskId`: (Required) The ID of the task to accept
- `buttonText`: Custom text for the button (default: "Accept Task")
- `showMessageInput`: Whether to show a message input modal (default: true)
- `size`: Button size - 'small', 'medium', or 'large' (default: 'medium')
- `onSuccess`: Callback function when task is successfully accepted
- `style`: Additional styles to apply to the button 