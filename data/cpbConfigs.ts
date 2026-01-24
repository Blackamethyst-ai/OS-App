/**
 * CPB (Cognitive Precision Bridge) CONFIGURATIONS
 * Configuration data for CPBMonitor component.
 */

import { CPBPath, CPBPhase } from '../libs/cpb-core';

export interface PathConfigData {
  label: string;
  color: string;
  description: string;
  iconName: 'zap' | 'brain-circuit' | 'users' | 'git-merge' | 'layers';
}

export interface PhaseConfigData {
  label: string;
  color: string;
}

export const PATH_CONFIG_DATA: Record<CPBPath, PathConfigData> = {
  direct: {
    label: 'Direct',
    iconName: 'zap',
    color: '#10b981',
    description: 'Fast single-pass execution'
  },
  rlm: {
    label: 'RLM',
    iconName: 'brain-circuit',
    color: '#8b5cf6',
    description: 'Recursive Language Model for long context'
  },
  ace: {
    label: 'ACE',
    iconName: 'users',
    color: '#3b82f6',
    description: 'Multi-agent consensus engine'
  },
  hybrid: {
    label: 'Hybrid',
    iconName: 'git-merge',
    color: '#f59e0b',
    description: 'RLM compression + ACE consensus'
  },
  cascade: {
    label: 'Cascade',
    iconName: 'layers',
    color: '#ef4444',
    description: 'Full pipeline with verification'
  }
};

export const PHASE_CONFIG_DATA: Record<CPBPhase, PhaseConfigData> = {
  idle: { label: 'Idle', color: '#6b7280' },
  analyzing: { label: 'Analyzing', color: '#8b5cf6' },
  compressing: { label: 'Compressing', color: '#3b82f6' },
  exploring: { label: 'Exploring', color: '#10b981' },
  converging: { label: 'Converging', color: '#f59e0b' },
  verifying: { label: 'Verifying', color: '#06b6d4' },
  reconstructing: { label: 'Reconstructing', color: '#ec4899' },
  complete: { label: 'Complete', color: '#10b981' },
  error: { label: 'Error', color: '#ef4444' }
};

// Helper to get path color
export const getPathColor = (path: CPBPath): string => PATH_CONFIG_DATA[path].color;

// Helper to get phase color
export const getPhaseColor = (phase: CPBPhase): string => PHASE_CONFIG_DATA[phase].color;
