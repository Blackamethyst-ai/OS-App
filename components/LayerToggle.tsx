
import React from 'react';
import { useAppStore } from '../store';
import { KNOWLEDGE_LAYERS } from '../data/knowledgeLayers';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const LayerToggle: React.FC = () => {
    const { knowledge, toggleKnowledgeLayer } = useAppStore();
    const activeLayers = knowledge.activeLayers || [];

    return (
        <div className="fixed bottom-6 right-48 z-40 flex items-end pointer-events-none">
            {/* List of Available Layers - Horizontal Row */}
            <div className="pointer-events-auto flex flex-row gap-2">
                {Object.values(KNOWLEDGE_LAYERS).map((layer) => {
                    const isActive = activeLayers.includes(layer.id);
                    // @ts-ignore
                    const Icon = Icons[layer.icon] || Icons.Layers;

                    return (
                        <motion.button
                            key={layer.id}
                            onClick={() => toggleKnowledgeLayer(layer.id)}
                            className={`
                                flex items-center gap-3 px-4 py-2 rounded-lg border transition-all duration-300 backdrop-blur-md shadow-lg
                                ${isActive 
                                    ? 'bg-[#0a0a0a]/90 border-[var(--layer-color)] translate-y-0' 
                                    : 'bg-[#0a0a0a]/60 border-[#333] translate-y-2 hover:translate-y-0 opacity-60 hover:opacity-100 hover:bg-[#111]'}
                            `}
                            style={{ '--layer-color': layer.color } as React.CSSProperties}
                            title={layer.description}
                        >
                            <Icon size={16} style={{ color: layer.color }} />
                            <div className="text-left hidden lg:block">
                                <div className={`text-[10px] font-bold font-mono uppercase ${isActive ? 'text-white' : 'text-gray-400'}`}>
                                    {layer.label}
                                </div>
                                {isActive && (
                                    <div className="text-[8px] text-[var(--layer-color)] font-mono tracking-wider leading-none mt-0.5">
                                        ACTIVE
                                    </div>
                                )}
                            </div>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
};
