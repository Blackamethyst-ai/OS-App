import { AppMode } from '../types/domain/core';

export interface NavItem {
    id: AppMode | 'NEXUS';
    label: string;
    path: string;
}

export const NAV_CONFIG: NavItem[] = [
    { id: AppMode.METAVENTIONS_HUB, label: 'ECOSYSTEM', path: '/metaventions-hub' },
    { id: AppMode.ARCHON, label: 'ARCHON', path: '/archon' },
    { id: AppMode.BIBLIOMORPHIC, label: 'RESEARCH', path: '/bibliomorphic' },
    { id: AppMode.PROCESS_MAP, label: 'TOPOLOGY', path: '/process' },
    { id: AppMode.AUTONOMOUS_FINANCE, label: 'TREASURY', path: '/finance' },
    { id: AppMode.CODE_STUDIO, label: 'LOGIC', path: '/code' },
    { id: AppMode.AGENT_CONTROL, label: 'SWARM', path: '/agents' },
    { id: AppMode.MEMORY_CORE, label: 'MEMORY', path: '/memory' },
    { id: AppMode.IMAGE_GEN, label: 'CINEMA', path: '/assets' },
    { id: AppMode.HARDWARE_ENGINEER, label: 'HARDWARE', path: '/hardware' },
    { id: AppMode.VOICE_MODE, label: 'VOICE CORE', path: '/voice' },
    { id: AppMode.SYNTHESIS_BRIDGE, label: 'SYNTHESIS', path: '/bridge' },
    { id: 'NEXUS', label: 'NEXUS', path: '/nexus' },
];
