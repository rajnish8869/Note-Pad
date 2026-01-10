
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { StorageService } from './StorageService';
import { BackupData, Note } from '../types';

/**
 * BackupService
 * Handles Import and Export of application data via JSON files.
 * Replaces previous DriveService functionality.
 */
export class BackupService {
  
  constructor() {}

  /**
   * Exports all app data to a JSON file and prompts user to share/save it.
   * Uses streaming approach to prevent OOM on large datasets.
   */
  async exportBackup(): Promise<void> {
    try {
        const fileName = `cloudpad_backup_${new Date().toISOString().split('T')[0]}.json`;
        
        // 1. Fetch Metadata and Folders (Lightweight)
        const folders = await StorageService.getFolders();
        const metadata = await StorageService.getNotesMetadata();
        const activeMetadata = metadata.filter(m => !m.isTrashed);

        // 2. Write Header (Start of JSON object)
        // Manually construct the JSON structure to allow appending
        const headerObj = {
            version: 1,
            createdAt: Date.now(),
            folders: folders
        };
        
        // Create header string, remove the last closing brace '}' to append "notes" array
        let headerString = JSON.stringify(headerObj, null, 2);
        headerString = headerString.trim().replace(/\}$/, '');
        headerString += ',\n  "notes": [\n';

        // Write initial file (overwrite if exists)
        await Filesystem.writeFile({
            path: fileName,
            data: headerString,
            directory: Directory.Cache,
            encoding: Encoding.UTF8
        });

        // 3. Stream Notes in Batches
        const BATCH_SIZE = 10; // Small batch size to keep memory usage low
        let hasWrittenNote = false;

        for (let i = 0; i < activeMetadata.length; i += BATCH_SIZE) {
            const batchMeta = activeMetadata.slice(i, i + BATCH_SIZE);
            
            // Fetch content for current batch only
            // Avoids StorageService.getFullNote() to prevent repeated index reads
            const batchNotes = await Promise.all(batchMeta.map(async (meta) => {
                const note: Note = { ...meta };
                
                if (meta.isEncrypted) {
                    const encData = await StorageService.getEncryptedData(meta.id);
                    if (encData) note.encryptedData = encData;
                } else {
                    // Fetch plain content
                    note.content = await StorageService.getNoteContent(meta.id);
                }
                return note;
            }));

            // Construct batch string
            let batchString = "";
            for (const note of batchNotes) {
                if (hasWrittenNote) {
                    batchString += ",\n";
                }
                batchString += JSON.stringify(note, null, 2);
                hasWrittenNote = true;
            }

            // Append batch to file
            if (batchString.length > 0) {
                await Filesystem.appendFile({
                    path: fileName,
                    data: batchString,
                    directory: Directory.Cache,
                    encoding: Encoding.UTF8
                });
            }
            
            // Help GC
            batchNotes.length = 0;
        }

        // 4. Close JSON Structure
        await Filesystem.appendFile({
            path: fileName,
            data: '\n  ]\n}',
            directory: Directory.Cache,
            encoding: Encoding.UTF8
        });

        // 5. Share the file
        const result = await Filesystem.getUri({
            path: fileName,
            directory: Directory.Cache
        });

        // Android handles this by allowing save to Drive/Files via Share Sheet
        await Share.share({
            title: 'CloudPad Backup',
            text: 'Backup of your notes',
            url: result.uri,
            dialogTitle: 'Save Backup To...'
        });

    } catch (e) {
        console.error("Export Failed:", e);
        throw new Error("Failed to export backup.");
    }
  }

  /**
   * Imports data from a JSON string.
   * Note: The file reading is handled by the UI (HTML Input) to ensure cross-platform compatibility without heavy plugins.
   */
  async importBackup(jsonString: string): Promise<void> {
      try {
          const data: BackupData = JSON.parse(jsonString);
          
          if (!data.notes || !Array.isArray(data.notes)) {
              throw new Error("Invalid backup format");
          }

          await StorageService.restoreData(data);
          
      } catch (e) {
          console.error("Import Failed:", e);
          throw new Error("Failed to import backup. Invalid file.");
      }
  }
}
