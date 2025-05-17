import React, { useState, useEffect } from 'react';

// 3D Printing Dashboard & Printer Configuration
export default function ThreeDPrintingApp({ onClose }) {
  const STORAGE_KEY = 'ThreeDPrintingAppConfig';
  const defaultConfig = {
    printerURL: '',
    // Default MQTT port for Bambu printer
    printerPort: '8883',
    printerSN: '',
    printerAccessCode: '',
    printerType: 'X1',
    // (Fan display removed)
  };
  const savedConfig = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  const [config, setConfig] = useState({ ...defaultConfig, ...savedConfig });
  const [view, setView] = useState(savedConfig.printerURL ? 'dashboard' : 'settings');
  const [telemetry, setTelemetry] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);

  // Fetch telemetry from backend
  const fetchTelemetry = async () => {
    try {
      const res = await fetch('/api/3dprint/status');
      if (res.status === 204) {
        // No content yet
        setTelemetry(null);
      } else if (res.ok) {
        try {
          const data = await res.json();
          setTelemetry(data);
        } catch (e) {
          console.error('Failed to parse telemetry JSON:', e);
          setTelemetry(null);
        }
      } else {
        console.error('Telemetry API error, status:', res.status);
        setTelemetry(null);
      }
    } catch (err) {
      console.error('Error fetching telemetry:', err);
      setTelemetry(null);
    }
  };

  // Poll telemetry and fetch model info when dashboard is active
  useEffect(() => {
    let interval;
    if (view === 'dashboard') {
      fetchTelemetry();
      // Fetch model info once
      fetch('/api/3dprint/model')
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => setModelInfo(data))
        .catch(err => console.error('Error fetching model info:', err));
      interval = setInterval(fetchTelemetry, 2000);
    }
    return () => clearInterval(interval);
  }, [view]);

  // Handle config form input (supports text and checkbox fields)
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Save printer config
  const handleSave = async () => {
    try {
      await fetch('/api/3dprint/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      setView('dashboard');
    } catch (err) {
      console.error('Failed to save printer config:', err);
    }
  };

  // Reset config to defaults
  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setConfig(defaultConfig);
    setView('settings');
  };

  return (
    <div className="h-full w-full flex flex-col bg-black text-white">
      {/* Header Tabs */}
      <div className="flex border-b border-blue-700/40">
        <button
          onClick={() => setView('dashboard')}
          className={`px-4 py-2 focus:outline-none ${
            view === 'dashboard' ? 'border-b-2 border-blue-400 text-blue-200' : 'text-blue-400/70'
          }`}
        >Dashboard</button>
        <button
          onClick={() => setView('settings')}
          className={`px-4 py-2 focus:outline-none ${
            view === 'settings' ? 'border-b-2 border-blue-400 text-blue-200' : 'text-blue-400/70'
          }`}
        >Settings</button>
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="px-4 py-2 text-red-400 hover:text-red-300 focus:outline-none"
        >Close</button>
      </div>
      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {view === 'settings' ? (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-blue-200 font-medium mb-2">Printer Settings</h4>
                <label className="block text-sm text-blue-200">IP / Hostname</label>
                <input name="printerURL" value={config.printerURL} onChange={handleChange}
                  className="mt-1 w-full bg-blue-900/20 text-blue-100 px-3 py-2 rounded" />
                <label className="block text-sm text-blue-200 mt-3">Port</label>
                <input name="printerPort" value={config.printerPort} onChange={handleChange}
                  className="mt-1 w-full bg-blue-900/20 text-blue-100 px-3 py-2 rounded" />
                <label className="block text-sm text-blue-200 mt-3">Serial Number</label>
                <input name="printerSN" value={config.printerSN} onChange={handleChange}
                  className="mt-1 w-full bg-blue-900/20 text-blue-100 px-3 py-2 rounded" />
                <label className="block text-sm text-blue-200 mt-3">Access Code</label>
                <input name="printerAccessCode" type="password" value={config.printerAccessCode} onChange={handleChange}
                  className="mt-1 w-full bg-blue-900/20 text-blue-100 px-3 py-2 rounded" />
                <label className="block text-sm text-blue-200 mt-3">Printer Type</label>
                <select name="printerType" value={config.printerType} onChange={handleChange}
                  className="mt-1 w-full bg-blue-900/20 text-blue-100 px-3 py-2 rounded">
                  <option>X1</option><option>P1</option><option>P1P</option><option>A1</option>
                </select>
                <div className="mt-4 flex space-x-2">
                  <button onClick={handleSave}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded">Save</button>
                  <button onClick={handleReset}
                    className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white rounded">Reset</button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 overflow-auto grid gap-4">
            {!telemetry && !modelInfo ? (
              <div className="text-blue-400">Loading printer data...</div>
            ) : (
              <>
                {/* Print Status with Thumbnail */}
                <div className="bg-gray-900 p-4 rounded border border-blue-700 flex items-start">
                  <div className="flex-1">
                    <h4 className="text-blue-200 mb-2">Print Status</h4>
                    <div className="w-full bg-blue-900 h-2 rounded overflow-hidden mb-2">
                      <div className="bg-blue-500 h-2" style={{ width: `${telemetry.mc_percent}%` }} />
                    </div>
                    <p className="text-sm text-blue-200">{telemetry.gcode_state}</p>
                    <p className="text-sm text-blue-200">{telemetry.mc_percent}% complete</p>
                    <p className="text-sm text-blue-200">Remaining: {telemetry.mc_remaining_time} min</p>
                  </div>
                  {modelInfo && modelInfo.imageUrl && (
                    <img
                      src={modelInfo.imageUrl}
                      alt={modelInfo.modelTitle}
                      className="w-24 h-24 object-contain rounded ml-4"
                    />
                  )}
                </div>
                {/* Live Camera View */}
                <div className="bg-gray-900 p-4 rounded border border-blue-700">
                  <h4 className="text-blue-200 mb-2">Live Camera View</h4>
                  <video
                    src="/hls/stream.m3u8"
                    className="w-full h-48 bg-black rounded"
                    controls
                    autoPlay
                    muted
                  />
                </div>
                {/* Temperatures */}
                <div className="bg-gray-900 p-4 rounded border border-blue-700">
                  <h4 className="text-blue-200 mb-2">Temperatures</h4>
                  {[
                    { label: 'Bed', cur: telemetry.bed_temper, tgt: telemetry.bed_target_temper, color: 'bg-red-500' },
                    { label: 'Nozzle', cur: telemetry.nozzle_temper, tgt: telemetry.nozzle_target_temper, color: 'bg-yellow-500' },
                    { label: 'Chamber', cur: telemetry.chamber_temper, tgt: telemetry.chamber_target_temper, color: 'bg-orange-500' }
                  ].map(({label,cur,tgt,color}) => (
                    <div key={label} className="mb-2">
                      <p className="text-sm text-blue-200">{label}: {cur}°C / {tgt}°C</p>
                      <div className="w-full bg-blue-900 h-1 rounded overflow-hidden">
                        <div className={`${color} h-1`} style={{ width: `${tgt?cur/tgt*100:0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                {/* AMS (Automatic Material System) */}
                {telemetry.ams && telemetry.ams.ams && (
                  <div className="bg-gray-900 p-4 rounded border border-blue-700">
                    <h4 className="text-blue-200 mb-2">AMS</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {telemetry.ams.ams[0].tray.map((t, idx) => (
                        <div key={idx} className="p-2 bg-gray-800 rounded flex items-center space-x-2">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: `#${t.tray_color}` }} />
                          <div>
                            <div className="text-sm text-blue-200">{t.tray_sub_brands || 'Unknown'}</div>
                            <div className="text-xs text-blue-400">{t.remain != null ? `${t.remain}%` : 'Unknown'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}