
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { StorageService } from './StorageService';
import { BackupData } from '../types';

/**
 * BackupService
 * Handles Import and Export of application data via JSON files.
 * Replaces previous DriveService functionality.
 */
export class BackupService {
  
  constructor() {}

  /**
   * Exports all app data to a JSON file and prompts user to share/save it.
   */
  async exportBackup(): Promise<void> {
    try {
        const data = await StorageService.getAllData();
        const jsonString = JSON.stringify(data, null, 2);
        
        const fileName = `cloudpad_backup_${new Date().toISOString().split('T')[0]}.json`;

        // Write to Cache directory first
        const result = await Filesystem.writeFile({
            path: fileName,
            data: jsonString,
            directory: Directory.Cache,
            encoding: Encoding.UTF8
        });

        // Share the file URL (Android handles this by allowing save to Drive/Files)
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
