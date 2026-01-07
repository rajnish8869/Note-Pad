import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Note, Folder, UserProfile, ViewState } from '../types';
import { DriveService } from '../services/DriveService';

interface NotesContextType {
  notes: Note[];
  folders: Folder[];
  user: UserProfile | null;
  isIncognito: boolean;
  isSyncing: boolean;
  syncSuccess: boolean;
  
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

  // Load Data
  useEffect(() => {
    const savedNotes = localStorage.getItem('notes');
    if (savedNotes) {
      let loadedNotes: Note[] = JSON.parse(savedNotes);
      // Auto-delete trash older than 30 days
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      loadedNotes = loadedNotes.filter(note => {
        if (note.isTrashed && note.deletedAt) {
            return (now - note.deletedAt) <= THIRTY_DAYS_MS;
        }
        return true; 
      });
      setNotes(loadedNotes);
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

    const savedFolders = localStorage.getItem('folders');
    if (savedFolders) setFolders(JSON.parse(savedFolders));

    driveService.init("YOUR_API_KEY", "YOUR_CLIENT_ID")
        .catch(e => console.warn("Drive Init Error:", e));
  }, []);

  // Persistence
  useEffect(() => {
    localStorage.setItem('notes', JSON.stringify(notes));
  }, [notes]);
  
  useEffect(() => {
    localStorage.setItem('folders', JSON.stringify(folders));
  }, [folders]);

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
    if(isIncognito) return;
    setIsSyncing(true);
    try {
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