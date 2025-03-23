/**
 * Format a price value to Indian Rupee currency format
 */
export const formatPrice = (value: number): string => {
  return value.toLocaleString('en-IN');
};

// Default export
export default {
  formatPrice
}; 