/**
 * Format a price value to Indian Rupee currency format
 * @param value The number to format
 * @param includeSymbol Whether to include the ₹ symbol (default: true)
 * @returns Formatted price string
 */
export const formatPrice = (value?: number | null, includeSymbol: boolean = true): string => {
  if (value === undefined || value === null) return includeSymbol ? '₹0' : '0';
  const formatted = value.toLocaleString('en-IN');
  return includeSymbol ? `₹${formatted}` : formatted;
};

// Default export
export default {
  formatPrice
}; 