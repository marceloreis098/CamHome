import { Camera, CameraStatus, StorageStats, RecordedMedia, FileNode, SystemConfig, AccessLog, SystemNotification, NotificationLevel, User, DiscoveredDevice } from '../types';

// --- CONSTANTS ---
// We no longer use localStorage keys. The source of truth is the backend API.

const DEFAULT_RECORDINGS: RecordedMedia[] = [];

// Initial defaults are now handled by the Backend if files are missing, 
// but we keep a structural fallback here for typesafety before load.
let INITIAL_STORAGE: StorageStats = {
  total: 1000,
  used: 450,
  path: '/mnt/orange_drive_1tb',
  label: 'Orange Drive 1TB',
  isMounted: true
};

// --- HELPERS ---

// SMART FETCH: Handles relative paths vs dev environment + fallback to port 3000
const smartFetch = async (endpoint: string, options: RequestInit = {}) => {
    // 1. Determine Primary URL
    const isDev = process.env.NODE_ENV === 'development' || window.location.port === '1234';
    let primaryUrl = endpoint; 
    if (isDev) {
         primaryUrl = `http://${window.location.hostname}:3000${endpoint}`;
    }

    // Ensure content-type json if body is present and not specified
    if (options.body && !options.headers) {
        options.headers = { 'Content-Type': 'application/json' };
    }

    let response;
    let text;

    try {
        response = await fetch(primaryUrl, options);
        text = await response.text();
    } catch (e) {
        console.warn(`[SmartFetch] Falha na conexão principal (${primaryUrl}). Tentando fallback...`);
        response = null;
        text = null; 
    }

    // 2. Fallback Logic
    if (!response || !response.ok || (text && text.trim().startsWith('<'))) {
        const currentPort = window.location.port;
        if (currentPort !== '3000') {
            const fallbackUrl = `http://${window.location.hostname}:3000${endpoint}`;
            try {
                const resFallback = await fetch(fallbackUrl, options);
                const textFallback = await resFallback.text();
                if (resFallback.ok && !textFallback.trim().startsWith('<')) {
                    return JSON.parse(textFallback);
                }
            } catch (fallbackErr) {
                console.error("[SmartFetch] Fallback também falhou.", fallbackErr);
            }
        }
    }

    if (text && text.trim().startsWith('<')) {
         throw new Error("Erro de Configuração: O Backend retornou HTML. Verifique se o server.js está rodando (pm2 status).");
    }
    
    if (!response || !response.ok) {
        let errMsg = "Erro desconhecido";
        try {
            if(text) errMsg = JSON.parse(text).error;
        } catch(e) {}
        throw new Error(errMsg || `Erro HTTP: ${response?.status}`);
    }

    try {
        return JSON.parse(text);
    } catch (e) {
        return text; // Return text if not JSON
    }
};

// --- SERVICES (NOW CONNECTED TO BACKEND) ---

// USERS
export const fetchUsers = async (): Promise<User[]> => {
  try {
      return await smartFetch('/api/users');
  } catch (e) {
      console.error("Error fetching users:", e);
      return [];
  }
};

export const saveUser = async (user: User): Promise<void> => {
    const users = await fetchUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) users[idx] = user;
    else users.push(user);
    
    await smartFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(users)
    });
};

export const deleteUser = async (id: string): Promise<void> => {
    let users = await fetchUsers();
    users = users.filter(u => u.id !== id);
    await smartFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(users)
    });
};

export const authenticateUser = async (username: string, password: string): Promise<User | null> => {
    const users = await fetchUsers();
    const user = users.find(u => u.username === username && u.password === password);
    return user || null;
};

// CAMERAS
export const fetchCameras = async (): Promise<Camera[]> => {
    try {
        return await smartFetch('/api/cameras');
    } catch (e) {
        console.error("Error fetching cameras:", e);
        return [];
    }
};

export const addCamera = async (newCam: Camera): Promise<void> => {
    const cameras = await fetchCameras();
    cameras.push(newCam);
    await smartFetch('/api/cameras', {
        method: 'POST',
        body: JSON.stringify(cameras)
    });
};

export const deleteCamera = async (id: string): Promise<void> => {
    let cameras = await fetchCameras();
    cameras = cameras.filter(c => c.id !== id);
    await smartFetch('/api/cameras', {
        method: 'POST',
        body: JSON.stringify(cameras)
    });
};

export const updateCamera = async (updatedCamera: Camera): Promise<void> => {
    const cameras = await fetchCameras();
    const index = cameras.findIndex(c => c.id === updatedCamera.id);
    if (index !== -1) {
      cameras[index] = updatedCamera;
      await smartFetch('/api/cameras', {
          method: 'POST',
          body: JSON.stringify(cameras)
      });
    }
};

// CONFIG
export const fetchSystemConfig = async (): Promise<SystemConfig> => {
    try {
        return await smartFetch('/api/config');
    } catch (e) {
        console.error("Error fetching config:", e);
        return { // Fallback if server fails
            appName: 'CamHome',
            enableAuth: true,
            enableMfa: false,
            recordingPath: '/mnt',
            minAlertLevel: NotificationLevel.INFO,
            enableSound: true
        };
    }
};

export const updateSystemConfig = async (newConfig: SystemConfig): Promise<void> => {
    await smartFetch('/api/config', {
        method: 'POST',
        body: JSON.stringify(newConfig)
    });
};

// NETWORK SCAN (Existing Real API)
export const scanNetworkForDevices = async (manualSubnet?: string): Promise<DiscoveredDevice[]> => {
  // Pass errors to UI so user knows what's wrong
  try {
    const query = manualSubnet ? `?subnet=${encodeURIComponent(manualSubnet)}` : '';
    const data = await smartFetch(`/api/scan${query}`, {
        headers: { 'Accept': 'application/json' }
    });
    
    if (!Array.isArray(data)) throw new Error("Formato de resposta inválido");

    const foundDevices: DiscoveredDevice[] = data;
    
    // We need to fetch current cameras to mark "isAdded"
    const cameras = await fetchCameras();
    const existingIps = cameras.map(c => c.ip);

    return foundDevices.map(d => ({
      ...d,
      isAdded: existingIps.includes(d.ip)
    }));

  } catch (error: any) {
    console.warn("Erro no scan:", error);
    throw error; // Let UI handle it
  }
};

// RECORDINGS (Mock for now, typically would come from reading the disk via API)
export const fetchRecordings = (): Promise<RecordedMedia[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(DEFAULT_RECORDINGS), 600);
  });
};

// STORAGE (Uses config to determine path to check)
export const fetchStorageStats = async (): Promise<StorageStats> => {
  const config = await fetchSystemConfig();
  // In a real scenario, we'd have a backend endpoint /api/storage/stats checking the actual path
  // For now, we simulate using the config path
  return { ...INITIAL_STORAGE, path: config.recordingPath.split('/gravacoes')[0] };
};

export const formatStorage = async (path: string): Promise<void> => {
    try {
        await smartFetch('/api/storage/format', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
        });
        INITIAL_STORAGE.used = 0; 
    } catch (e) {
        console.error("Erro na formatação:", e);
        throw e;
    }
};

// FILESYSTEM (Real API)
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

// MOCK HELPERS (Logs, Notifications)
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