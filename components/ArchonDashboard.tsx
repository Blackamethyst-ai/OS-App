/**
 * ARCHON Command Center
 *
 * God-mode UI for the autonomous meta-orchestrator.
 * Features: Neural network visualization, real-time event stream,
 * task graph, model orchestration, escalation handling.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Brain,
  Target,
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  Send,
  RefreshCw,
  Sparkles,
  TrendingUp,
  DollarSign,
  Bot,
  Gauge,
  Network,
  Terminal,
  Eye,
  Shield,
  Flame,
  Rocket,
  Orbit,
  GitBranch,
  Radio,
  Waves,
  ChevronRight,
  X,
  Play,
  Pause,
  Settings,
  Maximize2,
  Command,
  Crosshair,
} from 'lucide-react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useArchon, eventBus } from '@/services/archon';

// =============================================================================
// NEURAL NETWORK BACKGROUND
// =============================================================================

const NeuralBackground: React.FC<{ active: boolean }> = ({ active }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    const nodes: { x: number; y: number; vx: number; vy: number; radius: number; pulse: number }[] = [];
    const nodeCount = 50;

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      // Update and draw nodes
      nodes.forEach((node, i) => {
        node.x += node.vx * (active ? 1.5 : 0.5);
        node.y += node.vy * (active ? 1.5 : 0.5);
        node.pulse += 0.02;

        // Wrap around edges
        if (node.x < 0) node.x = canvas.offsetWidth;
        if (node.x > canvas.offsetWidth) node.x = 0;
        if (node.y < 0) node.y = canvas.offsetHeight;
        if (node.y > canvas.offsetHeight) node.y = 0;

        // Draw connections
        nodes.forEach((other, j) => {
          if (i >= j) return;
          const dx = other.x - node.x;
          const dy = other.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            const alpha = (1 - dist / 120) * (active ? 0.3 : 0.1);
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(147, 51, 234, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });

        // Draw node
        const pulseScale = 1 + Math.sin(node.pulse) * 0.3;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * pulseScale, 0, Math.PI * 2);
        ctx.fillStyle = active ? 'rgba(147, 51, 234, 0.8)' : 'rgba(147, 51, 234, 0.3)';
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationId);
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full opacity-50"
      style={{ pointerEvents: 'none' }}
    />
  );
};

// =============================================================================
// HOLOGRAPHIC CARD
// =============================================================================

const HoloCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  active?: boolean;
}> = ({ children, className = '', glowColor = 'purple', active = false }) => (
  <motion.div
    className={`relative overflow-hidden rounded-2xl ${className}`}
    whileHover={{ scale: 1.01 }}
    transition={{ type: 'spring', stiffness: 400 }}
  >
    {/* Gradient border */}
    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/20 via-transparent to-blue-500/20" />

    {/* Glass effect */}
    <div className="absolute inset-[1px] rounded-2xl bg-black/60 backdrop-blur-xl" />

    {/* Glow effect */}
    {active && (
      <motion.div
        className={`absolute inset-0 rounded-2xl bg-${glowColor}-500/10`}
        animate={{ opacity: [0.1, 0.3, 0.1] }}
        transition={{ repeat: Infinity, duration: 2 }}
      />
    )}

    {/* Content */}
    <div className="relative z-10">{children}</div>
  </motion.div>
);

// =============================================================================
// PHASE ORBS
// =============================================================================

const PhaseOrb: React.FC<{ phase: string; isActive: boolean; label: string; icon: React.ReactNode }> = ({
  phase,
  isActive,
  label,
  icon,
}) => (
  <motion.div
    className={`flex flex-col items-center gap-2 ${isActive ? 'opacity-100' : 'opacity-30'}`}
    animate={isActive ? { scale: [1, 1.1, 1] } : {}}
    transition={{ repeat: isActive ? Infinity : 0, duration: 1.5 }}
  >
    <div
      className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
        isActive
          ? 'bg-purple-500/20 border-purple-500 text-purple-400'
          : 'bg-white/5 border-white/10 text-gray-500'
      }`}
    >
      {icon}
    </div>
    <span className="text-xs text-gray-400">{label}</span>
    {isActive && (
      <motion.div
        className="w-2 h-2 rounded-full bg-purple-500"
        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
        transition={{ repeat: Infinity, duration: 1 }}
      />
    )}
  </motion.div>
);

// =============================================================================
// EVENT STREAM
// =============================================================================

interface StreamEvent {
  id: string;
  type: string;
  message: string;
  timestamp: number;
  level: 'info' | 'success' | 'warning' | 'error';
}

const EventStream: React.FC<{ events: StreamEvent[] }> = ({ events }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [events.length]);

  const levelColors = {
    info: 'text-blue-400',
    success: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
  };

  const levelIcons = {
    info: <Radio className="w-3 h-3" />,
    success: <CheckCircle2 className="w-3 h-3" />,
    warning: <AlertTriangle className="w-3 h-3" />,
    error: <X className="w-3 h-3" />,
  };

  return (
    <div ref={containerRef} className="h-full overflow-y-auto font-mono text-xs space-y-1">
      <AnimatePresence mode="popLayout">
        {events.map((event) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-2 py-1 border-b border-white/5"
          >
            <span className="text-gray-600 shrink-0">
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
            <span className={`shrink-0 ${levelColors[event.level]}`}>
              {levelIcons[event.level]}
            </span>
            <span className="text-gray-400">[{event.type}]</span>
            <span className="text-gray-300 truncate">{event.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
      {events.length === 0 && (
        <div className="text-gray-600 text-center py-4">
          <Terminal className="w-6 h-6 mx-auto mb-2 opacity-30" />
          Waiting for events...
        </div>
      )}
    </div>
  );
};

// =============================================================================
// MODEL ORCHESTRATION PANEL
// =============================================================================

const ModelOrchestrationPanel: React.FC<{ models: any[]; activeModelId?: string | null }> = ({
  models,
  activeModelId,
}) => {
  const tierGroups = useMemo(() => {
    const groups: Record<string, any[]> = { flagship: [], standard: [], fast: [], local: [] };
    models.forEach((m) => {
      if (groups[m.tier]) groups[m.tier].push(m);
    });
    return groups;
  }, [models]);

  const tierConfig = {
    flagship: { color: 'purple', icon: <Flame className="w-4 h-4" />, label: 'Flagship' },
    standard: { color: 'blue', icon: <Zap className="w-4 h-4" />, label: 'Standard' },
    fast: { color: 'green', icon: <Rocket className="w-4 h-4" />, label: 'Fast' },
    local: { color: 'gray', icon: <Cpu className="w-4 h-4" />, label: 'Local' },
  };

  return (
    <div className="space-y-4">
      {Object.entries(tierGroups).map(([tier, tierModels]) => {
        const config = tierConfig[tier as keyof typeof tierConfig];
        if (!tierModels.length) return null;

        return (
          <div key={tier}>
            <div className={`flex items-center gap-2 mb-2 text-${config.color}-400`}>
              {config.icon}
              <span className="text-sm font-medium">{config.label}</span>
              <span className="text-xs text-gray-500">({tierModels.length})</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {tierModels.slice(0, 4).map((model) => {
                const isActive = activeModelId === model.id;
                return (
                  <motion.div
                    key={model.id}
                    className={`px-3 py-2 rounded-lg border relative ${
                      isActive
                        ? 'border-green-500 bg-green-500/20 ring-2 ring-green-500/50'
                        : model.available
                        ? `border-${config.color}-500/30 bg-${config.color}-500/5`
                        : 'border-white/5 bg-white/5 opacity-40'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    animate={isActive ? { boxShadow: ['0 0 0 0 rgba(34, 197, 94, 0.4)', '0 0 0 8px rgba(34, 197, 94, 0)', '0 0 0 0 rgba(34, 197, 94, 0.4)'] } : {}}
                    transition={isActive ? { repeat: Infinity, duration: 1.5 } : {}}
                  >
                    {isActive && (
                      <motion.div
                        className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                      />
                    )}
                    <div className={`text-xs truncate ${isActive ? 'text-green-300 font-medium' : 'text-white'}`}>
                      {model.name}
                    </div>
                    <div className={`text-xs ${isActive ? 'text-green-400' : 'text-gray-500'}`}>
                      {isActive ? 'ACTIVE' : model.provider}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// =============================================================================
// GOAL COMMAND CENTER
// =============================================================================

const GoalCommandCenter: React.FC<{
  goals: any[];
  onSubmit: (goal: string) => void;
  isSubmitting: boolean;
  isReady: boolean;
}> = ({ goals, onSubmit, isSubmitting, isReady }) => {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

  const suggestions = [
    'Add dark mode toggle to settings',
    'Refactor authentication to use OAuth2',
    'Optimize database queries for dashboard',
    'Create comprehensive test suite',
    'Research competitor features',
  ];

  const handleSubmit = () => {
    if (input.trim()) {
      onSubmit(input);
      setInput('');
      setShowSuggestions(false);
    }
  };

  const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    pending: { color: 'gray', icon: <Clock className="w-3 h-3" /> },
    active: { color: 'blue', icon: <Activity className="w-3 h-3 animate-pulse" /> },
    completed: { color: 'green', icon: <CheckCircle2 className="w-3 h-3" /> },
    escalated: { color: 'orange', icon: <AlertTriangle className="w-3 h-3" /> },
    failed: { color: 'red', icon: <X className="w-3 h-3" /> },
  };

  return (
    <div className="h-full flex flex-col">
      {/* Input */}
      <div className="relative mb-4">
        <div className="flex items-center gap-2 bg-black/40 border border-purple-500/30 rounded-xl px-4 py-3">
          <Crosshair className="w-5 h-5 text-purple-400" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Enter mission objective..."
            className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none"
            disabled={!isReady}
            data-voice-id="archon-mission-input"
            aria-label="Mission objective input"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={!isReady || isSubmitting || !input.trim()}
            className="px-4 py-1.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg text-sm font-medium disabled:opacity-50"
            data-voice-id="archon-execute-button"
            aria-label="Execute mission"
          >
            {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Execute'}
          </motion.button>
        </div>

        {/* Suggestions */}
        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-black/90 border border-white/10 rounded-xl overflow-hidden z-50"
            >
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(s);
                    setShowSuggestions(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-400 hover:bg-purple-500/10 hover:text-white transition-colors"
                >
                  <ChevronRight className="w-3 h-3 inline mr-2" />
                  {s}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Goals List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        <AnimatePresence>
          {goals.map((goal) => {
            const status = statusConfig[goal.status] || statusConfig.pending;
            const isExpanded = expandedGoalId === goal.id;
            const hasOutput = goal.output || goal.dqScore;

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`rounded-xl border bg-black/20 border-${status.color}-500/30 overflow-hidden`}
              >
                {/* Goal Header - Clickable */}
                <button
                  onClick={() => hasOutput && setExpandedGoalId(isExpanded ? null : goal.id)}
                  className={`w-full p-3 text-left ${hasOutput ? 'cursor-pointer hover:bg-white/5' : ''} transition-colors`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 text-${status.color}-400`}>{status.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{goal.text}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>Complexity: {(goal.metadata?.complexity * 100 || 0).toFixed(0)}%</span>
                        <span>{goal.metadata?.priority || 'normal'}</span>
                        {goal.dqScore && (
                          <span className="text-green-400">DQ: {(goal.dqScore * 100).toFixed(0)}%</span>
                        )}
                        {goal.executionTimeMs && (
                          <span>{(goal.executionTimeMs / 1000).toFixed(1)}s</span>
                        )}
                      </div>
                      {goal.metadata?.estimatedSubsystems?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {goal.metadata.estimatedSubsystems.map((sub: string) => (
                            <span
                              key={sub}
                              className="px-2 py-0.5 rounded text-xs bg-white/5 text-gray-400"
                            >
                              {sub}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Expand indicator */}
                    {hasOutput && (
                      <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        className="text-gray-500"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </motion.div>
                    )}
                  </div>
                </button>

                {/* Expandable Output Section */}
                <AnimatePresence>
                  {isExpanded && goal.output && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-white/10"
                    >
                      <div className="p-3 bg-black/30">
                        {/* Execution Info */}
                        <div className="flex items-center gap-4 mb-3 text-xs">
                          {goal.subsystemUsed && (
                            <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-400">
                              {goal.subsystemUsed}
                            </span>
                          )}
                          {goal.dqScore && (
                            <span className="px-2 py-1 rounded bg-green-500/20 text-green-400">
                              DQ Score: {(goal.dqScore * 100).toFixed(1)}%
                            </span>
                          )}
                          {goal.executionTimeMs && (
                            <span className="text-gray-500">
                              Executed in {(goal.executionTimeMs / 1000).toFixed(2)}s
                            </span>
                          )}
                        </div>
                        {/* Output Content */}
                        <div className="bg-black/40 rounded-lg p-3 max-h-48 overflow-y-auto">
                          <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                            {goal.output}
                          </pre>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {goals.length === 0 && (
          <div className="text-center py-12 text-gray-600">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No active missions</p>
            <p className="text-sm">Enter an objective above to begin</p>
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// TELEMETRY RING
// =============================================================================

const TelemetryRing: React.FC<{ value: number; max: number; label: string; color: string }> = ({
  value,
  max,
  label,
  color,
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-white/5"
          />
          <motion.circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold" style={{ color }}>
            {percentage.toFixed(0)}%
          </span>
        </div>
      </div>
      <span className="text-xs text-gray-500 mt-2">{label}</span>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const ArchonDashboard: React.FC = () => {
  const {
    archon,
    isReady,
    phase,
    activeGoals,
    allGoals, // New: includes all goals from store
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
        // Goals are automatically added to the store and will appear via allGoals
      } catch (error) {
        console.error('Failed to process goal:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [isReady, processGoal]
  );

  // Use allGoals from the hook (includes all goals sorted by creation time)
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

          {/* Right Panel - Models */}
          <div className="col-span-3">
            <HoloCard className="h-full p-4">
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
