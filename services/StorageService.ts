import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import localforage from 'localforage';
import { Note, Folder } from '../types';

localforage.config({
  name: 'CloudPad',
  storeName: 'notes_db'
});

export class StorageService {
  static async init(): Promise<void> {
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
          const parts = base64Data.split(',');
          if (parts.length < 2) return ''; 
          
          const header = parts[0];
          const rawData = parts[1];
          
          let ext = 'bin';
          
          if (header.includes('image/jpeg')) { ext = 'jpg'; }
          else if (header.includes('image/png')) { ext = 'png'; }
          else if (header.includes('image/gif')) { ext = 'gif'; }
          else if (header.includes('audio/webm')) { ext = 'webm'; }
          else if (header.includes('audio/mp3')) { ext = 'mp3'; }
          else if (header.includes('audio/wav')) { ext = 'wav'; }

          const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${ext}`;

          console.log(`[CloudPad Storage] Writing binary file: ${fileName} (Data Length: ${rawData.length})`);

          await Filesystem.writeFile({
              path: fileName,
              data: rawData,
              directory: Directory.Data
          });
          
          console.log(`[CloudPad Storage] File successfully written to disk: ${fileName}`);

          return fileName;
      } catch (e) {
          console.error("[CloudPad Storage] Error saving media to filesystem", e);
          return '';
      }
  }

  static async getFileSize(fileName: string): Promise<number> {
      try {
          const stat = await Filesystem.stat({
              path: fileName,
              directory: Directory.Data
          });
          return stat.size;
      } catch (e) {
          console.error("[CloudPad Storage] Error getting file stats", e);
          return 0;
      }
  }

  static async loadMedia(fileName: string): Promise<string> {
      try {
          // console.log(`[CloudPad Storage] Reading file from disk (Base64 fallback): ${fileName}`);
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
          
          // Filesystem.readFile returns the raw data string (base64) in `data`
          const dataUri = `data:${mime};base64,${file.data}`;
          return dataUri;
      } catch (e) {
          console.error(`[CloudPad Storage] Failed to load media ${fileName}`, e);
          return '';
      }
  }

  static async getMediaUrl(fileName: string): Promise<string> {
    try {
      const platform = Capacitor.getPlatform();
      
      // On Web, Filesystem operations are indexedDB based, convertFileSrc doesn't map to a real URL we can use in <img src>
      // We must load the data as Base64.
      if (platform === 'web') {
          return await this.loadMedia(fileName);
      }

      const uriResult = await Filesystem.getUri({
        path: fileName,
        directory: Directory.Data
      });
      
      let uri = uriResult.uri;
      
      // Fix for Android: Ensure file:// prefix exists before conversion
      if (platform === 'android' && !uri.startsWith('file://')) {
          uri = 'file://' + uri;
      }

      // Convert file:// to https:// via Capacitor to ensure Webview access
      const converted = Capacitor.convertFileSrc(uri);
      
      // Safety Check: If conversion failed to produce a web-accessible URL (http/https), 
      // fallback to Base64 to ensure the image still loads.
      if (platform === 'android' && !converted.startsWith('http')) {
           console.warn(`[CloudPad Storage] convertFileSrc returned native path: ${converted}. Falling back to Base64.`);
           return await this.loadMedia(fileName);
      }

      // console.log(`[CloudPad Storage] Generated Web Path for ${fileName}: ${converted}`);
      return converted;
    } catch (e) {
      console.error("[CloudPad Storage] Failed to get media URI, falling back to Base64", fileName, e);
      return await this.loadMedia(fileName);
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