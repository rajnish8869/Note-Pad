
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Note, NoteMetadata, Folder, UserProfile } from '../types';
import { BackupService } from '../services/DriveService'; // Importing from file but class is BackupService
import { StorageService } from '../services/StorageService';

interface NotesContextType {
  notes: NoteMetadata[];
  folders: Folder[];
  user: UserProfile | null;
  isIncognito: boolean;
  isLoading: boolean;
  isOnline: boolean;
  
  // Actions
  addNote: (note: Note, fullText?: string) => void;
  updateNote: (note: Note, fullText?: string) => void;
  deleteNote: (id: string) => void;
  deleteForever: (id: string) => void;
  deleteNotesForever: (ids: string[]) => void;
  restoreNote: (id: string) => void;
  createFolder: (name: string) => void;
  searchNotes: (query: string) => Promise<string[]>;
  
  toggleIncognito: (val: boolean) => void;
  exportData: () => Promise<void>;
  importData: (json: string) => Promise<void>;
  resetApplication: () => Promise<void>;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);
const backupService = new BackupService();

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notes, setNotes] = useState<NoteMetadata[]>([]);
  const [incognitoNotes, setIncognitoNotes] = useState<NoteMetadata[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isIncognito, setIsIncognito] = useState(false);
  const [user, setUser] = useState<UserProfile | null>({ id: 'local', name: 'Local User', email: '' });
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
            await reloadData();
        } catch (e) {
            console.error("Failed to initialize storage", e);
        } finally {
            setIsLoading(false);
        }
    };
    initData();
  }, []);

  const reloadData = async () => {
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
          
          if (cleanedNotes.length !== savedNotes.length) {
              await StorageService.saveNotesMetadata(cleanedNotes);
          }
          setNotes(cleanedNotes);
      } else {
          // Welcome note logic could go here
          setNotes([]);
      }
      
      if (savedFolders) setFolders(savedFolders);
  };

  // Save Folders Only (Notes are saved individually via actions)
  useEffect(() => {
    if (!isLoading) {
        StorageService.saveFolders(folders);
    }
  }, [folders, isLoading]);

  // Note Metadata Persistence
  useEffect(() => {
      if (!isLoading && !isIncognito) {
          StorageService.saveNotesMetadata(notes);
      }
  }, [notes, isLoading, isIncognito]);

  const activeNotes = isIncognito ? incognitoNotes : notes;
  
  const addNote = async (note: Note, fullText?: string) => {
      if (!isIncognito) {
          const meta = await StorageService.saveNote(note, fullText);
          setNotes(prev => [meta, ...prev]);
      } else {
          setIncognitoNotes(prev => [note, ...prev]);
      }
  };

  const updateNote = async (updatedNote: Note, fullText?: string) => {
      if (!isIncognito) {
          const meta = await StorageService.saveNote(updatedNote, fullText);
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

  const deleteNotesForever = async (ids: string[]) => {
      console.log("[NotesContext] deleteNotesForever", ids);
      if (!isIncognito) {
          // Optimistic update for responsiveness
          setNotes(prev => prev.filter(n => !ids.includes(n.id)));
          
          try {
              await StorageService.deleteNotes(ids);
              console.log("[NotesContext] Successfully deleted notes from storage");
          } catch(e) {
              console.error("[NotesContext] Error deleting notes from storage", e);
              // In a real app, we might revert state here or show an error
              await reloadData();
          }
      } else {
          setIncognitoNotes(prev => prev.filter(n => !ids.includes(n.id)));
      }
  };

  const restoreNote = (id: string) => {
      setNotes(prev => prev.map(n => n.id === id ? { ...n, isTrashed: false, deletedAt: undefined } : n));
  };

  const createFolder = (name: string) => {
      setFolders(prev => [...prev, { id: Date.now().toString(), name, createdAt: Date.now() }]);
  };

  const searchNotes = async (query: string): Promise<string[]> => {
      if (isIncognito) return []; // Incognito search is handled in view memory
      return await StorageService.search(query);
  };

  const exportData = async () => {
      await backupService.exportBackup();
  };

  const importData = async (json: string) => {
      await backupService.importBackup(json);
      await reloadData();
  };

  const resetApplication = async () => {
      await StorageService.clearAllData();
      window.location.reload();
  };

  return (
    <NotesContext.Provider value={{
        notes: activeNotes,
        folders,
        user,
        isIncognito,
        isLoading,
        isOnline,
        addNote,
        updateNote,
        deleteNote,
        deleteForever,
        deleteNotesForever,
        restoreNote,
        createFolder,
        searchNotes,
        toggleIncognito: setIsIncognito,
        exportData,
        importData,
        resetApplication
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
