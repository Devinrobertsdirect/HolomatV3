import React, { useState, useRef, useEffect } from 'react';
import '../styles/app-container.css';

const DrawingApp = ({ onClose }) => {
  const [mode, setMode] = useState('freeform');
  const [showSettings, setShowSettings] = useState(false);
  const [color, setColor] = useState('#3b82f6');
  const [thickness, setThickness] = useState(2);
  const [pixelsPerMm, setPixelsPerMm] = useState(1.8);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef(null);
  const bgCanvasRef = useRef(null);
  const fgCanvasRef = useRef(null);
  const bgCtx = useRef(null);
  const fgCtx = useRef(null);
  const drawing = useRef(false);
  const measuring = useRef(false);
  const startPoint = useRef({ x: 0, y: 0 });

  // Initialize canvases and fullscreen listener
  useEffect(() => {
    const bgCanvas = bgCanvasRef.current;
    const fgCanvas = fgCanvasRef.current;
    const resizeCanvas = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      bgCanvas.width = width;
      bgCanvas.height = height;
      fgCanvas.width = width;
      fgCanvas.height = height;
      const bg = bgCanvas.getContext('2d');
      const fg = fgCanvas.getContext('2d');
      bg.lineCap = 'round';
      fg.lineCap = 'round';
      bg.strokeStyle = color;
      bg.lineWidth = thickness;
      bg.font = '16px sans-serif';
      fg.strokeStyle = color;
      fg.lineWidth = thickness;
      fg.font = '16px sans-serif';
      bgCtx.current = bg;
      fgCtx.current = fg;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const handleFsChange = () => {
      const fsElem = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
      setIsFullscreen(!!fsElem);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update stroke style when settings change
  useEffect(() => {
    if (bgCtx.current) {
      bgCtx.current.strokeStyle = color;
      bgCtx.current.lineWidth = thickness;
      fgCtx.current.strokeStyle = color;
      fgCtx.current.lineWidth = thickness;
    }
  }, [color, thickness]);

  // Helper to get pointer position relative to canvas
  const getPos = (e) => {
    const rect = fgCanvasRef.current.getBoundingClientRect();
    const clientX = e.clientX !== undefined ? e.clientX : e.touches[0].clientX;
    const clientY = e.clientY !== undefined ? e.clientY : e.touches[0].clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  // Pointer event handlers
  const handlePointerDown = (e) => {
    e.preventDefault();
    const { x, y } = getPos(e);
    if (mode === 'freeform') {
      drawing.current = true;
      bgCtx.current.beginPath();
      bgCtx.current.moveTo(x, y);
    } else if (mode === 'measure') {
      measuring.current = true;
      startPoint.current = { x, y };
    }
  };

  const handlePointerMove = (e) => {
    e.preventDefault();
    const { x, y } = getPos(e);
    if (mode === 'freeform' && drawing.current) {
      bgCtx.current.lineTo(x, y);
      bgCtx.current.stroke();
    } else if (mode === 'measure' && measuring.current) {
      // preview line
      const fg = fgCtx.current;
      fg.clearRect(0, 0, fg.canvas.width, fg.canvas.height);
      fg.beginPath();
      fg.moveTo(startPoint.current.x, startPoint.current.y);
      fg.lineTo(x, y);
      fg.stroke();
      // measurement text
      const dx = x - startPoint.current.x;
      const dy = y - startPoint.current.y;
      const pxLength = Math.hypot(dx, dy);
      const mm = (pxLength / pixelsPerMm).toFixed(2);
      const midX = startPoint.current.x + dx / 2;
      const midY = startPoint.current.y + dy / 2;
      fg.fillStyle = color;
      fg.fillText(`${mm} mm`, midX + 5, midY - 5);
    }
  };

  const handlePointerUp = (e) => {
    e.preventDefault();
    if (mode === 'freeform' && drawing.current) {
      drawing.current = false;
      bgCtx.current.closePath();
    } else if (mode === 'measure' && measuring.current) {
      // finalize line on bg
      const { x, y } = getPos(e);
      // clear preview
      fgCtx.current.clearRect(0, 0, fgCtx.current.canvas.width, fgCtx.current.canvas.height);
      // draw permanent line
      bgCtx.current.beginPath();
      bgCtx.current.moveTo(startPoint.current.x, startPoint.current.y);
      bgCtx.current.lineTo(x, y);
      bgCtx.current.stroke();
      // draw text
      const dx = x - startPoint.current.x;
      const dy = y - startPoint.current.y;
      const pxLength = Math.hypot(dx, dy);
      const mm = (pxLength / pixelsPerMm).toFixed(2);
      const midX = startPoint.current.x + dx / 2;
      const midY = startPoint.current.y + dy / 2;
      bgCtx.current.fillStyle = color;
      bgCtx.current.fillText(`${mm} mm`, midX + 5, midY - 5);
      measuring.current = false;
    }
  };

  // Attach pointer events
  useEffect(() => {
    const fgCanvas = fgCanvasRef.current;
    fgCanvas.style.touchAction = 'none';
    fgCanvas.addEventListener('pointerdown', handlePointerDown);
    fgCanvas.addEventListener('pointermove', handlePointerMove);
    fgCanvas.addEventListener('pointerup', handlePointerUp);
    fgCanvas.addEventListener('pointerleave', handlePointerUp);
    return () => {
      fgCanvas.removeEventListener('pointerdown', handlePointerDown);
      fgCanvas.removeEventListener('pointermove', handlePointerMove);
      fgCanvas.removeEventListener('pointerup', handlePointerUp);
      fgCanvas.removeEventListener('pointerleave', handlePointerUp);
    };
  }, [mode, pixelsPerMm, color, thickness]);

  // Clear both drawing and measurement layers
  const clearCanvas = () => {
    if (bgCtx.current && bgCanvasRef.current) {
      bgCtx.current.clearRect(0, 0, bgCanvasRef.current.width, bgCanvasRef.current.height);
    }
    if (fgCtx.current && fgCanvasRef.current) {
      fgCtx.current.clearRect(0, 0, fgCanvasRef.current.width, fgCanvasRef.current.height);
    }
  };

  // Fullscreen helpers
  const enterFullscreen = () => {
    const el = containerRef.current;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
  };
  const exitFullscreen = () => {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
  };
  const toggleFullscreen = () => {
    if (isFullscreen) exitFullscreen();
    else enterFullscreen();
  };

  // Export drawing as color PNG on white background (no grid)
  const exportDrawing = () => {
    const bgCanvas = bgCanvasRef.current;
    if (!bgCanvas) return;
    const width = bgCanvas.width;
    const height = bgCanvas.height;
    // create offscreen canvas
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = width;
    tmpCanvas.height = height;
    const tmpCtx = tmpCanvas.getContext('2d');
    // fill white background
    tmpCtx.fillStyle = '#ffffff';
    tmpCtx.fillRect(0, 0, width, height);
    // draw original drawing (preserving color)
    tmpCtx.drawImage(bgCanvas, 0, 0);
    // filename with timestamp
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const fname = `drawing_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_` +
      `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.png`;
    // trigger download
    const link = document.createElement('a');
    link.href = tmpCanvas.toDataURL('image/png');
    link.download = fname;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Close or exit fullscreen on Esc
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (isFullscreen) exitFullscreen();
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullscreen, onClose]);

  return (
    <div ref={containerRef} className="h-full flex flex-col overflow-hidden">
      <div className="flex flex-1 relative">
        {/* Mode buttons */}
        <div className="flex flex-col space-y-2 p-2 bg-blue-900/10 border-r border-blue-900/30">
          <button
            className={`px-2 py-1 rounded ${mode === 'freeform' ? 'bg-blue-900/30' : ''}`}
            onClick={() => setMode('freeform')}
          >
            Free Form
          </button>
          <button
            className={`px-2 py-1 rounded ${mode === 'measure' ? 'bg-blue-900/30' : ''}`}
            onClick={() => setMode('measure')}
          >
            Measure
          </button>
        </div>
        {/* Canvas area */}
        <div className="relative flex-1">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 29px, rgba(59,130,246,0.4) 30px)',
              backgroundSize: '100% 30px',
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'repeating-linear-gradient(to right, transparent, transparent 29px, rgba(59,130,246,0.4) 30px)',
              backgroundSize: '30px 100%',
            }}
          />
          <canvas ref={bgCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
          <canvas ref={fgCanvasRef} className="absolute inset-0 w-full h-full" />
        </div>
        {/* Settings panel */}
        <div
          className={`absolute top-0 right-0 h-full w-64 bg-blue-950/90 border-l border-blue-800/50 p-4 transform transition-transform ${
            showSettings ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <h3 className="text-blue-100 text-lg mb-4">Settings</h3>
          <div className="mb-4">
            <label className="text-blue-300 text-sm">Pen Color</label>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-8 mt-1" />
          </div>
          <div className="mb-4">
            <label className="text-blue-300 text-sm">Thickness</label>
            <input
              type="range"
              min="1"
              max="50"
              value={thickness}
              onChange={(e) => setThickness(parseInt(e.target.value, 10))}
              className="w-full"
            />
          </div>
          <div className="mb-4">
            <label className="text-blue-300 text-sm">Pixels per mm</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={pixelsPerMm}
              onChange={(e) => setPixelsPerMm(parseFloat(e.target.value))}
              className="w-full mt-1 p-1 bg-blue-900/20 text-blue-100 border border-blue-800/30 rounded"
            />
          </div>
          <button onClick={() => setShowSettings(false)} className="text-blue-400/80 text-sm">
            Close
          </button>
        </div>
        {/* Controls: fullscreen, settings toggle, and export */}
        <div className="absolute top-4 right-16 z-50 flex space-x-2">
          <button onClick={toggleFullscreen} className="text-blue-300 text-2xl" title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
            {isFullscreen ? '⏏️' : '⛶'}
          </button>
          <button onClick={() => setShowSettings((s) => !s)} className="text-blue-300 text-2xl" title="Settings">
            ⚙️
          </button>
        </div>
        {/* Export button */}
        <button
          onClick={exportDrawing}
          className="absolute bottom-4 right-4 z-50 px-3 py-1 bg-blue-900/40 hover:bg-blue-900/60 text-blue-200 text-sm rounded"
        >
          Export
        </button>
        {/* Clear all drawings/measurements */}
        <button
          onClick={clearCanvas}
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50 px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-sm rounded"
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export default DrawingApp;