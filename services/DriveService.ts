import { Note, UserProfile } from '../types';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

const FOLDER_NAME = 'CloudPad_Notes_App_Data';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const FILE_MIME = 'application/json';

export class DriveService {
  private gapiInited = false;
  private gisInited = false;
  private tokenClient: any = null;
  private accessToken: string | null = null;
  
  constructor() {}

  async init(apiKey: string, clientId: string): Promise<UserProfile | null> {
    console.log("[DEBUG] DriveService initializing on origin:", window.location.origin);

    return new Promise((resolve, reject) => {
      const gapi = (window as any).gapi;
      const google = (window as any).google;

      if (!gapi || !google) {
        console.warn("Google Scripts not loaded");
        resolve(null); 
        return;
      }

      gapi.load('client', async () => {
        try {
          // Initialize gapi.client with API key first
          await gapi.client.init({
            apiKey: apiKey,
          });

          // Load the Drive API using the name/version signature
          await new Promise((resolveLoad) => {
             gapi.client.load('drive', 'v3', resolveLoad);
          });
          
          this.gapiInited = true;
          let restoredUser: UserProfile | null = null;

          // Detect Environment: Web or Native
          if (Capacitor.isNativePlatform()) {
             // Native Initialization
             GoogleAuth.initialize({
                clientId: clientId,
                scopes: ['profile', 'email', 'https://www.googleapis.com/auth/drive.file'],
                grantOfflineAccess: true,
             });
             
             // Attempt to restore native session
             try {
                 const authResponse = await GoogleAuth.refresh();
                 if (authResponse && authResponse.accessToken) {
                     this.accessToken = authResponse.accessToken;
                     gapi.client.setToken({ access_token: this.accessToken });
                     
                     // Refresh returns Authentication object, not User object.
                     // We try to fetch user details from Drive API since we have a valid token.
                     try {
                         const aboutResp = await gapi.client.drive.about.get({ fields: 'user' });
                         const driveUser = aboutResp.result.user;
                         if (driveUser) {
                             restoredUser = {
                                 id: driveUser.permissionId || 'native-restored',
                                 name: driveUser.displayName || "User",
                                 email: driveUser.emailAddress || "Restored Session",
                                 imageUrl: driveUser.photoLink
                             };
                         }
                     } catch (profileErr) {
                         console.warn("Could not fetch user profile after refresh", profileErr);
                         restoredUser = {
                             id: 'native-restored',
                             name: 'Google User',
                             email: 'Session Restored',
                             imageUrl: undefined
                         };
                     }
                     
                     console.log("[DEBUG] Native session restored for:", restoredUser?.email);
                 }
             } catch (e) {
                 console.log("[DEBUG] No native session to restore", e);
             }
             
             resolve(restoredUser);
          } else {
             // Web Initialization (GIS)
             this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: 'https://www.googleapis.com/auth/drive.file',
                callback: (resp: any) => {
                  if (resp.error !== undefined) {
                    reject(resp);
                  }
                  this.accessToken = resp.access_token;
                  // Note: Web callback logic is handled in signIn, this is just init configuration
                  // We can't resolve the user here from the callback.
                },
             });
             this.gisInited = true;
             
             // Check for existing token in localStorage
             const storedToken = localStorage.getItem('gdrive_token');
             if (storedToken) {
                this.accessToken = storedToken;
                gapi.client.setToken({ access_token: storedToken });
                // We assume logged in, but don't have full profile details stored.
                // Return a placeholder that NotesContext can use to show "Logged In" state.
                restoredUser = { 
                    id: 'web-restored', 
                    name: 'Google User', 
                    email: 'Session Restored' 
                };
             }
             resolve(restoredUser);
          }
        } catch (err) {
          console.error("GAPI Init Error:", err);
          resolve(null); // Resolve null on error to allow app to continue offline
        }
      });
    });
  }

  async signIn(): Promise<UserProfile> {
    if (Capacitor.isNativePlatform()) {
        try {
            const user = await GoogleAuth.signIn();
            this.accessToken = user.authentication.accessToken;
            // IMPORTANT: Manually set the token for GAPI so subsequent Drive calls work
            (window as any).gapi.client.setToken({ access_token: this.accessToken });
            
            return {
                id: user.id,
                // user.displayName might not exist on the type depending on version, safely access it or fallback
                name: (user as any).displayName || user.givenName || "User",
                email: user.email,
                imageUrl: user.imageUrl
            };
        } catch (e) {
            console.error("Native Sign-In failed", e);
            throw e;
        }
    } else {
        if (!this.tokenClient) throw new Error("Token Client not initialized");
        return new Promise((resolve, reject) => {
            this.tokenClient.callback = (resp: any) => {
                if (resp.error) {
                    reject(resp);
                    return;
                }
                this.accessToken = resp.access_token;
                localStorage.setItem('gdrive_token', resp.access_token);
                // On web, we don't get the profile from the token response directly.
                // We'd need to call the People API or just return a dummy one for now.
                resolve({
                    id: 'web-user',
                    name: 'Google User',
                    email: 'Signed In'
                });
            }
            this.tokenClient.requestAccessToken({prompt: 'consent'});
        });
    }
  }

  async signOut() {
    if (Capacitor.isNativePlatform()) {
        await GoogleAuth.signOut();
        this.accessToken = null;
        (window as any).gapi.client.setToken(null);
    } else {
        const google = (window as any).google;
        if (google && this.accessToken) {
            google.accounts.oauth2.revoke(this.accessToken, () => {
                this.accessToken = null;
                localStorage.removeItem('gdrive_token');
                (window as any).gapi.client.setToken(null);
            });
        }
    }
  }

  // --- Real Sync Implementation ---

  async syncNotes(localNotes: Note[]): Promise<Note[]> {
    if (!this.accessToken) {
        console.warn("No access token, skipping sync");
        return localNotes;
    }

    try {
        const folderId = await this.getAppFolderId();
        const remoteFiles = await this.listRemoteFiles(folderId);
        
        const mergedNotes: Note[] = [...localNotes];
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
                    const content = await this.downloadNote(file.id);
                    if (content) mergedNotes.push({ ...content, isSynced: true });
                }
            } else {
                // Exists locally
                if (localNote.updatedAt > remoteModifiedTime) {
                    // Local is newer -> Upload
                    await this.updateRemoteNote(file.id, localNote);
                    mergedNotes[localNoteIndex].isSynced = true;
                } else if (remoteModifiedTime > localNote.updatedAt) {
                    // Remote is newer -> Download
                    const content = await this.downloadNote(file.id);
                    if (content) {
                        mergedNotes[localNoteIndex] = { ...content, isSynced: true };
                    }
                } else {
                    // In sync
                    mergedNotes[localNoteIndex].isSynced = true;
                }
            }
        }

        // 2. Process Local-only Files (Upload new notes)
        for (const note of mergedNotes) {
            if (!processedIds.has(note.id) && !note.isSynced) {
                await this.createRemoteNote(folderId, note);
                note.isSynced = true;
            }
        }

        return mergedNotes;

    } catch (e) {
        console.error("Sync Error:", e);
        // On error (e.g., token expired), return local notes unmodified
        if ((e as any).status === 401) {
            this.accessToken = null;
            if (!Capacitor.isNativePlatform()) {
                localStorage.removeItem('gdrive_token');
            }
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
            resource: {
                name: FOLDER_NAME,
                mimeType: FOLDER_MIME
            },
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
        media: {
            mimeType: FILE_MIME,
            body: fileContent
        }
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