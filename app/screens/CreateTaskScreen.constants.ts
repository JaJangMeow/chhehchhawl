import { 
  AlertCircle, 
  Truck,
  Wrench,
  PawPrint,
  Hourglass
} from 'lucide-react-native';

// Available task categories
export const TASK_CATEGORIES = [
  { id: 'home', label: 'Home' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'errands', label: 'Errands' },
  { id: 'tech', label: 'Tech Support' },
  { id: 'education', label: 'Education' },
  { id: 'health', label: 'Health & Wellness' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'other', label: 'Other' }
];

// Task priorities
export const TASK_PRIORITIES = [
  { id: 'low', label: 'Low', color: '#4CAF50' },
  { id: 'medium', label: 'Medium', color: '#FFC107' },
  { id: 'high', label: 'High', color: '#F44336' }
];

// Quick time options
export const TIME_OPTIONS = [
  { value: 10, label: '10 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 0, label: 'Custom' }
];

// Task context options
export const TASK_CONTEXT_OPTIONS = [
  { id: 'requires_vehicle', label: 'Might require a scooter', icon: Truck },
  { id: 'heavy_lifting', label: 'Requires lifting heavy items', icon: Wrench },
  { id: 'pet_friendly', label: 'Pet-friendly Tasker required', icon: PawPrint },
  { id: 'strict_deadline', label: 'Strict deadline', icon: Hourglass },
  { id: 'requires_tools', label: 'May require minor tools', icon: Wrench }
];

// Creation steps
export const STEPS = ['Task Basics', 'Task Details', 'Preview'];

// Type guard
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

// Task form data interface
export interface TaskFormData {
  title: string;
  description?: string;
  budget?: number;
  deadline?: string;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  categories: string[];
  priority?: string;
  urgent?: boolean;
  manualAddress?: string;
  buildingName?: string;
  locality?: string;
  contextFlags?: Record<string, boolean>;
  estimatedTime?: number;
  customTime?: number;
  taskPhotos?: string[];
  taskCompletionHours?: number;
  taskVisibilityHours?: number;
  skillRequirements?: string[];
  paymentMethod?: 'cash' | 'online';
}

// Default export
export default {
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TIME_OPTIONS,
  TASK_CONTEXT_OPTIONS,
  STEPS,
  isString
}; 