import React, { useState, useEffect } from 'react';
import '../styles/app-container.css';

const AppContainer = ({ app, onClose }) => {
  // Animation state for opening and closing transitions
  const [isVisible, setIsVisible] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [showGridEffect, setShowGridEffect] = useState(false);

  // Dynamic import of the app component based on its path
  const [AppComponent, setAppComponent] = useState(null);

  useEffect(() => {
    // Import app component dynamically
    const importApp = async () => {
      try {
        const module = await import(`../apps/${app.componentPath}`);
        setAppComponent(() => module.default);
      } catch (err) {
        console.error(`Failed to load app component: ${app.componentPath}`, err);
      }
    };
    
    importApp();
  }, [app.componentPath]);

  // Animation sequence handling
  useEffect(() => {
    // First show the container
    setIsVisible(true);
    
    // Then show the grid hologram effect
    setTimeout(() => {
      setShowGridEffect(true);
    }, 100);
    
    // After the hologram grid effect starts, show panel
    const timer1 = setTimeout(() => {
      setIsPanelVisible(true);
      
      // Fade grid effect after panel appears
      setTimeout(() => {
        setShowGridEffect(false);
      }, 500);
    }, 800);
    
    // After panel appears, show content
    const timer2 = setTimeout(() => {
      setIsContentVisible(true);
    }, 1100);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Handle graceful closing with animations
  const handleClose = () => {
    // Reverse animation sequence
    setIsContentVisible(false);
    
    setTimeout(() => {
      setIsPanelVisible(false);
      
      setTimeout(() => {
        setIsVisible(false);
        
        // Call the actual onClose after animations
        setTimeout(onClose, 300);
      }, 300);
    }, 150);
  };

  // Generate CSS classes for animation states
  const containerClasses = [
    'app-container-wrapper',
    isVisible ? 'visible' : '',
    isPanelVisible ? 'panel-visible' : '',
    isContentVisible ? 'content-visible' : '',
    showGridEffect ? 'show-grid-effect' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {/* Backdrop */}
      <div className="app-backdrop" onClick={handleClose}></div>
      
      {/* Holographic Grid Animation */}
      <div className="hologram-grid-container">
        <div className="hologram-grid horizontal-grid"></div>
        <div className="hologram-grid vertical-grid"></div>
        <div className="hologram-scan-effect"></div>
        <div className="hologram-corners">
          <div className="corner top-left"></div>
          <div className="corner top-right"></div>
          <div className="corner bottom-right"></div>
          <div className="corner bottom-left"></div>
        </div>
      </div>
      
      {/* App Container */}
      <div className="app-container">
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
        
        {/* App Header */}
        <div className="app-header">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center panel-icon-premium">
              <img src={app.icon} alt={app.name} className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg text-blue-300 font-light tracking-wider">{app.name}</h2>
              <div className="text-xs text-blue-500/70">{app.category}</div>
            </div>
          </div>
          
          <div onClick={handleClose} className="app-close-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-300">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
        </div>
        
        {/* App Content */}
        <div className="app-content">
          {AppComponent ? <AppComponent onClose={handleClose} /> : (
            <div className="flex items-center justify-center h-full">
              <div className="loading-spinner"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppContainer;
