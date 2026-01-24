/**
 * UI ACTION HANDLERS
 * User interface state and interaction actions.
 */

import { useAppStore } from '../../../store';
import { audio } from '../../audioService';
import type { UnifiedAction } from '../types';

export const UI_ACTIONS: UnifiedAction[] = [
  // ==========================================================================
  // THEME & APPEARANCE
  // ==========================================================================
  {
    id: 'ui_toggle_theme',
    description: 'Toggle between light and dark theme',
    handler: async () => {
      const store = useAppStore.getState();
      const newTheme = store.theme === 'dark' ? 'light' : 'dark';
      store.actions.setTheme(newTheme);
      audio.playClick();
      return { success: true, theme: newTheme };
    },
    sectors: [],
    priority: 60,
    executionPath: 'direct',
    complexity: 'simple',
    source: 'component',
  },
  {
    id: 'ui_set_theme',
    description: 'Set theme to specific value (dark, light, system)',
    handler: async (args) => {
      const theme = args.theme || 'dark';
      useAppStore.getState().actions.setTheme(theme);
      audio.playClick();
      return { success: true, theme };
    },
    sectors: [],
    priority: 60,
    executionPath: 'direct',
    complexity: 'simple',
    source: 'component',
  },

  // ==========================================================================
  // MODALS & OVERLAYS
  // ==========================================================================
  {
    id: 'ui_open_command_palette',
    description: 'Open the command palette',
    handler: async () => {
      useAppStore.getState().actions.setCommandPaletteOpen(true);
      audio.playClick();
      return { success: true };
    },
    sectors: [],
    priority: 80,
    executionPath: 'direct',
    complexity: 'navigation',
    source: 'component',
    examples: ['open command palette', 'show commands'],
  },
  {
    id: 'ui_close_command_palette',
    description: 'Close the command palette',
    handler: async () => {
      useAppStore.getState().actions.setCommandPaletteOpen(false);
      return { success: true };
    },
    sectors: [],
    priority: 70,
    executionPath: 'direct',
    complexity: 'simple',
    source: 'component',
  },
  {
    id: 'ui_open_search',
    description: 'Open global search',
    handler: async () => {
      useAppStore.getState().actions.setGlobalSearchOpen(true);
      audio.playClick();
      return { success: true };
    },
    sectors: [],
    priority: 75,
    executionPath: 'direct',
    complexity: 'navigation',
    source: 'component',
    examples: ['open search', 'search'],
  },
  {
    id: 'ui_close_search',
    description: 'Close global search',
    handler: async () => {
      useAppStore.getState().actions.setGlobalSearchOpen(false);
      return { success: true };
    },
    sectors: [],
    priority: 70,
    executionPath: 'direct',
    complexity: 'simple',
    source: 'component',
  },
  {
    id: 'ui_open_api_key_modal',
    description: 'Open API key configuration modal',
    handler: async () => {
      useAppStore.getState().actions.setApiKeyModalOpen(true);
      return { success: true };
    },
    sectors: [],
    priority: 50,
    executionPath: 'direct',
    complexity: 'simple',
    source: 'component',
  },

  // ==========================================================================
  // SIDEBAR & PANELS
  // ==========================================================================
  {
    id: 'ui_toggle_sidebar',
    description: 'Toggle the sidebar visibility',
    handler: async () => {
      const store = useAppStore.getState();
      store.actions.setSidebarOpen(!store.sidebarOpen);
      audio.playClick();
      return { success: true, sidebarOpen: !store.sidebarOpen };
    },
    sectors: [],
    priority: 65,
    executionPath: 'direct',
    complexity: 'simple',
    source: 'component',
  },
  {
    id: 'ui_show_sidebar',
    description: 'Show the sidebar',
    handler: async () => {
      useAppStore.getState().actions.setSidebarOpen(true);
      audio.playClick();
      return { success: true };
    },
    sectors: [],
    priority: 60,
    executionPath: 'direct',
    complexity: 'simple',
    source: 'component',
  },
  {
    id: 'ui_hide_sidebar',
    description: 'Hide the sidebar',
    handler: async () => {
      useAppStore.getState().actions.setSidebarOpen(false);
      return { success: true };
    },
    sectors: [],
    priority: 60,
    executionPath: 'direct',
    complexity: 'simple',
    source: 'component',
  },

  // ==========================================================================
  // VOICE MODE
  // ==========================================================================
  {
    id: 'voice_toggle',
    description: 'Toggle voice input on/off',
    handler: async () => {
      const store = useAppStore.getState();
      store.actions.setVoiceEnabled(!store.voiceEnabled);
      audio.playClick();
      return { success: true, voiceEnabled: !store.voiceEnabled };
    },
    sectors: ['VOICE_MODE'],
    priority: 85,
    executionPath: 'direct',
    complexity: 'simple',
    source: 'component',
  },
  {
    id: 'voice_start',
    description: 'Start voice input',
    handler: async () => {
      useAppStore.getState().actions.setVoiceEnabled(true);
      audio.playClick();
      return { success: true };
    },
    sectors: ['VOICE_MODE'],
    priority: 85,
    executionPath: 'direct',
    complexity: 'simple',
    source: 'component',
    examples: ['start listening', 'enable voice'],
  },
  {
    id: 'voice_stop',
    description: 'Stop voice input',
    handler: async () => {
      useAppStore.getState().actions.setVoiceEnabled(false);
      return { success: true };
    },
    sectors: ['VOICE_MODE'],
    priority: 85,
    executionPath: 'direct',
    complexity: 'simple',
    source: 'component',
    examples: ['stop listening', 'disable voice'],
  },

  // ==========================================================================
  // AUDIO
  // ==========================================================================
  {
    id: 'audio_play_success',
    description: 'Play success sound',
    handler: async () => {
      audio.playSuccess();
      return { success: true };
    },
    sectors: [],
    priority: 30,
    executionPath: 'direct',
    complexity: 'simple',
    source: 'component',
  },
  {
    id: 'audio_play_error',
    description: 'Play error sound',
    handler: async () => {
      audio.playError();
      return { success: true };
    },
    sectors: [],
    priority: 30,
    executionPath: 'direct',
    complexity: 'simple',
    source: 'component',
  },
  {
    id: 'audio_mute',
    description: 'Mute all audio',
    handler: async () => {
      audio.setMuted(true);
      return { success: true };
    },
    sectors: [],
    priority: 40,
    executionPath: 'direct',
    complexity: 'simple',
    source: 'component',
  },
  {
    id: 'audio_unmute',
    description: 'Unmute audio',
    handler: async () => {
      audio.setMuted(false);
      return { success: true };
    },
    sectors: [],
    priority: 40,
    executionPath: 'direct',
    complexity: 'simple',
    source: 'component',
  },

  // ==========================================================================
  // LOG MANAGEMENT
  // ==========================================================================
  {
    id: 'logs_clear',
    description: 'Clear the system logs',
    handler: async () => {
      useAppStore.getState().actions.clearLogs();
      return { success: true };
    },
    sectors: [],
    priority: 45,
    executionPath: 'direct',
    complexity: 'simple',
    source: 'component',
  },
  {
    id: 'logs_add',
    description: 'Add a log entry',
    handler: async (args) => {
      const { level, message } = args;
      useAppStore.getState().actions.addLog(level || 'SYSTEM', message || 'Log entry');
      return { success: true };
    },
    sectors: [],
    priority: 40,
    executionPath: 'direct',
    complexity: 'simple',
    source: 'component',
  },
];
