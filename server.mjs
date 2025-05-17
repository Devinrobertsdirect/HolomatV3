import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs";
import { promises as fsp } from "fs";
import mqtt from "mqtt";
import { spawn } from "child_process";
import fetch from 'node-fetch';

// We no longer need dotenv, but keeping it to avoid breaking other potential env variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Debug logging for critical 3D-printing endpoints
app.use((req, res, next) => {
  const debugPaths = ['/api/3dprint/login', '/api/3dprint/verify'];
  if (debugPaths.includes(req.path)) {
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`, req.body || '');
  }
  next();
});
// Backend API port (CRA dev server proxies API calls here)
const port = process.env.PORT || 3001;

// Use JSON parsing middleware
// Use JSON parsing middleware with increased limit for large image payloads
app.use(express.json({ limit: '50mb' }));
// --- BambuBoard MQTT & API integration ---
// Telemetry cache
let telemetryCache = null;
// Config and token paths
const bambuConfigPath = path.join(__dirname, 'bambu-config.json');
const bambuTokenPath = path.join(__dirname, 'bambu-token.json');
// Default Bambu config
let bambuConfig = {
  printerURL: process.env.BAMBUBOARD_PRINTER_URL || '',
  // Default MQTT port for Bambu printer
  printerPort: process.env.BAMBUBOARD_PRINTER_PORT || 8883,
  printerSN: process.env.BAMBUBOARD_PRINTER_SN || '',
  printerAccessCode: process.env.BAMBUBOARD_PRINTER_ACCESS_CODE || '',
  printerType: process.env.BAMBUBOARD_PRINTER_TYPE || 'X1',
  displayFanPercentages: false,
  displayFanIcons: true
};
// MQTT client state
let mqttClient = null;
let sequenceID = 20000;
let lastPushallTime = 0;
const PUSHALL_INTERVAL = 5 * 60 * 1000;
// Load or initialize config
async function loadBambuConfig() {
  try {
    const data = await fsp.readFile(bambuConfigPath, 'utf-8');
    Object.assign(bambuConfig, JSON.parse(data));
  } catch {
    await fsp.writeFile(bambuConfigPath, JSON.stringify(bambuConfig, null, 2));
  }
}
// Save config and persist
async function saveBambuConfig(newConfig) {
  Object.assign(bambuConfig, newConfig);
  await fsp.writeFile(bambuConfigPath, JSON.stringify(bambuConfig, null, 2));
}
// Load token
let bambuToken = null;
async function loadBambuToken() {
  try {
    const data = await fsp.readFile(bambuTokenPath, 'utf-8');
    bambuToken = JSON.parse(data);
  } catch {
    bambuToken = null;
  }
}
// Save token
async function saveBambuToken(tokenInfo) {
  bambuToken = tokenInfo;
  await fsp.writeFile(bambuTokenPath, JSON.stringify(tokenInfo, null, 2));
}
// --- Hugging Face Text-to-3D Config ---
// Config path for storing HF token and model ID
const hfConfigPath = path.join(__dirname, 'hf-config.json');
// In-memory HF config, seeded from env or default model ID
// Hugging Face text-to-3D model config (default uses official repo ID)
let hfConfig = {
  huggingFaceToken: process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN || '',
  modelID: 'Tencent/Hunyuan3D-2'
};
// Load or initialize HF config
async function loadHFConfig() {
  try {
    const data = await fsp.readFile(hfConfigPath, 'utf-8');
    const parsed = JSON.parse(data);
    if (parsed.huggingFaceToken) hfConfig.huggingFaceToken = parsed.huggingFaceToken;
    if (parsed.modelID) hfConfig.modelID = parsed.modelID;
  } catch {
    // Write default config
    await fsp.writeFile(hfConfigPath, JSON.stringify(hfConfig, null, 2));
  }
}
// Save HF config
async function saveHFConfig(newConfig) {
  Object.assign(hfConfig, newConfig);
  await fsp.writeFile(hfConfigPath, JSON.stringify(hfConfig, null, 2));
}
// MQTT connect/reconnect
function connectMqttClient() {
  if (mqttClient) mqttClient.end(true);
  const { printerURL, printerPort, printerSN, printerAccessCode, printerType } = bambuConfig;
  if (!printerURL || !printerSN || !printerAccessCode) {
    console.warn('Incomplete Bambu settings, MQTT disabled');
    return;
  }
  const clientId = `mqtt_${Math.random().toString(16).slice(2)}`;
  const url = `mqtts://${printerURL}:${printerPort}`;
  mqttClient = mqtt.connect(url, {
    clientId,
    clean: true,
    connectTimeout: 5000,
    username: 'bblp',
    password: printerAccessCode,
    reconnectPeriod: 0,
    rejectUnauthorized: false
  });
  const topicReport = `device/${printerSN}/report`;
  const topicRequest = `device/${printerSN}/request`;
  mqttClient.on('connect', () => {
    console.log('Bambu MQTT connected');
    sequenceID++;
    mqttClient.subscribe(topicReport, () => {
      const msg = { pushing: { sequence_id: sequenceID, command: 'pushall' }, user_id: '0' };
      mqttClient.publish(topicRequest, JSON.stringify(msg));
    });
  });
  mqttClient.on('message', (topic, message) => {
    try {
      const json = JSON.parse(message.toString());
      if (json.print && json.print.gcode_state !== undefined) {
        telemetryCache = json.print;
      }
      const now = Date.now();
      if (
        printerType === 'X1' ||
        (['P1P', 'P1', 'A1'].includes(printerType) && now - lastPushallTime >= PUSHALL_INTERVAL)
      ) {
        sequenceID++;
        const msg = { pushing: { sequence_id: sequenceID, command: 'pushall' }, user_id: '0' };
        mqttClient.publish(topicRequest, JSON.stringify(msg));
        lastPushallTime = now;
      }
    } catch (e) {
      console.error('MQTT message error', e);
    }
  });
}
// Initialize Bambu integration
// Initialize Bambu and HF integration
(async () => {
  await loadBambuConfig();
  await loadBambuToken();
  await loadHFConfig();
  connectMqttClient();
  // Start camera HLS stream
  if (bambuConfig.printerURL) {
    // Ensure output directory exists
    const hlsDir = path.join(__dirname, 'public', 'hls');
    fs.mkdirSync(hlsDir, { recursive: true });
    // Spawn ffmpeg to convert RTSP to HLS
    const rtspUrl = `rtsp://${bambuConfig.printerURL}:8554/live.stream`; // adjust stream URL
    spawn('ffmpeg', [
      '-i', rtspUrl,
      '-c:v', 'copy',
      '-f', 'hls',
      '-hls_time', '1',
      '-hls_list_size', '3',
      '-hls_flags', 'delete_segments',
      path.join(hlsDir, 'stream.m3u8')
    ], { stdio: 'ignore', detached: true });
  }
})();

// Serve HLS segments always
app.use('/hls', express.static(path.join(__dirname, 'public', 'hls')));
// In production, serve static files from the React app if a build is present
if (process.env.NODE_ENV === 'production') {
  const buildDir = path.join(__dirname, 'build');
  const indexHtml = path.join(buildDir, 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.use(express.static(buildDir));
    // Fallback to index.html for SPA
    app.get('*', (req, res) => {
      res.sendFile(indexHtml);
    });
  }
}
// Modified API route to receive API key from request
app.post("/api/token", async (req, res) => {
  try {
    const { 
      apiKey, 
      model = "gpt-4o-mini-realtime-preview", 
      voice = "echo",
      options = {}
    } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ error: "API key is required" });
    }
    
    const requestBody = {
      model,
      voice,
    };
    
    // Add options if they exist
    if (options.system_instruction) {
      requestBody.options = {
        system_instruction: options.system_instruction
      };
    }
    
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const errorData = await response.text();
      return res.status(response.status).json({ 
        error: "Error from OpenAI API", 
        details: errorData 
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error generating token:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

// The "GET" version is kept for backward compatibility, but returns an error message
app.get("/api/token", (req, res) => {
  res.status(400).json({ 
    error: "API key required", 
    message: "Please use POST method and include your API key in the request body" 
  });
});

// Text-to-3D Model generation via Hugging Face Inference API for Hunyuan3D-2
app.post('/api/text-to-model', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text prompt is required' });
  }
  const hfToken = hfConfig.huggingFaceToken;
  if (!hfToken) {
    return res.status(500).json({ error: 'Hugging Face token not configured' });
  }
  try {
    const modelID = hfConfig.modelID;
    const apiUrl = `https://api-inference.huggingface.co/pipeline/text-to-3d?model=${modelID}`;
    console.log('Text-to-3D inference URL:', apiUrl);
    const hfRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/octet-stream'
      },
      body: JSON.stringify({ inputs: text })
    });
    if (!hfRes.ok) {
      const errText = await hfRes.text();
      return res.status(hfRes.status).json({ error: 'Error from Inference API', details: errText });
    }
    res.set('Content-Type', 'model/gltf-binary');
    hfRes.body.pipe(res);
  } catch (err) {
    console.error('Error in /api/text-to-model:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get or set server-side Hugging Face token for text-to-3D
app.get('/api/hf-config', (req, res) => {
  res.json({
    huggingFaceToken: hfConfig.huggingFaceToken,
    modelID: hfConfig.modelID
  });
});
app.post('/api/hf-config', async (req, res) => {
  const { huggingFaceToken, modelID } = req.body;
  if (!huggingFaceToken || !modelID) {
    return res.status(400).json({ error: 'Token and Model ID are required' });
  }
  try {
    await saveHFConfig({ huggingFaceToken, modelID });
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to save HF config:', err);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// --- 3D Printing API Endpoints ---
// Get current Bambu printer settings
app.get('/api/3dprint/config', (req, res) => {
  res.json(bambuConfig);
});
  
  // Save generated image to src/assets/photos
  app.post('/api/save-image', async (req, res) => {
    const { b64 } = req.body;
    console.log('POST /api/save-image called');
    if (!b64) {
      return res.status(400).json({ success: false, error: 'b64 required' });
    }
    try {
      const photosDir = path.join(__dirname, 'src', 'assets', 'photos');
      await fsp.mkdir(photosDir, { recursive: true });
      const fileName = `${Date.now()}.png`;
      const filePath = path.join(photosDir, fileName);
      let buf;
      if (typeof b64 === 'string' && (b64.startsWith('http://') || b64.startsWith('https://'))) {
        // URL: fetch the image
        const imgRes = await fetch(b64);
        if (!imgRes.ok) throw new Error(`Failed to fetch image from URL: ${imgRes.statusText}`);
        buf = await imgRes.buffer();
      } else if (typeof b64 === 'string') {
        // Raw base64 string
        buf = Buffer.from(b64, 'base64');
      } else {
        throw new Error('Invalid b64 payload');
      }
      await fsp.writeFile(filePath, buf);
      console.log('Image saved to disk at', filePath);
      return res.json({ success: true, path: filePath });
    } catch (err) {
      console.error('Failed to save image:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });
// Update Bambu printer settings
app.post('/api/3dprint/config', async (req, res) => {
  try {
    await saveBambuConfig(req.body);
    connectMqttClient();
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to save Bambu config:', err);
    res.status(500).json({ error: 'Failed to save config' });
  }
});
// Login with username and password against BambuLab
app.post('/api/3dprint/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('API /api/3dprint/login called with:', req.body);
  try {
    // Attempt BambuLab login
    const authResponse = await fetch('https://api.bambulab.com/v1/user-service/user/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: username, password, apiError: '' })
    });
    let authData;
    try {
      authData = await authResponse.json();
    } catch (e) {
      console.error('Failed to parse login response:', e);
      return res.status(500).json({ error: 'Invalid login response' });
    }
    if (authData.success) {
      const tokenInfo = {
        accessToken: authData.accessToken,
        refreshToken: authData.refreshToken,
        tokenExpiration: Date.now() + authData.expiresIn * 1000
      };
      await saveBambuToken(tokenInfo);
      return res.json({ success: true });
    }
    if (authData.loginType === 'verifyCode') {
      // Trigger verification code email
      const codeResp = await fetch('https://api.bambulab.com/v1/user-service/user/sendemail/code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username, type: 'codeLogin' })
      });
      if (codeResp.ok) {
        return res.status(401).json({ error: 'Verification code required' });
      } else {
        const txt = await codeResp.text();
        return res.status(500).json({ error: txt });
      }
    }
    // Other loginType such as 'twoFactor'
    return res.status(403).json({ error: 'Login failed' });
  } catch (err) {
    console.error('Error during login:', err);
    return res.status(500).json({ error: 'Login error' });
  }
});
// Verify BambuLab code and store token
app.post('/api/3dprint/verify', async (req, res) => {
  const { email, code } = req.body;
  console.log('API /api/3dprint/verify called with:', req.body);
  try {
    const response = await fetch('https://api.bambulab.com/v1/user-service/user/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: email, code })
    });
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(401).json({ error: errorText });
    }
    const data = await response.json();
    const tokenInfo = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      tokenExpiration: Date.now() + data.expiresIn * 1000
    };
    await saveBambuToken(tokenInfo);
    res.json({ success: true });
  } catch (err) {
    console.error('Error during verification:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});
// Check BambuLab login status
app.get('/api/3dprint/token-status', (req, res) => {
  if (bambuToken && bambuToken.accessToken && bambuToken.tokenExpiration > Date.now()) {
    res.json({ loggedIn: true });
  } else {
    res.json({ loggedIn: false });
  }
});
// Get latest printer telemetry
app.get('/api/3dprint/status', (req, res) => {
  if (telemetryCache) {
    res.json(telemetryCache);
  } else {
    res.status(204).end();
  }
});
// Get current print model info (image, title, weight, total prints)
app.get('/api/3dprint/model', async (req, res) => {
  if (!bambuToken || !bambuToken.accessToken || bambuToken.tokenExpiration < Date.now()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const apiRes = await fetch('https://api.bambulab.com/v1/user-service/my/tasks', {
      method: 'GET',
      headers: { Authorization: `Bearer ${bambuToken.accessToken}` }
    });
    if (!apiRes.ok) {
      const text = await apiRes.text();
      return res.status(apiRes.status).json({ error: text });
    }
    const data = await apiRes.json();
    // pick first task
    const hit = (data.hits && data.hits[0]) || {};
    const modelInfo = {
      imageUrl: hit.cover || '',
      modelTitle: hit.title || '',
      modelWeight: hit.weight || 0,
      modelCostTime: hit.costTime || 0,
      totalPrints: data.total || 0
    };
    res.json(modelInfo);
  } catch (err) {
    console.error('Error fetching model info:', err);
    res.status(500).json({ error: 'Failed to fetch model info' });
  }
});
// In production, serve the React app for any non-API routes
if (process.env.NODE_ENV === 'production') {
  const indexHtml = path.join(__dirname, 'build', 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.get('*', (req, res) => {
      res.sendFile(indexHtml);
    });
  }
}

// Start server
// Start server binding only to localhost to avoid permission issues
app.listen(port, '127.0.0.1', () => {
  console.log(`Server is running on http://127.0.0.1:${port}`);
});
