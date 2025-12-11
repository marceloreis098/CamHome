import React, { useEffect, useState } from 'react';
import { RecordedMedia } from '../types';
import { fetchRecordings } from '../services/mockCameraService';
import { PhotoIcon, SparklesIcon, TagIcon } from './Icons';

const LibraryPanel: React.FC = () => {
  const [media, setMedia] = useState<RecordedMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchRecordings().then(data => {
      setMedia(data);
      setLoading(false);
    });
  }, []);

  const filteredMedia = media.filter(item => 
    item.cameraName.toLowerCase().includes(filter.toLowerCase()) || 
    item.aiTags.some(tag => tag.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-white flex items-center gap-2">
             <PhotoIcon className="w-8 h-8 text-orange-500" />
             Biblioteca de Gravações
           </h2>
           <p className="text-gray-400 text-sm mt-1">
             Arquivo de eventos capturados e snapshots com IA.
           </p>
        </div>
        <div>
          <input 
            type="text" 
            placeholder="Buscar por tag ou câmera..." 
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 w-full md:w-64 focus:outline-none focus:border-orange-500"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
           <div className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredMedia.map(item => (
            <div key={item.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-lg group">
              <div className="relative aspect-video bg-black">
                <img src={item.thumbnailUrl} alt="Recording" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded text-xs text-white backdrop-blur-sm">
                  {item.cameraName}
                </div>
                <div className="absolute top-2 right-2 bg-black/60 px-2 py-0.5 rounded text-xs text-gray-300 backdrop-blur-sm font-mono">
                  {item.timestamp.toLocaleDateString('pt-BR')}
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  {item.aiTags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider bg-indigo-900/40 text-indigo-300 border border-indigo-500/30 px-2 py-1 rounded">
                      <SparklesIcon className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Simulated Manual Tagging for future AI training */}
                <div className="pt-3 border-t border-gray-700 flex items-center gap-2">
                   <TagIcon className="w-4 h-4 text-gray-500" />
                   <input 
                      type="text" 
                      placeholder="Nomear pessoa..." 
                      className="bg-transparent text-sm text-white focus:outline-none w-full placeholder-gray-600"
                   />
                   <button className="text-xs text-orange-500 hover:text-orange-400 font-semibold uppercase">Salvar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredMedia.length === 0 && !loading && (
        <div className="text-center py-20 text-gray-500">
          Nenhuma gravação encontrada com os filtros atuais.
        </div>
      )}
    </div>
  );
};

export default LibraryPanel;