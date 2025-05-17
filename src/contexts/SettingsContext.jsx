import React, { createContext, useState, useContext, useEffect } from 'react';
import settingsService from '../services/settingsService';
import realtimeVoiceService from '../services/realtimeVoiceService';

// Create the context with default values
const SettingsContext = createContext({
  settings: {},
  updateSettings: () => {},
  updateStatus: { loading: false, error: null, success: false },
  restartRequired: false,
  checkForUpdates: () => {},
  playSound: () => {},
  showNotification: () => {}
});

// Custom hook for accessing the settings context
export const useSettings = () => useContext(SettingsContext);

// Provider component that wraps the app and provides settings state
export const SettingsProvider = ({ children }) => {
  // Load settings from service
  const [settings, setSettings] = useState(() => settingsService.loadSettings());
  const [updateStatus, setUpdateStatus] = useState({ loading: false, error: null, success: false });
  const [restartRequired, setRestartRequired] = useState(false);

  // Listen for settings updates from the voice service
  useEffect(() => {
    const handleVoiceSettingsUpdate = (updatedSettings) => {
      if (updatedSettings.requiresRestart) {
        setRestartRequired(true);
      }
    };

    // Register the listener when the component mounts
    realtimeVoiceService.addSettingsUpdateListener(handleVoiceSettingsUpdate);

    // Clean up the listener when the component unmounts
    return () => {
      realtimeVoiceService.removeSettingsUpdateListener(handleVoiceSettingsUpdate);
    };
  }, []);

  // Update settings both in local state and persist to storage
  const updateSettings = (newSettings) => {
    // Start with loading state
    setUpdateStatus({ loading: true, error: null, success: false });
    
    try {
      // Update local state with the new settings
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      
      // Save to persistent storage
      settingsService.saveSettings(updatedSettings);
      
      // Update the voice service with new settings if it's running
      realtimeVoiceService.updateSettings(updatedSettings);
      
      // Set success state
      setUpdateStatus({ loading: false, error: null, success: true });
      
      // Clear success state after a short delay
      setTimeout(() => {
        setUpdateStatus(prev => ({ ...prev, success: false }));
      }, 2000);
      
    } catch (error) {
      console.error('Failed to update settings:', error);
      setUpdateStatus({ loading: false, error: error.message, success: false });
    }
  };

  // Check for application updates
  const checkForUpdates = async () => {
    setUpdateStatus({ loading: true, error: null, success: false });
    try {
      const result = await settingsService.checkForUpdates();
      setUpdateStatus({ loading: false, error: null, success: result.hasUpdate });
      return result;
    } catch (error) {
      console.error('Failed to check for updates:', error);
      setUpdateStatus({ loading: false, error: error.message, success: false });
      return { hasUpdate: false, error: error.message };
    }
  };

  // Play a system sound if enabled
  const playSound = (soundName) => {
    if (settings.systemSounds) {
      settingsService.playSystemSound(soundName);
    }
  };

  // Show a notification if enabled
  const showNotification = (message, type = 'info') => {
    if (settings.notifications) {
      settingsService.showNotification(message, type);
      return true;
    }
    return false;
  };

  // Reset the restart required flag
  const clearRestartRequired = () => {
    setRestartRequired(false);
  };

  // Value object provided to consuming components
  const contextValue = {
    settings,
    updateSettings,
    updateStatus,
    restartRequired,
    clearRestartRequired,
    checkForUpdates,
    playSound,
    showNotification
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};
