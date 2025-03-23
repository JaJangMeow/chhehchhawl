// Simple logger utility to standardize logging behavior
// and enable easy toggling of logs for different environments

const DEBUG_MODE = __DEV__;

export const logger = {
  log: (...args: any[]) => {
    if (DEBUG_MODE) {
      console.log('[LOG]', ...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (DEBUG_MODE) {
      console.warn('[WARN]', ...args);
    }
  },
  
  error: (...args: any[]) => {
    // Always log errors, even in production
    console.error('[ERROR]', ...args);
  },
  
  info: (...args: any[]) => {
    if (DEBUG_MODE) {
      console.info('[INFO]', ...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (DEBUG_MODE) {
      console.debug('[DEBUG]', ...args);
    }
  }
}; 

// Default export
export default logger; 