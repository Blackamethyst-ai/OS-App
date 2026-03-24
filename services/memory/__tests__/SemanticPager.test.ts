/**
 * Tests for SemanticPager
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SemanticPager } from '../SemanticPager';

// Mock logger
vi.mock('../../logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('SemanticPager', () => {
  let pager: SemanticPager;

  beforeEach(() => {
    pager = new SemanticPager({ maxContextTokens: 10000, prefetchEnabled: false });
  });

  it('stores a page and retrieves stats', async () => {
    await pager.storePage('Hello world content', 'CONTEXT', { tags: ['test'] });
    const stats = pager.getStats();
    expect(stats.totalPages).toBe(1);
    expect(stats.totalTokens).toBeGreaterThan(0);
  });

  it('stores page with correct initial state WARM', async () => {
    const page = await pager.storePage('Some data', 'ARTIFACT');
    expect(page.state).toBe('WARM');
    expect(page.accessCount).toBe(1);
  });

  it('loads an existing page by ID', async () => {
    const stored = await pager.storePage('find me', 'MEMORY');
    const loaded = await pager.loadPage(stored.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.content).toBe('find me');
  });

  it('returns null and records page fault for missing page', async () => {
    const result = await pager.loadPage('nonexistent-id');
    expect(result).toBeNull();
    const faults = pager.getPageFaults();
    expect(faults.length).toBeGreaterThan(0);
    expect(faults[0].reason).toBe('NOT_FOUND');
  });

  it('removes a page', async () => {
    const page = await pager.storePage('remove me', 'CONTEXT');
    const removed = pager.removePage(page.id);
    expect(removed).toBe(true);
    const loaded = await pager.loadPage(page.id);
    expect(loaded).toBeNull();
  });

  it('removePage returns false for non-existent page', () => {
    expect(pager.removePage('fake-id')).toBe(false);
  });

  it('pins and unpins a page', async () => {
    const page = await pager.storePage('pin me', 'CONTEXT');
    expect(pager.pinPage(page.id)).toBe(true);

    const loaded = await pager.loadPage(page.id);
    expect(loaded!.state).toBe('PINNED');

    expect(pager.unpinPage(page.id)).toBe(true);
    const reloaded = await pager.loadPage(page.id);
    expect(reloaded!.state).toBe('HOT');
  });

  it('pinPage returns false for non-existent page', () => {
    expect(pager.pinPage('nope')).toBe(false);
  });

  it('unpinPage returns false for non-pinned page', async () => {
    const page = await pager.storePage('warm page', 'CONTEXT');
    expect(pager.unpinPage(page.id)).toBe(false);
  });

  it('promotes WARM page to HOT after threshold accesses', async () => {
    const pagerWithThreshold = new SemanticPager({
      maxContextTokens: 50000,
      hotPageThreshold: 3,
      prefetchEnabled: false,
    });
    const page = await pagerWithThreshold.storePage('hotify me', 'CONTEXT');
    // Access multiple times to hit threshold
    await pagerWithThreshold.loadPage(page.id);
    await pagerWithThreshold.loadPage(page.id);
    await pagerWithThreshold.loadPage(page.id);

    const loaded = await pagerWithThreshold.loadPage(page.id);
    expect(loaded!.state).toBe('HOT');
  });

  it('estimates tokens as content.length / 4', async () => {
    const content = 'a'.repeat(400); // 400 chars => 100 tokens
    const page = await pager.storePage(content, 'CONTEXT');
    expect(page.size).toBe(100);
  });

  it('evicts pages when context window is exceeded', async () => {
    // 10000 max tokens. Store pages until eviction happens.
    const smallPager = new SemanticPager({
      maxContextTokens: 100,
      prefetchEnabled: false,
    });

    await smallPager.storePage('a'.repeat(200), 'CONTEXT'); // 50 tokens
    await smallPager.storePage('b'.repeat(200), 'CONTEXT'); // 50 tokens
    // This should trigger eviction of the first page
    await smallPager.storePage('c'.repeat(200), 'CONTEXT'); // 50 tokens

    const stats = smallPager.getStats();
    expect(stats.totalTokens).toBeLessThanOrEqual(100);
  });

  it('getStats returns correct utilization', async () => {
    const smallPager = new SemanticPager({
      maxContextTokens: 1000,
      prefetchEnabled: false,
    });
    await smallPager.storePage('a'.repeat(400), 'CONTEXT'); // 100 tokens
    const stats = smallPager.getStats();
    expect(stats.utilization).toBeCloseTo(0.1, 1);
  });

  it('getPageFaults respects limit parameter', async () => {
    // Trigger multiple page faults
    await pager.loadPage('missing-1');
    await pager.loadPage('missing-2');
    await pager.loadPage('missing-3');

    const faults = pager.getPageFaults(2);
    expect(faults).toHaveLength(2);
  });
});
