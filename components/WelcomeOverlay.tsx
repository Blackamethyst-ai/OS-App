import React, { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
    Mic,
    Bot,
    ImagePlus,
    Code2,
    Brain,
    Wallet,
    ArrowRight,
    Command,
    Hexagon,
} from 'lucide-react';

const SECTORS = [
    { icon: Mic, label: 'Voice Core', desc: 'Real-time AI voice interface', color: 'var(--cyan)' },
    { icon: Bot, label: 'Agent Control', desc: 'Multi-agent orchestration', color: 'var(--amethyst)' },
    { icon: ImagePlus, label: 'Image Gen', desc: 'AI-powered image generation', color: 'var(--plasma-green)' },
    { icon: Code2, label: 'Code Studio', desc: 'Intelligent code workspace', color: 'var(--cyan)' },
    { icon: Brain, label: 'Memory Core', desc: 'Knowledge graph & memory', color: 'var(--amethyst)' },
    { icon: Wallet, label: 'Finance', desc: 'Autonomous financial tracking', color: 'var(--plasma-green)' },
] as const;

const SHORTCUTS = [
    { key: '1', label: 'Dashboard' },
    { key: '2', label: 'Hub' },
    { key: '3', label: 'Voice' },
    { key: '4', label: 'Agents' },
    { key: '5', label: 'Cinema' },
    { key: '6', label: 'Code' },
    { key: '7', label: 'Memory' },
    { key: '8', label: 'Hardware' },
    { key: '9', label: 'Finance' },
    { key: 'K', label: 'Command Palette' },
] as const;

const STEP_COUNT = 3;

const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 80 : -80,
        opacity: 0,
    }),
    center: {
        x: 0,
        opacity: 1,
    },
    exit: (direction: number) => ({
        x: direction > 0 ? -80 : 80,
        opacity: 0,
    }),
};

const WelcomeOverlay: React.FC = () => {
    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState(1);
    const [dismissed, setDismissed] = useState(false);

    const next = useCallback(() => {
        if (step < STEP_COUNT - 1) {
            setDirection(1);
            setStep(s => s + 1);
        }
    }, [step]);

    const dismiss = useCallback(() => {
        localStorage.setItem('metaventions_onboarded', 'true');
        setDismissed(true);
    }, []);

    if (dismissed) return null;

    return (
        <div className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-3xl flex items-center justify-center">
            {/* Subtle radial glow */}
            <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.06) 0%, transparent 70%)',
            }} />

            {/* Step indicators */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2">
                {Array.from({ length: STEP_COUNT }).map((_, i) => (
                    <div
                        key={i}
                        className="h-1 rounded-full transition-all duration-500"
                        style={{
                            width: i === step ? 32 : 8,
                            backgroundColor: i === step ? 'var(--amethyst)' : 'rgba(255,255,255,0.15)',
                        }}
                    />
                ))}
            </div>

            <AnimatePresence mode="wait" custom={direction}>
                {step === 0 && (
                    <motion.div
                        key="step-0"
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="flex flex-col items-center text-center max-w-lg px-6"
                    >
                        {/* Logo mark */}
                        <div className="relative mb-8">
                            <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center">
                                <Hexagon size={36} className="text-[var(--amethyst)]" strokeWidth={1.5} />
                            </div>
                            <div className="absolute -inset-4 rounded-3xl opacity-30 blur-2xl" style={{ background: 'var(--amethyst)' }} />
                        </div>

                        <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
                            Welcome to Metaventions AI
                        </h1>
                        <p className="text-sm font-mono text-white/40 uppercase tracking-[0.25em] mb-10">
                            Sovereign AI Platform
                        </p>

                        <button
                            onClick={next}
                            className="group flex items-center gap-2 px-8 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white font-mono text-sm tracking-wide hover:bg-white/[0.06] hover:border-[var(--amethyst)]/30 transition-all duration-300"
                        >
                            Get Started
                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </motion.div>
                )}

                {step === 1 && (
                    <motion.div
                        key="step-1"
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="flex flex-col items-center max-w-2xl px-6"
                    >
                        <h2 className="text-xl font-bold text-white mb-2 tracking-tight">
                            Quick Tour
                        </h2>
                        <p className="text-sm text-white/40 font-mono mb-8">
                            Six core sectors power the platform
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full mb-10">
                            {SECTORS.map(({ icon: Icon, label, desc, color }) => (
                                <div
                                    key={label}
                                    className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 flex flex-col gap-3 hover:border-white/[0.15] transition-all duration-300"
                                >
                                    <Icon size={22} style={{ color }} strokeWidth={1.5} />
                                    <div>
                                        <div className="text-sm font-mono text-white/90 font-semibold">{label}</div>
                                        <div className="text-xs text-white/35 mt-1 leading-relaxed">{desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={next}
                            className="group flex items-center gap-2 px-8 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white font-mono text-sm tracking-wide hover:bg-white/[0.06] hover:border-[var(--amethyst)]/30 transition-all duration-300"
                        >
                            Next
                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div
                        key="step-2"
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="flex flex-col items-center max-w-lg px-6"
                    >
                        <h2 className="text-xl font-bold text-white mb-2 tracking-tight">
                            Keyboard Shortcuts
                        </h2>
                        <p className="text-sm text-white/40 font-mono mb-8">
                            Navigate instantly with these shortcuts
                        </p>

                        <div className="grid grid-cols-2 gap-2 w-full mb-10">
                            {SHORTCUTS.map(({ key, label }) => (
                                <div
                                    key={key}
                                    className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 hover:border-white/[0.15] transition-all duration-300"
                                >
                                    <kbd className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.06] border border-white/[0.1] text-[11px] font-mono text-white/70 shrink-0">
                                        <Command size={10} />
                                        {key}
                                    </kbd>
                                    <span className="text-sm text-white/60">{label}</span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={dismiss}
                            className="group flex items-center gap-2 px-8 py-3 rounded-xl bg-[var(--amethyst)]/20 border border-[var(--amethyst)]/30 text-white font-mono text-sm tracking-wide hover:bg-[var(--amethyst)]/30 hover:border-[var(--amethyst)]/50 transition-all duration-300"
                        >
                            Enter the Platform
                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WelcomeOverlay;
