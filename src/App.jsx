import React, { useState, useEffect, useMemo, useRef } from 'react';
import AppCarousel from './components/AppCarousel';
import AIResponse from './components/AIResponse';
import SettingsPanel from './components/SettingsPanel';
import NotificationSystem from './components/NotificationSystem';
import AppContainer from './components/AppContainer';
import IntroScreen from './components/IntroScreen';
import realtimeVoiceService from './services/realtimeVoiceService';
import audioAnalyzerService from './services/audioAnalyzerService';
import VoiceVisualizer from './components/VoiceVisualizer';
import ReactiveRing from './components/ReactiveRing';
import { apps } from './data/apps';
import settingsService from './services/settingsService';
// Import consolidated styles instead of individual files
import './styles/main.css';
import './styles/intro-screen.css';

function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [launchedApp, setLaunchedApp] = useState(null);
  const [systemTime, setSystemTime] = useState(new Date());
  const [cpuLoad, setCpuLoad] = useState(42);
  const [memoryUsage, setMemoryUsage] = useState(3.2);
  const [networkSpeed, setNetworkSpeed] = useState(215);
  const [notifications, setNotifications] = useState(3);
  const [micActive, setMicActive] = useState(false);
  const [outlineVisible, setOutlineVisible] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [responseVisible, setResponseVisible] = useState(false);
  const [connectionState, setConnectionState] = useState("idle");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const volumeThreshold = 0.05; // Threshold to detect speech
  const inactiveSpeechTimeout = useRef(null);
  const outlineRef = useRef(null);

  // Clean up console.log statements in production
  const logInfo = (message, data) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(message, data);
    }
  };

  // Enhanced toggleMic with voice assistant integration
  const toggleMic = async () => {
    const newMicState = !micActive;
    
    if (newMicState) {
      setOutlineVisible(true);
      
      requestAnimationFrame(() => {
        if (outlineRef.current) {
          outlineRef.current.classList.remove('outline-active', 'outline-pulsing', 'outline-retracting', 'step-2', 'step-3');
          void outlineRef.current.offsetWidth;
          outlineRef.current.classList.add('outline-active');
          setTimeout(() => {
            if (outlineRef.current) {
              outlineRef.current.classList.add('outline-pulsing');
            }
          }, 1300);
        }
      });
      
      setConnectionState("connecting");
      
      try {
        const settings = settingsService.loadSettings();
        
        logInfo("Using voice settings:", {
          model: settings.voiceModel,
          voice: settings.voiceType,
          prompt: settings.systemPrompt
        });
        
        const success = await realtimeVoiceService.startVoiceAssistant(
          {
            model: settings.voiceModel,
            initial_prompt: settings.systemPrompt,
            voice: settings.voiceType
          },
          handleResponse,
          handleError
        );
        
        if (success) {
          setMicActive(true);
          setResponseVisible(true);
          setConnectionState("connected");
        } else {
          setConnectionState("error");
          setTimeout(() => {
            startRetractionAnimation();
          }, 1000);
        }
      } catch (error) {
        console.error('Failed to start voice assistant:', error);
        setConnectionState("error");
        setTimeout(() => {
          startRetractionAnimation();
        }, 1000);
      }
    } else {
      setMicActive(false);
      setConnectionState("idle");
      await realtimeVoiceService.stopVoiceAssistant();
      startRetractionAnimation();
    }
  };
  
  const startRetractionAnimation = () => {
    if (!outlineRef.current) return;
    
    outlineRef.current.classList.remove('outline-active', 'outline-pulsing');
    outlineRef.current.classList.add('outline-retracting');
    
    setTimeout(() => {
      if (!outlineRef.current) return;
      outlineRef.current.classList.add('step-2');
      
      setTimeout(() => {
        if (!outlineRef.current) return;
        outlineRef.current.classList.add('step-3');
        
        setTimeout(() => {
          if (!outlineRef.current) return;
          outlineRef.current.classList.remove('outline-active', 'outline-pulsing', 'outline-retracting', 'step-2', 'step-3');
          setOutlineVisible(false);
          if (!micActive) {
            setResponseVisible(false);
            setTimeout(() => setAiResponse(''), 400);
          }
        }, 700);
      }, 500);  
    }, 500);
  };

  const handleResponse = (response) => {
    if (response.type === 'text') {
      setAiResponse(response.content);
    }
  };

  const handleError = (errorMessage) => {
    logInfo("Voice assistant error:", errorMessage);
    
    if (window.notify) {
      window.notify({
        title: 'Connection Failed',
        message: errorMessage,
        type: 'error',
        duration: 8000
      });
    }
  };

  const handleVolumeChange = (volume) => {
    const scaledVolume = Math.min(volume * 1.2, 1);
    setVoiceVolume(scaledVolume);
    
    if (volume > volumeThreshold) {
      setIsUserSpeaking(true);
      
      if (inactiveSpeechTimeout.current) {
        clearTimeout(inactiveSpeechTimeout.current);
      }
      
      inactiveSpeechTimeout.current = setTimeout(() => {
        setIsUserSpeaking(false);
      }, 300);
    }
  };

  useEffect(() => {
    if (micActive) {
      logInfo("Setting up voice visualization");
      
      realtimeVoiceService.setMediaStreamCallback((mediaStream) => {
        if (mediaStream) {
          logInfo("Media stream available, initializing analyzer");
          const success = audioAnalyzerService.initAnalyzer(mediaStream, handleVolumeChange);
          if (!success) {
            console.error("Failed to initialize audio analyzer");
          }
        } else {
          console.error("No media stream available for visualization");
        }
      });
    } else {
      audioAnalyzerService.stopAnalyzing();
      setVoiceVolume(0);
      setIsUserSpeaking(false);
      
      if (inactiveSpeechTimeout.current) {
        clearTimeout(inactiveSpeechTimeout.current);
        inactiveSpeechTimeout.current = null;
      }
    }
    
    return () => {
      audioAnalyzerService.stopAnalyzing();
      
      if (inactiveSpeechTimeout.current) {
        clearTimeout(inactiveSpeechTimeout.current);
        inactiveSpeechTimeout.current = null;
      }
    };
  }, [micActive]);

  const stars = useMemo(() => {
    return Array.from({ length: 150 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      width: `${Math.random() * 2 + 0.5}px`,
      height: `${Math.random() * 2 + 0.5}px`,
      opacity: Math.random() * 0.9,
      animationDelay: `${Math.random() * 8}s`,
      animationDuration: `${Math.random() * 5 + 3}s`
    }));
  }, []);

  const particles = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      width: `${Math.random() * 40 + 20}px`,
      height: `${Math.random() * 1 + 0.5}px`,
      opacity: Math.random() * 0.07 + 0.02,
      transform: `rotate(${Math.random() * 360}deg)`,
      animationDuration: `${Math.random() * 20 + 15}s`
    }));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(new Date());

      setCpuLoad(prev => {
        const target = Math.floor(Math.random() * 25) + 30;
        return prev + (target - prev) * 0.3;
      });
      setMemoryUsage(prev => {
        const target = Math.random() * 1.5 + 2.5;
        return +(prev + (target - prev) * 0.3).toFixed(1);
      });
      setNetworkSpeed(prev => {
        const target = Math.floor(Math.random() * 100) + 180;
        return Math.round(prev + (target - prev) * 0.3);
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = systemTime.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const formattedDate = systemTime.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const enhancedApps = apps.map(app => ({
    ...app,
    onClick: () => {
      logInfo(`Selected: ${app.name}`);
      setSelectedApp(app);
    }
  }));

  const toggleSettings = () => {
    setSettingsOpen(!settingsOpen);
  };
  
  const closeSelectedApp = () => {
    setSelectedApp(null);
    setLaunchedApp(null);
  };

  const launchApp = () => {
    if (selectedApp) {
      setLaunchedApp(selectedApp);
    }
  };
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Intro Screen */}
      {showIntro && <IntroScreen onComplete={() => setShowIntro(false)} />}
      
      <NotificationSystem />
      
      {/* App container for launched app */}
      {launchedApp && <AppContainer app={launchedApp} onClose={closeSelectedApp} />}
      
      {/* App preview overlay */}
      {selectedApp && !launchedApp && (
        <div className="fixed inset-0 z-20 flex items-center justify-center p-4">
          {/* Semi-transparent backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn" 
            onClick={() => setSelectedApp(null)}
          ></div>
          
          <div className="w-full max-w-md panel-premium rounded-lg overflow-hidden transform transition-all duration-300 relative z-10 animate-scaleIn">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/30 to-transparent"></div>
            
            <div className="px-5 py-4 border-b border-blue-900/30">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center panel-icon-premium">
                  <img src={selectedApp.icon} alt={selectedApp.name} className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-light text-blue-100">{selectedApp.name}</h3>
                  <p className="text-sm text-blue-400/80">{selectedApp.category}</p>
                </div>
              </div>
            </div>
            
            <div className="px-5 py-4">
              <p className="text-blue-200/70 text-sm leading-relaxed animate-fadeSlideUp" style={{animationDelay: '0.1s'}}>{selectedApp.description}</p>
              
              <div className="mt-3 py-2 px-3 bg-blue-900/10 rounded text-xs text-blue-300/60 border border-blue-900/20 animate-fadeSlideUp" style={{animationDelay: '0.2s'}}>
                <div className="flex justify-between">
                  <span>Status</span>
                  <span className="text-blue-300/90">Ready</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Response time</span>
                  <span className="text-blue-300/90">12ms</span>
                </div>
              </div>
              
              <div className="mt-5 flex justify-between items-center">
                <button 
                  className="text-blue-400/80 text-xs hover:text-blue-300 transition-colors tracking-wide animate-fadeSlideUp"
                  style={{animationDelay: '0.3s'}}
                  onClick={() => setSelectedApp(null)}
                >
                  DISMISS
                </button>
                <button 
                  className="px-5 py-2 premium-button rounded text-blue-100 text-sm tracking-wide transition-all duration-200 uppercase animate-glowPulse"
                  style={{animationDelay: '0.4s'}}
                  onClick={launchApp}
                >
                  Launch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <svg style={{position: 'absolute', width: 0, height: 0}}>
        <filter id="glow">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="1.5" />
          </feComponentTransfer>
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </svg>
      
      <div 
        ref={outlineRef} 
        className={`screen-outline ${outlineVisible ? 'visible' : 'hidden'}`}
      >
        <div className="outline-segment outline-horizontal outline-top">
          {outlineVisible && (
            <>
              {/* Top particles moving left to right (clockwise) */}
              <div className="outline-particle" style={{
                animationName: 'move-particle-horizontal',
                animationDuration: '1.8s',
                animationIterationCount: 'infinite'
              }}></div>
              <div className="outline-particle" style={{
                animationName: 'move-particle-horizontal',
                animationDuration: '2.5s',
                animationDelay: '0.3s',
                animationIterationCount: 'infinite'
              }}></div>
              <div className="outline-particle" style={{
                animationName: 'move-particle-horizontal',
                animationDuration: '2.2s',
                animationDelay: '0.7s',
                animationIterationCount: 'infinite'
              }}></div>
            </>
          )}
        </div>
        
        <div className="outline-segment outline-vertical outline-right">
          {outlineVisible && (
            <>
              {/* Right particles moving top to bottom (clockwise) */}
              <div className="outline-particle" style={{
                animationName: 'move-particle-vertical',
                animationDuration: '2.5s',
                animationIterationCount: 'infinite'
              }}></div>
              <div className="outline-particle" style={{
                animationName: 'move-particle-vertical',
                animationDuration: '2.0s',
                animationDelay: '0.4s',
                animationIterationCount: 'infinite'
              }}></div>
            </>
          )}
        </div>
        
        <div className="outline-segment outline-horizontal outline-bottom">
          {outlineVisible && (
            <>
              {/* Bottom particles moving right to left (clockwise) */}
              <div className="outline-particle" style={{
                animationName: 'move-particle-horizontal-reverse',
                animationDuration: '2.2s',
                animationIterationCount: 'infinite'
              }}></div>
              <div className="outline-particle" style={{
                animationName: 'move-particle-horizontal-reverse',
                animationDuration: '3.5s',
                animationDelay: '0.7s',
                animationIterationCount: 'infinite'
              }}></div>
            </>
          )}
        </div>
        
        <div className="outline-segment outline-vertical outline-left">
          {outlineVisible && (
            <>
              {/* Left particles moving bottom to top (clockwise) */}
              <div className="outline-particle" style={{
                animationName: 'move-particle-vertical-reverse',
                animationDuration: '2.8s',
                animationIterationCount: 'infinite'
              }}></div>
              <div className="outline-particle" style={{
                animationName: 'move-particle-vertical-reverse',
                animationDuration: '2.3s',
                animationDelay: '0.5s',
                animationIterationCount: 'infinite'
              }}></div>
            </>
          )}
        </div>
        
        <div className="outline-origin"></div>
      </div>
      
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-blue-950/5 to-black"></div>
        
        <div className="absolute top-0 left-1/3 w-1/3 h-1/4 bg-blue-900/5 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-0 right-1/3 w-1/3 h-1/4 bg-blue-800/5 blur-[150px] rounded-full"></div>
        <div className="absolute top-1/2 left-1/4 w-1/5 h-1/5 bg-blue-600/3 blur-[120px] rounded-full animate-pulse-slow"></div>
        <div className="absolute bottom-1/3 right-1/5 w-1/6 h-1/6 bg-indigo-900/3 blur-[100px] rounded-full animate-pulse-slow"></div>
        
        <div className="stars-field opacity-60">
          {stars.map((star) => (
            <div 
              key={star.id}
              className="star"
              style={{
                left: star.left,
                top: star.top,
                width: star.width,
                height: star.height,
                opacity: star.opacity,
                animationDelay: star.animationDelay,
                animationDuration: star.animationDuration
              }}
            ></div>
          ))}
        </div>
        
        <div className="absolute top-[15%] right-[10%] w-[120px] h-[80px] rounded-full bg-blue-900/10 blur-[50px] opacity-20 transform rotate-45"></div>
        <div className="absolute bottom-[20%] left-[15%] w-[150px] h-[100px] rounded-full bg-indigo-800/10 blur-[60px] opacity-15 transform -rotate-30"></div>
        
        <div className="absolute inset-0 opacity-5" 
             style={{
               backgroundImage: `
                 linear-gradient(rgba(59, 130, 246, 0.2) 1px, transparent 1px),
                 linear-gradient(90deg, rgba(59, 130, 246, 0.2) 1px, transparent 1px)
               `,
               backgroundSize: '60px 60px',
               backgroundPosition: 'center',
               perspective: '1000px',
               transform: 'rotateX(60deg) translateY(100px) scale(1.5)',
               transformOrigin: 'center center'
             }}>
        </div>
        
        <div className="absolute inset-0 scan-lines opacity-3"></div>
        
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
        <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
        <div className="absolute inset-y-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-blue-500/10 to-transparent"></div>
        <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-blue-500/10 to-transparent"></div>
        
        <div className="particles-container">
          {particles.map((particle) => (
            <div 
              key={particle.id}
              className="particle"
              style={{
                left: particle.left,
                top: particle.top,
                width: particle.width,
                height: particle.height,
                opacity: particle.opacity,
                transform: particle.transform,
                boxShadow: `0 0 10px rgba(59, 130, 246, 0.3)`,
                background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.2), transparent)',
                animationDuration: particle.animationDuration
              }}
            ></div>
          ))}
        </div>
      </div>
      
      <div className="fixed right-6 top-6 z-20 pointer-events-none">
        <div className="flex space-x-6">
          <div className="w-48 h-auto panel-premium rounded p-4 pointer-events-auto">
            <div className="flex justify-between items-center mb-3">
              <div className="text-blue-300/80 text-sm">{formattedDate}</div>
              <div className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-500/80 rounded-full animate-pulse mr-1.5"></div>
                <div className="text-blue-300/60 text-xs">SYNCED</div>
              </div>
            </div>
            <div className="text-3xl text-blue-100 tracking-wide text-center">
              {formattedTime.split(':').slice(0, 2).join(':')}
              <span className="text-blue-400/60 text-base ml-1">{formattedTime.split(':')[2]}</span>
            </div>
            <div className="h-px w-full bg-blue-500/10 my-3"></div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-blue-400/60">CPU LOAD</span>
                  <span className="text-blue-300">{Math.round(cpuLoad)}%</span>
                </div>
                <div className="h-1.5 w-full bg-blue-900/30 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500/50 rounded-full" style={{width: `${cpuLoad}%`}}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-blue-400/60">MEMORY</span>
                  <span className="text-blue-300">{memoryUsage}GB</span>
                </div>
                <div className="h-1.5 w-full bg-blue-900/30 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-400/50 rounded-full" style={{width: `${(memoryUsage/8)*100}%`}}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-blue-400/60">NETWORK</span>
                  <span className="text-blue-300">{networkSpeed} KB/s</span>
                </div>
                <div className="h-1.5 w-full bg-blue-900/30 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400/50 rounded-full" style={{width: `${(networkSpeed/500)*100}%`}}></div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between mt-4">
              <button 
                className={`w-10 h-10 rounded-full bg-blue-900/30 flex items-center justify-center text-blue-300 hover:bg-blue-800/40 transition-colors ${settingsOpen ? 'bg-blue-800/60' : ''}`}
                onClick={toggleSettings}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </button>
              <div className="relative">
                <button className="w-10 h-10 rounded-full bg-blue-900/30 flex items-center justify-center text-blue-300 hover:bg-blue-800/40 transition-colors">
                  <span className="text-xs">NOTIF</span>
                </button>
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 text-xs flex items-center justify-center">{notifications}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col min-h-screen relative z-10">
        <header className="pt-6 pb-2">
          <div className="absolute top-2 left-0 right-0 flex justify-center px-6 text-blue-400/60 text-xs">
            <div className="flex items-center">
              <span className="w-1 h-1 bg-blue-400/60 rounded-full mr-1.5 animate-pulse"></span>
              SYSTEM OPERATIONAL
            </div>
          </div>
          
          <div className="text-center mt-4">
            <div className="inline-block relative">
              <h1 className="text-3xl font-light tracking-wider text-center text-transparent bg-clip-text bg-gradient-to-b from-blue-100 to-blue-600">
                J.A.R.V.I.S
              </h1>
              <div className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent"></div>
            </div>
            <p className="text-blue-400/60 text-xs tracking-wider mt-1">JUST A RATHER VERY INTELLIGENT SYSTEM</p>
            
            <div className="flex justify-center mt-3">
              <div className="w-16 h-px bg-blue-900/50 mx-1"></div>
              <div className="w-2 h-px bg-blue-500/80 mx-1 animate-pulse"></div>
              <div className="w-8 h-px bg-blue-900/50 mx-1"></div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-4xl relative">
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-[200px] h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
            
            <div className="absolute top-0 left-0 w-16 h-16 pointer-events-none">
              <div className="absolute top-0 left-0 w-4 h-[1px] bg-blue-500/40"></div>
              <div className="absolute top-0 left-0 h-4 w-[1px] bg-blue-500/40"></div>
            </div>
            <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
              <div className="absolute top-0 right-0 w-4 h-[1px] bg-blue-500/40"></div>
              <div className="absolute top-0 right-0 h-4 w-[1px] bg-blue-500/40"></div>
            </div>
            
            <div className="absolute top-[-45px] left-1/2 transform -translate-x-1/2 z-20">
              <div className="relative">
                <div className="absolute bottom-[35px] left-1/2 transform -translate-x-1/2 w-[2px] h-[30px] bg-gradient-to-b from-blue-500/90 to-transparent"></div>
                <div className="absolute bottom-[35px] left-1/2 transform -translate-x-1/2 rotate-[-25deg] w-[2px] h-[25px] bg-gradient-to-b from-blue-500/70 to-transparent"></div>
                <div className="absolute bottom-[35px] left-1/2 transform -translate-x-1/2 rotate-[25deg] w-[2px] h-[25px] bg-gradient-to-b from-blue-500/70 to-transparent"></div>
                
                <div 
                  className={`pristine-mic-button w-[85px] h-[85px] rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ${
                    micActive 
                      ? 'mic-active voice-active' 
                      : connectionState === "connecting" 
                        ? 'mic-connecting' 
                        : 'mic-inactive'
                  }`}
                  onClick={toggleMic}
                >
                  <div className={`relative w-full h-full rounded-full overflow-hidden flex items-center justify-center ${micActive ? 'mic-active-inner' : connectionState === "connecting" ? 'mic-connecting-inner' : 'mic-inactive-inner'}`}>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`w-12 h-12 ${micActive ? 'text-blue-100' : connectionState === "connecting" ? 'text-blue-200/70 animate-pulse' : 'text-blue-300'} transition-all duration-300 relative z-10`}
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    </svg>
                    
                    <div className="absolute inset-0 mic-inner-reflection pointer-events-none"></div>
                    
                    {connectionState === "connecting" && (
                      <div className="absolute inset-[-8px] rounded-full border-2 border-blue-500/30 border-t-blue-500/80 animate-spin"></div>
                    )}
                    
                    {micActive && (
                      <VoiceVisualizer 
                        isActive={micActive} 
                        volume={voiceVolume} 
                      />
                    )}
                  </div>
                  
                  {micActive && (
                    <>
                      <ReactiveRing
                        inset="-6px"
                        borderStyle="2px solid rgba(59, 130, 246, 0.6)"
                        volume={voiceVolume}
                        delay={0.2}
                        baseOpacity={0.7}
                        volumeImpact={0.25}
                      />
                      <ReactiveRing
                        inset="-18px"
                        borderStyle="2px solid rgba(59, 130, 246, 0.5)"
                        volume={voiceVolume}
                        delay={0.4}
                        baseOpacity={0.6}
                        volumeImpact={0.2}
                      />
                      <ReactiveRing
                        inset="-30px"
                        borderStyle="1px solid rgba(59, 130, 246, 0.4)"
                        volume={voiceVolume}
                        delay={0.6}
                        baseOpacity={0.5}
                        volumeImpact={0.15}
                      />
                    </>
                  )}
                  
                  {connectionState === "connecting" && (
                    <div className="absolute -bottom-2 flex space-x-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500/70 animate-bounce" style={{ animationDelay: '0s' }}></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500/70 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500/70 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  )}

                  {micActive && (
                    <>
                      <div className="absolute -top-5 -right-3 w-4 h-4 bg-blue-500/40 rounded-full blur-sm animate-pulse-slow"></div>
                      <div className="absolute -bottom-4 -left-2 w-3 h-3 bg-blue-500/40 rounded-full blur-sm animate-pulse-slow" style={{animationDelay: '0.5s'}}></div>
                      <div className="absolute top-3 -right-6 w-2 h-2 bg-blue-500/30 rounded-full blur-sm animate-pulse-slow" style={{animationDelay: '1s'}}></div>
                    </>
                  )}
                </div>
                
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center">
                  <div className={`flex items-center justify-center ${
                    micActive 
                      ? 'text-blue-300' 
                      : connectionState === "connecting"
                        ? 'text-blue-400/70' 
                        : connectionState === "error"
                          ? 'text-red-400/70'
                          : 'text-blue-500/40'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      micActive 
                        ? 'bg-blue-400 animate-pulse' 
                        : connectionState === "connecting"
                          ? 'bg-blue-400/70 animate-pulse'
                          : connectionState === "error"
                            ? 'bg-red-500/70'
                            : 'bg-blue-600/30'
                    }`}></span>
                    
                    {micActive && (
                      <span className="ml-1.5 tracking-wider font-light text-xs status-text">LISTENING</span>
                    )}
                    {connectionState === "connecting" && (
                      <span className="ml-1.5 tracking-wider font-light text-xs status-text">CONNECTING</span>
                    )}
                    {connectionState === "error" && (
                      <span className="ml-1.5 tracking-wider font-light text-xs status-text">CONNECTION FAILED</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="max-w-3xl mx-auto">
              <AppCarousel apps={enhancedApps} micActive={micActive} />
            </div>
            
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[100px] h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
            
            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 text-blue-400/40 text-xs tracking-wide flex items-center">
              <span className="w-1 h-1 bg-blue-400/60 rounded-full mr-2 animate-pulse"></span>
              INTERFACE ACTIVE • {apps.length} APPLICATIONS AVAILABLE
            </div>
          </div>
        </main>
        
        <footer className="py-3 text-center">
          <div className="text-blue-500/30 text-xs tracking-wider">
            <span className="inline-block relative px-4">
              <span className="absolute top-1/2 left-0 w-2 h-px bg-blue-500/30"></span>
              CONCEPT BYTES
              <span className="absolute top-1/2 right-0 w-2 h-px bg-blue-500/30"></span>
            </span>
          </div>
          <div className="text-blue-500/20 text-[10px] mt-1">HOLOMAT INTEGRATION · VERSION 3.0.1</div>
        </footer>
      </div>
      
      <div className="jarvis-container fixed bottom-8 left-1/2 transform -translate-x-1/2">
        {responseVisible && (
          <AIResponse text={aiResponse} />
        )}
      </div>

      <SettingsPanel 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
      />
    </div>
  );
}

export default App;
