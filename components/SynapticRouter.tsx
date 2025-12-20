
import React, { useEffect, useState, Suspense, lazy } from 'react';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Copy, Eye, Wand2, Terminal, Code, X, Search, Activity, 
    Layers, ArrowUpRight, Hash, Database, GitBranch, Loader2 
} from 'lucide-react';
import { performGlobalSearch } from '../services/geminiService';
import { AppMode } from '../types';
import { audio } from '../services/audioService';

// Lazy Load Views for performance
const Dashboard = lazy(() => import('./Dashboard'));
const SynthesisBridge = lazy(() => import('./SynthesisBridge'));
const BibliomorphicEngine = lazy(() => import('./BibliomorphicEngine'));
const ProcessVisualizer = lazy(() => import('./ProcessVisualizer'));
const MemoryCore = lazy(() => import('./MemoryCore'));
const ImageGen = lazy(() => import('./ImageGen'));
const PowerXRay = lazy(() => import('./PowerXRay'));
const HardwareEngine = lazy(() => import('./HardwareEngine'));
const VoiceMode = lazy(() => import('./VoiceMode'));
const CodeStudio = lazy(() => import('./CodeStudio'));
const TaskBoard = lazy(() => import('./TaskBoard'));

const SynapticRouter: React.FC = () => {
    const { 
        mode, setMode, contextMenu, closeContextMenu, 
        openHoloProjector, setCodeStudioState, setBibliomorphicState,
        addLog, toggleTerminal
    } = useAppStore();

    const [currentPath, setCurrentPath] = useState('');

    useEffect(() => {
        const handleRouting = () => {
            const hash = window.location.hash || '#/dashboard';
            const [pathPart, queryPart] = hash.replace('#', '').split('?');
            const parts = pathPart.split('/').filter(Boolean);
            const mainPath = parts[0] || 'dashboard';
            const subPath = parts[1];

            setCurrentPath(pathPart || '');

            const routeMap: Record<string, AppMode> = {
                'dashboard': AppMode.DASHBOARD,
                'bridge': AppMode.SYNTHESIS_BRIDGE,
                'bibliomorphic': AppMode.BIBLIOMORPHIC,
                'process': AppMode.PROCESS_MAP,
                'memory': AppMode.MEMORY_CORE,
                'assets': AppMode.IMAGE_GEN,
                'power': AppMode.POWER_XRAY,
                'hardware': AppMode.HARDWARE_ENGINEER,
                'code': AppMode.CODE_STUDIO,
                'voice': AppMode.VOICE_MODE,
                'tasks': AppMode.TASK_MANAGER,
            };

            const targetMode = routeMap[mainPath];
            if (targetMode && targetMode !== mode) {
                setMode(targetMode);
                audio.playTransition();
            }

            if (targetMode === AppMode.BIBLIOMORPHIC && subPath) {
                setBibliomorphicState({ activeTab: subPath });
            }
        };

        window.addEventListener('hashchange', handleRouting);
        handleRouting(); 
        return () => window.removeEventListener('hashchange', handleRouting);
    }, [mode, setMode, setBibliomorphicState]);

    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('input, textarea, button, a')) return;
            e.preventDefault();
            
            let type: 'TEXT' | 'IMAGE' | 'CODE' | 'GENERAL' = 'GENERAL';
            let content: any = null;

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
            audio.playHover();
        };

        const handleClick = () => {
            if (useAppStore.getState().contextMenu.isOpen) closeContextMenu();
        };

        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('click', handleClick);
        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('click', handleClick);
        };
    }, [closeContextMenu]);

    const handleAction = (action: string) => {
        const { targetContent, contextType } = contextMenu;

        switch (action) {
            case 'HOLO_VIEW':
                if (targetContent) {
                  openHoloProjector({
                      id: `holo-${Date.now()}`,
                      type: contextType as any,
                      title: 'Synaptic Projection',
                      content: targetContent
                  });
                }
                break;
            case 'COPY':
                if (targetContent) {
                    navigator.clipboard.writeText(targetContent);
                    addLog('INFO', 'BUFFER: Fragment cached to clipboard.');
                }
                break;
            case 'SEARCH':
                if (targetContent) {
                    const safeQuery = String(targetContent || '').substring(0, 100);
                    useAppStore.getState().setSearchState({ query: safeQuery, isOpen: true });
                    performGlobalSearch(safeQuery).then(results => {
                        useAppStore.getState().setSearchState({ results });
                    });
                }
                break;
            case 'JUMP_CODE':
                window.location.hash = '/code';
                if (targetContent) {
                    const safePrompt = `Refactor this logic:\n\n${String(targetContent || '').substring(0, 500)}`;
                    setCodeStudioState({ prompt: safePrompt });
                }
                break;
        }
        closeContextMenu();
    };

    const LoadingSector = () => (
        <div className="h-full w-full flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm">
            <Loader2 className="w-10 h-10 text-[#9d4edd] animate-spin mb-4" />
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.4em] animate-pulse">
                Synchronizing Sector Topology...
            </span>
        </div>
    );

    return (
        <div className="flex-1 relative overflow-hidden flex flex-col">
            <Suspense fallback={<LoadingSector />}>
                <AnimatePresence mode="wait">
                    <motion.main
                        key={mode}
                        initial={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className="flex-1 relative z-10 p-6 overflow-hidden flex flex-col"
                    >
                        {mode === AppMode.DASHBOARD && <Dashboard />}
                        {mode === AppMode.SYNTHESIS_BRIDGE && <SynthesisBridge />}
                        {mode === AppMode.BIBLIOMORPHIC && <BibliomorphicEngine />}
                        {mode === AppMode.PROCESS_MAP && <ProcessVisualizer />}
                        {mode === AppMode.MEMORY_CORE && <MemoryCore />}
                        {mode === AppMode.IMAGE_GEN && <ImageGen />}
                        {mode === AppMode.POWER_XRAY && <PowerXRay />}
                        {mode === AppMode.HARDWARE_ENGINEER && <HardwareEngine />}
                        {mode === AppMode.VOICE_MODE && <VoiceMode />}
                        {mode === AppMode.CODE_STUDIO && <CodeStudio />}
                        {mode === AppMode.TASK_MANAGER && <TaskBoard />}
                    </motion.main>
                </AnimatePresence>
            </Suspense>

            {/* CONTEXT MENU LAYER */}
            <AnimatePresence>
                {contextMenu.isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                        className="fixed z-[9999] min-w-[220px] bg-[#0a0a0a]/95 backdrop-blur-2xl border border-[#333] rounded-lg shadow-2xl overflow-hidden p-1.5"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                    >
                        <div className="px-3 py-2 border-b border-[#222] mb-2 flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-bold text-[#9d4edd] uppercase tracking-wider font-mono">
                                    Synaptic Context Hub
                                </span>
                                <GitBranch className="w-3 h-3 text-[#9d4edd]" />
                            </div>
                            <div className="flex items-center gap-1.5 text-[8px] font-mono text-gray-500 uppercase truncate">
                                <Hash className="w-2.5 h-2.5" /> {currentPath || 'DASHBOARD'}
                            </div>
                        </div>

                        <div className="flex flex-col gap-0.5">
                            {contextMenu.contextType === 'GENERAL' && (
                                <>
                                    <MenuItem icon={ArrowUpRight} label="Jump to Dashboard" onClick={() => window.location.hash = '/dashboard'} />
                                    <MenuItem icon={Activity} label="System Diagnostic" onClick={() => window.location.hash = '/power'} />
                                    <MenuItem icon={Terminal} label="Open Quake Terminal" onClick={() => toggleTerminal(true)} />
                                </>
                            )}

                            {(contextMenu.contextType === 'TEXT' || contextMenu.contextType === 'CODE') && (
                                <>
                                    <MenuItem icon={Copy} label="Capture Fragment" onClick={() => handleAction('COPY')} />
                                    <MenuItem icon={Search} label="Index Vector" onClick={() => handleAction('SEARCH')} />
                                    <MenuItem icon={Eye} label="Holo Projection" onClick={() => handleAction('HOLO_VIEW')} />
                                </>
                            )}

                            {contextMenu.contextType === 'CODE' && (
                                <MenuItem icon={Wand2} label="Refactor in Studio" onClick={() => handleAction('JUMP_CODE')} />
                            )}

                            {contextMenu.contextType === 'IMAGE' && (
                                <>
                                    <MenuItem icon={Eye} label="Inspect Matrix" onClick={() => handleAction('HOLO_VIEW')} />
                                    <MenuItem icon={Database} label="Archive to Memory" onClick={() => handleAction('ARCHIVE')} />
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const MenuItem: React.FC<{ icon: any, label: string, onClick: () => void }> = ({ icon: Icon, label, onClick }) => (
    <button 
        onClick={onClick}
        className="w-full flex items-center gap-3 px-3 py-2 text-xs font-mono text-gray-300 hover:bg-white/5 hover:text-white rounded transition-all group text-left"
    >
        <Icon className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#9d4edd] transition-colors" />
        {label}
    </button>
);

export default SynapticRouter;
