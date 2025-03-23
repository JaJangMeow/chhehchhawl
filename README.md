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