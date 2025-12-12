
import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Eye, Wand2, Terminal, Code, X, Search, Activity, Layers } from 'lucide-react';
import { performGlobalSearch } from '../services/geminiService';

const SynapticRouter: React.FC = () => {
    const { contextMenu, closeContextMenu, openHoloProjector, setCodeStudioState, setHardwareState } = useAppStore();
    const menuRef = useRef<HTMLDivElement>(null);

    // Global listener to capture right-clicks
    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            
            // Check for interactive elements to ignore
            if (target.closest('input, textarea, button, a')) return; // Let default behavior happen on inputs

            e.preventDefault();
            
            let type: 'TEXT' | 'IMAGE' | 'CODE' | 'GENERAL' = 'GENERAL';
            let content: any = null;

            // Detect Type
            const selection = window.getSelection()?.toString();
            const imgTarget = target.closest('img');
            const codeTarget = target.closest('pre, code');

            if (selection && selection.trim().length > 0) {
                type = 'TEXT';
                content = selection;
            } else if (imgTarget) {
                type = 'IMAGE';
                content = (imgTarget as HTMLImageElement).src;
            } else if (codeTarget) {
                type = 'CODE';
                content = codeTarget.textContent;
            }

            useAppStore.getState().openContextMenu(e.clientX, e.clientY, type, content);
        };

        const handleClick = () => {
            if (useAppStore.getState().contextMenu.isOpen) {
                closeContextMenu();
            }
        };

        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('click', handleClick);
        
        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('click', handleClick);
        };
    }, []);

    // Actions
    const handleAction = (action: string) => {
        const { targetContent, contextType } = contextMenu;

        switch (action) {
            case 'HOLO_VIEW':
                openHoloProjector({
                    id: `holo-${Date.now()}`,
                    type: contextType as any,
                    title: 'Quick View',
                    content: targetContent
                });
                break;
            case 'COPY':
                navigator.clipboard.writeText(targetContent);
                break;
            case 'CODE_REFACTOR':
                useAppStore.getState().setMode('CODE_STUDIO' as any);
                setCodeStudioState({ prompt: `Refactor this code:\n\n${targetContent.substring(0, 500)}...` });
                break;
            case 'SEARCH':
                useAppStore.getState().setSearchState({ query: targetContent.substring(0, 100), isOpen: true });
                performGlobalSearch(targetContent.substring(0, 100)).then(results => {
                    useAppStore.getState().setSearchState({ results });
                });
                break;
            case 'ANALYZE_IMG':
                openHoloProjector({
                    id: `holo-${Date.now()}`,
                    type: 'IMAGE',
                    title: 'Deep Scan Target',
                    content: targetContent
                });
                setTimeout(() => {
                    useAppStore.getState().setHoloAnalyzing(true);
                    // Trigger analyze inside Holo... (Ideally we'd trigger it directly)
                }, 500);
                break;
        }
        closeContextMenu();
    };

    if (!contextMenu.isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                ref={menuRef}
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                className="fixed z-[9999] min-w-[200px] bg-[#0a0a0a]/95 backdrop-blur-xl border border-[#333] rounded-lg shadow-2xl overflow-hidden p-1.5"
                style={{ top: contextMenu.y, left: contextMenu.x }}
            >
                <div className="px-2 py-1.5 border-b border-[#222] mb-1 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-[#9d4edd] uppercase tracking-wider font-mono">
                        Synaptic Router
                    </span>
                    <Layers className="w-3 h-3 text-[#9d4edd]" />
                </div>

                <div className="flex flex-col gap-0.5">
                    {contextMenu.contextType === 'GENERAL' && (
                        <>
                            <MenuItem icon={Activity} label="System Status" onClick={() => handleAction('STATUS')} />
                            <MenuItem icon={Terminal} label="Open Terminal" onClick={() => useAppStore.getState().toggleTerminal(true)} />
                        </>
                    )}

                    {(contextMenu.contextType === 'TEXT' || contextMenu.contextType === 'CODE') && (
                        <>
                            <MenuItem icon={Copy} label="Copy Data" onClick={() => handleAction('COPY')} />
                            <MenuItem icon={Search} label="Neural Search" onClick={() => handleAction('SEARCH')} />
                            <MenuItem icon={Eye} label="Holo Project" onClick={() => handleAction('HOLO_VIEW')} />
                        </>
                    )}

                    {contextMenu.contextType === 'CODE' && (
                        <MenuItem icon={Wand2} label="Refactor in Studio" onClick={() => handleAction('CODE_REFACTOR')} />
                    )}

                    {contextMenu.contextType === 'IMAGE' && (
                        <>
                            <MenuItem icon={Eye} label="Holo Inspection" onClick={() => handleAction('HOLO_VIEW')} />
                            <MenuItem icon={Wand2} label="AI Analysis" onClick={() => handleAction('ANALYZE_IMG')} />
                        </>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

const MenuItem: React.FC<{ icon: any, label: string, onClick: () => void }> = ({ icon: Icon, label, onClick }) => (
    <button 
        onClick={onClick}
        className="w-full flex items-center gap-3 px-3 py-2 text-xs font-mono text-gray-300 hover:bg-[#1f1f1f] hover:text-white rounded transition-colors group text-left"
    >
        <Icon className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#9d4edd]" />
        {label}
    </button>
);

export default SynapticRouter;
