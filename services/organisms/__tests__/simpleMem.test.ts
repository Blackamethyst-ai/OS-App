/**
 * Tests for SimpleMem 3-Stage Pipeline
 *
 * Validates the SimpleMem singleton and its core functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SimpleMem } from '../cognitive/simpleMem';
import type { RawEpisode } from '../cognitive/simpleMem';

describe('SimpleMem', () => {
  beforeEach(() => {
    // Reset singleton for each test
    (SimpleMem as unknown as { instance: null }).instance = null;
  });

  describe('initialization', () => {
    it('should create singleton instance', () => {
      const mem = SimpleMem.getInstance();
      expect(mem).toBeInstanceOf(SimpleMem);
    });

    it('should return same instance on multiple calls', () => {
      const mem1 = SimpleMem.getInstance();
      const mem2 = SimpleMem.getInstance();
      expect(mem1).toBe(mem2);
    });
  });

  describe('Stage 1: Compression', () => {
    it('should expose compress method', () => {
      const mem = SimpleMem.getInstance();
      expect(typeof mem.compress).toBe('function');
    });

    it('should compress episodes', async () => {
      const mem = SimpleMem.getInstance();

      const episode: RawEpisode = {
        id: 'test-raw-1',
        type: 'interaction',
        source: 'agent',
        content: 'Test content for compression',
        timestamp: Date.now(),
      };

      const compressed = await mem.compress(episode);
      expect(compressed).toBeDefined();
      expect(compressed.id).toBe('test-raw-1');
    });
  });

  describe('Stage 2: Synthesis', () => {
    it('should expose synthesize method', () => {
      const mem = SimpleMem.getInstance();
      expect(typeof mem.synthesize).toBe('function');
    });
  });

  describe('Stage 3: Retrieval', () => {
    it('should expose retrieve method', () => {
      const mem = SimpleMem.getInstance();
      expect(typeof mem.retrieve).toBe('function');
    });

    it('should retrieve episodes by query', async () => {
      const mem = SimpleMem.getInstance();

      // First add an episode
      await mem.compress({
        id: 'retrieval-test',
        type: 'interaction',
        source: 'agent',
        content: 'TypeScript implementation task',
        timestamp: Date.now(),
      });

      // retrieve takes (query, intent) - use type assertion for test
      const results = mem.retrieve(
        { query: 'TypeScript', limit: 5 },
        { type: 'semantic' } as any
      );

      expect(results).toBeDefined();
      expect(results.results).toBeDefined();
      expect(results.metadata).toBeDefined();
    });
  });

  describe('metrics', () => {
    it('should expose getMetrics method', () => {
      const mem = SimpleMem.getInstance();
      expect(typeof mem.getMetrics).toBe('function');
    });

    it('should return metrics', () => {
      const mem = SimpleMem.getInstance();
      const metrics = mem.getMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.compression).toBeDefined();
      expect(metrics.retrieval).toBeDefined();
    });
  });
});
