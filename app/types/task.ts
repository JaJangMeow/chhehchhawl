/**
 * Task related type definitions
 */

// Basic task types
export type TaskStatus = 'pending' | 'open' | 'assigned' | 'finished' | 'confirmed_complete' | 'completed' | 'canceled' | 'public';
export type TaskCategory = string;
export type TaskUrgency = 'low' | 'medium' | 'high';

// Location interface for task locations
export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

// Main Task interface
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  price?: number;
  budget?: number;
  created_at: string;
  updated_at?: string;
  deadline?: string;
  completion_date?: string;
  assigned_at?: string;
  estimated_time?: number;
  custom_time?: string;
  task_completion_hours?: number;
  created_by: string;
  assigned_to?: string | null;
  client_profile?: any;
  provider_profile?: any;
  location?: {
    address?: string;
    lat?: number;
    lng?: number;
    display_name?: string;
  };
  building_name?: string;
  locality?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  distance?: number;
  category?: string;
  categories?: string[];
  priority?: TaskPriority;
  urgent?: boolean;
  skill_requirements?: string[];
  context_flags?: {
    [key: string]: any;
  };
  payment_method?: string;
  task_photos?: string[];
  task_visibility_hours?: number;
  has_pending_acceptances?: boolean;
}

// Payload for creating new tasks
export interface CreateTaskPayload {
  title: string;
  description?: string;
  budget: number;
  deadline?: string;
  location?: {
    address?: string;
    lat?: number;
    lng?: number;
  };
  created_by?: string;  // Optional, service will grab from auth if not provided
  metadata?: {
    categories?: string[];
    priority?: 'low' | 'medium' | 'high';
    urgent?: boolean;
    estimatedTime?: number;
    customTime?: number;
    taskVisibilityHours?: number;
    taskCompletionHours?: number;
    skillRequirements?: string[];
    contextFlags?: Record<string, boolean>;
    paymentMethod?: 'online' | 'cash';
    taskPhotos?: string[];
    buildingName?: string;
    locality?: string;
  };
}

// Helper class that implements Task and provides useful methods
export class TaskModel implements Task {
  id: string = '';
  title: string = '';
  description: string = '';
  created_by: string = '';
  assigned_to?: string;
  status: TaskStatus = 'pending';
  category: TaskCategory = '';
  urgency: TaskUrgency = 'medium';
  budget: number = 0;
  price?: number;
  location: Location = { lat: 0, lng: 0 };
  created_at: string = '';
  updated_at: string = '';
  distance?: number;
  categories?: string[] = [];
  urgent?: boolean = false;
  priority?: 'low' | 'medium' | 'high' = 'medium';
  deadline?: string;
  estimated_time?: number;
  skill_requirements?: string[] = [];
  payment_method?: string = 'online';
  task_visibility_hours?: number;
  task_completion_hours?: number;
  task_photos?: string[] = [];
  building_name?: string;
  coordinates?: { latitude: number; longitude: number };
  completion_date?: string;
  assigned_at?: string;
  custom_time?: string;
  client_profile?: any;
  provider_profile?: any;
  locality?: string;
  context_flags?: {
    [key: string]: any;
  };
  has_pending_acceptances?: boolean;
  
  constructor(data?: Partial<Task>) {
    if (data) {
      Object.assign(this, data);
    }
  }
  
  static isTask(obj: any): obj is Task {
    return obj && typeof obj === 'object' && 'id' in obj && 'title' in obj;
  }
}

// Export default model for Expo Router compatibility
export default TaskModel; 