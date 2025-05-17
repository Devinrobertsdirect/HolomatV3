/**
 * Shared utilities for service modules
 */

// Safe console logging for development only
export const logInfo = (message, data) => {
  if (process.env.NODE_ENV !== 'production') {
    if (data) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }
};

export const logError = (message, error) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(message, error);
  }
  // In production, you could send errors to a monitoring service
};

// Local storage helpers with error handling
export const getFromStorage = (key, defaultValue = null) => {
  try {
    const value = localStorage.getItem(key);
    return value !== null ? value : defaultValue;
  } catch (error) {
    logError(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

export const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    logError(`Error saving ${key} to localStorage:`, error);
    return false;
  }
};
