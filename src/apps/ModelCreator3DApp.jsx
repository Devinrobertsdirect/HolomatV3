import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { useSettings } from '../contexts/SettingsContext';

// ModelCreator3DApp: speech-to-image then image-to-3D via external ML server
const ModelCreator3DApp = ({ onClose }) => {
  const { settings } = useSettings();
  // Disable right-click context menu
  useEffect(() => {
    const handler = (e) => e.preventDefault();
    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, []);
  const [listening, setListening] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [imageURL, setImageURL] = useState('');
  const [error, setError] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelURL, setModelURL] = useState('');
  // Fullscreen toggle state
  const [isFullscreen, setIsFullscreen] = useState(false);
  // UI: show image generation settings
  const [showSettings, setShowSettings] = useState(false);
  // Image generation settings (same as ImageGenApp)
  const [selectedModel, setSelectedModel] = useState('dall-e-3');
  const [selectedSize, setSelectedSize] = useState('1024x1024');
  const [qualityMode, setQualityMode] = useState('standard');
  const recognitionRef = useRef(null);
  const viewerRef = useRef(null);

  // Handle fullscreen change events
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = () => {
    const el = viewerRef.current;
    if (!el) return;
    try {
      if (!isFullscreen) {
        if (el.requestFullscreen) el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
        else if (el.msRequestFullscreen) el.msRequestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
      }
    } catch (e) {
      console.error('Fullscreen error', e);
    }
  };

  // Initialize SpeechRecognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('SpeechRecognition API not supported');
      return;
    }
    const recog = new SpeechRecognition();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = 'en-US';
    recog.onresult = (e) => {
      let interim = '';
      let finalT = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalT += r[0].transcript;
        else interim += r[0].transcript;
      }
      setPrompt(finalT + interim);
    };
    recog.onerror = () => setListening(false);
    recognitionRef.current = recog;
  }, []);

  const startListening = () => {
    setError('');
    if (recognitionRef.current && !listening) {
      setPrompt('');
      recognitionRef.current.start();
      setListening(true);
    }
  };
  const stopListening = () => {
    if (recognitionRef.current && listening) {
      recognitionRef.current.stop();
      setListening(false);
    }
  };

  const getApiSize = () => selectedSize;
  const createImage = async () => {
    setError(''); setModelURL('');
    const apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) return setError('OpenAI key missing in Settings');
    if (!prompt.trim()) return setError('Prompt is empty');
    setImageLoading(true);
    try {
      // Build payload like ImageGenApp
      const payload = {
        model: selectedModel,
        prompt,
        n: 1,
        size: getApiSize(),
        response_format: 'b64_json'
      };
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text() || res.statusText);
      const data = await res.json();
      const b64 = data.data?.[0]?.b64_json;
      if (!b64) throw new Error('No image returned');
      setImageURL(`data:image/png;base64,${b64}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setImageLoading(false);
    }
  };

  const createModel = async () => {
    setError(''); setModelURL('');
    const server = settings.mlServerIP;
    if (!server) return setError('ML Server IP not set in Settings');
    if (!imageURL) return setError('No image to send');
    setModelLoading(true);
    try {
      const res = await fetch(`http://${server}/image2stl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageURL })
      });
      if (!res.ok) throw new Error(await res.text() || res.statusText);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setModelURL(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setModelLoading(false);
    }
  };

  // Reset to initial state
  const handleReset = () => {
    setPrompt('');
    setImageURL('');
    setModelURL('');
    setError('');
  };

  // Initialize and render STL when modelURL is set
  useEffect(() => {
    if (!modelURL || !viewerRef.current) return;
    const container = viewerRef.current;
    // Clear any existing
    container.innerHTML = '';
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene, camera, renderer
    const scene = new THREE.Scene();
    // Match ModelViewerApp background
    scene.background = new THREE.Color(0x0a1929);
    // Default grid helper
    const gridHelper = new THREE.GridHelper(10, 10, 0x555555, 0x333333);
    scene.add(gridHelper);
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 0, 5);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Add light
    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambient);

    // Load STL model
    const loader = new STLLoader();
    loader.load(modelURL, (geometry) => {
      const material = new THREE.MeshNormalMaterial();
      const mesh = new THREE.Mesh(geometry, material);
      // Center & scale
      geometry.center();
      const bbox = new THREE.Box3().setFromObject(mesh);
      const size = bbox.getSize(new THREE.Vector3()).length();
      const scale = 3 / size;
      mesh.scale.set(scale, scale, scale);
      scene.add(mesh);
    });

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Handle resize
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Render loop
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [modelURL]);

  // If a 3D model URL is available, render the STL viewer
  if (modelURL) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4">
          <button onClick={handleReset} className="text-xs text-blue-300">← Back</button>
        </div>
        <div className="relative flex-1 w-full">
          <div ref={viewerRef} className="w-full h-full" />
          <button
            onClick={toggleFullscreen}
            className="absolute bottom-4 left-4 bg-blue-900/50 hover:bg-blue-800/60 text-blue-300 p-2 rounded transition-colors flex items-center justify-center"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 4a1 1 0 00-1 1v4a1 1 0 01-1 1H1a1 1 0 010-2h1V5a3 3 0 013-3h3a1 1 0 010 2H5zm10 0a1 1 0 00-1 1v3a1 1 0 102 0V6h1a1 1 0 100-2h-2zm-8 10a1 1 0 00-1 1v1h3a1 1 0 100 2H3a1 1 0 01-1-1v-3a1 1 0 112 0v1zm12-2a1 1 0 01-1 1h-2a1 1 0 110-2h1V6a1 1 0 112 0v6z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 011.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 01-1 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 011.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Default UI: speech->image->3D model
  return (
    <div className="relative flex flex-col h-full">
      {/* Settings panel */}
      {showSettings && (
        <div className="absolute right-0 top-0 h-full w-64 bg-gray-900 z-20 p-4">
          <button onClick={() => setShowSettings(false)} className="text-blue-300 mb-4">Close</button>
          <h3 className="text-white mb-2">Image Settings</h3>
          <div className="mb-3">
            <label className="block text-blue-200 text-sm mb-1">Model</label>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="settings-input w-full text-sm"
            >
              <option value="dall-e-3">DALL·E 3</option>
              <option value="dall-e-2">DALL·E 2</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="block text-blue-200 text-sm mb-1">Size</label>
            <select
              value={selectedSize}
              onChange={e => setSelectedSize(e.target.value)}
              className="settings-input w-full text-sm"
            >
              {selectedModel === 'dall-e-2'
                ? (
                  <>
                    <option value="256x256">256×256</option>
                    <option value="512x512">512×512</option>
                    <option value="1024x1024">1024×1024</option>
                  </>
                )
                : (
                  <>
                    <option value="1024x1024">1024×1024</option>
                    <option value="1024x1792">1024×1792</option>
                    <option value="1792x1024">1792×1024</option>
                  </>
                )}
            </select>
          </div>
          <div className="mb-3">
            <label className="block text-blue-200 text-sm mb-1">Quality</label>
            <select
              value={qualityMode}
              onChange={e => setQualityMode(e.target.value)}
              className="settings-input w-full text-sm"
            >
              <option value="standard">Standard</option>
              {selectedModel === 'dall-e-3' && (
                <option value="hd">HD</option>
              )}
            </select>
          </div>
        </div>
      )}
      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-3">
        <div className="w-full flex justify-between">
          <button onClick={onClose} className="text-xs text-blue-300">← Back</button>
          <button onClick={() => setShowSettings(true)} className="text-xs text-blue-300">Settings</button>
        </div>
        <h2 className="text-lg font-light">3D Model Creator</h2>
        <button
          onMouseDown={startListening} onMouseUp={stopListening}
          onTouchStart={startListening} onTouchEnd={stopListening}
          className={`px-6 py-3 rounded-full text-white ${listening ? 'bg-red-500' : 'bg-blue-600'}`}
        >
          {listening ? 'Listening...' : 'Hold to Talk'}
        </button>
        <input
          type="text" value={prompt} onChange={e => setPrompt(e.target.value)}
          placeholder="Prompt..."
          className="settings-input w-full"
        />
        <button
          onClick={createImage} disabled={imageLoading}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded"
        >
          {imageLoading ? 'Generating Image...' : 'Generate Image'}
        </button>
        {imageURL && (
          <img src={imageURL} alt="Generated" className="mt-4 w-full h-64 object-contain border" />
        )}
        {imageURL && !modelURL && (
          <button
            onClick={createModel} disabled={modelLoading}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded"
          >
            {modelLoading ? 'Generating 3D Model...' : 'Generate 3D Model'}
          </button>
        )}
        {modelURL && (
          <a
            href={modelURL} download="model.stl"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded"
          >
            Download STL
          </a>
        )}
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>
    </div>
  </div>
  );
};

export default ModelCreator3DApp;