import React, { useState, useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { ViewState, Note, NoteSecurity } from './types';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { SecurityProvider, useSecurity } from './contexts/SecurityContext';
import { NotesProvider, useNotes } from './contexts/NotesContext';
import { Drawer } from './components/Drawer';
import { FAB } from './components/FAB';
import { AuthModal } from './components/AuthModal';
import { SecuritySetupModal } from './components/SecuritySetupModal';
import { LockSelectionModal } from './components/LockSelectionModal';
import { AlertModal } from './components/AlertModal';
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
  const [selectionMode, setSelectionMode] = useState(false);
  
  // Modal States
  const [showSecuritySetup, setShowSecuritySetup] = useState(false);
  const [securitySetupMode, setSecuritySetupMode] = useState<'GLOBAL' | 'CUSTOM'>('GLOBAL');
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAuthNote, setPendingAuthNote] = useState<Note | null>(null);
  
  const [showLockSelection, setShowLockSelection] = useState(false);
  const [isLockingGlobal, setIsLockingGlobal] = useState(false); 
  
  // Alert State
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '' });

  const stateRef = useRef({
    view, isDrawerOpen, showAuthModal, showSecuritySetup, 
    showLockSelection, isAppLocked, selectionMode, alertConfig
  });
  
  // Flag to debounce back button presses
  const processingBack = useRef(false);

  useEffect(() => {
    stateRef.current = { 
        view, isDrawerOpen, showAuthModal, showSecuritySetup, 
        showLockSelection, isAppLocked, selectionMode, alertConfig
    };
  }, [view, isDrawerOpen, showAuthModal, showSecuritySetup, showLockSelection, isAppLocked, selectionMode, alertConfig]);

  useEffect(() => {
    const backListener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        // Debounce: Prevent double handling if user mashes back button
        if (processingBack.current) return;
        processingBack.current = true;
        setTimeout(() => { processingBack.current = false; }, 400);

        const state = stateRef.current;
        
        if (state.isAppLocked) {
            CapacitorApp.exitApp();
            return;
        }

        if (state.alertConfig.isOpen) {
            setAlertConfig(prev => ({ ...prev, isOpen: false }));
            return;
        }

        if (state.showAuthModal) {
            setShowAuthModal(false);
            setPendingAuthNote(null);
            setIsLockingGlobal(false);
            return;
        }
        if (state.showSecuritySetup) {
            setShowSecuritySetup(false);
            return;
        }
        if (state.showLockSelection) {
            setShowLockSelection(false);
            return;
        }

        if (state.isDrawerOpen) {
            setIsDrawerOpen(false);
            return;
        }

        if (state.selectionMode) {
            setSelectionMode(false);
            return;
        }

        switch (state.view) {
            case 'EDITOR':
                // Handled internally by EditorView to support dirty checks
                break;
            case 'SETTINGS':
                setView('LIST');
                break;
            case 'TRASH':
                setView('LIST');
                break;
            case 'FOLDER':
                setView('LIST');
                setCurrentFolderId(null);
                break;
            case 'LIST':
            default:
                CapacitorApp.exitApp();
                break;
        }
    });

    return () => {
        backListener.then(handler => handler.remove());
    };
  }, []);

  const handleNoteClick = (note: Note) => {
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
      if (isAppLocked) {
          unlockApp(key, rawPin);
          return;
      } 
      
      if (pendingAuthNote) {
          if (pendingAuthNote.lockMode === 'CUSTOM') {
              setActiveNoteKey(key);
          } else {
              unlockApp(key, rawPin); 
          }
          
          setActiveNote(pendingAuthNote);
          setSelectedNoteId(pendingAuthNote.id);
          setView('EDITOR');
          setPendingAuthNote(null);
          setShowAuthModal(false);
          return;
      } 
      
      if (isLockingGlobal && activeNote) {
          unlockApp(key, rawPin); 
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
          // Unlock the note
          const unlockedNote: Note = { 
              ...activeNote, 
              isLocked: false, 
              lockMode: undefined, 
              security: undefined 
          };
          // Only update local state. EditorView will handle saving the plain text version
          // on the next save (auto-save or back), which ensures content is decrypted/converted correctly.
          setActiveNote(unlockedNote);
      } else {
          setShowLockSelection(true);
      }
  };

  const handleSelectGlobalLock = () => {
      setShowLockSelection(false);
      if (!hasSecuritySetup) {
          setAlertConfig({
              isOpen: true,
              title: "Setup Required",
              message: "Please setup a Global PIN in Settings first."
          });
          return;
      }

      if (sessionKey) {
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
          setIsLockingGlobal(true);
          setShowAuthModal(true);
      }
  };

  const handleSelectCustomLock = () => {
      setShowLockSelection(false);
      setSecuritySetupMode('CUSTOM');
      setShowSecuritySetup(true);
  };

  const renderContent = () => {
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
                    initialSearchQuery={searchQuery}
                    onRequestAuth={() => {
                        setPendingAuthNote(activeNote);
                        setShowAuthModal(true);
                    }}
                />
                {showLockSelection && (
                    <LockSelectionModal 
                        onSelectGlobal={handleSelectGlobalLock}
                        onSelectCustom={handleSelectCustomLock}
                        onCancel={() => setShowLockSelection(false)}
                        hasGlobalSecurity={hasSecuritySetup}
                    />
                )}
                <AlertModal 
                    isOpen={alertConfig.isOpen}
                    onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                    title={alertConfig.title}
                    message={alertConfig.message}
                />
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
                selectionMode={selectionMode}
                setSelectionMode={setSelectionMode}
            />
            
            {view !== 'TRASH' && !selectionMode && <FAB onClick={handleCreateNote} />}

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

  return (
      <>
        {/* Overlay Modals: Ensure these are rendered on top */}
        {isAppLocked && (
            <div className="fixed inset-0 z-[100]">
                <AuthModal onUnlock={handleAuthSuccess} theme={theme} />
            </div>
        )}
        
        {!isAppLocked && showSecuritySetup && (
            <div className="fixed inset-0 z-[100]">
                 <SecuritySetupModal onComplete={handleSecuritySetupComplete} onCancel={() => setShowSecuritySetup(false)} theme={theme} />
            </div>
        )}

        {!isAppLocked && showAuthModal && (
            <div className="fixed inset-0 z-[100]">
                <AuthModal 
                    onUnlock={handleAuthSuccess} 
                    onCancel={() => { setShowAuthModal(false); setPendingAuthNote(null); setIsLockingGlobal(false); }} 
                    customSecurity={pendingAuthNote?.lockMode === 'CUSTOM' ? pendingAuthNote.security : undefined}
                    theme={theme}
                />
            </div>
        )}

        {/* Main Application Layer */}
        {/* Use hidden instead of unmounting to preserve EditorView state during lock/background */}
        <div className={`w-full h-full ${isAppLocked ? 'hidden' : 'contents'}`}>
            {renderContent()}
        </div>
      </>
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