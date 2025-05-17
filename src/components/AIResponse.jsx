import React from 'react';

const AIResponse = ({ text }) => {
  if (!text) return null;
  
  return (
    <div className="ai-response fixed bottom-32 left-1/2 transform -translate-x-1/2 w-full max-w-lg">
      <div className="bg-gray-900/70 backdrop-blur-md text-blue-100 p-5 rounded-lg border border-blue-500/20 shadow-lg">
        <div className="flex items-center mb-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
          <span className="text-xs text-blue-400 uppercase tracking-wider">JARVIS</span>
        </div>
        <p className="text-lg leading-relaxed">{text}</p>
      </div>
    </div>
  );
};

export default AIResponse;
