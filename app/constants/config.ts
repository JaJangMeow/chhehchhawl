import { Platform } from 'react-native';

// Platform-specific values
export const PLATFORM = {
  IS_IOS: Platform.OS === 'ios',
  IS_ANDROID: Platform.OS === 'android',
  TOP_INSET: Platform.OS === 'ios' ? 44 : 24,
  BOTTOM_INSET: Platform.OS === 'ios' ? 34 : 16,
  HEADER_HEIGHT: Platform.OS === 'ios' ? 126 : 110,
  TAB_BAR_HEIGHT: Platform.OS === 'ios' ? 80 : 64,
};

// API Configuration
export const API_CONFIG = {
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  CACHE_TIME: 5 * 60 * 1000, // 5 minutes
};

// Validation Rules
export const VALIDATION_RULES = {
  MIN_PASSWORD_LENGTH: 6,
  MAX_NAME_LENGTH: 50,
  MIN_AGE: 16,
  PHONE_LENGTH: 10,
  AADHAAR_LENGTH: 12,
};

// UI Constants
export const UI_CONFIG = {
  ANIMATION_DURATION: 300,
  BUTTON_HEIGHT: 56,
  INPUT_HEIGHT: 56,
  BORDER_RADIUS: {
    SMALL: 8,
    MEDIUM: 12,
    LARGE: 16,
    EXTRA_LARGE: 24,
  },
  SPACING: {
    TINY: 4,
    SMALL: 8,
    MEDIUM: 16,
    LARGE: 24,
    EXTRA_LARGE: 32,
  },
  ICON_SIZES: {
    TINY: 16,
    SMALL: 20,
    MEDIUM: 24,
    LARGE: 32,
  },
};

// Feature Flags
export const FEATURES = {
  ENABLE_ANALYTICS: true,
  ENABLE_CRASH_REPORTING: true,
  ENABLE_PERFORMANCE_MONITORING: true,
  ENABLE_REMOTE_CONFIG: true,
} as const;

export default {
  PLATFORM,
  API_CONFIG,
  VALIDATION_RULES,
  UI_CONFIG,
  FEATURES,
}; 