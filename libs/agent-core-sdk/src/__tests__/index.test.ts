/**
 * Tests for Agent Core SDK index exports
 *
 * Verifies that all public APIs are properly exported from the package entry point.
 */
import { describe, it, expect } from 'vitest';

import * as SDK from '../index';

describe('Agent Core SDK Exports', () => {
  describe('Client exports', () => {
    it('should export AgentCoreClient class', () => {
      expect(SDK.AgentCoreClient).toBeDefined();
      expect(typeof SDK.AgentCoreClient).toBe('function');
    });

    it('should export agentCore default instance', () => {
      expect(SDK.agentCore).toBeDefined();
      expect(SDK.agentCore).toBeInstanceOf(SDK.AgentCoreClient);
    });
  });

  describe('React Hook exports', () => {
    it('should export all React hooks as functions', () => {
      const hookNames = [
        'useAgentCoreClient',
        'useAgentCoreHealth',
        'useSessions',
        'useSession',
        'useSemanticSearch',
        'useAgentContext',
        'useReinvigoration',
        'useLogInsight',
        // Graph Intelligence
        'useRelatedConcepts',
        'useSessionLineage',
        'useSessionsGraph',
        // Meta-Learning Prediction
        'useSessionPrediction',
        'useErrorPrediction',
        'useOptimalTime',
        'usePredictionAccuracy',
        'usePredictionWithContext',
      ] as const;

      for (const hookName of hookNames) {
        const hook = (SDK as Record<string, unknown>)[hookName];
        expect(hook, `${hookName} should be exported`).toBeDefined();
        expect(typeof hook, `${hookName} should be a function`).toBe('function');
      }
    });
  });

  describe('Provider exports', () => {
    it('should export AgentCoreProvider and context hooks', () => {
      expect(SDK.AgentCoreProvider).toBeDefined();
      expect(typeof SDK.AgentCoreProvider).toBe('function');

      expect(SDK.useAgentCore).toBeDefined();
      expect(typeof SDK.useAgentCore).toBe('function');

      expect(SDK.useAgentCoreSafe).toBeDefined();
      expect(typeof SDK.useAgentCoreSafe).toBe('function');
    });
  });

  describe('Completeness check', () => {
    it('should export at least 20 named exports (client + hooks + provider + types are re-exported)', () => {
      // Types are erased at runtime, so we count only runtime exports
      const runtimeExports = Object.keys(SDK).filter(
        (key) => typeof (SDK as Record<string, unknown>)[key] !== 'undefined'
      );
      // Client (2) + Hooks (16) + Provider (3) = 21 runtime exports
      expect(runtimeExports.length).toBeGreaterThanOrEqual(20);
    });
  });
});
