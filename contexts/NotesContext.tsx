import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Note, Folder, UserProfile } from '../types';
import { DriveService } from '../services/DriveService';
import { StorageService } from '../services/StorageService';

interface NotesContextType {
  notes: Note[];
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
  const [notes, setNotes] = useState<Note[]>([]);
  const [incognitoNotes, setIncognitoNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isIncognito, setIsIncognito] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Ref to access current state inside callbacks if needed, though mostly used for debounce
  const notesRef = useRef(notes);
  useEffect(() => { notesRef.current = notes; }, [notes]);

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

  // Sync wrapper to avoid closure stale state if used in timeout
  const sync = async () => {
    // Check ref directly for latest state or use state if function is recreated
    if(isIncognito || !navigator.onLine) return;
    
    setIsSyncing(true);
    try {
        const currentNotes = notesRef.current; 
        const syncedNotes = await driveService.syncNotes(currentNotes);
        setNotes(syncedNotes);
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 3000);
    } catch (error) {
        console.error("Sync failed", error);
        // If 401, we might want to logout user locally
    } finally {
        setIsSyncing(false);
    }
  };

  // Load Data
  useEffect(() => {
    const initData = async () => {
        setIsLoading(true);
        try {
            await StorageService.init();
            
            const savedNotes = await StorageService.getNotes();
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
                setNotes(cleanedNotes);
            } else {
                // Welcome note
                setNotes([{
                    id: 'welcome-1',
                    title: 'Welcome to CloudPad',
                    content: 'This is a sample note showing off the features.',
                    plainTextPreview: 'This is a sample note showing off the features.',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    isPinned: true,
                    color: 'default',
                    tags: ['welcome']
                }]);
            }
            
            if (savedFolders) setFolders(savedFolders);
            
            // Init Drive (async) & Restore Session
            const restoredUser = await driveService.init("YOUR_API_KEY", "208175085130-1g95j5f3r0s3df2mui0jmltu4jj0ffln.apps.googleusercontent.com")
                .catch(e => { console.warn("Drive Init Error:", e); return null; });
            
            if (restoredUser) {
                setUser(restoredUser);
                // Trigger initial sync after restoration
                // We use a small timeout to let state settle
                setTimeout(() => {
                     // Can't call sync() directly here effectively because it closes over empty notes if defined outside effect
                     // But we defined sync inside component scope, it closes over initial state...
                     // Wait, sync uses notesRef now, so it's safe!
                     sync(); 
                }, 500);
            }
                
        } catch (e) {
            console.error("Failed to initialize storage", e);
        } finally {
            setIsLoading(false);
        }
    };
    initData();
  }, []);

  // Persistence
  useEffect(() => {
    if (!isLoading) {
        StorageService.saveNotes(notes);
    }
  }, [notes, isLoading]);
  
  useEffect(() => {
    if (!isLoading) {
        StorageService.saveFolders(folders);
    }
  }, [folders, isLoading]);

  const activeNotes = isIncognito ? incognitoNotes : notes;
  const setActiveNotes = isIncognito ? setIncognitoNotes : setNotes;

  const addNote = (note: Note) => {
      setActiveNotes(prev => [note, ...prev]);
  };

  const updateNote = (updatedNote: Note) => {
      setActiveNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
  };

  const deleteNote = (id: string) => {
    if (isIncognito) {
        setIncognitoNotes(prev => prev.filter(n => n.id !== id));
    } else {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, isTrashed: true, deletedAt: Date.now() } : n));
    }
  };

  const deleteForever = (id: string) => {
      setNotes(prev => prev.filter(n => n.id !== id));
  };

  const restoreNote = (id: string) => {
      setNotes(prev => prev.map(n => n.id === id ? { ...n, isTrashed: false, deletedAt: undefined } : n));
  };

  const createFolder = (name: string) => {
      setFolders(prev => [...prev, { id: Date.now().toString(), name, createdAt: Date.now() }]);
  };

  const login = async () => {
    try {
        const userProfile = await driveService.signIn();
        setUser(userProfile);
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