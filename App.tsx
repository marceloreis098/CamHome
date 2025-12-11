import React, { useEffect, useState } from 'react';
import { Camera, StorageStats, SystemConfig, SystemNotification, NotificationLevel } from './types';
import { fetchCameras, fetchStorageStats, scanForCameras, updateCamera, fetchSystemConfig, logAccessAttempt, fetchNotifications, markNotificationRead, triggerMockEvent } from './services/mockCameraService';
import CameraCard from './components/CameraCard';
import StorageWidget from './components/StorageWidget';
import SettingsPanel from './components/SettingsPanel';
import LibraryPanel from './components/LibraryPanel';
import ReportsPanel from './components/ReportsPanel';
import LoginScreen from './components/LoginScreen';
import NotificationSystem from './components/NotificationSystem';
import { CameraIcon, CogIcon, PhotoIcon, FileIcon } from './components/Icons';

type Tab = 'dashboard' | 'library' | 'reports' | 'settings';

const App: React.FC = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [storage, setStorage] = useState<StorageStats | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Notification State
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cams, store, sysConfig, notifs] = await Promise.all([
          fetchCameras(),
          fetchStorageStats(),
          fetchSystemConfig(),
          fetchNotifications()
        ]);
        setCameras(cams);
        setStorage(store);
        setConfig(sysConfig);
        setNotifications(notifs);
        
        // Auto-login if auth is disabled
        if (!sysConfig.enableAuth) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("Falha ao carregar dados do sistema", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Polling for Notifications (Simulating Real-time)
  useEffect(() => {
    if (!isAuthenticated) return;

    const intervalId = setInterval(async () => {
       const notifs = await fetchNotifications();
       setNotifications(notifs);
    }, 5000); // Check every 5 seconds

    return () => clearInterval(intervalId);
  }, [isAuthenticated]);

  const handleScan = async () => {
    setScanning(true);
    try {
      const results = await scanForCameras();
      setCameras(results);
      alert("Varredura de rede completa. Status atualizados.");
    } catch (e) {
      console.error(e);
    } finally {
      setScanning(false);
    }
  };

  const handleUpdateCamera = async (updatedCamera: Camera) => {
    await updateCamera(updatedCamera);
    setCameras(prev => prev.map(c => c.id === updatedCamera.id ? updatedCamera : c));
  };

  const handleLogin = (password: string, mfaToken?: string) => {
    if (!config) return false;

    // Check Password
    if (password !== config.password) {
      logAccessAttempt('admin', false, 'PASSWORD');
      return false;
    }

    // Check MFA
    if (config.enableMfa) {
      if (mfaToken === '123456') { // Mock Token
        setIsAuthenticated(true);
        logAccessAttempt('admin', true, 'MFA');
        return true;
      } else {
        logAccessAttempt('admin', false, 'MFA');
        return false;
      }
    }

    // Success (No MFA)
    setIsAuthenticated(true);
    logAccessAttempt('admin', true, 'PASSWORD');
    return true;
  };

  const handleMarkAsRead = (id: string) => {
    markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? {...n, read: true} : n));
  };

  const handleClearAllNotifs = () => {
    notifications.forEach(n => markNotificationRead(n.id));
    setNotifications(prev => prev.map(n => ({...n, read: true})));
  };

  const handleSimulateEvent = () => {
    // Manually trigger an event (for demo purposes)
    const newNotif = triggerMockEvent();
    setNotifications(prev => [newNotif, ...prev]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-orange-500">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
          <span className="font-mono text-sm tracking-wider">INICIALIZANDO...</span>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated && config) {
    return (
      <LoginScreen 
        onLogin={handleLogin} 
        appName={config.appName} 
        mfaEnabled={config.enableMfa}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans selection:bg-orange-500/30">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 bg-gray-900/90 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              {config?.logoUrl ? (
                <img src={config.logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-contain bg-gray-800 p-1" />
              ) : (
                <div className="bg-orange-600 p-2 rounded-lg shadow-lg shadow-orange-600/20">
                  <CameraIcon className="w-6 h-6 text-white" />
                </div>
              )}
              
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">{config?.appName || 'CamHome'}</h1>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Sistema de Vigilância</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
               {activeTab === 'dashboard' && (
                 <button 
                    onClick={handleScan}
                    disabled={scanning}
                    className={`hidden md:block text-sm px-4 py-2 rounded-md border border-gray-700 bg-gray-800 hover:bg-gray-700 transition-colors ${scanning ? 'opacity-50 cursor-not-allowed' : ''}`}
                 >
                   {scanning ? 'Escaneando...' : 'Escanear Rede'}
                 </button>
               )}
               
               {/* Notification System Integration */}
               {config && (
                 <NotificationSystem 
                    notifications={notifications}
                    minAlertLevel={config.minAlertLevel}
                    onMarkAsRead={handleMarkAsRead}
                    onClearAll={handleClearAllNotifs}
                 />
               )}

               {/* Tab Switcher */}
               <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
                  <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-3 py-1.5 rounded-md text-sm transition-all ${activeTab === 'dashboard' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                  >
                    Visão Geral
                  </button>
                  <button 
                    onClick={() => setActiveTab('library')}
                    className={`hidden md:flex px-3 py-1.5 rounded-md text-sm transition-all items-center gap-2 ${activeTab === 'library' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                  >
                    <PhotoIcon className="w-4 h-4" />
                    Biblioteca
                  </button>
                  <button 
                    onClick={() => setActiveTab('reports')}
                    className={`hidden md:flex px-3 py-1.5 rounded-md text-sm transition-all items-center gap-2 ${activeTab === 'reports' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                  >
                    <FileIcon className="w-4 h-4" />
                    Relatórios
                  </button>
                  <button 
                    onClick={() => setActiveTab('settings')}
                    className={`px-3 py-1.5 rounded-md text-sm transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                  >
                    <CogIcon className="w-4 h-4" />
                  </button>
               </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {activeTab === 'dashboard' && (
          <>
            {/* Dashboard Header */}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">Visão Geral do Sistema</h2>
                <p className="text-gray-400">
                  Monitorando {cameras.length} câmeras ativas na rede local. 
                  Imagens sendo gravadas no armazenamento externo.
                </p>
                
                {/* Debug Button for Testing Notifications */}
                <button 
                  onClick={handleSimulateEvent}
                  className="mt-4 text-xs bg-gray-800 border border-gray-600 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded transition-colors"
                >
                  [Debug] Simular Evento Crítico
                </button>
              </div>
              <div className="w-full md:w-1/3 lg:w-1/4">
                 {storage && <StorageWidget stats={storage} />}
              </div>
            </div>

            {/* Camera Grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-xl font-semibold flex items-center gap-2">
                   <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                   Feeds Ao Vivo
                 </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {cameras.map(cam => (
                  <CameraCard key={cam.id} camera={cam} />
                ))}
              </div>
            </div>

            {/* Quick Config / Info Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-gray-800">
               <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700/50">
                  <h4 className="font-bold text-orange-400 mb-2">Hardware</h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li className="flex justify-between"><span>Dispositivo:</span> <span className="text-white">Orange Pi 5</span></li>
                    <li className="flex justify-between"><span>Sistema:</span> <span className="text-white">Ubuntu Server 22.04</span></li>
                    <li className="flex justify-between"><span>Tempo Ligado:</span> <span className="text-white">3d 4h 12m</span></li>
                  </ul>
               </div>

               <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700/50">
                  <h4 className="font-bold text-blue-400 mb-2">Rede</h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li className="flex justify-between"><span>Gateway:</span> <span className="font-mono text-white">192.168.1.1</span></li>
                    <li className="flex justify-between"><span>Subnet:</span> <span className="font-mono text-white">255.255.255.0</span></li>
                    <li className="flex justify-between"><span>Interface:</span> <span className="font-mono text-white">eth0</span></li>
                  </ul>
               </div>

               <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700/50">
                  <h4 className="font-bold text-purple-400 mb-2">Módulo IA</h4>
                  <p className="text-sm text-gray-400 mb-3">
                    Powered by Gemini 2.5 Flash para detecção de objetos em tempo real e análise de anomalias nos snapshots.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-green-400">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>API Conectada</span>
                  </div>
               </div>
            </div>
          </>
        )}
        
        {activeTab === 'library' && (
          <LibraryPanel />
        )}

        {activeTab === 'reports' && (
          <ReportsPanel />
        )}

        {activeTab === 'settings' && (
          <SettingsPanel 
            cameras={cameras} 
            onUpdateCamera={handleUpdateCamera} 
            onConfigChange={setConfig}
          />
        )}

      </main>
    </div>
  );
};

export default App;