
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

export interface NoteLocation {
  lat: number;
  lng: number;
  address?: string; // Optional text representation
}

export interface NoteMetadata {
  id: string;
  title: string;
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
  location?: NoteLocation;
  
  // Security Features
  isLocked?: boolean; // Requires auth to open
  lockMode?: 'GLOBAL' | 'CUSTOM'; // Default is GLOBAL if undefined
  security?: NoteSecurity; // Only present if lockMode is CUSTOM
  isIncognito?: boolean; // True if created in incognito mode
  
  // Optimization Flags (Lazy Loading)
  hasImage?: boolean;
  hasAudio?: boolean;
  isEncrypted?: boolean; 
}

export interface Note extends NoteMetadata {
  content?: string; // HTML string - Optional because it might not be loaded yet
  encryptedData?: string; // Stringified JSON of EncryptedData. Optional.
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
