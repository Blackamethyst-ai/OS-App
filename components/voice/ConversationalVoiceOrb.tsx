/**
 * ConversationalVoiceOrb Component
 *
 * A visual orb interface for natural conversational voice interactions.
 * Provides visual feedback for all voice states with animations.
 *
 * Features:
 * - Pulsing orb that responds to speech
 * - Visual state indicators (idle, listening, processing, speaking)
 * - Real-time transcript display
 * - Barge-in support
 * - Fallback handling
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Radio, Waves, Loader2, Volume2, AlertCircle } from 'lucide-react';
import { useConversationalVoice, type ConversationalVoiceState } from '../../hooks/useConversationalVoice';
import { logger } from '../../services/logger';

export interface ConversationalVoiceOrbProps {
    /** Deepgram API key for streaming STT (or use supabaseClient for secure fetch) */
    deepgramApiKey?: string;
    /** Supabase client for secure token fetching */
    supabaseClient?: { functions: { invoke: (name: string) => Promise<{ data: { key: string } | null; error: Error | null }> } };
    /** ElevenLabs API key for TTS */
    elevenLabsApiKey?: string;
    /** Voice ID or name for TTS */
    voice?: string;
    /** Enable VAD for automatic speech detection */
    enableVAD?: boolean;
    /** Enable barge-in/interruption */
    enableBargeIn?: boolean;
    /** Callback to generate AI response from transcript */
    onGenerateResponse: (transcript: string) => Promise<string>;
    /** Callback when session starts */
    onSessionStart?: () => void;
    /** Callback when session ends */
    onSessionEnd?: () => void;
    /** Size of the orb (default: 'md') */
    size?: 'sm' | 'md' | 'lg';
    /** Position (default: bottom-right) */
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
    /** Show transcript panel */
    showTranscript?: boolean;
    /** Custom class name */
    className?: string;
}

// Size configurations
const sizeConfig = {
    sm: { orb: 'w-12 h-12', icon: 16, ring: 'w-16 h-16' },
    md: { orb: 'w-16 h-16', icon: 24, ring: 'w-20 h-20' },
    lg: { orb: 'w-20 h-20', icon: 32, ring: 'w-24 h-24' },
};

// Position configurations
const positionConfig = {
    'bottom-right': 'fixed bottom-6 right-6',
    'bottom-left': 'fixed bottom-6 left-6',
    'top-right': 'fixed top-6 right-6',
    'top-left': 'fixed top-6 left-6',
    'center': 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
};

// State color configurations
const stateColors: Record<ConversationalVoiceState, { bg: string; ring: string; text: string }> = {
    IDLE: {
        bg: 'bg-gray-800/80',
        ring: 'border-gray-600',
        text: 'text-gray-400',
    },
    LISTENING: {
        bg: 'bg-[var(--cyan)]/20',
        ring: 'border-[var(--cyan)]',
        text: 'text-[var(--cyan)]',
    },
    PROCESSING: {
        bg: 'bg-[var(--amber)]/20',
        ring: 'border-[var(--amber)]',
        text: 'text-[var(--amber)]',
    },
    SPEAKING: {
        bg: 'bg-[var(--amethyst-soft)]/20',
        ring: 'border-[var(--amethyst-soft)]',
        text: 'text-[var(--amethyst-soft)]',
    },
    ERROR: {
        bg: 'bg-red-500/20',
        ring: 'border-red-500',
        text: 'text-red-500',
    },
};

// Waveform visualization
const Waveform = ({ isActive, color }: { isActive: boolean; color: string }) => (
    <div className="flex items-center gap-0.5 h-4">
        {[1, 2, 3, 4, 5].map(i => (
            <motion.div
                key={i}
                animate={isActive ? { height: [2, 16, 2] } : { height: 2 }}
                transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.08 }}
                className={`w-1 rounded-full ${color}`}
            />
        ))}
    </div>
);

// State icon
const StateIcon = ({ state, size }: { state: ConversationalVoiceState; size: number }) => {
    switch (state) {
        case 'LISTENING':
            return <Mic size={size} className="animate-pulse" />;
        case 'PROCESSING':
            return <Loader2 size={size} className="animate-spin" />;
        case 'SPEAKING':
            return <Volume2 size={size} />;
        case 'ERROR':
            return <AlertCircle size={size} />;
        default:
            return <Mic size={size} />;
    }
};

// State label
const stateLabels: Record<ConversationalVoiceState, string> = {
    IDLE: 'Click to start',
    LISTENING: 'Listening...',
    PROCESSING: 'Processing...',
    SPEAKING: 'Speaking...',
    ERROR: 'Error',
};

export const ConversationalVoiceOrb: React.FC<ConversationalVoiceOrbProps> = ({
    deepgramApiKey,
    supabaseClient,
    elevenLabsApiKey,
    voice = 'mike',
    enableVAD = true,
    enableBargeIn = true,
    onGenerateResponse,
    onSessionStart,
    onSessionEnd,
    size = 'md',
    position = 'bottom-right',
    showTranscript = true,
    className = '',
}) => {
    const [isHovered, setIsHovered] = useState(false);

    const {
        state,
        transcript,
        response,
        isActive,
        start,
        stop,
        toggle,
        speechProbability,
        error,
    } = useConversationalVoice(
        {
            deepgramApiKey,
            supabaseClient,
            elevenLabsApiKey,
            voice,
            enableVAD,
            enableBargeIn,
        },
        {
            onTranscriptComplete: onGenerateResponse,
            onStateChange: (newState) => {
                if (newState === 'LISTENING' && !isActive) {
                    onSessionStart?.();
                } else if (newState === 'IDLE' && isActive) {
                    onSessionEnd?.();
                }
            },
            onError: (err) => {
                logger.error('[ConversationalVoiceOrb] Error:', err);
            },
        }
    );

    const sizeConf = sizeConfig[size];
    const colors = stateColors[state];

    // Handle keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Space to toggle when not typing
            if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes((e.target as Element)?.tagName)) {
                e.preventDefault();
                toggle();
            }
            // Escape to stop
            if (e.code === 'Escape' && isActive) {
                stop();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggle, stop, isActive]);

    return (
        <div className={`${positionConfig[position]} z-[9999] ${className}`}>
            <div className="flex flex-col items-end gap-3">
                {/* Transcript Panel */}
                <AnimatePresence>
                    {showTranscript && isActive && (transcript || response) && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="bg-[#0a0a0a]/95 border border-white/10 backdrop-blur-xl rounded-2xl p-4 max-w-sm shadow-2xl"
                        >
                            {/* User transcript */}
                            {transcript && (
                                <div className="mb-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Radio size={10} className="text-[var(--cyan)]" />
                                        <span className="text-[10px] font-mono text-[var(--cyan)] font-bold uppercase tracking-wider">
                                            You
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-300 font-mono leading-relaxed">
                                        {transcript}
                                    </p>
                                </div>
                            )}

                            {/* AI response */}
                            {response && (
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Waves size={10} className="text-[var(--amethyst-soft)]" />
                                        <span className="text-[10px] font-mono text-[var(--amethyst-soft)] font-bold uppercase tracking-wider">
                                            AI
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-300 font-mono leading-relaxed">
                                        {response}
                                    </p>
                                </div>
                            )}

                            {/* Error message */}
                            {error && (
                                <div className="text-red-400 text-xs font-mono mt-2">
                                    {error}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Orb */}
                <motion.button
                    onClick={toggle}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative flex items-center justify-center focus:outline-none"
                >
                    {/* Outer ring - pulses when active */}
                    <motion.div
                        className={`absolute ${sizeConf.ring} rounded-full border-2 ${colors.ring} opacity-30`}
                        animate={isActive ? {
                            scale: [1, 1.2, 1],
                            opacity: [0.3, 0.1, 0.3],
                        } : {}}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    />

                    {/* Speech probability ring */}
                    {isActive && enableVAD && (
                        <motion.div
                            className={`absolute ${sizeConf.ring} rounded-full border-4 ${colors.ring}`}
                            style={{
                                opacity: speechProbability * 0.8,
                                scale: 1 + speechProbability * 0.2,
                            }}
                        />
                    )}

                    {/* Main orb */}
                    <div
                        className={`${sizeConf.orb} rounded-full ${colors.bg} ${colors.text}
                        backdrop-blur-xl border border-white/10
                        flex items-center justify-center
                        shadow-[0_8px_32px_rgba(0,0,0,0.4)]
                        transition-all duration-300`}
                    >
                        <StateIcon state={state} size={sizeConf.icon} />
                    </div>

                    {/* State label on hover */}
                    <AnimatePresence>
                        {(isHovered || state === 'ERROR') && (
                            <motion.div
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className={`absolute right-full mr-3 px-3 py-1.5 rounded-lg
                                bg-[#0a0a0a]/90 border border-white/10 backdrop-blur-xl
                                text-xs font-mono ${colors.text} whitespace-nowrap`}
                            >
                                {stateLabels[state]}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.button>

                {/* Waveform indicator */}
                {isActive && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="mt-1"
                    >
                        <Waveform
                            isActive={state === 'LISTENING' || state === 'SPEAKING'}
                            color={state === 'LISTENING' ? 'bg-[var(--cyan)]' : 'bg-[var(--amethyst-soft)]'}
                        />
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default ConversationalVoiceOrb;
