/**
 * NAVIGATION ACTION HANDLERS
 * Sector navigation and UI routing actions.
 */

import { useAppStore } from '../../../store';
import { AppMode } from '../../../types';
import { audio } from '../../audioService';
import type { UnifiedAction } from '../types';
import { Type } from "@google/genai";

// Sector name to AppMode mapping
const SECTOR_MAP: Record<string, AppMode> = {
  'DASHBOARD': AppMode.DASHBOARD,
  'ECOSYSTEM': AppMode.DASHBOARD,
  'HOME': AppMode.DASHBOARD,
  'HUB': AppMode.METAVENTIONS_HUB,
  'METAVENTIONS': AppMode.METAVENTIONS_HUB,
  'RESEARCH': AppMode.BIBLIOMORPHIC,
  'LAB': AppMode.BIBLIOMORPHIC,
  'BIBLIOMORPHIC': AppMode.BIBLIOMORPHIC,
  'TOPOLOGY': AppMode.PROCESS_MAP,
  'PROCESS': AppMode.PROCESS_MAP,
  'DIAGRAM': AppMode.PROCESS_MAP,
  'MEMORY': AppMode.MEMORY_CORE,
  'VAULT': AppMode.MEMORY_CORE,
  'CINEMA': AppMode.IMAGE_GEN,
  'IMAGE': AppMode.IMAGE_GEN,
  'IMAGES': AppMode.IMAGE_GEN,
  'HARDWARE': AppMode.HARDWARE_ENGINEER,
  'INFRA': AppMode.HARDWARE_ENGINEER,
  'CODE': AppMode.CODE_STUDIO,
  'LOGIC': AppMode.CODE_STUDIO,
  'VOICE': AppMode.VOICE_MODE,
  'BRIDGE': AppMode.SYNTHESIS_BRIDGE,
  'SYNTHESIS': AppMode.SYNTHESIS_BRIDGE,
  'BICAMERAL': AppMode.BICAMERAL,
  'DEBATE': AppMode.BICAMERAL,
  'SWARM': AppMode.AGENT_CONTROL,
  'AGENTS': AppMode.AGENT_CONTROL,
  'FINANCE': AppMode.AUTONOMOUS_FINANCE,
  'TREASURY': AppMode.AUTONOMOUS_FINANCE,
  'ARCHON': AppMode.ARCHON,
  'GOD': AppMode.ARCHON,
  'META_LEARNING': AppMode.META_LEARNING,
  'PREDICTIONS': AppMode.META_LEARNING,
  'SOVEREIGN_GALLERY': AppMode.SOVEREIGN_GALLERY,
  'GALLERY': AppMode.SOVEREIGN_GALLERY,
  'NEXUS': AppMode.NEXUS,
  'API': AppMode.NEXUS,
};

export const NAVIGATION_ACTIONS: UnifiedAction[] = [
  {
    id: 'navigate_sector',
    description: 'Navigate to any sector of the OS',
    handler: async (args) => {
      const { setMode } = useAppStore.getState().actions;
      const target = (args.sector || args.target || '').toString().toUpperCase();

      const mode = SECTOR_MAP[target];
      if (mode) {
        setMode(mode);
        audio.playClick();
        return { success: true, sector: mode };
      }
      return { success: false, error: `Unknown sector: ${target}`, available: Object.keys(SECTOR_MAP) };
    },
    schema: {
      type: Type.OBJECT,
      properties: {
        sector: {
          type: Type.STRING,
          description: 'Target sector (e.g. DASHBOARD, CODE_STUDIO, ARCHON)'
        }
      },
      required: ['sector']
    },
    sectors: [],
    priority: 95,
    executionPath: 'direct',
    complexity: 'navigation',
    source: 'voice',
    examples: ['go to research', 'open the code studio', 'take me to finance'],
  },
  {
    id: 'navigate_dashboard',
    description: 'Go to the main dashboard',
    handler: async () => {
      useAppStore.getState().actions.setMode(AppMode.DASHBOARD);
      audio.playClick();
      return { success: true, sector: 'DASHBOARD' };
    },
    sectors: [],
    priority: 90,
    executionPath: 'direct',
    complexity: 'navigation',
    source: 'component',
  },
  {
    id: 'navigate_research',
    description: 'Go to the research lab',
    handler: async () => {
      useAppStore.getState().actions.setMode(AppMode.BIBLIOMORPHIC);
      audio.playClick();
      return { success: true, sector: 'RESEARCH' };
    },
    sectors: [],
    priority: 90,
    executionPath: 'direct',
    complexity: 'navigation',
    source: 'component',
  },
  {
    id: 'navigate_image_gen',
    description: 'Go to image/video generation',
    handler: async () => {
      useAppStore.getState().actions.setMode(AppMode.IMAGE_GEN);
      audio.playClick();
      return { success: true, sector: 'IMAGE_GEN' };
    },
    sectors: [],
    priority: 90,
    executionPath: 'direct',
    complexity: 'navigation',
    source: 'component',
  },
  {
    id: 'navigate_code_studio',
    description: 'Go to the code studio',
    handler: async () => {
      useAppStore.getState().actions.setMode(AppMode.CODE_STUDIO);
      audio.playClick();
      return { success: true, sector: 'CODE_STUDIO' };
    },
    sectors: [],
    priority: 90,
    executionPath: 'direct',
    complexity: 'navigation',
    source: 'component',
  },
  {
    id: 'navigate_agents',
    description: 'Go to agent control center',
    handler: async () => {
      useAppStore.getState().actions.setMode(AppMode.AGENT_CONTROL);
      audio.playClick();
      return { success: true, sector: 'AGENT_CONTROL' };
    },
    sectors: [],
    priority: 90,
    executionPath: 'direct',
    complexity: 'navigation',
    source: 'component',
  },
  {
    id: 'navigate_finance',
    description: 'Go to finance/treasury',
    handler: async () => {
      useAppStore.getState().actions.setMode(AppMode.AUTONOMOUS_FINANCE);
      audio.playClick();
      return { success: true, sector: 'FINANCE' };
    },
    sectors: [],
    priority: 90,
    executionPath: 'direct',
    complexity: 'navigation',
    source: 'component',
  },
  {
    id: 'navigate_hardware',
    description: 'Go to hardware engineering',
    handler: async () => {
      useAppStore.getState().actions.setMode(AppMode.HARDWARE_ENGINEER);
      audio.playClick();
      return { success: true, sector: 'HARDWARE' };
    },
    sectors: [],
    priority: 90,
    executionPath: 'direct',
    complexity: 'navigation',
    source: 'component',
  },
  {
    id: 'navigate_memory',
    description: 'Go to memory core',
    handler: async () => {
      useAppStore.getState().actions.setMode(AppMode.MEMORY_CORE);
      audio.playClick();
      return { success: true, sector: 'MEMORY_CORE' };
    },
    sectors: [],
    priority: 90,
    executionPath: 'direct',
    complexity: 'navigation',
    source: 'component',
  },
  {
    id: 'navigate_archon',
    description: 'Go to Archon autonomous agent',
    handler: async () => {
      useAppStore.getState().actions.setMode(AppMode.ARCHON);
      audio.playClick();
      return { success: true, sector: 'ARCHON' };
    },
    sectors: [],
    priority: 90,
    executionPath: 'direct',
    complexity: 'navigation',
    source: 'component',
  },
];

export const getSectorMap = () => SECTOR_MAP;
