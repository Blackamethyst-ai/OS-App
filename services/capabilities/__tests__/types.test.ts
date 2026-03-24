/**
 * Types Unit Tests
 *
 * Tests for type guards and utility functions in types.ts
 */

import { describe, it, expect } from 'vitest';
import {
  complexityToCPBPath,
  isTabCapability,
  isActionCapability,
  isNavigationCapability,
} from '../types';
import type { Capability, TabCapability } from '../types';

function createBaseCap(overrides: Partial<Capability> = {}): Capability {
  return {
    id: 'test',
    kind: 'action',
    description: 'Test',
    source: 'core',
    complexity: 'simple',
    priority: 50,
    sectors: [],
    executionPath: 'direct',
    handler: async () => ({ success: true }),
    ...overrides,
  };
}

describe('complexityToCPBPath', () => {
  it('should map simple to direct', () => {
    expect(complexityToCPBPath('simple')).toBe('direct');
  });

  it('should map navigation to direct', () => {
    expect(complexityToCPBPath('navigation')).toBe('direct');
  });

  it('should map analysis to ace', () => {
    expect(complexityToCPBPath('analysis')).toBe('ace');
  });

  it('should map architecture to hybrid', () => {
    expect(complexityToCPBPath('architecture')).toBe('hybrid');
  });

  it('should map critical to cascade', () => {
    expect(complexityToCPBPath('critical')).toBe('cascade');
  });

  it('should return auto for unknown complexity', () => {
    // Cast to bypass type-checking for edge-case test
    expect(complexityToCPBPath('unknown' as any)).toBe('auto');
  });
});

describe('isTabCapability', () => {
  it('should return true for tab capabilities with tabKey', () => {
    const tabCap: TabCapability = {
      ...createBaseCap({ kind: 'tab' }),
      kind: 'tab',
      tabKey: 'overview',
      tabLabel: 'Overview',
      sectorMode: 'DASHBOARD',
    };
    expect(isTabCapability(tabCap)).toBe(true);
  });

  it('should return false for non-tab capabilities', () => {
    const actionCap = createBaseCap({ kind: 'action' });
    expect(isTabCapability(actionCap)).toBe(false);
  });

  it('should return false for tab kind without tabKey', () => {
    const cap = createBaseCap({ kind: 'tab' });
    expect(isTabCapability(cap)).toBe(false);
  });
});

describe('isActionCapability', () => {
  it('should return true for action kind', () => {
    expect(isActionCapability(createBaseCap({ kind: 'action' }))).toBe(true);
  });

  it('should return false for non-action kind', () => {
    expect(isActionCapability(createBaseCap({ kind: 'tab' }))).toBe(false);
    expect(isActionCapability(createBaseCap({ kind: 'navigation' }))).toBe(false);
    expect(isActionCapability(createBaseCap({ kind: 'tool' }))).toBe(false);
  });
});

describe('isNavigationCapability', () => {
  it('should return true for navigation kind', () => {
    expect(isNavigationCapability(createBaseCap({ kind: 'navigation' }))).toBe(true);
  });

  it('should return true for tab kind', () => {
    expect(isNavigationCapability(createBaseCap({ kind: 'tab' }))).toBe(true);
  });

  it('should return false for action kind', () => {
    expect(isNavigationCapability(createBaseCap({ kind: 'action' }))).toBe(false);
  });

  it('should return false for tool kind', () => {
    expect(isNavigationCapability(createBaseCap({ kind: 'tool' }))).toBe(false);
  });
});
