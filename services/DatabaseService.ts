import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Note, Folder } from '../types';

export class DatabaseService {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private dbName = 'cloudpad_db';
  // Singleton promise to prevent race conditions during strict mode or rapid re-renders
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  async init(): Promise<void> {
    // Return existing promise if initialization is already in progress or done
    if (this.initPromise) {
        return this.initPromise;
    }

    this.initPromise = this.initializeDb();
    return this.initPromise;
  }

  private async initializeDb(): Promise<void> {
    try {
      // 1. Web Specific Initialization
      if (Capacitor.getPlatform() === 'web') {
          // The jeep-sqlite element is injected in index.tsx
          // We assume it's there and ready.
          
          // Initialize WebStore
          await this.sqlite.initWebStore();
          console.log('✅ SQLite WebStore initialized');
      }

      // 2. Create/Retrieve Connection
      const isConn = (await this.sqlite.isConnection(this.dbName, false)).result;
      
      if (isConn) {
          this.db = await this.sqlite.retrieveConnection(this.dbName, false);
      } else {
          this.db = await this.sqlite.createConnection(
            this.dbName,
            false,
            'no-encryption',
            1,
            false
          );
      }

      // 3. Open Database
      await this.db.open();
      console.log('✅ Database opened successfully');

      // 4. Define Schema
      const schema = `
        CREATE TABLE IF NOT EXISTS notes (
          id TEXT PRIMARY KEY,
          title TEXT,
          content TEXT,
          plainTextPreview TEXT,
          createdAt INTEGER,
          updatedAt INTEGER,
          isPinned INTEGER,
          isSynced INTEGER DEFAULT 0,
          isTrashed INTEGER DEFAULT 0,
          deletedAt INTEGER,
          color TEXT,
          folderId TEXT,
          tags TEXT,
          location TEXT,
          isLocked INTEGER DEFAULT 0,
          lockMode TEXT,
          security TEXT,
          isIncognito INTEGER DEFAULT 0,
          encryptedData TEXT
        );
        CREATE TABLE IF NOT EXISTS folders (
          id TEXT PRIMARY KEY,
          name TEXT,
          createdAt INTEGER
        );
      `;

      await this.db.execute(schema);
      
      if (Capacitor.getPlatform() === 'web') {
          await this.sqlite.saveToStore(this.dbName);
      }

    } catch (e) {
      console.error('Database init failed:', e);
      // Reset init promise on failure so we can retry if needed
      this.initPromise = null;
      throw e;
    }
  }

  // --- Notes CRUD ---

  async getNotes(): Promise<Note[]> {
    if (!this.db) return [];
    try {
        const query = 'SELECT * FROM notes ORDER BY updatedAt DESC';
        const result = await this.db.query(query);
        return (result.values || []).map(this.mapRowToNote);
    } catch (e) {
        console.warn("Error fetching notes", e);
        return [];
    }
  }

  async addNote(note: Note): Promise<void> {
    if (!this.db) return;
    try {
        const stmt = `INSERT INTO notes (id, title, content, plainTextPreview, createdAt, updatedAt, isPinned, isSynced, isTrashed, deletedAt, color, folderId, tags, location, isLocked, lockMode, security, isIncognito, encryptedData) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
        await this.db.run(stmt, this.mapNoteToParams(note));
        if (Capacitor.getPlatform() === 'web') await this.sqlite.saveToStore(this.dbName);
    } catch(e) { console.error("DB Add Error", e); }
  }

  async updateNote(note: Note): Promise<void> {
    if (!this.db) return;
    try {
        const stmt = `
          UPDATE notes SET 
          title=?, content=?, plainTextPreview=?, createdAt=?, updatedAt=?, isPinned=?, isSynced=?, isTrashed=?, deletedAt=?, color=?, folderId=?, tags=?, location=?, isLocked=?, lockMode=?, security=?, isIncognito=?, encryptedData=?
          WHERE id=?
        `;
        const params = [...this.mapNoteToParams(note)];
        const id = params.shift(); // remove id from start
        params.push(id); // add id to end
        
        await this.db.run(stmt, params);
        if (Capacitor.getPlatform() === 'web') await this.sqlite.saveToStore(this.dbName);
    } catch(e) { console.error("DB Update Error", e); }
  }

  async deleteNote(id: string): Promise<void> {
    if (!this.db) return;
    try {
        await this.db.run('DELETE FROM notes WHERE id=?', [id]);
        if (Capacitor.getPlatform() === 'web') await this.sqlite.saveToStore(this.dbName);
    } catch(e) { console.error("DB Delete Error", e); }
  }

  // --- Folders CRUD ---

  async getFolders(): Promise<Folder[]> {
    if (!this.db) return [];
    try {
        const result = await this.db.query('SELECT * FROM folders');
        return result.values as Folder[];
    } catch (e) {
        return [];
    }
  }

  async addFolder(folder: Folder): Promise<void> {
    if (!this.db) return;
    try {
        await this.db.run('INSERT INTO folders (id, name, createdAt) VALUES (?,?,?)', [folder.id, folder.name, folder.createdAt]);
        if (Capacitor.getPlatform() === 'web') await this.sqlite.saveToStore(this.dbName);
    } catch(e) { console.error("DB Add Folder Error", e); }
  }

  // --- Mappers ---

  private mapRowToNote(row: any): Note {
    return {
      ...row,
      isPinned: !!row.isPinned,
      isSynced: !!row.isSynced,
      isTrashed: !!row.isTrashed,
      isLocked: !!row.isLocked,
      isIncognito: !!row.isIncognito,
      tags: row.tags ? JSON.parse(row.tags) : [],
      location: row.location ? JSON.parse(row.location) : undefined,
      security: row.security ? JSON.parse(row.security) : undefined,
    };
  }

  private mapNoteToParams(note: Note): any[] {
    return [
      note.id,
      note.title,
      note.content,
      note.plainTextPreview,
      note.createdAt,
      note.updatedAt,
      note.isPinned ? 1 : 0,
      note.isSynced ? 1 : 0,
      note.isTrashed ? 1 : 0,
      note.deletedAt || null,
      note.color,
      note.folderId || null,
      JSON.stringify(note.tags || []),
      note.location ? JSON.stringify(note.location) : null,
      note.isLocked ? 1 : 0,
      note.lockMode || null,
      note.security ? JSON.stringify(note.security) : null,
      note.isIncognito ? 1 : 0,
      note.encryptedData || null
    ];
  }
}

export const dbService = new DatabaseService();