import React, { createContext, useContext, useEffect, useState } from 'react';
import { Note, Folder, UserProfile } from '../types';
import { DriveService } from '../services/DriveService';
import { dbService } from '../services/DatabaseService';

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
  const [dbReady, setDbReady] = useState(false);

  // Initialize DB and Load Data
  useEffect(() => {
    const init = async () => {
        try {
            await dbService.init();
            setDbReady(true);
            
            const loadedNotes = await dbService.getNotes();
            
            // Auto-delete trash older than 30 days
            const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
            const now = Date.now();
            const validNotes = loadedNotes.filter(note => {
                if (note.isTrashed && note.deletedAt) {
                    if ((now - note.deletedAt) > THIRTY_DAYS_MS) {
                        dbService.deleteNote(note.id); // Cleanup DB
                        return false;
                    }
                }
                return true; 
            });
            setNotes(validNotes);

            const loadedFolders = await dbService.getFolders();
            setFolders(loadedFolders);

        } catch (e) {
            console.error("Failed to load data", e);
        }
    };
    init();

    driveService.init("YOUR_API_KEY", "YOUR_CLIENT_ID")
        .catch(e => console.warn("Drive Init Error:", e));
  }, []);

  const activeNotes = isIncognito ? incognitoNotes : notes;
  const setActiveNotes = isIncognito ? setIncognitoNotes : setNotes;

  const addNote = async (note: Note) => {
      if (isIncognito) {
          setIncognitoNotes(prev => [note, ...prev]);
      } else {
          setNotes(prev => [note, ...prev]);
          if(dbReady) await dbService.addNote(note);
      }
  };

  const updateNote = async (updatedNote: Note) => {
      if (isIncognito) {
        setIncognitoNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
      } else {
        setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
        if(dbReady) await dbService.updateNote(updatedNote);
      }
  };

  const deleteNote = async (id: string) => {
    if (isIncognito) {
        setIncognitoNotes(prev => prev.filter(n => n.id !== id));
    } else {
        const target = notes.find(n => n.id === id);
        if (target) {
            const updated = { ...target, isTrashed: true, deletedAt: Date.now() };
            updateNote(updated);
        }
    }
  };

  const deleteForever = async (id: string) => {
      setNotes(prev => prev.filter(n => n.id !== id));
      if(dbReady) await dbService.deleteNote(id);
  };

  const restoreNote = (id: string) => {
      const target = notes.find(n => n.id === id);
      if (target) {
          updateNote({ ...target, isTrashed: false, deletedAt: undefined });
      }
  };

  const createFolder = async (name: string) => {
      const newFolder = { id: Date.now().toString(), name, createdAt: Date.now() };
      setFolders(prev => [...prev, newFolder]);
      if(dbReady) await dbService.addFolder(newFolder);
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
        
        // Update DB with synced data
        if (dbReady) {
            for(const note of syncedNotes) {
                // Determine if insert or update
                await dbService.addNote(note).catch(() => dbService.updateNote(note));
            }
        }
        
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