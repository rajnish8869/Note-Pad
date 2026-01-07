import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from '../components/Icon';
import { Note, EncryptedData, Folder } from '../types';
import { SecurityService } from '../services/SecurityService';
import { useTheme, NOTE_COLORS } from '../contexts/ThemeContext';
import { useSecurity } from '../contexts/SecurityContext';

interface EditorViewProps { 
  note: Note; 
  folders: Folder[];
  initialEditMode: boolean;
  activeNoteKey: CryptoKey | null;
  onSave: (note: Note) => void; 
  onBack: () => void;
  onDelete: (id: string) => void;
  onLockToggle: () => void;
}

export const EditorView: React.FC<EditorViewProps> = ({ 
    note, folders, initialEditMode, activeNoteKey, onSave, onBack, onDelete, onLockToggle 
}) => {
  const { theme, styles } = useTheme();
  
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  
  const [isDecrypted, setIsDecrypted] = useState(!note.encryptedData);
  const [decryptionError, setDecryptionError] = useState(false);

  const [tags, setTags] = useState<string[]>(note.tags || []);
  const [color, setColor] = useState(note.color || 'default');
  const [folderId, setFolderId] = useState(note.folderId || '');
  const [location, setLocation] = useState(note.location);
  
  const [history, setHistory] = useState<string[]>([note.content]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newTag, setNewTag] = useState('');
  
  // Media States
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
     if (note.isLocked !== undefined && note.isLocked !== (title === '' && content === '')) {
     }
  }, [note.isLocked, note.lockMode]);

  useEffect(() => {
    const decryptContent = async () => {
      if (note.encryptedData) {
        if (!activeNoteKey) {
           setDecryptionError(true);
           return;
        }
        try {
           const encryptedData: EncryptedData = JSON.parse(note.encryptedData);
           const jsonString = await SecurityService.decrypt(encryptedData, activeNoteKey);
           const payload = JSON.parse(jsonString);
           setTitle(payload.title);
           setContent(payload.content);
           setIsDecrypted(true);
           setDecryptionError(false);
        } catch (e) {
           console.error("Decryption failed", e);
           setDecryptionError(true);
        }
      } else {
        setIsDecrypted(true);
        setDecryptionError(false);
      }
    };
    decryptContent();
  }, [note.encryptedData, note.id, activeNoteKey]);

  const handleSave = useCallback(async () => {
    let plainText = note.plainTextPreview;
    if (isEditing && contentRef.current) {
         plainText = contentRef.current.innerText;
    } else if (!isEditing) {
        if (!note.plainTextPreview && content) {
             const temp = document.createElement("div");
             temp.innerHTML = content;
             plainText = temp.innerText;
        }
    }

    let updatedNote: Note = {
      ...note,
      title,
      content,
      plainTextPreview: plainText,
      updatedAt: Date.now(),
      isSynced: false,
      tags,
      color,
      folderId: folderId || undefined,
      location: location
    };

    if (updatedNote.isLocked && activeNoteKey) {
        try {
            const payload = JSON.stringify({ title, content });
            const encrypted = await SecurityService.encrypt(payload, activeNoteKey);
            updatedNote.encryptedData = JSON.stringify(encrypted);
            updatedNote.content = ""; 
            updatedNote.plainTextPreview = "";
        } catch (e) {
            console.error("Encryption failed on save", e);
            return;
        }
    } else if (!updatedNote.isLocked) {
        updatedNote.encryptedData = undefined;
        updatedNote.lockMode = undefined;
        updatedNote.security = undefined;
        updatedNote.content = content;
        updatedNote.title = title;
    }

    onSave(updatedNote);
  }, [note, title, content, tags, color, folderId, location, onSave, isEditing, activeNoteKey]);

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (!isDecrypted) return; 

    if (title === note.title && content === note.content && JSON.stringify(tags) === JSON.stringify(note.tags) && color === note.color && folderId === (note.folderId || '') && location === note.location) return;

    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [title, content, tags, color, folderId, location, handleSave, isDecrypted]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    if (newContent !== history[historyIndex]) {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newContent);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
        setHistoryIndex(historyIndex - 1);
        setContent(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
        setHistoryIndex(historyIndex + 1);
        setContent(history[historyIndex + 1]);
    }
  };

  const handleAddTag = () => {
      if(newTag.trim() && !tags.includes(newTag.trim())) {
          setTags([...tags, newTag.trim()]);
          setNewTag('');
      }
  };
  
  const removeTag = (tToRemove: string) => {
      setTags(tags.filter(t => t !== tToRemove));
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (contentRef.current) handleContentChange(contentRef.current.innerHTML);
  };

  const insertHtml = (html: string) => {
      if (contentRef.current) {
          contentRef.current.focus();
          document.execCommand('insertHTML', false, html);
          // Insert a line break after media for better editing flow
          document.execCommand('insertHTML', false, '<br>');
          handleContentChange(contentRef.current.innerHTML);
      }
  };

  // --- Media Handlers ---

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
              const base64 = event.target?.result as string;
              if (base64) {
                  const imgHtml = `<img src="${base64}" class="max-w-full rounded-xl my-2 shadow-sm border border-black/5" />`;
                  insertHtml(imgHtml);
              }
          };
          reader.readAsDataURL(file);
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleRecording = async () => {
      if (isRecording) {
          mediaRecorderRef.current?.stop();
          setIsRecording(false);
      } else {
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              mediaRecorderRef.current = new MediaRecorder(stream);
              audioChunksRef.current = [];

              mediaRecorderRef.current.ondataavailable = (event) => {
                  audioChunksRef.current.push(event.data);
              };

              mediaRecorderRef.current.onstop = () => {
                  const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                  const reader = new FileReader();
                  reader.readAsDataURL(audioBlob);
                  reader.onloadend = () => {
                      const base64data = reader.result;
                      const audioHtml = `
                        <div class="my-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center gap-2 border border-black/5">
                            <span class="text-xs font-bold uppercase tracking-wider opacity-50">Voice Note</span>
                            <audio controls src="${base64data}" class="h-8 w-full"></audio>
                        </div>
                      `;
                      insertHtml(audioHtml);
                      stream.getTracks().forEach(track => track.stop());
                  };
              };

              mediaRecorderRef.current.start();
              setIsRecording(true);
          } catch (err) {
              console.error("Mic error:", err);
              alert("Could not access microphone.");
          }
      }
  };

  const handleAddLocation = () => {
      if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
              (position) => {
                  setLocation({
                      lat: position.coords.latitude,
                      lng: position.coords.longitude
                  });
              },
              (err) => {
                  console.error(err);
                  alert("Unable to retrieve location.");
              }
          );
      }
  };

  const handleShare = async () => {
      if (navigator.share) {
          try {
              // Strip HTML for sharing text
              const tempDiv = document.createElement("div");
              tempDiv.innerHTML = content;
              const plainText = tempDiv.innerText;
              
              await navigator.share({
                  title: title || 'CloudPad Note',
                  text: `${title}\n\n${plainText}`,
              });
          } catch (err) {
              console.log('Error sharing:', err);
          }
      } else {
          alert("Web Share API not supported on this device.");
      }
  };

  const noteColorClass = NOTE_COLORS[color][theme];
  const editorBgClass = theme === 'neo-glass' 
    ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 bg-fixed' 
    : noteColorClass.split(' ')[0] + ' min-h-[100dvh]'; 

  if (!isDecrypted && !decryptionError) {
      return (
          <div className={`flex flex-col min-h-[100dvh] items-center justify-center ${editorBgClass}`}>
              <Icon name="shield" size={48} className={`animate-bounce opacity-50 mb-4 ${styles.text}`} />
              <p className={styles.text}>Decrypting secure note...</p>
          </div>
      );
  }

  if (decryptionError) {
      return (
        <div className={`flex flex-col min-h-[100dvh] items-center justify-center ${editorBgClass}`}>
             <Icon name="lock" size={48} className={`${styles.dangerText} mb-4`} />
             <h2 className={`text-xl font-bold ${styles.text}`}>Authentication Required</h2>
             <button onClick={onBack} className={`px-4 py-2 ${styles.buttonSecondary} rounded-lg mt-4`}>Go Back</button>
        </div>
      );
  }

  return (
    <div className={`flex flex-col min-h-[100dvh] transition-colors duration-300 animate-slide-in relative ${editorBgClass}`}>
      <div className={`flex flex-col flex-1 ${theme === 'neo-glass' ? 'bg-white/10 backdrop-blur-3xl' : ''}`}>
        
        {/* Hidden File Input */}
        <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            className="hidden" 
            onChange={handleImageUpload} 
        />

        {/* Toolbar */}
        <div className={`flex items-center justify-between sticky top-0 z-10 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 px-2 md:px-4 ${styles.header} border-b-0 bg-transparent backdrop-blur-sm`}>
            <button onClick={() => { handleSave(); onBack(); }} className={`p-2 rounded-full ${styles.iconHover} ${styles.text}`}>
            <Icon name="arrowLeft" size={24} />
            </button>
            <div className="flex gap-2">
                {!isEditing ? (
                    <button onClick={() => setIsEditing(true)} className={`p-2 rounded-full ${styles.iconHover} ${styles.text}`}>
                        <Icon name="edit" size={20} />
                    </button>
                ) : (
                    <button onClick={() => { handleSave(); setIsEditing(false); }} className={`p-2 rounded-full hover:bg-green-500/20 ${styles.successText}`}>
                        <Icon name="check" size={20} />
                    </button>
                )}

                {isEditing && (
                    <>
                    <button onClick={handleShare} className={`p-2 rounded-full ${styles.iconHover} ${styles.text}`}><Icon name="share" size={20} /></button>
                    </>
                )}
                
                <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-full ${showSettings ? `${styles.primaryBg} ${styles.primaryText}` : `${styles.iconHover} ${styles.text}`}`}>
                    <Icon name="moreVertical" size={20} />
                </button>
            </div>
        </div>

        {/* Settings Dropdown */}
        {showSettings && (
            <>
            <div className={`fixed inset-0 z-10 ${styles.modalOverlay}`} onClick={() => setShowSettings(false)} />
            <div className={`absolute top-16 right-4 w-72 shadow-2xl rounded-xl border z-20 p-4 animate-slide-up ${styles.cardBase} ${styles.cardBorder}`}>
                <h4 className={`text-xs font-semibold mb-3 ${styles.secondaryText}`}>NOTE SETTINGS</h4>
                <button 
                    onClick={() => { setShowSettings(false); handleSave(); onLockToggle(); }}
                    className={`w-full flex items-center gap-2 mb-4 p-2 rounded-lg text-sm ${note.isLocked ? `${styles.dangerBg} ${styles.dangerText}` : `${styles.text} ${styles.iconHover}`}`}
                >
                    <Icon name={note.isLocked ? "unlock" : "lock"} size={16} />
                    {note.isLocked ? "Unlock Note" : "Lock Note"}
                </button>
                <div className="mb-4">
                    <label className={`text-xs block mb-2 ${styles.secondaryText}`}>Background</label>
                    <div className="flex flex-wrap gap-2">
                        {Object.keys(NOTE_COLORS).map(c => (
                            <button key={c} onClick={() => setColor(c)} className={`w-6 h-6 rounded-full border border-black/10 shadow-sm ${NOTE_COLORS[c].classic.split(' ')[0]} ${color === c ? 'ring-2 ring-primary-500' : ''}`} />
                        ))}
                    </div>
                </div>
                <div className="mb-4">
                     <label className={`text-xs block mb-2 ${styles.secondaryText}`}>Tags</label>
                     <div className="flex gap-2 mb-2">
                         <input type="text" value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Add tag..." className={`flex-1 rounded p-1 text-sm outline-none ${styles.input} ${styles.inputText}`} onKeyDown={e => e.key === 'Enter' && handleAddTag()} />
                         <button onClick={handleAddTag} className={`p-1 ${styles.text} ${styles.iconHover}`}><Icon name="plus" size={18} /></button>
                     </div>
                     <div className="flex flex-wrap gap-1">
                         {tags.map(t => (
                             <span key={t} className={`text-xs ${styles.tagBg} ${styles.tagText} px-2 py-1 rounded-full flex items-center gap-1`}>#{t} <button onClick={() => removeTag(t)}>&times;</button></span>
                         ))}
                     </div>
                </div>
                
                {/* Location Display in Settings */}
                <div className="mb-4">
                    <label className={`text-xs block mb-2 ${styles.secondaryText}`}>Location</label>
                    <div className={`flex items-center justify-between p-2 rounded-lg ${styles.input}`}>
                         {location ? (
                             <div className="flex items-center gap-2 text-xs truncate">
                                 <Icon name="mapPin" size={14} className={styles.primaryText} />
                                 <span className={styles.inputText}>{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
                             </div>
                         ) : (
                             <span className={`text-xs italic ${styles.secondaryText}`}>No location tagged</span>
                         )}
                         {location && (
                             <button onClick={() => setLocation(undefined)} className="text-red-500"><Icon name="x" size={14} /></button>
                         )}
                    </div>
                    {!location && (
                        <button onClick={handleAddLocation} className={`w-full mt-2 text-xs flex items-center justify-center gap-1 py-1 rounded border border-dashed ${styles.secondaryText} hover:bg-black/5 dark:hover:bg-white/5`}>
                            <Icon name="mapPin" size={12} /> Add Location
                        </button>
                    )}
                </div>

                <div className="mb-4">
                    <label className={`text-xs block mb-2 ${styles.secondaryText}`}>Folder</label>
                    <select value={folderId} onChange={(e) => setFolderId(e.target.value)} className={`w-full rounded-lg p-2 text-sm outline-none ${styles.input} ${styles.inputText}`}>
                        <option value="">None (All Notes)</option>
                        {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                </div>
                <button onClick={() => setShowDeleteConfirm(true)} className={`w-full flex items-center gap-2 ${styles.dangerText} p-2 ${styles.dangerBg} rounded-lg text-sm`}><Icon name="trash" size={16} /> Move to Trash</button>
            </div>
            </>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-6" onClick={!isEditing ? (e) => e.detail === 3 && setIsEditing(true) : undefined}>
            {isEditing ? (
                <>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className={`w-full text-2xl md:text-3xl font-bold bg-transparent border-none outline-none mb-4 ${styles.text} ${styles.searchBarPlaceholder}`} />
                    <div ref={contentRef} contentEditable onInput={(e) => handleContentChange(e.currentTarget.innerHTML)} className={`w-full min-h-[50vh] text-lg leading-relaxed outline-none empty:before:content-[attr(data-placeholder)] ${styles.text} ${theme === 'neo-glass' ? 'empty:before:text-white/40' : 'empty:before:text-gray-400'}`} data-placeholder="Start typing..." dangerouslySetInnerHTML={{__html: content}} />
                </>
            ) : (
                <>
                    <div className="mb-4">
                        <h1 className={`text-2xl md:text-3xl font-bold break-words ${styles.text}`}>{title || <span className="opacity-50 italic">Untitled</span>}</h1>
                        <div className="flex flex-wrap gap-2 mt-2 items-center">
                            {tags.map(t => <span key={t} className={`text-xs px-2 py-1 rounded-full ${styles.tagBg} ${styles.tagText}`}>#{t}</span>)}
                            {location && (
                                <a 
                                    href={`https://maps.google.com/?q=${location.lat},${location.lng}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className={`text-xs px-2 py-1 rounded-full border flex items-center gap-1 ${styles.cardBorder} ${styles.secondaryText}`}
                                    onClick={e => e.stopPropagation()}
                                >
                                    <Icon name="mapPin" size={10} />
                                    {location.lat.toFixed(2)}, {location.lng.toFixed(2)}
                                </a>
                            )}
                        </div>
                    </div>
                    <div className={`w-full min-h-[50vh] text-lg leading-relaxed break-words prose max-w-none ${theme === 'dark' || theme === 'neo-glass' || theme === 'vision' ? 'prose-invert' : ''} ${styles.text}`} dangerouslySetInnerHTML={{__html: content || "<p class='opacity-50 italic'>No content</p>"}} />
                </>
            )}
        </div>

        {/* Enhanced Editing Toolbar */}
        {isEditing && (
            <div className={`p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex items-center justify-between ${styles.cardBase} border-t ${styles.divider} gap-2 px-4`}>
                <div className="flex gap-1">
                    <button onClick={() => execCmd('bold')} className={`p-2.5 rounded-lg ${styles.iconHover} ${styles.text}`}><Icon name="bold" size={20} /></button>
                    <button onClick={() => execCmd('italic')} className={`p-2.5 rounded-lg ${styles.iconHover} ${styles.text}`}><Icon name="italic" size={20} /></button>
                    <button onClick={() => execCmd('insertUnorderedList')} className={`p-2.5 rounded-lg ${styles.iconHover} ${styles.text}`}><Icon name="list" size={20} /></button>
                </div>
                
                <div className={`h-6 w-px ${styles.divider} bg-gray-300 dark:bg-gray-700 mx-1`} />
                
                <div className="flex gap-1">
                     <button onClick={() => fileInputRef.current?.click()} className={`p-2.5 rounded-lg ${styles.iconHover} ${styles.text}`}>
                        <Icon name="image" size={20} />
                     </button>
                     <button 
                        onClick={toggleRecording} 
                        className={`p-2.5 rounded-lg transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30' : `${styles.iconHover} ${styles.text}`}`}
                     >
                        <Icon name={isRecording ? "stop" : "mic"} size={20} />
                     </button>
                     <button onClick={handleAddLocation} className={`p-2.5 rounded-lg ${styles.iconHover} ${styles.text}`}>
                        <Icon name="mapPin" size={20} />
                     </button>
                </div>
            </div>
        )}
      </div>
      
      {showDeleteConfirm && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center ${styles.modalOverlay} p-4`}>
           <div className={`rounded-xl shadow-xl w-full max-w-sm p-6 border ${styles.cardBase} ${styles.cardBorder}`}>
             <h3 className={`text-lg font-bold mb-2 ${styles.text}`}>Move to Trash?</h3>
             <div className="flex justify-end gap-3 mt-4">
               <button onClick={() => setShowDeleteConfirm(false)} className={`px-4 py-2 rounded-lg font-medium text-sm ${styles.text}`}>Cancel</button>
               <button onClick={() => onDelete(note.id)} className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium text-sm">Trash Note</button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};