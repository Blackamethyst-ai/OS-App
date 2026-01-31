/**
 * ARCHON Command Center
 *
 * God-mode UI for the autonomous meta-orchestrator.
 * Features: Neural network visualization, real-time event stream,
 * task graph, model orchestration, escalation handling.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    Brain, Target, Activity, AlertTriangle, Clock, RefreshCw, Sparkles,
    Bot, Network, Terminal, Shield, GitBranch, Waves, Play, Pause, Command, Cpu
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useArchon, eventBus } from '@/services/archon';

// Import extracted components
import {
    NeuralBackground, HoloCard, PhaseOrb, EventStream, TelemetryRing,
    ModelOrchestrationPanel, GoalCommandCenter, OrganismLayersPanel,
    type StreamEvent
} from './parts';

const ArchonDashboard: React.FC = () => {
    const {
        archon,
        isReady,
        phase,
        activeGoals,
        allGoals,
        telemetry,
        models,
        stats,
        activeModelId,
        processGoal,
        reset,
    } = useArchon();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [events, setEvents] = useState<StreamEvent[]>([]);
    const [isPaused, setIsPaused] = useState(false);

    // Organism layers state - will be populated from actual organisms
    const organismLayers = [
        {
            id: 'genome' as const,
            name: 'Agent Genome',
            status: 'idle' as const,
            metrics: {
                invocations: 0,
                successRate: 0.95,
                avgDqScore: 0.85,
                avgLatencyMs: 120,
            },
        },
        {
            id: 'swarm' as const,
            name: 'Swarm Orchestration',
            status: 'idle' as const,
            metrics: {
                invocations: 0,
                successRate: 0.92,
                avgDqScore: 0.82,
                avgLatencyMs: 250,
            },
        },
        {
            id: 'cognitive' as const,
            name: 'Cognitive Cycles',
            status: 'idle' as const,
            phase: 'wake',
            metrics: {
                invocations: 0,
                successRate: 0.88,
                avgDqScore: 0.78,
                avgLatencyMs: 180,
            },
        },
    ];

    // Subscribe to events
    useEffect(() => {
        if (isPaused) return;

        const handleEvent = (event: any) => {
            const streamEvent: StreamEvent = {
                id: `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
                type: event.type,
                message: JSON.stringify(event.payload).slice(0, 100),
                timestamp: event.timestamp,
                level: event.type.includes('error')
                    ? 'error'
                    : event.type.includes('completed')
                    ? 'success'
                    : event.type.includes('escalat')
                    ? 'warning'
                    : 'info',
            };
            setEvents((prev) => [streamEvent, ...prev].slice(0, 50));
        };

        const unsubscribe = eventBus.onAll(handleEvent);
        return unsubscribe;
    }, [isPaused]);

    const handleSubmitGoal = useCallback(
        async (goalText: string) => {
            if (!isReady) return;

            setIsSubmitting(true);
            try {
                await processGoal(goalText);
            } catch (error) {
                console.error('Failed to process goal:', error);
            } finally {
                setIsSubmitting(false);
            }
        },
        [isReady, processGoal]
    );

    const displayGoals = allGoals || [];

    const phases = [
        { id: 'idle', label: 'Idle', icon: <Clock className="w-5 h-5" /> },
        { id: 'receiving_goal', label: 'Receive', icon: <Target className="w-5 h-5" /> },
        { id: 'decomposing', label: 'Decompose', icon: <GitBranch className="w-5 h-5" /> },
        { id: 'routing', label: 'Route', icon: <Network className="w-5 h-5" /> },
        { id: 'executing', label: 'Execute', icon: <Cpu className="w-5 h-5" /> },
        { id: 'verifying', label: 'Verify', icon: <Shield className="w-5 h-5" /> },
        { id: 'escalating', label: 'Escalate', icon: <AlertTriangle className="w-5 h-5" /> },
    ];

    return (
        <div className="min-h-screen bg-black text-white overflow-hidden relative">
            {/* Neural Background */}
            <NeuralBackground active={phase !== 'idle'} />

            {/* Main Grid */}
            <div className="relative z-10 p-6 h-screen flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <motion.div
                            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 flex items-center justify-center"
                            animate={{ rotate: phase !== 'idle' ? 360 : 0 }}
                            transition={{ duration: 3, repeat: phase !== 'idle' ? Infinity : 0, ease: 'linear' }}
                        >
                            <Brain className="w-8 h-8 text-white" />
                        </motion.div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                                ARCHON
                                <motion.span
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                >
                                    <Sparkles className="w-6 h-6 text-yellow-400" />
                                </motion.span>
                            </h1>
                            <p className="text-sm text-gray-500">Autonomous Meta-Orchestrator v1.0</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Status */}
                        <div className="flex items-center gap-2">
                            {isReady ? (
                                <motion.div
                                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30"
                                    animate={{ boxShadow: ['0 0 0 0 rgba(34, 197, 94, 0)', '0 0 0 10px rgba(34, 197, 94, 0)'] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                >
                                    <span className="w-2 h-2 rounded-full bg-green-500" />
                                    <span className="text-green-400 text-sm font-medium">ONLINE</span>
                                </motion.div>
                            ) : (
                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/30">
                                    <RefreshCw className="w-4 h-4 text-yellow-400 animate-spin" />
                                    <span className="text-yellow-400 text-sm font-medium">INITIALIZING</span>
                                </div>
                            )}
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsPaused(!isPaused)}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => reset?.()}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Phase Pipeline */}
                <HoloCard className="mb-6 p-4" active={phase !== 'idle'}>
                    <div className="flex items-center justify-between">
                        {phases.map((p, i) => (
                            <React.Fragment key={p.id}>
                                <PhaseOrb phase={p.id} isActive={phase === p.id} label={p.label} icon={p.icon} />
                                {i < phases.length - 1 && (
                                    <motion.div
                                        className={`flex-1 h-0.5 mx-2 ${
                                            phases.findIndex((ph) => ph.id === phase) > i
                                                ? 'bg-purple-500'
                                                : 'bg-white/10'
                                        }`}
                                        animate={
                                            phases.findIndex((ph) => ph.id === phase) === i
                                                ? { scaleX: [0, 1], originX: 0 }
                                                : {}
                                        }
                                        transition={{ duration: 0.5 }}
                                    />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </HoloCard>

                {/* Main Content */}
                <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
                    {/* Left Panel - Goals */}
                    <div className="col-span-5">
                        <HoloCard className="h-full p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <Target className="w-5 h-5 text-purple-400" />
                                    Mission Control
                                </h2>
                                <span className="text-xs text-gray-500 px-2 py-1 rounded-full bg-white/5">
                                    {displayGoals.length} missions
                                </span>
                            </div>
                            <GoalCommandCenter
                                goals={displayGoals}
                                onSubmit={handleSubmitGoal}
                                isSubmitting={isSubmitting}
                                isReady={isReady}
                            />
                        </HoloCard>
                    </div>

                    {/* Center Panel - Telemetry */}
                    <div className="col-span-4 flex flex-col gap-4">
                        {/* Stats */}
                        <HoloCard className="p-4">
                            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                                <Activity className="w-5 h-5 text-cyan-400" />
                                Telemetry
                            </h2>
                            <div className="flex justify-around">
                                <TelemetryRing
                                    value={telemetry?.goalsProcessed || 0}
                                    max={100}
                                    label="Goals"
                                    color="#a855f7"
                                />
                                <TelemetryRing
                                    value={(telemetry?.avgDqScore || 0) * 100}
                                    max={100}
                                    label="Avg DQ"
                                    color="#22c55e"
                                />
                                <TelemetryRing
                                    value={100 - (telemetry?.escalations || 0) * 10}
                                    max={100}
                                    label="Autonomy"
                                    color="#3b82f6"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-4">
                                <div className="p-3 rounded-lg bg-white/5">
                                    <div className="text-xs text-gray-500">Tokens Used</div>
                                    <div className="text-lg font-bold text-white">
                                        {(telemetry?.totalTokensUsed || 0).toLocaleString()}
                                    </div>
                                </div>
                                <div className="p-3 rounded-lg bg-white/5">
                                    <div className="text-xs text-gray-500">Est. Cost</div>
                                    <div className="text-lg font-bold text-green-400">
                                        ${(telemetry?.costEstimate || 0).toFixed(4)}
                                    </div>
                                </div>
                            </div>
                        </HoloCard>

                        {/* Event Stream */}
                        <HoloCard className="flex-1 p-4 min-h-0">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-bold flex items-center gap-2">
                                    <Terminal className="w-4 h-4 text-green-400" />
                                    Event Stream
                                </h2>
                                <div className="flex items-center gap-1">
                                    <Waves className="w-3 h-3 text-green-400" />
                                    <span className="text-xs text-gray-500">{events.length}</span>
                                </div>
                            </div>
                            <div className="h-[calc(100%-2rem)]">
                                <EventStream events={events} />
                            </div>
                        </HoloCard>
                    </div>

                    {/* Right Panel - Models & Organisms */}
                    <div className="col-span-3 flex flex-col gap-4">
                        {/* Model Fleet */}
                        <HoloCard className="flex-1 p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <Bot className="w-5 h-5 text-blue-400" />
                                    Model Fleet
                                </h2>
                                <div className="flex items-center gap-2 text-xs">
                                    {activeModelId ? (
                                        <motion.span
                                            className="text-green-400 font-medium"
                                            animate={{ opacity: [1, 0.5, 1] }}
                                            transition={{ repeat: Infinity, duration: 1 }}
                                        >
                                            1 running
                                        </motion.span>
                                    ) : (
                                        <span className="text-gray-500">
                                            {models.filter((m: any) => m.available).length} ready
                                        </span>
                                    )}
                                    <span className="text-gray-600">/</span>
                                    <span className="text-gray-500">{models.length} total</span>
                                </div>
                            </div>
                            <div className="h-[calc(100%-3rem)] overflow-y-auto">
                                <ModelOrchestrationPanel models={models} activeModelId={activeModelId} />
                            </div>
                        </HoloCard>

                        {/* Organism Layers */}
                        <HoloCard className="p-4">
                            <OrganismLayersPanel
                                layers={organismLayers}
                                onLayerClick={(layerId) => {
                                    console.log('Layer clicked:', layerId);
                                    // TODO: Open layer details modal
                                }}
                            />
                        </HoloCard>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
                    <div className="flex items-center gap-4">
                        <span>Session: {telemetry?.sessionStart ? new Date(telemetry.sessionStart).toLocaleString() : 'N/A'}</span>
                        <span>Decisions: {telemetry?.decisionsMade || 0}</span>
                        <span>Escalations: {telemetry?.escalations || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Command className="w-3 h-3" />
                        <span>Press Ctrl+K for command palette</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ArchonDashboard;
