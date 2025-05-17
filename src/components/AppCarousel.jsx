import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';

const AppCarousel = ({ apps, micActive }) => {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  const startXRef = useRef(0);
  const velocityRef = useRef(0);
  const lastMoveTimeRef = useRef(0);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const voiceAnimationRef = useRef(null);
  const hasMoved = useRef(false);
  const lastClickTime = useRef(0);
  
  const carouselRotation = useMotionValue(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const getSegmentAngle = () => 360 / apps.length;

  const getCenterPositionForIndex = (index) => {
    return index * getSegmentAngle();
  };

  useEffect(() => {
    carouselRotation.set(0);
  }, []);
  
  useEffect(() => {
    if (micActive) {
      if (voiceAnimationRef.current) {
        clearInterval(voiceAnimationRef.current);
      }
      
      voiceAnimationRef.current = setInterval(() => {
        setVoiceLevel(Math.random() * 0.8 + 0.2);
      }, 100);
    } else {
      if (voiceAnimationRef.current) {
        clearInterval(voiceAnimationRef.current);
        setVoiceLevel(0);
      }
    }
    
    return () => {
      if (voiceAnimationRef.current) {
        clearInterval(voiceAnimationRef.current);
      }
    };
  }, [micActive]);
  
  useEffect(() => {
    const unsubscribe = carouselRotation.onChange(value => {
      if (isTransitioning) return;
      
      let normalized = value % 360;
      if (normalized < 0) normalized += 360;
      
      const segmentSize = getSegmentAngle();
      let calculatedIndex = Math.round(normalized / segmentSize);
      calculatedIndex = apps.length - calculatedIndex;
      calculatedIndex = ((calculatedIndex % apps.length) + apps.length) % apps.length;
      
      if (calculatedIndex !== activeIndex) {
        setActiveIndex(calculatedIndex);
      }
    });
    
    return unsubscribe;
  }, [carouselRotation, apps.length, activeIndex, isTransitioning]);
  
  const handleWheel = (e) => {
    e.preventDefault();
    const direction = e.deltaY > 0 ? 1 : -1;
    const newIndex = (activeIndex - direction + apps.length) % apps.length;
    const segmentSize = getSegmentAngle();
    const targetRotation = (apps.length - newIndex) * segmentSize % 360;
    
    setIsTransitioning(true);
    
    animate(carouselRotation, targetRotation, {
      type: "spring",
      stiffness: 400,
      damping: 30,
      onComplete: () => setIsTransitioning(false)
    });
  };
  
  const handleMouseDown = (e) => {
    carouselRotation.stop();
    setIsDragging(true);
    hasMoved.current = false;
    startXRef.current = e.clientX;
    lastMoveTimeRef.current = Date.now();
    velocityRef.current = 0;
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    hasMoved.current = true;
    const now = Date.now();
    const dt = now - lastMoveTimeRef.current;
    lastMoveTimeRef.current = now;
    
    const deltaX = e.clientX - startXRef.current;
    velocityRef.current = deltaX / (dt || 1) * 20;
    carouselRotation.set(carouselRotation.get() + (deltaX * 0.4));
    startXRef.current = e.clientX;
  };
  
  const handleMouseUp = (e) => {
    if (!isDragging) return;
    
    const wasDragging = hasMoved.current;
    setIsDragging(false);
    
    if (!wasDragging) {
      const segmentSize = getSegmentAngle();
      let normalized = carouselRotation.get() % 360;
      if (normalized < 0) normalized += 360;
      
      const calcIndex = Math.round(normalized / segmentSize);
      const appIndex = ((apps.length - calcIndex) % apps.length + apps.length) % apps.length;
      
      const now = Date.now();
      if (now - lastClickTime.current > 300) {
        lastClickTime.current = now;
        if (apps[appIndex] && apps[appIndex].onClick) {
          apps[appIndex].onClick();
        }
      }
      return;
    }
    
    const velocity = velocityRef.current;
    
    if (Math.abs(velocity) > 5) {
      const inertiaDistance = velocity * 4;
      const endValue = carouselRotation.get() + inertiaDistance;
      
      animate(carouselRotation, endValue, {
        type: "decay", 
        velocity: velocity / 100,
        onComplete: () => snapToNearestApp()
      });
    } else {
      snapToNearestApp();
    }
  };
  
  const handleTouchStart = (e) => {
    e.preventDefault();
    
    carouselRotation.stop();
    setIsDragging(true);
    hasMoved.current = false;
    startXRef.current = e.touches[0].clientX;
    lastMoveTimeRef.current = Date.now();
    velocityRef.current = 0;
  };
  
  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    hasMoved.current = true;
    const now = Date.now();
    const dt = now - lastMoveTimeRef.current;
    lastMoveTimeRef.current = now;
    
    const deltaX = e.touches[0].clientX - startXRef.current;
    velocityRef.current = deltaX / (dt || 1) * 20;
    carouselRotation.set(carouselRotation.get() + (deltaX * 0.4));
    startXRef.current = e.touches[0].clientX;
  };
  
  const handleTouchEnd = (e) => {
    if (!isDragging) return;
    
    const wasDragging = hasMoved.current;
    setIsDragging(false);
    
    if (!wasDragging) {
      const segmentSize = getSegmentAngle();
      let normalized = carouselRotation.get() % 360;
      if (normalized < 0) normalized += 360;
      
      const calcIndex = Math.round(normalized / segmentSize);
      const appIndex = ((apps.length - calcIndex) % apps.length + apps.length) % apps.length;
      
      const now = Date.now();
      if (now - lastClickTime.current > 300) {
        lastClickTime.current = now;
        if (apps[appIndex] && apps[appIndex].onClick) {
          apps[appIndex].onClick();
        }
      }
      return;
    }
    
    const velocity = velocityRef.current;
    
    if (Math.abs(velocity) > 5) {
      const inertiaDistance = velocity * 4;
      const endValue = carouselRotation.get() + inertiaDistance;
      
      animate(carouselRotation, endValue, {
        type: "decay", 
        velocity: velocity / 100,
        onComplete: () => snapToNearestApp()
      });
    } else {
      snapToNearestApp();
    }
  };

  const snapToNearestApp = () => {
    const segmentSize = getSegmentAngle();
    const currentRotation = carouselRotation.get();
    const targetRotation = Math.round(currentRotation / segmentSize) * segmentSize;
    
    setIsTransitioning(true);
    
    animate(carouselRotation, targetRotation, {
      type: "spring",
      stiffness: 400,
      damping: 40,
      onComplete: () => {
        setIsTransitioning(false);
        let normalized = targetRotation % 360;
        if (normalized < 0) normalized += 360;
        const calcIndex = Math.round(normalized / segmentSize);
        const newIndex = ((apps.length - calcIndex) % apps.length + apps.length) % apps.length;
        setActiveIndex(newIndex);
      }
    });
  };

  const handleAppClick = (index, e) => {
    if (isDragging || isTransitioning || Math.abs(velocityRef.current) > 2 || hasMoved.current) {
      return;
    }
    
    e.stopPropagation();
    
    const now = Date.now();
    if (now - lastClickTime.current < 300) {
      return;
    }
    lastClickTime.current = now;
    
    const segmentSize = getSegmentAngle();
    const targetRotation = ((apps.length - index) % apps.length) * segmentSize;
    
    setIsTransitioning(true);
    
    animate(carouselRotation, targetRotation, {
      type: "spring",
      stiffness: 500,
      damping: 30,
      onComplete: () => {
        setIsTransitioning(false);
        setActiveIndex(index);
        
        if (apps[index] && apps[index].onClick) {
          apps[index].onClick();
        }
      }
    });
    
    setActiveIndex(index);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      window.addEventListener('touchcancel', handleTouchEnd);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove, { passive: false });
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isDragging]);

  const getAppPosition = (index) => {
    const anglePerItem = getSegmentAngle();
    const itemAngle = ((index * anglePerItem) + carouselRotation.get()) * (Math.PI / 180);
    
    const horizontalRadius = 160;
    const depthRadius = 100;
    
    const x = Math.sin(itemAngle) * horizontalRadius;
    const z = Math.cos(itemAngle) * depthRadius;
    
    const scale = mapRange(z, -depthRadius, depthRadius, 0.6, 1.4);
    const opacity = mapRange(z, -depthRadius, depthRadius, 0.3, 1);
    const zIndex = Math.round(mapRange(z, -depthRadius, depthRadius, 1, 50));
    
    return { 
      x, 
      y: 0, 
      z, 
      scale, 
      opacity,
      zIndex
    };
  };
  
  const mapRange = (value, inMin, inMax, outMin, outMax) => {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  };

  return (
    <div 
      className={`relative h-[400px] w-full select-none ${micActive ? 'interface-active' : ''}`}
      onWheel={handleWheel}
      ref={containerRef}
      onMouseDown={isDragging ? undefined : handleMouseDown}
      onTouchStart={isDragging ? undefined : handleTouchStart}
      style={{ cursor: isDragging ? 'grabbing' : 'grab', maxWidth: '360px', margin: '0 auto', touchAction: 'none' }}
    >
      <div className="absolute inset-0 perspective-1200">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[100px] rounded-full">
          <div className="absolute inset-0 bg-gradient-radial from-blue-950/10 via-blue-950/5 to-transparent rounded-full"></div>
          <div className="absolute inset-0 platform-reflection rounded-full"></div>
        </div>
        
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[100px] h-[100px] border border-blue-500/20 rounded-full pointer-events-none">
          <div className="absolute inset-0 rounded-full bg-gradient-radial from-blue-900/5 to-transparent"></div>
          <div className="absolute inset-[-1px] border border-blue-400/10 rounded-full animate-pulse-slow"></div>
        </div>
        
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[300px] flex items-center justify-center">
          {apps.map((app, index) => {
            const isFocused = index === activeIndex;
            const position = getAppPosition(index);
            
            return (
              <motion.div
                key={app.id}
                className="absolute transform-style-preserve-3d"
                animate={position}
                initial={position}
                transition={{ 
                  type: 'spring', 
                  stiffness: 400, 
                  damping: 40,
                  mass: 0.8 
                }}
                style={{ 
                  zIndex: isFocused ? 100 : position.zIndex,
                  filter: `blur(${position.z < 0 ? Math.abs(position.z) / 100 : 0}px)`,
                  pointerEvents: position.z > 0 ? 'auto' : 'none'
                }}
                onClick={(e) => handleAppClick(index, e)}
              >
                <div className="relative transform-style-preserve-3d">
                  <div
                    className={`w-20 h-20 rounded-full flex items-center justify-center cursor-pointer
                              ${isFocused ? 'app-icon-focused' : 'app-icon'}`}
                    onClick={(e) => handleAppClick(index, e)}
                  >
                    <img
                      src={app.icon}
                      alt={app.name}
                      className={`w-10 h-10 ${isFocused ? 'drop-shadow-blue' : ''} pointer-events-none`}
                      draggable={false}
                    />
                    
                    <div className="absolute inset-0 rounded-full icon-reflection pointer-events-none"></div>
                  </div>
                  
                  <div
                    className={`absolute -bottom-8 left-1/2 -translate-x-1/2 text-center whitespace-nowrap pointer-events-none
                               ${isFocused ? 'text-blue-300 font-medium' : 'text-blue-400/50'}`}
                    style={{
                      textShadow: isFocused ? '0 0 8px rgba(59,130,246,0.5)' : 'none',
                    }}
                  >
                    {app.name}
                  </div>
                  
                  {isFocused && (
                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex space-x-1 pointer-events-none">
                      <div className="w-1 h-1 bg-blue-500 rounded-full shadow-glow"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full shadow-glow"></div>
                      <div className="w-1 h-1 bg-blue-500 rounded-full shadow-glow"></div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      
      <div className="absolute bottom-2 left-0 right-0 flex justify-center">
        <div className="flex items-center space-x-1">
          {apps.map((_, index) => (
            <div
              key={index} 
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 cursor-pointer
                        ${index === activeIndex ? 'bg-blue-400 w-3' : 'bg-blue-900/50'}`}
              onClick={(e) => {
                e.stopPropagation();
                handleAppClick(index, e);
              }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AppCarousel;