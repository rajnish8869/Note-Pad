import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  const { user, folders, createFolder, notes } = useNotes();
  const { hasSecuritySetup } = useSecurity();

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreatingFolder && inputRef.current) {
        inputRef.current.focus();
    }
  }, [isCreatingFolder]);

  // Calculate counts
  const allNotesCount = useMemo(() => notes.filter(n => !n.isTrashed).length, [notes]);
  const trashCount = useMemo(() => notes.filter(n => n.isTrashed).length, [notes]);
  const folderCounts = useMemo(() => {
      const counts: Record<string, number> = {};
      notes.forEach(n => {
          if (n.folderId && !n.isTrashed) {
              counts[n.folderId] = (counts[n.folderId] || 0) + 1;
          }
      });
      return counts;
  }, [notes]);

  const submitFolder = () => {
    if (newFolderName.trim()) {
        createFolder(newFolderName.trim());
        setNewFolderName("");
        setIsCreatingFolder(false);
    }
  };

  const NavItem: React.FC<{ 
      icon: any, label: string, active: boolean, onClick: () => void, count?: number, colorClass?: string 
  }> = ({ 
      icon, label, active, onClick, count, colorClass 
  }) => (
      <button 
        onClick={onClick} 
        className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-200 group active:scale-95 ${active ? styles.activeItem : `bg-transparent ${styles.iconHover}`}`}
      >
         <div className={`transition-colors ${active ? '' : (colorClass || styles.secondaryText)}`}>
            <Icon name={icon} size={22} fill={active} />
         </div>
         <span className={`flex-1 text-left font-medium text-sm ${active ? '' : styles.text}`}>{label}</span>
         {count !== undefined && count > 0 && (
             <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${active ? 'bg-white/20' : styles.tagBg} ${active ? '' : styles.secondaryText}`}>
                 {count}
             </span>
         )}
      </button>
  );

  return (
    <>
      <div 
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${styles.modalOverlay} ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      <div className={`fixed top-0 left-0 h-[100dvh] w-[300px] z-50 shadow-2xl transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${styles.drawer}`}>
        
        {/* --- Profile Header --- */}
        <div className={`p-6 pt-[calc(2rem+env(safe-area-inset-top))] pb-6 shrink-0`}>
             <div className={`flex items-center gap-4 p-4 rounded-3xl border shadow-sm ${styles.cardBase} ${styles.cardBorder}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden shrink-0 ${theme === 'neo-glass' ? 'bg-white/20' : 'bg-gradient-to-br from-blue-400 to-blue-600 text-white'}`}>
                    {user?.imageUrl ? (
                        <img src={user.imageUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-lg font-bold">{user ? user.name.charAt(0).toUpperCase() : <Icon name="user" size={24} />}</span>
                    )}
                </div>
                <div className="overflow-hidden">
                    <h2 className={`font-bold text-base truncate ${styles.text}`}>
                        {user ? user.name : "Guest User"}
                    </h2>
                    <p className={`text-xs truncate opacity-60 ${styles.text}`}>
                        {user ? user.email : "Local Account"}
                    </p>
                </div>
             </div>
        </div>
        
        {/* --- Scrollable Content --- */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6 no-scrollbar">
            
            {/* Main Nav */}
            <div className="space-y-1">
                <NavItem 
                    icon="list" 
                    label="All Notes" 
                    active={currentView === 'LIST'} 
                    onClick={() => onChangeView('LIST')} 
                    count={allNotesCount}
                />
                <NavItem 
                    icon="trash" 
                    label="Trash" 
                    active={currentView === 'TRASH'} 
                    onClick={() => onChangeView('TRASH')} 
                    count={trashCount}
                    colorClass={styles.dangerText}
                />
            </div>

            {/* Folders Section */}
            <div>
                <div className={`flex justify-between items-center px-2 mb-2`}>
                     <span className={`text-xs font-bold uppercase tracking-wider opacity-50 ${styles.text}`}>Collections</span>
                     <button onClick={() => setIsCreatingFolder(!isCreatingFolder)} className={`p-1.5 rounded-lg transition-colors ${styles.iconHover} ${styles.text}`}>
                         <Icon name={isCreatingFolder ? "x" : "plus"} size={16} />
                     </button>
                </div>

                <div className="space-y-1">
                    {isCreatingFolder && (
                        <div className={`flex items-center gap-2 p-2 rounded-xl mb-2 animate-slide-in border ${styles.cardBorder} ${styles.cardBase}`}>
                            <Icon name="folder" size={18} className={styles.primaryText} />
                            <input 
                                ref={inputRef}
                                type="text" 
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="Name..."
                                className={`flex-1 bg-transparent text-sm outline-none w-full ${styles.text} placeholder:opacity-50`}
                                onKeyDown={(e) => e.key === 'Enter' && submitFolder()}
                            />
                            <button onClick={submitFolder} className={`p-1 rounded-full ${styles.primaryBg} ${styles.primaryText}`}>
                                <Icon name="check" size={14} />
                            </button>
                        </div>
                    )}

                    {folders.length === 0 && !isCreatingFolder && (
                        <div className={`text-xs text-center py-4 italic opacity-40 ${styles.text}`}>
                            No collections yet
                        </div>
                    )}

                    {folders.map(f => (
                        <NavItem 
                            key={f.id}
                            icon="folder"
                            label={f.name}
                            active={currentView === 'FOLDER' && currentFolderId === f.id}
                            onClick={() => onChangeView('FOLDER', f.id)}
                            count={folderCounts[f.id]}
                        />
                    ))}
                </div>
            </div>
        </div>

        {/* --- Footer Actions --- */}
        <div className={`p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] border-t ${styles.divider} ${styles.cardBase}`}>
            <NavItem 
                icon="settings" 
                label="Settings" 
                active={currentView === 'SETTINGS'} 
                onClick={() => onChangeView('SETTINGS')} 
            />
            
            {!hasSecuritySetup && (
                 <button 
                    onClick={onShowSecuritySetup}
                    className={`w-full mt-3 flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-bold shadow-md active:scale-95 transition-all ${styles.primaryBg} ${styles.primaryText}`}
                 >
                    <Icon name="shield" size={18} />
                    <span>Protect Notes</span>
                 </button>
            )}
            
            <div className={`mt-4 text-[10px] text-center opacity-30 ${styles.text}`}>
                CloudPad v1.0.2
            </div>
        </div>

      </div>
    </>
  );
};