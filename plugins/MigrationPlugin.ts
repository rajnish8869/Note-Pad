
import { registerPlugin } from '@capacitor/core';
import { Note } from '../types';

export interface MigrationPluginContract {
  /**
   * Starts the streaming migration process from Native layer.
   * This is asynchronous and emits 'onNotesBatch' events.
   */
  startLegacyMigration(): Promise<void>;

  /**
   * Acknowledges that the current batch has been processed and memory released.
   * Native layer will wait for this before sending the next batch.
   */
  ackBatch(): Promise<void>;

  addListener(eventName: 'onNotesBatch', listenerFunc: (data: { notes: Note[] }) => void): Promise<any>;
  addListener(eventName: 'onMigrationComplete', listenerFunc: () => void): Promise<any>;
  addListener(eventName: 'onMigrationError', listenerFunc: (error: { message: string }) => void): Promise<any>;
}

export const MigrationPlugin = registerPlugin<MigrationPluginContract>('MigrationPlugin');
