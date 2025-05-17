/**
 * Settings service to handle persistence and management of system settings
 */
const SETTINGS_KEY = 'holomatv3_settings';

// Default settings
const defaultSettings = {
  voiceModel: 'gpt-4o-mini-realtime-preview',
  voiceType: 'echo',
  systemPrompt: 'You are JARVIS, an AI assistant integrated with the HoloMat interface.',
  animationSpeed: 1,
  themeIntensity: 0.8,
  notifications: true,
  systemSounds: false,
  dataCollection: false,
  // IP address (and optional port) of the ML server for model creation
  mlServerIP: '',
  lastUpdated: new Date().toISOString()
};

// Load settings from local storage
const loadSettings = () => {
  try {
    const storedSettings = localStorage.getItem(SETTINGS_KEY);
    if (storedSettings) {
      const parsedSettings = JSON.parse(storedSettings);
      console.log("Loaded settings:", parsedSettings);
      return { ...defaultSettings, ...parsedSettings };
    }
    return defaultSettings;
  } catch (error) {
    console.error('Failed to load settings:', error);
    return defaultSettings;
  }
};

// Save settings to local storage
const saveSettings = (settings) => {
  try {
    const updatedSettings = {
      ...settings,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
    console.log("Saved settings:", updatedSettings);
    return true;
  } catch (error) {
    console.error('Failed to save settings:', error);
    return false;
  }
};

// Other functions like applyAnimationSpeed, etc.
const applyAnimationSpeed = () => {};
const applyThemeIntensity = () => {};
const playSystemSound = () => {};
const showNotification = () => {};
const checkForUpdates = async () => ({ hasUpdate: false });

export default {
  loadSettings,
  saveSettings,
  checkForUpdates,
  applyAnimationSpeed,
  applyThemeIntensity,
  playSystemSound,
  showNotification
};
