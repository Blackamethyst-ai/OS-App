/**
 * UI ACTION HANDLERS
 * User interface state and interaction actions.
 */

import { useAppStore } from '../../../store';
import { AppTheme } from '../../../types';
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
      const newTheme = store.theme === AppTheme.DARK ? AppTheme.LIGHT : AppTheme.DARK;
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
    description: 'Set theme to specific value (DARK, LIGHT, etc.)',
    handler: async (args) => {
      const themeStr = (args.theme as string)?.toUpperCase() || 'DARK';
      const theme = AppTheme[themeStr as keyof typeof AppTheme] || AppTheme.DARK;
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
  // SIDEBAR & PANELS
  // ==========================================================================
  {
    id: 'ui_toggle_sidebar',
    description: 'Toggle the sidebar visibility',
    handler: async () => {
      const store = useAppStore.getState();
      store.actions.setSidebarOpen(!store.isSidebarOpen);
      audio.playClick();
      return { success: true, sidebarOpen: !store.isSidebarOpen };
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
      const isActive = !store.voice.isActive;
      store.actions.setVoiceState({ isActive });
      audio.playClick();
      return { success: true, voiceActive: isActive };
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
      useAppStore.getState().actions.setVoiceState({ isActive: true });
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
      useAppStore.getState().actions.setVoiceState({ isActive: false });
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

  // ==========================================================================
  // LOG MANAGEMENT
  // ==========================================================================
  {
    id: 'logs_add',
    description: 'Add a log entry',
    handler: async (args) => {
      const level = (args.level as 'SYSTEM' | 'SUCCESS' | 'ERROR' | 'INFO' | 'WARN') || 'SYSTEM';
      const message = (args.message as string) || 'Log entry';
      useAppStore.getState().actions.addLog(level, message);
      return { success: true };
    },
    sectors: [],
    priority: 40,
    executionPath: 'direct',
    complexity: 'simple',
    source: 'component',
  },
];
