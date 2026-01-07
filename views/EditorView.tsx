import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Icon } from '../components/Icon';
import { Note, EncryptedData, Folder } from '../types';
import { SecurityService } from '../services/SecurityService';
import { useTheme, NOTE_COLORS } from '../contexts/ThemeContext';

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
  
  const [isDecrypted, setIsDecrypted] = useState(!note.encryptedData);
  const [decryptionError, setDecryptionError] = useState(false);

  const [tags, setTags] = useState<string[]>(note.tags || []);
  const [color, setColor] = useState(note.color || 'default');
  const [folderId, setFolderId] = useState(note.folderId || '');
  const [location, setLocation] = useState(note.location);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newTag, setNewTag] = useState('');
  
  const saveTimeoutRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // We use a ref for handleSave to avoid stale closures in TipTap's onUpdate callback
  // which is bound only once on mount.
  const handleSaveRef = useRef<(isAutoSave?: boolean) => Promise<void>>(async () => {});

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder: 'Start typing...',
        emptyEditorClass: 'is-editor-empty',
      })
    ],
    content: note.content,
    editable: isEditing,
    editorProps: {
      attributes: {
        class: `w-full min-h-[50vh] text-lg leading-relaxed outline-none prose max-w-none ${theme === 'dark' || theme === 'neo-glass' || theme === 'vision' ? 'prose-invert' : ''}`,
      },
    },
    onUpdate: () => {
       if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
       // Always call the current version of handleSave via ref
       saveTimeoutRef.current = setTimeout(() => handleSaveRef.current(true), 1000);
    }
  });

  // Sync editing state
  useEffect(() => {
    editor?.setEditable(isEditing);
  }, [isEditing, editor]);

  // Handle Decryption
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
           editor?.commands.setContent(payload.content);
           setIsDecrypted(true);
           setDecryptionError(false);
        } catch (e) {
           console.error("Decryption failed", e);
           setDecryptionError(true);
        }
      } else {
        setIsDecrypted(true);
        setDecryptionError(false);
        if (editor && editor.isEmpty && note.content) {
            editor.commands.setContent(note.content);
        }
      }
    };
    decryptContent();
  }, [note.encryptedData, note.id, activeNoteKey, editor]);

  const handleSave = useCallback(async (isAutoSave = false) => {
    if (!editor) return;

    // Prevent recursive or redundant saves if nothing significant changed
    if (isAutoSave && !isDecrypted) return;

    try {
        const contentHtml = editor.getHTML();
        const plainText = editor.getText();

        let updatedNote: Note = {
            ...note,
            title,
            content: contentHtml,
            plainTextPreview: plainText,
            updatedAt: Date.now(),
            isSynced: false,
            tags,
            color,
            folderId: folderId || undefined,
            location: location
        };

        if (updatedNote.isLocked && activeNoteKey) {
            const payload = JSON.stringify({ title, content: contentHtml });
            const encrypted = await SecurityService.encrypt(payload, activeNoteKey);
            updatedNote.encryptedData = JSON.stringify(encrypted);
            updatedNote.content = ""; 
            updatedNote.plainTextPreview = "";
        } else if (!updatedNote.isLocked) {
            updatedNote.encryptedData = undefined;
            updatedNote.lockMode = undefined;
            updatedNote.security = undefined;
        }

        onSave(updatedNote);
    } catch (e) {
        console.error("Error during save operation:", e);
    }
  }, [note, title, editor, tags, color, folderId, location, onSave, activeNoteKey, isDecrypted]);

  // Keep ref updated
  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  // Auto-save on metadata changes (Title, Color, etc.)
  useEffect(() => {
    if (!isDecrypted) return;
    
    // Check if meaningful metadata changed to avoid loops
    if (
        title === note.title && 
        JSON.stringify(tags) === JSON.stringify(note.tags) && 
        color === note.color && 
        folderId === (note.folderId || '') && 
        location === note.location
    ) {
        return;
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => handleSave(true), 1000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [title, tags, color, folderId, location, handleSave, isDecrypted, note]);


  const handleAddTag = () => {
      if(newTag.trim() && !tags.includes(newTag.trim())) {
          setTags([...tags, newTag.trim()]);
          setNewTag('');
      }
  };
  
  const removeTag = (tToRemove: string) => {
      setTags(tags.filter(t => t !== tToRemove));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && editor) {
          const reader = new FileReader();
          reader.onload = (event) => {
              const base64 = event.target?.result as string;
              if (base64) {
                  editor.chain().focus().setImage({ src: base64 }).run();
              }
          };
          reader.readAsDataURL(file);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
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
                    <label className={`text-xs font-semibold mb-2 block ${styles.secondaryText}`}>Color</label>
                    <div className="flex flex-wrap gap-2">
                        {Object.keys(NOTE_COLORS).map(c => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-8 h-8 rounded-full border ${c === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''} ${NOTE_COLORS[c].classic.split(' ')[0]}`}
                            />
                        ))}
                    </div>
                </div>

                <div className="mb-4">
                    <label className={`text-xs font-semibold mb-2 block ${styles.secondaryText}`}>Folder</label>
                    <select 
                        value={folderId} 
                        onChange={(e) => setFolderId(e.target.value)}
                        className={`w-full p-2 rounded-lg text-sm outline-none ${styles.input}`}
                    >
                        <option value="">No Folder</option>
                        {folders.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                    </select>
                </div>

                <div className="mb-4">
                    <label className={`text-xs font-semibold mb-2 block ${styles.secondaryText}`}>Tags</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {tags.map(t => (
                            <span key={t} className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${styles.tagBg} ${styles.tagText}`}>
                                {t}
                                <span onClick={() => removeTag(t)} className="cursor-pointer font-bold">&times;</span>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            placeholder="Add tag"
                            className={`flex-1 p-2 rounded-lg text-sm outline-none ${styles.input}`}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                        />
                        <button onClick={handleAddTag} className={`p-2 rounded-lg ${styles.buttonSecondary}`}>
                            <Icon name="plus" size={16} />
                        </button>
                    </div>
                </div>

                <div className="mb-4">
                    <button onClick={handleAddLocation} className={`w-full flex items-center justify-between p-2 rounded-lg text-sm ${styles.buttonSecondary}`}>
                        <span className="flex items-center gap-2"><Icon name="mapPin" size={16} /> {location ? "Update Location" : "Add Location"}</span>
                        {location && <Icon name="check" size={14} className={styles.successText} />}
                    </button>
                </div>

                <button 
                    onClick={() => setShowDeleteConfirm(true)} 
                    className={`w-full flex items-center gap-2 p-2 rounded-lg text-sm ${styles.dangerText} hover:bg-red-500/10`}
                >
                    <Icon name="trash" size={16} /> Delete Note
                </button>
            </div>
            </>
        )}

        {/* Main Editor Area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 pb-[calc(20rem+env(safe-area-inset-bottom))]">
             <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                readOnly={!isEditing}
                className={`w-full text-3xl font-bold mb-4 bg-transparent border-none outline-none placeholder-gray-400 ${styles.text}`}
            />
            
            {/* Editor Toolbar - Only visible when editing */}
            {isEditing && (
                 <div className={`flex gap-4 mb-4 overflow-x-auto pb-2 scrollbar-hide ${styles.secondaryText}`}>
                    <button onClick={() => editor?.chain().focus().toggleBold().run()} className={editor?.isActive('bold') ? styles.primaryText : ''}><Icon name="bold" size={20} /></button>
                    <button onClick={() => editor?.chain().focus().toggleItalic().run()} className={editor?.isActive('italic') ? styles.primaryText : ''}><Icon name="italic" size={20} /></button>
                    <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className={editor?.isActive('bulletList') ? styles.primaryText : ''}><Icon name="list" size={20} /></button>
                    <button onClick={() => fileInputRef.current?.click()}><Icon name="image" size={20} /></button>
                 </div>
            )}

            <EditorContent editor={editor} />
            
            {/* Metadata Footer */}
            <div className={`mt-12 pt-8 border-t ${styles.divider} ${styles.secondaryText} text-xs space-y-2`}>
                 <div className="flex items-center gap-2">
                     <Icon name="clock" size={12} />
                     <span>Created {new Date(note.createdAt).toLocaleString()}</span>
                 </div>
                 {location && (
                     <div className="flex items-center gap-2">
                         <Icon name="mapPin" size={12} />
                         <span>Location attached</span>
                     </div>
                 )}
            </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
             <div className={`fixed inset-0 z-50 flex items-center justify-center ${styles.modalOverlay} p-4`}>
                 <div className={`w-full max-w-xs p-6 rounded-2xl shadow-xl ${styles.cardBase} ${styles.cardBorder} border`}>
                     <h3 className={`text-lg font-bold mb-2 ${styles.text}`}>Delete Note?</h3>
                     <p className={`text-sm mb-6 ${styles.secondaryText}`}>This note will be moved to trash.</p>
                     <div className="flex gap-3">
                         <button onClick={() => setShowDeleteConfirm(false)} className={`flex-1 py-2 rounded-lg font-medium ${styles.buttonSecondary}`}>Cancel</button>
                         <button onClick={() => { onDelete(note.id); }} className={`flex-1 py-2 rounded-lg font-medium ${styles.dangerBg} ${styles.dangerText}`}>Delete</button>
                     </div>
                 </div>
             </div>
        )}

      </div>
    </div>
  );
};