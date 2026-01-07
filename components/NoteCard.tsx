import React, { useRef } from 'react';
import { Note } from '../types';
import { Icon } from './Icon';
import { useTheme, NOTE_COLORS } from '../contexts/ThemeContext';

interface NoteCardProps { 
    note: Note; 
    onClick: () => void; 
    onPin: (e: React.MouseEvent) => void;
    onRestore?: (e: React.MouseEvent) => void;
    onDeleteForever?: (e: React.MouseEvent) => void;
    isTrashView: boolean;
    selectionMode: boolean;
    isSelected: boolean;
    onLongPress: (id: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ 
    note, onClick, onPin, onRestore, onDeleteForever, isTrashView,
    selectionMode, isSelected, onLongPress
}) => {
  const { theme, styles } = useTheme();
  const colorKey = note.color || 'default';
  const colorClass = NOTE_COLORS[colorKey][theme];
  
  const timerRef = useRef<any>(null);
  const isLongPress = useRef(false);

  const pinnedStyle = !isTrashView && note.isPinned 
    ? (theme === 'neo-glass' 
        ? 'border-yellow-200/50 shadow-[0_0_15px_rgba(255,255,255,0.15)] bg-white/15' 
        : theme === 'vision' 
            ? 'border-[#2F6BFF] shadow-[0_0_12px_rgba(47,107,255,0.25)]'
            : 'border-blue-400/50 dark:border-blue-500/50 shadow-md ring-1 ring-blue-500/20')
    : '';

  const isLocked = note.isLocked || !!note.encryptedData;
  const isCustomLock = note.lockMode === 'CUSTOM';
  const isEncrypted = !!note.encryptedData;
  
  const hasImage = !isEncrypted && note.content.includes('<img');
  const hasAudio = !isEncrypted && note.content.includes('<audio');

  const handleTouchStart = () => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
        isLongPress.current = true;
        onLongPress(note.id);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
    }
  };

  const handleClick = () => {
      if (isLongPress.current) {
          isLongPress.current = false;
          return;
      }
      onClick();
  }

  return (
    <div 
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      className={`${colorClass} ${styles.text} border rounded-2xl p-4 transition-all cursor-pointer relative overflow-hidden group mb-4 break-inside-avoid hover:shadow-lg ${pinnedStyle} ${isLocked ? 'ring-1 ring-inset ring-black/5 dark:ring-white/5' : ''} ${isSelected ? 'ring-2 ring-blue-500 scale-[0.98]' : ''} ${selectionMode && !isSelected ? 'opacity-70 scale-[0.98]' : ''}`}
    >
      <div className="flex justify-between items-start mb-2">
         <h3 className={`font-semibold text-lg line-clamp-2 leading-tight flex-1 pr-6 mb-1 ${(!note.title && isLocked) ? "italic opacity-50" : ""}`}>
            {note.title || (isLocked ? "Locked Note" : "Untitled")}
        </h3>
        
        {/* If Selection Mode is active, show checkbox instead of Pin icon */}
        {selectionMode ? (
             <div className={`absolute top-2 right-2 p-1.5 rounded-full ${isSelected ? 'text-blue-500' : styles.secondaryText}`}>
                 <Icon name={isSelected ? "checkCircle" : "circle"} size={20} fill={isSelected} />
             </div>
        ) : (
             !isTrashView && note.isPinned && (
                <div className={`absolute top-0 right-0 p-2 rounded-bl-xl ${theme === 'vision' ? 'bg-[#2F6BFF] text-white' : 'bg-blue-500 text-white'}`}>
                    <Icon name="pinFilled" size={12} fill={true} />
                </div>
            )
        )}
      </div>
      
      {isLocked ? (
        <div className={`mt-2 h-24 rounded-xl flex flex-col items-center justify-center gap-2 border-2 border-dashed transition-colors ${styles.lockedBg} ${styles.lockedBorder}`}>
           <div className={`p-2 rounded-full ${styles.tagBg} ${isCustomLock ? styles.primaryText : styles.secondaryText}`}>
                <Icon name="lock" size={20} />
           </div>
           <span className={`text-[10px] uppercase font-bold tracking-widest ${isCustomLock ? styles.primaryText : styles.secondaryText}`}>
                {isCustomLock ? "Private" : "Locked"}
           </span>
        </div>
      ) : (
        <p className={`text-sm line-clamp-[8] mb-3 min-h-[1.5rem] whitespace-pre-wrap ${styles.secondaryText} ${!note.title ? 'text-base pt-1' : ''}`}>
            {note.plainTextPreview || (note.title ? "" : "Empty note")}
        </p>
      )}

      {!isLocked && (hasImage || hasAudio || note.location) && (
          <div className="flex gap-2 mb-3">
              {hasImage && <Icon name="image" size={14} className={styles.secondaryText} />}
              {hasAudio && <Icon name="mic" size={14} className={styles.secondaryText} />}
              {note.location && <Icon name="mapPin" size={14} className={styles.secondaryText} />}
          </div>
      )}

      {note.tags && note.tags.length > 0 && !isEncrypted && (
          <div className="flex flex-wrap gap-1 mb-3">
              {note.tags.slice(0, 3).map(tag => (
                  <span key={tag} className={`text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded ${styles.tagBg} ${styles.tagText}`}>
                      {tag}
                  </span>
              ))}
              {note.tags.length > 3 && (
                   <span className={`text-[10px] self-center ${styles.secondaryText}`}>+{note.tags.length - 3}</span>
              )}
          </div>
      )}

      <div className={`flex justify-between items-center mt-2 text-[10px] ${styles.secondaryText}`}>
        <span className="flex items-center gap-1">
             {note.updatedAt > note.createdAt ? "Edited" : ""} {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
             {!isTrashView && note.isSynced && <Icon name="check" size={10} className={styles.successText} />}
             {note.isIncognito && <Icon name="incognito" size={12} className="ml-1 opacity-70" />}
        </span>
      </div>
      
      {!selectionMode && !isTrashView && (
        <button 
            onClick={onPin}
            className={`absolute bottom-2 right-2 p-1.5 rounded-full transition-all ${styles.iconHover} ${note.isPinned ? `opacity-100 ${styles.primaryText}` : `opacity-0 group-hover:opacity-100 ${styles.secondaryText}`}`}
        >
            <Icon name={note.isPinned ? 'pinFilled' : 'pin'} size={14} fill={note.isPinned} />
        </button>
      )}

      {!selectionMode && isTrashView && (
          <div className={`flex justify-end gap-2 mt-2 pt-2 border-t ${styles.divider}`}>
              <button 
                onClick={onRestore}
                className={`p-2 rounded-full ${styles.iconHover} ${styles.successText}`}
                title="Restore"
              >
                  <Icon name="restore" size={18} />
              </button>
              <button 
                onClick={onDeleteForever}
                className={`p-2 rounded-full ${styles.iconHover} ${styles.dangerText}`}
                title="Delete Forever"
              >
                  <Icon name="trash" size={18} />
              </button>
          </div>
      )}
    </div>
  );
};