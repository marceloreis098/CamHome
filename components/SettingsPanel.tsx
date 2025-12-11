import React, { useState, useEffect } from 'react';
import { Camera, CameraStatus, FileNode, SystemConfig, AccessLog, NotificationLevel } from '../types';
import { fetchFileSystem, fetchSystemConfig, updateSystemConfig, fetchAccessLogs } from '../services/mockCameraService';
import { CogIcon, HddIcon, FolderIcon, FileIcon, GlobeIcon, LockIcon, UserIcon, SmartphoneIcon, SignalIcon, BellIcon, CameraIcon } from './Icons';

interface SettingsPanelProps {
  cameras: Camera[];
  onUpdateCamera: (camera: Camera) => Promise<void>;
  onAddCamera: (camera: Camera) => Promise<void>;
  onDeleteCamera: (id: string) => Promise<void>;
  onConfigChange: (config: SystemConfig) => void;
}

type SettingsSection = 'camera-config' | 'storage-config' | 'general-config' | 'security-config' | 'network-config' | 'new-camera';

// Recursive component to render file tree
const FileTreeItem: React.FC<{ node: FileNode; level: number }> = ({ node, level }) => {
  const [isOpen, setIsOpen] = useState(node.isOpen || false);
  const paddingLeft = level * 16;

  const toggleOpen = () => {
    if (node.type !== 'file') setIsOpen(!isOpen);
  };

  return (
    <div>
      <div 
        className={`flex items-center gap-2 py-1 px-2 hover:bg-gray-700/50 cursor-pointer text-sm ${isOpen ? 'text-white' : 'text-gray-400'}`}
        style={{ paddingLeft: `${paddingLeft + 8}px` }}
        onClick={toggleOpen}
      >
        {node.type === 'drive' && <HddIcon className="w-4 h-4 text-orange-500" />}
        {node.type === 'folder' && <FolderIcon className={`w-4 h-4 ${isOpen ? 'text-yellow-400' : 'text-gray-500'}`} />}
        {node.type === 'file' && <FileIcon className="w-4 h-4 text-blue-400" />}
        <span>{node.name}</span>
        {node.size && <span className="ml-auto text-xs text-gray-600 mr-2">{node.size}</span>}
      </div>
      {isOpen && node.children && (
        <div>
          {node.children.map(child => <FileTreeItem key={child.id} node={child} level={level + 1} />)}
        </div>
      )}
    </div>
  );
};

const SettingsPanel: React.FC<SettingsPanelProps> = ({ cameras, onUpdateCamera, onAddCamera, onDeleteCamera, onConfigChange }) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general-config');
  const [selectedCameraId, setSelectedCameraId] = useState<string>(cameras[0]?.id || '');
  const [fileSystem, setFileSystem] = useState<FileNode | null>(null);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(false);
  
  // MFA Setup State
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  
  useEffect(() => {
    if (activeSection === 'storage-config' && !fileSystem) {
      fetchFileSystem().then(setFileSystem);
    }
    if (activeSection === 'security-config') {
      fetchAccessLogs().then(setAccessLogs);
    }
    if (!systemConfig) {
      fetchSystemConfig().then(setSystemConfig);
    }
  }, [activeSection, fileSystem, systemConfig]);

  const selectedCamera = cameras.find(c => c.id === selectedCameraId);
  
  const handleCameraSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCamera) return;
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const updated: Camera = {
      ...selectedCamera,
      name: formData.get('name') as string,
      ip: formData.get('ip') as string,
      model: formData.get('model') as string,
      thumbnailUrl: formData.get('thumbnailUrl') as string,
      username: formData.get('username') as string,
      password: formData.get('password') as string,
      resolution: formData.get('resolution') as string,
      framerate: parseInt(formData.get('framerate') as string, 10),
      bitrate: parseInt(formData.get('bitrate') as string, 10),
    };

    setLoading(true);
    await onUpdateCamera(updated);
    setLoading(false);
    alert('Configurações da câmera salvas!');
  };

  const handleNewCameraSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const newCam: Camera = {
      id: `cam-${Date.now()}`,
      name: formData.get('name') as string,
      ip: formData.get('ip') as string,
      model: formData.get('model') as string || 'Generic IP Cam',
      status: CameraStatus.ONLINE,
      thumbnailUrl: formData.get('thumbnailUrl') as string || 'https://via.placeholder.com/800x600?text=No+Signal',
      username: formData.get('username') as string,
      password: formData.get('password') as string,
      resolution: '1080p',
      framerate: 15,
      bitrate: 2048,
      externalTraffic: false
    };

    setLoading(true);
    await onAddCamera(newCam);
    setLoading(false);
    setActiveSection('camera-config');
    setSelectedCameraId(newCam.id);
    alert('Nova câmera adicionada com sucesso!');
  };

  const handleDeleteCamera = async () => {
    if (!selectedCamera) return;
    if (confirm(`Tem certeza que deseja excluir a câmera "${selectedCamera.name}"?`)) {
       setLoading(true);
       await onDeleteCamera(selectedCamera.id);
       setLoading(false);
       setActiveSection('general-config');
    }
  };

  const handleSystemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!systemConfig) return;

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const newConfig: SystemConfig = {
      ...systemConfig,
      appName: formData.get('appName') as string || systemConfig.appName,
      logoUrl: formData.get('logoUrl') as string || undefined,
      username: formData.get('username') as string || systemConfig.username,
      password: (formData.get('password') as string) || systemConfig.password,
      enableAuth: !!formData.get('enableAuth'),
      ddnsProvider: formData.get('ddnsProvider') as any,
      ddnsHostname: formData.get('ddnsHostname') as string,
      minAlertLevel: (formData.get('minAlertLevel') as NotificationLevel) || NotificationLevel.INFO,
    };

    setLoading(true);
    await updateSystemConfig(newConfig);
    setSystemConfig(newConfig);
    onConfigChange(newConfig);
    setLoading(false);
    alert('Configurações do sistema atualizadas!');
  };

  const verifyAndEnableMfa = async () => {
    if (mfaCode === '123456') {
       const newConfig = { ...systemConfig!, enableMfa: true };
       await updateSystemConfig(newConfig);
       setSystemConfig(newConfig);
       onConfigChange(newConfig);
       setShowMfaSetup(false);
       alert("Autenticação de Dois Fatores (MFA) ativada com sucesso!");
    } else {
       alert("Código incorreto. Tente '123456' para simulação.");
    }
  };

  const disableMfa = async () => {
     if(confirm("Tem certeza que deseja desativar o MFA? Isso reduz a segurança.")) {
        const newConfig = { ...systemConfig!, enableMfa: false };
        await updateSystemConfig(newConfig);
        setSystemConfig(newConfig);
        onConfigChange(newConfig);
     }
  };

  if (!systemConfig) return <div className="p-10 text-center text-gray-500">Carregando configurações...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Sidebar List */}
      <div className="md:col-span-1 space-y-6">
        
        {/* Devices */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-1 flex justify-between items-center">
             Dispositivos
             <button 
                onClick={() => setActiveSection('new-camera')}
                className="text-xs bg-orange-600 hover:bg-orange-500 text-white px-2 py-0.5 rounded"
             >
                + ADD
             </button>
          </h3>
          <div className="space-y-1">
            {cameras.map((cam) => (
              <button
                key={cam.id}
                onClick={() => {
                   setActiveSection('camera-config');
                   setSelectedCameraId(cam.id);
                }}
                className={`w-full text-left p-2 rounded-lg text-sm transition-all flex items-center justify-between ${
                  activeSection === 'camera-config' && selectedCameraId === cam.id
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <span className="truncate">{cam.name}</span>
                <span className={`w-2 h-2 rounded-full shrink-0 ${cam.status === CameraStatus.ONLINE ? 'bg-green-400' : 'bg-red-400'}`}></span>
              </button>
            ))}
          </div>
        </div>

        {/* General */}
        <div>
           <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">Sistema</h3>
           <div className="space-y-1">
             <button
               onClick={() => setActiveSection('general-config')}
               className={`w-full text-left p-2 rounded-lg text-sm transition-all flex items-center gap-2 ${activeSection === 'general-config' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
             >
               <CogIcon className="w-4 h-4" /> <span>Geral</span>
             </button>
             <button
               onClick={() => setActiveSection('security-config')}
               className={`w-full text-left p-2 rounded-lg text-sm transition-all flex items-center gap-2 ${activeSection === 'security-config' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
             >
               <LockIcon className="w-4 h-4" /> <span>Segurança</span>
             </button>
             <button
               onClick={() => setActiveSection('network-config')}
               className={`w-full text-left p-2 rounded-lg text-sm transition-all flex items-center gap-2 ${activeSection === 'network-config' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
             >
               <GlobeIcon className="w-4 h-4" /> <span>Rede</span>
             </button>
             <button
             onClick={() => setActiveSection('storage-config')}
             className={`w-full text-left p-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
               activeSection === 'storage-config'
                 ? 'bg-orange-600 text-white'
                 : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
             }`}
           >
             <HddIcon className="w-4 h-4" />
             <span>Arquivos</span>
           </button>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="md:col-span-3">
        
        {/* NEW CAMERA FORM */}
        {activeSection === 'new-camera' && (
          <form onSubmit={handleNewCameraSubmit} className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl">
             <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
               <h2 className="text-xl font-bold text-white flex items-center gap-2">
                 <CameraIcon className="w-6 h-6 text-green-500" />
                 Adicionar Nova Câmera
               </h2>
             </div>
             <div className="space-y-4 max-w-2xl">
                <div>
                   <label className="block text-sm text-gray-400 mb-1">Nome de Exibição</label>
                   <input required name="name" placeholder="Ex: Câmera Garagem" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500" />
                </div>
                <div>
                   <label className="block text-sm text-gray-400 mb-1">Endereço IP</label>
                   <input required name="ip" placeholder="Ex: 192.168.1.105" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-green-500" />
                </div>
                <div>
                   <label className="block text-sm text-gray-400 mb-1">URL da Imagem/Snapshot (JPG ou MJPEG)</label>
                   <input required name="thumbnailUrl" placeholder="Ex: http://192.168.1.105/snap.jpg" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-green-500" />
                   <p className="text-xs text-gray-500 mt-1">
                      Navegadores não suportam RTSP diretamente. Use a URL HTTP de Snapshot ou MJPEG da sua câmera.
                   </p>
                </div>
                
                {/* Auth Section */}
                <div className="grid grid-cols-2 gap-4 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                    <div className="col-span-2 text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1">
                      Autenticação (Se necessário)
                    </div>
                    <div>
                       <label className="block text-sm text-gray-400 mb-1">Usuário</label>
                       <input name="username" placeholder="admin" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500" />
                    </div>
                    <div>
                       <label className="block text-sm text-gray-400 mb-1">Senha</label>
                       <input type="password" name="password" placeholder="••••••" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500" />
                    </div>
                </div>

                <div>
                   <label className="block text-sm text-gray-400 mb-1">Modelo</label>
                   <input name="model" placeholder="Ex: TP-Link Tapo, Intelbras, etc" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500" />
                </div>
             </div>
             <div className="mt-8 pt-6 border-t border-gray-700 flex justify-end gap-3">
                 <button type="button" onClick={() => setActiveSection('general-config')} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button>
                 <button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-semibold shadow-lg">
                   {loading ? 'Adicionando...' : 'Adicionar Câmera'}
                 </button>
             </div>
          </form>
        )}

        {/* GENERAL CONFIGURATION */}
        {activeSection === 'general-config' && (
          <form onSubmit={handleSystemSubmit} className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-6 border-b border-gray-700 pb-4">Configurações Gerais</h2>
            
            <div className="space-y-6 max-w-lg">
               <div>
                  <label className="block text-sm text-gray-400 mb-1">Nome da Aplicação</label>
                  <input name="appName" defaultValue={systemConfig.appName} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500" />
               </div>
               
               <div>
                  <label className="block text-sm text-gray-400 mb-1">URL do Logo</label>
                  <input name="logoUrl" defaultValue={systemConfig.logoUrl || ''} placeholder="https://exemplo.com/logo.png" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500" />
               </div>

               {/* Notification Settings */}
               <div className="pt-4 border-t border-gray-700">
                  <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <BellIcon className="w-4 h-4 text-orange-400" />
                    Preferências de Notificação
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Exibir popups (Toasts) para alertas de nível:</label>
                      <select 
                        name="minAlertLevel" 
                        defaultValue={systemConfig.minAlertLevel || NotificationLevel.INFO} 
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                      >
                         <option value={NotificationLevel.INFO}>Todos (Informação, Aviso, Crítico)</option>
                         <option value={NotificationLevel.WARNING}>Importantes (Aviso, Crítico)</option>
                         <option value={NotificationLevel.CRITICAL}>Apenas Críticos</option>
                      </select>
                      <p className="text-[10px] text-gray-500 mt-1">Isso controla quais notificações aparecem flutuando na tela. Todas ficam salvas no histórico.</p>
                    </div>
                  </div>
               </div>
            </div>

            <div className="mt-6">
               <button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-lg font-semibold">{loading ? 'Salvando...' : 'Salvar Alterações'}</button>
            </div>
          </form>
        )}

        {/* SECURITY CONFIGURATION */}
        {activeSection === 'security-config' && (
          <div className="space-y-6">
            <form onSubmit={handleSystemSubmit} className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-6 border-b border-gray-700 pb-4 flex items-center gap-2"><LockIcon className="w-6 h-6 text-orange-500" /> Segurança do App</h2>
              
              <div className="space-y-6 max-w-lg">
                <div className="flex items-center justify-between bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                    <div>
                      <h4 className="font-semibold text-white">Ativar Autenticação</h4>
                      <p className="text-xs text-gray-400">Exigir login ao iniciar.</p>
                    </div>
                    <input type="checkbox" name="enableAuth" defaultChecked={systemConfig.enableAuth} className="w-5 h-5 accent-orange-500" />
                </div>

                {/* Password Change */}
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Usuário Admin</label>
                    <div className="flex items-center gap-2 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2">
                      <UserIcon className="w-4 h-4 text-gray-500" />
                      <input name="username" defaultValue={systemConfig.username} className="bg-transparent text-white w-full focus:outline-none" />
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Alterar Senha</label>
                    <div className="flex items-center gap-2 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2">
                      <LockIcon className="w-4 h-4 text-gray-500" />
                      <input type="password" name="password" defaultValue={systemConfig.password} className="bg-transparent text-white w-full focus:outline-none" placeholder="Nova senha..." />
                    </div>
                </div>

                {/* MFA Section */}
                <div className="bg-indigo-900/20 p-4 rounded-lg border border-indigo-500/30">
                  <div className="flex justify-between items-center">
                    <div>
                        <h4 className="font-semibold text-white flex items-center gap-2">
                          <SmartphoneIcon className="w-4 h-4 text-indigo-400" />
                          Autenticação de Fator Duplo (MFA)
                        </h4>
                        <p className="text-xs text-gray-400">Proteja o app com Google Authenticator.</p>
                    </div>
                    {systemConfig.enableMfa ? (
                        <button type="button" onClick={disableMfa} className="text-xs bg-red-600 text-white px-3 py-1 rounded">Desativar</button>
                    ) : (
                        <button type="button" onClick={() => setShowMfaSetup(true)} className="text-xs bg-green-600 text-white px-3 py-1 rounded">Configurar</button>
                    )}
                  </div>
                  
                  {showMfaSetup && !systemConfig.enableMfa && (
                    <div className="mt-4 bg-gray-900 p-4 rounded border border-gray-700 text-center">
                       <p className="text-sm text-white mb-2">1. Escaneie este QR Code no seu app (Authy/Google Auth):</p>
                       <div className="w-32 h-32 bg-white mx-auto mb-2 flex items-center justify-center text-black font-bold text-xs">[QR CODE MOCK]</div>
                       <p className="text-sm text-white mb-2">2. Digite o código gerado:</p>
                       <div className="flex gap-2 justify-center">
                          <input 
                            value={mfaCode}
                            onChange={(e) => setMfaCode(e.target.value)}
                            className="bg-gray-800 text-white border border-gray-600 rounded w-24 text-center py-1" 
                            placeholder="123456" 
                            maxLength={6}
                          />
                          <button type="button" onClick={verifyAndEnableMfa} className="bg-indigo-600 text-white px-3 py-1 rounded text-sm">Verificar</button>
                       </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-lg font-semibold">{loading ? 'Salvando...' : 'Salvar Alterações'}</button>
              </div>
            </form>

            {/* Access Logs Table */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl">
               <h3 className="text-lg font-bold text-white mb-4">Histórico de Acesso (Logs)</h3>
               <div className="overflow-x-auto max-h-60 overflow-y-auto">
                 <table className="w-full text-left text-sm text-gray-300">
                    <thead className="bg-gray-900 text-gray-400 text-xs uppercase">
                       <tr>
                          <th className="px-4 py-2">Data/Hora</th>
                          <th className="px-4 py-2">Usuário</th>
                          <th className="px-4 py-2">IP</th>
                          <th className="px-4 py-2">Método</th>
                          <th className="px-4 py-2">Status</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                       {accessLogs.map(log => (
                         <tr key={log.id}>
                            <td className="px-4 py-2">{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                            <td className="px-4 py-2">{log.user}</td>
                            <td className="px-4 py-2 font-mono text-xs">{log.ip}</td>
                            <td className="px-4 py-2">{log.method === 'MFA' ? 'Senha + Token' : 'Senha'}</td>
                            <td className="px-4 py-2">
                               <span className={`px-2 py-0.5 rounded text-xs ${log.status === 'SUCCESS' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                                 {log.status}
                               </span>
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {/* NETWORK CONFIGURATION */}
        {activeSection === 'network-config' && (
           <div className="space-y-6">
              <form onSubmit={handleSystemSubmit} className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><GlobeIcon className="w-6 h-6 text-blue-500" /> Rede e Monitoramento</h2>
                
                {/* Traffic Monitor */}
                <div className="mb-8">
                   <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Análise de Tráfego de Câmeras</h3>
                   <div className="space-y-3">
                     {cameras.map(cam => (
                        <div key={cam.id} className="bg-gray-900 p-3 rounded-lg border border-gray-700 flex justify-between items-center">
                           <div className="flex items-center gap-3">
                              <span className={`w-2 h-2 rounded-full ${cam.status === 'ONLINE' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                              <div>
                                 <p className="text-sm font-semibold text-white">{cam.name}</p>
                                 <p className="text-xs text-gray-500">{cam.ip}</p>
                              </div>
                           </div>
                           <div className="text-right">
                              {cam.externalTraffic ? (
                                <span className="flex items-center gap-1 text-xs text-yellow-500 bg-yellow-900/20 px-2 py-1 rounded border border-yellow-500/30">
                                   <SignalIcon className="w-3 h-3" /> Conexão Externa Detectada
                                </span>
                              ) : (
                                <span className="text-xs text-green-500 bg-green-900/20 px-2 py-1 rounded">Tráfego Local Apenas</span>
                              )}
                           </div>
                        </div>
                     ))}
                   </div>
                   <p className="text-xs text-gray-500 mt-2 italic">
                     * Detectamos que algumas câmeras (Ex: Yoosee) tentam comunicar com servidores externos (China/AWS). Recomendamos configurar regras de Firewall no seu roteador para bloquear acesso WAN para estes IPs, mantendo apenas a LAN.
                   </p>
                </div>

                <div className="border-t border-gray-700 pt-6">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Configuração DDNS</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                     <div>
                        <label className="block text-sm text-gray-400 mb-1">Provedor</label>
                        <select name="ddnsProvider" defaultValue={systemConfig.ddnsProvider} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white">
                          <option value="noip">No-IP</option>
                          <option value="duckdns">DuckDNS</option>
                          <option value="custom">Personalizado</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm text-gray-400 mb-1">Hostname</label>
                        <input name="ddnsHostname" defaultValue={systemConfig.ddnsHostname} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono" />
                     </div>
                  </div>
                  <div className="flex justify-end">
                     <button type="submit" className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded">Salvar Configurações</button>
                  </div>
                </div>
              </form>
           </div>
        )}

        {/* CAMERA CONFIGURATION */}
        {activeSection === 'camera-config' && selectedCamera && (
          <form onSubmit={handleCameraSubmit} className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl">
             <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
               <h2 className="text-xl font-bold text-white flex items-center gap-2">
                 <CogIcon className="w-6 h-6 text-gray-400" />
                 Editar Câmera: {selectedCamera.name}
               </h2>
               <div className="flex gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-mono flex items-center ${selectedCamera.status === CameraStatus.ONLINE ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                    {selectedCamera.status}
                  </span>
                  <button type="button" onClick={handleDeleteCamera} className="bg-red-900/50 hover:bg-red-900 text-red-400 px-3 py-1 rounded text-xs border border-red-800">
                    EXCLUIR
                  </button>
               </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-orange-400 uppercase tracking-wider">Rede & Dispositivo</h4>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Nome da Câmera</label>
                  <input name="name" defaultValue={selectedCamera.name} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Endereço IP</label>
                  <input name="ip" defaultValue={selectedCamera.ip} pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                   <label className="block text-sm text-gray-400 mb-1">URL da Imagem/Snapshot</label>
                   <input name="thumbnailUrl" defaultValue={selectedCamera.thumbnailUrl} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-orange-500" />
                </div>
                
                {/* Auth Section Edit */}
                <div className="grid grid-cols-2 gap-4 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                    <div className="col-span-2 text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1">
                      Autenticação
                    </div>
                    <div>
                       <label className="block text-sm text-gray-400 mb-1">Usuário</label>
                       <input name="username" defaultValue={selectedCamera.username} placeholder="admin" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500" />
                    </div>
                    <div>
                       <label className="block text-sm text-gray-400 mb-1">Senha</label>
                       <input type="password" name="password" defaultValue={selectedCamera.password} placeholder="••••••" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500" />
                    </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Modelo do Dispositivo</label>
                  <input name="model" defaultValue={selectedCamera.model} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500" />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">Vídeo & Stream</h4>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Resolução</label>
                  <select name="resolution" key={selectedCamera.resolution} defaultValue={selectedCamera.resolution} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500">
                    <option value="640x480">SD (640x480)</option>
                    <option value="1280x720">HD (720p)</option>
                    <option value="1920x1080">Full HD (1080p)</option>
                    <option value="2560x1440">2K (1440p)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Taxa de Quadros (FPS)</label>
                  <div className="flex items-center gap-4">
                    <input type="range" name="framerate" min="10" max="60" step="1" defaultValue={selectedCamera.framerate} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500" onChange={(e) => { const span = document.getElementById('fps-val'); if(span) span.innerText = `${e.target.value} FPS`; }} />
                    <span id="fps-val" className="text-xs font-mono w-16 text-right">{selectedCamera.framerate} FPS</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Taxa de Bits (Bitrate)</label>
                   <select name="bitrate" key={selectedCamera.bitrate} defaultValue={selectedCamera.bitrate} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500">
                    <option value="1024">Baixa (1024 kbps)</option>
                    <option value="2048">Média (2048 kbps)</option>
                    <option value="4096">Alta (4096 kbps)</option>
                    <option value="8192">Ultra (8192 kbps)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-gray-700">
               <button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-lg font-semibold shadow-lg shadow-orange-600/20 disabled:opacity-50 flex items-center gap-2">
                 {loading ? 'Salvando...' : 'Salvar Configuração'}
               </button>
            </div>
          </form>
        )}

        {/* STORAGE CONFIGURATION */}
        {activeSection === 'storage-config' && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl">
             <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
               <h2 className="text-xl font-bold text-white flex items-center gap-2">
                 <HddIcon className="w-6 h-6 text-orange-500" />
                 Gerenciamento de Armazenamento
               </h2>
               <div className="text-sm text-gray-400">
                 Caminho: <code className="bg-gray-900 px-2 py-1 rounded text-orange-400">/mnt/orange_drive_1tb</code>
               </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {/* File Browser */}
              <div className="bg-gray-900 rounded-lg border border-gray-600 overflow-hidden">
                <div className="bg-gray-800 px-4 py-2 border-b border-gray-600 flex items-center justify-between">
                   <span className="text-sm font-semibold text-gray-300">Explorador de Arquivos</span>
                   <button className="text-xs text-blue-400 hover:text-blue-300">Atualizar</button>
                </div>
                <div className="p-2 h-64 overflow-y-auto">
                   {fileSystem ? (
                     <FileTreeItem node={fileSystem} level={0} />
                   ) : (
                     <div className="flex items-center justify-center h-full text-gray-500">Carregando sistema de arquivos...</div>
                   )}
                </div>
              </div>
              
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SettingsPanel;