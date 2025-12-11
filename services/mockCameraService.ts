import { Camera, CameraStatus, StorageStats, RecordedMedia, FileNode, SystemConfig, AccessLog, SystemNotification, NotificationLevel, User, DiscoveredDevice } from '../types';

const STORAGE_KEY_CAMERAS = 'camhome_cameras';
const STORAGE_KEY_CONFIG = 'camhome_config';
const STORAGE_KEY_USERS = 'camhome_users';

// --- MOCK DATA ---

const DEFAULT_USERS: User[] = [
  {
    id: 'u1',
    username: 'admin',
    password: 'password',
    name: 'Administrador',
    role: 'ADMIN',
    createdAt: new Date()
  },
  {
    id: 'u2',
    username: 'visitante',
    password: '123',
    name: 'Membro da Família',
    role: 'USER',
    createdAt: new Date()
  }
];

const DEFAULT_CAMERAS: Camera[] = [
  {
    id: 'cam-demo-1',
    name: 'Câmera Demo (Sala)',
    ip: '192.168.1.100',
    model: 'IP Cam Simulator',
    status: CameraStatus.ONLINE,
    thumbnailUrl: 'https://picsum.photos/800/600?random=1',
    lastEvent: 'Sistema Iniciado',
    resolution: '1080p',
    framerate: 15,
    bitrate: 2048,
    externalTraffic: false
  }
];

const DEFAULT_RECORDINGS: RecordedMedia[] = [
  {
    id: 'rec-1',
    cameraId: 'cam-demo-1',
    cameraName: 'Câmera Demo (Sala)',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    thumbnailUrl: 'https://picsum.photos/800/600?random=10',
    type: 'image',
    aiTags: ['Pessoa', 'Movimento'],
    userTags: ['Entregador']
  },
  {
    id: 'rec-2',
    cameraId: 'cam-demo-1',
    cameraName: 'Câmera Demo (Sala)',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    thumbnailUrl: 'https://picsum.photos/800/600?random=11',
    type: 'video',
    aiTags: ['Veículo', 'Suspeito'],
  },
  {
    id: 'rec-3',
    cameraId: 'cam-demo-1',
    cameraName: 'Câmera Demo (Sala)',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
    thumbnailUrl: 'https://picsum.photos/800/600?random=12',
    type: 'image',
    aiTags: ['Cachorro', 'Quintal'],
  }
];

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
    return stored ? JSON.parse(stored) : DEFAULT_USERS;
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
    // Calls the Node.js backend to perform the Nmap scan
    const response = await fetch('/api/scan');
    
    if (!response.ok) {
        console.error("Scan failed");
        return [];
    }

    const foundDevices: DiscoveredDevice[] = await response.json();
    const existingIps = getStoredCameras().map(c => c.ip);

    // Mark devices that are already added to the dashboard
    return foundDevices.map(d => ({
      ...d,
      isAdded: existingIps.includes(d.ip)
    }));

  } catch (error) {
    console.error("Network scan error. Ensure server is running.", error);
    // Fallback if API fails (e.g., running in pure frontend dev mode without server)
    return [];
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

export const formatStorage = (path: string): Promise<void> => {
  return new Promise(resolve => {
    console.log(`Formatting ${path}...`);
    setTimeout(() => {
      INITIAL_STORAGE.used = 0; // Reset usage
      resolve();
    }, 3000);
  });
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

// Filesystem
const MOCK_FILE_SYSTEM: FileNode = {
  id: 'root',
  name: 'mnt',
  type: 'folder',
  path: '/mnt',
  children: [
    {
      id: 'drive-1',
      name: 'orange_drive_1tb',
      type: 'drive',
      path: '/mnt/orange_drive_1tb',
      size: '1TB',
      children: [
        {
          id: 'folder-rec',
          name: 'gravacoes',
          type: 'folder',
          path: '/mnt/orange_drive_1tb/gravacoes',
          children: []
        },
        { id: 'sys-log', name: 'sistema.log', type: 'file', path: '/mnt/orange_drive_1tb/sistema.log', size: '45KB' }
      ]
    },
    {
      id: 'drive-2',
      name: 'usb_backup',
      type: 'drive',
      path: '/mnt/usb_backup',
      size: '64GB',
      children: []
    }
  ]
};

export const fetchFileSystem = (): Promise<FileNode> => {
   return new Promise((resolve) => {
    setTimeout(() => resolve(JSON.parse(JSON.stringify(MOCK_FILE_SYSTEM))), 600);
  }); 
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