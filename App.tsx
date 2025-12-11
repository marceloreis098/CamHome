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
import { CameraIcon, CogIcon, PhotoIcon, FileIcon, UserIcon, LockIcon } from './components/Icons';

type Tab = 'dashboard' | 'library' | 'reports' | 'settings';

const App: React.FC = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [storage, setStorage] = useState<StorageStats | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Notification State
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  useEffect(() => {
    // 1. Check for persisted session
    const sessionUser = sessionStorage.getItem('camhome_user');
    if (sessionUser) {
        try {
            const user = JSON.parse(sessionUser);
            // Validate session integrity
            if (user && user.role) {
                setCurrentUser(user);
                setIsAuthenticated(true);
            } else {
                sessionStorage.removeItem('camhome_user');
            }
        } catch(e) {
            console.error("Session invalid");
            sessionStorage.removeItem('camhome_user');
        }
    }

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
        
        // Auto-login logic if auth is disabled in config
        if (sysConfig && !sysConfig.enableAuth && !sessionStorage.getItem('camhome_user')) {
          const autoAdmin: User = { id: 'auto', username: 'admin', name: 'Admin (Auto)', role: 'ADMIN', password: '', createdAt: new Date() };
          setIsAuthenticated(true);
          setCurrentUser(autoAdmin);
          sessionStorage.setItem('camhome_user', JSON.stringify(autoAdmin));
        }
      } catch (error) {
        console.error("Falha ao carregar dados do sistema", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Polling for Notifications
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
        setIsAuthenticated(true);
        setCurrentUser(user);
        sessionStorage.setItem('camhome_user', JSON.stringify(user));
        logAccessAttempt(username, true, 'PASSWORD');
        return true;
    }

    logAccessAttempt(username, false, 'PASSWORD');
    return false;
  };

  const handleLogout = () => {
    // 1. Clear State
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveTab('dashboard');
    
    // 2. Clear Storage
    sessionStorage.removeItem('camhome_user');
    localStorage.removeItem('camhome_user'); // Just in case
    
    // 3. FORCE RELOAD to ensure clean state and show Login Screen
    window.location.reload();
  };

  const handleMarkAsRead = (id: string) => {
    markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? {...n, read: true} : n));
  };

  const handleClearAllNotifs = () => {
    notifications.forEach(n => markNotificationRead(n.id));
    setNotifications(prev => prev.map(n => ({...n, read: true})));
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
      <nav className="sticky top-0 z-50 bg-gray-900/90 backdrop-blur-lg border-b border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setActiveTab('dashboard')}>
              {config?.logoUrl ? (
                <img src={config.logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-contain bg-gray-800 p-1" />
              ) : (
                <div className="bg-orange-600 p-2 rounded-lg shadow-lg shadow-orange-600/20">
                  <CameraIcon className="w-6 h-6 text-white" />
                </div>
              )}
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold tracking-tight text-white">{config?.appName || 'CamHome'}</h1>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Sistema de Vigilância</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4">
               {/* User Badge */}
               <div className="hidden md:flex flex-col items-end mr-2 bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
                  <span className="text-xs font-bold text-white flex items-center gap-1">
                    <UserIcon className="w-3 h-3 text-gray-400"/>
                    {currentUser?.username}
                  </span>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${currentUser?.role === 'ADMIN' ? 'text-orange-400' : 'text-blue-400'}`}>
                    {currentUser?.role === 'ADMIN' ? 'Administrador' : 'Visitante'}
                  </span>
               </div>

               {/* Notifications */}
               {config && (
                 <NotificationSystem 
                    notifications={notifications}
                    minAlertLevel={config.minAlertLevel}
                    onMarkAsRead={handleMarkAsRead}
                    onClearAll={handleClearAllNotifs}
                 />
               )}

               {/* Navigation Tabs (Text + Icon) */}
               <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
                  <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
                  >
                    Visão Geral
                  </button>
                  <button 
                    onClick={() => setActiveTab('library')}
                    className={`hidden md:flex px-3 py-1.5 rounded-md text-sm font-medium transition-all items-center gap-2 ${activeTab === 'library' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
                  >
                    Biblioteca
                  </button>
                  
                  {currentUser?.role === 'ADMIN' && (
                    <>
                      <button 
                        onClick={() => setActiveTab('reports')}
                        className={`hidden md:flex px-3 py-1.5 rounded-md text-sm font-medium transition-all items-center gap-2 ${activeTab === 'reports' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
                      >
                        Relatórios
                      </button>
                      <button 
                        onClick={() => setActiveTab('settings')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-orange-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
                        title="Configurações e Rede"
                      >
                        <CogIcon className="w-4 h-4" />
                        <span className="hidden lg:inline">Config</span>
                      </button>
                    </>
                  )}
               </div>
               
               <button 
                onClick={handleLogout} 
                className="bg-red-900/30 hover:bg-red-900/80 border border-red-900/50 text-red-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                title="Sair do Sistema"
               >
                 SAIR
               </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {activeTab === 'dashboard' && (
          <>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2 text-white">Visão Geral do Sistema</h2>
                <p className="text-gray-400">
                  Monitorando <span className="text-white font-bold">{cameras.length}</span> câmeras ativas na rede local. 
                  {currentUser?.role === 'ADMIN' ? (
                     <span className="text-green-400 ml-1 font-medium">• Modo Administrador</span>
                  ) : (
                     <span className="text-yellow-400 ml-1 font-medium">• Modo Visualização (Limitado)</span>
                  )}
                </p>
              </div>
              <div className="w-full md:w-1/3 lg:w-1/4">
                 {storage && <StorageWidget stats={storage} />}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-xl font-semibold flex items-center gap-2 text-white">
                   <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                   Feeds Ao Vivo
                 </h3>
                 {currentUser?.role === 'ADMIN' && (
                    <button onClick={() => setActiveTab('settings')} className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded border border-gray-600 transition-colors">
                        + Gerenciar Câmeras
                    </button>
                 )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {cameras.map(cam => (
                  <CameraCard key={cam.id} camera={cam} />
                ))}
                
                {/* Empty State / Welcome Screen */}
                {cameras.length === 0 && (
                   <div className="col-span-2 py-16 px-4 bg-gray-800/50 rounded-2xl border border-gray-700 border-dashed flex flex-col items-center justify-center text-center">
                      <div className="bg-gray-800 p-4 rounded-full mb-4 shadow-xl">
                        <CameraIcon className="w-12 h-12 text-gray-500" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Bem-vindo ao CamHome</h3>
                      
                      {currentUser?.role === 'ADMIN' ? (
                        <>
                            <p className="text-gray-400 mb-6 max-w-md">
                                Seu sistema está pronto. Nenhuma câmera foi adicionada ainda. 
                                Vá para as configurações para escanear sua rede ou adicionar manualmente.
                            </p>
                            <button 
                                onClick={() => setActiveTab('settings')} 
                                className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                            >
                                <CogIcon className="w-5 h-5" />
                                Configurar Agora
                            </button>
                        </>
                      ) : (
                        <>
                            <p className="text-gray-400 mb-6 max-w-md">
                                O sistema ainda não possui câmeras configuradas. 
                                Você está logado como <b>Visitante</b> e não tem permissão para adicionar dispositivos.
                            </p>
                            <div className="flex gap-4">
                                <button 
                                    onClick={handleLogout} 
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg transition-transform active:scale-95 flex items-center gap-2 cursor-pointer z-10"
                                >
                                    <LockIcon className="w-5 h-5" />
                                    Entrar como Admin
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-4">
                                (Login padrão: <b>admin</b> / <b>password</b>)
                            </p>
                        </>
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