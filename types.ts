
export interface Note {
  id: string;
  title: string;
  content: string; // HTML string
  plainTextPreview: string;
  createdAt: number;
  updatedAt: number;
  isPinned: boolean;
  isDeleted?: boolean; // Legacy support
  isSynced?: boolean;
  
  // New Features
  tags?: string[];
  color?: string; // key for color palette
  folderId?: string;
  isTrashed?: boolean;
  deletedAt?: number;
  
  // Security Features
  isLocked?: boolean; // Requires biometric auth to open
  isIncognito?: boolean; // True if created in incognito mode
}

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  imageUrl?: string;
}

export type Theme = 'classic' | 'dark' | 'neo-glass' | 'vision';

// Updated ViewState to support specific folder views or trash
export type ViewState = 'LIST' | 'EDITOR' | 'SETTINGS' | 'TRASH' | 'FOLDER' | 'TAG';

export interface DriveConfig {
  clientId: string;
  apiKey: string;
}
