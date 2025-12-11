
import React, { useState, useEffect } from 'react';
import { Camera, CameraStatus, FileNode, SystemConfig, AccessLog, NotificationLevel, User, DiscoveredDevice } from '../types';
import { fetchFileSystem, fetchSystemConfig, updateSystemConfig, fetchAccessLogs, fetchUsers, saveUser, deleteUser, scanNetworkForDevices, formatStorage } from '../services/mockCameraService';
import { CogIcon, HddIcon, FolderIcon, FileIcon, GlobeIcon, LockIcon, UserIcon, SmartphoneIcon, SignalIcon, BellIcon, CameraIcon, CheckCircleIcon } from './Icons';

interface SettingsPanelProps {
  cameras: Camera[];
  onUpdateCamera: (camera: Camera) => Promise<void>;
  onAddCamera: (camera: Camera) => Promise<void>;
  onDeleteCamera: (id: string) => Promise<void>;
  onConfigChange: (config: SystemConfig) => void;
  currentUser: User;
}

// Extended interface for frontend to handle the suggested URL
interface ExtendedDiscoveredDevice extends DiscoveredDevice {
    suggestedUrl?: string;
}

type SettingsSection = 'camera-config' | 'storage-config' | 'general-config' | 'security-config' | 'network-config' | 'new-camera' | 'user-management';

// Common Presets based on User Feedback
const CAMERA_PRESETS = [
    { label: 'Selecione um Modelo (Ajuda Rápida)', value: '' },
    { label: 'Vstarcam / Eye4', value: 'vstarcam', url: 'http://[IP]/snapshot.cgi?user=[USER]&pwd=[PASS]' },
    { label: 'Genérica ONVIF (Porta 8080)', value: 'onvif_8080', url: 'http://[IP]:8080/onvif/snapshot' },
    { label: 'Hikvision / HiLook', value: 'hikvision', url: 'http://[IP]/ISAPI/Streaming/channels/101/picture' },
    { label: 'Intelbras / Dahua', value: 'dahua', url: 'http://[IP]/cgi-bin/snapshot.cgi?channel=1' },
    { label: 'Yoosee (ONVIF 5000)', value: 'yoosee', url: 'http://[IP]:5000/snapshot' },
    { label: 'XiongMai (XM / CMS)', value: 'xiongmai', url: 'http://[IP]/snap.jpg' },
    { label: 'Genérica (Porta 80)', value: 'generic', url: 'http://[IP]/snapshot.jpg' }
];

const SettingsPanel: React.FC<SettingsPanelProps> = ({ cameras, onUpdateCamera, onAddCamera, onDeleteCamera, onConfigChange, currentUser }) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general-config');
  const [selectedCameraId, setSelectedCameraId] = useState<string>(cameras[0]?.id || '');
  const [fileSystem, setFileSystem] = useState<FileNode | null>(null);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Scan State
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<ExtendedDiscoveredDevice[]>([]);
  const [scannedOnce, setScannedOnce] = useState(false);

  // User Mgmt State
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Storage State
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  // New Camera State
  const [useHttps, setUseHttps] = useState(false);

  useEffect(() => {
    if (activeSection === 'storage-config' && !fileSystem) {
      fetchFileSystem().then(setFileSystem);
    }
    if (activeSection === 'user-management') {
      fetchUsers().then(setUsers);
    }
    if (!systemConfig) {
      fetchSystemConfig().then(setSystemConfig);
    }
  }, [activeSection, fileSystem, systemConfig]);

  const selectedCamera = cameras.find(c => c.id === selectedCameraId);
  
  // --- CAMERA HANDLERS ---
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
      streamUrl: formData.get('streamUrl') as string,
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
      streamUrl: formData.get('streamUrl') as string,
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
    setUseHttps(false); // Reset
    alert('Nova câmera adicionada com sucesso!');
  };

  const handleAddFromScan = (device: ExtendedDiscoveredDevice) => {
    // Open the new camera form with pre-filled data
    setActiveSection('new-camera');
    
    // Auto detect HTTPS from suggested URL
    const isHttps = device.suggestedUrl?.toLowerCase().startsWith('https') || false;
    setUseHttps(isHttps); 

    // We use a timeout to let the DOM render the form, then populate inputs
    setTimeout(() => {
        const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement;
        const ipInput = document.querySelector('input[name="ip"]') as HTMLInputElement;
        const modelInput = document.querySelector('input[name="model"]') as HTMLInputElement;
        const urlInput = document.querySelector('input[name="thumbnailUrl"]') as HTMLInputElement;
        const streamInput = document.querySelector('input[name="streamUrl"]') as HTMLInputElement;
        
        if (nameInput) nameInput.value = `${device.manufacturer.split(' ')[0]} Cam`;
        if (ipInput) ipInput.value = device.ip;
        if (modelInput) modelInput.value = device.model;
        
        if (urlInput && device.suggestedUrl) {
            urlInput.value = device.suggestedUrl;
        }

        // Try to guess RTSP stream for convenience
        if (streamInput && device.ip) {
            streamInput.value = `rtsp://${device.ip}:554/onvif1`;
        }
        
        const usernameInput = document.querySelector('input[name="username"]') as HTMLInputElement;
        if(usernameInput) usernameInput.focus(); // Focus on Auth
    }, 100);
  };

  const handleHttpsToggle = (checked: boolean) => {
      setUseHttps(checked);
      const urlInput = document.querySelector('input[name="thumbnailUrl"]') as HTMLInputElement;
      const ipInput = document.querySelector('input[name="ip"]') as HTMLInputElement;
      
      if (urlInput && urlInput.value) {
          if (checked) {
              urlInput.value = urlInput.value.replace('http://', 'https://');
          } else {
              urlInput.value = urlInput.value.replace('https://', 'http://');
          }
      } else if (checked && urlInput && ipInput && ipInput.value) {
          // If empty but checked and we have IP, construct basic https
          urlInput.value = `https://${ipInput.value}/snapshot.jpg`;
      }
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selected = CAMERA_PRESETS.find(p => p.value === e.target.value);
      if (selected && selected.value) {
          const ipInput = document.querySelector('input[name="ip"]') as HTMLInputElement;
          const urlInput = document.querySelector('input[name="thumbnailUrl"]') as HTMLInputElement;
          
          let template = selected.url;
          if (useHttps) {
              template = template.replace('http://', 'https://');
          }

          if (ipInput && ipInput.value) {
              urlInput.value = template.replace('[IP]', ipInput.value);
          } else {
              urlInput.value = template;
          }
      }
  };

  // --- SCAN HANDLER ---
  const runScan = async () => {
    setIsScanning(true);
    try {
        const devices = await scanNetworkForDevices();
        setDiscoveredDevices(devices);
        setScannedOnce(true);
    } catch(e) {
        alert("Erro no scan: " + (e as Error).message);
    }
    setIsScanning(false);
  };

  // --- USER HANDLERS ---
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    // Simple validation
    if (!editingUser.username || !editingUser.name) return;

    setLoading(true);
    const userToSave: User = {
        id: editingUser.id || `u-${Date.now()}`,
        username: editingUser.username,
        name: editingUser.name,
        password: editingUser.password || '123456', // Default or existing
        role: editingUser.role || 'USER',
        createdAt: editingUser.createdAt || new Date()
    };
    
    await saveUser(userToSave);
    const updatedUsers = await fetchUsers();
    setUsers(updatedUsers);
    setLoading(false);
    setShowUserModal(false);
    setEditingUser(null);
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm("Tem certeza?")) {
        await deleteUser(id);
        setUsers(await fetchUsers());
    }
  };

  // --- STORAGE HANDLERS ---
  const handleFormat = async () => {
    if (!selectedPath) {
        alert("Selecione um drive/pasta primeiro.");
        return;
    }
    if (confirm(`ATENÇÃO: Isso apagará TODOS os dados em ${selectedPath}. Deseja continuar?`)) {
        setLoading(true);
        try {
            await formatStorage(selectedPath);
            alert("Formatação/Limpeza concluída com sucesso.");
        } catch (e) {
            alert("Erro ao formatar: " + (e as Error).message);
        } finally {
            setLoading(false);
        }
    }
  };

  const handleSetRecordingPath = async () => {
    if (!selectedPath || !systemConfig) return;
    setLoading(true);
    const newConfig = { ...systemConfig, recordingPath: selectedPath };
    await updateSystemConfig(newConfig);
    setSystemConfig(newConfig);
    setLoading(false);
    alert(`Caminho de gravação alterado para: ${selectedPath}`);
  };

  // --- SYSTEM HANDLERS ---
  const handleSystemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!systemConfig) return;
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const updates: Partial<SystemConfig> = {};
    
    // Check which fields are present in the form to update only those
    if (formData.has('appName')) updates.appName = formData.get('appName') as string;
    if (formData.has('logoUrl')) updates.logoUrl = formData.get('logoUrl') as string;
    if (formData.has('minAlertLevel')) updates.minAlertLevel = formData.get('minAlertLevel') as NotificationLevel;
    
    if (formData.has('ddnsProvider')) updates.ddnsProvider = formData.get('ddnsProvider') as 'noip' | 'duckdns' | 'custom';
    if (formData.has('ddnsHostname')) updates.ddnsHostname = formData.get('ddnsHostname') as string;

    const newConfig = { ...systemConfig, ...updates };

    setLoading(true);
    await updateSystemConfig(newConfig);
    setSystemConfig(newConfig);
    onConfigChange(newConfig);
    setLoading(false);
    alert('Configurações salvas com sucesso.');
  };

  const handleDeleteCamera = async () => {
    if (!selectedCamera) return;
    if (confirm(`Tem certeza que deseja excluir a câmera ${selectedCamera.name}?`)) {
        setLoading(true);
        await onDeleteCamera(selectedCamera.id);
        setLoading(false);
        setSelectedCameraId('');
        setActiveSection('general-config');
    }
  };

  // --- FILESYSTEM COMPONENT (Nested) ---
  const FileTreeItem: React.FC<{ node: FileNode; level: number }> = ({ node, level }) => {
    const [isOpen, setIsOpen] = useState(node.isOpen || false);
    const paddingLeft = level * 16;
    
    const isSelected = selectedPath === node.path;

    const handleClick = () => {
        if (node.type !== 'file') {
            setIsOpen(!isOpen);
            setSelectedPath(node.path);
        }
    };

    return (
      <div>
        <div 
          className={`flex items-center gap-2 py-1.5 px-2 cursor-pointer text-sm transition-colors
            ${isSelected ? 'bg-orange-900/40 text-orange-200 border-l-2 border-orange-500' : 'text-gray-400 hover:bg-gray-700/50'}
          `}
          style={{ paddingLeft: `${paddingLeft + 8}px` }}
          onClick={handleClick}
        >
          {node.type === 'drive' && <HddIcon className="w-4 h-4 text-orange-500" />}
          {node.type === 'folder' && <FolderIcon className={`w-4 h-4 ${isOpen ? 'text-yellow-400' : 'text-gray-500'}`} />}
          {node.type === 'file' && <FileIcon className="w-4 h-4 text-blue-400" />}
          <span className="truncate">{node.name}</span>
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
                + MANUAL
             </button>
          </h3>
          <button
                onClick={() => setActiveSection('new-camera')}
                className={`w-full text-left p-2 rounded-lg text-sm transition-all flex items-center gap-2 mb-2 ${activeSection === 'new-camera' ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >
             <SignalIcon className="w-4 h-4" /> Escanear / Adicionar
          </button>
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
                    ? 'bg-orange-900/50 text-orange-200 border border-orange-700'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200 border border-transparent'
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
               className={`w-full text-left p-2 rounded-lg text-sm transition-all flex items-center gap-2 ${activeSection === 'general-config' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
             >
               <CogIcon className="w-4 h-4" /> <span>Geral</span>
             </button>
             <button
               onClick={() => setActiveSection('user-management')}
               className={`w-full text-left p-2 rounded-lg text-sm transition-all flex items-center gap-2 ${activeSection === 'user-management' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
             >
               <UserIcon className="w-4 h-4" /> <span>Usuários</span>
             </button>
             <button
               onClick={() => setActiveSection('network-config')}
               className={`w-full text-left p-2 rounded-lg text-sm transition-all flex items-center gap-2 ${activeSection === 'network-config' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
             >
               <GlobeIcon className="w-4 h-4" /> <span>Rede</span>
             </button>
             <button
             onClick={() => setActiveSection('storage-config')}
             className={`w-full text-left p-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
               activeSection === 'storage-config'
                 ? 'bg-gray-700 text-white'
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
        
        {/* NEW CAMERA / SCAN */}
        {activeSection === 'new-camera' && (
          <div className="space-y-8">
              {/* Scan Section */}
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl">
                 <div className="flex justify-between items-center mb-4">
                     <h2 className="text-lg font-bold text-white flex items-center gap-2">
                         <SignalIcon className="w-5 h-5 text-blue-500" />
                         Descoberta de Rede
                     </h2>
                     <button 
                        onClick={runScan} 
                        disabled={isScanning}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-sm disabled:opacity-50"
                     >
                        {isScanning ? 'Escaneando...' : 'Escanear Rede'}
                     </button>
                 </div>
                 
                 {isScanning && (
                     <div className="py-8 text-center text-gray-500 animate-pulse">Procurando dispositivos compatíveis (ONVIF/RTSP/RTMP/HTTP)...</div>
                 )}

                 {!isScanning && scannedOnce && (
                     <div className="space-y-2">
                        {discoveredDevices.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">Nenhum dispositivo novo encontrado.</p>
                        ) : (
                            discoveredDevices.map((dev, idx) => (
                                <div key={idx} className="bg-gray-900 p-3 rounded flex justify-between items-center border border-gray-700">
                                    <div>
                                        <div className="text-white font-semibold text-sm">{dev.manufacturer}</div>
                                        <div className="text-xs text-gray-500 font-mono">IP: {dev.ip} • MAC: {dev.mac}</div>
                                        {dev.suggestedUrl && (
                                            <div className="text-[10px] text-gray-600 mt-1 truncate max-w-xs">{dev.suggestedUrl}</div>
                                        )}
                                    </div>
                                    {dev.isAdded ? (
                                        <span className="text-xs text-green-500 bg-green-900/20 px-2 py-1 rounded flex items-center gap-1">
                                            <CheckCircleIcon className="w-3 h-3"/> Adicionado
                                        </span>
                                    ) : (
                                        <button 
                                            onClick={() => handleAddFromScan(dev)}
                                            className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs font-bold"
                                        >
                                            + ADICIONAR
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                     </div>
                 )}
              </div>

              {/* Manual Form */}
              <form onSubmit={handleNewCameraSubmit} className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl">
                <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <CameraIcon className="w-6 h-6 text-green-500" />
                    Detalhes da Câmera
                </h2>
                </div>
                <div className="space-y-4 max-w-2xl">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Nome de Exibição</label>
                            <input required name="name" placeholder="Ex: Câmera Rua" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Endereço IP</label>
                            <input required name="ip" placeholder="Ex: 192.168.1.25" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-green-500" />
                        </div>
                    </div>
                    
                    {/* HTTPS Toggle */}
                    <div className="flex items-center gap-3 bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                        <div className="flex items-center h-5">
                            <input 
                                id="https_toggle" 
                                type="checkbox" 
                                checked={useHttps}
                                onChange={(e) => handleHttpsToggle(e.target.checked)}
                                className="w-4 h-4 text-orange-600 bg-gray-700 border-gray-600 rounded focus:ring-orange-500 focus:ring-2" 
                            />
                        </div>
                        <div className="text-sm">
                            <label htmlFor="https_toggle" className="font-medium text-white">Usar Conexão Segura (HTTPS)</label>
                            <p className="text-xs text-gray-500">Marque se sua câmera requer SSL/TLS (Porta 443).</p>
                        </div>
                    </div>

                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                         <div className="mb-4">
                             <label className="block text-sm text-blue-400 font-bold mb-1">Assistente de Configuração</label>
                             <p className="text-xs text-gray-500 mb-2">Selecione o modelo para preencher as URLs automaticamente com base no IP acima.</p>
                             <select 
                                name="model" 
                                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                onChange={handlePresetChange}
                            >
                                {CAMERA_PRESETS.map(p => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                            </select>
                         </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">URL Snapshot (HTTP/HTTPS)</label>
                        <input required name="thumbnailUrl" placeholder={useHttps ? "https://192.168.1.X/snapshot.cgi..." : "http://192.168.1.X/snapshot.cgi..."} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-green-500" />
                        <p className="text-[10px] text-gray-500 mt-1">Esta URL permite ver a câmera no painel.</p>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">URL Stream (RTSP - Opcional)</label>
                        <input name="streamUrl" placeholder="rtsp://192.168.1.X:554/onvif1" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-green-500" />
                        <p className="text-[10px] text-gray-500 mt-1">Usada para gravação contínua ou players externos (VLC).</p>
                    </div>
                    
                    {/* Auth Section */}
                    <div className="grid grid-cols-2 gap-4 bg-orange-900/10 p-4 rounded-lg border border-orange-900/30">
                        <div className="col-span-2 text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                            <LockIcon className="w-3 h-3" /> Credenciais da Câmera
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
                </div>
                <div className="mt-8 pt-6 border-t border-gray-700 flex justify-end gap-3">
                    <button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-semibold shadow-lg">
                    {loading ? 'Salvando...' : 'Salvar Câmera'}
                    </button>
                </div>
            </form>
          </div>
        )}

        {/* USER MANAGEMENT */}
        {activeSection === 'user-management' && (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <UserIcon className="w-6 h-6 text-orange-500" />
                        Gestão de Usuários
                    </h2>
                    <button 
                        onClick={() => { setEditingUser({}); setShowUserModal(true); }}
                        className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                    >
                        + Novo Usuário
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-300">
                        <thead className="bg-gray-900 text-gray-400 text-xs uppercase">
                            <tr>
                                <th className="px-4 py-3">Nome</th>
                                <th className="px-4 py-3">Usuário</th>
                                <th className="px-4 py-3">Papel (Role)</th>
                                <th className="px-4 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-gray-750">
                                    <td className="px-4 py-3 font-medium text-white">{u.name}</td>
                                    <td className="px-4 py-3">{u.username}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'ADMIN' ? 'bg-indigo-900 text-indigo-300' : 'bg-gray-700 text-gray-300'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 flex gap-2">
                                        <button 
                                            onClick={() => { setEditingUser(u); setShowUserModal(true); }}
                                            className="text-blue-400 hover:underline"
                                        >
                                            Editar
                                        </button>
                                        {u.id !== currentUser.id && (
                                            <button 
                                                onClick={() => handleDeleteUser(u.id)}
                                                className="text-red-400 hover:underline"
                                            >
                                                Excluir
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* User Modal */}
                {showUserModal && editingUser && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-600 w-full max-w-md">
                            <h3 className="text-lg font-bold text-white mb-4">{editingUser.id ? 'Editar Usuário' : 'Novo Usuário'}</h3>
                            <form onSubmit={handleSaveUser} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Nome Completo</label>
                                    <input 
                                        required 
                                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" 
                                        value={editingUser.name || ''}
                                        onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Username (Login)</label>
                                    <input 
                                        required 
                                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" 
                                        value={editingUser.username || ''}
                                        onChange={e => setEditingUser({...editingUser, username: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Senha {editingUser.id && '(Deixe em branco para manter)'}</label>
                                    <input 
                                        type="password"
                                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" 
                                        placeholder={editingUser.id ? '••••••' : 'Senha'}
                                        value={editingUser.password || ''}
                                        onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Nível de Acesso</label>
                                    <select 
                                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                                        value={editingUser.role || 'USER'}
                                        onChange={e => setEditingUser({...editingUser, role: e.target.value as any})}
                                    >
                                        <option value="USER">Usuário Comum (Visualizar)</option>
                                        <option value="ADMIN">Administrador (Total)</option>
                                    </select>
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <button type="button" onClick={() => setShowUserModal(false)} className="px-4 py-2 text-gray-400">Cancelar</button>
                                    <button type="submit" className="bg-orange-600 text-white px-4 py-2 rounded font-bold">Salvar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
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

        {/* CAMERA CONFIGURATION EDIT */}
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
                 <div>
                   <label className="block text-sm text-gray-400 mb-1">URL Stream (RTSP)</label>
                   <input name="streamUrl" defaultValue={selectedCamera.streamUrl} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-orange-500" />
                </div>
                
                {/* AUTHENTICATION SECTION (EDIT) */}
                <div className="grid grid-cols-2 gap-4 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                    <div className="col-span-2 text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1">
                      Autenticação (Se necessário)
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
               <div className="text-sm text-gray-400 flex flex-col items-end">
                 <span className="text-xs text-gray-500">Caminho de Gravação Atual:</span>
                 <code className="bg-gray-900 px-2 py-1 rounded text-orange-400 mt-1">{systemConfig.recordingPath}</code>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* File Browser */}
              <div className="bg-gray-900 rounded-lg border border-gray-600 overflow-hidden flex flex-col h-80">
                <div className="bg-gray-800 px-4 py-2 border-b border-gray-600 flex items-center justify-between">
                   <span className="text-sm font-semibold text-gray-300">Explorador de Arquivos</span>
                   <button onClick={() => fetchFileSystem().then(setFileSystem)} className="text-xs text-blue-400 hover:text-blue-300">Atualizar</button>
                </div>
                <div className="p-2 flex-1 overflow-y-auto">
                   {fileSystem ? (
                     <FileTreeItem node={fileSystem} level={0} />
                   ) : (
                     <div className="flex items-center justify-center h-full text-gray-500">Carregando sistema de arquivos...</div>
                   )}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-6">
                <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-700">
                    <h3 className="text-white font-bold mb-2">Ações de Partição</h3>
                    <p className="text-xs text-gray-400 mb-4">
                        Selecione uma pasta ou drive no explorador ao lado para habilitar as ações.
                    </p>

                    <div className="space-y-3">
                         <button 
                            onClick={handleSetRecordingPath}
                            disabled={!selectedPath}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                         >
                            <FolderIcon className="w-4 h-4"/>
                            Definir como Local de Gravação
                         </button>

                         <button 
                            onClick={handleFormat}
                            disabled={!selectedPath}
                            className="w-full bg-red-900/50 hover:bg-red-900 disabled:bg-gray-700 disabled:text-gray-500 text-red-200 border border-red-800 px-4 py-2 rounded text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                         >
                            <HddIcon className="w-4 h-4"/>
                            Formatar Disco / Limpar Pasta
                         </button>
                    </div>

                    {selectedPath && (
                        <div className="mt-4 p-2 bg-gray-900 rounded border border-gray-700 text-xs text-gray-400 break-all">
                            Selecionado: <span className="text-orange-400">{selectedPath}</span>
                        </div>
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
