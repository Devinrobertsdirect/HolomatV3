import React, { useState, useEffect } from 'react';
import '../styles/settings-panel.css';
import { useSettings } from '../contexts/SettingsContext';
import realtimeVoiceService from '../services/realtimeVoiceService';

const SettingsPanel = ({ isOpen, onClose }) => {
  // Animation state for opening and closing transitions
  const [isVisible, setIsVisible] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  
  // Get settings from context instead of directly from service
  const { settings, updateSettings, updateStatus, restartRequired } = useSettings();
  
  // Local state for form values
  const [formValues, setFormValues] = useState(settings);
  
  // Track if voice assistant is active
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  // State for API key management
  const [apiKey, setApiKey] = useState('');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  // State for Hugging Face text-to-3D token
  const [hfToken, setHFToken] = useState('');
  const [hfTokenVisible, setHFTokenVisible] = useState(false);
  const [hfTokenSaved, setHFTokenSaved] = useState(false);
  // State for Hugging Face model ID
  const [hfModelID, setHFModelID] = useState('');
  const [hfModelIDSaved, setHFModelIDSaved] = useState(false);

  // State for system prompt status
  const [systemPromptStatus, setSystemPromptStatus] = useState('idle');
  // State for Bambu Labs account login
  const [bambuEmail, setBambuEmail] = useState('');
  const [bambuPassword, setBambuPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const [bambuCode, setBambuCode] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [bambuAuthStatus, setBambuAuthStatus] = useState(''); // 'success' | 'error'
  const [bambuAuthMessage, setBambuAuthMessage] = useState('');
  
  // Update local form values when settings change
  useEffect(() => {
    setFormValues(settings);
  }, [settings]);
  
  // Check if voice assistant is active
  useEffect(() => {
    setIsVoiceActive(realtimeVoiceService.isActive);
  }, [isOpen]); // Only check when panel opens

  // Load the API key on component mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('openai_api_key') || '';
    setApiKey(savedApiKey);
    setApiKeySaved(!!savedApiKey);
  }, []);
  // Load the HF token when settings panel opens
  useEffect(() => {
    if (isOpen) {
      fetch('/api/hf-config')
        .then(res => res.json())
        .then(data => {
          setHFToken(data.huggingFaceToken || '');
          setHFTokenSaved(!!data.huggingFaceToken);
          setHFModelID(data.modelID || '');
          setHFModelIDSaved(!!data.modelID);
        })
        .catch(err => {
          console.error('Failed to load HF config, falling back to localStorage:', err);
          const storedToken = localStorage.getItem('hf_token') || '';
          const storedModel = localStorage.getItem('hf_model_id') || '';
          setHFToken(storedToken);
          setHFTokenSaved(!!storedToken);
          setHFModelID(storedModel);
          setHFModelIDSaved(!!storedModel);
        });
    }
  }, [isOpen]);
  // Check BambuLab login status when opening settings
  useEffect(() => {
    if (isOpen) {
      fetch('/api/3dprint/token-status')
        .then(res => res.json())
        .then(data => setBambuAuthStatus(data.loggedIn ? 'success' : 'error'))
        .catch(() => setBambuAuthStatus('error'));
    }
  }, [isOpen]);

  // Add listener for settings updates
  useEffect(() => {
    const handleSettingsUpdate = (settings) => {
      if (settings.systemPrompt) {
        setSystemPromptStatus('updated');
        // Reset status after 3 seconds
        setTimeout(() => setSystemPromptStatus('idle'), 3000);
      }
    };
    
    realtimeVoiceService.addSettingsUpdateListener(handleSettingsUpdate);
    
    return () => {
      realtimeVoiceService.removeSettingsUpdateListener(handleSettingsUpdate);
    };
  }, []);

  // Animation sequence handling
  useEffect(() => {
    if (isOpen) {
      // First show the container
      setIsVisible(true);
      
      // Then show the outline
      setTimeout(() => {
        setShowOutline(true);
      }, 10);
      
      // After the outline is drawn, show panel
      const timer1 = setTimeout(() => {
        setIsPanelVisible(true);
        
        // Hide outline after it's done its job
        setTimeout(() => {
          setShowOutline(false);
        }, 400);
      }, 900);
      
      // After panel appears, show content
      const timer2 = setTimeout(() => {
        setIsContentVisible(true);
      }, 1200);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    } else {
      // When closing, immediately hide outline and content
      setShowOutline(false);
      setIsContentVisible(false);
      
      // Quick hide of panel after a short delay
      const timer1 = setTimeout(() => {
        setIsPanelVisible(false);
      }, 150);
      
      // Hide container after animation completes
      const timer2 = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [isOpen]);

  // Handle form changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle API key changes
  const handleApiKeyChange = (e) => {
    setApiKey(e.target.value);
    setApiKeySaved(false);
  };

  // Save the API key
  const saveApiKey = () => {
    localStorage.setItem('openai_api_key', apiKey);
    realtimeVoiceService.setApiKey(apiKey);
    setApiKeySaved(true);
    
    // Show a brief "Saved!" message that disappears after 2 seconds
    setTimeout(() => {
      setApiKeySaved(false);
    }, 2000);
  };

  // Toggle API key visibility
  const toggleApiKeyVisibility = () => {
    setApiKeyVisible(!apiKeyVisible);
  };
  // Handle HF token change
  const handleHFTokenChange = e => {
    setHFToken(e.target.value);
    setHFTokenSaved(false);
  };
  // Handle HF model ID change
  const handleHFModelIDChange = e => {
    setHFModelID(e.target.value);
    setHFModelIDSaved(false);
  };
  // Toggle HF token visibility
  const toggleHFTokenVisibility = () => {
    setHFTokenVisible(!hfTokenVisible);
  };
  // Save the HF token and model ID to server
  const saveHFConfigClient = async () => {
    try {
      // Also persist to browser storage for direct client-side calls
      localStorage.setItem('hf_token', hfToken);
      localStorage.setItem('hf_model_id', hfModelID);
      const res = await fetch('/api/hf-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ huggingFaceToken: hfToken, modelID: hfModelID })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Save failed');
      }
      setHFTokenSaved(true);
      setHFModelIDSaved(true);
      setTimeout(() => {
        setHFTokenSaved(false);
        setHFModelIDSaved(false);
      }, 2000);
    } catch (err) {
      console.error('Error saving HF config:', err);
      alert('Failed to save configuration: ' + err.message);
    }
  };
  // Handle verification code submission
  const handleVerifyCode = async () => {
    if (!bambuCode) return;
    setIsVerifyingCode(true);
    setBambuAuthStatus('');
    setBambuAuthMessage('');
    try {
      const res = await fetch('/api/3dprint/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: bambuEmail, code: bambuCode })
      });
      const data = await res.json();
      if (res.ok) {
        setBambuAuthStatus('success');
        setBambuAuthMessage('Verification successful');
        setShowVerifyForm(false);
      } else {
        setBambuAuthStatus('error');
        setBambuAuthMessage(data.error || 'Verification failed');
      }
    } catch (err) {
      setBambuAuthStatus('error');
      setBambuAuthMessage(err.message);
    }
    setIsVerifyingCode(false);
  };
  // Handle Bambu Labs account login (username + password)
  const handleBambuLogin = async () => {
    if (!bambuEmail || !bambuPassword) return;
    setIsLoggingIn(true);
    setBambuAuthStatus('');
    setBambuAuthMessage('');
    setShowVerifyForm(false);
    try {
      const res = await fetch('/api/3dprint/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: bambuEmail, password: bambuPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setBambuAuthStatus('success');
        setBambuAuthMessage('Logged in successfully');
      } else if (res.status === 401 && data.error === 'Verification code required') {
        setBambuAuthStatus('');
        setBambuAuthMessage('Verification code sent to your email');
        setShowVerifyForm(true);
      } else {
        setBambuAuthStatus('error');
        setBambuAuthMessage(data.error || 'Login failed');
      }
    } catch (err) {
      setBambuAuthStatus('error');
      setBambuAuthMessage(err.message);
    }
    setIsLoggingIn(false);
  };

  // Save settings and close panel
  const handleSaveAndClose = () => {
    // Persist voice and general settings
    updateSettings(formValues);
    onClose();
  };

  // Handle system prompt change
  const handleSystemPromptChange = (e) => {
    setSystemPromptStatus('saving');
  };

  const saveSystemPrompt = () => {
    // Your existing save logic
    setSystemPromptStatus('saved');
    
    // Show status for 3 seconds then return to idle
    setTimeout(() => {
      setSystemPromptStatus('idle');
    }, 3000);
  };

  // Don't render anything if not open and not visible
  if (!isOpen && !isVisible) {
    return null;
  }

  // Generate CSS classes for animation states
  const containerClasses = [
    'settings-container',
    isVisible ? 'visible' : '',
    isPanelVisible ? 'panel-visible' : '',
    isContentVisible ? 'content-visible' : '',
    showOutline ? 'show-outline' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {/* Backdrop */}
      <div className="settings-backdrop" onClick={onClose}></div>
      
      {/* SVG Circuit Board Outline Animation */}
      <div className="settings-outline-container">
        <svg width="100%" height="100%" viewBox="0 0 1000 800" preserveAspectRatio="none">
          {/* Upper half path - starts from top left and traces clockwise */}
          <path 
            className="settings-outline-path settings-outline-path-upper"
            d="M 15,0 
               L 475,0 
               L 500,15 
               L 960,15 
               L 960,0 
               L 1000,0 
               L 1000,400"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
          
          {/* Lower half path - starts from bottom right and traces counterclockwise */}
          <path 
            className="settings-outline-path settings-outline-path-lower"
            d="M 1000,400
               L 1000,770 
               L 985,800 
               L 700,800 
               L 680,790 
               L 300,790 
               L 280,800 
               L 15,800 
               L 0,785 
               L 0,15
               L 15,0"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </svg>
        
        {/* Inner glow effect that appears as the outline completes */}
        <div className="settings-panel-glow"></div>
      </div>
      
      {/* Panel */}
      <div className="settings-panel">
        {/* Circuit board decorative elements */}
        <div className="circuit-element circuit-trace-h" style={{ top: '70px', left: '20px', width: '60px' }}></div>
        <div className="circuit-element circuit-trace-h" style={{ top: '120px', right: '40px', width: '80px' }}></div>
        <div className="circuit-element circuit-trace-v" style={{ top: '70px', left: '20px', height: '100px' }}></div>
        <div className="circuit-element circuit-trace-v" style={{ top: '120px', right: '40px', height: '160px' }}></div>
        <div className="circuit-element circuit-connector" style={{ top: '70px', left: '20px' }}></div>
        <div className="circuit-element circuit-connector" style={{ top: '120px', right: '40px' }}></div>
        
        <div className="circuit-element circuit-node" style={{ top: '170px', left: '20px' }}></div>
        <div className="circuit-element circuit-node" style={{ top: '280px', right: '40px' }}></div>
        
        <div className="circuit-element circuit-dot" style={{ top: '50px', left: '80px' }}></div>
        <div className="circuit-element circuit-dot" style={{ top: '100px', right: '80px' }}></div>
        <div className="circuit-element circuit-dot" style={{ top: '210px', left: '50px' }}></div>
        <div className="circuit-element circuit-dot" style={{ bottom: '100px', right: '60px' }}></div>
        
        {/* Header */}
        <div className="settings-panel-header">
          <h2 className="text-xl text-blue-300 font-light tracking-wider">SYSTEM SETTINGS</h2>
          <div onClick={onClose} className="settings-close-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-300">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
        </div>
        
        {/* Panel body */}
        <div className="settings-panel-body">
          {/* Show restart required notification if applicable */}
          {restartRequired && isVoiceActive && (
            <div className="mb-4 p-3 bg-blue-900/30 text-blue-300 border border-blue-500/20 rounded text-xs">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Model change detected. You'll need to restart the voice assistant for this change to take effect.</span>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Voice Assistant Settings */}
            <div className="settings-card">
              {/* Card notches */}
              <div className="settings-card-notch settings-card-notch-tr"></div>
              <div className="settings-card-notch settings-card-notch-bl"></div>
              
              <h3 className="settings-section-label text-blue-400 font-light mb-3 tracking-wider text-sm">VOICE ASSISTANT</h3>
              
              <div className="mb-3">
                <label className="block text-blue-200/70 text-xs mb-1">MODEL</label>
                <select 
                  name="voiceModel" 
                  value={formValues.voiceModel} 
                  onChange={handleChange}
                  className="settings-select"
                >
                  <option value="gpt-4o-mini-realtime-preview">GPT-4o Mini Realtime</option>
                  <option value="gpt-4o-realtime-preview">GPT-4o Realtime</option>
                </select>
                {isVoiceActive && formValues.voiceModel !== settings.voiceModel && (
                  <p className="text-amber-300 text-xs mt-1">Model change will apply on restart.</p>
                )}
              </div>
              
              <div className="mb-3">
                <label className="block text-blue-200/70 text-xs mb-1">VOICE</label>
                <select 
                  name="voiceType" 
                  value={formValues.voiceType} 
                  onChange={handleChange}
                  className="settings-select"
                >
                  <option value="echo">Male (Echo)</option>
                  <option value="alloy">Female (Alloy)</option>
                </select>
                {isVoiceActive && formValues.voiceType !== settings.voiceType && (
                  <p className="text-blue-300 text-xs mt-1">Voice will update immediately.</p>
                )}
              </div>
              
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-blue-200/70 text-xs">SYSTEM PROMPT</label>
                  {isVoiceActive && systemPromptStatus === 'saved' && (
                    <span className="text-green-400 text-xs">Instructions sent</span>
                  )}
                  {isVoiceActive && systemPromptStatus === 'saving' && (
                    <span className="text-amber-300 text-xs">Sending...</span>
                  )}
                </div>
                <textarea 
                  name="systemPrompt" 
                  value={formValues.systemPrompt} 
                  onChange={handleChange}
                  className="settings-select h-24"
                ></textarea>
                {isVoiceActive && formValues.systemPrompt !== settings.systemPrompt && (
                  <p className="text-blue-300 text-xs mt-1">Prompt will update immediately.</p>
                )}
              </div>
            </div>

            {/* Bambu Labs Account Login */}
            <div className="settings-card">
              <div className="settings-card-notch settings-card-notch-tr"></div>
              <div className="settings-card-notch settings-card-notch-bl"></div>
              <h3 className="settings-section-label text-blue-400 font-light mb-3 tracking-wider text-sm">Bambu Labs Account Login</h3>
              {!showVerifyForm ? (
                <>
                  <div className="mb-3">
                    <label className="block text-blue-200/70 text-xs mb-1">Username (Email)</label>
                    <input
                      type="email"
                      value={bambuEmail}
                      onChange={e => setBambuEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="settings-input"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="block text-blue-200/70 text-xs mb-1">Password</label>
                    <input
                      type="password"
                      value={bambuPassword}
                      onChange={e => setBambuPassword(e.target.value)}
                      placeholder="Password"
                      className="settings-input"
                    />
                  </div>
                  <button
                    onClick={handleBambuLogin}
                    disabled={!bambuEmail || !bambuPassword || isLoggingIn}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-400 rounded text-white text-xs disabled:opacity-50"
                  >{isLoggingIn ? 'Logging in...' : 'Login'}</button>
                </>
              ) : (
                <>
                  <div className="mb-3">
                    <label className="block text-blue-200/70 text-xs mb-1">Verification Code</label>
                    <input
                      type="text"
                      value={bambuCode}
                      onChange={e => setBambuCode(e.target.value)}
                      placeholder="123456"
                      className="settings-input"
                    />
                  </div>
                  <button
                    onClick={handleVerifyCode}
                    disabled={!bambuCode || isVerifyingCode}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-400 rounded text-white text-xs disabled:opacity-50"
                  >{isVerifyingCode ? 'Verifying...' : 'Verify Code'}</button>
                </>
              )}
              <div className="text-xs mt-2">
                {bambuAuthStatus === 'success' && <div className="text-green-400">Logged In</div>}
                {bambuAuthStatus === 'error' && <div className="text-red-400">{bambuAuthMessage}</div>}
                {bambuAuthMessage && showVerifyForm && <div className="text-blue-200/80">{bambuAuthMessage}</div>}
              </div>
            </div>
            {/* API Key Section */}
            <div className="settings-card">
              {/* Card notches */}
              <div className="settings-card-notch settings-card-notch-tr"></div>
              <div className="settings-card-notch settings-card-notch-bl"></div>
              
              <h3 className="settings-section-label text-blue-400 font-light mb-3 tracking-wider text-sm">API KEY</h3>
              
              {!apiKey && (
                <div className="mb-3 p-2 bg-amber-700/20 border border-amber-500/30 rounded">
                  <p className="text-amber-300 text-xs">
                    <strong>Required:</strong> Please enter your OpenAI API key to use the voice assistant.
                  </p>
                </div>
              )}
              
              <div className="mb-3">
                <label className="block text-blue-200/70 text-xs mb-1">OPENAI API KEY</label>
                <div className="relative">
                  <input
                    type={apiKeyVisible ? "text" : "password"}
                    value={apiKey}
                    onChange={handleApiKeyChange}
                    placeholder="Enter your OpenAI API key"
                    className="settings-input pr-10 font-mono"
                  />
                  <button
                    onClick={toggleApiKeyVisibility}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-300/70 hover:text-blue-300 text-xs"
                  >
                    {apiKeyVisible ? "HIDE" : "SHOW"}
                  </button>
                </div>
                <p className="text-xs text-blue-200/50 mt-1">
                  Your key is stored locally and never sent to our servers
                </p>
                <p className="text-xs text-blue-200/70 mt-2">
                  You must have access to OpenAI's real-time voice API models
                </p>
              </div>
              
              <div>
                <button 
                  onClick={saveApiKey}
                  className="bg-blue-600/30 hover:bg-blue-500/40 text-blue-300 text-xs py-1 px-3 rounded border border-blue-500/30 transition-all duration-200"
                >
                  {apiKeySaved ? "SAVED!" : "SAVE API KEY"}
                </button>
              </div>
            </div>

            {/* Hugging Face Text-to-3D Token Section */}
            <div className="settings-card">
              <div className="settings-card-notch settings-card-notch-tr"></div>
              <div className="settings-card-notch settings-card-notch-bl"></div>
              <h3 className="settings-section-label text-blue-400 font-light mb-3 tracking-wider text-sm">TEXT-TO-3D TOKEN</h3>
              {/* Model ID Input */}
              <div className="mb-3">
                <label className="block text-blue-200/70 text-xs mb-1">MODEL ID</label>
                <input
                  type="text"
                  value={hfModelID}
                  onChange={handleHFModelIDChange}
                  placeholder="e.g. Tencent/Hunyuan3D-2"
                  className="settings-input font-mono"
                />
                <p className="text-xs text-blue-200/50 mt-1">
                  Hugging Face model identifier for text-to-3D generation
                </p>
              </div>
              {!hfToken && (
                <div className="mb-3 p-2 bg-amber-700/20 border border-amber-500/30 rounded">
                  <p className="text-amber-300 text-xs">
                    <strong>Required:</strong> Please enter your Hugging Face token to enable text-to-3D generation.
                  </p>
                </div>
              )}
              <div className="mb-3">
                <label className="block text-blue-200/70 text-xs mb-1">HUGGING FACE TOKEN</label>
                <div className="relative">
                  <input
                    type={hfTokenVisible ? "text" : "password"}
                    value={hfToken}
                    onChange={handleHFTokenChange}
                    placeholder="Enter your HF token"
                    className="settings-input pr-10 font-mono"
                  />
                  <button
                    onClick={toggleHFTokenVisibility}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-300/70 hover:text-blue-300 text-xs"
                  >
                    {hfTokenVisible ? "HIDE" : "SHOW"}
                  </button>
                </div>
                <p className="text-xs text-blue-200/50 mt-1">
                  Your token is stored on the local server and used for model generation
                </p>
              </div>
              <div>
                <button
                  onClick={saveHFConfigClient}
                  className="bg-blue-600/30 hover:bg-blue-500/40 text-blue-300 text-xs py-1 px-3 rounded border border-blue-500/30 transition-all duration-200"
                >
                  {(hfTokenSaved && hfModelIDSaved) ? "SAVED!" : "SAVE CONFIG"}
                </button>
              </div>
            </div>
            {/* ML Server Section */}
            <div className="settings-card">
              <div className="settings-card-notch settings-card-notch-tr"></div>
              <div className="settings-card-notch settings-card-notch-bl"></div>
              <h3 className="settings-section-label text-blue-400 font-light mb-3 tracking-wider text-sm">Machine Learning Server</h3>
              <div className="mb-3">
                <label className="block text-blue-200/70 text-xs mb-1">ML Server IP Address</label>
                <input
                  type="text"
                  name="mlServerIP"
                  value={formValues.mlServerIP || ''}
                  onChange={handleChange}
                  placeholder="e.g. 192.168.1.42:8000"
                  className="settings-input font-mono"
                />
                <p className="text-xs text-blue-200/50 mt-1">
                  IP address and port of your ML server for the Model Creator app
                </p>
              </div>
            </div>
            {/* About Section */}
            <div className="settings-card">
              {/* Card notches */}
              <div className="settings-card-notch settings-card-notch-tr"></div>
              <div className="settings-card-notch settings-card-notch-bl"></div>
              
              <h3 className="settings-section-label text-blue-400 font-light mb-3 tracking-wider text-sm">ABOUT</h3>
              
              <div className="text-blue-200/70 text-xs leading-relaxed">
                <p className="mb-2">HoloMat V3 with JARVIS Integration</p>
                <p className="mb-2">Version: 3.0.1</p>
                <p>Using OpenAI Real-time Voice API</p>
              </div>
              
              <div className="mt-4">
                <button 
                  className="px-3 py-1.5 bg-blue-900/30 text-blue-300 text-xs rounded border border-blue-500/30 hover:bg-blue-800/40 transition-colors"
                  style={{clipPath: "polygon(0 0, 100% 0, 95% 100%, 5% 100%)"}}
                >
                  CHECK FOR UPDATES
                </button>
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="mt-6 flex justify-end">
            <button 
              className="settings-save-btn"
              onClick={handleSaveAndClose}
            >
              SAVE & CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
