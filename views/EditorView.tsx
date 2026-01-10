
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import { Node, mergeAttributes } from '@tiptap/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Share } from '@capacitor/share';

import { Icon } from '../components/Icon';
import { BottomSheet } from '../components/BottomSheet';
import { Note, EncryptedData, Folder } from '../types';
import { SecurityService } from '../services/SecurityService';
import { StorageService } from '../services/StorageService';
import { useTheme, NOTE_COLORS } from '../contexts/ThemeContext';
import { AlertModal } from '../components/AlertModal';

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

// --- Custom Nodes (Image, Audio) ---
const ImageNode = (props: any) => {
  const { node, selected } = props;
  const [src, setSrc] = useState(node.attrs.src);
  const [error, setError] = useState(false);
  const { styles } = useTheme();

  useEffect(() => { setSrc(node.attrs.src); setError(false); }, [node.attrs.src]);

  return (
    <NodeViewWrapper className="my-4">
      <div className={`relative rounded-2xl overflow-hidden transition-all ${selected ? `ring-2 ${styles.primaryRing}` : ''}`}>
        {error ? (
            <div className={`p-4 text-sm flex items-center gap-2 border rounded-xl select-none ${styles.dangerBg} ${styles.dangerText} border-red-200 dark:border-red-800`}>
                <Icon name="image" size={20} />
                <span className="opacity-70 text-xs">Image failed to load</span>
            </div>
        ) : (
            <img 
              src={src} 
              alt={node.attrs.alt}
              className="max-w-full h-auto rounded-2xl shadow-sm border border-black/5 dark:border-white/5 bg-gray-100 dark:bg-gray-800 min-h-[100px]"
              onError={() => setError(true)}
            />
        )}
      </div>
    </NodeViewWrapper>
  );
};

const CustomImage = Image.extend({
  addAttributes() { return { src: { default: null }, alt: { default: null }, title: { default: null }, 'data-filename': { default: null } }; },
  addNodeView() { return ReactNodeViewRenderer(ImageNode); },
});

const AudioExtension = Node.create({
  name: 'audio',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() { return { src: { default: null }, 'data-filename': { default: null } } },
  parseHTML() { return [{ tag: 'audio' }] },
  renderHTML({ HTMLAttributes }) {
    return ['div', { class: 'my-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center gap-3 border border-black/5' },
      ['div', { class: 'p-2 rounded-full text-white', style: 'background-color: var(--primary-color)' }, 
        ['svg', { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, ['path', { d: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" }]]
      ],
      ['div', { class: 'flex-1' },
         ['span', { class: 'text-xs font-bold uppercase tracking-wider opacity-60 select-none block mb-1' }, 'Voice Note'],
         ['audio', mergeAttributes(HTMLAttributes, { controls: true, class: 'h-8 w-full' })]
      ]
    ]
  },
});

export const EditorView: React.FC<EditorViewProps> = ({ 
    note, folders, initialEditMode, activeNoteKey, onSave, onBack, onDelete, onLockToggle, initialSearchQuery
}) => {
  const { theme, styles, getNoteColorStyle } = useTheme();
  
  // State
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [title, setTitle] = useState(note.title);
  
  // Decryption / Loading State
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [decryptionError, setDecryptionError] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  
  // Lock to prevent dirty updates during initial load
  const loadingLockRef = useRef(true);

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
  
  // Alert State
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '' });

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<any>(null);
  const lastSavedEncryptedDataRef = useRef<string | null>(null);
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Haptic Helper
  const triggerHaptic = (duration = 10) => {
    if (navigator.vibrate) navigator.vibrate(duration);
  };

  // Editor Setup
  const editor = useEditor({
    extensions: [
      StarterKit, TaskList, TaskItem.configure({ nested: true }),
      CustomImage.configure({ inline: true, allowBase64: true }), // Allow base64 temporarily for paste support, cleaned on save
      Placeholder.configure({ placeholder: 'Start typing...', emptyEditorClass: 'is-editor-empty' }),
      AudioExtension, Highlight.configure({ multicolor: true })
    ],
    editable: isEditing,
    onUpdate: () => {
        // Only set dirty if the loading lock is released
        if (!loadingLockRef.current) {
             setIsDirty(true);
        }
    },
    editorProps: {
      attributes: {
        class: `prose max-w-none focus:outline-none ${styles.isDark ? 'prose-invert' : ''}`, 
      },
    },
  });

  // --- Helpers ---
  const adjustTitleHeight = () => {
      if (titleTextareaRef.current) {
          titleTextareaRef.current.style.height = 'auto';
          titleTextareaRef.current.style.height = `${titleTextareaRef.current.scrollHeight}px`;
      }
  };

  useEffect(() => adjustTitleHeight(), [title, isEditing]);
  useEffect(() => editor?.setEditable(isEditing && !isLoadingContent), [editor, isEditing, isLoadingContent]);

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

  const compressMedia = async (html: string): Promise<string> => {
      const div = document.createElement('div');
      div.innerHTML = html;
      
      const images = Array.from(div.querySelectorAll('img'));
      for (const img of images) {
          const src = img.getAttribute('src');
          const filename = img.getAttribute('data-filename');

          if (filename) {
               // Existing tracked file
               img.setAttribute('src', `[[FILE:${filename}]]`);
          } else if (src && src.startsWith('data:')) {
               // Found Base64 image (pasted or dropped). Save it to disk now.
               const newFilename = await StorageService.saveMedia(src);
               if (newFilename) {
                   img.setAttribute('src', `[[FILE:${newFilename}]]`);
                   img.setAttribute('data-filename', newFilename);
               }
          }
      }

      const audios = Array.from(div.querySelectorAll('audio'));
      for (const audio of audios) {
         const filename = audio.getAttribute('data-filename');
         if (filename) audio.setAttribute('src', `[[FILE:${filename}]]`);
      }
      return div.innerHTML;
  };

  // --- Content Loading ---
  useEffect(() => {
    const initContent = async () => {
      // Ensure lock is active at start of load
      loadingLockRef.current = true;
      setIsLoadingContent(true);

      let loadedContent = note.content;
      let loadedTitle = note.title;
      let loadedEncryptedData = note.encryptedData;

      if (!loadedContent && !loadedEncryptedData && !note.isEncrypted) {
         loadedContent = await StorageService.getNoteContent(note.id);
      }
      
      if (!loadedEncryptedData && note.isEncrypted) {
          const fetchedEnc = await StorageService.getEncryptedData(note.id);
          if (fetchedEnc) loadedEncryptedData = fetchedEnc;
      }

      if (loadedEncryptedData || note.isEncrypted) {
        if (!activeNoteKey || !loadedEncryptedData) {
           setDecryptionError(true);
           setIsLoadingContent(false);
           loadingLockRef.current = false; // Release lock even on error
           return;
        }
        try {
           const encryptedData: EncryptedData = JSON.parse(loadedEncryptedData);
           const jsonString = await SecurityService.decrypt(encryptedData, activeNoteKey);
           const payload = JSON.parse(jsonString);
           loadedTitle = payload.title;
           loadedContent = payload.content;
           setIsDecrypted(true);
           setDecryptionError(false);
           lastSavedEncryptedDataRef.current = loadedEncryptedData;
        } catch (e) {
           console.error("Decryption fail", e);
           setDecryptionError(true);
           setIsLoadingContent(false);
           loadingLockRef.current = false;
           return;
        }
      } else {
        setIsDecrypted(true);
        setDecryptionError(false);
      }
      
      if (!loadedContent) loadedContent = "";
      
      const expanded = await expandMedia(loadedContent);
      setTitle(loadedTitle);
      
      if (editor) {
          // Setting content triggers onUpdate, but loadingLockRef is true, so isDirty remains false
          editor.commands.setContent(expanded);
          
          if (initialSearchQuery) {
              setEditorSearchTerm(initialSearchQuery);
              setShowSearch(true);
              setTimeout(() => performSearch(initialSearchQuery), 100);
          }
      }
      
      // Delay releasing the lock slightly to allow any sync events to settle
      setTimeout(() => {
          loadingLockRef.current = false;
          setIsLoadingContent(false);
      }, 50);
    };
    initContent();
  }, [note.id, note.isEncrypted, activeNoteKey, editor, expandMedia]); 

  // --- Saving & Search Logic ---
  const performSearch = useCallback((term: string) => {
      if (!editor) return;
      const { from, to } = editor.state.selection;
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
                  results.push({ from: pos + foundIndex, to: pos + foundIndex + term.length });
                  searchPos = foundIndex + 1;
              }
          }
      });
      const chain = editor.chain();
      results.forEach(res => chain.setTextSelection(res).setHighlight());
      chain.setTextSelection({ from, to });
      chain.run();
      setSearchResults(results);
      if (results.length > 0) {
          setCurrentResultIndex(0);
          setTimeout(() => scrollToMatch(0, results), 50);
      }
  }, [editor]);

  const scrollToMatch = (index: number, resultsOverride?: {from: number, to: number}[]) => {
      const results = resultsOverride || searchResults;
      if (results[index] && editor) {
          editor.chain().setTextSelection(results[index]).scrollIntoView().run();
      }
  };

  const handleSave = useCallback(async () => {
    // Prevent saving if editor is not ready or content is still loading to avoid overwriting with empty content
    if (!editor || loadingLockRef.current) return;
    
    console.log('[EditorView] handleSave triggered');
    
    const { from, to } = editor.state.selection;
    const wasSearching = showSearch;
    if (wasSearching) {
        editor.commands.setTextSelection({ from: 0, to: editor.state.doc.content.size });
        editor.commands.unsetHighlight();
        editor.commands.setTextSelection({ from, to });
    }

    const currentHtml = editor.getHTML();
    const plainText = editor.getText();
    const compressedContent = await compressMedia(currentHtml);

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
            updatedNote.content = undefined; 
            updatedNote.plainTextPreview = "";
        } catch (e) { console.error("Encryption failed", e); return; }
    } else if (!updatedNote.isLocked) {
        updatedNote.encryptedData = undefined;
        updatedNote.lockMode = undefined;
        updatedNote.security = undefined;
        updatedNote.content = compressedContent;
        updatedNote.title = title;
    }

    onSave(updatedNote);
    setIsDirty(false);
    console.log('[EditorView] Save complete. isDirty reset to false.');
    
    if (wasSearching && editorSearchTerm) performSearch(editorSearchTerm);
  }, [note, title, tags, color, folderId, location, onSave, activeNoteKey, editor, showSearch, editorSearchTerm, performSearch]);

  const handleSaveRef = useRef(handleSave);
  useEffect(() => { handleSaveRef.current = handleSave; }, [handleSave]);

  const handleBackAction = useCallback(() => {
      if (isDirty) {
          handleSave();
          triggerHaptic(20);
          onBack();
      } else {
          onBack();
      }
  }, [isDirty, onBack, handleSave]);

  useEffect(() => {
      const listener = CapacitorApp.addListener('backButton', () => {
          if (showSearch) { setShowSearch(false); setEditorSearchTerm(""); setSearchResults([]); } 
          else if (showSettings) { setShowSettings(false); }
          else { handleBackAction(); }
      });
      return () => { listener.then(h => h.remove()); };
  }, [showSearch, showSettings, handleBackAction]);

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (!isDecrypted || isLoadingContent) return;
    
    // CRITICAL FIX: Only schedule autosave if strictly dirty
    if (isDirty) {
        console.log('[EditorView] Scheduling autosave (dirty=true)');
        saveTimeoutRef.current = setTimeout(() => { handleSave(); }, 2000); 
    }

    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [title, tags, color, folderId, location, handleSave, isDecrypted, isLoadingContent, isDirty]);

  useEffect(() => { return () => { if (!skipSaveOnUnmount.current) handleSaveRef.current(); }; }, []);

  // --- Actions ---
  const handleAddTag = () => { if(newTag.trim() && !tags.includes(newTag.trim())) { setTags([...tags, newTag.trim()]); setNewTag(''); setIsDirty(true); } };
  const removeTag = (t: string) => { setTags(tags.filter(tag => tag !== t)); setIsDirty(true); };
  
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
                      if (url) editor.chain().focus().insertContent({ type: 'image', attrs: { src: url, 'data-filename': filename } }).run();
                  }
              }
          };
          reader.readAsDataURL(file);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleRecording = async () => {
      triggerHaptic(20);
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
          } catch (err) { 
              setAlertConfig({ isOpen: true, title: "Microphone Error", message: "Could not access microphone." });
          }
      }
  };

  const handleShare = async () => {
      const plainText = editor?.getText() || note.plainTextPreview;
      try {
          await Share.share({
              title: title || 'CloudPad Note',
              text: `${title}\n\n${plainText}`,
              dialogTitle: 'Share Note'
          });
      } catch (err) {
          console.error("Share failed", err);
      }
  };

  const wordCount = useMemo(() => {
      if (!editor) return 0;
      return editor.storage.characterCount?.words?.() ?? editor.getText().split(/\s+/).filter(w => w.length > 0).length;
  }, [editor, isDirty]); 

  const noteColorClass = getNoteColorStyle(color);
  const editorBgClass = theme === 'neo-glass' ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 bg-fixed' : noteColorClass.split(' ')[0]; 

  if (decryptionError) {
      return (
        <div className={`flex flex-col min-h-[100dvh] items-center justify-center ${editorBgClass}`}>
             <Icon name="lock" size={48} className={`${styles.dangerText} mb-4`} />
             <h2 className={`text-xl font-bold ${styles.text}`}>Authentication Required</h2>
             <button onClick={onBack} className={`px-4 py-2 ${styles.buttonSecondary} rounded-lg mt-4`}>Go Back</button>
        </div>
      );
  }

  const folderName = folders.find(f => f.id === folderId)?.name || "Unfiled";

  return (
    <div className={`flex flex-col h-[100dvh] overflow-hidden transition-colors duration-300 animate-slide-in relative ${editorBgClass}`}>
      <div className={`flex flex-col flex-1 h-full ${theme === 'neo-glass' ? 'bg-white/10 backdrop-blur-3xl' : ''}`}>
        <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />

        {/* --- Modern Header --- */}
        <div className={`shrink-0 flex items-center justify-between pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 px-2 md:px-4 z-20 ${theme === 'neo-glass' ? 'bg-white/10' : 'bg-transparent'}`}>
            <button onClick={handleBackAction} className={`p-3 rounded-full ${styles.iconHover} ${styles.text}`}>
                <Icon name="arrowLeft" size={24} />
            </button>
            
            <div className="flex gap-1 items-center">
                 {/* Only show status if Editing OR Dirty */}
                 {(isEditing || isDirty) && (
                     <>
                        {!isDirty && (
                            <span className={`text-[10px] font-bold uppercase tracking-wider opacity-40 mr-2 ${styles.text}`}>Saved</span>
                        )}
                        {isDirty && (
                            <span className={`text-[10px] font-bold uppercase tracking-wider opacity-60 mr-2 ${styles.text}`}>Saving...</span>
                        )}
                     </>
                 )}

                 {isEditing && !isLoadingContent ? (
                    <>
                        <button onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} className={`p-3 rounded-full opacity-70 ${!editor?.can().undo() ? 'opacity-30' : ''} ${styles.text}`}><Icon name="undo" size={20} /></button>
                        <button onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} className={`p-3 rounded-full opacity-70 ${!editor?.can().redo() ? 'opacity-30' : ''} ${styles.text}`}><Icon name="redo" size={20} /></button>
                        <button 
                            onClick={() => { handleSave(); setIsEditing(false); triggerHaptic(20); }} 
                            className={`ml-2 px-4 py-2 rounded-full font-bold text-sm ${styles.fab} shadow-lg active:scale-95 transition-all`}
                        >
                            Done
                        </button>
                    </>
                 ) : (
                    <>
                        {!isLoadingContent && (
                            <button onClick={() => { setIsEditing(true); triggerHaptic(10); }} className={`p-3 rounded-full ${styles.iconHover} ${styles.text}`}>
                                <Icon name="edit" size={22} />
                            </button>
                        )}
                        <button 
                            onClick={() => {
                                setShowSearch(!showSearch);
                                if (!showSearch) setTimeout(() => document.getElementById('editor-search-input')?.focus(), 100);
                                else { setShowSearch(false); setEditorSearchTerm(""); }
                            }} 
                            className={`p-3 rounded-full ${showSearch ? styles.primaryText : `${styles.iconHover} ${styles.text}`}`}
                            disabled={isLoadingContent}
                        >
                            <Icon name="search" size={22} />
                        </button>
                        <button onClick={handleShare} className={`p-3 rounded-full ${styles.iconHover} ${styles.text}`}><Icon name="share" size={22} /></button>
                        <button onClick={() => setShowSettings(true)} className={`p-3 rounded-full ${styles.iconHover} ${styles.text}`}><Icon name="moreVertical" size={22} /></button>
                    </>
                 )}
            </div>
        </div>

        {/* --- Floating Search Bar --- */}
        {showSearch && (
            <div className={`shrink-0 mx-4 mb-2 z-30 shadow-xl rounded-2xl border p-2 flex items-center gap-2 animate-slide-up ${styles.cardBase} ${styles.cardBorder}`}>
                <Icon name="search" size={18} className={`ml-2 opacity-50 ${styles.text}`} />
                <input 
                    id="editor-search-input"
                    type="text" 
                    value={editorSearchTerm}
                    onChange={(e) => { setEditorSearchTerm(e.target.value); performSearch(e.target.value); }}
                    placeholder="Find in note..."
                    className={`flex-1 bg-transparent outline-none text-base h-10 ${styles.text}`}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.shiftKey ? (() => { if(searchResults.length > 0) scrollToMatch((currentResultIndex - 1 + searchResults.length) % searchResults.length); })() : (() => { if(searchResults.length > 0) scrollToMatch((currentResultIndex + 1) % searchResults.length); })(); } }}
                />
                <div className={`text-xs px-2 opacity-60 ${styles.text}`}>
                    {searchResults.length > 0 ? `${currentResultIndex + 1}/${searchResults.length}` : (editorSearchTerm ? '0' : '')}
                </div>
                <button onClick={() => { setShowSearch(false); setEditorSearchTerm(""); }} className={`p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 ${styles.text}`}>
                    <Icon name="x" size={18} />
                </button>
            </div>
        )}

        {/* --- Main Content Area --- */}
        <div className="flex-1 overflow-y-auto px-5 md:px-8 pb-32">
             <div className="pt-2">
                 {/* Title Input/Display */}
                 <textarea
                    ref={titleTextareaRef}
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
                    placeholder="Title"
                    readOnly={!isEditing || isLoadingContent}
                    rows={1}
                    className={`w-full bg-transparent border-none outline-none resize-none font-bold text-3xl md:text-4xl leading-tight mb-2 placeholder:opacity-30 ${styles.text} ${isLoadingContent ? 'opacity-50' : ''}`}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); editor?.commands.focus(); } }}
                 />

                 {/* Metadata Row */}
                 <div className={`flex flex-wrap items-center gap-4 text-xs font-medium tracking-wide uppercase opacity-60 mb-4 ${styles.text}`}>
                    <div className="flex items-center gap-1.5">
                        <Icon name="calendar" size={12} />
                        {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Icon name="folder" size={12} />
                        {folderName}
                    </div>
                 </div>
                 
                 {/* Tags & Location Row */}
                 {(tags.length > 0 || location) && (
                     <div className="flex flex-wrap gap-2 mb-6">
                        {location && (
                             <a 
                                href={`https://maps.google.com/?q=${location.lat},${location.lng}`} target="_blank" rel="noopener noreferrer"
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${styles.cardBorder} border ${styles.text}`}
                             >
                                <Icon name="mapPin" size={12} />
                                {location.lat.toFixed(2)}, {location.lng.toFixed(2)}
                             </a>
                        )}
                        {tags.map(t => (
                            <span key={t} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${styles.tagBg} ${styles.tagText}`}>
                                #{t}
                            </span>
                        ))}
                     </div>
                 )}

                 {/* Editor */}
                 <div className={`min-h-[50vh] text-lg leading-relaxed break-words pb-20 ${styles.text}`}>
                      {isLoadingContent ? (
                          <div className="flex flex-col items-center justify-center h-48 opacity-50">
                               <Icon name="cloud" size={32} className="animate-pulse mb-2" />
                               <span className="text-xs font-medium">Loading content...</span>
                          </div>
                      ) : (
                          <EditorContent editor={editor} />
                      )}
                 </div>
             </div>
        </div>

        {/* --- View Mode FAB (Quick Edit) --- */}
        {!isEditing && !isLoadingContent && (
            <button 
                onClick={() => { setIsEditing(true); triggerHaptic(20); }} 
                className={`fixed bottom-8 right-6 w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl active:scale-95 transition-all z-30 ${styles.fab}`}
            >
                <Icon name="edit" size={26} />
            </button>
        )}

        {/* --- Edit Mode Toolbar --- */}
        {isEditing && !isLoadingContent && (
            <div className={`shrink-0 z-20 flex w-full items-stretch ${styles.cardBase} border-t ${styles.divider} pb-[env(safe-area-inset-bottom)]`}>
                <div className="flex-1 overflow-x-auto no-scrollbar mask-linear-fade">
                    <div className="flex items-center gap-1 p-2 px-4 min-w-max">
                        <button onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-3 rounded-xl ${editor?.isActive('heading', { level: 1 }) ? styles.activeItem : `${styles.iconHover} ${styles.text}`}`}><Icon name="h1" size={22} /></button>
                        <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-3 rounded-xl ${editor?.isActive('heading', { level: 2 }) ? styles.activeItem : `${styles.iconHover} ${styles.text}`}`}><Icon name="h2" size={22} /></button>
                        <button onClick={() => editor?.chain().focus().toggleBold().run()} className={`p-3 rounded-xl ${editor?.isActive('bold') ? styles.activeItem : `${styles.iconHover} ${styles.text}`}`}><Icon name="bold" size={22} /></button>
                        <button onClick={() => editor?.chain().focus().toggleItalic().run()} className={`p-3 rounded-xl ${editor?.isActive('italic') ? styles.activeItem : `${styles.iconHover} ${styles.text}`}`}><Icon name="italic" size={22} /></button>
                        <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className={`p-3 rounded-xl ${editor?.isActive('bulletList') ? styles.activeItem : `${styles.iconHover} ${styles.text}`}`}><Icon name="list" size={22} /></button>
                        <button onClick={() => editor?.chain().focus().toggleTaskList().run()} className={`p-3 rounded-xl ${editor?.isActive('taskList') ? styles.activeItem : `${styles.iconHover} ${styles.text}`}`}><Icon name="checklist" size={22} /></button>
                        
                        <div className={`h-6 w-px ${styles.divider} bg-gray-300 dark:bg-gray-700 mx-2`} />
                        
                        <button onClick={() => fileInputRef.current?.click()} className={`p-3 rounded-xl ${styles.iconHover} ${styles.text}`}><Icon name="image" size={22} /></button>
                        <button onClick={toggleRecording} className={`p-3 rounded-xl transition-all ${isRecording ? `${styles.dangerBg} ${styles.dangerText} animate-pulse` : `${styles.iconHover} ${styles.text}`}`}><Icon name={isRecording ? "stop" : "mic"} size={22} /></button>
                        <button onClick={() => { if ("geolocation" in navigator) navigator.geolocation.getCurrentPosition(pos => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setIsDirty(true); }) }} className={`p-3 rounded-xl ${styles.iconHover} ${styles.text}`}><Icon name="mapPin" size={22} /></button>
                        
                        {/* Read Mode Switch */}
                        <div className={`h-6 w-px ${styles.divider} bg-gray-300 dark:bg-gray-700 mx-2`} />
                        <button onClick={() => { setIsEditing(false); triggerHaptic(10); }} className={`p-3 rounded-xl ${styles.iconHover} ${styles.text}`}><Icon name="eye" size={22} /></button>
                    </div>
                </div>
            </div>
        )}

        {/* --- Settings Bottom Sheet --- */}
        <BottomSheet isOpen={showSettings} onClose={() => setShowSettings(false)} title="Note Details">
            <div className="space-y-6">
                {/* Actions */}
                <div className="grid grid-cols-2 gap-3">
                     <button onClick={() => { setShowSettings(false); onLockToggle(); }} className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 border transition-all active:scale-95 ${note.isLocked ? `${styles.dangerBg} border-red-200 dark:border-red-900` : `${styles.cardBase} ${styles.cardBorder}`}`}>
                         <Icon name={note.isLocked ? "unlock" : "lock"} size={24} className={note.isLocked ? styles.dangerText : styles.text} />
                         <span className={`text-xs font-bold ${note.isLocked ? styles.dangerText : styles.text}`}>{note.isLocked ? "Unlock Note" : "Lock Note"}</span>
                     </button>
                     <button onClick={() => { skipSaveOnUnmount.current = true; onDelete(note.id); }} className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 border transition-all active:scale-95 ${styles.cardBase} ${styles.cardBorder}`}>
                         <Icon name="trash" size={24} className={styles.dangerText} />
                         <span className={`text-xs font-bold ${styles.dangerText}`}>Delete</span>
                     </button>
                </div>

                {/* Color */}
                <div>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 px-1 ${styles.secondaryText}`}>Color</h4>
                    <div className="flex flex-wrap gap-3">
                        {Object.keys(NOTE_COLORS).map(c => (
                            <button 
                                key={c} 
                                onClick={() => { setColor(c); setIsDirty(true); }} 
                                className={`w-10 h-10 rounded-full border-2 transition-transform active:scale-90 shadow-sm ${getNoteColorStyle(c).split(' ')[0]} ${color === c ? `border-${styles.accentColor} scale-110` : 'border-transparent'}`} 
                                style={color === c ? { borderColor: styles.accentColor } : {}}
                            />
                        ))}
                    </div>
                </div>

                {/* Folder */}
                <div>
                     <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 px-1 ${styles.secondaryText}`}>Folder</h4>
                     <select 
                        value={folderId} 
                        onChange={(e) => { setFolderId(e.target.value); setIsDirty(true); }} 
                        className={`w-full p-4 rounded-xl border appearance-none outline-none ${styles.cardBase} ${styles.cardBorder} ${styles.text}`}
                     >
                        <option value="">All Notes (No Folder)</option>
                        {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                     </select>
                </div>

                {/* Tags */}
                <div>
                     <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 px-1 ${styles.secondaryText}`}>Tags</h4>
                     <div className="flex gap-2 mb-3">
                         <input type="text" value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Add a tag..." className={`flex-1 p-3 rounded-xl border outline-none ${styles.cardBase} ${styles.cardBorder} ${styles.text}`} onKeyDown={e => e.key === 'Enter' && handleAddTag()} />
                         <button onClick={handleAddTag} className={`p-3 rounded-xl ${styles.primaryBg} ${styles.primaryText}`}><Icon name="plus" size={24} /></button>
                     </div>
                     <div className="flex flex-wrap gap-2">
                         {tags.map(t => (
                             <span key={t} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${styles.tagBg} ${styles.tagText}`}>
                                 #{t} <button onClick={() => removeTag(t)} className="opacity-50 hover:opacity-100">&times;</button>
                             </span>
                         ))}
                         {tags.length === 0 && <span className={`text-sm italic opacity-50 ${styles.text}`}>No tags</span>}
                     </div>
                </div>

                {/* Info */}
                <div className={`p-4 rounded-xl text-xs space-y-2 opacity-60 ${styles.text} ${styles.cardBase} border ${styles.cardBorder}`}>
                    <div className="flex justify-between"><span>Created</span> <span>{new Date(note.createdAt).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Words</span> <span>{wordCount}</span></div>
                    {note.isSynced && <div className="flex justify-between"><span className={`${styles.successText} font-bold`}>Synced</span> <Icon name="check" size={14} className={styles.successText} /></div>}
                </div>
            </div>
        </BottomSheet>
        <AlertModal 
            isOpen={alertConfig.isOpen}
            onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
            title={alertConfig.title}
            message={alertConfig.message}
        />
      </div>
    </div>
  );
};
