import React, { useState, useMemo, useEffect } from 'react';
import { useNotes } from '../contexts/NotesContext';
import { useTheme } from '../contexts/ThemeContext';
import { NoteCard } from '../components/NoteCard';
import { Icon } from '../components/Icon';
import { BottomSheet } from '../components/BottomSheet';
import { Note, NoteMetadata, ViewState } from '../types';
import { Virtuoso } from 'react-virtuoso';

interface Props {
  view: ViewState;
  currentFolderId: string | null;
  onNoteClick: (note: NoteMetadata) => void;
  onMenuClick: () => void;
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  selectionMode: boolean;
  setSelectionMode: (v: boolean) => void;
}

type FilterType = 'ALL' | 'FAVORITES' | 'LOCKED' | 'MEDIA' | 'AUDIO';

export const NoteListView: React.FC<Props> = ({ 
    view, currentFolderId, onNoteClick, onMenuClick, 
    searchQuery, setSearchQuery, selectionMode, setSelectionMode 
}) => {
  const { notes, folders, isIncognito, deleteNote, restoreNote, deleteForever, deleteNotesForever, updateNote, searchNotes } = useNotes();
  const { theme, styles } = useTheme();
  
  // UI States
  const [layoutMode, setLayoutMode] = useState<'GRID' | 'LIST'>('GRID');
  const [sortBy, setSortBy] = useState<'UPDATED' | 'CREATED' | 'TITLE'>('UPDATED');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Search State
  const [contentSearchResults, setContentSearchResults] = useState<Set<string> | null>(null);

  // Greeting Logic
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const triggerHaptic = (duration = 10) => {
    if (navigator.vibrate) navigator.vibrate(duration);
  };

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
          setShowDeleteConfirm(false);
      }
  }, [selectionMode]);

  // Handle Deep Search via StorageService
  useEffect(() => {
      let isActive = true;
      if (!searchQuery) {
          setContentSearchResults(null);
          return;
      }

      if (isIncognito) {
          // In-memory search for incognito (Notes are available in memory)
          const results = notes.filter(n => {
              // Incognito notes in 'notes' array are actually full Note objects
              const content = (n as any).content || ""; 
              // Simple heuristic: search content string (contains HTML but better than nothing)
              return content.toLowerCase().includes(searchQuery.toLowerCase());
          }).map(n => n.id);
          setContentSearchResults(new Set(results));
      } else {
          // Storage search (Deep Search)
          const doSearch = async () => {
              const ids = await searchNotes(searchQuery);
              if (isActive) setContentSearchResults(new Set(ids));
          };
          // Debounce search
          const timer = setTimeout(doSearch, 300);
          return () => { isActive = false; clearTimeout(timer); };
      }
  }, [searchQuery, isIncognito, notes, searchNotes]);


  let viewTitle = isIncognito ? "Incognito" : "Notes";
  if (view === 'TRASH') viewTitle = "Trash";
  if (view === 'FOLDER') {
      const folder = folders.find(f => f.id === currentFolderId);
      viewTitle = folder ? folder.name : "Folder";
  }

  // Raw Filtered Notes (Before Sorting/Splitting)
  const rawFilteredNotes = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    
    let filtered = notes.filter(n => {
        // 1. Check Metadata (Title/Preview)
        const matchesMeta = n.title.toLowerCase().includes(lowerQuery) || n.plainTextPreview.toLowerCase().includes(lowerQuery);
        
        // 2. Check Content (Async Results)
        // If contentSearchResults is null (loading/empty), matchesContent is false
        const matchesContent = contentSearchResults ? contentSearchResults.has(n.id) : false;
        
        // 3. Special Case: Encrypted notes
        // If query is empty, show everything. If query exists, do not show encrypted notes unless title matches explicitly
        if (n.isEncrypted && lowerQuery === '') return true; 

        // 4. Combined Result
        if (searchQuery && !matchesMeta && !matchesContent) return false;
        
        return true;
    });

    // Filter by Filter Chips
    if (activeFilter !== 'ALL') {
        if (activeFilter === 'FAVORITES') filtered = filtered.filter(n => n.isPinned);
        if (activeFilter === 'LOCKED') filtered = filtered.filter(n => n.isLocked || n.isEncrypted);
        if (activeFilter === 'MEDIA') filtered = filtered.filter(n => n.hasImage);
        if (activeFilter === 'AUDIO') filtered = filtered.filter(n => n.hasAudio);
    }

    if (view === 'TRASH') {
        filtered = filtered.filter(n => n.isTrashed);
    } else {
        filtered = filtered.filter(n => !n.isTrashed);
        if (view === 'FOLDER' && currentFolderId) {
            filtered = filtered.filter(n => n.folderId === currentFolderId);
        }
    }
    return filtered;
  }, [notes, searchQuery, view, currentFolderId, activeFilter, contentSearchResults]);

  // Sorting Function
  const sortNotes = (n: NoteMetadata[]) => {
      return [...n].sort((a, b) => {
        switch(sortBy) {
            case 'TITLE': return a.title.localeCompare(b.title);
            case 'CREATED': return b.createdAt - a.createdAt;
            case 'UPDATED': default: return b.updatedAt - a.updatedAt;
        }
      });
  };

  // Split Logic (Pinned vs Others)
  const { pinnedNotes, otherNotes, showPinnedSection } = useMemo(() => {
      const shouldSplit = view !== 'TRASH' && activeFilter === 'ALL' && sortBy === 'UPDATED';
      
      if (shouldSplit) {
          const pinned = sortNotes(rawFilteredNotes.filter(n => n.isPinned));
          const others = sortNotes(rawFilteredNotes.filter(n => !n.isPinned));
          return { 
              pinnedNotes: pinned, 
              otherNotes: others, 
              showPinnedSection: pinned.length > 0 && others.length > 0 
          };
      }
      
      return { 
          pinnedNotes: [], 
          otherNotes: sortNotes(rawFilteredNotes), 
          showPinnedSection: false 
      };
  }, [rawFilteredNotes, view, activeFilter, sortBy]);


  // Helper to chunk data for grid
  const chunkData = (data: NoteMetadata[]) => {
      const chunks = [];
      for (let i = 0; i < data.length; i += numColumns) {
          chunks.push(data.slice(i, i + numColumns));
      }
      return chunks;
  };

  const rows = useMemo(() => {
      if (showPinnedSection) {
          return { pinned: chunkData(pinnedNotes), others: chunkData(otherNotes) };
      }
      return { pinned: [], others: chunkData(otherNotes) };
  }, [pinnedNotes, otherNotes, showPinnedSection, numColumns]);


  const togglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    triggerHaptic(10);
    const note = notes.find(n => n.id === id);
    if(note) updateNote({ ...note, isPinned: !note.isPinned });
  };

  const handleLongPress = (id: string) => {
      if (!selectionMode) {
          triggerHaptic(50);
          setSelectionMode(true);
          setSelectedIds(new Set([id]));
      }
  };

  const handleNoteInteraction = (note: NoteMetadata) => {
      if (selectionMode) {
          triggerHaptic(10);
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
      if (selectedIds.size === rawFilteredNotes.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(rawFilteredNotes.map(n => n.id)));
      }
  };

  // Bulk Actions
  const handleBulkDelete = () => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;
      triggerHaptic(20);

      if (view === 'TRASH') {
          // Open custom confirmation instead of window.confirm
          setShowDeleteConfirm(true);
      } else {
          ids.forEach(id => deleteNote(id));
          setSelectionMode(false);
      }
  };

  const executePermanentDelete = () => {
      const ids = Array.from(selectedIds);
      console.log('Executing permanent delete for', ids);
      deleteNotesForever(ids);
      setShowDeleteConfirm(false);
      setSelectionMode(false);
      triggerHaptic(20);
  };

  const handleBulkRestore = () => {
      triggerHaptic(20);
      const ids = Array.from(selectedIds);
      ids.forEach(id => restoreNote(id));
      setSelectionMode(false);
  };

  const handleBulkPin = () => {
      triggerHaptic(20);
      const ids = Array.from(selectedIds);
      const allPinned = ids.every(id => notes.find(n => n.id === id)?.isPinned);
      
      ids.forEach(id => {
          const note = notes.find(n => n.id === id);
          if(note) updateNote({ ...note, isPinned: !allPinned });
      });
      setSelectionMode(false);
  };

  const handleBulkMove = (folderId: string) => {
      triggerHaptic(20);
      const ids = Array.from(selectedIds);
      ids.forEach(id => {
          const note = notes.find(n => n.id === id);
          if (note) updateNote({ ...note, folderId: folderId || undefined });
      });
      setShowMoveMenu(false);
      setSelectionMode(false);
  };

  const FilterChip = ({ type, label, icon }: { type: FilterType, label: string, icon: any }) => (
      <button 
        onClick={() => { setActiveFilter(type); triggerHaptic(5); }} 
        className={`
            flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all duration-200 border
            ${activeFilter === type 
                ? (theme === 'vision' ? 'bg-[#2F6BFF] border-[#2F6BFF] text-white shadow-lg shadow-blue-500/20' : `${styles.fab} border-transparent`)
                : `${styles.buttonSecondary} border-transparent hover:bg-gray-200 dark:hover:bg-gray-700`
            }
        `}
      >
          {icon && <Icon name={icon} size={14} fill={activeFilter === type} />}
          {label}
      </button>
  );

  return (
    <div className="w-full max-w-md md:max-w-4xl min-h-[100dvh] relative flex flex-col">
        {isIncognito && (
            <div className="bg-purple-900 text-white text-xs text-center py-1 font-bold tracking-widest uppercase pt-[env(safe-area-inset-top)] z-50">
                Incognito Mode Active
            </div>
        )}

        {/* --- Modern Header Section --- */}
        <header className={`pt-[calc(1.5rem+env(safe-area-inset-top))] px-5 pb-2 flex flex-col gap-5 z-20`}>
             <div className="flex justify-between items-start">
                 <div>
                     <p className={`text-sm font-medium opacity-60 uppercase tracking-wide mb-1 ${styles.secondaryText}`}>
                         {greeting},
                     </p>
                     <h1 className={`text-3xl font-bold leading-tight ${styles.text}`}>
                         CloudPad
                     </h1>
                 </div>
                 <button onClick={onMenuClick} className={`relative w-12 h-12 rounded-full flex items-center justify-center overflow-hidden border-2 transition-all active:scale-95 shadow-sm ${theme === 'neo-glass' ? 'border-white/20 bg-white/10' : `border-white dark:border-gray-700 bg-gray-100 dark:bg-gray-800`}`}>
                    <Icon name="user" size={24} className={styles.secondaryText} />
                 </button>
             </div>

             {/* Search Bar */}
             <div className="flex gap-3">
                 <div className={`flex-1 h-14 rounded-2xl flex items-center px-4 transition-all shadow-sm ${theme === 'neo-glass' ? 'bg-black/20 border border-white/10' : `${styles.cardBase} ${styles.cardBorder} border`}`}>
                    <Icon name="search" size={20} className={styles.secondaryText} />
                    <input 
                      type="text" 
                      placeholder={`Search ${viewTitle}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full bg-transparent border-none focus:ring-0 text-base px-3 h-full ${styles.text} placeholder:text-gray-400`}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className={styles.secondaryText}>
                            <Icon name="x" size={18} />
                        </button>
                    )}
                 </div>
                 <button 
                    onClick={() => { setIsSortMenuOpen(true); triggerHaptic(10); }}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-all active:scale-95 ${theme === 'neo-glass' ? 'bg-white/10 border border-white/10' : `${styles.cardBase} ${styles.cardBorder} border`}`}
                 >
                     <Icon name="sort" size={22} className={styles.text} />
                 </button>
             </div>

             {/* Horizontal Filter Chips */}
             {view === 'LIST' && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mask-linear-fade-right -mx-5 px-5">
                    <FilterChip type="ALL" label="All" icon={null} />
                    <FilterChip type="FAVORITES" label="Favorites" icon="star" />
                    <FilterChip type="LOCKED" label="Locked" icon="lock" />
                    <FilterChip type="MEDIA" label="Media" icon="image" />
                    <FilterChip type="AUDIO" label="Audio" icon="mic" />
                </div>
             )}
        </header>
        
        {/* --- Main Content --- */}
        <main className="flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] mt-2">
            {view === 'TRASH' && (
                <div className={`mb-6 py-3 px-4 rounded-xl text-xs text-center font-medium ${theme === 'neo-glass' ? 'bg-white/10 text-white/70 border border-white/10' : (theme === 'dark' || theme === 'vision' ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500')}`}>
                    Trash is emptied after 30 days.
                </div>
            )}

            {view === 'FOLDER' && (
                 <div className="flex items-center gap-2 mb-4 opacity-60">
                     <Icon name="folder" size={16} className={styles.text} />
                     <span className={`text-sm font-medium ${styles.text}`}>{viewTitle}</span>
                 </div>
            )}

            {rawFilteredNotes.length === 0 ? (
                <div className={`flex flex-col items-center justify-center pt-20 ${styles.secondaryText}`}>
                    <div className={`p-8 rounded-[2rem] mb-6 ${theme === 'neo-glass' ? 'bg-white/5' : 'bg-gray-100 dark:bg-gray-800'}`}>
                        <Icon name={searchQuery ? 'search' : 'fileText'} size={48} className="opacity-40" />
                    </div>
                    <p className="font-bold text-lg">{searchQuery ? "No results found" : "No notes yet"}</p>
                    <p className="text-xs opacity-60 mt-2">{searchQuery ? "Try a different keyword" : "Tap + to create one"}</p>
                </div>
            ) : (
                <>
                {showPinnedSection && (
                    <div className="mb-8 animate-slide-in">
                        <div className={`text-xs font-bold uppercase tracking-wider mb-3 px-1 opacity-50 ${styles.text}`}>Pinned</div>
                        <div className={`grid gap-3 ${numColumns === 1 ? 'grid-cols-1' : (numColumns === 2 ? 'grid-cols-2' : 'grid-cols-3')}`}>
                            {pinnedNotes.map(note => (
                                <NoteCard 
                                    key={note.id} 
                                    note={note} 
                                    onClick={() => handleNoteInteraction(note)}
                                    onPin={(e) => togglePin(e, note.id)}
                                    isTrashView={false}
                                    selectionMode={selectionMode}
                                    isSelected={selectedIds.has(note.id)}
                                    onLongPress={handleLongPress}
                                    className="h-full"
                                />
                            ))}
                        </div>
                         <div className={`text-xs font-bold uppercase tracking-wider mt-6 mb-3 px-1 opacity-50 ${styles.text}`}>Others</div>
                    </div>
                )}
                
                {/* The Main List (Others or All) */}
                {rows.others.length > 0 ? (
                    <Virtuoso 
                        useWindowScroll
                        data={rows.others}
                        className="w-full"
                        itemContent={(index, rowNotes) => (
                            <div 
                                className={`grid gap-3 mb-3 ${
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
                ) : (
                    !showPinnedSection && (
                        <div className={`text-center py-10 opacity-50 ${styles.text}`}>No other notes</div>
                    )
                )}
                </>
            )}
        </main>

        {/* --- Floating Selection Bar --- */}
        {selectionMode && (
            <div className="fixed bottom-6 left-4 right-4 z-40 animate-slide-up">
                 <div className={`rounded-full shadow-2xl p-2 px-6 flex items-center justify-between backdrop-blur-md ${theme === 'neo-glass' ? 'bg-black/60 border border-white/20' : 'bg-white/90 dark:bg-[#2c2c2c]/90 border border-gray-200 dark:border-gray-700'}`}>
                    
                    <button onClick={() => setSelectionMode(false)} className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors`}>
                        <Icon name="x" size={24} className={styles.text} />
                    </button>
                    
                    <span className={`text-sm font-bold ${styles.text}`}>{selectedIds.size} Selected</span>
                    
                    <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>

                    <div className="flex items-center gap-1">
                        {view === 'TRASH' ? (
                            <>
                                <button onClick={handleBulkRestore} className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 ${styles.successText}`} title="Restore">
                                    <Icon name="restore" size={22} />
                                </button>
                                <button onClick={handleBulkDelete} className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 ${styles.dangerText}`} title="Delete">
                                    <Icon name="trash" size={22} />
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setShowMoveMenu(true)} className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 ${styles.text}`} title="Move">
                                    <Icon name="folder" size={22} />
                                </button>
                                <button onClick={handleBulkPin} className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 ${styles.text}`} title="Pin">
                                    <Icon name="pin" size={22} />
                                </button>
                                <button onClick={handleBulkDelete} className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 ${styles.dangerText}`} title="Trash">
                                    <Icon name="trash" size={22} />
                                </button>
                            </>
                        )}
                        <button onClick={handleSelectAll} className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 ${styles.text} ml-2`} title="Select All">
                           <Icon name={selectedIds.size === rawFilteredNotes.length ? "checkCircle" : "circle"} size={20} />
                        </button>
                    </div>
                 </div>
            </div>
        )}

        {/* --- Bottom Sheets --- */}

        {/* Sort Menu */}
        <BottomSheet isOpen={isSortMenuOpen} onClose={() => setIsSortMenuOpen(false)} title="Sort & Layout">
            <div className="space-y-1">
                 <button onClick={() => { setSortBy('UPDATED'); setIsSortMenuOpen(false); }} className={`w-full flex items-center justify-between p-4 rounded-xl ${sortBy === 'UPDATED' ? styles.activeItem : styles.iconHover}`}>
                     <span className={styles.text}>Last Modified</span>
                     {sortBy === 'UPDATED' && <Icon name="check" size={20} className={styles.primaryText} />}
                 </button>
                 <button onClick={() => { setSortBy('CREATED'); setIsSortMenuOpen(false); }} className={`w-full flex items-center justify-between p-4 rounded-xl ${sortBy === 'CREATED' ? styles.activeItem : styles.iconHover}`}>
                     <span className={styles.text}>Date Created</span>
                     {sortBy === 'CREATED' && <Icon name="check" size={20} className={styles.primaryText} />}
                 </button>
                 <button onClick={() => { setSortBy('TITLE'); setIsSortMenuOpen(false); }} className={`w-full flex items-center justify-between p-4 rounded-xl ${sortBy === 'TITLE' ? styles.activeItem : styles.iconHover}`}>
                     <span className={styles.text}>Title (A-Z)</span>
                     {sortBy === 'TITLE' && <Icon name="check" size={20} className={styles.primaryText} />}
                 </button>
                 
                 <div className={`h-px my-2 ${styles.divider}`}></div>
                 
                 <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                     <button onClick={() => setLayoutMode('GRID')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${layoutMode === 'GRID' ? `${styles.cardBase} shadow-sm ${styles.text}` : `${styles.secondaryText}`}`}>Grid</button>
                     <button onClick={() => setLayoutMode('LIST')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${layoutMode === 'LIST' ? `${styles.cardBase} shadow-sm ${styles.text}` : `${styles.secondaryText}`}`}>List</button>
                 </div>
            </div>
        </BottomSheet>

        {/* Move Menu */}
        <BottomSheet isOpen={showMoveMenu} onClose={() => setShowMoveMenu(false)} title="Move to Folder">
            <div className="space-y-2">
                <button onClick={() => handleBulkMove("")} className={`w-full flex items-center gap-3 p-4 rounded-xl border ${styles.buttonSecondary} border-transparent`}>
                    <div className={`p-2 rounded-full ${styles.tagBg}`}><Icon name="folder" size={20} className={styles.secondaryText} /></div>
                    <span className={styles.text}>All Notes (Remove Folder)</span>
                </button>
                {folders.map(f => (
                    <button key={f.id} onClick={() => handleBulkMove(f.id)} className={`w-full flex items-center gap-3 p-4 rounded-xl border ${styles.buttonSecondary} border-transparent`}>
                        <div className={`p-2 rounded-full ${styles.primaryBg}`}><Icon name="folder" size={20} className={styles.primaryText} /></div>
                        <span className={styles.text}>{f.name}</span>
                    </button>
                ))}
            </div>
        </BottomSheet>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
            <div className={`fixed inset-0 z-[60] flex items-center justify-center ${styles.modalOverlay} p-4 animate-slide-in`} onClick={() => setShowDeleteConfirm(false)}>
                <div className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl ${styles.cardBase} ${styles.cardBorder} border transform scale-100 transition-all`} onClick={e => e.stopPropagation()}>
                    <h3 className={`text-xl font-bold mb-2 ${styles.text}`}>Delete Forever?</h3>
                    <p className={`text-sm opacity-70 mb-6 ${styles.secondaryText}`}>
                        Are you sure you want to permanently delete {selectedIds.size} notes? This action cannot be undone.
                    </p>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setShowDeleteConfirm(false)}
                            className={`flex-1 py-3 rounded-xl font-medium ${styles.buttonSecondary}`}
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={executePermanentDelete}
                            className={`flex-1 py-3 rounded-xl font-medium bg-red-500 hover:bg-red-600 text-white shadow-lg active:scale-95 transition-all`}
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
