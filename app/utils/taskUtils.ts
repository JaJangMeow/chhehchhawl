import { Task } from '../types/task';

/**
 * Calculate distance between two coordinates in meters
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI/180; // φ, λ in radians
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return Math.round(R * c); // distance in meters, rounded
};

/**
 * Format distance in a human-readable way
 */
export const formatDistance = (meters: number | undefined): string => {
  if (!meters) return 'Unknown';
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

/**
 * Get time ago from a date in a human-readable format
 */
export const getTimeAgo = (date: string | undefined): string => {
  if (!date) return 'Just now';
  
  const now = new Date();
  const taskDate = new Date(date);
  const diffMs = now.getTime() - taskDate.getTime();
  
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 60) return `${diffMins}min ago`;
  if (diffHrs < 24) return `${diffHrs}hr ago`;
  return `${diffDays}d ago`;
};

/**
 * Get color based on task urgency/priority
 */
export const getUrgencyColor = (taskOrUrgency: Task | string): string => {
  // Check if input is a Task object or string
  if (taskOrUrgency && typeof taskOrUrgency === 'object') {
    // Safe access to properties using optional chaining
    const task = taskOrUrgency as Task;
    if (task?.urgent) return '#F44336'; // Red for urgent
    if (task?.priority === 'high') return '#F44336'; // Red for high priority
    if (task?.priority === 'medium') return '#FFA726'; // Yellow/Orange for medium
    return '#4CAF50'; // Green for low/normal priority
  }
  
  // If input is a string (urgency level)
  const urgency = taskOrUrgency as string;
  if (urgency === 'high') return '#F44336'; // Red
  if (urgency === 'medium') return '#FFA726'; // Yellow/Orange
  return '#4CAF50'; // Green for low/normal
};

/**
 * Truncate description to a specified length with ellipsis
 */
export const truncateDescription = (description: string | undefined, maxLength: number = 80): string => {
  if (!description) return '';
  return description.length > maxLength 
    ? description.substring(0, maxLength) + '...' 
    : description;
};

/**
 * Get status color based on task status
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending':
      return '#FFA726'; // Orange
    case 'assigned':
      return '#29B6F6'; // Blue
    case 'completed':
      return '#66BB6A'; // Green
    default:
      return '#EF5350'; // Red (cancelled, etc.)
  }
};

/**
 * Format task status for display (capitalize, replace underscores)
 */
export const formatStatus = (status: string): string => {
  return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Default export with all utility functions
export default {
  calculateDistance,
  formatDistance,
  getTimeAgo,
  getUrgencyColor,
  truncateDescription,
  getStatusColor,
  formatStatus
}; 