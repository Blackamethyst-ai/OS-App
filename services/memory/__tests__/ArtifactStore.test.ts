/**
 * Tests for UnifiedArtifactStore
 */

import { describe, it, expect, vi } from 'vitest';
import { UnifiedArtifactStore } from '../ArtifactStore';

// Mock logger
vi.mock('../../logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('UnifiedArtifactStore', () => {
  it('returns provided files from getActiveArtifacts', async () => {
    const files = [
      { name: 'test.txt', inlineData: { mimeType: 'text/plain', data: btoa('hello') } },
    ];
    const store = new UnifiedArtifactStore(files as any);
    const result = await store.getActiveArtifacts();
    expect(result).toEqual(files);
  });

  it('returns empty array when constructed with no files', async () => {
    const store = new UnifiedArtifactStore([]);
    const result = await store.getActiveArtifacts();
    expect(result).toEqual([]);
  });

  it('returns calculator schema', async () => {
    const store = new UnifiedArtifactStore([]);
    const schema = await store.getSchema('calculator');
    expect(schema).toHaveProperty('name', 'calculator');
    expect(schema).toHaveProperty('parameters');
  });

  it('returns weather_api schema', async () => {
    const store = new UnifiedArtifactStore([]);
    const schema = await store.getSchema('weather_api');
    expect(schema).toHaveProperty('name', 'get_current_weather');
  });

  it('returns search_tool schema', async () => {
    const store = new UnifiedArtifactStore([]);
    const schema = await store.getSchema('search_tool');
    expect(schema).toHaveProperty('name', 'google_search');
  });

  it('returns empty object for unknown schema name', async () => {
    const store = new UnifiedArtifactStore([]);
    const schema = await store.getSchema('nonexistent');
    expect(schema).toEqual({});
  });
});
