
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { AppMode, ArtifactAnalysis, Message, UserProfile } from '../types';

// --- SCHEMA DEFINITION ---

interface NeuralVaultSchema extends DBSchema {
  // 1. Artifacts: Raw files and their AI analysis
  artifacts: {
    key: string; // uuid
    value: {
      id: string;
      name: string;
      type: string;
      data: Blob; // The raw file data
      analysis: ArtifactAnalysis | null;
      timestamp: number;
      tags: string[];
    };
    indexes: { 'by-date': number };
  };

  // 2. Snapshots: Complete state dumps for Time Travel
  snapshots: {
    key: number; // timestamp
    value: {
      timestamp: number;
      mode: AppMode;
      state: any; // e.g., ProcessState, HardwareState
      label: string; // "Auto-Save" or "Manual Checkpoint"
    };
    indexes: { 'by-mode': string };
  };

  // 3. Echoes: Chat histories
  echoes: {
    key: string; // threadId
    value: {
      id: string;
      mode: AppMode;
      title: string;
      messages: Message[];
      lastUpdated: number;
    };
    indexes: { 'by-mode': string };
  };

  // 4. VectorIndex: Placeholder for future embeddings
  vectors: {
    key: string; // chunkId
    value: {
      content: string;
      embedding: number[];
      sourceId: string;
    };
  };

  // 5. User Profile: Stores identity settings
  profile: {
      key: string; // "current_user"
      value: UserProfile;
  };
}

// --- SERVICE IMPLEMENTATION ---

class NeuralVaultService {
  private dbName = 'structura_neural_vault_v1';
  private db: Promise<IDBPDatabase<NeuralVaultSchema>>;

  constructor() {
    this.db = this.initDB();
  }

  private async initDB() {
    return openDB<NeuralVaultSchema>(this.dbName, 2, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Artifacts Store
        if (!db.objectStoreNames.contains('artifacts')) {
          const store = db.createObjectStore('artifacts', { keyPath: 'id' });
          store.createIndex('by-date', 'timestamp');
        }

        // Snapshots Store
        if (!db.objectStoreNames.contains('snapshots')) {
          const store = db.createObjectStore('snapshots', { keyPath: 'timestamp' });
          store.createIndex('by-mode', 'mode');
        }

        // Echoes Store
        if (!db.objectStoreNames.contains('echoes')) {
          const store = db.createObjectStore('echoes', { keyPath: 'id' });
          store.createIndex('by-mode', 'mode');
        }
        
        // Vector Store
        if (!db.objectStoreNames.contains('vectors')) {
            db.createObjectStore('vectors', { keyPath: 'key' });
        }

        // Profile Store (Added in V2)
        if (!db.objectStoreNames.contains('profile')) {
            db.createObjectStore('profile');
        }
      },
    });
  }

  // --- ARTIFACT METHODS ---

  async saveArtifact(file: File, analysis: ArtifactAnalysis | null): Promise<string> {
    const id = crypto.randomUUID();
    const db = await this.db;
    
    // Convert File to Blob for storage
    const blob = new Blob([file], { type: file.type });

    await db.put('artifacts', {
      id,
      name: file.name,
      type: file.type,
      data: blob,
      analysis,
      timestamp: Date.now(),
      tags: analysis?.classification ? [analysis.classification] : []
    });

    console.log(`[NeuralVault] Artifact Secured: ${file.name}`);
    return id;
  }

  async getArtifacts() {
    const db = await this.db;
    return db.getAllFromIndex('artifacts', 'by-date');
  }

  async getArtifactById(id: string) {
    const db = await this.db;
    return db.get('artifacts', id);
  }

  async updateArtifactTags(id: string, tags: string[]) {
      const db = await this.db;
      const artifact = await db.get('artifacts', id);
      if (artifact) {
          artifact.tags = [...new Set([...artifact.tags, ...tags])];
          await db.put('artifacts', artifact);
      }
  }

  async renameArtifact(id: string, newName: string) {
      const db = await this.db;
      const artifact = await db.get('artifacts', id);
      if (artifact) {
          artifact.name = newName;
          await db.put('artifacts', artifact);
      }
  }

  async deleteArtifact(id: string) {
      const db = await this.db;
      await db.delete('artifacts', id);
  }

  // --- SNAPSHOT METHODS (Time Travel) ---

  async createCheckpoint(mode: AppMode, state: any, label: string = "Manual Save") {
    const db = await this.db;
    const timestamp = Date.now();
    
    // Minimal compression (remove heavy binaries if needed, though IndexedDB handles large objects well)
    // We clone to avoid mutating the live state during serialization if there are any getters
    const cleanState = JSON.parse(JSON.stringify(state)); 

    await db.put('snapshots', {
      timestamp,
      mode,
      state: cleanState,
      label
    });
    
    console.log(`[NeuralVault] Snapshot Created: [${mode}] ${label}`);
  }

  async getHistory(mode: AppMode) {
    const db = await this.db;
    return db.getAllFromIndex('snapshots', 'by-mode', mode);
  }

  async restoreSnapshot(timestamp: number) {
      const db = await this.db;
      return db.get('snapshots', timestamp);
  }

  // --- ECHO METHODS (Chat Persistence) ---

  async saveThread(id: string, mode: AppMode, messages: Message[], title?: string) {
      const db = await this.db;
      const existing = await db.get('echoes', id);
      
      await db.put('echoes', {
          id,
          mode,
          title: title || existing?.title || `Session ${new Date().toLocaleTimeString()}`,
          messages,
          lastUpdated: Date.now()
      });
  }

  async getThreads(mode: AppMode) {
      const db = await this.db;
      return db.getAllFromIndex('echoes', 'by-mode', mode);
  }

  // --- USER PROFILE METHODS ---

  async saveProfile(profile: UserProfile) {
      const db = await this.db;
      await db.put('profile', profile, 'current_user');
      console.log('[NeuralVault] User Profile Updated');
  }

  async getProfile(): Promise<UserProfile | undefined> {
      const db = await this.db;
      return db.get('profile', 'current_user');
  }

  // --- SYSTEM METHODS ---

  async getStorageUsage() {
      if (navigator.storage && navigator.storage.estimate) {
          const estimate = await navigator.storage.estimate();
          return {
              used: (estimate.usage || 0) / 1024 / 1024, // MB
              quota: (estimate.quota || 0) / 1024 / 1024 // MB
          };
      }
      return null;
  }

  async wipeSystem() {
      const db = await this.db;
      await db.clear('artifacts');
      await db.clear('snapshots');
      await db.clear('echoes');
      await db.clear('profile');
      console.warn('[NeuralVault] SYSTEM WIPE COMPLETE. AMNESIA INDUCED.');
  }
}

export const neuralVault = new NeuralVaultService();
