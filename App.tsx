import React, { useEffect, useState } from 'react';
import { Camera, StorageStats, SystemConfig, SystemNotification, User } from './types';
import { fetchCameras, addCamera, deleteCamera, fetchStorageStats, updateCamera, fetchSystemConfig, logAccessAttempt, fetchNotifications, markNotificationRead, triggerMockEvent, authenticateUser } from './services/mockCameraService';
import CameraCard from './components/CameraCard';
import StorageWidget from './components/StorageWidget';
import SettingsPanel from './components/SettingsPanel';
import LibraryPanel from './components/LibraryPanel';
import ReportsPanel from './components/ReportsPanel';
import LoginScreen from './components/LoginScreen';
import NotificationSystem from './components/NotificationSystem';
import { CameraIcon, CogIcon, PhotoIcon, FileIcon, UserIcon } from './components/Icons';

type Tab = 'dashboard' | 'library' | 'reports' | 'settings';

const App: React.FC = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [storage, setStorage] = useState<StorageStats | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
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
        
        // Auto-login if auth is disabled (Mocking an admin user for auto-login)
        if (!sysConfig.enableAuth) {
          setIsAuthenticated(true);
          setCurrentUser({
             id: 'auto', username: 'admin', name: 'Admin (Auto)', role: 'ADMIN', password: '', createdAt: new Date()
          });
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
    }, 5000); 

    return () => clearInterval(intervalId);
  }, [isAuthenticated]);

  const handleUpdateCamera = async (updatedCamera: Camera) => {
    await updateCamera(updatedCamera);
    setCameras(prev => prev.map(c => c.id === updatedCamera.id ? updatedCamera : c));
  };

  const handleAddCamera = async (newCam: Camera) => {
    await addCamera(newCam);
    setCameras(prev => [...prev, newCam]);
  };

  const handleDeleteCamera = async (id: string) => {
    await deleteCamera(id);
    setCameras(prev => prev.filter(c => c.id !== id));
  };

  const handleLogin = async (username: string, password: string, mfaToken?: string) => {
    const user = await authenticateUser(username, password);
    
    if (user) {
        // MFA Check logic would go here if enabled in config
        setIsAuthenticated(true);
        setCurrentUser(user);
        logAccessAttempt(username, true, 'PASSWORD');
        return true;
    }

    logAccessAttempt(username, false, 'PASSWORD');
    return false;
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveTab('dashboard');
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
               {/* User Info */}
               <div className="hidden md:flex flex-col items-end mr-2">
                  <span className="text-xs font-bold text-white">{currentUser?.name}</span>
                  <span className="text-[10px] text-orange-400 uppercase">{currentUser?.role === 'ADMIN' ? 'Administrador' : 'Usuário'}</span>
               </div>

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
                  
                  {currentUser?.role === 'ADMIN' && (
                    <>
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
                    </>
                  )}
               </div>
               
               <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300 ml-2">Sair</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {activeTab === 'dashboard' && (
          <>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">Visão Geral do Sistema</h2>
                <p className="text-gray-400">
                  Monitorando {cameras.length} câmeras ativas na rede local. 
                  {currentUser?.role === 'ADMIN' ? ' Acesso total concedido.' : ' Acesso de visualização.'}
                </p>
                
                {currentUser?.role === 'ADMIN' && (
                  <button 
                    onClick={handleSimulateEvent}
                    className="mt-4 text-xs bg-gray-800 border border-gray-600 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded transition-colors"
                  >
                    [Debug] Simular Evento Crítico
                  </button>
                )}
              </div>
              <div className="w-full md:w-1/3 lg:w-1/4">
                 {storage && <StorageWidget stats={storage} />}
              </div>
            </div>

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
                {cameras.length === 0 && (
                   <div className="col-span-2 text-center py-10 bg-gray-800 rounded-lg border border-gray-700 border-dashed">
                      <p className="text-gray-400 mb-2">Nenhuma câmera configurada.</p>
                      {currentUser?.role === 'ADMIN' && (
                        <button onClick={() => setActiveTab('settings')} className="text-orange-500 hover:underline">Ir para configurações</button>
                      )}
                   </div>
                )}
              </div>
            </div>
          </>
        )}
        
        {activeTab === 'library' && (
          <LibraryPanel />
        )}

        {/* Protected Tabs */}
        {activeTab === 'reports' && currentUser?.role === 'ADMIN' && (
          <ReportsPanel />
        )}

        {activeTab === 'settings' && currentUser?.role === 'ADMIN' && (
          <SettingsPanel 
            cameras={cameras} 
            onUpdateCamera={handleUpdateCamera}
            onAddCamera={handleAddCamera}
            onDeleteCamera={handleDeleteCamera}
            onConfigChange={setConfig}
            currentUser={currentUser}
          />
        )}

      </main>
    </div>
  );
};

export default App;