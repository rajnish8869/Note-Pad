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
    className?: string;
}

export const NoteCard: React.FC<NoteCardProps> = ({ 
    note, onClick, onPin, onRestore, onDeleteForever, isTrashView,
    selectionMode, isSelected, onLongPress, className = ""
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
    : 'border-transparent dark:border-gray-800 shadow-sm';

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

  // Modern Card Logic
  const showBody = !isLocked && (note.plainTextPreview || note.title);

  return (
    <div 
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      className={`
        ${colorClass} ${styles.text} 
        rounded-[1.5rem] p-5 transition-all duration-200 cursor-pointer relative overflow-hidden group break-inside-avoid 
        ${pinnedStyle} 
        ${isLocked ? 'ring-1 ring-inset ring-black/5 dark:ring-white/5' : 'border'} 
        ${isSelected ? 'ring-2 ring-blue-500 scale-[0.98]' : ''} 
        ${selectionMode && !isSelected ? 'opacity-60 scale-[0.95]' : ''} 
        ${className}
      `}
    >
      <div className="flex justify-between items-start mb-2">
         <h3 className={`font-bold text-lg leading-tight flex-1 pr-4 ${(!note.title && isLocked) ? "italic opacity-50" : ""}`}>
            {note.title || (isLocked ? "Locked Note" : "Untitled")}
        </h3>
        
        {/* If Selection Mode is active, show checkbox instead of Pin icon */}
        {selectionMode ? (
             <div className={`flex-shrink-0 transition-colors ${isSelected ? 'text-blue-500' : styles.secondaryText}`}>
                 <Icon name={isSelected ? "checkCircle" : "circle"} size={22} fill={isSelected} />
             </div>
        ) : (
             !isTrashView && note.isPinned && (
                <div className={`absolute top-0 right-0 p-2.5 rounded-bl-2xl shadow-sm ${theme === 'vision' ? 'bg-[#2F6BFF] text-white' : 'bg-blue-500 text-white'}`}>
                    <Icon name="pinFilled" size={14} fill={true} />
                </div>
            )
        )}
      </div>
      
      {isLocked ? (
        <div className={`mt-3 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 border-dashed transition-colors ${styles.lockedBg} ${styles.lockedBorder}`}>
           <div className={`p-1.5 rounded-full ${styles.tagBg} ${isCustomLock ? styles.primaryText : styles.secondaryText}`}>
                <Icon name="lock" size={18} />
           </div>
           <span className={`text-[9px] uppercase font-bold tracking-widest ${isCustomLock ? styles.primaryText : styles.secondaryText}`}>
                {isCustomLock ? "Private" : "Locked"}
           </span>
        </div>
      ) : (
        <p className={`text-[0.95rem] leading-relaxed line-clamp-[8] mb-3 min-h-[1.5rem] whitespace-pre-wrap opacity-90 ${!note.title ? 'text-lg pt-1 font-medium text-gray-400' : ''}`}>
            {note.plainTextPreview || (note.title ? "" : "Empty note")}
        </p>
      )}

      {!isLocked && (hasImage || hasAudio || note.location) && (
          <div className="flex gap-3 mb-3 mt-2">
              {hasImage && <div className={`p-1.5 rounded-lg ${styles.tagBg}`}><Icon name="image" size={16} className={styles.secondaryText} /></div>}
              {hasAudio && <div className={`p-1.5 rounded-lg ${styles.tagBg}`}><Icon name="mic" size={16} className={styles.secondaryText} /></div>}
              {note.location && <div className={`p-1.5 rounded-lg ${styles.tagBg}`}><Icon name="mapPin" size={16} className={styles.secondaryText} /></div>}
          </div>
      )}

      {note.tags && note.tags.length > 0 && !isEncrypted && (
          <div className="flex flex-wrap gap-1.5 mb-1 mt-auto pt-2">
              {note.tags.slice(0, 3).map(tag => (
                  <span key={tag} className={`text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-md ${styles.tagBg} ${styles.tagText}`}>
                      #{tag}
                  </span>
              ))}
              {note.tags.length > 3 && (
                   <span className={`text-[10px] self-center ${styles.secondaryText}`}>+{note.tags.length - 3}</span>
              )}
          </div>
      )}

      <div className={`flex justify-between items-center mt-3 pt-2 ${!isTrashView ? `border-t ${styles.divider} border-opacity-40` : ''} text-[10px] ${styles.secondaryText}`}>
        <span className="flex items-center gap-1.5 font-medium tracking-wide">
             {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
             {!isTrashView && note.isSynced && <Icon name="check" size={12} className={styles.successText} />}
             {note.isIncognito && <Icon name="incognito" size={12} className="ml-1 opacity-70" />}
        </span>
      </div>
      
      {!selectionMode && isTrashView && (
          <div className={`flex justify-end gap-3 mt-3 pt-2 border-t ${styles.divider}`}>
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