
export enum CameraStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  RECORDING = 'RECORDING',
  ERROR = 'ERROR'
}

export interface Camera {
  id: string;
  name: string;
  ip: string;
  model: string;
  status: CameraStatus;
  thumbnailUrl: string; // Placeholder for live feed (http link)
  streamUrl?: string;   // Optional real stream URL
  username?: string;    // Auth Username
  password?: string;    // Auth Password
  lastEvent?: string;
  // Configuration fields
  resolution: string;
  framerate: number;
  bitrate: number; // in kbps
  externalTraffic?: boolean; // Indicates if cam talks to china/external clouds
}

export interface StorageStats {
  total: number; // in GB
  used: number; // in GB
  path: string;
  isMounted: boolean;
}

export interface AnalysisResult {
  text: string;
  timestamp: Date;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  cameraId: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ALERT';
}

export interface AccessLog {
  id: string;
  timestamp: Date;
  user: string;
  ip: string;
  status: 'SUCCESS' | 'FAILED';
  method: 'PASSWORD' | 'MFA';
}

export interface RecordedMedia {
  id: string;
  cameraId: string;
  cameraName: string;
  timestamp: Date;
  thumbnailUrl: string;
  type: 'image' | 'video';
  aiTags: string[]; // e.g. "Person", "Dog", "Vehicle"
  userTags?: string[]; // Manual overrides
}

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder' | 'drive';
  size?: string;
  children?: FileNode[];
  isOpen?: boolean; // For UI state
}

export enum NotificationLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL'
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  level: NotificationLevel;
  timestamp: Date;
  read: boolean;
  cameraId?: string;
}

export interface SystemConfig {
  appName: string;
  logoUrl?: string;
  username: string;
  password?: string; // In real app, this is hashed
  enableAuth: boolean;
  enableMfa: boolean; // Multi-factor auth state
  mfaSecret?: string;
  ddnsProvider?: 'noip' | 'duckdns' | 'custom';
  ddnsHostname?: string;
  // Notification Settings
  minAlertLevel: NotificationLevel; // Minimum level to show popup toast
  enableSound: boolean;
}