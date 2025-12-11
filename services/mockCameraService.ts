import { Camera, CameraStatus, StorageStats, LogEntry, RecordedMedia, FileNode, SystemConfig, AccessLog, SystemNotification, NotificationLevel } from '../types';

// Initial Mock Data translated to Portuguese
let INITIAL_CAMERAS: Camera[] = [
  {
    id: 'cam-1',
    name: 'Varanda Frontal (Yoosee)',
    ip: '192.168.1.2',
    model: 'Yoosee Generic',
    status: CameraStatus.ONLINE,
    thumbnailUrl: 'https://picsum.photos/800/600?random=1',
    lastEvent: 'Movimento detectado há 5m',
    resolution: '1080p',
    framerate: 15,
    bitrate: 2048,
    externalTraffic: true // Simulates talking to external cloud
  },
  {
    id: 'cam-2',
    name: 'Quintal (Microseven)',
    ip: '192.168.1.25',
    model: 'MYM71080i-B',
    status: CameraStatus.RECORDING,
    thumbnailUrl: 'https://picsum.photos/800/600?random=2',
    lastEvent: 'Pessoa detectada há 2m',
    resolution: '1920x1080',
    framerate: 30,
    bitrate: 4096,
    externalTraffic: false
  }
];

const INITIAL_STORAGE: StorageStats = {
  total: 1000, // 1TB
  used: 450,
  path: '/mnt/orange_drive_1tb',
  isMounted: true
};

const INITIAL_RECORDINGS: RecordedMedia[] = [
  {
    id: 'rec-1',
    cameraId: 'cam-1',
    cameraName: 'Varanda Frontal',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
    thumbnailUrl: 'https://picsum.photos/800/600?random=10',
    type: 'image',
    aiTags: ['Pessoa', 'Entregador', 'Uniforme']
  },
  {
    id: 'rec-2',
    cameraId: 'cam-2',
    cameraName: 'Quintal',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    thumbnailUrl: 'https://picsum.photos/800/600?random=11',
    type: 'image',
    aiTags: ['Animal', 'Cachorro', 'Labrador']
  },
  {
    id: 'rec-3',
    cameraId: 'cam-1',
    cameraName: 'Varanda Frontal',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    thumbnailUrl: 'https://picsum.photos/800/600?random=12',
    type: 'image',
    aiTags: ['Veículo', 'Carro', 'Aproximação do Portão']
  },
  {
    id: 'rec-4',
    cameraId: 'cam-1',
    cameraName: 'Varanda Frontal',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 25), 
    thumbnailUrl: 'https://picsum.photos/800/600?random=13',
    type: 'image',
    aiTags: ['Pessoa', 'Tocando no Carro', 'Suspeito']
  },
  {
    id: 'rec-5',
    cameraId: 'cam-1',
    cameraName: 'Varanda Frontal',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26), 
    thumbnailUrl: 'https://picsum.photos/800/600?random=14',
    type: 'image',
    aiTags: ['Pessoa', 'Parado na Calçada', 'Observando']
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
             { id: 'date-2', name: '2023-10-26', type: 'folder', children: [] },
             { id: 'date-3', name: '2023-10-27', type: 'folder', children: [] },
          ]
        },
        {
          id: 'folder-snap',
          name: 'snapshots',
          type: 'folder',
          children: [
            { id: 'snap-1', name: 'alerta_pessoa.jpg', type: 'file', size: '1.2MB' }
          ]
        },
        { id: 'sys-log', name: 'sistema.log', type: 'file', size: '45KB' }
      ]
    }
  ]
};

let INITIAL_CONFIG: SystemConfig = {
  appName: 'OrangeGuard',
  username: 'admin',
  password: 'password', // Default
  enableAuth: true,
  enableMfa: false,
  ddnsProvider: 'noip',
  ddnsHostname: 'minha-camera.ddns.net',
  minAlertLevel: NotificationLevel.INFO,
  enableSound: true
};

let MOCK_ACCESS_LOGS: AccessLog[] = [
  { id: 'log-1', timestamp: new Date(Date.now() - 1000 * 60 * 30), user: 'admin', ip: '192.168.1.10', status: 'SUCCESS', method: 'PASSWORD' },
  { id: 'log-2', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), user: 'admin', ip: '192.168.1.10', status: 'SUCCESS', method: 'PASSWORD' },
  { id: 'log-3', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 25), user: 'unknown', ip: '192.168.1.45', status: 'FAILED', method: 'PASSWORD' },
];

let MOCK_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'notif-0',
    title: 'Sistema Iniciado',
    message: 'Serviços de monitoramento online.',
    level: NotificationLevel.INFO,
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    read: true
  }
];

// Simulate fetching data
export const fetchCameras = (): Promise<Camera[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve([...INITIAL_CAMERAS]), 500);
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
    setTimeout(() => resolve({...INITIAL_CONFIG}), 400);
  });
};

export const fetchAccessLogs = (): Promise<AccessLog[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve([...MOCK_ACCESS_LOGS]), 400);
  });
};

export const fetchNotifications = (): Promise<SystemNotification[]> => {
  return new Promise((resolve) => {
    // Return sorted by date desc
    resolve([...MOCK_NOTIFICATIONS].sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime()));
  });
};

export const markNotificationRead = (id: string) => {
  const n = MOCK_NOTIFICATIONS.find(n => n.id === id);
  if (n) n.read = true;
};

export const logAccessAttempt = (user: string, success: boolean, method: 'PASSWORD' | 'MFA') => {
  MOCK_ACCESS_LOGS.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date(),
    user,
    ip: '192.168.1.10', // Simulated local IP
    status: success ? 'SUCCESS' : 'FAILED',
    method
  });
};

// Simulate scanning the network
export const scanForCameras = (): Promise<Camera[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...INITIAL_CAMERAS]); 
    }, 2000);
  });
};

// Simulate updating camera settings
export const updateCamera = (updatedCamera: Camera): Promise<void> => {
  return new Promise((resolve) => {
    const index = INITIAL_CAMERAS.findIndex(c => c.id === updatedCamera.id);
    if (index !== -1) {
      INITIAL_CAMERAS[index] = updatedCamera;
    }
    setTimeout(resolve, 800);
  });
};

export const updateSystemConfig = (newConfig: SystemConfig): Promise<void> => {
  return new Promise((resolve) => {
    INITIAL_CONFIG = newConfig;
    setTimeout(resolve, 800);
  });
};

// Simulate an event (e.g. motion or error)
export const triggerMockEvent = () => {
  const events = [
    { title: "Movimento Detectado", msg: "Movimento humano identificado na Varanda.", level: NotificationLevel.WARNING, cam: "Varanda Frontal" },
    { title: "Falha de Conexão", msg: "Câmera Quintal parou de responder.", level: NotificationLevel.CRITICAL, cam: "Quintal" },
    { title: "Erro de Gravação", msg: "Falha ao gravar no disco externo. Disco cheio?", level: NotificationLevel.CRITICAL, cam: "System" },
    { title: "Backup Concluído", msg: "Snapshot enviado para nuvem com sucesso.", level: NotificationLevel.INFO, cam: "System" }
  ];

  const rnd = Math.floor(Math.random() * events.length);
  const event = events[rnd];

  const notification: SystemNotification = {
    id: `evt-${Date.now()}`,
    title: event.title,
    message: event.msg,
    level: event.level,
    timestamp: new Date(),
    read: false,
    cameraId: event.cam !== 'System' ? 'cam-1' : undefined
  };

  MOCK_NOTIFICATIONS.push(notification);
  return notification;
};

// Convert an image URL to base64 (helper for our mock simulation to send to Gemini)
export const urlToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove data url prefix for Gemini
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