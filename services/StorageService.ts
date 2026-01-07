import { Filesystem, Directory } from '@capacitor/filesystem';
import localforage from 'localforage';
import { Note, Folder } from '../types';

localforage.config({
  name: 'CloudPad',
  storeName: 'notes_db'
});

export class StorageService {
  static async init(): Promise<void> {
    // Check for migration from localStorage
    const oldNotes = localStorage.getItem('notes');
    if (oldNotes) {
      try {
        const notes = JSON.parse(oldNotes);
        await localforage.setItem('notes', notes);
        localStorage.removeItem('notes');
      } catch (e) {
        console.error("Migration failed", e);
      }
    }
    const oldFolders = localStorage.getItem('folders');
    if (oldFolders) {
       try {
         const folders = JSON.parse(oldFolders);
         await localforage.setItem('folders', folders);
         localStorage.removeItem('folders');
       } catch(e) {}
    }
  }

  static async getNotes(): Promise<Note[]> {
    return (await localforage.getItem<Note[]>('notes')) || [];
  }

  static async saveNotes(notes: Note[]): Promise<void> {
    await localforage.setItem('notes', notes);
  }

  static async getFolders(): Promise<Folder[]> {
     return (await localforage.getItem<Folder[]>('folders')) || [];
  }

  static async saveFolders(folders: Folder[]): Promise<void> {
     await localforage.setItem('folders', folders);
  }

  static async saveMedia(base64Data: string): Promise<string> {
      try {
          // Extract mime
          const match = base64Data.match(/^data:(.+);base64,(.+)$/);
          if (!match) return ''; 
          
          const mime = match[1];
          const rawData = match[2];
          let ext = 'bin';
          if (mime.includes('image/jpeg')) ext = 'jpg';
          else if (mime.includes('image/png')) ext = 'png';
          else if (mime.includes('image/gif')) ext = 'gif';
          else if (mime.includes('audio/webm')) ext = 'webm';
          else if (mime.includes('audio/mp3')) ext = 'mp3';
          else if (mime.includes('audio/wav')) ext = 'wav';

          const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${ext}`;

          await Filesystem.writeFile({
              path: fileName,
              data: rawData,
              directory: Directory.Data
          });

          return fileName;
      } catch (e) {
          console.error("Error saving media to filesystem", e);
          return '';
      }
  }

  static async loadMedia(fileName: string): Promise<string> {
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
          console.error("Failed to load media", fileName, e);
          return '';
      }
  }

  static async deleteMedia(fileName: string): Promise<void> {
      try {
          await Filesystem.deleteFile({
              path: fileName,
              directory: Directory.Data
          });
      } catch (e) {
          // Ignore if file doesn't exist
      }
  }
}