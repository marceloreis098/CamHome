import { Camera, CameraStatus, StorageStats, RecordedMedia, FileNode, SystemConfig, AccessLog, SystemNotification, NotificationLevel, User, DiscoveredDevice } from '../types';

const STORAGE_KEY_CAMERAS = 'camhome_cameras';
const STORAGE_KEY_CONFIG = 'camhome_config';
const STORAGE_KEY_USERS = 'camhome_users';

// --- MOCK DATA ---

const DEFAULT_ADMIN: User = {
    id: 'u1',
    username: 'admin',
    password: 'password',
    name: 'Administrador',
    role: 'ADMIN',
    createdAt: new Date()
};

const DEFAULT_USERS: User[] = [
  DEFAULT_ADMIN,
  {
    id: 'u2',
    username: 'visitante',
    password: '123',
    name: 'Membro da Família',
    role: 'USER',
    createdAt: new Date()
  }
];

const DEFAULT_CAMERAS: Camera[] = []; // Start empty to force setup usage

const DEFAULT_RECORDINGS: RecordedMedia[] = [];

let INITIAL_CONFIG: SystemConfig = {
  appName: 'CamHome',
  enableAuth: true,
  enableMfa: false,
  ddnsProvider: 'noip',
  ddnsHostname: 'minha-camera.ddns.net',
  recordingPath: '/mnt/orange_drive_1tb/gravacoes',
  minAlertLevel: NotificationLevel.INFO,
  enableSound: true
};

let INITIAL_STORAGE: StorageStats = {
  total: 1000, // 1TB
  used: 450,
  path: '/mnt/orange_drive_1tb',
  label: 'Orange Drive 1TB',
  isMounted: true
};

// --- HELPERS ---

// SMART FETCH: The core fix for "HTML response" errors.
// It tries the relative path first. If it gets HTML (Nginx 404/Fallback) or fails,
// it falls back to direct port 3000 connection.
const smartFetch = async (endpoint: string, options: RequestInit = {}) => {
    // 1. Determine Primary URL
    const isDev = process.env.NODE_ENV === 'development' || window.location.port === '1234';
    let primaryUrl = endpoint; // Default relative for Production
    if (isDev) {
         primaryUrl = `http://${window.location.hostname}:3000${endpoint}`;
    }

    let response;
    let text;

    try {
        response = await fetch(primaryUrl, options);
        text = await response.text();
    } catch (e) {
        console.warn(`[SmartFetch] Falha na conexão principal (${primaryUrl}). Tentando fallback...`);
        // If primary fails (Network Error), force null to trigger fallback logic below
        response = null;
        text = null; 
    }

    // 2. Check for success. If we got HTML (starting with <) or no response, try Fallback.
    if (!response || !response.ok || (text && text.trim().startsWith('<'))) {
        const currentPort = window.location.port;
        // Only try fallback if we are NOT already on port 3000 (to avoid infinite loops)
        if (currentPort !== '3000') {
            const fallbackUrl = `http://${window.location.hostname}:3000${endpoint}`;
            console.log(`[SmartFetch] Ativando Fallback para: ${fallbackUrl}`);
            
            try {
                const resFallback = await fetch(fallbackUrl, options);
                const textFallback = await resFallback.text();
                
                // If fallback is good (JSON), return it
                if (resFallback.ok && !textFallback.trim().startsWith('<')) {
                    return JSON.parse(textFallback);
                }
            } catch (fallbackErr) {
                console.error("[SmartFetch] Fallback também falhou.", fallbackErr);
            }
        }
    }

    // 3. Process the original response if fallback wasn't needed or failed
    if (text && text.trim().startsWith('<')) {
         throw new Error("Erro de Configuração: O Backend retornou uma página Web (HTML) em vez de dados. Verifique se o server.js está rodando na porta 3000.");
    }
    
    if (!response || !response.ok) {
        let errMsg = "Erro desconhecido";
        try {
            if(text) errMsg = JSON.parse(text).error;
        } catch(e) {}
        throw new Error(errMsg || `Erro HTTP: ${response?.status}`);
    }

    return JSON.parse(text);
};


const getStoredCameras = (): Camera[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CAMERAS);
    return stored ? JSON.parse(stored) : DEFAULT_CAMERAS;
  } catch (e) { return DEFAULT_CAMERAS; }
};

const saveStoredCameras = (cameras: Camera[]) => {
  localStorage.setItem(STORAGE_KEY_CAMERAS, JSON.stringify(cameras));
};

const getStoredUsers = (): User[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_USERS);
    let users = stored ? JSON.parse(stored) : DEFAULT_USERS;
    
    // SAFETY CHECK: Ensure Admin always exists and has ADMIN role
    const adminIdx = users.findIndex((u: User) => u.username === 'admin');
    if (adminIdx === -1) {
        users.unshift(DEFAULT_ADMIN);
    } else {
        // Force admin role just in case it was corrupted
        users[adminIdx].role = 'ADMIN';
    }
    return users;
  } catch (e) { return DEFAULT_USERS; }
};

const saveStoredUsers = (users: User[]) => {
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
};

// --- SERVICES ---

// Users & Auth
export const fetchUsers = (): Promise<User[]> => {
  return new Promise(resolve => setTimeout(() => resolve(getStoredUsers()), 300));
};

export const saveUser = (user: User): Promise<void> => {
  return new Promise(resolve => {
    const users = getStoredUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    saveStoredUsers(users);
    setTimeout(resolve, 400);
  });
};

export const deleteUser = (id: string): Promise<void> => {
  return new Promise(resolve => {
    const users = getStoredUsers().filter(u => u.id !== id);
    saveStoredUsers(users);
    setTimeout(resolve, 400);
  });
};

export const authenticateUser = (username: string, password: string): Promise<User | null> => {
  return new Promise(resolve => {
    const users = getStoredUsers();
    const user = users.find(u => u.username === username && u.password === password);
    resolve(user || null);
  });
};


// Cameras
export const fetchCameras = (): Promise<Camera[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(getStoredCameras()), 500);
  });
};

export const addCamera = (newCam: Camera): Promise<void> => {
  return new Promise((resolve) => {
    const cameras = getStoredCameras();
    cameras.push(newCam);
    saveStoredCameras(cameras);
    setTimeout(resolve, 500);
  });
};

export const deleteCamera = (id: string): Promise<void> => {
  return new Promise((resolve) => {
    const cameras = getStoredCameras().filter(c => c.id !== id);
    saveStoredCameras(cameras);
    setTimeout(resolve, 500);
  });
};

export const updateCamera = (updatedCamera: Camera): Promise<void> => {
  return new Promise((resolve) => {
    const cameras = getStoredCameras();
    const index = cameras.findIndex(c => c.id === updatedCamera.id);
    if (index !== -1) {
      cameras[index] = updatedCamera;
      saveStoredCameras(cameras);
    }
    setTimeout(resolve, 500);
  });
};

// Network Scan (REAL API CALL)
export const scanNetworkForDevices = async (): Promise<DiscoveredDevice[]> => {
  try {
    // Use smartFetch to handle connection issues automatically
    const data = await smartFetch('/api/scan', {
        headers: { 'Accept': 'application/json' }
    });
    
    // Safety check if response is not array
    if (!Array.isArray(data)) throw new Error("Formato de resposta inválido");

    const foundDevices: DiscoveredDevice[] = data;
    const existingIps = getStoredCameras().map(c => c.ip);

    // Mark devices that are already added to the dashboard
    return foundDevices.map(d => ({
      ...d,
      isAdded: existingIps.includes(d.ip)
    }));

  } catch (error) {
    console.warn("Backend indisponível ou erro no scan. Usando Mock Data.", error);
    
    // FALLBACK: Retorna dados simulados para não travar a UI se o servidor estiver off
    const mockDevices: DiscoveredDevice[] = [
        { ip: '192.168.1.200', mac: '00:00:00:00:00:00', manufacturer: 'Backend Offline (Mock)', model: 'Server Not Running', isAdded: false }
    ];
    
    const existingIps = getStoredCameras().map(c => c.ip);
    return mockDevices.map(d => ({
      ...d,
      isAdded: existingIps.includes(d.ip)
    }));
  }
};

// Recordings (Mock)
export const fetchRecordings = (): Promise<RecordedMedia[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(DEFAULT_RECORDINGS), 600);
  });
};

// Storage
export const fetchStorageStats = (): Promise<StorageStats> => {
  return new Promise((resolve) => {
    const config = getStoredConfigSync();
    // Simulate updating path based on config
    const stats = { ...INITIAL_STORAGE, path: config.recordingPath.split('/gravacoes')[0] };
    setTimeout(() => resolve(stats), 500);
  });
};

export const formatStorage = async (path: string): Promise<void> => {
    try {
        await smartFetch('/api/storage/format', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
        });
        
        // Reset local usage stats for UI
        INITIAL_STORAGE.used = 0; 
    } catch (e) {
        console.error("Erro na formatação:", e);
        throw e; // Propagate to UI
    }
};

// Config
const getStoredConfigSync = (): SystemConfig => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
    return stored ? JSON.parse(stored) : INITIAL_CONFIG;
  } catch (e) { return INITIAL_CONFIG; }
};

export const fetchSystemConfig = (): Promise<SystemConfig> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(getStoredConfigSync()), 400);
  });
};

export const updateSystemConfig = (newConfig: SystemConfig): Promise<void> => {
  return new Promise((resolve) => {
    INITIAL_CONFIG = newConfig;
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(newConfig));
    setTimeout(resolve, 800);
  });
};

// Filesystem (REAL CALL)
// Fallback structure in case API fails
const MOCK_FILE_SYSTEM_FALLBACK: FileNode = {
  id: 'root',
  name: 'mnt',
  type: 'folder',
  path: '/mnt',
  children: [
    {
      id: 'fallback-drive',
      name: 'Erro de Conexão',
      type: 'drive',
      path: '/mnt',
      children: []
    }
  ]
};

export const fetchFileSystem = async (): Promise<FileNode> => {
    try {
        const tree = await smartFetch('/api/storage/tree');
        return tree;
    } catch (e) {
        console.warn("Could not fetch real file system, using fallback", e);
        return MOCK_FILE_SYSTEM_FALLBACK;
    }
};

// Other
export const fetchAccessLogs = (): Promise<AccessLog[]> => {
  return new Promise((resolve) => resolve([]));
};

export const logAccessAttempt = (user: string, success: boolean, method: 'PASSWORD' | 'MFA') => {
  console.log(`Login attempt: ${user} - ${success}`);
};

export const fetchNotifications = (): Promise<SystemNotification[]> => {
  return new Promise((resolve) => resolve([]));
};

export const markNotificationRead = (id: string) => {};

export const triggerMockEvent = () => {
    return {
    id: `evt-${Date.now()}`,
    title: "Teste",
    message: "Teste",
    level: NotificationLevel.INFO,
    timestamp: new Date(),
    read: false
  } as SystemNotification;
};

export const urlToBase64 = async (url: string, username?: string, password?: string): Promise<string> => {
  try {
    const headers: HeadersInit = {};
    if (username && password) {
      headers['Authorization'] = 'Basic ' + btoa(username + ":" + password);
    }

    const response = await fetch(url, { headers });
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error("Error converting image to base64", e);
    return "";
  }
};