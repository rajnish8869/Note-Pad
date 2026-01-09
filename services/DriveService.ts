
import { Note, NoteMetadata } from '../types';
import { StorageService } from './StorageService';

const FOLDER_NAME = 'CloudPad_Notes_App_Data';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const FILE_MIME = 'application/json';

export class DriveService {
  private gapiInited = false;
  private gisInited = false;
  private tokenClient: any = null;
  private accessToken: string | null = null;
  
  constructor() {}

  async init(apiKey: string, clientId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const gapi = (window as any).gapi;
      const google = (window as any).google;

      if (!gapi || !google) {
        console.warn("Google Scripts not loaded");
        resolve(); 
        return;
      }

      gapi.load('client', async () => {
        try {
          await gapi.client.init({ apiKey: apiKey });
          await new Promise((resolveLoad) => {
             gapi.client.load('drive', 'v3', resolveLoad);
          });
          
          this.gapiInited = true;

          this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: (resp: any) => {
              if (resp.error !== undefined) {
                reject(resp);
              }
              this.accessToken = resp.access_token;
              resolve();
            },
          });
          this.gisInited = true;
          const storedToken = localStorage.getItem('gdrive_token');
          if (storedToken) {
            this.accessToken = storedToken;
            gapi.client.setToken({ access_token: storedToken });
          }
          resolve();
        } catch (err) {
          console.error("GAPI Init Error:", err);
          reject(err);
        }
      });
    });
  }

  async signIn(): Promise<void> {
    if (!this.tokenClient) return;
    return new Promise((resolve, reject) => {
      this.tokenClient.callback = (resp: any) => {
        if (resp.error) { reject(resp); return; }
        this.accessToken = resp.access_token;
        localStorage.setItem('gdrive_token', resp.access_token);
        resolve();
      }
      this.tokenClient.requestAccessToken({prompt: 'consent'});
    });
  }

  async signOut() {
    const google = (window as any).google;
    if (google && this.accessToken) {
        google.accounts.oauth2.revoke(this.accessToken, () => {
            this.accessToken = null;
            localStorage.removeItem('gdrive_token');
            (window as any).gapi.client.setToken(null);
        });
    }
  }

  // --- Real Sync Implementation (Metadata Aware) ---

  async syncNotes(localNotes: NoteMetadata[]): Promise<NoteMetadata[]> {
    if (!this.accessToken) {
        console.warn("No access token, skipping sync");
        return localNotes;
    }

    try {
        const folderId = await this.getAppFolderId();
        const remoteFiles = await this.listRemoteFiles(folderId);
        
        let mergedNotes: NoteMetadata[] = [...localNotes];
        const processedIds = new Set<string>();

        // 1. Process Remote Files
        for (const file of remoteFiles) {
            const noteId = file.name.replace('.json', '');
            processedIds.add(noteId);
            
            const localNoteIndex = mergedNotes.findIndex(n => n.id === noteId);
            const localNote = localNoteIndex > -1 ? mergedNotes[localNoteIndex] : null;

            // Conflict Resolution: Latest Updated Wins
            const remoteModifiedTime = new Date(file.modifiedTime).getTime();

            if (!localNote) {
                // New remote note -> Download
                if (!file.trashed) {
                    const fullNote = await this.downloadNote(file.id);
                    if (fullNote) {
                        const meta = await StorageService.saveNote({ ...fullNote, isSynced: true });
                        mergedNotes.push(meta);
                    }
                }
            } else {
                // Exists locally
                if (localNote.updatedAt > remoteModifiedTime) {
                    // Local is newer -> Upload
                    // We must fetch full content to upload
                    const fullNote = await StorageService.getFullNote(localNote.id);
                    if (fullNote) {
                         await this.updateRemoteNote(file.id, fullNote);
                         // Update metadata to show synced
                         const newMeta = { ...localNote, isSynced: true };
                         await StorageService.saveNote({ ...fullNote, isSynced: true });
                         mergedNotes[localNoteIndex] = newMeta;
                    }
                } else if (remoteModifiedTime > localNote.updatedAt) {
                    // Remote is newer -> Download
                    const fullNote = await this.downloadNote(file.id);
                    if (fullNote) {
                        const meta = await StorageService.saveNote({ ...fullNote, isSynced: true });
                        mergedNotes[localNoteIndex] = meta;
                    }
                } else {
                    // In sync
                    if (!localNote.isSynced) {
                        mergedNotes[localNoteIndex] = { ...localNote, isSynced: true };
                        // Persist metadata update
                        // We don't have full note content here, so we just update metadata logic in context or bulk save later
                    }
                }
            }
        }

        // 2. Process Local-only Files (Upload new notes)
        for (const note of mergedNotes) {
            if (!processedIds.has(note.id) && !note.isSynced) {
                const fullNote = await StorageService.getFullNote(note.id);
                if (fullNote) {
                    await this.createRemoteNote(folderId, fullNote);
                    note.isSynced = true;
                    // Update storage
                    await StorageService.saveNote({ ...fullNote, isSynced: true });
                }
            }
        }
        
        // Save the updated metadata list to storage
        await StorageService.saveNotesMetadata(mergedNotes);

        return mergedNotes;

    } catch (e) {
        console.error("Sync Error:", e);
        if ((e as any).status === 401) {
            this.accessToken = null;
            localStorage.removeItem('gdrive_token');
        }
        throw e;
    }
  }

  private async getAppFolderId(): Promise<string> {
    const gapi = (window as any).gapi;
    const q = `mimeType = '${FOLDER_MIME}' and name = '${FOLDER_NAME}' and trashed = false`;
    const response = await gapi.client.drive.files.list({ q, fields: 'files(id)' });
    
    if (response.result.files.length > 0) {
        return response.result.files[0].id;
    } else {
        const createResp = await gapi.client.drive.files.create({
            resource: { name: FOLDER_NAME, mimeType: FOLDER_MIME },
            fields: 'id'
        });
        return createResp.result.id;
    }
  }

  private async listRemoteFiles(folderId: string): Promise<any[]> {
    const gapi = (window as any).gapi;
    const q = `'${folderId}' in parents and mimeType = '${FILE_MIME}' and trashed = false`;
    let files: any[] = [];
    let pageToken = null;
    do {
        const response: any = await gapi.client.drive.files.list({
            q,
            fields: 'nextPageToken, files(id, name, modifiedTime)',
            pageToken
        });
        files = files.concat(response.result.files);
        pageToken = response.result.nextPageToken;
    } while (pageToken);
    return files;
  }

  private async downloadNote(fileId: string): Promise<Note | null> {
    const gapi = (window as any).gapi;
    const response = await gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media'
    });
    return response.result as Note;
  }

  private async createRemoteNote(folderId: string, note: Note): Promise<void> {
    const gapi = (window as any).gapi;
    const fileContent = JSON.stringify(note);
    const fileMetadata = {
        name: `${note.id}.json`,
        parents: [folderId],
        mimeType: FILE_MIME
    };
    await gapi.client.drive.files.create({
        resource: fileMetadata,
        media: { mimeType: FILE_MIME, body: fileContent }
    });
  }

  private async updateRemoteNote(fileId: string, note: Note): Promise<void> {
    const gapi = (window as any).gapi;
    const fileContent = JSON.stringify(note);
    await gapi.client.request({
        path: `/upload/drive/v3/files/${fileId}`,
        method: 'PATCH',
        params: { uploadType: 'media' },
        body: fileContent
    });
  }
}
