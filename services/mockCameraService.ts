import { Camera, CameraStatus, StorageStats, RecordedMedia, FileNode, SystemConfig, AccessLog, SystemNotification, NotificationLevel } from '../types';

const STORAGE_KEY_CAMERAS = 'camhome_cameras';
const STORAGE_KEY_CONFIG = 'camhome_config';

// Default Data (Used only if LocalStorage is empty)
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

let INITIAL_CONFIG: SystemConfig = {
  appName: 'CamHome',
  username: 'admin',
  password: 'password', // Default
  enableAuth: true,
  enableMfa: false,
  ddnsProvider: 'noip',
  ddnsHostname: 'minha-camera.ddns.net',
  minAlertLevel: NotificationLevel.INFO,
  enableSound: true
};

// Helper to get cameras from storage
const getStoredCameras = (): Camera[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CAMERAS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Erro ao ler LocalStorage", e);
  }
  return DEFAULT_CAMERAS;
};

// Helper to save cameras
const saveStoredCameras = (cameras: Camera[]) => {
  localStorage.setItem(STORAGE_KEY_CAMERAS, JSON.stringify(cameras));
};

// --- Mock Data for other services (Read-only for now) ---

const INITIAL_STORAGE: StorageStats = {
  total: 1000, // 1TB
  used: 450,
  path: '/mnt/orange_drive_1tb',
  isMounted: true
};

const INITIAL_RECORDINGS: RecordedMedia[] = [
  {
    id: 'rec-1',
    cameraId: 'cam-demo-1',
    cameraName: 'Demo Sala',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
    thumbnailUrl: 'https://picsum.photos/800/600?random=10',
    type: 'image',
    aiTags: ['Pessoa', 'Entregador', 'Uniforme']
  }
];

const MOCK_FILE_SYSTEM: FileNode = {
  id: 'root',
  name: 'mnt',
  type: 'folder',
  children: [
    {
      id: 'drive-1',
      name: 'orange_drive_1tb',
      type: 'drive',
      size: '1TB',
      children: [
        {
          id: 'folder-rec',
          name: 'gravacoes',
          type: 'folder',
          children: [
             { id: 'date-1', name: '2023-10-25', type: 'folder', children: [{ id: 'f1', name: 'evt_01.jpg', type: 'file', size: '2MB'}] },
          ]
        },
        { id: 'sys-log', name: 'sistema.log', type: 'file', size: '45KB' }
      ]
    }
  ]
};

let MOCK_ACCESS_LOGS: AccessLog[] = [
  { id: 'log-1', timestamp: new Date(Date.now() - 1000 * 60 * 30), user: 'admin', ip: '192.168.1.10', status: 'SUCCESS', method: 'PASSWORD' },
];

let MOCK_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'notif-0',
    title: 'Bem-vindo ao CamHome',
    message: 'Configure suas câmeras reais na aba Configurações.',
    level: NotificationLevel.INFO,
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    read: false
  }
];

// --- Services ---

export const fetchCameras = (): Promise<Camera[]> => {
  return new Promise((resolve) => {
    // Return stored cameras instead of static mock
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

export const fetchStorageStats = (): Promise<StorageStats> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ ...INITIAL_STORAGE }), 500);
  });
};

export const fetchRecordings = (): Promise<RecordedMedia[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve([...INITIAL_RECORDINGS]), 600);
  });
};

export const fetchFileSystem = (): Promise<FileNode> => {
   return new Promise((resolve) => {
    setTimeout(() => resolve(JSON.parse(JSON.stringify(MOCK_FILE_SYSTEM))), 600);
  }); 
};

export const fetchSystemConfig = (): Promise<SystemConfig> => {
  return new Promise((resolve) => {
    const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (stored) {
      INITIAL_CONFIG = JSON.parse(stored);
    }
    setTimeout(() => resolve({...INITIAL_CONFIG}), 400);
  });
};

export const updateSystemConfig = (newConfig: SystemConfig): Promise<void> => {
  return new Promise((resolve) => {
    INITIAL_CONFIG = newConfig;
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(newConfig));
    setTimeout(resolve, 800);
  });
};

export const fetchAccessLogs = (): Promise<AccessLog[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve([...MOCK_ACCESS_LOGS]), 400);
  });
};

export const logAccessAttempt = (user: string, success: boolean, method: 'PASSWORD' | 'MFA') => {
  MOCK_ACCESS_LOGS.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date(),
    user,
    ip: 'Localhost',
    status: success ? 'SUCCESS' : 'FAILED',
    method
  });
};

export const fetchNotifications = (): Promise<SystemNotification[]> => {
  return new Promise((resolve) => {
    resolve([...MOCK_NOTIFICATIONS].sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime()));
  });
};

export const markNotificationRead = (id: string) => {
  const n = MOCK_NOTIFICATIONS.find(n => n.id === id);
  if (n) n.read = true;
};

// Simulate scanning the network (still returns defaults if empty, or existing)
export const scanForCameras = (): Promise<Camera[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(getStoredCameras()); 
    }, 2000);
  });
};

// Simulate an event
export const triggerMockEvent = () => {
  const notification: SystemNotification = {
    id: `evt-${Date.now()}`,
    title: "Teste de Alerta",
    message: "Isto é um evento simulado para testar notificações.",
    level: NotificationLevel.WARNING,
    timestamp: new Date(),
    read: false,
    cameraId: 'system'
  };
  MOCK_NOTIFICATIONS.push(notification);
  return notification;
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