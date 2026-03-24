// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockPut = vi.fn();
const mockGet = vi.fn();
const mockGetAll = vi.fn();
const mockGetAllFromIndex = vi.fn();
const mockDelete = vi.fn();
const mockClear = vi.fn();
const mockCreateObjectStore = vi.fn(() => ({
  createIndex: vi.fn(),
}));

const mockDb = {
  put: mockPut,
  get: mockGet,
  getAll: mockGetAll,
  getAllFromIndex: mockGetAllFromIndex,
  delete: mockDelete,
  clear: mockClear,
  objectStoreNames: {
    contains: vi.fn(() => false),
  },
  createObjectStore: mockCreateObjectStore,
};

const mockOpenDB = vi.fn().mockResolvedValue(mockDb);

vi.mock('idb', () => ({
  openDB: (...args: any[]) => mockOpenDB(...args),
}));

vi.mock('../../types', () => ({}));

const mockCosineSimilarity = vi.fn();
vi.mock('../persistence/vectorMath', () => ({
  cosineSimilarity: (...args: any[]) => mockCosineSimilarity(...args),
}));

// We need to re-import after mocks are set up
// The module creates a singleton on import, so we import dynamically
let neuralVault: any;

describe('NeuralVaultService (persistenceService)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockOpenDB.mockResolvedValue(mockDb);
    // Re-import to get the singleton
    const mod = await import('../persistenceService');
    neuralVault = mod.neuralVault;
  });

  describe('saveVector', () => {
    it('should save a vector with id, embedding, and metadata', async () => {
      const embedding = [0.1, 0.2, 0.3];
      const metadata = { source: 'test' };

      await neuralVault.saveVector('vec-1', embedding, metadata);

      expect(mockPut).toHaveBeenCalledWith('vectors', {
        id: 'vec-1',
        embedding,
        metadata,
      });
    });

    it('should save a vector without metadata', async () => {
      await neuralVault.saveVector('vec-2', [1, 2, 3]);

      expect(mockPut).toHaveBeenCalledWith('vectors', {
        id: 'vec-2',
        embedding: [1, 2, 3],
        metadata: undefined,
      });
    });
  });

  describe('searchVectors', () => {
    it('should return scored results sorted by similarity', async () => {
      mockGetAll.mockResolvedValue([
        { id: 'a', embedding: [1, 0] },
        { id: 'b', embedding: [0, 1] },
        { id: 'c', embedding: [0.5, 0.5] },
      ]);
      mockCosineSimilarity
        .mockReturnValueOnce(0.9)
        .mockReturnValueOnce(0.1)
        .mockReturnValueOnce(0.5);

      const results = await neuralVault.searchVectors([1, 0], 2);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ id: 'a', score: 0.9 });
      expect(results[1]).toEqual({ id: 'c', score: 0.5 });
    });

    it('should default limit to 5', async () => {
      const vectors = Array.from({ length: 10 }, (_, i) => ({
        id: `v${i}`,
        embedding: [i],
      }));
      mockGetAll.mockResolvedValue(vectors);
      mockCosineSimilarity.mockReturnValue(0.5);

      const results = await neuralVault.searchVectors([1]);

      expect(results).toHaveLength(5);
    });

    it('should handle empty vector store', async () => {
      mockGetAll.mockResolvedValue([]);

      const results = await neuralVault.searchVectors([1, 0]);

      expect(results).toEqual([]);
    });
  });

  describe('saveArtifact', () => {
    it('should save a blob artifact with generated id', async () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      const analysis = { entities: ['tag1', 'tag2'] } as any;

      vi.stubGlobal('crypto', {
        randomUUID: () => 'test-uuid-1234-5678',
      });

      const id = await neuralVault.saveArtifact(blob, analysis);

      expect(id).toBe('test-uuid-1234-5678');
      expect(mockPut).toHaveBeenCalledWith(
        'artifacts',
        expect.objectContaining({
          id: 'test-uuid-1234-5678',
          name: expect.stringContaining('Artifact_'),
          type: 'text/plain',
          analysis,
          tags: ['tag1', 'tag2'],
        })
      );
    });

    it('should handle null analysis with empty tags', async () => {
      const blob = new Blob(['data']);

      vi.stubGlobal('crypto', {
        randomUUID: () => 'uuid-null-analysis',
      });

      await neuralVault.saveArtifact(blob, null);

      expect(mockPut).toHaveBeenCalledWith(
        'artifacts',
        expect.objectContaining({
          analysis: null,
          tags: [],
        })
      );
    });
  });

  describe('getArtifact / getArtifacts', () => {
    it('should get a single artifact by id', async () => {
      mockGet.mockResolvedValue({ id: 'art-1', name: 'test' });

      const result = await neuralVault.getArtifact('art-1');

      expect(mockGet).toHaveBeenCalledWith('artifacts', 'art-1');
      expect(result).toEqual({ id: 'art-1', name: 'test' });
    });

    it('should get all artifacts sorted by date index', async () => {
      mockGetAllFromIndex.mockResolvedValue([{ id: '1' }, { id: '2' }]);

      const results = await neuralVault.getArtifacts();

      expect(mockGetAllFromIndex).toHaveBeenCalledWith('artifacts', 'by-date');
      expect(results).toHaveLength(2);
    });
  });

  describe('deleteArtifact', () => {
    it('should delete both artifact and associated vector', async () => {
      await neuralVault.deleteArtifact('art-1');

      expect(mockDelete).toHaveBeenCalledWith('artifacts', 'art-1');
      expect(mockDelete).toHaveBeenCalledWith('vectors', 'art-1');
    });
  });

  describe('createCheckpoint / getHistory', () => {
    it('should create a checkpoint with deep-cloned state', async () => {
      const state = { nested: { value: 42 } };

      await neuralVault.createCheckpoint('command' as any, state, 'Test Save');

      expect(mockPut).toHaveBeenCalledWith(
        'snapshots',
        expect.objectContaining({
          mode: 'command',
          state: { nested: { value: 42 } },
          label: 'Test Save',
        })
      );
    });

    it('should use default label when not provided', async () => {
      await neuralVault.createCheckpoint('command' as any, {});

      expect(mockPut).toHaveBeenCalledWith(
        'snapshots',
        expect.objectContaining({
          label: 'Manual Save',
        })
      );
    });

    it('should get history filtered by mode', async () => {
      mockGetAllFromIndex.mockResolvedValue([]);

      await neuralVault.getHistory('command' as any);

      expect(mockGetAllFromIndex).toHaveBeenCalledWith('snapshots', 'by-mode', 'command');
    });
  });

  describe('profile operations', () => {
    it('should save profile with current_user key', async () => {
      const profile = { name: 'Test User' } as any;

      await neuralVault.saveProfile(profile);

      expect(mockPut).toHaveBeenCalledWith('profile', profile, 'current_user');
    });

    it('should get profile by current_user key', async () => {
      mockGet.mockResolvedValue({ name: 'Test User' });

      const result = await neuralVault.getProfile();

      expect(mockGet).toHaveBeenCalledWith('profile', 'current_user');
      expect(result).toEqual({ name: 'Test User' });
    });
  });

  describe('generic key-value operations', () => {
    it('should get a value by key from profile store', async () => {
      mockGet.mockResolvedValue('some-value');

      const result = await neuralVault.get('my-key');

      expect(mockGet).toHaveBeenCalledWith('profile', 'my-key');
      expect(result).toBe('some-value');
    });

    it('should set a value by key in profile store', async () => {
      await neuralVault.set('my-key', { data: 123 });

      expect(mockPut).toHaveBeenCalledWith('profile', { data: 123 }, 'my-key');
    });

    it('should delete a key from profile store', async () => {
      await neuralVault.delete('my-key');

      expect(mockDelete).toHaveBeenCalledWith('profile', 'my-key');
    });
  });

  describe('wipeSystem', () => {
    it('should clear all stores', async () => {
      await neuralVault.wipeSystem();

      expect(mockClear).toHaveBeenCalledWith('artifacts');
      expect(mockClear).toHaveBeenCalledWith('snapshots');
      expect(mockClear).toHaveBeenCalledWith('echoes');
      expect(mockClear).toHaveBeenCalledWith('profile');
      expect(mockClear).toHaveBeenCalledWith('knowledge_layers');
      expect(mockClear).toHaveBeenCalledWith('vectors');
      expect(mockClear).toHaveBeenCalledWith('dynamic_tools');
      expect(mockClear).toHaveBeenCalledWith('agents');
      expect(mockClear).toHaveBeenCalledTimes(8);
    });
  });

  describe('agents', () => {
    it('should save an agent', async () => {
      const agent = { id: 'agent-1', name: 'Scout' } as any;

      await neuralVault.saveAgent(agent);

      expect(mockPut).toHaveBeenCalledWith('agents', agent);
    });

    it('should get all agents', async () => {
      mockGetAll.mockResolvedValue([{ id: 'a1' }, { id: 'a2' }]);

      const result = await neuralVault.getAgents();

      expect(mockGetAll).toHaveBeenCalledWith('agents');
      expect(result).toHaveLength(2);
    });
  });

  describe('knowledge layers', () => {
    it('should save a knowledge layer', async () => {
      const layer = { id: 'kl-1', data: 'test' } as any;

      await neuralVault.saveKnowledgeLayer(layer);

      expect(mockPut).toHaveBeenCalledWith('knowledge_layers', layer);
    });

    it('should get all knowledge layers', async () => {
      mockGetAll.mockResolvedValue([{ id: 'kl-1' }]);

      const result = await neuralVault.getKnowledgeLayers();

      expect(mockGetAll).toHaveBeenCalledWith('knowledge_layers');
      expect(result).toHaveLength(1);
    });
  });

  describe('dynamic tools', () => {
    it('should save a dynamic tool', async () => {
      await neuralVault.saveDynamicTool('tool-1', { name: 'test' }, 'return 42');

      expect(mockPut).toHaveBeenCalledWith(
        'dynamic_tools',
        expect.objectContaining({
          id: 'tool-1',
          manifest: { name: 'test' },
          code: 'return 42',
        })
      );
    });

    it('should get all dynamic tools', async () => {
      mockGetAll.mockResolvedValue([{ id: 't1' }]);

      const result = await neuralVault.getDynamicTools();

      expect(mockGetAll).toHaveBeenCalledWith('dynamic_tools');
      expect(result).toHaveLength(1);
    });
  });
});
