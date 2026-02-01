/**
 * Epoch Integration Tests
 *
 * Tests for SystemMind epoch synchronization with Capabilities Registry
 * Implements US-001: Add SystemMind Epoch Sync to Capabilities Registry
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerCapability,
  unregisterCapability,
  clearRegistry,
} from '../registry';
import { useSystemMind } from '../../../stores/useSystemMind';
import type { Capability } from '../types';

// Create a test capability
function createTestCapability(overrides?: Partial<Capability>): Capability {
  return {
    id: 'test_capability',
    kind: 'action',
    description: 'Test capability for epoch integration',
    complexity: 'simple',
    executionPath: 'direct',
    source: 'core',
    sectors: [],
    priority: 50,
    handler: async () => ({ success: true }),
    ...overrides,
  };
}

describe('Epoch Integration', () => {
  beforeEach(() => {
    // Clear registry before each test
    clearRegistry();
    // Reset SystemMind state
    useSystemMind.setState({
      epoch: 0,
      lastEpochChange: 0,
      lastEpochReason: null,
      actionRegistry: {},
    });
  });

  it('increments epoch when capability is registered', () => {
    const beforeEpoch = useSystemMind.getState().epoch;

    registerCapability(createTestCapability());

    const afterEpoch = useSystemMind.getState().epoch;
    expect(afterEpoch).toBeGreaterThan(beforeEpoch);
  });

  it('registers action in SystemMind actionRegistry', () => {
    const capability = createTestCapability({ id: 'my_test_action' });

    registerCapability(capability);

    const { actionRegistry } = useSystemMind.getState();
    expect(actionRegistry['my_test_action']).toBeDefined();
    expect(actionRegistry['my_test_action'].description).toContain('Test capability');
  });

  it('increments epoch when capability is unregistered', () => {
    registerCapability(createTestCapability({ id: 'to_remove' }));
    const beforeEpoch = useSystemMind.getState().epoch;

    unregisterCapability('to_remove');

    const afterEpoch = useSystemMind.getState().epoch;
    expect(afterEpoch).toBeGreaterThan(beforeEpoch);
  });

  it('removes action from SystemMind actionRegistry on unregister', () => {
    registerCapability(createTestCapability({ id: 'to_remove' }));
    expect(useSystemMind.getState().actionRegistry['to_remove']).toBeDefined();

    unregisterCapability('to_remove');

    expect(useSystemMind.getState().actionRegistry['to_remove']).toBeUndefined();
  });

  it('includes source and complexity in action description', () => {
    registerCapability(
      createTestCapability({
        id: 'formatted_action',
        source: 'sovereign',
        complexity: 'analysis',
        description: 'Analyze something',
      })
    );

    const { actionRegistry } = useSystemMind.getState();
    const actionDesc = actionRegistry['formatted_action'].description;

    expect(actionDesc).toContain('[SOVEREIGN:analysis]');
    expect(actionDesc).toContain('Analyze something');
  });

  it('passes sectors and priority to SystemMind', () => {
    registerCapability(
      createTestCapability({
        id: 'sectored_action',
        sectors: ['DASHBOARD', 'CODE_STUDIO'],
        priority: 80,
      })
    );

    const { actionRegistry } = useSystemMind.getState();
    const action = actionRegistry['sectored_action'];

    expect(action.sectors).toEqual(['DASHBOARD', 'CODE_STUDIO']);
    expect(action.priority).toBe(80);
  });

  it('notifies epoch subscribers on registration', () => {
    const listener = vi.fn();
    const unsubscribe = useSystemMind.getState().subscribeToEpoch(listener);

    registerCapability(createTestCapability());

    expect(listener).toHaveBeenCalled();
    const event = listener.mock.calls[0][0];
    expect(event.reason).toBe('action_registered');

    unsubscribe();
  });

  it('notifies epoch subscribers on unregistration', () => {
    registerCapability(createTestCapability({ id: 'to_notify' }));

    const listener = vi.fn();
    const unsubscribe = useSystemMind.getState().subscribeToEpoch(listener);

    unregisterCapability('to_notify');

    expect(listener).toHaveBeenCalled();
    const event = listener.mock.calls[0][0];
    expect(event.reason).toBe('action_unregistered');

    unsubscribe();
  });
});
