
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import localforage from 'localforage';
import { Note, NoteMetadata, Folder, BackupData } from '../types';
import { MigrationPlugin } from '../plugins/MigrationPlugin';

localforage.config({
  name: 'CloudPad',
  storeName: 'notes_db'
});

const NOTES_INDEX_KEY = 'notes_index';
const SEARCH_INDEX_KEY = 'search_index_v1';
const NOTE_CONTENT_PREFIX = 'note_content_';
const MIGRATION_FLAG_KEY = 'migration_completed_v1';

class Mutex {
    private mutex = Promise.resolve();

    lock(): Promise<() => void> {
        let unlock: () => void = () => {};
        const nextLock = new Promise<void>(resolve => {
            unlock = resolve;
        });
        const lockPromise = this.mutex.then(() => unlock);
        this.mutex = this.mutex.then(() => nextLock);
        return lockPromise;
    }

    async dispatch<T>(fn: (() => T) | (() => Promise<T>)): Promise<T> {
        const unlock = await this.lock();
        try {
            return await Promise.resolve(fn());
        } finally {
            unlock();
        }
    }
}

export class StorageService {
  private static indexMutex = new Mutex();
  private static searchIndexMutex = new Mutex();
  private static searchCache: Record<string, string> | null = null;

  static async init(): Promise<void> {
    // 1. Migrate legacy "notes" array to split storage
    const isMigrated = localStorage.getItem(MIGRATION_FLAG_KEY);
    
    if (!isMigrated) {
        if (Capacitor.getPlatform() === 'android') {
            // Native Streaming Strategy (Android)
            await this.migrateLegacyNative();
        } else {
            // Fallback Strategy (Web/iOS)
            await this.migrateLegacyWeb();
        }
        localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
    }

    // 2. Migrate localStorage folders if needed
    const oldFolders = localStorage.getItem('folders');
    if (oldFolders) {
       try {
         const folders = JSON.parse(oldFolders);
         await localforage.setItem('folders', folders);
         localStorage.removeItem('folders');
       } catch(e) {}
    }
  }

  /**
   * Android Native Streaming Strategy
   * Bypasses WebView memory limits by streaming small batches from native disk.
   */
  private static async migrateLegacyNative(): Promise<void> {
    return new Promise((resolve) => {
        let isResolved = false;
        
        console.log("[StorageService] Starting Native Migration...");

        // Helper to ensure clean exit
        const finalize = async () => {
            if (isResolved) return;
            isResolved = true;
            
            try {
                (await batchListener).remove();
                (await completeListener).remove();
                (await errorListener).remove();
            } catch(e) {}
            
            resolve();
        };

        // 1. Timeout Safeguard
        // If native plugin fails to fire events within 3s, assume empty/broken/web and skip.
        const timer = setTimeout(() => {
            console.warn("[StorageService] Native migration timed out. Skipping.");
            finalize();
        }, 3000);

        // 2. Event Listeners
        const batchListener = MigrationPlugin.addListener('onNotesBatch', async (data) => {
            if (isResolved) return;
            clearTimeout(timer); // Activity detected, keep alive

            try {
                // OPTIMIZATION: Read Index ONCE per batch, protected by mutex
                await this.indexMutex.dispatch(async () => {
                    const currentIndex = await this.getNotesMetadata();
                    const newItems: NoteMetadata[] = [];
    
                    // Process batch
                    for (const note of data.notes) {
                        const meta = await this.processMigrationNoteContentOnly(note);
                        newItems.push(meta);
                    }
    
                    // Update Index ONCE per batch (O(1) IO instead of O(N))
                    const mergedIndex = [...newItems, ...currentIndex]; 
                    await this.saveNotesMetadata(mergedIndex);
                });
                
                // CRITICAL: Acknowledge batch to release native hold and fetch next chunk
                await MigrationPlugin.ackBatch();
            } catch (e) {
                console.error("[StorageService] Batch processing failed", e);
                // Attempt to continue despite error
                await MigrationPlugin.ackBatch();
            }
        });

        const completeListener = MigrationPlugin.addListener('onMigrationComplete', async () => {
            console.log("[StorageService] Native Migration Complete");
            clearTimeout(timer);
            finalize();
        });

        const errorListener = MigrationPlugin.addListener('onMigrationError', async (err) => {
            console.error("[StorageService] Native Migration Error", err);
            clearTimeout(timer);
            finalize();
        });

        // 3. Start Plugin
        MigrationPlugin.startLegacyMigration().catch((e) => {
            console.warn("[StorageService] Native migration start failed (fallback)", e);
            clearTimeout(timer);
            finalize();
        });
    });
  }

  /**
   * Web/Fallback Strategy
   * Uses chunked processing of JS array to minimize main thread blocking.
   */
  private static async migrateLegacyWeb(): Promise<void> {
    try {
      const legacyNotes = await localforage.getItem<Note[]>('notes');
      if (legacyNotes && Array.isArray(legacyNotes)) {
          console.log("Migrating legacy notes (Web Fallback)...");
          
          await this.indexMutex.dispatch(async () => {
              // Optimization: Load index once
              const index = await this.getNotesMetadata();
              const newMetas: NoteMetadata[] = [];
    
              for (let i = 0; i < legacyNotes.length; i++) {
                  const note = legacyNotes[i];
                  if (!note) continue;
                  
                  const meta = await this.processMigrationNoteContentOnly(note);
                  newMetas.push(meta);
                  
                  legacyNotes[i] = null as any; // Release memory
              }
              
              await this.saveNotesMetadata([...newMetas, ...index]);
          });
          await localforage.removeItem('notes');
      }
    } catch (e) {
      console.error("Web Migration Failed", e);
    }
  }

  /**
   * Helper: Saves content to disk and returns Metadata object. 
   * DOES NOT update the index (Caller must handle index update for performance).
   */
  private static async processMigrationNoteContentOnly(note: Note): Promise<NoteMetadata> {
      // Save content separately
      await this.saveNoteContentDirectly(note);
      
      // Create metadata
      const { content, encryptedData, ...meta } = note;
      const newMeta: NoteMetadata = {
          ...meta,
          hasImage: content ? content.includes('<img') : false,
          hasAudio: content ? content.includes('<audio') : false,
          isEncrypted: !!encryptedData
      };
      
      return newMeta;
  }

  // --- Search Index Operations ---

  private static async getSearchIndex(): Promise<Record<string, string>> {
      if (this.searchCache) return this.searchCache;
      this.searchCache = (await localforage.getItem(SEARCH_INDEX_KEY)) || {};
      return this.searchCache!;
  }

  private static async updateSearchIndex(id: string, text: string, isEncrypted: boolean): Promise<void> {
      if (isEncrypted) {
          // Privacy: Do not index encrypted notes
          await this.removeFromSearchIndex(id);
          return;
      }
      // Mutex protected read-modify-write
      await this.searchIndexMutex.dispatch(async () => {
          const index = await this.getSearchIndex();
          index[id] = text.toLowerCase();
          await this.saveSearchIndex(index);
      });
  }

  private static async removeFromSearchIndex(id: string): Promise<void> {
      // Mutex protected read-modify-write
      await this.searchIndexMutex.dispatch(async () => {
          const index = await this.getSearchIndex();
          if (index[id] !== undefined) {
              delete index[id];
              await this.saveSearchIndex(index);
          }
      });
  }

  private static async saveSearchIndex(index: Record<string, string>): Promise<void> {
      this.searchCache = index;
      await localforage.setItem(SEARCH_INDEX_KEY, index);
  }

  static async search(query: string): Promise<string[]> {
      if (!query) return [];
      const lowerQuery = query.toLowerCase();
      // Mutex protected read to ensure consistency
      return await this.searchIndexMutex.dispatch(async () => {
          const index = await this.getSearchIndex();
          return Object.keys(index).filter(id => index[id] && index[id].includes(lowerQuery));
      });
  }

  // --- Metadata Operations ---

  static async getNotesMetadata(): Promise<NoteMetadata[]> {
    return (await localforage.getItem<NoteMetadata[]>(NOTES_INDEX_KEY)) || [];
  }

  static async saveNotesMetadata(notes: NoteMetadata[]): Promise<void> {
    await localforage.setItem(NOTES_INDEX_KEY, notes);
  }

  // --- Content Operations ---

  static async getNoteContent(id: string): Promise<string> {
      return (await localforage.getItem<string>(`${NOTE_CONTENT_PREFIX}${id}`)) || "";
  }

  static async getEncryptedData(id: string): Promise<string | null> {
      return await localforage.getItem<string>(`${NOTE_CONTENT_PREFIX}enc_${id}`);
  }

  static async getFullNote(id: string): Promise<Note | null> {
      const index = await this.getNotesMetadata();
      const meta = index.find(n => n.id === id);
      if (!meta) return null;

      const note: Note = { ...meta };
      if (meta.isEncrypted) {
          note.encryptedData = (await this.getEncryptedData(id)) || undefined;
      } else {
          note.content = await this.getNoteContent(id);
      }
      return note;
  }

  // --- Bulk Operations (Backup) ---

  static async getAllData(): Promise<BackupData> {
      const folders = await this.getFolders();
      const metadata = await this.getNotesMetadata();
      
      const activeMetadata = metadata.filter(m => !m.isTrashed);
      const notes: Note[] = [];
      
      const BATCH_SIZE = 50; 
      
      for (let i = 0; i < activeMetadata.length; i += BATCH_SIZE) {
          const batch = activeMetadata.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.all(
              batch.map(meta => this.getFullNote(meta.id))
          );
          
          batchResults.forEach(note => {
              if (note) notes.push(note);
          });
      }

      return {
          version: 1,
          createdAt: Date.now(),
          folders,
          notes
      };
  }

  static async restoreData(data: BackupData): Promise<void> {
      if (!data.notes || !Array.isArray(data.notes)) throw new Error("Invalid backup data");

      // Merge Folders
      const currentFolders = await this.getFolders();
      const newFolders = [...currentFolders];
      
      if (data.folders) {
          for (const f of data.folders) {
              if (!newFolders.find(nf => nf.id === f.id)) {
                  newFolders.push(f);
              }
          }
          await this.saveFolders(newFolders);
      }

      // Merge Notes
      for (const note of data.notes) {
          await this.saveNote(note);
      }
  }

  static async clearAllData(): Promise<void> {
      await localforage.clear();
      localStorage.clear();
  }

  // --- Combined Save Operation ---

  static async saveNote(note: Note, searchableText?: string): Promise<NoteMetadata> {
      console.log(`[StorageService] saveNote ${note.id} | Content defined: ${note.content !== undefined} | EncryptedData defined: ${note.encryptedData !== undefined}`);

      // 1. Prepare Metadata
      const { content, encryptedData, ...rest } = note;
      
      // Preserve existing flags unless new content forces calculation
      let hasImage = rest.hasImage;
      let hasAudio = rest.hasAudio;
      let isEncrypted = rest.isEncrypted;

      if (content !== undefined) {
          hasImage = content.includes('<img');
          hasAudio = content.includes('<audio');
      }

      // Determine encryption status based on payload presence
      if (encryptedData !== undefined) {
          isEncrypted = true;
      } else if (content !== undefined) {
          // If explicit content is provided, it implies plaintext
          isEncrypted = false;
      }
      // If both undefined (partial update), isEncrypted remains as passed in 'rest'

      const metadata: NoteMetadata = {
          ...rest,
          hasImage,
          hasAudio,
          isEncrypted: !!isEncrypted
      };

      // 2. Save Content (Separately)
      await this.saveNoteContentDirectly(note);

      // 3. Update Index (Protected by Mutex)
      await this.indexMutex.dispatch(async () => {
          const index = await this.getNotesMetadata();
          const existingIdx = index.findIndex(n => n.id === note.id);
          if (existingIdx >= 0) {
              index[existingIdx] = metadata;
          } else {
              index.unshift(metadata);
          }
          await this.saveNotesMetadata(index);
      });

      // 4. Update Search Index
      if (note.isEncrypted) {
          await this.removeFromSearchIndex(note.id);
      } else if (searchableText !== undefined) {
          await this.updateSearchIndex(note.id, searchableText, false);
      }

      return metadata;
  }

  private static async saveNoteContentDirectly(note: Note): Promise<void> {
      // CRITICAL: Only write to storage if content/data is strictly defined.
      if (note.encryptedData !== undefined) {
          await localforage.setItem(`${NOTE_CONTENT_PREFIX}enc_${note.id}`, note.encryptedData);
          await localforage.removeItem(`${NOTE_CONTENT_PREFIX}${note.id}`);
      } else if (note.content !== undefined) {
          await localforage.setItem(`${NOTE_CONTENT_PREFIX}${note.id}`, note.content);
          await localforage.removeItem(`${NOTE_CONTENT_PREFIX}enc_${note.id}`);
      }
  }

  static async deleteNote(id: string): Promise<void> {
      await this.indexMutex.dispatch(async () => {
          const index = await this.getNotesMetadata();
          const newIndex = index.filter(n => n.id !== id);
          await this.saveNotesMetadata(newIndex);
      });

      await localforage.removeItem(`${NOTE_CONTENT_PREFIX}${id}`);
      await localforage.removeItem(`${NOTE_CONTENT_PREFIX}enc_${id}`);
      await this.removeFromSearchIndex(id);
  }

  static async deleteNotes(ids: string[]): Promise<void> {
      console.log("[StorageService] deleteNotes", ids);
      try {
          await this.indexMutex.dispatch(async () => {
              const index = await this.getNotesMetadata();
              const newIndex = index.filter(n => !ids.includes(n.id));
              await this.saveNotesMetadata(newIndex);
          });

          await Promise.all(ids.map(async (id) => {
              await localforage.removeItem(`${NOTE_CONTENT_PREFIX}${id}`);
              await localforage.removeItem(`${NOTE_CONTENT_PREFIX}enc_${id}`);
              await this.removeFromSearchIndex(id);
          }));
          console.log("[StorageService] deleteNotes complete");
      } catch (e) {
          console.error("[StorageService] deleteNotes failed", e);
          throw e;
      }
  }

  // --- Folder Operations ---

  static async getFolders(): Promise<Folder[]> {
     return (await localforage.getItem<Folder[]>('folders')) || [];
  }

  static async saveFolders(folders: Folder[]): Promise<void> {
     await localforage.setItem('folders', folders);
  }

  // --- Media / Filesystem Operations ---

  static async saveMedia(base64Data: string): Promise<string> {
      try {
          const cleanData = base64Data.trim().replace(/[\n\r]/g, '');
          if (!cleanData.startsWith('data:')) return '';
          
          const commaIndex = cleanData.indexOf(',');
          if (commaIndex === -1) return '';
          
          const header = cleanData.substring(0, commaIndex);
          const rawData = cleanData.substring(commaIndex + 1);

          if (!header.includes(';base64')) return '';
          
          const mimeType = header.substring(5, header.indexOf(';'));
          let ext = 'bin';
          if (mimeType.includes('image/jpeg')) { ext = 'jpg'; }
          else if (mimeType.includes('image/png')) { ext = 'png'; }
          else if (mimeType.includes('image/gif')) { ext = 'gif'; }
          else if (mimeType.includes('audio/webm')) { ext = 'webm'; }
          else if (mimeType.includes('audio/mp3')) { ext = 'mp3'; }
          else if (mimeType.includes('audio/wav')) { ext = 'wav'; }

          const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${ext}`;

          await Filesystem.writeFile({
              path: fileName,
              data: rawData,
              directory: Directory.Data
          });
          return fileName;
      } catch (e) {
          console.error("[CloudPad Storage] Error saving media to filesystem", e);
          return '';
      }
  }

  private static async loadMediaAsBase64(fileName: string): Promise<string> {
      try {
          const file = await Filesystem.readFile({
              path: fileName,
              directory: Directory.Data
          });
          
          const ext = fileName.split('.').pop();
          let mime = 'application/octet-stream';
          if(ext === 'jpg') mime = 'image/jpeg';
          if(ext === 'png') mime = 'image/png';
          if(ext === 'gif') mime = 'image/gif';
          if(ext === 'webm') mime = 'audio/webm';
          if(ext === 'mp3') mime = 'audio/mp3';
          if(ext === 'wav') mime = 'audio/wav';
          
          return `data:${mime};base64,${file.data}`;
      } catch (e) {
          console.error(`[CloudPad Storage] Failed to load media ${fileName}`, e);
          return '';
      }
  }

  static async getMediaUrl(fileName: string): Promise<string> {
    try {
      const platform = Capacitor.getPlatform();
      
      if (platform === 'web') {
          return await this.loadMediaAsBase64(fileName);
      }

      const uriResult = await Filesystem.getUri({
        path: fileName,
        directory: Directory.Data
      });
      
      let uri = uriResult.uri;
      
      // FIX: Robustly handle Android file URI path resolution for WebViews
      // Check for common schemes to avoid double-prefixing or corrupting content URIs
      if (platform === 'android' && !uri.startsWith('file://') && !uri.startsWith('content://')) {
          // Ensure we have an absolute path structure
          // If uri starts with '/', prepending 'file://' makes it 'file:///...' (Correct)
          // If uri is relative (e.g. 'files/...'), prepending 'file:///' makes it 'file:///files/...' (Best guess/Correct)
          uri = uri.startsWith('/') ? `file://${uri}` : `file:///${uri}`;
      }

      // Convert native file path to WebView server URL (http://localhost/...)
      // This allows the WebView to load the file without loading it into JS memory
      const converted = Capacitor.convertFileSrc(uri);
      
      return converted;
    } catch (e) {
      console.error("[CloudPad Storage] Failed to get media URI", e);
      return ''; 
    }
  }

  static async deleteMedia(fileName: string): Promise<void> {
      try {
          await Filesystem.deleteFile({ path: fileName, directory: Directory.Data });
      } catch (e) {}
  }
}
