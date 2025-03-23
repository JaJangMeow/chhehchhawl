/**
 * Task related type definitions
 */

// Basic task types
export type TaskStatus = 'pending' | 'assigned' | 'completed' | 'canceled' | 'public';
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
  created_by: string;
  assigned_to?: string;
  status: TaskStatus;
  category: TaskCategory;
  urgency: TaskUrgency;
  budget: number;
  location: Location;
  created_at: string;
  updated_at: string;
  distance?: number;
  // Additional properties
  categories?: string[];
  urgent?: boolean;
  priority?: 'low' | 'medium' | 'high';
  deadline?: string;
  estimated_time?: number;
  skill_requirements?: string[];
  payment_method?: string;
  task_visibility_hours?: number;
  task_completion_hours?: number;
  task_photos?: string[];
  building_name?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
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