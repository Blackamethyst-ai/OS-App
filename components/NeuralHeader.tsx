
import React from 'react';
import { useAppStore } from '../store';
import { motion } from 'framer-motion';
import MetaventionsLogo from './MetaventionsLogo';

const NeuralHeader: React.FC = () => {
    const { toggleTerminal } = useAppStore();

    return (
        <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative cursor-pointer group flex items-center justify-center bg-black/40 rounded-xl border border-white/5 hover:border-[#9d4edd]/50 transition-all shadow-inner px-3 py-1" 
            role="button"
            onClick={() => toggleTerminal()}
        >
            <MetaventionsLogo size={28} />
            <div className="absolute inset-0 rounded-xl bg-[#9d4edd]/5 opacity-0 group-hover:opacity-100 transition-opacity blur-md" />
        </motion.div>
    );
};

export default NeuralHeader;
