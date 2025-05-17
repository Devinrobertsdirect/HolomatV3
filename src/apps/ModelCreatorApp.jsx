import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// Model Creator App - generates 3D models from text prompts and displays them
const ModelCreatorApp = ({ onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [modelUrl, setModelUrl] = useState(null);

  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRef = useRef(null);

  // Initialize Three.js scene
  useEffect(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1929);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(800, 600);
    rendererRef.current = renderer;

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(renderer.domElement);
    }

    const ambient = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambient);
    const point = new THREE.PointLight(0xffffff, 1);
    point.position.set(10, 10, 10);
    scene.add(point);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (modelRef.current) {
        scene.remove(modelRef.current);
      }
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Load model when URL changes
  useEffect(() => {
    if (!modelUrl || !sceneRef.current) return;
    const loader = new GLTFLoader();
    if (modelRef.current) {
      sceneRef.current.remove(modelRef.current);
    }
    loader.load(
      modelUrl,
      gltf => {
        modelRef.current = gltf.scene;
        sceneRef.current.add(gltf.scene);
      },
      undefined,
      error => {
        console.error('Error loading model:', error);
        alert('Failed to load generated model.');
      }
    );
  }, [modelUrl]);

  // Handle generation request via HF inference pipeline directly
  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    try {
      // Send prompt to local text-to-3D API server
      const apiUrl = '/api/text-to-model';
      console.log('Calling local text-to-3D API:', apiUrl);
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: prompt })
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`${res.status} ${errorText}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setModelUrl(url);
    } catch (err) {
      console.error(err);
      alert('Generation failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 bg-blue-900/20 rounded-lg p-3 border border-blue-900/30">
        <div className="text-blue-100 text-lg font-light tracking-wider">Model Creator</div>
        <button onClick={onClose} className="text-blue-300 hover:text-blue-100">×</button>
      </div>
      <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-900/30 mb-4">
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Enter a text prompt..."
          className="w-full bg-blue-950/20 border border-blue-900/30 text-blue-200 p-2 rounded mb-2"
          rows={3}
        />
        <button
          onClick={handleGenerate}
          disabled={loading || !prompt}
          className="bg-blue-700 disabled:bg-blue-800/50 hover:bg-blue-600 text-blue-100 px-4 py-2 rounded"
        >
          {loading ? 'Generating...' : 'Generate Model'}
        </button>
      </div>
      <div
        ref={containerRef}
        className="flex-1 rounded-lg overflow-hidden bg-blue-950/20 border border-blue-900/20"
      />
    </div>
  );
};

export default ModelCreatorApp;