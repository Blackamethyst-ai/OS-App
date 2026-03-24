
import React, { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { logger } from '../services/logger';
import { faceDetectionService } from '../services/faceDetectionService';
import { agentKernel } from '../services/kernel';
import { ShieldCheck, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * MASTER STABILIZATION PROTOCOL
 * 
 * A background service component that ensures system robustness.
 * 
 * Responsibilities:
 * 1. Monitors Critical System Metrics (Kernel Integrity, Biometric Confidence).
 * 2. Auto-Corrects 'Stuck' States (Transitions, Loading, Analysis).
 * 3. Injects Synthetic Confidence when Biometric Sensors fail (prevents UI jitter).
 * 4. Resets detailed views if they crash (handled via Global Error Boundary mostly, but logic here too).
 */

const MasterStabilizationProtocol: React.FC = () => {
    const actions = useAppStore(s => s.actions);
    const kernel = useAppStore(s => s.kernel);
    const biometric = useAppStore(s => s.biometric);
    const isTransitioning = useAppStore(s => s.isTransitioning);
    const dashboard = useAppStore(s => s.dashboard);
    const process = useAppStore(s => s.process);

    // Refs for tracking state duration
    const transitionStartRef = useRef<number | null>(null);
    const lowConfidenceFramesRef = useRef<number>(0);
    const lastStabilizationRef = useRef<number>(0);
    const [isStabilizing, setIsStabilizing] = React.useState(false);

    const triggerStabilizationVisual = useCallback(() => {
        // Prevent spamming
        if (Date.now() - lastStabilizationRef.current > 5000) {
            lastStabilizationRef.current = Date.now();
            setIsStabilizing(true);
            setTimeout(() => setIsStabilizing(false), 2000);
            actions.addLog('SYSTEM', 'PROTOCOL: Stabilization intervention applied.');
        }
    }, [actions]);

    // 1. MONITOR TRANSITION DEADLOCKS
    useEffect(() => {
        if (isTransitioning) {
            if (!transitionStartRef.current) {
                transitionStartRef.current = Date.now();
            } else {
                // If transitioning for > 3 seconds, force reset
                const duration = Date.now() - transitionStartRef.current;
                if (duration > 3000) {
                    logger.warn("STABILIZATION: Detected Transition Deadlock. Forcing reset.");
                    useAppStore.setState({ isTransitioning: false });
                    transitionStartRef.current = null;
                    triggerStabilizationVisual();
                }
            }
        } else {
            transitionStartRef.current = null;
        }
    }, [isTransitioning, triggerStabilizationVisual]);

    // 2. MONITOR BIOMETRIC CONFIDENCE
    useEffect(() => {
        const interval = setInterval(() => {
            if (!biometric.isActive) return;

            const detection = faceDetectionService.getLastDetection();
            if (detection) {
                if (detection.confidence < 0.4) {
                    lowConfidenceFramesRef.current++;
                } else {
                    lowConfidenceFramesRef.current = Math.max(0, lowConfidenceFramesRef.current - 1);
                }

                // If consistently low confidence for ~2 seconds (10 checks), intervene
                if (lowConfidenceFramesRef.current > 10) {
                    logger.info("STABILIZATION: Biometric Signal Weak. Injecting Synthetic Stability.");

                    // Temporarily relax the adaptive UI trigger thresholds
                    // This prevents the UI from "flickering" between complexity levels
                    actions.setBiometricState({
                        stressTrend: 'STABLE', // Force stability
                        attentionScore: 85 // Assume engagement
                    });

                    lowConfidenceFramesRef.current = 0;
                    triggerStabilizationVisual();
                }
            }
        }, 200);

        return () => clearInterval(interval);
    }, [biometric.isActive, actions, triggerStabilizationVisual]);

    // 3. KERNEL INTEGRITY WATCHDOG
    useEffect(() => {
        if (kernel.operationalState === 'ERROR') {
            logger.error("KERNEL ERROR DETECTED. Attempting Soft Reboot.");
            agentKernel.shutdown();
            setTimeout(() => {
                agentKernel.boot().then(() => {
                    actions.addLog('SUCCESS', 'STABILIZATION: System Kernel recovered.');
                    actions.setKernelState({ operationalState: 'IDLE' });
                });
            }, 1000);
            triggerStabilizationVisual();
        }
    }, [kernel.operationalState, actions, triggerStabilizationVisual]);

    // 4. RESET STUCK LOADING STATES
    useEffect(() => {
        if (dashboard.isGenerating) {
            const timer = setTimeout(() => {
                // If still generating after 15s, it's likely stuck
                if (useAppStore.getState().dashboard.isGenerating) {
                    logger.warn("STABILIZATION: Dashboard Generation Stuck. Resetting.");
                    actions.setDashboardState({ isGenerating: false });
                    triggerStabilizationVisual();
                }
            }, 15000);
            return () => clearTimeout(timer);
        }
    }, [dashboard.isGenerating, actions, triggerStabilizationVisual]);

    useEffect(() => {
        if (process.isLoading) {
            const timer = setTimeout(() => {
                if (useAppStore.getState().process.isLoading) {
                    logger.warn("STABILIZATION: Process Map Loading Stuck. Resetting.");
                    actions.setProcessState({ isLoading: false });
                    triggerStabilizationVisual();
                }
            }, 10000);
            return () => clearTimeout(timer);
        }
    }, [process.isLoading, actions, triggerStabilizationVisual]);

    return (
        <AnimatePresence>
            {isStabilizing && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="fixed top-24 right-8 z-[9000] pointer-events-none"
                >
                    <div className="flex items-center gap-3 px-4 py-2 bg-[var(--plasma-green)]/10 border border-[var(--plasma-green)]/40 rounded-full backdrop-blur-md shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                        <ShieldCheck size={14} className="text-[var(--plasma-green)]" />
                        <span className="text-[10px] font-black font-mono text-[var(--plasma-green)] uppercase tracking-widest">
                            Stability Protocol Active
                        </span>
                        <Zap size={12} className="text-[var(--plasma-green)] animate-pulse" />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MasterStabilizationProtocol;
