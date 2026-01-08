import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import { Node, mergeAttributes } from '@tiptap/core';
import { App as CapacitorApp } from '@capacitor/app';

import { Icon } from '../components/Icon';
import { Note, EncryptedData, Folder } from '../types';
import { SecurityService } from '../services/SecurityService';
import { StorageService } from '../services/StorageService';
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
  initialSearchQuery?: string;
}

const ImageNode = (props: any) => {
  const { node, selected } = props;
  const [src, setSrc] = useState(node.attrs.src);
  const [error, setError] = useState(false);

  useEffect(() => {
     setSrc(node.attrs.src);
     setError(false);
  }, [node.attrs.src]);

  return (
    <NodeViewWrapper className="my-4">
      <div className={`relative rounded-xl overflow-hidden transition-all ${selected ? 'ring-2 ring-blue-500' : ''}`}>
        {error ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-500 text-sm flex items-center gap-2 border border-red-200 dark:border-red-800 rounded-xl select-none">
                <div className="p-2 bg-red-100 dark:bg-red-800 rounded-full">
                    <Icon name="image" size={20} />
                </div>
                <div>
                    <div className="font-bold">Image Load Error</div>
                    <div className="text-xs opacity-70 break-all">{node.attrs['data-filename'] || 'Unknown file'}</div>
                    <div className="text-[10px] opacity-50 break-all">{src ? src.substring(0, 50) + '...' : 'No Source'}</div>
                </div>
            </div>
        ) : (
            <img 
              src={src} 
              alt={node.attrs.alt}
              className="max-w-full h-auto rounded-xl shadow-sm border border-black/5 dark:border-white/5 bg-gray-100 dark:bg-gray-800 min-h-[100px]"
              onError={(e) => {
                  console.error("[Editor] FAILED TO LOAD IMAGE:", src ? src.substring(0, 100) : "null");
                  setError(true);
              }}
              onLoad={() => console.log("[Editor] IMAGE LOADED SUCCESSFULLY")}
            />
        )}
      </div>
    </NodeViewWrapper>
  );
};

const CustomImage = Image.extend({
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      'data-filename': { default: null },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageNode);
  },
});

const AudioExtension = Node.create({
  name: 'audio',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      'data-filename': { default: null },
    }
  },
  parseHTML() {
    return [{ tag: 'audio' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', { class: 'my-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center gap-2 border border-black/5' },
      ['span', { class: 'text-xs font-bold uppercase tracking-wider opacity-50 select-none' }, 'Voice Note'],
      ['audio', mergeAttributes(HTMLAttributes, { controls: true, class: 'h-8 w-full' })]
    ]
  },
});

export const EditorView: React.FC<EditorViewProps> = ({ 
    note, folders, initialEditMode, activeNoteKey, onSave, onBack, onDelete, onLockToggle, initialSearchQuery
}) => {
  const { theme, styles } = useTheme();
  
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [title, setTitle] = useState(note.title);
  
  const [isDecrypted, setIsDecrypted] = useState(!note.encryptedData);
  const [decryptionError, setDecryptionError] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(true);

  const [tags, setTags] = useState<string[]>(note.tags || []);
  const [color, setColor] = useState(note.color || 'default');
  const [folderId, setFolderId] = useState(note.folderId || '');
  const [location, setLocation] = useState(note.location);
  
  const [showSettings, setShowSettings] = useState(false);
  const [newTag, setNewTag] = useState('');
  
  const [isRecording, setIsRecording] = useState(false);
  
  // Search State
  const [showSearch, setShowSearch] = useState(false);
  const [editorSearchTerm, setEditorSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<{from: number, to: number}[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);

  // Dirty State
  const [isDirty, setIsDirty] = useState(false);
  const skipSaveOnUnmount = useRef(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<any>(null);
  const lastSavedEncryptedDataRef = useRef<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      CustomImage.configure({ inline: true, allowBase64: true }),
      Placeholder.configure({ placeholder: 'Start typing...', emptyEditorClass: 'is-editor-empty' }),
      AudioExtension,
      Highlight.configure({ multicolor: true })
    ],
    editable: isEditing,
    onUpdate: () => {
        setIsDirty(true);
    },
    editorProps: {
      attributes: {
        class: `prose max-w-none focus:outline-none ${theme === 'dark' || theme === 'neo-glass' || theme === 'vision' ? 'prose-invert' : ''}`,
      },
    },
  });

  useEffect(() => {
    editor?.setEditable(isEditing);
  }, [editor, isEditing]);

  // --- Search Functions ---
  const performSearch = useCallback((term: string) => {
      if (!editor) return;

      const { from, to } = editor.state.selection;
      
      // Clear all highlights without focusing or scrolling
      editor.commands.setTextSelection({ from: 0, to: editor.state.doc.content.size });
      editor.commands.unsetHighlight();
      editor.commands.setTextSelection({ from, to });

      if (!term.trim()) {
          setSearchResults([]);
          return;
      }

      const { doc } = editor.state;
      const results: {from: number, to: number}[] = [];
      const lowerTerm = term.toLowerCase();

      doc.descendants((node, pos) => {
          if (node.isText && node.text) {
              const lowerText = node.text.toLowerCase();
              let searchPos = 0;
              let foundIndex = 0;
              
              while ((foundIndex = lowerText.indexOf(lowerTerm, searchPos)) !== -1) {
                  const matchFrom = pos + foundIndex;
                  const matchTo = matchFrom + term.length;
                  results.push({ from: matchFrom, to: matchTo });
                  searchPos = foundIndex + 1;
              }
          }
      });

      // Apply Highlights
      // We chain commands to apply marks. 
      // Note: setHighlight applies to selection.
      const chain = editor.chain();
      results.forEach(res => {
          chain.setTextSelection(res).setHighlight();
      });
      chain.setTextSelection({ from, to }); // Restore cursor
      chain.run();

      setSearchResults(results);
      if (results.length > 0) {
          setCurrentResultIndex(0);
          // Only scroll to match if user initiated search, 
          // but for initial load, maybe don't jump if it's annoying? 
          // Requirement: "jump to the occurrence". So we jump.
          setTimeout(() => scrollToMatch(0, results), 50);
      }
  }, [editor]);

  const scrollToMatch = (index: number, resultsOverride?: {from: number, to: number}[]) => {
      const results = resultsOverride || searchResults;
      if (results[index] && editor) {
          editor.chain().setTextSelection(results[index]).scrollIntoView().run();
      }
  };

  const nextMatch = () => {
      if (searchResults.length === 0) return;
      const next = (currentResultIndex + 1) % searchResults.length;
      setCurrentResultIndex(next);
      scrollToMatch(next);
  };

  const prevMatch = () => {
      if (searchResults.length === 0) return;
      const prev = (currentResultIndex - 1 + searchResults.length) % searchResults.length;
      setCurrentResultIndex(prev);
      scrollToMatch(prev);
  };

  const closeSearch = () => {
      setShowSearch(false);
      setEditorSearchTerm("");
      if (editor) {
          const { from, to } = editor.state.selection;
          editor.commands.setTextSelection({ from: 0, to: editor.state.doc.content.size });
          editor.commands.unsetHighlight();
          editor.commands.setTextSelection({ from, to });
      }
      setSearchResults([]);
  };

  const expandMedia = useCallback(async (html: string): Promise<string> => {
      const div = document.createElement('div');
      div.innerHTML = html;
      const processElements = async (elements: NodeListOf<Element>) => {
          for (const el of Array.from(elements)) {
              const src = el.getAttribute('src');
              if (!src) continue;
              const decodedSrc = decodeURIComponent(src);
              const match = decodedSrc.match(/\[\[FILE:([^\]]+)\]\]/);
              if (match) {
                  const filename = match[1];
                  const url = await StorageService.getMediaUrl(filename);
                  if (url) {
                      el.setAttribute('src', url);
                      el.setAttribute('data-filename', filename);
                  }
              }
          }
      };
      await processElements(div.querySelectorAll('img'));
      await processElements(div.querySelectorAll('audio'));
      return div.innerHTML;
  }, []);

  const compressMedia = (html: string): string => {
      const div = document.createElement('div');
      div.innerHTML = html;
      const processElements = (elements: NodeListOf<Element>) => {
        elements.forEach(el => {
            const filename = el.getAttribute('data-filename');
            if (filename) el.setAttribute('src', `[[FILE:${filename}]]`);
        });
      }
      processElements(div.querySelectorAll('img'));
      processElements(div.querySelectorAll('audio'));
      return div.innerHTML;
  };

  useEffect(() => {
    const initContent = async () => {
      if (note.encryptedData && note.encryptedData === lastSavedEncryptedDataRef.current) return;
      setIsLoadingContent(true);
      let loadedContent = note.content;
      let loadedTitle = note.title;
      if (note.encryptedData) {
        if (!activeNoteKey) {
           setDecryptionError(true);
           setIsLoadingContent(false);
           return;
        }
        try {
           const encryptedData: EncryptedData = JSON.parse(note.encryptedData);
           const jsonString = await SecurityService.decrypt(encryptedData, activeNoteKey);
           const payload = JSON.parse(jsonString);
           loadedTitle = payload.title;
           loadedContent = payload.content;
           setIsDecrypted(true);
           setDecryptionError(false);
        } catch (e) {
           console.error("Decryption failed", e);
           setDecryptionError(true);
           setIsLoadingContent(false);
           return;
        }
      } else {
        setIsDecrypted(true);
        setDecryptionError(false);
      }
      const expanded = await expandMedia(loadedContent);
      setTitle(loadedTitle);
      
      if (editor) {
          editor.commands.setContent(expanded);
          // Initial Search Trigger - Runs immediately after content is set
          if (initialSearchQuery) {
              setEditorSearchTerm(initialSearchQuery);
              setShowSearch(true);
              performSearch(initialSearchQuery);
          }
      }
      setIsLoadingContent(false);
    };
    initContent();
  }, [note.id, note.encryptedData, activeNoteKey, editor, expandMedia]); // Removed initialSearchQuery from dep array to prevent re-running

  const handleSave = useCallback(async () => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const wasSearching = showSearch;
    
    // Clear highlights to keep saved content clean
    if (wasSearching) {
        editor.commands.setTextSelection({ from: 0, to: editor.state.doc.content.size });
        editor.commands.unsetHighlight();
        editor.commands.setTextSelection({ from, to });
    }

    const currentHtml = editor.getHTML();
    const plainText = editor.getText();
    const compressedContent = compressMedia(currentHtml);

    let updatedNote: Note = {
      ...note,
      title,
      content: compressedContent,
      plainTextPreview: plainText.substring(0, 300),
      updatedAt: Date.now(),
      isSynced: false,
      tags,
      color,
      folderId: folderId || undefined,
      location: location
    };

    if (updatedNote.isLocked && activeNoteKey) {
        try {
            const payload = JSON.stringify({ title, content: compressedContent });
            const encrypted = await SecurityService.encrypt(payload, activeNoteKey);
            const encryptedString = JSON.stringify(encrypted);
            updatedNote.encryptedData = encryptedString;
            lastSavedEncryptedDataRef.current = encryptedString;
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
        updatedNote.content = compressedContent;
        updatedNote.title = title;
    }

    onSave(updatedNote);
    setIsDirty(false); // Reset dirty state
    
    // Restore highlights
    if (wasSearching && editorSearchTerm) {
         performSearch(editorSearchTerm);
    }
  }, [note, title, tags, color, folderId, location, onSave, activeNoteKey, editor, showSearch, editorSearchTerm, performSearch]);

  const handleSaveRef = useRef(handleSave);
  useEffect(() => { handleSaveRef.current = handleSave; }, [handleSave]);

  const handleBackAction = useCallback(() => {
      if (isDirty) {
          if (window.confirm("Save changes?")) {
              handleSave();
              onBack();
          } 
          // If cancel, we stay in editor. This prevents accidental exit.
      } else {
          onBack();
      }
  }, [isDirty, onBack, handleSave]);

  // Back Button Listener specific to Editor
  useEffect(() => {
      const listener = CapacitorApp.addListener('backButton', () => {
          // App.tsx ignores 'EDITOR' view back press, so we handle it here
          if (showSearch) {
              closeSearch();
          } else {
              handleBackAction();
          }
      });
      return () => { listener.then(h => h.remove()); };
  }, [showSearch, handleBackAction]);

  const handleLockAction = () => {
      setShowSettings(false);
      if (!editor) return;
      if (note.isLocked) {
          editor.commands.unsetHighlight();
          const currentHtml = editor.getHTML();
          const plainText = editor.getText();
          const compressedContent = compressMedia(currentHtml);
          const unlockedNote: Note = {
              ...note,
              title,
              content: compressedContent,
              plainTextPreview: plainText,
              updatedAt: Date.now(),
              isLocked: false,
              encryptedData: undefined,
              lockMode: undefined,
              security: undefined,
              tags,
              color,
              folderId: folderId || undefined,
              location: location
          };
          onSave(unlockedNote);
      } else {
          handleSave();
          onLockToggle();
      }
  };

  // Auto-save logic (keep for crash recovery, but rely on manual back for UX)
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (!isDecrypted || isLoadingContent) return;
    saveTimeoutRef.current = setTimeout(() => { handleSave(); }, 2000); 
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [title, tags, color, folderId, location, handleSave, isDecrypted, isLoadingContent]);

  useEffect(() => { 
      return () => { 
          if (!skipSaveOnUnmount.current) handleSaveRef.current(); 
      }; 
  }, []);

  const handleAddTag = () => {
      if(newTag.trim() && !tags.includes(newTag.trim())) {
          setTags([...tags, newTag.trim()]);
          setNewTag('');
          setIsDirty(true);
      }
  };
  
  const removeTag = (tToRemove: string) => { 
      setTags(tags.filter(t => t !== tToRemove)); 
      setIsDirty(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && editor) {
          const reader = new FileReader();
          reader.onload = async (event) => {
              const base64 = event.target?.result as string;
              if (base64) {
                  const filename = await StorageService.saveMedia(base64);
                  if (filename) {
                      const url = await StorageService.getMediaUrl(filename);
                      if (url) {
                        editor.chain().focus().insertContent({ type: 'image', attrs: { src: url, 'data-filename': filename } }).run();
                      }
                  }
              }
          };
          reader.readAsDataURL(file);
      }
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
              mediaRecorderRef.current.ondataavailable = (event) => { audioChunksRef.current.push(event.data); };
              mediaRecorderRef.current.onstop = () => {
                  const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                  const reader = new FileReader();
                  reader.readAsDataURL(audioBlob);
                  reader.onloadend = async () => {
                      const base64data = reader.result as string;
                      const filename = await StorageService.saveMedia(base64data);
                      if (filename && editor) {
                        const url = await StorageService.getMediaUrl(filename);
                        if (url) editor.chain().focus().insertContent({ type: 'audio', attrs: { src: url, 'data-filename': filename } }).run();
                      }
                      stream.getTracks().forEach(track => track.stop());
                  };
              };
              mediaRecorderRef.current.start();
              setIsRecording(true);
          } catch (err) { alert("Could not access microphone."); }
      }
  };

  const handleAddLocation = () => {
      if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
              (position) => { 
                  setLocation({ lat: position.coords.latitude, lng: position.coords.longitude }); 
                  setIsDirty(true);
              },
              (err) => { alert("Unable to retrieve location."); }
          );
      }
  };

  const handleShare = async () => {
      if (navigator.share) {
          const plainText = editor?.getText() || note.plainTextPreview;
          await navigator.share({ title: title || 'CloudPad Note', text: `${title}\n\n${plainText}` });
      } else { alert("Web Share API not supported on this device."); }
  };

  const noteColorClass = NOTE_COLORS[color][theme];
  const editorBgClass = theme === 'neo-glass' ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 bg-fixed' : noteColorClass.split(' ')[0]; 

  if (isLoadingContent) {
      return (
          <div className={`flex flex-col min-h-[100dvh] items-center justify-center ${editorBgClass}`}>
              <Icon name="cloud" size={48} className={`animate-pulse opacity-50 mb-4 ${styles.text}`} />
              <p className={styles.text}>Loading note...</p>
          </div>
      );
  }

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
    <div className={`flex flex-col h-[100dvh] overflow-hidden transition-colors duration-300 animate-slide-in relative ${editorBgClass}`}>
      <div className={`flex flex-col flex-1 h-full ${theme === 'neo-glass' ? 'bg-white/10 backdrop-blur-3xl' : ''}`}>
        <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />

        {/* Toolbar */}
        <div className={`shrink-0 flex items-center justify-between pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 px-2 md:px-4 ${styles.header} border-b-0 bg-transparent backdrop-blur-sm z-10`}>
            <button onClick={() => { handleBackAction(); }} className={`p-2 rounded-full ${styles.iconHover} ${styles.text}`}>
                <Icon name="arrowLeft" size={24} />
            </button>
            <div className="flex gap-2">
                 <button 
                    onClick={() => {
                        setShowSearch(!showSearch);
                        if (!showSearch) setTimeout(() => document.getElementById('editor-search-input')?.focus(), 100);
                        else closeSearch();
                    }} 
                    className={`p-2 rounded-full ${showSearch ? styles.primaryText : `${styles.iconHover} ${styles.text}`}`}
                >
                    <Icon name="search" size={20} />
                </button>

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
                    <button onClick={handleShare} className={`p-2 rounded-full ${styles.iconHover} ${styles.text}`}><Icon name="share" size={20} /></button>
                )}
                
                <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-full ${showSettings ? `${styles.primaryBg} ${styles.primaryText}` : `${styles.iconHover} ${styles.text}`}`}>
                    <Icon name="moreVertical" size={20} />
                </button>
            </div>
        </div>
        
        {/* Floating Search Bar */}
        {showSearch && (
            <div className={`absolute top-[calc(4rem+env(safe-area-inset-top))] right-4 left-4 md:left-auto md:w-80 z-30 shadow-xl rounded-xl border p-2 flex items-center gap-2 animate-slide-up ${styles.cardBase} ${styles.cardBorder}`}>
                <input 
                    id="editor-search-input"
                    type="text" 
                    value={editorSearchTerm}
                    onChange={(e) => {
                        setEditorSearchTerm(e.target.value);
                        performSearch(e.target.value);
                    }}
                    placeholder="Find in note..."
                    className={`flex-1 bg-transparent outline-none text-sm px-2 ${styles.text}`}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.shiftKey ? prevMatch() : nextMatch();
                        }
                    }}
                />
                
                <div className={`text-xs px-2 ${styles.secondaryText}`}>
                    {searchResults.length > 0 ? `${currentResultIndex + 1}/${searchResults.length}` : (editorSearchTerm ? '0/0' : '')}
                </div>

                <div className={`h-4 w-px ${styles.divider} mx-1`}></div>

                <button onClick={prevMatch} className={`p-1 rounded ${styles.iconHover} ${styles.text}`} disabled={searchResults.length === 0}>
                    <Icon name="arrowLeft" size={16} className="rotate-90" />
                </button>
                <button onClick={nextMatch} className={`p-1 rounded ${styles.iconHover} ${styles.text}`} disabled={searchResults.length === 0}>
                    <Icon name="arrowLeft" size={16} className="-rotate-90" />
                </button>
                
                <button onClick={closeSearch} className={`p-1 rounded hover:bg-red-500/20 text-red-500 ml-1`}>
                    <Icon name="x" size={16} />
                </button>
            </div>
        )}

        {/* Settings Dropdown */}
        {showSettings && (
            <>
            <div className={`fixed inset-0 z-10 ${styles.modalOverlay}`} onClick={() => setShowSettings(false)} />
            <div className={`absolute top-16 right-4 w-72 shadow-2xl rounded-xl border z-20 p-4 animate-slide-up ${styles.cardBase} ${styles.cardBorder}`}>
                <h4 className={`text-xs font-semibold mb-3 ${styles.secondaryText}`}>NOTE SETTINGS</h4>
                <button onClick={handleLockAction} className={`w-full flex items-center gap-2 mb-4 p-2 rounded-lg text-sm ${note.isLocked ? `${styles.dangerBg} ${styles.dangerText}` : `${styles.text} ${styles.iconHover}`}`}>
                    <Icon name={note.isLocked ? "unlock" : "lock"} size={16} />
                    {note.isLocked ? "Unlock Note" : "Lock Note"}
                </button>
                <div className="mb-4">
                    <label className={`text-xs block mb-2 ${styles.secondaryText}`}>Background</label>
                    <div className="flex flex-wrap gap-2">
                        {Object.keys(NOTE_COLORS).map(c => (
                            <button key={c} onClick={() => { setColor(c); setIsDirty(true); }} className={`w-6 h-6 rounded-full border border-black/10 shadow-sm ${NOTE_COLORS[c].classic.split(' ')[0]} ${color === c ? 'ring-2 ring-primary-500' : ''}`} />
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
                         {location && <button onClick={() => { setLocation(undefined); setIsDirty(true); }} className="text-red-500"><Icon name="x" size={14} /></button>}
                    </div>
                    {!location && <button onClick={handleAddLocation} className={`w-full mt-2 text-xs flex items-center justify-center gap-1 py-1 rounded border border-dashed ${styles.secondaryText} hover:bg-black/5 dark:hover:bg-white/5`}><Icon name="mapPin" size={12} /> Add Location</button>}
                </div>
                <div className="mb-4">
                    <label className={`text-xs block mb-2 ${styles.secondaryText}`}>Folder</label>
                    <select value={folderId} onChange={(e) => { setFolderId(e.target.value); setIsDirty(true); }} className={`w-full rounded-lg p-2 text-sm outline-none ${styles.input} ${styles.inputText}`}>
                        <option value="">None (All Notes)</option>
                        {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                </div>
            </div>
            </>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-40">
             {isEditing ? (
                 <>
                    <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }} placeholder="Title" className={`w-full text-2xl md:text-3xl font-bold bg-transparent border-none outline-none mb-4 ${styles.text} ${styles.searchBarPlaceholder}`} />
                    <EditorContent editor={editor} className={styles.text} />
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
                    <div className={`w-full min-h-[50vh] text-lg leading-relaxed break-words prose max-w-none ${theme === 'dark' || theme === 'neo-glass' || theme === 'vision' ? 'prose-invert' : ''} ${styles.text}`}>
                         <EditorContent editor={editor} />
                    </div>
                </>
             )}
        </div>

        {isEditing && (
            <div className={`shrink-0 z-20 flex w-full items-stretch ${styles.cardBase} border-t ${styles.divider} pb-[env(safe-area-inset-bottom)]`}>
                <div className="flex-1 overflow-x-auto no-scrollbar mask-linear-fade">
                    <div className="flex items-center gap-2 p-2 px-4 min-w-max">
                        <div className="flex gap-1 shrink-0">
                            <button onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-2.5 rounded-lg ${editor?.isActive('heading', { level: 1 }) ? styles.activeItem : `${styles.iconHover} ${styles.text}`}`}><Icon name="h1" size={20} /></button>
                            <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-2.5 rounded-lg ${editor?.isActive('heading', { level: 2 }) ? styles.activeItem : `${styles.iconHover} ${styles.text}`}`}><Icon name="h2" size={20} /></button>
                            <button onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} className={`p-2.5 rounded-lg ${editor?.isActive('heading', { level: 3 }) ? styles.activeItem : `${styles.iconHover} ${styles.text}`}`}><Icon name="h3" size={20} /></button>
                        </div>
                        <div className={`h-6 w-px ${styles.divider} bg-gray-300 dark:bg-gray-700 mx-1 shrink-0`} />
                        <div className="flex gap-1 shrink-0">
                            <button onClick={() => editor?.chain().focus().toggleBold().run()} className={`p-2.5 rounded-lg ${editor?.isActive('bold') ? styles.activeItem : `${styles.iconHover} ${styles.text}`}`}><Icon name="bold" size={20} /></button>
                            <button onClick={() => editor?.chain().focus().toggleItalic().run()} className={`p-2.5 rounded-lg ${editor?.isActive('italic') ? styles.activeItem : `${styles.iconHover} ${styles.text}`}`}><Icon name="italic" size={20} /></button>
                            <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className={`p-2.5 rounded-lg ${editor?.isActive('bulletList') ? styles.activeItem : `${styles.iconHover} ${styles.text}`}`}><Icon name="list" size={20} /></button>
                            <button onClick={() => editor?.chain().focus().toggleTaskList().run()} className={`p-2.5 rounded-lg ${editor?.isActive('taskList') ? styles.activeItem : `${styles.iconHover} ${styles.text}`}`}><Icon name="checklist" size={20} /></button>
                        </div>
                        <div className={`h-6 w-px ${styles.divider} bg-gray-300 dark:bg-gray-700 mx-1 shrink-0`} />
                        <div className="flex gap-1 shrink-0">
                             <button onClick={() => fileInputRef.current?.click()} className={`p-2.5 rounded-lg ${styles.iconHover} ${styles.text}`}><Icon name="image" size={20} /></button>
                             <button onClick={toggleRecording} className={`p-2.5 rounded-lg transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30' : `${styles.iconHover} ${styles.text}`}`}><Icon name={isRecording ? "stop" : "mic"} size={20} /></button>
                             <button onClick={handleAddLocation} className={`p-2.5 rounded-lg ${styles.iconHover} ${styles.text}`}><Icon name="mapPin" size={20} /></button>
                        </div>
                    </div>
                </div>
                <div className={`w-px my-2 ${styles.divider} bg-gray-200 dark:bg-gray-700 shrink-0`} />
                <div className="flex items-center gap-1 p-2 pl-3 pr-4 shrink-0 z-10">
                    <button onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} className={`p-2.5 rounded-lg ${!editor?.can().undo() ? 'opacity-30 cursor-not-allowed' : styles.iconHover} ${styles.text}`}><Icon name="undo" size={20} /></button>
                    <button onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} className={`p-2.5 rounded-lg ${!editor?.can().redo() ? 'opacity-30 cursor-not-allowed' : styles.iconHover} ${styles.text}`}><Icon name="redo" size={20} /></button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};