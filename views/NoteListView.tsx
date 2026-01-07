import React, { useState, useMemo } from 'react';
import { useNotes } from '../contexts/NotesContext';
import { useTheme } from '../contexts/ThemeContext';
import { NoteCard } from '../components/NoteCard';
import { Icon } from '../components/Icon';
import { Note, ViewState } from '../types';

interface Props {
  view: ViewState;
  currentFolderId: string | null;
  onNoteClick: (note: Note) => void;
  onMenuClick: () => void;
  searchQuery: string;
  setSearchQuery: (s: string) => void;
}

export const NoteListView: React.FC<Props> = ({ view, currentFolderId, onNoteClick, onMenuClick, searchQuery, setSearchQuery }) => {
  const { notes, isIncognito, user, syncSuccess, deleteNote, restoreNote, deleteForever, addNote, updateNote } = useNotes();
  const { theme, styles } = useTheme();
  const [layoutMode, setLayoutMode] = useState<'GRID' | 'LIST'>('GRID');
  const [sortBy, setSortBy] = useState<'UPDATED' | 'CREATED' | 'TITLE'>('UPDATED');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  let viewTitle = isIncognito ? "Incognito" : "Notes";
  if (view === 'TRASH') viewTitle = "Trash";

  const filteredNotes = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    let filtered = notes.filter(n => 
      (n.title.toLowerCase().includes(lowerQuery) || n.plainTextPreview.toLowerCase().includes(lowerQuery) || (n.encryptedData && lowerQuery === ''))
    );

    if (view === 'TRASH') {
        filtered = filtered.filter(n => n.isTrashed);
    } else {
        filtered = filtered.filter(n => !n.isTrashed);
        if (view === 'FOLDER' && currentFolderId) {
            filtered = filtered.filter(n => n.folderId === currentFolderId);
        }
    }

    return filtered.sort((a, b) => {
        if (!a.isTrashed && !b.isTrashed && a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        switch(sortBy) {
            case 'TITLE': return a.title.localeCompare(b.title);
            case 'CREATED': return b.createdAt - a.createdAt;
            case 'UPDATED': default: return b.updatedAt - a.updatedAt;
        }
    });
  }, [notes, searchQuery, view, currentFolderId, sortBy]);

  const togglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const note = notes.find(n => n.id === id);
    if(note) updateNote({ ...note, isPinned: !note.isPinned });
  };

  return (
    <div className="w-full max-w-md md:max-w-3xl min-h-[100dvh] relative flex flex-col">
        {isIncognito && (
            <div className="bg-purple-900 text-white text-xs text-center py-1 font-bold tracking-widest uppercase pt-[env(safe-area-inset-top)]">
                Incognito Mode Active - Data not saved
            </div>
        )}

        {/* Header */}
        <div className="sticky top-0 z-30 pt-[calc(1rem+env(safe-area-inset-top))] px-4 pb-4 pointer-events-none">
          <div className={`pointer-events-auto shadow-md rounded-full h-12 flex items-center px-2 transition-all ${styles.searchBar} ${isIncognito ? 'ring-2 ring-purple-500' : ''}`}>
            <button onClick={onMenuClick} className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full ${styles.iconHover} ${styles.text}`}>
              <Icon name="menu" size={24} />
            </button>
            <div className="flex-1 flex items-center px-2 min-w-0">
                <input 
                  type="text" 
                  placeholder={`Search ${viewTitle.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full bg-transparent border-none focus:ring-0 text-base ${styles.searchBarText} ${styles.searchBarPlaceholder}`}
                />
            </div>

            {view === 'LIST' && (
                <>
                    <button onClick={() => setLayoutMode(prev => prev === 'GRID' ? 'LIST' : 'GRID')} className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full ${styles.iconHover} ${styles.text}`}>
                        <Icon name={layoutMode === 'GRID' ? 'viewList' : 'grid'} size={22} />
                    </button>
                    <div className="relative">
                        <button onClick={() => setIsSortMenuOpen(!isSortMenuOpen)} className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full transition-colors ${isSortMenuOpen ? styles.iconHover : `${styles.iconHover} ${styles.text}`}`}>
                             <Icon name="sort" size={22} />
                        </button>
                        {isSortMenuOpen && (
                            <>
                            <div className={`fixed inset-0 z-30 ${styles.modalOverlay}`} onClick={() => setIsSortMenuOpen(false)}></div>
                            <div className={`absolute top-12 right-0 w-48 shadow-xl rounded-xl border py-2 z-40 animate-slide-up origin-top-right ${styles.cardBase} ${styles.cardBorder}`}>
                                <div className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider ${styles.secondaryText}`}>Sort By</div>
                                <button onClick={() => { setSortBy('UPDATED'); setIsSortMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between ${sortBy === 'UPDATED' ? `${styles.primaryText} font-medium` : styles.text}`}>Last Modified</button>
                                <button onClick={() => { setSortBy('CREATED'); setIsSortMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between ${sortBy === 'CREATED' ? `${styles.primaryText} font-medium` : styles.text}`}>Date Created</button>
                                <button onClick={() => { setSortBy('TITLE'); setIsSortMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between ${sortBy === 'TITLE' ? `${styles.primaryText} font-medium` : styles.text}`}>Title (A-Z)</button>
                            </div>
                            </>
                        )}
                    </div>
                </>
            )}

            <div className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer overflow-hidden ml-1 mr-1 border border-transparent ${theme === 'neo-glass' ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'}`} onClick={onMenuClick}>
             {user?.imageUrl ? <img src={user.imageUrl} className="w-full h-full object-cover" /> : (user ? user.name[0] : <Icon name={isIncognito ? "incognito" : "user"} size={16} />)}
            </div>
          </div>
        </div>

        {syncSuccess && (
            <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur text-white px-4 py-2 rounded-full text-sm shadow-lg z-30 animate-slide-up flex items-center gap-2">
                <Icon name="check" size={16} className="text-green-400" /> Synced
            </div>
        )}

        <main className="flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] -mt-2">
            {filteredNotes.length === 0 ? (
                <div className={`flex flex-col items-center justify-center h-[60vh] ${styles.secondaryText}`}>
                    <div className={`p-8 rounded-full mb-6 ${styles.tagBg}`}>
                        <Icon name={searchQuery ? 'search' : 'fileText'} size={64} className="opacity-40" />
                    </div>
                    <p className="font-bold text-lg">{searchQuery ? "No results found" : "No notes here"}</p>
                </div>
            ) : (
                <div className={`${layoutMode === 'GRID' ? 'columns-2 md:columns-3 gap-4 space-y-4' : 'flex flex-col gap-4'}`}>
                    {filteredNotes.map(note => (
                        <NoteCard 
                            key={note.id} 
                            note={note} 
                            onClick={() => onNoteClick(note)}
                            onPin={(e) => togglePin(e, note.id)}
                            onRestore={(e) => { e.stopPropagation(); restoreNote(note.id); }}
                            onDeleteForever={(e) => { e.stopPropagation(); deleteForever(note.id); }}
                            isTrashView={!!note.isTrashed}
                        />
                    ))}
                </div>
            )}
        </main>
    </div>
  );
};