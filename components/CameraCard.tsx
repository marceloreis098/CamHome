import React, { useState, useEffect, useRef } from 'react';
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
  
  // Refresh mechanism for Live View (simulating video via snapshots)
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLive, setIsLive] = useState(true);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLive && !imgError) {
        // Refresh every 1.5 seconds to balance load vs fluidity
        interval = setInterval(() => {
            setRefreshTrigger(prev => prev + 1);
        }, 1500);
    }
    return () => clearInterval(interval);
  }, [isLive, imgError]);

  // Use the Backend Proxy to fetch images. 
  // This solves CORS issues and Credential stripping by browsers.
  const getProxyUrl = () => {
      if (!camera.thumbnailUrl) return '';
      
      // Determine base URL (handle dev vs prod)
      const isDev = process.env.NODE_ENV === 'development' || window.location.port === '1234';
      const baseUrl = isDev ? `http://${window.location.hostname}:3000` : '';
      
      const params = new URLSearchParams();
      params.append('url', camera.thumbnailUrl);
      if (camera.username) params.append('username', camera.username);
      if (camera.password) params.append('password', camera.password);
      
      // Cache buster
      params.append('_t', refreshTrigger.toString());

      return `${baseUrl}/api/proxy?${params.toString()}`;
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysis(null);
    
    // We can fetch the proxy URL directly to get the blob for analysis
    try {
        const proxyUrl = getProxyUrl();
        const response = await fetch(proxyUrl);
        const blob = await response.blob();
        
        // Convert blob to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = (reader.result as string).split(',')[1];
            const result = await analyzeFrame(base64);
            setAnalysis(result);
            setIsAnalyzing(false);
        };
        reader.readAsDataURL(blob);
    } catch (e) {
      setAnalysis("Não foi possível capturar o frame para análise.");
      setIsAnalyzing(false);
    }
  };

  const handleSnapshot = () => {
    const link = document.createElement('a');
    link.href = getProxyUrl(); // Download from proxy to ensure auth works
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
          {isLive && !imgError && (
             <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
             </span>
          )}
          <SignalIcon className={`w-5 h-5 ${!imgError ? 'text-green-500' : 'text-red-500'}`} />
        </div>
      </div>

      {/* Feed Area */}
      <div className="relative group bg-black aspect-video flex items-center justify-center overflow-hidden">
        <img 
          src={getProxyUrl()} 
          alt={camera.name} 
          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
          onError={(e) => {
             setImgError(true);
             setIsLive(false); // Stop trying to refresh if it fails
          }}
          onLoad={() => {
             if (imgError) setImgError(false); // Recovery
          }}
        />
        
        {/* Error Overlay */}
        {imgError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 p-6 text-center">
                <SignalIcon className="w-10 h-10 text-red-500 mb-2" />
                <p className="text-white font-bold text-sm">Sem Sinal / Erro de Autenticação</p>
                <p className="text-xs text-gray-400 mt-1">Verifique IP, URL de Snapshot ou Senha nas configurações.</p>
                <button 
                    onClick={() => { setImgError(false); setIsLive(true); setRefreshTrigger(prev => prev+1); }}
                    className="mt-4 bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-xs text-white"
                >
                    Tentar Novamente
                </button>
            </div>
        )}

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
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs text-white font-mono flex items-center gap-2">
           <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
           {isLive ? 'AO VIVO' : 'PAUSADO'}
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
        <div className="p-3 bg-gray-900 border-t border-gray-800 text-xs text-gray-500 flex justify-between items-center">
            <span>Último Evento: {camera.lastEvent || 'Nenhum'}</span>
            <div className="flex gap-2">
                <button onClick={() => setIsLive(!isLive)} className="hover:text-white">
                    {isLive ? 'Pausar' : 'Retomar'}
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default CameraCard;