import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../contexts/SettingsContext';

// Speech2TextApp: press and hold the button to transcribe speech to text in real time.
const Speech2TextApp = ({ onClose }) => {
  const { settings } = useSettings();
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Initialize SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('SpeechRecognition API not supported');
      setSupported(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      // Show only the combined final + current interim, replacing previous
      setTranscript(finalTranscript + interimTranscript);
    };
    recognition.onerror = (e) => {
      console.error('SpeechRecognition error', e);
      setListening(false);
    };
    recognitionRef.current = recognition;
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !listening) {
      setTranscript('');
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

  if (!supported) {
    return (
      <div className="p-4 text-red-400">
        <button onClick={onClose} className="text-xs text-blue-300">← Back</button>
        <p>SpeechRecognition API is not supported in this browser.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-4">
        <button onClick={onClose} className="text-xs text-blue-300">← Back</button>
        <h2 className="text-lg font-light">Speech2Text</h2>
        <button
          onMouseDown={startListening}
          onMouseUp={stopListening}
          onTouchStart={startListening}
          onTouchEnd={stopListening}
          className={
            `px-6 py-3 rounded-full text-white ${listening ? 'bg-red-500' : 'bg-blue-600'}`
          }
        >
          {listening ? 'Listening...' : 'Hold to Talk'}
        </button>
        <div className="mt-4 p-2 bg-gray-800 text-white rounded h-32 overflow-auto whitespace-pre-wrap">
          {transcript || <span className="text-blue-300/60">Your speech will appear here...</span>}
        </div>
      </div>
    </div>
  );
};

export default Speech2TextApp;