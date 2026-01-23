import { AppMode } from '../types/domain/core';

export interface NavItem {
    id: AppMode | 'NEXUS';
    label: string;
    path: string;
    fixedLayout?: boolean;
}

export const NAV_CONFIG: NavItem[] = [
    { id: AppMode.METAVENTIONS_HUB, label: 'ECOSYSTEM', path: '/metaventions-hub', fixedLayout: true },
    { id: AppMode.ARCHON, label: 'ARCHON', path: '/archon' },
    { id: AppMode.BIBLIOMORPHIC, label: 'RESEARCH', path: '/bibliomorphic' },
    { id: AppMode.PROCESS_MAP, label: 'TOPOLOGY', path: '/process', fixedLayout: true },
    { id: AppMode.AUTONOMOUS_FINANCE, label: 'TREASURY', path: '/finance', fixedLayout: true },
    { id: AppMode.CODE_STUDIO, label: 'LOGIC', path: '/code', fixedLayout: true },
    { id: AppMode.AGENT_CONTROL, label: 'SWARM', path: '/agents', fixedLayout: true },
    { id: AppMode.MEMORY_CORE, label: 'MEMORY', path: '/memory' },
    { id: AppMode.IMAGE_GEN, label: 'CINEMA', path: '/assets', fixedLayout: true },
    { id: AppMode.HARDWARE_ENGINEER, label: 'HARDWARE', path: '/hardware', fixedLayout: true },
    { id: AppMode.VOICE_MODE, label: 'VOICE CORE', path: '/voice', fixedLayout: true },
    { id: AppMode.SYNTHESIS_BRIDGE, label: 'SYNTHESIS', path: '/bridge', fixedLayout: true },
    { id: 'NEXUS', label: 'NEXUS', path: '/nexus' },
];

// Helper to check if current mode uses fixed layout
export const isFixedLayoutMode = (mode: AppMode | 'NEXUS'): boolean => {
    const navItem = NAV_CONFIG.find(item => item.id === mode);
    return navItem?.fixedLayout ?? false;
};

// Also include DASHBOARD which isn't in nav but uses fixed layout
const FIXED_LAYOUT_MODES = new Set([
    ...NAV_CONFIG.filter(item => item.fixedLayout).map(item => item.id),
    AppMode.DASHBOARD
]);

export const hasFixedLayout = (mode: AppMode | 'NEXUS'): boolean => {
    return FIXED_LAYOUT_MODES.has(mode);
};
