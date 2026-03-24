/**
 * Tests for AgenticFileSystem
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgenticFileSystem } from '../AgenticFileSystem';

// Mock logger
vi.mock('../../logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('AgenticFileSystem', () => {
  let afs: AgenticFileSystem;

  beforeEach(() => {
    afs = new AgenticFileSystem({ autoSurfaceEnabled: false });
  });

  // --- File Operations ---

  it('registers a file and retrieves it by ID', async () => {
    const file = await afs.registerFile('/src/main.ts', 'const x = 1;', { tags: ['typescript'] });
    expect(file.id).toBeDefined();
    expect(file.name).toBe('main.ts');

    const retrieved = afs.getFile(file.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.path).toBe('/src/main.ts');
  });

  it('retrieves a file by path', async () => {
    await afs.registerFile('/src/utils.ts', 'export function foo() {}');
    const file = afs.getFileByPath('/src/utils.ts');
    expect(file).toBeDefined();
    expect(file!.content).toContain('foo');
  });

  it('returns undefined for unknown file ID', () => {
    expect(afs.getFile('nonexistent')).toBeUndefined();
  });

  it('returns undefined for unknown file path', () => {
    expect(afs.getFileByPath('/nope.ts')).toBeUndefined();
  });

  it('registers a directory', () => {
    const dir = afs.registerDirectory('/src/components');
    expect(dir.type).toBe('DIRECTORY');
    expect(dir.name).toBe('components');
  });

  it('updates file content', async () => {
    const file = await afs.registerFile('/src/a.ts', 'old content');
    const updated = afs.updateFile(file.id, 'new content');
    expect(updated).toBe(true);

    const retrieved = afs.getFile(file.id);
    expect(retrieved!.content).toBe('new content');
    expect(retrieved!.metadata.size).toBe('new content'.length);
  });

  it('updateFile returns false for unknown file', () => {
    expect(afs.updateFile('fake', 'data')).toBe(false);
  });

  it('removes a file', async () => {
    const file = await afs.registerFile('/src/remove.ts', 'bye');
    expect(afs.removeFile(file.id)).toBe(true);
    expect(afs.getFile(file.id)).toBeUndefined();
  });

  it('removeFile returns false for unknown file', () => {
    expect(afs.removeFile('fake')).toBe(false);
  });

  // --- Search ---

  it('searches files by keyword from content', async () => {
    await afs.registerFile('/src/search.ts', 'function calculateTotal() { return 42; }');
    const results = afs.searchByKeyword('calculatetotal');
    expect(results.length).toBeGreaterThan(0);
  });

  it('searches files by tag', async () => {
    await afs.registerFile('/src/tagged.ts', 'data', { tags: ['important'] });
    const results = afs.searchByTag('important');
    expect(results).toHaveLength(1);
    expect(results[0].path).toBe('/src/tagged.ts');
  });

  it('semantic search returns ranked results', async () => {
    await afs.registerFile('/src/a.ts', 'machine learning algorithm implementation');
    await afs.registerFile('/src/b.ts', 'simple hello world');
    const results = await afs.semanticSearch('machine learning');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].path).toBe('/src/a.ts');
  });

  // --- Element Mapping ---

  it('maps and unmaps elements to files', async () => {
    const file = await afs.registerFile('/src/mapped.ts', 'data');
    afs.mapElementToFiles('btn-1', [file.id]);

    // Verify mapping works via surfaceForGaze
    const surfaced = await afs.surfaceForGaze({
      id: 'g1',
      centroid: { x: 0, y: 0 },
      duration: 2000,
      startTime: Date.now(),
      endTime: Date.now() + 2000,
      targetElement: 'btn-1',
    });
    expect(surfaced).toHaveLength(1);

    afs.unmapElement('btn-1');
    const surfacedAfter = await afs.surfaceForGaze({
      id: 'g2',
      centroid: { x: 0, y: 0 },
      duration: 2000,
      startTime: Date.now(),
      endTime: Date.now() + 2000,
      targetElement: 'btn-1',
    });
    expect(surfacedAfter).toHaveLength(0);
  });

  // --- Statistics ---

  it('returns correct stats', async () => {
    await afs.registerFile('/src/f1.ts', 'content 1');
    afs.registerDirectory('/src/dir');

    const stats = afs.getStats();
    expect(stats.totalFiles).toBe(2);
    expect(stats.totalDirectories).toBe(1);
  });

  // --- Surface Events ---

  it('records and retrieves surface events', async () => {
    const file = await afs.registerFile('/src/recent.ts', 'data');
    // Access the file first so it appears in the access log
    afs.getFile(file.id);
    afs.surfaceRecent(5);

    const events = afs.getSurfaceEvents();
    expect(events.length).toBeGreaterThan(0);
  });

  it('marks surface event as accepted', async () => {
    const file = await afs.registerFile('/src/accept.ts', 'data');
    // Access the file first so surfaceRecent can find it
    afs.getFile(file.id);
    afs.surfaceRecent(5);

    const events = afs.getSurfaceEvents();
    expect(events.length).toBeGreaterThan(0);
    const eventId = events[0].id;
    afs.markSurfaceEventAccepted(eventId, true);

    const updated = afs.getSurfaceEvents().find(e => e.id === eventId);
    expect(updated!.accepted).toBe(true);
  });

  // --- surfaceForGaze ---

  it('surfaceForGaze returns empty when no target element', async () => {
    const result = await afs.surfaceForGaze({
      id: 'g1',
      centroid: { x: 0, y: 0 },
      duration: 1000,
      startTime: Date.now(),
      endTime: Date.now() + 1000,
    });
    expect(result).toEqual([]);
  });

  // --- surfaceDependencies ---

  it('surfaces file dependencies', async () => {
    const dep = await afs.registerFile('/src/dep.ts', 'dependency code');
    const main = await afs.registerFile('/src/main.ts', 'import dep', {
      relatedFiles: ['/src/dep.ts'],
    });

    const deps = afs.surfaceDependencies(main.id);
    expect(deps).toHaveLength(1);
    expect(deps[0].id).toBe(dep.id);
  });

  it('surfaceDependencies returns empty for unknown file', () => {
    expect(afs.surfaceDependencies('fake')).toEqual([]);
  });
});
