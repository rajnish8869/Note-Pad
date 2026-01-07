import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon';
import { ViewState } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useNotes } from '../contexts/NotesContext';
import { useSecurity } from '../contexts/SecurityContext';

interface DrawerProps { 
  isOpen: boolean; 
  onClose: () => void; 
  currentView: ViewState;
  currentFolderId: string | null;
  onChangeView: (view: ViewState, folderId?: string) => void;
  onShowSecuritySetup: () => void;
}

export const Drawer: React.FC<DrawerProps> = ({ 
    isOpen, onClose, currentView, currentFolderId, onChangeView, onShowSecuritySetup
}) => {
  const { theme, styles } = useTheme();
  const { user, folders, createFolder } = useNotes();
  const { hasSecuritySetup } = useSecurity();

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreatingFolder && inputRef.current) {
        inputRef.current.focus();
    }
  }, [isCreatingFolder]);

  const submitFolder = () => {
    if (newFolderName.trim()) {
        createFolder(newFolderName.trim());
        setNewFolderName("");
        setIsCreatingFolder(false);
    }
  };

  const menuButtonClass = (isActive: boolean) => 
    `w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${isActive ? styles.activeItem : `${styles.text} ${styles.iconHover}`}`;

  return (
    <>
      <div 
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${styles.modalOverlay} ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div className={`fixed top-0 left-0 h-[100dvh] w-[280px] z-50 shadow-2xl transform transition-transform duration-300 overflow-y-auto pb-[env(safe-area-inset-bottom)] ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${styles.drawer}`}>
        <div className={`p-6 pt-[calc(1.5rem+env(safe-area-inset-top))] border-b ${styles.divider} flex flex-col items-center`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-3 overflow-hidden shadow-inner ${theme === 'neo-glass' ? 'bg-white/20 text-white' : (theme === 'vision' ? 'bg-[#141F3A] text-[#2F6BFF]' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300')}`}>
            {user?.imageUrl ? (
                <img src={user.imageUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
                user ? user.name.charAt(0).toUpperCase() : <Icon name="user" size={32} />
            )}
          </div>
          <h2 className={`font-bold text-lg ${styles.text}`}>
            {user ? user.name : "Guest User"}
          </h2>
          <p className={`text-sm truncate w-full text-center ${styles.secondaryText}`}>
            {user ? user.email : "Sign in to sync notes"}
          </p>
        </div>
        
        <div className="p-4 space-y-1">
          <button onClick={() => onChangeView('LIST')} className={menuButtonClass(currentView === 'LIST')}>
             <Icon name="list" size={20} />
             <span>All Notes</span>
          </button>
          <button onClick={() => onChangeView('TRASH')} className={menuButtonClass(currentView === 'TRASH')}>
             <Icon name="trash" size={20} />
             <span>Trash</span>
          </button>
          
          <div className={`h-px my-2 ${styles.divider}`} />
          
          <div className={`flex justify-between items-center px-3 py-2 text-xs font-semibold uppercase tracking-wider ${styles.secondaryText}`}>
             <span>Folders</span>
             <button onClick={() => setIsCreatingFolder(!isCreatingFolder)} className={`p-1 rounded ${styles.iconHover}`}>
                 <Icon name={isCreatingFolder ? "x" : "plus"} size={14} />
             </button>
          </div>
          
          {isCreatingFolder && (
              <div className="px-3 py-2 flex gap-2 animate-slide-in">
                  <input 
                      ref={inputRef}
                      type="text" 
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Folder Name"
                      className={`flex-1 rounded px-2 py-1 text-sm outline-none ${styles.input} ${styles.inputText} ${styles.searchBarPlaceholder}`}
                      onKeyDown={(e) => e.key === 'Enter' && submitFolder()}
                  />
                  <button onClick={submitFolder} className={styles.primaryText}>
                      <Icon name="check" size={18} />
                  </button>
              </div>
          )}

          {folders.length === 0 && !isCreatingFolder && <p className={`text-xs px-3 italic ${styles.secondaryText}`}>No folders</p>}
          {folders.map(f => (
               <button 
                  key={f.id}
                  onClick={() => onChangeView('FOLDER', f.id)}
                  className={menuButtonClass(currentView === 'FOLDER' && currentFolderId === f.id)}
               >
                  <Icon name="folder" size={18} />
                  <span className="truncate">{f.name}</span>
               </button>
          ))}

          <div className={`h-px my-2 ${styles.divider}`} />

          <button 
            onClick={() => onChangeView('SETTINGS')}
            className={menuButtonClass(currentView === 'SETTINGS')}
          >
            <Icon name="settings" size={20} />
            <span>Settings</span>
          </button>
          
          {!hasSecuritySetup && (
             <button 
                onClick={onShowSecuritySetup}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors mt-4 ${styles.primaryBg} ${styles.primaryText}`}
             >
                <Icon name="shield" size={20} />
                <span>Setup Security</span>
             </button>
          )}
        </div>
      </div>
    </>
  );
};