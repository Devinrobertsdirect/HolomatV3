import React, { useRef, useEffect, useState } from 'react';
// MediaPipe libs attach globals via script; we'll load them dynamically

const HandTrackingApp = ({ onClose }) => {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const bgCanvasRef = useRef(null);
  const fgCanvasRef = useRef(null);
  const bgCtxRef = useRef(null);
  const fgCtxRef = useRef(null);
  const pinchRef = useRef(false);

  const [showSettings, setShowSettings] = useState(false);
  const [mode, setMode] = useState('draw'); // 'draw' or 'measure'
  const [color, setColor] = useState('#3b82f6');
  const [thickness, setThickness] = useState(2);
  const [pixelsPerMm, setPixelsPerMm] = useState(5);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load MediaPipe scripts dynamically and initialize
  const [mpReady, setMpReady] = useState(false);
  useEffect(() => {
    if (window.Hands && window.Camera && window.HAND_CONNECTIONS) {
      setMpReady(true);
      return;
    }
    let canceled = false;
    const loadScript = (src) => new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
      } else {
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = (e) => reject(e);
        document.head.appendChild(s);
      }
    });
    const loadMp = async () => {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
        if (!canceled) setMpReady(true);
      } catch (err) {
        console.error('Failed to load MediaPipe scripts', err);
      }
    };
    loadMp();
    return () => { canceled = true; };
  }, []);
  // Initialize drawing canvases and contexts
  useEffect(() => {
    if (!mpReady || !containerRef.current) return;
    const container = containerRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;
    // Setup background canvas
    const bgCanvas = bgCanvasRef.current;
    bgCanvas.width = w;
    bgCanvas.height = h;
    const bgCtx = bgCanvas.getContext('2d');
    bgCtx.lineCap = 'round';
    bgCtx.strokeStyle = color;
    bgCtx.lineWidth = thickness;
    bgCtx.font = '16px sans-serif';
    bgCtxRef.current = bgCtx;
    // Setup foreground canvas
    const fgCanvas = fgCanvasRef.current;
    fgCanvas.width = w;
    fgCanvas.height = h;
    const fgCtx = fgCanvas.getContext('2d');
    fgCtx.lineCap = 'round';
    fgCtx.strokeStyle = color;
    fgCtx.lineWidth = thickness;
    fgCtx.font = '16px sans-serif';
    fgCanvas.style.pointerEvents = 'none';
    fgCtxRef.current = fgCtx;
    // Handle resize
    const onResize = () => {
      const w2 = container.clientWidth;
      const h2 = container.clientHeight;
      bgCanvas.width = w2; fgCanvas.width = w2;
      bgCanvas.height = h2; fgCanvas.height = h2;
    };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); };
  }, [mpReady]);
  // Initialize MediaPipe Hands & Camera when ready
  useEffect(() => {
    if (!mpReady || !containerRef.current) return;
    const container = containerRef.current;
    const videoElem = videoRef.current;
    videoElem.width = container.clientWidth;
    videoElem.height = container.clientHeight;

    // Setup MediaPipe Hands
    const hands = new window.Hands({ locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });
    hands.onResults(onResults);

    // Start camera feed
    const camera = new window.Camera(videoElem, {
      onFrame: async () => { await hands.send({ image: videoElem }); },
      width: container.clientWidth,
      height: container.clientHeight,
    });
    camera.start();

    return () => {
      camera.stop();
      hands.close();
    };
  }, [mpReady]);

  // Handle results from MediaPipe
  const onResults = (results) => {
    const bgCtx = bgCtxRef.current;
    const fgCtx = fgCtxRef.current;
    const container = containerRef.current;
    if (!bgCtx || !fgCtx || !container) return;
    const { width, height } = container.getBoundingClientRect();
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      // Pinch detection: thumb (4) & index (8)
      const thumb = landmarks[4];
      const index = landmarks[8];
      const dx = thumb.x - index.x;
      const dy = thumb.y - index.y;
      // normalize by hand size (avg distance to wrist)
      const wrist = landmarks[0];
      let sum = 0;
      for (const lm of landmarks) sum += Math.hypot(lm.x - wrist.x, lm.y - wrist.y);
      const avg = sum / landmarks.length;
      const pinchDist = Math.hypot(dx, dy) / avg;
      const isPinched = pinchDist < 0.4;
      const x = index.x * width;
      const y = index.y * height;
      // Drawing logic
      if (mode === 'draw') {
        if (isPinched && !pinchRef.current) {
          // start
          pinchRef.current = true;
          bgCtx.beginPath();
          bgCtx.moveTo(x, y);
        } else if (isPinched && pinchRef.current) {
          // continue drawing
          bgCtx.lineTo(x, y);
          bgCtx.stroke();
        } else if (!isPinched && pinchRef.current) {
          // end drawing
          pinchRef.current = false;
          bgCtx.closePath();
        }
      } else if (mode === 'measure') {
        if (isPinched && !pinchRef.current) {
          // start measure
          pinchRef.current = true;
          pinchRef.current = true;
          pinchRef.start = { x, y };
        }
        if (isPinched && pinchRef.current) {
          // preview measure
          fgCtx.clearRect(0, 0, width, height);
          fgCtx.beginPath();
          fgCtx.moveTo(pinchRef.start.x, pinchRef.start.y);
          fgCtx.lineTo(x, y);
          fgCtx.stroke();
          const dpx = x - pinchRef.start.x;
          const dpy = y - pinchRef.start.y;
          const mm = (Math.hypot(dpx, dpy) / pixelsPerMm).toFixed(2);
          fgCtx.fillText(`${mm} mm`, pinchRef.start.x + dpx/2 + 5, pinchRef.start.y + dpy/2 - 5);
        } else if (!isPinched && pinchRef.current) {
          // finalize measure
          pinchRef.current = false;
          const sx = pinchRef.start.x;
          const sy = pinchRef.start.y;
          fgCtx.clearRect(0, 0, width, height);
          bgCtx.beginPath();
          bgCtx.moveTo(sx, sy);
          bgCtx.lineTo(x, y);
          bgCtx.stroke();
          const dpx = x - sx;
          const dpy = y - sy;
          const mm = (Math.hypot(dpx, dpy) / pixelsPerMm).toFixed(2);
          bgCtx.fillText(`${mm} mm`, sx + dpx/2 + 5, sy + dpy/2 - 5);
        }
      }
    }
  };

  // Fullscreen change listener
  useEffect(() => {
    const onFsChange = () => {
      const fsElem = document.fullscreenElement || document.webkitFullscreenElement;
      setIsFullscreen(!!fsElem);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  // Fullscreen control
  const enterFullscreen = () => {
    const el = containerRef.current;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  };
  const exitFullscreen = () => {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  };
  const toggleFullscreen = () => {
    if (isFullscreen) exitFullscreen(); else enterFullscreen();
  };

  return (
    <div ref={containerRef} className="h-full flex flex-col relative">
      {/* Grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 29px, rgba(59,130,246,0.4) 30px)',
          backgroundSize: '100% 30px'
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(to right, transparent, transparent 29px, rgba(59,130,246,0.4) 30px)',
          backgroundSize: '30px 100%'
        }}
      />
      {/* Drawing canvases */}
      <canvas ref={bgCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      <canvas ref={fgCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      {/* Camera window */}
      <video
        ref={videoRef}
        className="absolute bottom-4 right-4 w-40 h-auto border border-blue-800/50 rounded-lg overflow-hidden"
        playsInline muted autoPlay
      />
      {/* Controls: fullscreen & settings */}
      <div className="absolute top-4 right-4 z-50 flex space-x-2">
        <button
          onClick={toggleFullscreen}
          className="text-blue-300 text-2xl"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? '⏏️' : '⛶'}
        </button>
        <button
          onClick={() => setShowSettings((s) => !s)}
          className="text-blue-300 text-2xl"
          title="Settings"
        >⚙️</button>
      </div>
      {/* Settings panel */}
      <div
        className={`absolute top-0 right-0 h-full w-64 bg-blue-950/90 border-l border-blue-800/50 p-4 transform transition-transform ${
          showSettings ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <h3 className="text-blue-100 text-lg mb-4">Settings</h3>
        <div className="mb-4">
          <label className="text-blue-300 text-sm block mb-1">Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="w-full bg-blue-900/20 border border-blue-800/30 text-blue-100 p-1 rounded"
          >
            <option value="draw">Draw</option>
            <option value="measure">Measure</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="text-blue-300 text-sm block mb-1">Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full h-8 p-0 border-0"
          />
        </div>
        <div className="mb-4">
          <label className="text-blue-300 text-sm block mb-1">Thickness</label>
          <input
            type="range"
            min="1"
            max="50"
            value={thickness}
            onChange={(e) => setThickness(+e.target.value)}
            className="w-full"
          />
        </div>
        <div className="mb-4">
          <label className="text-blue-300 text-sm block mb-1">Pixels per mm</label>
          <input
            type="number"
            min="1"
            value={pixelsPerMm}
            onChange={(e) => setPixelsPerMm(+e.target.value)}
            className="w-full p-1 bg-blue-900/20 text-blue-100 border border-blue-800/30 rounded"
          />
        </div>
        <button
          onClick={() => setShowSettings(false)}
          className="text-blue-400/80 text-sm"
        >Close</button>
      </div>
    </div>
  );
};

export default HandTrackingApp;