
import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, X } from 'lucide-react';

interface NeuralDebuggerPanelProps {
    isOpen: boolean;
    onClose: () => void;
    state: {
        skepticism: number;
        excitement: number;
        alignment: number;
    };
    onChange: (key: string, value: number) => void;
}

export const NeuralDebuggerPanel: React.FC<NeuralDebuggerPanelProps> = ({
    isOpen, onClose, state, onChange
}) => {
    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    className="fixed top-40 left-1/2 -translate-x-1/2 z-[999] w-72 bg-[#0a0a0c]/95 border border-white/10 backdrop-blur-2xl p-5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                >
                    <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                        <span className="text-[11px] font-black font-mono text-[#18E6FF] flex items-center gap-2">
                            <Activity size={14} /> NEURAL_DEBUGGER
                        </span>
                        <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
                            <X size={14} />
                        </button>
                    </div>

                    <div className="space-y-5">
                        <div className="space-y-2">
                            <div className="flex justify-between text-[9px] font-mono text-gray-500 uppercase tracking-widest">
                                <span>SKEPTICISM (Form)</span>
                                <span>{state.skepticism}%</span>
                            </div>
                            <input
                                type="range" min="0" max="100"
                                value={state.skepticism}
                                onChange={(e) => onChange('skepticism', parseInt(e.target.value, 10))}
                                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#7B2CFF] hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-[9px] font-mono text-gray-500 uppercase tracking-widest">
                                <span>EXCITEMENT (Glow)</span>
                                <span>{state.excitement}%</span>
                            </div>
                            <input
                                type="range" min="0" max="100"
                                value={state.excitement}
                                onChange={(e) => onChange('excitement', parseInt(e.target.value, 10))}
                                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#18E6FF] hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-[9px] font-mono text-gray-500 uppercase tracking-widest">
                                <span>ALIGNMENT (Hue)</span>
                                <span>{state.alignment}%</span>
                            </div>
                            <input
                                type="range" min="0" max="100"
                                value={state.alignment}
                                onChange={(e) => onChange('alignment', parseInt(e.target.value, 10))}
                                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#10b981] hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                            />
                        </div>

                        <div className="text-[8px] text-[#f1c21b] text-center pt-2 font-mono uppercase tracking-widest opacity-60 border-t border-white/5 mt-2">
                            Manual Override Active
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};
