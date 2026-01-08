import React, { useState, useMemo, useEffect } from 'react';
import { useNotes } from '../contexts/NotesContext';
import { useTheme } from '../contexts/ThemeContext';
import { NoteCard } from '../components/NoteCard';
import { Icon } from '../components/Icon';
import { Note, ViewState } from '../types';
import { Virtuoso } from 'react-virtuoso';

interface Props {
  view: ViewState;
  currentFolderId: string | null;
  onNoteClick: (note: Note) => void;
  onMenuClick: () => void;
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  selectionMode: boolean;
  setSelectionMode: (v: boolean) => void;
}

export const NoteListView: React.FC<Props> = ({ 
    view, currentFolderId, onNoteClick, onMenuClick, 
    searchQuery, setSearchQuery, selectionMode, setSelectionMode 
}) => {
  const { notes, folders, isIncognito, user, syncSuccess, isOnline, deleteNote, restoreNote, deleteForever, addNote, updateNote } = useNotes();
  const { theme, styles } = useTheme();
  const [layoutMode, setLayoutMode] = useState<'GRID' | 'LIST'>('GRID');
  const [sortBy, setSortBy] = useState<'UPDATED' | 'CREATED' | 'TITLE'>('UPDATED');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  useEffect(() => {
      const handleResize = () => setWindowWidth(window.innerWidth);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determine Columns based on width and mode
  const numColumns = useMemo(() => {
      if (layoutMode === 'LIST') return 1;
      if (windowWidth >= 1024) return 3; // Desktop
      if (windowWidth >= 768) return 2; // Tablet
      return 2; // Mobile - Defaults to 2 columns for grid
  }, [layoutMode, windowWidth]);

  // Clear selection when mode is turned off externally
  useEffect(() => {
      if (!selectionMode) {
          setSelectedIds(new Set());
          setShowMoveMenu(false);
      }
  }, [selectionMode]);

  let viewTitle = isIncognito ? "Incognito" : "Notes";
  if (view === 'TRASH') viewTitle = "Trash";
  if (view === 'FOLDER') {
      const folder = folders.find(f => f.id === currentFolderId);
      viewTitle = folder ? folder.name : "Folder";
  }

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

  // Chunk notes for virtualization rows
  const rows = useMemo(() => {
      const chunks = [];
      for (let i = 0; i < filteredNotes.length; i += numColumns) {
          chunks.push(filteredNotes.slice(i, i + numColumns));
      }
      return chunks;
  }, [filteredNotes, numColumns]);

  const togglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const note = notes.find(n => n.id === id);
    if(note) updateNote({ ...note, isPinned: !note.isPinned });
  };

  const handleLongPress = (id: string) => {
      if (!selectionMode) {
          setSelectionMode(true);
          setSelectedIds(new Set([id]));
      }
  };

  const handleNoteInteraction = (note: Note) => {
      if (selectionMode) {
          const newSet = new Set(selectedIds);
          if (newSet.has(note.id)) {
              newSet.delete(note.id);
          } else {
              newSet.add(note.id);
          }
          
          if (newSet.size === 0) {
              setSelectionMode(false);
          }
          setSelectedIds(newSet);
      } else {
          onNoteClick(note);
      }
  };

  const handleSelectAll = () => {
      if (selectedIds.size === filteredNotes.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(filteredNotes.map(n => n.id)));
      }
  };

  // Bulk Actions
  const handleBulkDelete = () => {
      const ids = Array.from(selectedIds);
      if (view === 'TRASH') {
          if(confirm(`Permanently delete ${ids.length} notes?`)) {
              ids.forEach(id => deleteForever(id));
              setSelectionMode(false);
          }
      } else {
          ids.forEach(id => deleteNote(id));
          setSelectionMode(false);
      }
  };

  const handleBulkRestore = () => {
      const ids = Array.from(selectedIds);
      ids.forEach(id => restoreNote(id));
      setSelectionMode(false);
  };

  const handleBulkPin = () => {
      const ids = Array.from(selectedIds);
      const allPinned = ids.every(id => notes.find(n => n.id === id)?.isPinned);
      
      ids.forEach(id => {
          const note = notes.find(n => n.id === id);
          if(note) updateNote({ ...note, isPinned: !allPinned });
      });
      setSelectionMode(false);
  };

  const handleBulkMove = (folderId: string) => {
      const ids = Array.from(selectedIds);
      ids.forEach(id => {
          const note = notes.find(n => n.id === id);
          if (note) updateNote({ ...note, folderId: folderId || undefined });
      });
      setShowMoveMenu(false);
      setSelectionMode(false);
  };

  return (
    <div className="w-full max-w-md md:max-w-4xl min-h-[100dvh] relative flex flex-col">
        {isIncognito && (
            <div className="bg-purple-900 text-white text-xs text-center py-1 font-bold tracking-widest uppercase pt-[env(safe-area-inset-top)]">
                Incognito Mode Active - Data not saved
            </div>
        )}

        {/* Header */}
        <div className="sticky top-0 z-30 pt-[calc(1rem+env(safe-area-inset-top))] px-4 pb-4 pointer-events-none">
          {selectionMode ? (
              // Selection Context Header
              <div className={`pointer-events-auto shadow-md rounded-2xl h-14 flex items-center px-4 transition-all gap-4 animate-slide-in ${styles.header} ${styles.primaryBg} bg-opacity-90`}>
                  <button onClick={() => setSelectionMode(false)} className={`p-2 rounded-full hover:bg-black/10 ${styles.text}`}>
                      <Icon name="x" size={24} />
                  </button>
                  <div className={`flex-1 font-bold text-lg ${styles.text}`}>
                      {selectedIds.size} Selected
                  </div>
                  
                  <button onClick={handleSelectAll} className={`p-2 rounded-full hover:bg-black/10 ${styles.text}`} title="Select All">
                      <Icon name={selectedIds.size === filteredNotes.length ? "checkCircle" : "circle"} size={22} />
                  </button>
              </div>
          ) : (
              // Standard Search Header
              <div className={`pointer-events-auto shadow-md rounded-full h-12 flex items-center px-2 transition-all ${styles.searchBar} ${isIncognito ? 'ring-2 ring-purple-500' : ''}`}>
                <button onClick={onMenuClick} className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full ${styles.iconHover} ${styles.text}`}>
                  <Icon name="menu" size={24} />
                </button>
                <div className="flex-1 flex items-center px-2 min-w-0">
                    <input 
                      type="text" 
                      placeholder={`Search ${viewTitle}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full bg-transparent border-none focus:ring-0 text-base ${styles.searchBarText} ${styles.searchBarPlaceholder}`}
                    />
                </div>

                {!isOnline && (
                    <div className="mr-2 text-gray-400" title="Offline">
                        <Icon name="cloudOff" size={20} />
                    </div>
                )}

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
          )}
        </div>

        {syncSuccess && (
            <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur text-white px-4 py-2 rounded-full text-sm shadow-lg z-30 animate-slide-up flex items-center gap-2">
                <Icon name="check" size={16} className="text-green-400" /> Synced
            </div>
        )}

        <main className="flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] -mt-2">
            {view === 'TRASH' && (
                <div className={`mb-4 py-3 px-4 rounded-xl text-xs text-center font-medium ${theme === 'neo-glass' ? 'bg-white/10 text-white/70 border border-white/10' : (theme === 'dark' || theme === 'vision' ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500')}`}>
                    Items in Trash are permanently deleted after 30 days
                </div>
            )}

            {filteredNotes.length === 0 ? (
                <div className={`flex flex-col items-center justify-center h-[60vh] ${styles.secondaryText}`}>
                    <div className={`p-8 rounded-full mb-6 ${styles.tagBg}`}>
                        <Icon name={searchQuery ? 'search' : 'fileText'} size={64} className="opacity-40" />
                    </div>
                    <p className="font-bold text-lg">{searchQuery ? "No results found" : "No notes here"}</p>
                </div>
            ) : (
                <Virtuoso 
                    useWindowScroll
                    data={rows}
                    className="w-full"
                    itemContent={(index, rowNotes) => (
                        <div 
                            className={`grid gap-4 mb-4 ${
                                numColumns === 1 ? 'grid-cols-1' : (numColumns === 2 ? 'grid-cols-2' : 'grid-cols-3')
                            }`}
                        >
                            {rowNotes.map(note => (
                                <NoteCard 
                                    key={note.id} 
                                    note={note} 
                                    onClick={() => handleNoteInteraction(note)}
                                    onPin={(e) => togglePin(e, note.id)}
                                    onRestore={(e) => { e.stopPropagation(); restoreNote(note.id); }}
                                    onDeleteForever={(e) => { e.stopPropagation(); deleteForever(note.id); }}
                                    isTrashView={!!note.isTrashed}
                                    selectionMode={selectionMode}
                                    isSelected={selectedIds.has(note.id)}
                                    onLongPress={handleLongPress}
                                    className="h-full"
                                />
                            ))}
                        </div>
                    )}
                />
            )}
        </main>

        {/* Bottom Action Bar for Selection Mode */}
        {selectionMode && (
            <div className={`fixed bottom-6 left-4 right-4 z-40 rounded-2xl shadow-2xl p-3 flex items-center justify-around animate-slide-up ${styles.cardBase} ${styles.cardBorder} border`}>
                {view === 'TRASH' ? (
                    <>
                        <button onClick={handleBulkRestore} className={`flex flex-col items-center gap-1 p-2 ${styles.successText}`}>
                            <Icon name="restore" size={24} />
                            <span className="text-[10px] font-medium">Restore</span>
                        </button>
                        <button onClick={handleBulkDelete} className={`flex flex-col items-center gap-1 p-2 ${styles.dangerText}`}>
                            <Icon name="trash" size={24} />
                            <span className="text-[10px] font-medium">Delete</span>
                        </button>
                    </>
                ) : (
                    <>
                         <button onClick={handleBulkDelete} className={`flex flex-col items-center gap-1 p-2 ${styles.dangerText}`}>
                            <Icon name="trash" size={24} />
                            <span className="text-[10px] font-medium">Trash</span>
                        </button>
                        <button onClick={() => setShowMoveMenu(true)} className={`flex flex-col items-center gap-1 p-2 ${styles.text}`}>
                            <Icon name="folder" size={24} />
                            <span className="text-[10px] font-medium">Move</span>
                        </button>
                        <button onClick={handleBulkPin} className={`flex flex-col items-center gap-1 p-2 ${styles.text}`}>
                            <Icon name="pin" size={24} />
                            <span className="text-[10px] font-medium">Pin</span>
                        </button>
                    </>
                )}
            </div>
        )}

        {/* Move to Folder Modal */}
        {showMoveMenu && (
             <div className={`fixed inset-0 z-50 flex items-center justify-center ${styles.modalOverlay} p-6 animate-slide-in`} onClick={() => setShowMoveMenu(false)}>
                 <div className={`w-full max-w-sm rounded-2xl p-4 shadow-xl border ${styles.cardBase} ${styles.cardBorder}`} onClick={e => e.stopPropagation()}>
                     <h3 className={`font-bold mb-4 px-2 ${styles.text}`}>Move to Folder</h3>
                     <div className="max-h-[60vh] overflow-y-auto space-y-2">
                         <button onClick={() => handleBulkMove("")} className={`w-full flex items-center gap-3 p-3 rounded-xl border ${styles.buttonSecondary} border-transparent`}>
                             <Icon name="folder" size={20} className={styles.secondaryText} />
                             <span className={styles.text}>All Notes (Remove Folder)</span>
                         </button>
                         {folders.map(f => (
                             <button key={f.id} onClick={() => handleBulkMove(f.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl border ${styles.buttonSecondary} border-transparent`}>
                                 <Icon name="folder" size={20} className={styles.primaryText} />
                                 <span className={styles.text}>{f.name}</span>
                             </button>
                         ))}
                     </div>
                 </div>
             </div>
        )}
    </div>
  );
};