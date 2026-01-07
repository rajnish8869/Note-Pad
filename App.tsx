import React, { useState } from 'react';
import { ViewState, Note, NoteSecurity } from './types';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { SecurityProvider, useSecurity } from './contexts/SecurityContext';
import { NotesProvider, useNotes } from './contexts/NotesContext';
import { Drawer } from './components/Drawer';
import { FAB } from './components/FAB';
import { AuthModal } from './components/AuthModal';
import { SecuritySetupModal } from './components/SecuritySetupModal';
import { LockSelectionModal } from './components/LockSelectionModal';
import { EditorView } from './views/EditorView';
import { NoteListView } from './views/NoteListView';
import { SettingsView } from './views/SettingsView';

const MainApp = () => {
  const { theme, styles } = useTheme();
  const { 
    isAppLocked, unlockApp, lockApp, setupComplete: setupGlobalSecurity, 
    hasSecuritySetup, sessionKey 
  } = useSecurity();
  const { addNote, updateNote, deleteNote } = useNotes();
  
  const [view, setView] = useState<ViewState>('LIST');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [activeNoteKey, setActiveNoteKey] = useState<CryptoKey | null>(null);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  
  // Modal States
  const [showSecuritySetup, setShowSecuritySetup] = useState(false);
  const [securitySetupMode, setSecuritySetupMode] = useState<'GLOBAL' | 'CUSTOM'>('GLOBAL');
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAuthNote, setPendingAuthNote] = useState<Note | null>(null);
  
  const [showLockSelection, setShowLockSelection] = useState(false);
  const [isLockingGlobal, setIsLockingGlobal] = useState(false); // Used when confirming global PIN to lock a note

  // Handle Note Navigation
  const handleNoteClick = (note: Note) => {
      // Logic for locked notes
      if(note.isLocked || note.encryptedData) {
          if (note.lockMode === 'CUSTOM' && note.security) {
              setPendingAuthNote(note);
              setShowAuthModal(true);
              return;
          }
          if (!sessionKey) {
              setPendingAuthNote(note);
              setShowAuthModal(true);
              return; 
          }
          setActiveNoteKey(sessionKey);
      } else {
          setActiveNoteKey(null);
      }
      
      setActiveNote(note);
      setSelectedNoteId(note.id);
      setView('EDITOR');
  };

  const handleCreateNote = () => {
      const newNote: Note = {
        id: Date.now().toString(),
        title: "",
        content: "",
        plainTextPreview: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isPinned: false,
        color: 'default',
        tags: [],
        folderId: view === 'FOLDER' && currentFolderId ? currentFolderId : undefined,
      };
      addNote(newNote);
      setActiveNote(newNote);
      setSelectedNoteId(newNote.id);
      setActiveNoteKey(null);
      setView('EDITOR');
  };

  const handleAuthSuccess = (key: CryptoKey, rawPin?: string) => {
      // Scenario 1: Unlocking App
      if (isAppLocked) {
          unlockApp(key, rawPin);
          return;
      } 
      
      // Scenario 2: Unlocking a specific note to view it
      if (pendingAuthNote) {
          if (pendingAuthNote.lockMode === 'CUSTOM') {
              setActiveNoteKey(key);
          } else {
              unlockApp(key, rawPin); // Unlock global session for convenience
          }
          
          setActiveNote(pendingAuthNote);
          setSelectedNoteId(pendingAuthNote.id);
          setView('EDITOR');
          setPendingAuthNote(null);
          setShowAuthModal(false);
          return;
      } 
      
      // Scenario 3: Confirming Global PIN to apply Global Lock to a note
      if (isLockingGlobal && activeNote) {
          unlockApp(key, rawPin); // Ensure session is active
          // Now apply lock
          const lockedNote = {
             ...activeNote,
             isLocked: true,
             lockMode: 'GLOBAL' as const
          };
          updateNote(lockedNote);
          setActiveNote(lockedNote);
          setActiveNoteKey(key);
          
          setIsLockingGlobal(false);
          setShowAuthModal(false);
      }
  };

  const handleSecuritySetupComplete = (key: CryptoKey, security: NoteSecurity, rawPin: string) => {
      if (securitySetupMode === 'GLOBAL') {
          setupGlobalSecurity(key, security, rawPin);
      } else if (securitySetupMode === 'CUSTOM' && activeNote) {
          // Apply Custom Lock
          const lockedNote: Note = {
              ...activeNote,
              isLocked: true,
              lockMode: 'CUSTOM',
              security: security
          };
          updateNote(lockedNote);
          setActiveNote(lockedNote);
          setActiveNoteKey(key);
      }
      setShowSecuritySetup(false);
  };

  const handleLockToggleRequest = () => {
      if (!activeNote) return;

      if (activeNote.isLocked) {
          // Unlock
          // We assume we are in the editor and thus authorized/decrypted
          const unlockedNote: Note = { 
              ...activeNote, 
              isLocked: false, 
              encryptedData: undefined,
              lockMode: undefined, 
              security: undefined 
          };
          updateNote(unlockedNote);
          setActiveNote(unlockedNote);
      } else {
          // Lock - Show Selection
          setShowLockSelection(true);
      }
  };

  const handleSelectGlobalLock = () => {
      setShowLockSelection(false);
      if (!hasSecuritySetup) {
          alert("Please setup a Global PIN in Settings first.");
          return;
      }

      if (sessionKey) {
          // Already authenticated globally
          if (activeNote) {
              const lockedNote = {
                  ...activeNote,
                  isLocked: true,
                  lockMode: 'GLOBAL' as const
              };
              updateNote(lockedNote);
              setActiveNote(lockedNote);
              setActiveNoteKey(sessionKey);
          }
      } else {
          // Need to authenticate to get the session key for encryption
          setIsLockingGlobal(true);
          setShowAuthModal(true);
      }
  };

  const handleSelectCustomLock = () => {
      setShowLockSelection(false);
      setSecuritySetupMode('CUSTOM');
      setShowSecuritySetup(true);
  };

  // Full Screen Overlays
  if (isAppLocked) {
      return <AuthModal onUnlock={handleAuthSuccess} theme={theme} />;
  }
  
  if (showSecuritySetup) {
      return <SecuritySetupModal onComplete={handleSecuritySetupComplete} onCancel={() => setShowSecuritySetup(false)} theme={theme} />;
  }

  if (showAuthModal) {
      return <AuthModal 
        onUnlock={handleAuthSuccess} 
        onCancel={() => { setShowAuthModal(false); setPendingAuthNote(null); setIsLockingGlobal(false); }} 
        customSecurity={pendingAuthNote?.lockMode === 'CUSTOM' ? pendingAuthNote.security : undefined}
        theme={theme}
      />;
  }

  // Views
  if (view === 'EDITOR' && activeNote) {
      return (
        <>
            <EditorView 
                note={activeNote}
                folders={[]} 
                initialEditMode={!activeNote.title} 
                activeNoteKey={activeNoteKey || sessionKey}
                onSave={(n) => { updateNote(n); setActiveNote(n); }}
                onBack={() => setView('LIST')}
                onDelete={(id) => { deleteNote(id); setView('LIST'); }}
                onLockToggle={handleLockToggleRequest}
            />
            {showLockSelection && (
                <LockSelectionModal 
                    onSelectGlobal={handleSelectGlobalLock}
                    onSelectCustom={handleSelectCustomLock}
                    onCancel={() => setShowLockSelection(false)}
                    hasGlobalSecurity={hasSecuritySetup}
                />
            )}
        </>
      );
  }

  if (view === 'SETTINGS') {
      return (
          <SettingsView 
            onBack={() => setView('LIST')} 
            onSetupSecurity={() => { setSecuritySetupMode('GLOBAL'); setShowSecuritySetup(true); }}
          />
      );
  }

  return (
    <div className={`min-h-[100dvh] flex justify-center ${styles.bg}`}>
        <NoteListView 
            view={view}
            currentFolderId={currentFolderId}
            onNoteClick={handleNoteClick}
            onMenuClick={() => setIsDrawerOpen(true)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
        />
        
        {view !== 'TRASH' && <FAB onClick={handleCreateNote} />}

        <Drawer 
            isOpen={isDrawerOpen} 
            onClose={() => setIsDrawerOpen(false)}
            currentView={view}
            currentFolderId={currentFolderId}
            onChangeView={(v, id) => { setView(v); setCurrentFolderId(id || null); setIsDrawerOpen(false); }}
            onShowSecuritySetup={() => { setIsDrawerOpen(false); setSecuritySetupMode('GLOBAL'); setShowSecuritySetup(true); }}
        />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <SecurityProvider>
        <NotesProvider>
          <MainApp />
        </NotesProvider>
      </SecurityProvider>
    </ThemeProvider>
  );
}