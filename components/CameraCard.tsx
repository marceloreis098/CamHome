import React, { useState } from 'react';
import { Camera, CameraStatus } from '../types';
import { SignalIcon, SparklesIcon } from './Icons';
import { analyzeFrame } from '../services/geminiService';
import { urlToBase64 } from '../services/mockCameraService';

interface CameraCardProps {
  camera: Camera;
}

const CameraCard: React.FC<CameraCardProps> = ({ camera }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysis(null);
    
    // Simulate getting the current frame
    const base64 = await urlToBase64(camera.thumbnailUrl);
    if (base64) {
      const result = await analyzeFrame(base64);
      setAnalysis(result);
    } else {
      setAnalysis("Não foi possível capturar o frame.");
    }
    setIsAnalyzing(false);
  };

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 bg-gray-800 flex justify-between items-center border-b border-gray-700">
        <div>
          <h3 className="font-semibold text-white">{camera.name}</h3>
          <p className="text-xs text-gray-400 font-mono">{camera.ip} • {camera.model}</p>
        </div>
        <div className="flex items-center gap-2">
          {camera.status === CameraStatus.RECORDING && (
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
          )}
          <SignalIcon className={`w-5 h-5 ${camera.status !== CameraStatus.OFFLINE ? 'text-green-500' : 'text-gray-600'}`} />
        </div>
      </div>

      {/* Feed Area */}
      <div className="relative group bg-black aspect-video flex items-center justify-center overflow-hidden">
        <img 
          src={camera.thumbnailUrl} 
          alt={camera.name} 
          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
        />
        
        {/* Overlay Controls */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-2 bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-4 py-2 rounded-lg font-medium shadow-lg transition-transform active:scale-95 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <SparklesIcon className="w-5 h-5" />
            )}
            {isAnalyzing ? 'Analisando...' : 'Análise IA'}
          </button>
        </div>

        {/* Status Badge */}
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs text-white font-mono">
           {new Date().toLocaleTimeString('pt-BR')}
        </div>
      </div>

      {/* Analysis Result Box */}
      {analysis && (
        <div className="p-4 bg-indigo-900/20 border-t border-indigo-500/30">
          <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <SparklesIcon className="w-3 h-3" /> Insight Gemini
          </h4>
          <p className="text-sm text-indigo-100 leading-relaxed">
            {analysis}
          </p>
        </div>
      )}

      {/* Footer Stats */}
      {!analysis && (
        <div className="p-3 bg-gray-900 border-t border-gray-800 text-xs text-gray-500 flex justify-between">
            <span>Último Evento: {camera.lastEvent || 'Nenhum'}</span>
            <span>Bitrate: 4096 kbps</span>
        </div>
      )}
    </div>
  );
};

export default CameraCard;