
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import localforage from 'localforage';
import { Note, NoteMetadata, Folder, BackupData } from '../types';

localforage.config({
  name: 'CloudPad',
  storeName: 'notes_db'
});

const NOTES_INDEX_KEY = 'notes_index';
const NOTE_CONTENT_PREFIX = 'note_content_';

export class StorageService {
  static async init(): Promise<void> {
    // 1. Migrate legacy "notes" array to split storage if exists
    const legacyNotes = await localforage.getItem<Note[]>('notes');
    if (legacyNotes && Array.isArray(legacyNotes)) {
        console.log("Migrating legacy notes to split storage...");
        const index: NoteMetadata[] = [];
        for (const note of legacyNotes) {
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
            index.push(newMeta);
        }
        await localforage.setItem(NOTES_INDEX_KEY, index);
        await localforage.removeItem('notes');
        console.log("Migration complete.");
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
      const notes: Note[] = [];

      // Sequentially load to avoid memory spikes, though parallel is faster
      for (const meta of metadata) {
          if (!meta.isTrashed) { // Don't backup trash? Or maybe optional. Backing up valid notes.
              const note = await this.getFullNote(meta.id);
              if (note) notes.push(note);
          }
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

  // --- Combined Save Operation ---

  static async saveNote(note: Note): Promise<NoteMetadata> {
      // 1. Prepare Metadata
      const { content, encryptedData, ...rest } = note;
      const metadata: NoteMetadata = {
          ...rest,
          hasImage: content ? content.includes('<img') : false,
          hasAudio: content ? content.includes('<audio') : false,
          isEncrypted: !!encryptedData
      };

      // 2. Save Content (Separately)
      await this.saveNoteContentDirectly(note);

      // 3. Update Index
      const index = await this.getNotesMetadata();
      const existingIdx = index.findIndex(n => n.id === note.id);
      if (existingIdx >= 0) {
          index[existingIdx] = metadata;
      } else {
          index.unshift(metadata);
      }
      await this.saveNotesMetadata(index);

      return metadata;
  }

  private static async saveNoteContentDirectly(note: Note): Promise<void> {
      if (note.encryptedData) {
          await localforage.setItem(`${NOTE_CONTENT_PREFIX}enc_${note.id}`, note.encryptedData);
          // Cleanup cleartext if exists
          await localforage.removeItem(`${NOTE_CONTENT_PREFIX}${note.id}`);
      } else {
          await localforage.setItem(`${NOTE_CONTENT_PREFIX}${note.id}`, note.content || "");
          // Cleanup encrypted if exists
          await localforage.removeItem(`${NOTE_CONTENT_PREFIX}enc_${note.id}`);
      }
  }

  static async deleteNote(id: string): Promise<void> {
      // Remove from index
      const index = await this.getNotesMetadata();
      const newIndex = index.filter(n => n.id !== id);
      await this.saveNotesMetadata(newIndex);

      // Remove content
      await localforage.removeItem(`${NOTE_CONTENT_PREFIX}${id}`);
      await localforage.removeItem(`${NOTE_CONTENT_PREFIX}enc_${id}`);
  }

  static async deleteNotes(ids: string[]): Promise<void> {
      console.log("[StorageService] deleteNotes", ids);
      try {
          // Remove from index
          const index = await this.getNotesMetadata();
          const newIndex = index.filter(n => !ids.includes(n.id));
          await this.saveNotesMetadata(newIndex);

          // Remove content (Parallel for performance)
          await Promise.all(ids.map(async (id) => {
              await localforage.removeItem(`${NOTE_CONTENT_PREFIX}${id}`);
              await localforage.removeItem(`${NOTE_CONTENT_PREFIX}enc_${id}`);
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
          // Robustly handle data URIs
          const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
          if (!matches || matches.length < 3) return ''; 
          
          const mimeType = matches[1];
          const rawData = matches[2];
          
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

  // Helper only for Web Platform
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
      
      // On Web, we must use base64 because we can't access native filesystem
      if (platform === 'web') {
          return await this.loadMediaAsBase64(fileName);
      }

      const uriResult = await Filesystem.getUri({
        path: fileName,
        directory: Directory.Data
      });
      
      let uri = uriResult.uri;
      
      // Ensure file protocol on Android
      if (platform === 'android' && !uri.startsWith('file://')) {
          uri = 'file://' + uri;
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
