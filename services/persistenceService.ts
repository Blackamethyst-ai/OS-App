import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { AppMode, ArtifactAnalysis, Message, UserProfile, KnowledgeLayer } from '../types';
import { cosineSimilarity } from '../utils/vector';

// --- SCHEMA DEFINITION ---

interface NeuralVaultSchema extends DBSchema {
  artifacts: {
    key: string; 
    value: {
      id: string;
      name: string;
      type: string;
      data: Blob;
      analysis: ArtifactAnalysis | null;
      timestamp: number;
      tags: string[];
    };
    indexes: { 'by-date': number };
  };

  snapshots: {
    key: number; 
    value: {
      timestamp: number;
      mode: AppMode;
      state: any;
      label: string;
    };
    indexes: { 'by-mode': string };
  };

  echoes: {
    key: string; 
    value: {
      id: string;
      mode: AppMode;
      title: string;
      messages: Message[];
      lastUpdated: number;
    };
    indexes: { 'by-mode': string };
  };

  vectors: {
    key: string; 
    value: {
      id: string;
      embedding: number[];
      metadata?: any;
    };
  };

  profile: {
      key: string; 
      value: UserProfile;
  };

  knowledge_layers: {
      key: string; 
      value: KnowledgeLayer;
  };
}

class NeuralVaultService {
  private dbName = 'structura_neural_vault_v1';
  private db: Promise<IDBPDatabase<NeuralVaultSchema>>;
  private layersPromise: Promise<KnowledgeLayer[]> | null = null;

  constructor() {
    this.db = this.initDB();
  }

  private async initDB() {
    return openDB<NeuralVaultSchema>(this.dbName, 3, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (!db.objectStoreNames.contains('artifacts')) {
          const store = db.createObjectStore('artifacts', { keyPath: 'id' });
          store.createIndex('by-date', 'timestamp');
        }
        if (!db.objectStoreNames.contains('snapshots')) {
          const store = db.createObjectStore('snapshots', { keyPath: 'timestamp' });
          store.createIndex('by-mode', 'mode');
        }
        if (!db.objectStoreNames.contains('echoes')) {
          const store = db.createObjectStore('echoes', { keyPath: 'id' });
          store.createIndex('by-mode', 'mode');
        }
        if (!db.objectStoreNames.contains('vectors')) {
            db.createObjectStore('vectors', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('profile')) {
            db.createObjectStore('profile');
        }
        if (!db.objectStoreNames.contains('knowledge_layers')) {
            db.createObjectStore('knowledge_layers', { keyPath: 'id' });
        }
      },
    });
  }

  async saveVector(id: string, embedding: number[], metadata?: any) {
      const db = await this.db;
      await db.put('vectors', { id, embedding, metadata });
  }

  async searchVectors(queryEmbedding: number[], limit: number = 5): Promise<{id: string, score: number}[]> {
      const db = await this.db;
      const allVectors = await db.getAll('vectors');
      
      const scoredResults = allVectors.map(v => ({
          id: v.id,
          score: cosineSimilarity(queryEmbedding, v.embedding)
      }));

      return scoredResults
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
  }

  async saveArtifact(file: File, analysis: ArtifactAnalysis | null): Promise<string> {
    const id = crypto.randomUUID();
    const db = await this.db;
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
    return id;
  }

  async getArtifacts() {
    const db = await this.db;
    return db.getAllFromIndex('artifacts', 'by-date');
  }

  async deleteArtifact(id: string) {
      const db = await this.db;
      await db.delete('artifacts', id);
      await db.delete('vectors', id);
  }

  async createCheckpoint(mode: AppMode, state: any, label: string = "Manual Save") {
    const db = await this.db;
    const timestamp = Date.now();
    const cleanState = JSON.parse(JSON.stringify(state)); 
    await db.put('snapshots', { timestamp, mode, state: cleanState, label });
  }

  async getHistory(mode: AppMode) {
    const db = await this.db;
    return db.getAllFromIndex('snapshots', 'by-mode', mode);
  }

  async saveProfile(profile: UserProfile) {
      const db = await this.db;
      await db.put('profile', profile, 'current_user');
  }

  async getProfile(): Promise<UserProfile | undefined> {
      const db = await this.db;
      return db.get('profile', 'current_user');
  }

  async getKnowledgeLayers(): Promise<KnowledgeLayer[]> {
      const db = await this.db;
      return db.getAll('knowledge_layers');
  }

  async saveKnowledgeLayer(layer: KnowledgeLayer) {
      const db = await this.db;
      await db.put('knowledge_layers', layer);
      this.layersPromise = null;
  }

  async wipeSystem() {
      const db = await this.db;
      await db.clear('artifacts');
      await db.clear('snapshots');
      await db.clear('echoes');
      await db.clear('profile');
      await db.clear('knowledge_layers');
      await db.clear('vectors');
  }
}

export const neuralVault = new NeuralVaultService();
