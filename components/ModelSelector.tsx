import React from 'react';
import { Zap, Brain, Sparkles, Cpu, Gauge } from 'lucide-react';
import { useAppStore } from '../store';
import { ModelTier } from '../types';
import { cn } from '../utils/cn';
import { audio } from '../services/audioService';
import { motion } from 'framer-motion';

export const ModelSelector: React.FC = () => {
    const { preferences, actions } = useAppStore();
    const { modelTier } = preferences;

    const tiers: { id: ModelTier; label: string; icon: any; color: string; desc: string }[] = [
        {
            id: 'local',
            label: 'Local',
            icon: Cpu,
            color: '#ec4899', // Pink
            desc: 'Ollama on localhost:11434'
        },
        {
            id: 'fast',
            label: 'Speed',
            icon: Zap,
            color: '#10b981', // Emerald
            desc: 'Gemini 1.5 Flash (Economy)'
        },
        {
            id: 'balanced',
            label: 'Balanced',
            icon: Gauge,
            color: '#3b82f6', // Blue
            desc: 'Optimal Performance/Cost'
        },
        {
            id: 'powerful',
            label: 'Power',
            icon: Brain,
            color: '#8b5cf6', // Violet
            desc: 'Claude 3.5 / Gemini Pro'
        },
        {
            id: 'creative',
            label: 'Creative',
            icon: Sparkles,
            color: '#f59e0b', // Amber
            desc: 'Grok 2 / Gemini Pro / Opus'
        }
    ];

    const handleSelect = (tier: ModelTier) => {
        actions.setPreferences({ modelTier: tier });
        audio.playClick();
    };

    return (
        <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 shadow-inner backdrop-blur-md">
            {tiers.map(tier => {
                const isActive = modelTier === tier.id;
                const Icon = tier.icon;

                return (
                    <button
                        key={tier.id}
                        onClick={() => handleSelect(tier.id)}
                        className={cn(
                            "relative px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-300 group overflow-hidden",
                            isActive ? "bg-white/5 border border-white/10 shadowing-lg" : "hover:bg-white/5 border border-transparent opacity-60 hover:opacity-100"
                        )}
                        title={tier.desc}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="active-model-bg"
                                className="absolute inset-0 bg-gradient-to-tr opacity-20"
                                style={{ background: `linear-gradient(to top right, ${tier.color}00, ${tier.color}40)` }}
                                transition={{ duration: 0.3 }}
                            />
                        )}

                        <div className={cn(
                            "relative z-10 p-1 rounded-lg transition-colors",
                            isActive ? "text-white" : "text-gray-500 group-hover:text-gray-300"
                        )} style={{ color: isActive ? tier.color : undefined }}>
                            <Icon size={14} className={cn(isActive ? "fill-current" : "")} />
                        </div>

                        {isActive && (
                            <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                className="relative z-10 text-[9px] font-black uppercase tracking-widest text-white whitespace-nowrap"
                            >
                                {tier.label}
                            </motion.span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};
