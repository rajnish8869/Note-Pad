
export interface EncryptedData {
  cipherText: string; // Base64
  iv: string; // Base64
  salt: string; // Base64
}

export interface NoteSecurity {
  salt: string;
  verifier: string;
  pinLength?: number;
}

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
  isLocked?: boolean; // Requires auth to open
  lockMode?: 'GLOBAL' | 'CUSTOM'; // Default is GLOBAL if undefined
  security?: NoteSecurity; // Only present if lockMode is CUSTOM
  isIncognito?: boolean; // True if created in incognito mode
  encryptedData?: string; // Stringified JSON of EncryptedData. If present, title/content are ignored/hidden.
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
