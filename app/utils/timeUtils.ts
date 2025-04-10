import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

/**
 * Format a date relative to the current time
 * - Less than 24 hours: "2 hours ago", "5 minutes ago", etc.
 * - Today: "Today at 2:30 PM"
 * - Yesterday: "Yesterday at 2:30 PM"
 * - Within last week: "Monday at 2:30 PM", etc.
 * - Older: "Mar 15, 2023"
 */
export const formatRelativeTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    
    // If invalid date
    if (isNaN(date.getTime())) {
      return '';
    }
    
    // Within last day
    const minutesAgo = (Date.now() - date.getTime()) / (1000 * 60);
    if (minutesAgo < 60) {
      // For very recent messages (less than an hour ago)
      return formatDistanceToNow(date, { addSuffix: true });
    }
    
    // Today
    if (isToday(date)) {
      return format(date, "'Today at' h:mm a");
    }
    
    // Yesterday
    if (isYesterday(date)) {
      return format(date, "'Yesterday at' h:mm a");
    }
    
    // Within last week (show day name)
    const daysAgo = minutesAgo / (60 * 24);
    if (daysAgo < 7) {
      return format(date, "EEEE 'at' h:mm a");
    }
    
    // Older (show date)
    return format(date, 'MMM d, yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString || '';
  }
};

export default {
  formatRelativeTime
}; 