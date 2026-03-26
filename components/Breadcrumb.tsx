import React from 'react';
import { ChevronRight } from 'lucide-react';
import { AppMode } from '../types';

const SECTOR_TITLES: Record<AppMode, string> = {
    [AppMode.DASHBOARD]: 'Dashboard',
    [AppMode.METAVENTIONS_HUB]: 'Hub',
    [AppMode.SYNTHESIS_BRIDGE]: 'Synthesis Bridge',
    [AppMode.BIBLIOMORPHIC]: 'Bibliomorphic Engine',
    [AppMode.PROCESS_MAP]: 'Process Visualizer',
    [AppMode.MEMORY_CORE]: 'Memory Core',
    [AppMode.IMAGE_GEN]: 'Image Generation',
    [AppMode.HARDWARE_ENGINEER]: 'Hardware Engine',
    [AppMode.VOICE_MODE]: 'Voice Core',
    [AppMode.CODE_STUDIO]: 'Code Studio',
    [AppMode.AGENT_CONTROL]: 'Agent Control',
    [AppMode.AUTONOMOUS_FINANCE]: 'Finance',
    [AppMode.BICAMERAL]: 'Bicameral Engine',
    [AppMode.NEXUS]: 'Nexus API',
    [AppMode.AGENT_CORE_TEST]: 'SDK Test',
    [AppMode.CPB_TEST]: 'CPB Test',
    [AppMode.ARCHON]: 'Archon',
    [AppMode.META_LEARNING]: 'Meta Learning',
    [AppMode.SOVEREIGN_GALLERY]: 'Sovereign Vault',
};

interface BreadcrumbProps {
    mode: AppMode;
    subPath?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ mode, subPath }) => {
    if (mode === AppMode.DASHBOARD) return null;

    const sectorName = SECTOR_TITLES[mode] || mode;

    return (
        <div className="flex items-center gap-2 px-6 py-2 text-[10px] font-mono text-gray-500 border-b border-white/[0.03]">
            <button
                onClick={() => { window.location.hash = '#/dashboard'; }}
                className="hover:text-white transition-colors"
            >
                Home
            </button>
            <ChevronRight size={10} className="text-gray-700" />
            <span className="text-white/70">{sectorName}</span>
            {subPath && (
                <>
                    <ChevronRight size={10} className="text-gray-700" />
                    <span className="text-gray-400">{subPath}</span>
                </>
            )}
        </div>
    );
};

export default Breadcrumb;
