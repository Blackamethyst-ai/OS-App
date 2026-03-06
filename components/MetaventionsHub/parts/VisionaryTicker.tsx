/**
 * METAVENTIONS HUB - Visionary Ticker
 * Rotating directive display component.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { VISIONARY_DIRECTIVES } from '../../../data/directives';

/**
 * Animated ticker that cycles through visionary directives.
 */
export const VisionaryTicker: React.FC = () => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(
            () => setIndex(i => (i + 1) % VISIONARY_DIRECTIVES.length),
            8000
        );
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-black/60 backdrop-blur-xl border border-white/5 px-6 py-2 rounded-full shadow-2xl">
            <AnimatePresence mode="wait">
                <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-3"
                >
                    <Sparkles size={10} className="text-[var(--executive-gold)] animate-pulse" />
                    <span className="text-[8px] font-black font-mono text-gray-400 uppercase tracking-[0.4em] italic">
                        {VISIONARY_DIRECTIVES[index]}
                    </span>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default VisionaryTicker;
