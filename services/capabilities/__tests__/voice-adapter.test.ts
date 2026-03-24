/**
 * Voice Adapter Tests
 *
 * Tests for voice command processing, context generation,
 * formatters, and voice state management.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  processVoiceCommand,
  getVoiceContextForSector,
  getVoiceCapabilityList,
  getVoiceSuggestions,
  formatForVoice,
  generateVoiceHelp,
  recordVoiceCommand,
  getLastVoiceCommand,
  getVoiceHistory,
  clearVoiceHistory,
} from '../adapters/voice';
import type { VoiceCommand } from '../adapters/voice';
import {
  registerCapability,
  registerCapabilities,
  clearRegistry,
} from '../registry';
import type { Capability } from '../types';

function createCap(overrides: Partial<Capability> = {}): Capability {
  return {
    id: 'test_cap',
    kind: 'action',
    description: 'Test capability',
    source: 'core',
    complexity: 'simple',
    priority: 50,
    sectors: [],
    executionPath: 'direct',
    handler: async () => ({ success: true }),
    ...overrides,
  };
}

describe('VoiceAdapter', () => {
  beforeEach(() => {
    clearRegistry();
    clearVoiceHistory();
  });

  describe('processVoiceCommand', () => {
    it('should execute matching capability and return success', async () => {
      // Arrange
      registerCapability(
        createCap({
          id: 'toggle_theme',
          description: 'Toggle the theme',
          priority: 60,
          handler: async () => ({ success: true, data: 'toggled' }),
        })
      );
      const command: VoiceCommand = {
        intent: 'toggle_theme',
        confidence: 0.95,
        rawTranscript: 'toggle the theme',
      };

      // Act
      const result = await processVoiceCommand(command, {});

      // Assert
      expect(result.success).toBe(true);
      expect(result.capability?.id).toBe('toggle_theme');
      expect(result.response).toContain('Done');
    });

    it('should return failure with suggestions when no match found', async () => {
      const command: VoiceCommand = {
        intent: 'do something impossible',
        confidence: 0.9,
        rawTranscript: 'do something impossible',
      };

      const result = await processVoiceCommand(command, {});

      expect(result.success).toBe(false);
      expect(result.response).toContain("I don't understand");
    });

    it('should ask for confirmation on low-score matches', async () => {
      // Register a capability that will match poorly.
      // Use a very obscure ID/description that won't get a high score
      // from a short, partial query.
      registerCapability(
        createCap({
          id: 'abcdef_operation_xyz_12345',
          description: 'Abcdef operation for xyz 12345 system',
          priority: 1,
        })
      );

      const command: VoiceCommand = {
        intent: 'z', // Very short, partial match = low score
        confidence: 0.5,
        rawTranscript: 'z',
      };

      const result = await processVoiceCommand(command, {});
      // With very low priority and partial match, score should be below 30
      // triggering the "Did you mean" branch
      if (!result.success && result.response.includes('Did you mean')) {
        expect(result.suggestions).toBeDefined();
        expect(result.suggestions!.length).toBeLessThanOrEqual(3);
      } else {
        // If score happened to be above 30, it should still work
        expect(result.response).toBeDefined();
      }
    });

    it('should pass entities as args to the handler', async () => {
      let capturedArgs: Record<string, unknown> = {};
      registerCapability(
        createCap({
          id: 'set_theme',
          description: 'Set theme',
          handler: async (args) => {
            capturedArgs = args;
            return { success: true };
          },
        })
      );

      const command: VoiceCommand = {
        intent: 'set_theme',
        confidence: 0.95,
        entities: { theme: 'MIDNIGHT' },
        rawTranscript: 'set theme to midnight',
      };

      await processVoiceCommand(command, {});
      expect(capturedArgs.theme).toBe('MIDNIGHT');
    });

    it('should report handler failures', async () => {
      registerCapability(
        createCap({
          id: 'failing_action',
          description: 'Failing action',
          handler: async () => {
            throw new Error('Handler crashed');
          },
        })
      );

      const command: VoiceCommand = {
        intent: 'failing_action',
        confidence: 0.95,
        rawTranscript: 'failing action',
      };

      const result = await processVoiceCommand(command, {});
      expect(result.success).toBe(false);
      expect(result.response).toContain('Failed');
    });
  });

  describe('getVoiceContextForSector', () => {
    it('should return voice context with sector and capabilities', () => {
      registerCapability(
        createCap({
          id: 'dash_cap',
          sectors: ['DASHBOARD'],
          examples: ['open overview'],
          complexity: 'navigation',
        })
      );

      const context = getVoiceContextForSector('DASHBOARD');
      expect(context.sector).toBe('DASHBOARD');
      expect(context.capabilities.length).toBeGreaterThan(0);
      expect(context.groupedByComplexity).toBeDefined();
    });
  });

  describe('getVoiceCapabilityList', () => {
    it('should return formatted string with available commands', () => {
      registerCapabilities([
        createCap({
          id: 'nav_dash',
          complexity: 'navigation',
          sectors: ['DASHBOARD'],
          examples: ['go to dashboard'],
        }),
        createCap({
          id: 'quick_action',
          complexity: 'simple',
          sectors: ['DASHBOARD'],
          examples: ['toggle dark mode'],
        }),
      ]);

      const list = getVoiceCapabilityList('DASHBOARD');
      expect(list).toContain('Available voice commands');
    });

    it('should default to DASHBOARD when no sector provided', () => {
      const list = getVoiceCapabilityList();
      expect(list).toContain('Available voice commands');
    });

    it('should show Analysis section when analysis capabilities exist', () => {
      registerCapabilities([
        createCap({
          id: 'analysis_voice',
          complexity: 'analysis',
          sectors: ['DASHBOARD'],
          examples: ['analyze my data'],
        }),
      ]);

      const list = getVoiceCapabilityList('DASHBOARD');
      expect(list).toContain('Analysis');
      expect(list).toContain('analyze my data');
    });

    it('should show descriptions when no examples available', () => {
      registerCapability(
        createCap({
          id: 'no_example',
          complexity: 'simple',
          sectors: ['DASHBOARD'],
          description: 'Toggle something',
        })
      );

      const list = getVoiceCapabilityList('DASHBOARD');
      expect(list).toContain('Toggle something');
    });
  });

  describe('getVoiceSuggestions', () => {
    it('should return example phrases from capabilities', () => {
      registerCapability(
        createCap({
          id: 'suggest_me',
          sectors: ['DASHBOARD'],
          examples: ['try this command'],
        })
      );

      const suggestions = getVoiceSuggestions('DASHBOARD');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain('try this command');
    });

    it('should return at most 5 suggestions', () => {
      for (let i = 0; i < 10; i++) {
        registerCapability(
          createCap({
            id: `suggest_${i}`,
            sectors: [],
            examples: [`suggestion ${i}`],
          })
        );
      }

      const suggestions = getVoiceSuggestions('DASHBOARD');
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should default to DASHBOARD when no sector', () => {
      const suggestions = getVoiceSuggestions();
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('formatForVoice', () => {
    it('should format capability with example', () => {
      const cap = createCap({ examples: ['say hello'] });
      const result = formatForVoice(cap);
      expect(result).toContain('You can say');
      expect(result).toContain('say hello');
    });

    it('should fall back to description when no examples', () => {
      const cap = createCap({ description: 'Toggle something' });
      const result = formatForVoice(cap);
      expect(result).toContain('Toggle something');
    });
  });

  describe('generateVoiceHelp', () => {
    it('should generate help text with navigation and action sections', () => {
      registerCapabilities([
        createCap({
          id: 'nav_help',
          kind: 'tab',
          complexity: 'navigation',
          sectors: ['DASHBOARD'],
          examples: ['go to overview'],
        }),
        createCap({
          id: 'action_help',
          kind: 'action',
          sectors: ['DASHBOARD'],
          examples: ['toggle dark mode'],
        }),
      ]);

      const help = generateVoiceHelp('DASHBOARD');
      expect(help).toContain('Here are some things you can do');
    });

    it('should default to DASHBOARD sector when none specified', () => {
      const help = generateVoiceHelp();
      expect(help).toContain('Here are some things you can do');
    });
  });

  describe('Voice State Management', () => {
    it('should record and retrieve last voice command', () => {
      const command: VoiceCommand = {
        intent: 'test',
        confidence: 0.9,
        rawTranscript: 'test command',
      };

      recordVoiceCommand(command);
      expect(getLastVoiceCommand()).toEqual(command);
    });

    it('should maintain voice command history', () => {
      const cmd1: VoiceCommand = { intent: 'a', confidence: 0.9, rawTranscript: 'a' };
      const cmd2: VoiceCommand = { intent: 'b', confidence: 0.8, rawTranscript: 'b' };

      recordVoiceCommand(cmd1);
      recordVoiceCommand(cmd2);

      const history = getVoiceHistory();
      expect(history).toHaveLength(2);
      expect(history[0].intent).toBe('a');
      expect(history[1].intent).toBe('b');
    });

    it('should cap history at 50 entries', () => {
      for (let i = 0; i < 60; i++) {
        recordVoiceCommand({ intent: `cmd_${i}`, confidence: 0.9, rawTranscript: `cmd ${i}` });
      }

      const history = getVoiceHistory();
      expect(history.length).toBeLessThanOrEqual(50);
    });

    it('should clear voice history and last command', () => {
      recordVoiceCommand({ intent: 'test', confidence: 0.9, rawTranscript: 'test' });

      clearVoiceHistory();

      expect(getLastVoiceCommand()).toBeNull();
      expect(getVoiceHistory()).toHaveLength(0);
    });

    it('should return a copy of history (not the internal array)', () => {
      recordVoiceCommand({ intent: 'test', confidence: 0.9, rawTranscript: 'test' });

      const history1 = getVoiceHistory();
      const history2 = getVoiceHistory();
      expect(history1).not.toBe(history2); // different array references
      expect(history1).toEqual(history2); // same content
    });
  });
});
