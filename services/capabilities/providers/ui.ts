/**
 * UI Capability Provider
 *
 * Provides UI control capabilities for theme switching, voice toggle, etc.
 */

import type { Capability, CapabilityHandler } from '../types';
import { registerCapabilities } from '../registry';
import { logger } from '../../logger';
import { useAppStore } from '../../../store';
import { AppTheme } from '../../../types';

/**
 * Theme toggle handler
 */
const themeToggleHandler: CapabilityHandler = async (args) => {
  const theme = args.theme as string;

  // Validate theme value
  const validThemes = Object.values(AppTheme);
  if (!validThemes.includes(theme as AppTheme)) {
    return {
      success: false,
      error: `Invalid theme: ${theme}. Valid themes: ${validThemes.join(', ')}`,
    };
  }

  // Set the theme
  const { setTheme } = useAppStore.getState().actions;
  setTheme(theme as AppTheme);

  return {
    success: true,
    result: { theme, message: `Theme switched to ${theme}` },
  };
};

/**
 * Voice toggle handler
 */
const voiceToggleHandler: CapabilityHandler = async (args) => {
  const enabled = args.enabled as boolean;

  if (typeof enabled !== 'boolean') {
    return {
      success: false,
      error: 'enabled must be a boolean',
    };
  }

  const { setVoiceState } = useAppStore.getState().actions;
  setVoiceState({ isActive: enabled });

  return {
    success: true,
    result: { enabled, message: enabled ? 'Voice enabled' : 'Voice disabled' },
  };
};

/**
 * UI Capabilities
 */
const UI_CAPABILITIES: Capability[] = [
  {
    id: 'ui_toggle_theme',
    kind: 'action',
    description: 'Switch application theme (DARK, LIGHT, AMBER, MIDNIGHT, NEON_CYBER, etc.)',
    complexity: 'simple',
    executionPath: 'direct',
    source: 'component',
    sectors: [],  // Global - available everywhere
    priority: 60,
    handler: themeToggleHandler,
    aliases: ['switch theme', 'change theme', 'set theme'],
    examples: [
      'switch to midnight theme',
      'change theme to amber',
      'set dark mode',
    ],
    schema: {
      type: 'object',
      properties: {
        theme: {
          type: 'string',
          enum: Object.values(AppTheme),
          description: 'Theme to switch to',
        },
      },
      required: ['theme'],
    },
  },
  {
    id: 'voice_toggle',
    kind: 'action',
    description: 'Enable or disable voice input',
    complexity: 'simple',
    executionPath: 'direct',
    source: 'voice',
    sectors: [],  // Global
    priority: 70,
    handler: voiceToggleHandler,
    aliases: ['toggle voice', 'voice on', 'voice off'],
    examples: [
      'turn on voice',
      'disable voice',
      'enable voice input',
    ],
    schema: {
      type: 'object',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Whether voice should be enabled',
        },
      },
      required: ['enabled'],
    },
  },
];

/**
 * Load UI capabilities into the registry
 */
export function loadUICapabilities(): void {
  registerCapabilities(UI_CAPABILITIES);
  logger.debug(`Loaded ${UI_CAPABILITIES.length} UI capabilities`, undefined, 'UIProvider');
}

/**
 * Get count of UI capabilities
 */
export function getUICapabilityCount(): number {
  return UI_CAPABILITIES.length;
}
