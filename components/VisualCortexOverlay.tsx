import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store';
import { Eye, Loader2, Zap, Scan, ShieldCheck, Activity, Target, Monitor } from 'lucide-react';

const VisualCortexOverlay: React.FC = () => {
    const { visualCortex } = useAppStore();
    const { isAnalyzing, dropActive, isProbing } = visualCortex;

    const isActive = dropActive || isAnalyzing || isProbing;

    return (
        <AnimatePresence>
            {isActive && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[2000] pointer-events-none flex items-center justify-center bg-black/40 backdrop-blur-sm"
                >
                    {/* Scanline Effect */}
                    <motion.div 
                        animate={{ top: ['0%', '100%', '0%'] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#9d4edd] to-transparent shadow-[0_0_15px_#9d4edd] z-10"
                    />

                    <div className="flex flex-col items-center gap-10">
                        <div className="relative">
                            <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                className="w-48 h-48 rounded-full border-2 border-dashed border-[#9d4edd]/30 flex items-center justify-center"
                            >
                                <div className="w-40 h-40 rounded-full border border-[#9d4edd]/10" />
                            </motion.div>
                            
                            <div className="absolute inset-0 flex items-center justify-center">
                                {isAnalyzing || isProbing ? (
                                    <div className="relative">
                                        {isProbing ? <Monitor size={40} className="text-[#9d4edd] animate-pulse" /> : <Loader2 className="w-16 h-16 text-[#9d4edd] animate-spin" />}
                                        <div className="absolute inset-0 bg-[#9d4edd]/20 blur-2xl animate-pulse rounded-full" />
                                    </div>
                                ) : (
                                    <motion.div 
                                        animate={{ scale: [1, 1.1, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="p-8 bg-[#9d4edd]/10 rounded-full border border-[#9d4edd]/40 shadow-[0_0_40px_rgba(157,78,221,0.2)]"
                                    >
                                        <Eye size={40} className="text-[#9d4edd]" />
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        <div className="text-center space-y-4">
                            <h2 className="text-2xl font-black font-mono text-white uppercase tracking-[0.6em]">
                                {isProbing ? 'Initializing Retinal Probe' : isAnalyzing ? 'Decoding Optical Stream' : 'Oculus Protocol Active'}
                            </h2>
                            <div className="flex items-center justify-center gap-8">
                                <div className="flex items-center gap-2">
                                    <Target size={12} className="text-[#22d3ee]" />
                                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Targeting: {isProbing ? 'External Display' : 'Multi-Modal'}</span>
                                </div>
                                <div className="h-4 w-px bg-white/5" />
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={12} className="text-[#10b981]" />
                                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Enclave Encrypted</span>
                                </div>
                            </div>
                        </div>

                        {(isAnalyzing || isProbing) && (
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: 300 }}
                                className="h-1 bg-white/5 rounded-full overflow-hidden relative"
                            >
                                <motion.div 
                                    animate={{ left: ['-100%', '100%'] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                    className="absolute top-0 w-full h-full bg-gradient-to-r from-transparent via-[#9d4edd] to-transparent"
                                />
                            </motion.div>
                        )}
                    </div>

                    {/* Technical HUD Borders */}
                    <div className="absolute top-10 left-10 w-20 h-20 border-t-4 border-l-4 border-[#9d4edd]/20 rounded-tl-3xl" />
                    <div className="absolute top-10 right-10 w-20 h-20 border-t-4 border-r-4 border-[#9d4edd]/20 rounded-tr-3xl" />
                    <div className="absolute bottom-10 left-10 w-20 h-20 border-b-4 border-l-4 border-[#9d4edd]/20 rounded-bl-3xl" />
                    <div className="absolute bottom-10 right-10 w-20 h-20 border-b-4 border-r-4 border-[#9d4edd]/20 rounded-br-3xl" />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default VisualCortexOverlay;
