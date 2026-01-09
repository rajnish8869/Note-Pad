
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Note, NoteMetadata, Folder, UserProfile } from '../types';
import { DriveService } from '../services/DriveService';
import { StorageService } from '../services/StorageService';

interface NotesContextType {
  notes: NoteMetadata[];
  folders: Folder[];
  user: UserProfile | null;
  isIncognito: boolean;
  isSyncing: boolean;
  syncSuccess: boolean;
  isLoading: boolean;
  isOnline: boolean;
  
  // Actions
  addNote: (note: Note) => void;
  updateNote: (note: Note) => void;
  deleteNote: (id: string) => void;
  deleteForever: (id: string) => void;
  restoreNote: (id: string) => void;
  createFolder: (name: string) => void;
  
  toggleIncognito: (val: boolean) => void;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  sync: () => Promise<void>;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);
const driveService = new DriveService();

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notes, setNotes] = useState<NoteMetadata[]>([]);
  const [incognitoNotes, setIncognitoNotes] = useState<NoteMetadata[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isIncognito, setIsIncognito] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
      const handleStatusChange = () => {
          setIsOnline(navigator.onLine);
      };
      window.addEventListener('online', handleStatusChange);
      window.addEventListener('offline', handleStatusChange);
      return () => {
          window.removeEventListener('online', handleStatusChange);
          window.removeEventListener('offline', handleStatusChange);
      };
  }, []);

  // Load Data
  useEffect(() => {
    const initData = async () => {
        setIsLoading(true);
        try {
            await StorageService.init();
            
            const savedNotes = await StorageService.getNotesMetadata();
            const savedFolders = await StorageService.getFolders();
            
            if (savedNotes && savedNotes.length > 0) {
                // Auto-delete trash older than 30 days
                const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
                const now = Date.now();
                const cleanedNotes = savedNotes.filter(note => {
                    if (note.isTrashed && note.deletedAt) {
                        return (now - note.deletedAt) <= THIRTY_DAYS_MS;
                    }
                    return true; 
                });
                
                // If we cleaned any notes, save the index back
                if (cleanedNotes.length !== savedNotes.length) {
                    await StorageService.saveNotesMetadata(cleanedNotes);
                }
                
                setNotes(cleanedNotes);
            } else {
                // Welcome note
                const welcomeNote: Note = {
                    id: 'welcome-1',
                    title: 'Welcome to CloudPad',
                    content: 'This is a sample note showing off the features.',
                    plainTextPreview: 'This is a sample note showing off the features.',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    isPinned: true,
                    color: 'default',
                    tags: ['welcome']
                };
                await StorageService.saveNote(welcomeNote);
                setNotes([welcomeNote]); // Metadata matches Note shape enough for initial
            }
            
            if (savedFolders) setFolders(savedFolders);
            
            // Init Drive (async)
            driveService.init("YOUR_API_KEY", "YOUR_CLIENT_ID")
                .catch(e => console.warn("Drive Init Error:", e));
                
        } catch (e) {
            console.error("Failed to initialize storage", e);
        } finally {
            setIsLoading(false);
        }
    };
    initData();
  }, []);

  // Save Folders Only (Notes are saved individually via actions)
  useEffect(() => {
    if (!isLoading) {
        StorageService.saveFolders(folders);
    }
  }, [folders, isLoading]);

  // Note Metadata Persistence is handled by actions calling StorageService, 
  // but if we manipulate state directly (like in restoreNote), we need to save.
  useEffect(() => {
      if (!isLoading && !isIncognito) {
          // We only save the metadata list here to sync UI state changes like Trash/Restore
          // Content is separate.
          StorageService.saveNotesMetadata(notes);
      }
  }, [notes, isLoading, isIncognito]);

  const activeNotes = isIncognito ? incognitoNotes : notes;
  const setActiveNotes = isIncognito ? setIncognitoNotes : setNotes;

  const addNote = async (note: Note) => {
      if (!isIncognito) {
          const meta = await StorageService.saveNote(note);
          setNotes(prev => [meta, ...prev]);
      } else {
          setIncognitoNotes(prev => [note, ...prev]);
      }
  };

  const updateNote = async (updatedNote: Note) => {
      if (!isIncognito) {
          const meta = await StorageService.saveNote(updatedNote);
          setNotes(prev => prev.map(n => n.id === updatedNote.id ? meta : n));
      } else {
          setIncognitoNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
      }
  };

  const deleteNote = async (id: string) => {
    if (isIncognito) {
        setIncognitoNotes(prev => prev.filter(n => n.id !== id));
    } else {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, isTrashed: true, deletedAt: Date.now() } : n));
    }
  };

  const deleteForever = async (id: string) => {
      if (!isIncognito) {
          await StorageService.deleteNote(id);
          setNotes(prev => prev.filter(n => n.id !== id));
      } else {
          setIncognitoNotes(prev => prev.filter(n => n.id !== id));
      }
  };

  const restoreNote = (id: string) => {
      // Just state update, useEffect will save metadata
      setNotes(prev => prev.map(n => n.id === id ? { ...n, isTrashed: false, deletedAt: undefined } : n));
  };

  const createFolder = (name: string) => {
      setFolders(prev => [...prev, { id: Date.now().toString(), name, createdAt: Date.now() }]);
  };

  const login = async () => {
    try {
        await driveService.signIn();
        setUser({ id: 'google-user', name: 'Google User', email: 'Signed In' });
        sync();
    } catch (e) {
        console.error("Login failed", e);
        throw e;
    }
  };

  const logout = async () => {
      await driveService.signOut();
      setUser(null);
  };

  const sync = async () => {
    if(isIncognito || !isOnline) return;
    setIsSyncing(true);
    try {
        // Sync Logic has been moved to DriveService but it returns updated metadata list
        const syncedNotes = await driveService.syncNotes(notes);
        setNotes(syncedNotes);
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 3000);
    } catch (error) {
        console.error("Sync failed", error);
    } finally {
        setIsSyncing(false);
    }
  };

  return (
    <NotesContext.Provider value={{
        notes: activeNotes,
        folders,
        user,
        isIncognito,
        isSyncing,
        syncSuccess,
        isLoading,
        isOnline,
        addNote,
        updateNote,
        deleteNote,
        deleteForever,
        restoreNote,
        createFolder,
        toggleIncognito: setIsIncognito,
        login,
        logout,
        sync
    }}>
      {children}
    </NotesContext.Provider>
  );
};

export const useNotes = () => {
  const context = useContext(NotesContext);
  if (!context) throw new Error("useNotes must be used within NotesProvider");
  return context;
};
