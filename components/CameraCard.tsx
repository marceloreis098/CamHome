import React, { useState } from 'react';
import { Camera, CameraStatus } from '../types';
import { SignalIcon, SparklesIcon, PhotoIcon } from './Icons';
import { analyzeFrame } from '../services/geminiService';
import { urlToBase64 } from '../services/mockCameraService';

interface CameraCardProps {
  camera: Camera;
}

const CameraCard: React.FC<CameraCardProps> = ({ camera }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const getDisplayUrl = () => {
    if (camera.username && camera.password && camera.thumbnailUrl.startsWith('http')) {
      // Inject credentials into the URL (e.g., http://user:pass@192...)
      // Note: This is a basic method. Some modern browsers/scenarios block embedded credentials for security.
      // A robust production app would use a proxy or blob fetching.
      try {
        const urlObj = new URL(camera.thumbnailUrl);
        urlObj.username = camera.username;
        urlObj.password = camera.password;
        return urlObj.toString();
      } catch (e) {
        return camera.thumbnailUrl;
      }
    }
    return camera.thumbnailUrl;
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysis(null);
    
    // Pass credentials to the fetching service so Gemini can see the image
    const base64 = await urlToBase64(camera.thumbnailUrl, camera.username, camera.password);
    if (base64) {
      const result = await analyzeFrame(base64);
      setAnalysis(result);
    } else {
      setAnalysis("Não foi possível capturar o frame. Verifique as credenciais ou a conexão.");
    }
    setIsAnalyzing(false);
  };

  const handleSnapshot = () => {
    // Create a temporary link to download the image
    const link = document.createElement('a');
    link.href = getDisplayUrl();
    link.download = `${camera.name.replace(/\s+/g, '_')}_${new Date().getTime()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          src={getDisplayUrl()} 
          alt={camera.name} 
          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
          onError={(e) => {
            // Fallback UI if auth fails significantly
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            if (target.parentElement) {
              const msg = document.createElement('div');
              msg.className = "text-gray-500 text-xs text-center p-4";
              msg.innerText = "Falha ao carregar imagem. Verifique URL/Credenciais.";
              target.parentElement.appendChild(msg);
            }
          }}
        />
        
        {/* Overlay Controls */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button 
            onClick={handleSnapshot}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium shadow-lg transition-transform active:scale-95"
            title="Gravar Imagem"
          >
            <PhotoIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Gravar</span>
          </button>

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
            <span className="hidden sm:inline">{isAnalyzing ? 'Analisando...' : 'Análise IA'}</span>
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