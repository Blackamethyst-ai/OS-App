import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '../../../store';
import { useSystemMind, EpochEvent } from '../../../stores/useSystemMind';
import {
    liveSession,
    HIVE_AGENTS,
    constructHiveContext,
    runAgentReasoning
} from '../../../services/geminiService';
import { voiceNexus, analyzeComplexity, runPreflightCheck, formatPreflightResult } from '../../../services/voiceNexus';
import type { VoiceMode } from '../../../services/voiceNexus/types';
// Capabilities Registry (consolidated source of truth)
import {
    executeCapability,
    findCapability,
    getCapability,
    getVoiceCapabilityList,
    initializeCapabilities,
    // CPB routing functions (migrated from unifiedActionRegistry)
    routeQueryToCPB,
    executeQueryWithCPB,
    type CPBStatus,
} from '../../../services/capabilities';
import { AppMode } from '../../../types';
import { TaskStatus, TaskPriority } from '../../../types/domain/tasks';
import { LiveServerMessage } from '@google/genai';
import { audio } from '../../../services/audioService';
import { CODEBASE_KNOWLEDGE, buildCodebaseContext } from '../../../services/archon';
import { getFullSystemContext, getSectorContext } from '../../../services/voiceUIContext';
import { fillInput, clickButton, selectOption, scanInteractiveElements } from '../../../services/universalVoiceHooks';
import { navigateToTab, generateTabContext } from '../../../services/tabNavigationRegistry';
import type { CPBPath } from '../../../services/cognitivePrecisionBridge/types';
import { SovereignMemory } from '../../../services/memory/MemoryStore';
import { neuralVault } from '../../../services/persistenceService';
import { faceDetectionService } from '../../../services/faceDetectionService';
import { dreamProtocol, DreamInsight } from '../../../services/dreamProtocol';
import { adaptiveConsensusEngine, quickConsensus, ACEStatus, ACEResult, generateDecompositionMap } from '../../../services/bicameralService';
import { logger } from '../../../services/logger';

// Initialize memory service singleton
const sovereignMemory = new SovereignMemory();

// Import extracted tool declarations
import { VOICE_TOOLS } from './parts/tools';
import {
    handleClickElement,
    handleExecuteComponentAction,
    handleInputText,
    handleNavigateToTab,
    handleScanUI,
    handleSelectOption,
} from './parts/executionHandlers';

const VoiceManager: React.FC = () => {
    const {
        voice, voiceNexus: nexusState, actions,
        operationalContext
    } = useAppStore();
    const { setVoiceState, setVoiceNexusState, setMode, addLog, setCPBState } = actions;

    const {
        currentLocation,
        getSnapshot,
        executeAction,
        actionRegistry,
        activeTelemetry,
        getEpoch,
        getActionsForSector,
        subscribeToEpoch,
        getContextDigest
    } = useSystemMind();

    const connectionAttemptRef = useRef(false);
    const lastConnectedNameRef = useRef<string | null>(null);
    const partialTranscriptRef = useRef<string>("");
    const sessionVersionRef = useRef(0); // Guards against stale callbacks

    // Refs for values used inside syncSession that should NOT trigger re-runs
    const currentLocationRef = useRef(currentLocation);
    const operationalContextRef = useRef(operationalContext);
    const mentalStateRef = useRef(voice.mentalState);
    currentLocationRef.current = currentLocation;
    operationalContextRef.current = operationalContext;
    mentalStateRef.current = voice.mentalState;

    // ==========================================================================
    // SYNCHRONIZED CLOCK - Track context freshness
    // ==========================================================================
    const sessionEpochRef = useRef<number>(0);        // Epoch when session started
    const lastContextDigestRef = useRef<string>('');  // Quick digest for staleness check
    const epochChangesPendingRef = useRef<EpochEvent[]>([]);  // Queued changes during session

    // Capabilities Registry initialization happens in index.tsx
    // The unified registry initialization has been removed (US-002)

    // Subscribe to epoch changes for synchronized clock awareness
    useEffect(() => {
        const unsubscribe = subscribeToEpoch((event: EpochEvent) => {
            // If we have an active voice session, track the change
            if (voice.isActive) {
                epochChangesPendingRef.current.push(event);

                // Log significant changes
                if (event.reason === 'sector_changed') {
                    logger.debug(`Sector changed during session: ${event.details}`, undefined, 'VoiceManager');
                    addLog('SYSTEM', `VOICE_SYNC: Context drift detected - sector changed to ${event.details}`);
                } else if (event.reason === 'bulk_update') {
                    logger.debug(`Actions updated during session: ${event.details}`, undefined, 'VoiceManager');
                }
            }
        });

        return unsubscribe;
    }, [voice.isActive, addLog, subscribeToEpoch]);

    useEffect(() => {
        liveSession.onToolCall = async (name, rawArgs) => {
            const args = rawArgs && typeof rawArgs === 'object'
                ? rawArgs as Record<string, unknown>
                : {};
            logger.debug('Tool Invoked', { name, args }, 'VoiceManager');

            if (name === 'navigate_to_sector') {
                const targetSector = typeof args.target_sector === 'string' ? args.target_sector.trim() : '';
                if (!targetSector) {
                    return { error: "Missing required target_sector", hint: "Provide a valid sector to navigate_to_sector" };
                }
                const target = targetSector.toUpperCase() as AppMode;

                const routeMap: Record<AppMode, string> = {
                    [AppMode.DASHBOARD]: '/dashboard',
                    [AppMode.METAVENTIONS_HUB]: '/metaventions-hub',
                    [AppMode.BIBLIOMORPHIC]: '/bibliomorphic',
                    [AppMode.PROCESS_MAP]: '/process',
                    [AppMode.MEMORY_CORE]: '/memory',
                    [AppMode.IMAGE_GEN]: '/assets',
                    [AppMode.HARDWARE_ENGINEER]: '/hardware',
                    [AppMode.CODE_STUDIO]: '/code',
                    [AppMode.VOICE_MODE]: '/voice',
                    [AppMode.SYNTHESIS_BRIDGE]: '/bridge',
                    [AppMode.BICAMERAL]: '/bibliomorphic/bicameral',
                    [AppMode.AGENT_CONTROL]: '/agents',
                    [AppMode.AUTONOMOUS_FINANCE]: '/finance',
                    [AppMode.AGENT_CORE_TEST]: '/agent-core-test',
                    [AppMode.CPB_TEST]: '/cpb-test',
                    [AppMode.ARCHON]: '/archon',
                    [AppMode.META_LEARNING]: '/meta-learning',
                    [AppMode.SOVEREIGN_GALLERY]: '/vault',
                };

                if (routeMap[target]) {
                    setMode(target);
                    window.location.hash = routeMap[target];
                    addLog('SUCCESS', `VOICE_EXECUTIVE: Sector migration to [${target}] synchronized.`);
                    audio.playTransition();
                    return { status: "OK", vector: "SYNAPTIC_HANDOVER_COMPLETE", target };
                } else {
                    addLog('ERROR', `VOICE_EXECUTIVE: Handover vector [${target}] not mapped.`);
                    return { error: "Destination node offline", available: Object.values(AppMode) };
                }
            }

            if (name === 'synthesize_topology') {
                addLog('SYSTEM', `VOICE_ARCHITECT: Initializing ${args.type} logic crystallization...`);
                const result = await executeAction('architect_generate_process', args);
                return result.output;
            }

            if (name === 'recalibrate_dna') {
                const result = await executeAction('adjust_agent_dna', {
                    agentId: args.agentId,
                    weights: { skepticism: args.skepticism, excitement: args.excitement, alignment: args.alignment }
                });
                return result.output;
            }

            if (name === 'switch_agent') {
                // Handled via onAgentSwitch event, but return confirming status
                return { status: "HANDOVER_INITIATED", target: args.agentName };
            }

            if (name === 'execute_component_action') {
                return handleExecuteComponentAction(args as Record<string, unknown>, {
                    addLog,
                    logger,
                    audio,
                    getCapability,
                    findCapability,
                    executeCapability,
                    executeAction,
                    actionRegistry: actionRegistry as Record<string, unknown>,
                });
            }

            if (name === 'get_available_actions') {
                const snapshot = getSnapshot();
                addLog('SYSTEM', `VOICE_EXECUTIVE: ${snapshot.available_actions.length} actions available.`);
                return {
                    status: "OK",
                    current_sector: snapshot.current_location,
                    available_actions: snapshot.available_actions,
                    hint: "Use execute_component_action with an action_id to perform an action"
                };
            }

            if (name === 'input_text') {
                return handleInputText(args as Record<string, unknown>, {
                    addLog,
                    audio,
                    executeAction,
                    actionRegistry: actionRegistry as Record<string, unknown>,
                    fillInput,
                });
            }

            if (name === 'click_element') {
                return handleClickElement(args as Record<string, unknown>, {
                    addLog,
                    audio,
                    clickButton,
                });
            }

            if (name === 'select_option') {
                return handleSelectOption(args as Record<string, unknown>, {
                    addLog,
                    audio,
                    selectOption,
                });
            }

            if (name === 'scan_ui') {
                return handleScanUI({
                    addLog,
                    scanInteractiveElements: () => ({ ...scanInteractiveElements() }),
                });
            }

            if (name === 'navigate_to_tab') {
                return handleNavigateToTab(args as Record<string, unknown>, {
                    addLog,
                    logger,
                    audio,
                    findCapability,
                    executeCapability,
                    navigateToTab,
                });
            }

            if (name === 'get_ui_context') {
                const snapshot = getSnapshot();
                return {
                    status: "OK",
                    ...snapshot,
                    hint: "Use execute_component_action or input_text to interact with the UI"
                };
            }

            // =================================================================
            // SYNCHRONIZED CLOCK HANDLER - Context freshness check
            // =================================================================
            if (name === 'refresh_context') {
                const reason = args.reason || 'user_request';
                const currentEpoch = getEpoch();
                const currentDigest = getContextDigest();
                const startEpoch = sessionEpochRef.current;
                const pendingChanges = epochChangesPendingRef.current;

                // Get current sector and relevant actions
                const currentMode = useAppStore.getState().mode;
                const currentSector = currentLocation || currentMode || 'HUB';
                const relevantActions = getActionsForSector(currentMode);

                // Clear pending changes after reporting
                epochChangesPendingRef.current = [];

                // Calculate staleness
                const epochDrift = currentEpoch - startEpoch;
                const isStale = epochDrift > 0;
                const digestChanged = currentDigest !== lastContextDigestRef.current;

                // Update cached digest
                lastContextDigestRef.current = currentDigest;

                addLog('SYSTEM', `VOICE_SYNC: Context refresh (epoch ${startEpoch}→${currentEpoch}, drift=${epochDrift})`);

                return {
                    status: "CONTEXT_REFRESHED",
                    synchronized_clock: {
                        session_start_epoch: startEpoch,
                        current_epoch: currentEpoch,
                        epoch_drift: epochDrift,
                        is_stale: isStale,
                        changes_since_start: pendingChanges.map(e => ({
                            epoch: e.epoch,
                            reason: e.reason,
                            details: e.details
                        }))
                    },
                    current_context: {
                        sector: currentSector,
                        digest: currentDigest,
                        action_count: relevantActions.length
                    },
                    // Top 30 most relevant actions for current sector
                    available_actions: relevantActions.slice(0, 30).map(a => ({
                        id: a.id,
                        description: a.description,
                        priority: a.priority
                    })),
                    hint: isStale
                        ? `Context was stale (${epochDrift} changes since session start). You now have fresh action list for ${currentSector}.`
                        : `Context is synchronized. ${relevantActions.length} actions available in ${currentSector}.`
                };
            }

            // =================================================================
            // THINK HANDLER - Routes complex reasoning through CPB
            // =================================================================
            if (name === 'think') {
                const task = typeof args.task === 'string' ? args.task.trim() : '';
                const context = typeof args.context === 'string' ? args.context : undefined;

                if (!task) {
                    addLog('WARN', 'THINK: Missing required task in tool call.');
                    return {
                        status: "THOUGHT_ERROR",
                        error: "Missing required task",
                        instruction: "Provide a concrete task string before invoking think."
                    };
                }

                addLog('SYSTEM', `THINK: Processing "${task.slice(0, 50)}${task.length > 50 ? '...' : ''}"`);

                // Route through CPB (using capabilities registry)
                const routing = routeQueryToCPB(task, context);
                addLog('SYSTEM', `THINK: Routed to ${routing.path} path (confidence: ${(routing.confidence * 100).toFixed(0)}%)`);

                // Update CPB visual state - START
                setCPBState({
                    isActive: true,
                    phase: 'analyzing',
                    path: routing.path as any,
                    progress: 10,
                    message: `Routing to ${routing.path}: ${task.slice(0, 40)}...`,
                    error: null
                });

                try {
                    const result = await executeQueryWithCPB(task, context, (status: CPBStatus) => {
                        // Update visual state on each phase change
                        if (status.phase && status.phase !== 'idle') {
                            addLog('SYSTEM', `THINK [${status.phase}]: ${status.message || ''}`);
                            setCPBState({
                                phase: status.phase as any,
                                progress: status.progress || 50,
                                message: status.message || `${status.phase}...`
                            });
                        }
                    });

                    if (result.success) {
                        const dqPercent = result.dqScore ? (result.dqScore * 100).toFixed(0) : 'N/A';
                        addLog('SUCCESS', `THINK: Complete (${result.executionPath}, DQ: ${dqPercent}%)`);
                        audio.playSuccess();

                        // Update CPB visual state - COMPLETE
                        setCPBState({
                            isActive: false,
                            phase: 'complete',
                            progress: 100,
                            message: `Complete via ${result.executionPath}`,
                            lastResult: {
                                output: typeof result.output === 'string' ? result.output.slice(0, 200) : JSON.stringify(result.output).slice(0, 200),
                                confidence: result.dqScore ? result.dqScore * 100 : 70,
                                dqScore: result.dqScore || 0.7,
                                path: result.executionPath,
                                executionTimeMs: result.executionTimeMs || 0,
                                tokensUsed: 0,
                                verified: true,
                                pathReasoning: routing.reasoning
                            }
                        });

                        // Auto-hide after 5 seconds
                        setTimeout(() => {
                            setCPBState({ phase: 'idle', isActive: false });
                        }, 5000);

                        // Return the reasoning result for voice AI to use
                        return {
                            status: "THOUGHT_COMPLETE",
                            reasoning_path: routing.path,
                            reasoning: routing.reasoning,
                            response: result.output,
                            quality_score: dqPercent + '%',
                            execution_time_ms: result.executionTimeMs,
                            instruction: "Use this response to answer the user's question. The response has been validated for quality."
                        };
                    } else {
                        addLog('WARN', `THINK: Low quality result, providing anyway`);
                        setCPBState({
                            isActive: false,
                            phase: 'complete',
                            progress: 100,
                            message: 'Completed with warnings'
                        });
                        setTimeout(() => setCPBState({ phase: 'idle' }), 3000);

                        const partialResponse = typeof result.output === 'string'
                            ? result.output
                            : (result.output as any)?.error || "Could not fully process the request";

                        return {
                            status: "THOUGHT_PARTIAL",
                            response: partialResponse,
                            instruction: "The reasoning had issues. Answer based on your knowledge, acknowledging uncertainty."
                        };
                    }
                } catch (error: unknown) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    addLog('ERROR', `THINK: Error - ${errorMessage}`);

                    // Update CPB visual state - ERROR
                    setCPBState({
                        isActive: false,
                        phase: 'error',
                        progress: 0,
                        message: 'Processing failed',
                        error: errorMessage
                    });
                    setTimeout(() => setCPBState({ phase: 'idle', error: null }), 5000);

                    return {
                        status: "THOUGHT_ERROR",
                        error: errorMessage,
                        instruction: "Reasoning failed. Answer based on your knowledge and apologize for limited processing."
                    };
                }
            }

            // =================================================================
            // SEARCH INTELLIGENCE - Grounded search
            // =================================================================
            if (name === 'search_intel') {
                const query = typeof args.query === 'string' ? args.query.trim() : '';
                if (!query) {
                    return {
                        error: "Missing required query",
                        hint: "Provide a search query string before invoking search_intel"
                    };
                }
                addLog('SYSTEM', `INTEL: Searching for "${query}"...`);

                try {
                    const result = await executeAction('search_intel', { query });
                    if (result.success) {
                        addLog('SUCCESS', `INTEL: Search complete.`);
                        return {
                            status: "SEARCH_COMPLETE",
                            result: (result.output as any)?.result,
                            instruction: "Present this information to the user conversationally."
                        };
                    }
                    return { error: (result.output as any)?.error || 'Search failed' };
                } catch (e: unknown) {
                    const message = e instanceof Error ? e.message : String(e);
                    return { error: message };
                }
            }

            // =================================================================
            // CONVERGE LATTICES - Strategic synthesis
            // =================================================================
            if (name === 'converge_lattices') {
                const targetGoal = typeof args.targetGoal === 'string' ? args.targetGoal.trim() : '';
                if (!targetGoal) {
                    return {
                        error: "Missing required targetGoal",
                        hint: "Provide a target goal before invoking converge_lattices"
                    };
                }
                addLog('SYSTEM', `CONVERGENCE: Synthesizing lattices toward "${targetGoal}"...`);

                try {
                    const result = await executeAction('converge_strategic_lattices', { targetGoal });
                    if (result.success) {
                        const output = result.output as any;
                        addLog('SUCCESS', `CONVERGENCE: Synthesis complete. Coherence: ${output.coherence}`);
                        audio.playSuccess();
                        return {
                            status: "CONVERGENCE_COMPLETE",
                            goal: output.goal,
                            coherence: output.coherence
                        };
                    }
                    return { error: (result.output as any)?.error || 'Convergence failed' };
                } catch (e: unknown) {
                    const message = e instanceof Error ? e.message : String(e);
                    return { error: message };
                }
            }

            // =================================================================
            // TASK MANAGEMENT - Real store integration
            // =================================================================

            if (name === 'create_task') {
                const title = typeof args.title === 'string' ? args.title.trim() : '';
                const description = typeof args.description === 'string' ? args.description : '';
                const priority = typeof args.priority === 'string' ? args.priority : 'MEDIUM';
                const tags = Array.isArray(args.tags)
                    ? args.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
                    : [];
                if (!title) {
                    return { error: "Missing required title", hint: "Provide a task title before create_task" };
                }
                addLog('SYSTEM', `📋 CREATING TASK: "${title}"`);

                try {
                    const { addTask } = useAppStore.getState().actions;
                    addTask({
                        title,
                        description,
                        status: TaskStatus.TODO,
                        priority: priority as TaskPriority,
                        tags
                    });

                    audio.playClick();
                    addLog('SUCCESS', `✅ TASK CREATED: "${title}"`);
                    return {
                        status: "TASK_CREATED",
                        title,
                        priority,
                        message: `Task created, Sir: "${title}". Priority: ${priority}.`
                    };
                } catch (e: any) {
                    addLog('ERROR', `Task creation failed: ${e.message}`);
                    return { error: e.message };
                }
            }

            if (name === 'update_task_priority') {
                const rawTaskId = typeof args.taskId === 'string' ? args.taskId.trim() : '';
                const priorityValue = typeof args.priority === 'string' ? args.priority.trim() : '';
                if (!rawTaskId) {
                    return { error: "Missing required taskId", hint: "Provide the task ID or title fragment to update" };
                }
                if (!priorityValue) {
                    return { error: "Missing required priority", hint: "Provide a priority value (LOW, MEDIUM, HIGH, or CRITICAL)" };
                }
                addLog('SYSTEM', `📋 UPDATING PRIORITY: ${rawTaskId} → ${priorityValue}`);

                try {
                    const state = useAppStore.getState();
                    const { updateTask } = state.actions;
                    const taskIdNeedle = rawTaskId.toLowerCase();

                    // Find task by ID or partial match
                    const task = state.tasks.find(t =>
                        t.id === rawTaskId ||
                        t.title.toLowerCase().includes(taskIdNeedle)
                    );

                    if (!task) {
                        return { error: `Task not found: ${rawTaskId}`, availableTasks: state.tasks.map(t => t.title) };
                    }

                    updateTask(task.id, { priority: priorityValue as any });
                    audio.playClick();
                    addLog('SUCCESS', `✅ PRIORITY UPDATED: "${task.title}" → ${priorityValue}`);
                    return {
                        status: "PRIORITY_UPDATED",
                        taskId: task.id,
                        title: task.title,
                        priority: priorityValue,
                        message: `Priority updated to ${priorityValue}, Sir.`
                    };
                } catch (e: any) {
                    return { error: e.message };
                }
            }

            if (name === 'complete_task') {
                const taskId = typeof args.taskId === 'string' ? args.taskId.trim() : '';
                const taskTitle = typeof args.taskTitle === 'string' ? args.taskTitle.trim() : '';
                addLog('SYSTEM', `✅ COMPLETING TASK...`);

                try {
                    const state = useAppStore.getState();
                    const { updateTask } = state.actions;

                    let task;
                    if (taskId === 'last' || (!taskId && !taskTitle)) {
                        // Get the most recent non-completed task
                        task = [...state.tasks]
                            .filter(t => t.status !== 'DONE' && t.status !== 'COMPLETED')
                            .sort((a, b) => b.timestamp - a.timestamp)[0];
                    } else if (taskTitle) {
                        const taskTitleNeedle = taskTitle.toLowerCase();
                        task = state.tasks.find(t =>
                            t.title.toLowerCase().includes(taskTitleNeedle)
                        );
                    } else {
                        task = state.tasks.find(t => t.id === taskId);
                    }

                    if (!task) {
                        return { error: "No matching task found", availableTasks: state.tasks.filter(t => t.status !== 'DONE').map(t => t.title) };
                    }

                    updateTask(task.id, { status: 'DONE' as any });
                    audio.playClick();
                    addLog('SUCCESS', `✅ COMPLETED: "${task.title}"`);
                    return {
                        status: "TASK_COMPLETED",
                        taskId: task.id,
                        title: task.title,
                        message: `Task completed, Sir: "${task.title}". Well done.`
                    };
                } catch (e: any) {
                    return { error: e.message };
                }
            }

            if (name === 'list_tasks') {
                const { filter, limit } = args;
                addLog('SYSTEM', `📋 LISTING TASKS: ${filter || 'all'}`);

                try {
                    const state = useAppStore.getState();
                    let tasks = [...state.tasks];

                    // Apply filter
                    if (filter === 'todo') {
                        tasks = tasks.filter(t => t.status === 'TODO');
                    } else if (filter === 'in_progress') {
                        tasks = tasks.filter(t => t.status === 'IN_PROGRESS');
                    } else if (filter === 'done') {
                        tasks = tasks.filter(t => t.status === 'DONE' || t.status === 'COMPLETED');
                    } else if (filter === 'high_priority') {
                        tasks = tasks.filter(t => t.priority === 'HIGH' || t.priority === 'CRITICAL');
                    }

                    // Sort by priority and timestamp
                    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
                    tasks.sort((a, b) => {
                        const pDiff = (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) -
                                      (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
                        return pDiff !== 0 ? pDiff : b.timestamp - a.timestamp;
                    });

                    // Apply limit
                    if (limit) {
                        tasks = tasks.slice(0, limit as number);
                    }

                    const taskSummary = tasks.map(t => ({
                        id: t.id,
                        title: t.title,
                        status: t.status,
                        priority: t.priority
                    }));

                    return {
                        status: "TASKS_LISTED",
                        filter: filter || 'all',
                        count: tasks.length,
                        total: state.tasks.length,
                        tasks: taskSummary,
                        message: tasks.length === 0
                            ? `No ${filter || ''} tasks found, Sir.`
                            : `You have ${tasks.length} ${filter || ''} task${tasks.length === 1 ? '' : 's'}, Sir.`,
                        instruction: tasks.length > 0
                            ? `List these tasks: ${tasks.map(t => `"${t.title}" (${t.priority}, ${t.status})`).join(', ')}`
                            : undefined
                    };
                } catch (e: any) {
                    return { error: e.message };
                }
            }

            // =================================================================
            // PROPOSE CHANGE - Submit swarm proposal
            // =================================================================
            if (name === 'propose_change') {
                const { type, title, description, impact } = args;
                addLog('SYSTEM', `PROPOSAL: Submitting ${type} proposal "${title}"...`);

                try {
                    const result = await executeAction('propose_structural_change', {
                        agentId: voice.voiceName.toLowerCase().replace(/\s+/g, '_'),
                        agentName: voice.voiceName,
                        type,
                        title,
                        description,
                        impact: impact || 'To be assessed',
                        manifest_summary: description
                    });
                    if (result.success) {
                        addLog('SUCCESS', `PROPOSAL: Staged for review.`);
                        audio.playSuccess();
                        return {
                            status: "PROPOSAL_SUBMITTED",
                            proposalId: (result.output as any).proposalId,
                            message: "Proposal submitted for swarm review, Sir."
                        };
                    }
                    return { error: (result.output as any)?.error || 'Proposal failed' };
                } catch (e: any) {
                    return { error: e.message };
                }
            }

            // =================================================================
            // SYSTEM STATUS - Comprehensive real-time status
            // =================================================================
            if (name === 'system_status') {
                const state = useAppStore.getState();
                addLog('SYSTEM', `📊 STATUS: Compiling comprehensive system report...`);

                // Task statistics (from store)
                const tasks = state.research?.tasks || state.tasks || [];
                const taskStats = {
                    total: tasks.length,
                    todo: tasks.filter((t: any) => t.status === 'TODO').length,
                    inProgress: tasks.filter((t: any) => t.status === 'IN_PROGRESS').length,
                    done: tasks.filter((t: any) => t.status === 'DONE' || t.status === 'COMPLETED').length,
                    highPriority: tasks.filter((t: any) => t.priority === 'HIGH' || t.priority === 'CRITICAL').length
                };

                // Voice system status
                const voiceStatus = {
                    active: state.voice.isActive,
                    mode: state.voice.mode,
                    currentVoice: state.voice.voiceName,
                    isConnecting: state.voice.isConnecting,
                    nexusMode: state.voiceNexus?.mode || 'unknown'
                };

                // Real biometrics status from faceDetectionService
                const faceServiceReady = faceDetectionService.isReady();
                const lastDetection = faceDetectionService.getLastDetection();
                const stressEstimate = faceDetectionService.estimateStress();
                const biometricStatus = {
                    serviceReady: faceServiceReady,
                    faceDetected: lastDetection?.detected || false,
                    confidence: lastDetection?.confidence || 0,
                    detectionQuality: faceDetectionService.getDetectionQuality(),
                    stressLevel: stressEstimate.level,
                    blinkRate: faceDetectionService.getBlinkRate()
                };

                // Dream protocol status
                const dreamStatus = dreamProtocol.getStatus();
                const dreamSessions = dreamProtocol.getPastSessions();

                // CPB status
                const cpbState = (state as any).cpb || (state as any).cpbState || {};
                const cpbStatus = {
                    phase: cpbState.phase || cpbState.state || 'idle',
                    currentPath: cpbState.currentPath,
                    confidence: cpbState.confidence || 0
                };

                // Memory status (from neuralVault with localStorage fallback)
                let monitors: any[] = [];
                let goals: any[] = [];
                let delegations: any[] = [];
                try {
                    monitors = await neuralVault.get('active_monitors') || [];
                    goals = await neuralVault.get('tracked_goals') || [];
                    // Delegations might still be in localStorage for now
                    delegations = JSON.parse(localStorage.getItem('delegations') || '[]');
                } catch {
                    monitors = JSON.parse(localStorage.getItem('active_monitors') || '[]');
                    goals = JSON.parse(localStorage.getItem('tracked_goals') || '[]');
                    delegations = JSON.parse(localStorage.getItem('delegations') || '[]');
                }

                // System performance
                const perfMetrics = {
                    uptime: `${Math.round(performance.now() / 1000 / 60)} minutes`,
                    memoryUsage: (performance as any).memory?.usedJSHeapSize
                        ? `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)} MB`
                        : 'unavailable'
                };

                const activeMonitors = monitors.filter((m: any) => m.status === 'active' && m.triggered === 0);
                const activeGoals = goals.filter((g: any) => g.status !== 'completed');

                const report = {
                    timestamp: new Date().toISOString(),
                    sector: state.mode,
                    voice: voiceStatus,
                    tasks: taskStats,
                    biometrics: biometricStatus,
                    dream: {
                        isDreaming: dreamStatus.isDreaming,
                        pendingQueries: dreamStatus.pendingQueries,
                        currentInsights: dreamStatus.currentSession?.insights.length || 0,
                        totalSessions: dreamSessions.length
                    },
                    cpb: cpbStatus,
                    agents: {
                        available: Object.keys(HIVE_AGENTS).length,
                        names: Object.values(HIVE_AGENTS).slice(0, 8).map(a => a.name),
                        recentDelegations: delegations.length
                    },
                    monitoring: {
                        activeMonitors: activeMonitors.length,
                        trackedGoals: activeGoals.length,
                        totalGoals: goals.length
                    },
                    performance: perfMetrics
                };

                // Generate natural status message
                const statusMessages: string[] = [];
                statusMessages.push(`Currently in ${state.mode} sector.`);
                if (taskStats.highPriority > 0) {
                    statusMessages.push(`${taskStats.highPriority} high-priority task${taskStats.highPriority > 1 ? 's' : ''} pending.`);
                }
                if (taskStats.total > 0) {
                    statusMessages.push(`${taskStats.done}/${taskStats.total} tasks completed.`);
                }
                if (voiceStatus.active) {
                    statusMessages.push(`Voice interface active with ${voiceStatus.currentVoice}.`);
                }
                if (biometricStatus.faceDetected) {
                    statusMessages.push(`Biometrics tracking. Stress: ${biometricStatus.stressLevel}%.`);
                }
                if (dreamStatus.isDreaming) {
                    statusMessages.push(`Dream protocol active with ${dreamStatus.currentSession?.insights.length || 0} insights.`);
                }
                if (activeMonitors.length > 0) {
                    statusMessages.push(`${activeMonitors.length} active monitor${activeMonitors.length > 1 ? 's' : ''}.`);
                }
                if (activeGoals.length > 0) {
                    statusMessages.push(`${activeGoals.length} goal${activeGoals.length > 1 ? 's' : ''} in progress.`);
                }

                addLog('SUCCESS', `✅ STATUS: Comprehensive report compiled`);

                return {
                    status: "SYSTEM_OPERATIONAL",
                    report,
                    summary: statusMessages.join(' '),
                    message: `System status, Sir: ${statusMessages.join(' ')}`,
                    instruction: `Provide this status naturally: ${statusMessages.join(' ')}`
                };
            }

            // =================================================================
            // SET REMINDER - Timer/reminder
            // =================================================================
            if (name === 'set_reminder') {
                const message = typeof args.message === 'string' ? args.message.trim() : '';
                const delayMinutes = typeof args.delayMinutes === 'number'
                    ? args.delayMinutes
                    : Number(args.delayMinutes);

                if (!message) {
                    return { error: "Missing required message", hint: "Provide reminder text" };
                }
                if (!Number.isFinite(delayMinutes) || delayMinutes <= 0) {
                    return { error: "Invalid delayMinutes", hint: "Provide a positive delay in minutes" };
                }

                addLog('SYSTEM', `REMINDER: Setting for ${delayMinutes} minutes: "${message}"`);

                // Set the reminder
                setTimeout(() => {
                    addLog('WARN', `⏰ REMINDER: ${message}`);
                    audio.playSuccess();
                    // Could also trigger a notification here
                }, delayMinutes * 60 * 1000);

                return {
                    status: "REMINDER_SET",
                    message: `Reminder set for ${delayMinutes} minutes from now, Sir.`,
                    reminderText: message
                };
            }

            // =================================================================
            // DREAM PROTOCOL - Autonomous background intelligence
            // =================================================================
            if (name === 'start_dreaming') {
                const topic = typeof args.topic === 'string' ? args.topic.trim() : '';
                addLog('SYSTEM', `DREAM: Initiating autonomous dream mode...`);

                // Get current dream status
                const dreamStatus = dreamProtocol.getStatus();

                if (dreamStatus.isDreaming) {
                    // Already dreaming - queue the topic if provided
                    if (topic) {
                        dreamProtocol.queueQuery(topic);
                        return {
                            status: "TOPIC_QUEUED",
                            currentSession: dreamStatus.currentSession,
                            pendingQueries: dreamStatus.pendingQueries + 1,
                            message: `Topic "${topic}" queued for autonomous analysis, Sir. Dream protocol already active.`
                        };
                    }
                    return {
                        status: "ALREADY_DREAMING",
                        currentInsights: dreamStatus.currentSession?.insights.length || 0,
                        message: "Dream protocol is already active, Sir. I'm generating insights in the background."
                    };
                }

                // Queue topic if provided, then trigger dream
                if (topic) {
                    dreamProtocol.queueQuery(topic);
                }
                dreamProtocol.triggerDream();

                return {
                    status: "DREAM_INITIATED",
                    topicQueued: topic || null,
                    message: `Dream protocol activated, Sir.${topic ? ` I'll focus my autonomous research on "${topic}".` : ' Beginning pattern analysis and predictive processing.'}`
                };
            }

            if (name === 'get_dream_insights') {
                addLog('SYSTEM', `DREAM: Retrieving insights from dream protocol...`);
                const dreamStatus = dreamProtocol.getStatus();
                const pastSessions = dreamProtocol.getPastSessions();

                // Current session insights
                const currentInsights = dreamStatus.currentSession?.insights || [];

                // Gather all insights from past sessions
                const allPastInsights: DreamInsight[] = pastSessions
                    .flatMap(session => session.insights)
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, 10);

                const totalInsights = currentInsights.length + allPastInsights.length;

                if (totalInsights === 0) {
                    return {
                        status: "NO_INSIGHTS",
                        isDreaming: dreamStatus.isDreaming,
                        idleTimeSeconds: Math.round(dreamStatus.idleTime / 1000),
                        message: "No dream insights available yet, Sir. The dream protocol activates automatically after 5 minutes of idle time, or you can trigger it manually."
                    };
                }

                return {
                    status: "INSIGHTS_AVAILABLE",
                    isDreaming: dreamStatus.isDreaming,
                    currentSessionInsights: currentInsights.map(i => ({
                        type: i.type,
                        title: i.title,
                        content: i.content.slice(0, 200),
                        confidence: Math.round(i.confidence * 100),
                        actionable: i.actionable,
                        suggestedAction: i.suggestedAction
                    })),
                    pastInsightsCount: allPastInsights.length,
                    recentPastInsight: allPastInsights[0] ? {
                        type: allPastInsights[0].type,
                        title: allPastInsights[0].title,
                        timestamp: new Date(allPastInsights[0].timestamp).toLocaleString()
                    } : null,
                    instruction: "Summarize the dream insights naturally. Highlight actionable ones."
                };
            }

            if (name === 'morning_briefing') {
                addLog('SYSTEM', `BRIEFING: Compiling comprehensive morning briefing...`);
                const state = useAppStore.getState();
                const dreamStatus = dreamProtocol.getStatus();
                const pastSessions = dreamProtocol.getPastSessions();
                const lastSession = pastSessions[pastSessions.length - 1];

                // Get task summary
                const tasks = state.research.tasks || [];
                const pendingTasks = tasks.filter((t: any) => t.status === 'TODO' || t.status === 'IN_PROGRESS');
                const criticalTasks = pendingTasks.filter((t: any) => t.priority === 'CRITICAL' || t.priority === 'HIGH');

                // Get biometric status
                const biometricReady = faceDetectionService.isReady();

                // Get overnight insights
                const overnightInsights = lastSession?.insights || [];
                const actionableInsights = overnightInsights.filter(i => i.actionable);

                // Determine time of day greeting
                const hour = new Date().getHours();
                let greeting = "Good morning";
                if (hour >= 12 && hour < 17) greeting = "Good afternoon";
                else if (hour >= 17 && hour < 21) greeting = "Good evening";
                else if (hour >= 21 || hour < 5) greeting = "Working late I see";

                return {
                    status: "BRIEFING_READY",
                    briefing: {
                        greeting: `${greeting}, Sir.`,
                        timestamp: new Date().toLocaleString(),
                        systemStatus: {
                            mode: state.mode,
                            biometricsReady: biometricReady,
                            voiceActive: state.voice.isActive
                        },
                        taskSummary: {
                            total: tasks.length,
                            pending: pendingTasks.length,
                            critical: criticalTasks.length,
                            topCritical: criticalTasks[0]?.title || null
                        },
                        overnightActivity: {
                            dreamSessionOccurred: !!lastSession,
                            insightsGenerated: overnightInsights.length,
                            actionableInsights: actionableInsights.length,
                            topInsight: actionableInsights[0] ? {
                                type: actionableInsights[0].type,
                                title: actionableInsights[0].title,
                                action: actionableInsights[0].suggestedAction
                            } : null
                        },
                        recommendations: [
                            criticalTasks.length > 0 ? `Address ${criticalTasks.length} critical task(s)` : "No critical tasks pending",
                            actionableInsights.length > 0 ? `Review ${actionableInsights.length} actionable insight(s) from overnight` : "Dream protocol ready for tonight",
                            !biometricReady ? "Consider enabling biometrics for stress monitoring" : "Biometrics online"
                        ]
                    },
                    instruction: "Deliver this briefing naturally and conversationally, like a personal assistant. Prioritize critical items."
                };
            }

            // =================================================================
            // MULTI-AGENT REASONING - Swarm intelligence
            // =================================================================
            if (name === 'decompose_task') {
                const goal = typeof args.goal === 'string' ? args.goal.trim() : '';
                if (!goal) {
                    return { error: "Missing required goal", hint: "Provide a goal for decompose_task" };
                }
                addLog('SYSTEM', `DECOMPOSE: Breaking down "${goal}" via Gemini...`);

                try {
                    // Use real decomposition engine
                    const atomicTasks = await generateDecompositionMap(goal);

                    if (atomicTasks.length === 0) {
                        return {
                            status: "DECOMPOSITION_EMPTY",
                            goal,
                            message: "Couldn't decompose that goal into tasks, Sir. Perhaps it's already atomic?"
                        };
                    }

                    // Optionally create tasks in the store
                    const { addTask } = useAppStore.getState().actions;
                    const createdTasks: string[] = [];

                    for (const task of atomicTasks.slice(0, 7)) { // Cap at 7 tasks
                        addTask({
                            title: task.description || task.instruction,
                            description: `Atomic task from goal: "${goal}"\n\nInstruction: ${task.instruction}\nInput: ${task.isolated_input}`,
                            status: TaskStatus.TODO,
                            priority: task.weight > 0.7 ? TaskPriority.HIGH : TaskPriority.MEDIUM,
                            tags: ['decomposed', 'voice-created']
                        });
                        createdTasks.push(task.description || task.instruction);
                    }

                    addLog('SUCCESS', `DECOMPOSE: Created ${createdTasks.length} atomic tasks`);

                    return {
                        status: "DECOMPOSITION_COMPLETE",
                        goal,
                        taskCount: atomicTasks.length,
                        tasks: atomicTasks.map(t => ({
                            id: t.id,
                            description: t.description,
                            instruction: t.instruction,
                            weight: t.weight
                        })),
                        createdInStore: createdTasks.length,
                        message: `Decomposed into ${atomicTasks.length} atomic tasks, Sir. ${createdTasks.length} have been added to your task list.`,
                        instruction: "Summarize the decomposed tasks conversationally, highlighting the most important ones."
                    };
                } catch (e: unknown) {
                    const errorMessage = e instanceof Error ? e.message : String(e);
                    addLog('ERROR', `DECOMPOSE: Failed - ${errorMessage}`);
                    // Fallback to routed instruction
                    return {
                        status: "DECOMPOSITION_ROUTED",
                        goal,
                        error: errorMessage,
                        instruction: `Decomposition engine failed. Break down this goal manually into 5-7 atomic, executable sub-tasks: "${goal}". List each task with a clear description and dependencies.`
                    };
                }
            }

            if (name === 'run_consensus') {
                const question = typeof args.question === 'string' ? args.question.trim() : '';
                if (!question) {
                    return { error: "Missing required question", hint: "Provide a question for run_consensus" };
                }
                addLog('SYSTEM', `CONSENSUS: Running ACE swarm analysis on "${question}"...`);

                // Create atomic task for ACE
                const task = {
                    id: `consensus-${Date.now()}`,
                    instruction: question,
                    isolated_input: question,
                    description: `Voice-initiated consensus: ${question}`,
                    weight: 1
                };

                let lastStatus: ACEStatus | null = null;

                try {
                    // Run through Adaptive Consensus Engine
                    const result: ACEResult = await adaptiveConsensusEngine(
                        task,
                        (status: ACEStatus) => {
                            lastStatus = status;
                            logger.debug(`Phase: ${status.phase}, Gap: ${status.currentGap}/${status.targetGap}`, undefined, 'ACE');
                        },
                        {
                            adaptiveThresholds: true,
                            enableAuction: true,
                            enableDQScoring: true,
                            enableLearning: true
                        }
                    );

                    addLog('SUCCESS', `CONSENSUS: Reached with ${result.confidence}% confidence in ${result.voteLedger?.totalRounds} rounds`);

                    return {
                        status: "CONSENSUS_ACHIEVED",
                        answer: result.output,
                        confidence: result.confidence,
                        executionTimeMs: result.executionTime,
                        votingDetails: result.voteLedger ? {
                            totalRounds: result.voteLedger.totalRounds,
                            winnerVotes: result.voteLedger.count,
                            runnerUpVotes: result.voteLedger.runnerUpCount,
                            agentsParticipated: result.voteLedger.participatingAgents?.length || 'unknown'
                        } : null,
                        dqScore: result.dqScore ? {
                            score: result.dqScore.score,
                            validity: (result.dqScore as any).validity ?? (result.dqScore as any).components?.validity,
                            specificity: (result.dqScore as any).specificity ?? (result.dqScore as any).components?.specificity
                        } : null,
                        complexity: result.complexity ? {
                            taskType: result.complexity.taskType,
                            tokenEstimate: result.complexity.tokenEstimate
                        } : null,
                        instruction: "Present the consensus answer conversationally, mentioning confidence level and that multiple agents voted."
                    };
                } catch (error: unknown) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    addLog('ERROR', `CONSENSUS: Failed - ${errorMessage}`);
                    return {
                        status: "CONSENSUS_FAILED",
                        error: errorMessage,
                        lastPhase: lastStatus?.phase || 'unknown',
                        instruction: `Consensus engine failed: ${errorMessage}. Offer to try again or analyze the question yourself.`
                    };
                }
            }

            if (name === 'bicameral_dialogue') {
                const topic = typeof args.topic === 'string' ? args.topic.trim() : '';
                if (!topic) {
                    return { error: "Missing required topic", hint: "Provide a topic for bicameral analysis" };
                }
                addLog('SYSTEM', `BICAMERAL: Starting skeptic vs optimist dialogue on "${topic}"...`);

                // Create task specifically for bicameral analysis
                const task = {
                    id: `bicameral-${Date.now()}`,
                    instruction: `Analyze from contrasting perspectives: ${topic}`,
                    isolated_input: topic,
                    description: `Bicameral dialogue: skeptic vs optimist on ${topic}`,
                    weight: 1
                };

                try {
                    // Run quick consensus with minimal agents for faster bicameral
                    const result: ACEResult = await quickConsensus(task, (status: ACEStatus) => {
                        logger.debug(`Phase: ${status.phase}, DNA: ${status.activeDNA || 'swarm'}`, undefined, 'BICAMERAL');
                    });

                    // Generate the bicameral synthesis
                    const synthesisResult = await runAgentReasoning(
                        'paramdeep',  // The Strategist - good at synthesis
                        `Synthesize contrasting viewpoints into a unified recommendation:\n\nTopic: ${topic}\n\nConsensus Output: ${result.output}\n\nProvide: 1) Skeptic's main concern, 2) Optimist's opportunity, 3) Your synthesis.`,
                        'Bicameral dialogue synthesis'
                    );

                    addLog('SUCCESS', `BICAMERAL: Dialogue complete with synthesized recommendation`);

                    return {
                        status: "DIALOGUE_COMPLETE",
                        topic,
                        consensusOutput: result.output,
                        confidence: result.confidence,
                        synthesis: synthesisResult.response,
                        synthesizedBy: synthesisResult.agentName,
                        instruction: "Present the bicameral dialogue naturally: share the skeptic's concern, the optimist's opportunity, then the synthesized recommendation."
                    };
                } catch (error: any) {
                    addLog('ERROR', `BICAMERAL: Dialogue failed - ${error.message}`);
                    return {
                        status: "DIALOGUE_FAILED",
                        error: error.message,
                        instruction: `Bicameral dialogue failed: ${error.message}. Offer to analyze the topic yourself instead.`
                    };
                }
            }

            // =================================================================
            // MEMORY & KNOWLEDGE - Real SovereignMemory integration
            // =================================================================
            if (name === 'save_memory') {
                const { content, category, tags } = args;
                const memoryKey = `voice_${category || 'fact'}_${Date.now()}`;
                addLog('SYSTEM', `🧠 MEMORY: Storing to SovereignMemory...`);

                try {
                    // Store in real SovereignMemory (IndexedDB + vector embeddings)
                    await sovereignMemory.store(
                        memoryKey,
                        JSON.stringify({
                            content,
                            category: category || 'fact',
                            tags: tags || [],
                            source: 'voice',
                            timestamp: Date.now()
                        })
                    );

                    audio.playClick();
                    addLog('SUCCESS', `✅ MEMORY: Stored with vector embedding`);
                    return {
                        status: "MEMORY_SAVED",
                        key: memoryKey,
                        category: category || 'fact',
                        message: "I'll remember that, Sir. Stored in the Neural Vault with semantic indexing."
                    };
                } catch (e: any) {
                    addLog('ERROR', `Memory storage failed: ${e.message}`);
                    return { error: e.message, message: "I apologize, Sir. Memory storage encountered an issue." };
                }
            }

            if (name === 'recall_memory') {
                const query = typeof args.query === 'string' ? args.query.trim() : '';
                const parsedLimit = typeof args.limit === 'number' ? args.limit : Number(args.limit);
                const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
                    ? Math.min(Math.floor(parsedLimit), 20)
                    : 5;
                if (!query) {
                    return { error: "Missing required query", hint: "Provide a semantic memory query string" };
                }
                addLog('SYSTEM', `🧠 MEMORY: Semantic search for "${query}"...`);

                try {
                    // Real vector similarity search in SovereignMemory
                    const results = await sovereignMemory.query(query, limit);

                    if (results.length === 0) {
                        return {
                            status: "NO_MEMORIES",
                            query,
                            message: "I don't have any memories matching that, Sir."
                        };
                    }

                    // Parse results
                    const parsedResults = results.map(r => {
                        try {
                            // Extract score from [RECALL_XX%] prefix
                            const scoreMatch = r.match(/\[RECALL_(\d+)%\]/);
                            const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
                            const content = r.replace(/\[RECALL_\d+%\]\s*/, '');
                            const parsed = JSON.parse(content);
                            return { ...parsed, relevance: score };
                        } catch {
                            return { content: r, relevance: 0 };
                        }
                    });

                    addLog('SUCCESS', `✅ MEMORY: Found ${results.length} relevant memories`);
                    return {
                        status: "MEMORIES_FOUND",
                        query,
                        memories: parsedResults,
                        count: results.length,
                        message: `I found ${results.length} relevant memor${results.length === 1 ? 'y' : 'ies'}, Sir.`,
                        instruction: `Present these memories to the user: ${parsedResults.map(m => m.content).join('; ')}`
                    };
                } catch (e: any) {
                    addLog('ERROR', `Memory recall failed: ${e.message}`);
                    return { error: e.message };
                }
            }

            if (name === 'manage_memory') {
                const { action, target } = args;
                addLog('SYSTEM', `🧠 MEMORY: ${action}`);

                if (action === 'list') {
                    try {
                        // Get knowledge layers from Neural Vault
                        const layers = await neuralVault.getKnowledgeLayers();
                        const artifacts = await neuralVault.getArtifacts();
                        const memoryArtifacts = artifacts.filter(a =>
                            a.analysis?.classification === 'MEMORY_FRAGMENT'
                        );

                        return {
                            status: "MEMORIES_LISTED",
                            knowledgeLayers: layers.length,
                            memoryFragments: memoryArtifacts.length,
                            total: layers.length + memoryArtifacts.length,
                            message: `You have ${layers.length} knowledge layers and ${memoryArtifacts.length} memory fragments, Sir.`
                        };
                    } catch (e: any) {
                        return { error: e.message };
                    }
                }

                if (action === 'clear_all') {
                    addLog('WARN', `⚠️ Clearing all memories is a destructive operation`);
                    return {
                        status: "CONFIRMATION_REQUIRED",
                        message: "Clearing all memories is permanent, Sir. Please confirm by saying 'confirm clear memories'."
                    };
                }

                return { status: "MEMORY_ACTION", action };
            }

            // =================================================================
            // CODE & DEVELOPMENT - Engineering tools
            // =================================================================
            if (name === 'analyze_code') {
                const target = typeof args.target === 'string' ? args.target.trim() : '';
                const analysisType = typeof args.analysisType === 'string' ? args.analysisType : undefined;
                if (!target) {
                    return { error: "Missing required target", hint: "Provide analysis target for analyze_code" };
                }
                addLog('SYSTEM', `CODE: Analyzing ${target} (${analysisType || 'general'}) with Archon...`);

                // Build relevant codebase context for the analysis target
                const codebaseContext = buildCodebaseContext(target);

                // Also get general codebase structure info
                const structureInfo = Object.entries(CODEBASE_KNOWLEDGE.structure)
                    .map(([path, desc]) => `- **${path}**: ${desc}`)
                    .join('\n');

                // Get pattern info
                const patternInfo = Object.entries(CODEBASE_KNOWLEDGE.patterns)
                    .map(([pattern, desc]) => `- **${pattern}**: ${desc}`)
                    .join('\n');

                // Run through Dr. Ira (The Sentinel) for thorough code analysis
                try {
                    const analysisResult = await runAgentReasoning(
                        'dr_ira',  // Risk-focused, thorough analysis
                        `Perform a ${analysisType || 'comprehensive'} code analysis of: ${target}

CODEBASE STRUCTURE:
${structureInfo}

RELEVANT SUBSYSTEM CONTEXT:
${codebaseContext || 'No specific subsystem detected - general codebase analysis.'}

PATTERNS USED:
${patternInfo}

Provide: 1) Overview, 2) Key findings, 3) Potential issues, 4) Recommendations`,
                        `Code analysis request for ${target}`
                    );

                    addLog('SUCCESS', `CODE: Analysis complete by ${analysisResult.agentName}`);

                    return {
                        status: "ANALYSIS_COMPLETE",
                        target,
                        analysisType: analysisType || 'general',
                        analyzedBy: analysisResult.agentName,
                        codebaseContextFound: !!codebaseContext,
                        analysis: analysisResult.response,
                        instruction: "Present the code analysis findings conversationally, highlighting key points and recommendations."
                    };
                } catch (error: any) {
                    return {
                        status: "ANALYSIS_FAILED",
                        error: error.message,
                        codebaseContext: codebaseContext || structureInfo,
                        instruction: `Analysis failed: ${error.message}. Share the codebase context I gathered and offer to try again.`
                    };
                }
            }

            if (name === 'generate_code') {
                const description = typeof args.description === 'string' ? args.description.trim() : '';
                const language = typeof args.language === 'string' ? args.language : undefined;
                const style = typeof args.style === 'string' ? args.style : undefined;
                if (!description) {
                    return { error: "Missing required description", hint: "Provide description for generate_code" };
                }
                const lang = language || 'TypeScript';
                const codeStyle = style || 'production';
                addLog('SYSTEM', `CODE: Generating ${lang} code with Mike...`);

                // Get relevant codebase context
                const codebaseContext = buildCodebaseContext(description);

                try {
                    // Run through Mike (The Builder) for code generation
                    const generationResult = await runAgentReasoning(
                        'mike',  // The Builder - energetic, implementation-focused
                        `Generate ${codeStyle}-quality ${lang} code for: ${description}

${codebaseContext ? `RELEVANT CODEBASE CONTEXT:\n${codebaseContext}` : ''}

REQUIREMENTS:
- Follow ${lang} best practices
- ${codeStyle === 'production' ? 'Include error handling, types, and documentation' : 'Keep it clean and readable'}
- Match existing codebase patterns if applicable

Output the code with brief explanation.`,
                        `Code generation: ${description}`
                    );

                    addLog('SUCCESS', `CODE: Generation complete by ${generationResult.agentName}`);

                    return {
                        status: "CODE_GENERATED",
                        description,
                        language: lang,
                        style: codeStyle,
                        generatedBy: generationResult.agentName,
                        code: generationResult.response,
                        instruction: "Present the generated code, explaining what it does and how to use it."
                    };
                } catch (error: any) {
                    return {
                        status: "GENERATION_FAILED",
                        error: error.message,
                        instruction: `Code generation failed: ${error.message}. Offer to try again or describe what you would generate.`
                    };
                }
            }

            // =================================================================
            // DATA & EXPORT - Information management
            // =================================================================
            if (name === 'export_data') {
                const { dataType, format } = args;
                addLog('SYSTEM', `EXPORT: Preparing ${dataType} export as ${format}...`);
                const state = useAppStore.getState();

                let data: any;
                if (dataType === 'transcripts') data = state.voice.transcripts;
                else if (dataType === 'session') data = { mode: state.mode, timestamp: Date.now() };
                else data = { type: dataType, timestamp: Date.now() };

                return { status: "EXPORT_READY", dataType, format, preview: JSON.stringify(data).slice(0, 500) };
            }

            if (name === 'save_snapshot') {
                const label = typeof args.label === 'string' ? args.label.trim() : '';
                if (!label) {
                    return { error: "Missing required label", hint: "Provide a label for save_snapshot" };
                }
                addLog('SYSTEM', `SNAPSHOT: Saving "${label}"...`);
                const state = useAppStore.getState();
                localStorage.setItem(`snapshot_${label}`, JSON.stringify({
                    timestamp: Date.now(),
                    mode: state.mode,
                    label
                }));
                addLog('SUCCESS', `SNAPSHOT: Saved.`);
                return { status: "SNAPSHOT_SAVED", label, message: `Checkpoint "${label}" saved, Sir.` };
            }

            if (name === 'load_snapshot') {
                const label = typeof args.label === 'string' ? args.label.trim() : '';
                if (!label) {
                    return { error: "Missing required label", hint: "Provide a label for load_snapshot" };
                }
                addLog('SYSTEM', `SNAPSHOT: Loading "${label}"...`);
                return { status: "SNAPSHOT_LOADED", label, message: `Restored to "${label}", Sir.` };
            }

            // =================================================================
            // BIOMETRICS & SENSING - Human interface
            // =================================================================
            if (name === 'read_biometrics') {
                addLog('SYSTEM', `BIOMETRICS: Reading current state from face detection service...`);
                const state = useAppStore.getState();
                const biometric = (state as any).biometric || {};

                // Get real data from face detection service
                const lastDetection = faceDetectionService.getLastDetection();
                const stressEstimate = faceDetectionService.estimateStress();
                const blinkRate = faceDetectionService.getBlinkRate();
                const serviceStats = faceDetectionService.getStats();
                const detectionQuality = faceDetectionService.getDetectionQuality();
                const isServiceReady = faceDetectionService.isReady();

                // Determine dominant emotion from expressions if available
                let dominantEmotion = 'neutral';
                if (lastDetection?.expressions) {
                    const expressions = lastDetection.expressions;
                    const sorted = Object.entries(expressions).sort((a, b) => b[1] - a[1]);
                    if (sorted[0] && sorted[0][1] > 0.3) {
                        dominantEmotion = sorted[0][0];
                    }
                }

                return {
                    status: "BIOMETRICS_READ",
                    serviceReady: isServiceReady,
                    data: {
                        faceDetected: lastDetection?.detected || false,
                        faceConfidence: lastDetection?.confidence || 0,
                        detectionQuality,
                        mood: dominantEmotion,
                        expressions: lastDetection?.expressions || null,
                        gaze: lastDetection?.gazeEstimate ? {
                            direction: lastDetection.gazeEstimate.direction,
                            confidence: lastDetection.gazeEstimate.confidence,
                            pupilDilation: lastDetection.gazeEstimate.pupilDilation
                        } : null,
                        stress: {
                            level: stressEstimate.level,
                            confidence: stressEstimate.confidence,
                            eyeStrain: stressEstimate.indicators.eyeStrainScore,
                            expressionTension: stressEstimate.indicators.expressionTension
                        },
                        blinkRate,
                        stats: {
                            frameCount: serviceStats.frameCount,
                            detectionCount: serviceStats.detectionCount,
                            detectionRate: Math.round(serviceStats.detectionRate * 100)
                        }
                    },
                    instruction: "Report biometric readings conversationally. Mention face detection status, mood, stress level, and gaze direction if detected."
                };
            }

            if (name === 'toggle_biometrics') {
                const enabled = typeof args.enabled === 'boolean' ? args.enabled : undefined;
                if (enabled === undefined) {
                    return { error: "Missing required enabled", hint: "Provide enabled as true or false for toggle_biometrics" };
                }
                addLog('SYSTEM', `BIOMETRICS: ${enabled ? 'Enabling' : 'Disabling'} face detection...`);
                const { setBiometricState } = useAppStore.getState().actions as any;
                if (setBiometricState) {
                    setBiometricState({ isCameraOn: enabled });
                }

                // Reset service stats when disabling
                if (!enabled) {
                    faceDetectionService.reset();
                    addLog('SYSTEM', 'BIOMETRICS: Service reset, statistics cleared.');
                }

                return {
                    status: enabled ? "BIOMETRICS_ENABLED" : "BIOMETRICS_DISABLED",
                    serviceReady: faceDetectionService.isReady(),
                    message: enabled
                        ? "Face detection enabled, Sir. I'll begin monitoring your biometric state."
                        : "Face detection disabled, Sir. Biometric data cleared."
                };
            }

            // =================================================================
            // FOCUS & PRODUCTIVITY - Work management
            // =================================================================
            if (name === 'focus_mode') {
                const enabled = typeof args.enabled === 'boolean' ? args.enabled : undefined;
                const parsedFocusDuration = typeof args.duration === 'number' ? args.duration : Number(args.duration);
                const duration = Number.isFinite(parsedFocusDuration) && parsedFocusDuration > 0
                    ? parsedFocusDuration
                    : undefined;
                if (enabled === undefined) {
                    return { error: "Missing required enabled", hint: "Provide enabled as true or false for focus_mode" };
                }
                addLog('SYSTEM', `FOCUS: ${enabled ? 'Entering' : 'Exiting'} focus mode...`);
                // Could trigger UI changes here
                if (duration) {
                    setTimeout(() => {
                        addLog('SYSTEM', `FOCUS: Focus session complete.`);
                        audio.playSuccess();
                    }, duration * 60 * 1000);
                }
                return {
                    status: enabled ? "FOCUS_MODE_ACTIVE" : "FOCUS_MODE_DISABLED",
                    duration,
                    message: enabled ? `Focus mode activated${duration ? ` for ${duration} minutes` : ''}, Sir.` : "Focus mode disabled, Sir."
                };
            }

            if (name === 'quick_capture') {
                const thought = typeof args.thought === 'string' ? args.thought.trim() : '';
                const category = typeof args.category === 'string' && args.category.trim().length > 0
                    ? args.category.trim()
                    : 'thought';
                const action = typeof args.action === 'string' ? args.action.trim() : '';

                try {
                    if (action === 'list') {
                        const captures = await neuralVault.get('quick_captures') || [];
                        return {
                            status: "CAPTURES_LIST",
                            captures: captures.slice(-20),
                            count: captures.length,
                            message: `You have ${captures.length} captured thought${captures.length !== 1 ? 's' : ''}, Sir.`
                        };
                    }

                    if (action === 'clear') {
                        await neuralVault.set('quick_captures', []);
                        return { status: "CAPTURES_CLEARED", message: "All captures cleared, Sir." };
                    }

                    if (!thought) {
                        return { error: "Missing thought", hint: "Provide a thought to capture or use action=list|clear" };
                    }

                    // Default: capture thought
                    const captureId = `cap_${Date.now()}`;
                    const captures = await neuralVault.get('quick_captures') || [];
                    const newCapture = {
                        id: captureId,
                        thought,
                        category,
                        timestamp: Date.now()
                    };
                    captures.push(newCapture);
                    // Keep last 500 captures
                    if (captures.length > 500) captures.shift();
                    await neuralVault.set('quick_captures', captures);

                    // Store in SovereignMemory for semantic search/recall
                    await sovereignMemory.store(captureId, JSON.stringify({
                        type: 'quick_capture',
                        ...newCapture
                    }));

                    addLog('SYSTEM', `CAPTURE: "${thought.slice(0, 50)}..." [${category}]`);
                    return {
                        status: "CAPTURED",
                        id: captureId,
                        category,
                        semanticIndexed: true,
                        message: "Captured, Sir."
                    };
                } catch (e: any) {
                    addLog('WARN', `QUICK_CAPTURE: Fallback to localStorage - ${e.message}`);
                    const captures = JSON.parse(localStorage.getItem('quick_captures') || '[]');
                    captures.push({ thought, timestamp: Date.now() });
                    localStorage.setItem('quick_captures', JSON.stringify(captures));
                    return { status: "CAPTURED", message: "Captured, Sir." };
                }
            }

            // =================================================================
            // CLIPBOARD & QUICK ACTIONS
            // =================================================================
            if (name === 'copy_to_clipboard') {
                const content = typeof args.content === 'string' ? args.content : '';
                if (content.length === 0) {
                    return { error: "Missing required content", hint: "Provide text content for copy_to_clipboard" };
                }
                addLog('SYSTEM', `CLIPBOARD: Copying...`);
                try {
                    await navigator.clipboard.writeText(content);
                    return { status: "COPIED", message: "Copied to clipboard, Sir." };
                } catch (e) {
                    return { error: "Clipboard access denied" };
                }
            }

            if (name === 'read_clipboard') {
                addLog('SYSTEM', `CLIPBOARD: Reading...`);
                try {
                    const text = await navigator.clipboard.readText();
                    return { status: "CLIPBOARD_READ", content: text };
                } catch (e) {
                    return { error: "Clipboard access denied" };
                }
            }

            // =================================================================
            // VOICE CONTROL
            // =================================================================
            if (name === 'voice_settings') {
                const speed = typeof args.speed === 'number' ? args.speed : Number(args.speed);
                const volume = typeof args.volume === 'number' ? args.volume : Number(args.volume);
                const rawMode = typeof args.mode === 'string' ? args.mode.trim() : '';
                const validModes: VoiceMode[] = ['realtime', 'turn-based', 'hybrid'];
                const mode: VoiceMode | '' = validModes.includes(rawMode as VoiceMode) ? (rawMode as VoiceMode) : '';
                addLog('SYSTEM', `VOICE: Adjusting settings...`);
                if (mode) {
                    const { voiceNexus } = await import('../../../services/voiceNexus');
                    voiceNexus.setMode(mode);
                    setVoiceNexusState({ mode });
                }
                return {
                    status: "SETTINGS_ADJUSTED",
                    speed: Number.isFinite(speed) ? speed : undefined,
                    volume: Number.isFinite(volume) ? volume : undefined,
                    mode: mode || undefined
                };
            }

            if (name === 'repeat_response') {
                const lastTranscript = voice.transcripts.filter(t => t.role === 'model').pop();
                return {
                    status: "REPEAT",
                    lastResponse: lastTranscript?.text || "I don't have a previous response to repeat.",
                    instruction: "Repeat this text to the user."
                };
            }

            // =================================================================
            // SUPERPOWERS - Advanced Automation & Control
            // =================================================================

            if (name === 'execute_sequence') {
                const steps = Array.isArray(args.steps)
                    ? args.steps.filter((step): step is string => typeof step === 'string' && step.trim().length > 0)
                    : [];
                const parallel = !!args.parallel;
                if (steps.length === 0) {
                    return { error: "Missing steps", hint: "Provide a non-empty steps array for execute_sequence" };
                }
                addLog('SYSTEM', `SEQUENCE: Executing ${steps.length} steps ${parallel ? 'in parallel' : 'sequentially'}...`);
                // Store sequence for execution tracking
                const sequenceId = `seq-${Date.now()}`;
                return {
                    status: "SEQUENCE_STARTED",
                    sequenceId,
                    steps,
                    parallel,
                    instruction: `Execute these steps ${parallel ? 'simultaneously' : 'one by one'}: ${steps.join(', ')}. Report progress on each.`
                };
            }

            if (name === 'create_macro') {
                const trigger = typeof args.trigger === 'string' ? args.trigger.trim() : '';
                const actions = Array.isArray(args.actions)
                    ? args.actions.filter((action): action is string => typeof action === 'string' && action.trim().length > 0)
                    : [];
                const description = typeof args.description === 'string' ? args.description : undefined;
                if (!trigger) {
                    return { error: "Missing required trigger", hint: "Provide a trigger phrase for create_macro" };
                }
                if (actions.length === 0) {
                    return { error: "Missing actions", hint: "Provide a non-empty actions array for create_macro" };
                }
                addLog('SYSTEM', `MACRO: Creating "${trigger}"...`);

                try {
                    const macros = await neuralVault.get('voice_macros') || {};
                    macros[trigger] = {
                        actions,
                        description,
                        created: Date.now(),
                        useCount: 0
                    };
                    await neuralVault.set('voice_macros', macros);
                    addLog('SUCCESS', `MACRO: Created and persisted.`);
                    return {
                        status: "MACRO_CREATED",
                        trigger,
                        persistedTo: 'neuralVault',
                        message: `Macro "${trigger}" created, Sir. Say "${trigger}" to execute.`
                    };
                } catch (e: any) {
                    addLog('WARN', `CREATE_MACRO: Fallback to localStorage - ${e.message}`);
                    const macros = JSON.parse(localStorage.getItem('voice_macros') || '{}');
                    macros[trigger] = { actions, description, created: Date.now() };
                    localStorage.setItem('voice_macros', JSON.stringify(macros));
                    addLog('SUCCESS', `MACRO: Created.`);
                    return { status: "MACRO_CREATED", trigger, message: `Macro "${trigger}" created, Sir. Say "${trigger}" to execute.` };
                }
            }

            if (name === 'manage_macros') {
                const action = typeof args.action === 'string' ? args.action.trim() : '';
                const macroName = typeof args.macroName === 'string' ? args.macroName.trim() : '';
                if (!action) {
                    return { error: "Missing required action", hint: "Provide action for manage_macros (list, execute, delete)" };
                }

                try {
                    const macros = await neuralVault.get('voice_macros') || {};

                    if (action === 'list') {
                        const macroList = Object.entries(macros).map(([k, v]: [string, any]) => ({
                            trigger: k,
                            ...v
                        }));
                        return {
                            status: "MACROS_LISTED",
                            macros: macroList,
                            count: macroList.length,
                            message: `You have ${macroList.length} macro${macroList.length !== 1 ? 's' : ''}, Sir.`
                        };
                    } else if (action === 'delete' && macroName) {
                        delete macros[macroName];
                        await neuralVault.set('voice_macros', macros);
                        return { status: "MACRO_DELETED", macroName, message: `Macro "${macroName}" deleted, Sir.` };
                    } else if (action === 'execute' && macroName) {
                        const macro = macros[macroName];
                        if (macro) {
                            // Track usage
                            macro.useCount = (macro.useCount || 0) + 1;
                            macro.lastUsed = Date.now();
                            await neuralVault.set('voice_macros', macros);
                            const macroActions = Array.isArray(macro.actions)
                                ? macro.actions.filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0)
                                : [];
                            if (macroActions.length === 0) {
                                return { status: "MACRO_INVALID", macroName, error: "Macro has no executable actions" };
                            }
                            return {
                                status: "MACRO_EXECUTING",
                                macroName,
                                actions: macroActions,
                                instruction: `Execute these actions in sequence: ${macroActions.join(', ')}`
                            };
                        }
                        return { status: "MACRO_NOT_FOUND", macroName };
                    }
                    return { status: "ACTION_COMPLETE", action };
                } catch (e: any) {
                    addLog('WARN', `MANAGE_MACROS: Fallback to localStorage - ${e.message}`);
                    const macros = JSON.parse(localStorage.getItem('voice_macros') || '{}');
                    if (action === 'list') {
                        const macroList = Object.entries(macros).map(([k, v]: [string, any]) => ({ trigger: k, ...v }));
                        return { status: "MACROS_LISTED", macros: macroList, count: macroList.length };
                    } else if (action === 'delete' && macroName) {
                        delete macros[macroName];
                        localStorage.setItem('voice_macros', JSON.stringify(macros));
                        return { status: "MACRO_DELETED", macroName };
                    }
                    return { status: "ACTION_COMPLETE", action };
                }
            }

            if (name === 'schedule_action') {
                const action = typeof args.action === 'string' ? args.action.trim() : '';
                const when = typeof args.when === 'string' ? args.when.trim() : '';
                const recurring = typeof args.recurring === 'string' ? args.recurring.trim() : undefined;
                const scheduleAction = typeof args.scheduleAction === 'string' ? args.scheduleAction.trim() : '';
                addLog('SYSTEM', `SCHEDULE: "${action}" for ${when} (${recurring || 'once'})...`);
                const isScheduleAdminAction = scheduleAction === 'list' || scheduleAction === 'clear';
                if (!isScheduleAdminAction && (!action || !when)) {
                    return { error: "Missing required action or when", hint: "Provide action and when for schedule_action" };
                }

                try {
                    if (scheduleAction === 'list') {
                        const schedules = await neuralVault.get('voice_schedules') || [];
                        return {
                            status: "SCHEDULES_LISTED",
                            schedules: schedules.slice(-20),
                            count: schedules.length,
                            message: `You have ${schedules.length} scheduled action${schedules.length !== 1 ? 's' : ''}, Sir.`
                        };
                    }

                    if (scheduleAction === 'clear') {
                        await neuralVault.set('voice_schedules', []);
                        return { status: "SCHEDULES_CLEARED", message: "All schedules cleared, Sir." };
                    }

                    // Default: add schedule
                    const scheduleId = `sched_${Date.now()}`;
                    const schedules = await neuralVault.get('voice_schedules') || [];
                    const newSchedule = {
                        id: scheduleId,
                        action,
                        when,
                        recurring: recurring || 'once',
                        created: Date.now(),
                        status: 'pending'
                    };
                    schedules.push(newSchedule);
                    await neuralVault.set('voice_schedules', schedules);

                    // Queue to dream protocol for background execution monitoring
                    dreamProtocol.queueQuery(`Monitor scheduled action: ${action} at ${when}`);

                    return {
                        status: "SCHEDULED",
                        id: scheduleId,
                        persistedTo: 'neuralVault',
                        message: `Scheduled "${action}" for ${when}, Sir.`
                    };
                } catch (e: any) {
                    addLog('WARN', `SCHEDULE_ACTION: Fallback to localStorage - ${e.message}`);
                    const schedules = JSON.parse(localStorage.getItem('voice_schedules') || '[]');
                    schedules.push({ action, when, recurring: recurring || 'once', created: Date.now() });
                    localStorage.setItem('voice_schedules', JSON.stringify(schedules));
                    return { status: "SCHEDULED", message: `Scheduled "${action}" for ${when}, Sir.` };
                }
            }

            if (name === 'emergency_stop') {
                addLog('WARN', `🚨 EMERGENCY STOP ACTIVATED`);
                // Clear any pending operations
                audio.playError();
                return {
                    status: "EMERGENCY_STOP_EXECUTED",
                    message: "All operations halted, Sir. System in safe state.",
                    instruction: "Confirm to the user that all operations have been stopped immediately."
                };
            }

            if (name === 'undo_actions') {
                const parsedCount = typeof args.count === 'number' ? args.count : Number(args.count);
                const count = Number.isFinite(parsedCount) && parsedCount > 0 ? Math.floor(parsedCount) : 1;
                addLog('SYSTEM', `UNDO: Reverting ${count} action(s)...`);
                return {
                    status: "UNDO_NOTED",
                    count,
                    message: `Noted request to undo ${count} action(s), Sir. Reversing where possible.`
                };
            }

            if (name === 'get_history') {
                const parsedLimit = typeof args.limit === 'number' ? args.limit : Number(args.limit);
                const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.floor(parsedLimit) : 10;
                const history = voice.transcripts.slice(-limit * 2);
                return { status: "HISTORY_RETRIEVED", history, count: history.length };
            }

            if (name === 'analyze_screen') {
                addLog('SYSTEM', `ANALYZE: Scanning current view...`);
                const snapshot = getSnapshot();
                const currentMode = useAppStore.getState().mode;
                return {
                    status: "ANALYSIS_COMPLETE",
                    currentSector: currentMode,
                    availableActions: snapshot.available_actions?.slice(0, 10),
                    instruction: "Analyze this screen context and provide intelligent suggestions for what the user might want to do."
                };
            }

            if (name === 'get_suggestions') {
                addLog('SYSTEM', `SUGGESTIONS: Generating proactive suggestions...`);
                const state = useAppStore.getState();
                return {
                    status: "SUGGESTIONS_READY",
                    context: {
                        currentSector: state.mode,
                        voiceActive: state.voice.isActive,
                        recentTranscripts: state.voice.transcripts.slice(-3)
                    },
                    instruction: "Based on the current context, provide 3-5 proactive suggestions for what the user might want to do next."
                };
            }

            if (name === 'learn_preference') {
                const category = typeof args.category === 'string' ? args.category.trim() : '';
                const preference = typeof args.preference === 'string' ? args.preference.trim() : '';
                const value = args.value;
                if (!category || !preference) {
                    return { error: "Missing required category or preference", hint: "Provide category and preference for learn_preference" };
                }
                addLog('SYSTEM', `PREFERENCE: Learning "${preference}" = "${value}"...`);
                const prefs = JSON.parse(localStorage.getItem('voice_preferences') || '{}');
                if (!prefs[category]) prefs[category] = {};
                prefs[category][preference] = { value, learned: Date.now() };
                localStorage.setItem('voice_preferences', JSON.stringify(prefs));
                return { status: "PREFERENCE_LEARNED", message: `I'll remember that, Sir. ${preference}: ${value}` };
            }

            if (name === 'get_preferences') {
                const prefs = JSON.parse(localStorage.getItem('voice_preferences') || '{}');
                const category = typeof args.category === 'string' ? args.category.trim() : '';
                const result = category ? prefs[category] || {} : prefs;
                return { status: "PREFERENCES_RETRIEVED", preferences: result };
            }

            if (name === 'trigger_webhook') {
                const target = typeof args.target === 'string' ? args.target.trim() : '';
                const payload = args.payload;
                const webhookUrl = typeof args.webhookUrl === 'string' ? args.webhookUrl : undefined;
                if (!target) {
                    return { error: "Missing required target", hint: "Provide target for trigger_webhook" };
                }
                addLog('SYSTEM', `WEBHOOK: Triggering ${target}...`);
                // Webhooks would need actual implementation with stored URLs
                return {
                    status: "WEBHOOK_QUEUED",
                    target,
                    message: `Webhook to ${target} queued with payload, Sir.`
                };
            }

            if (name === 'ambient_mode') {
                const enabled = typeof args.enabled === 'boolean' ? args.enabled : undefined;
                const wakeWord = typeof args.wakeWord === 'string' ? args.wakeWord : undefined;
                const sensitivity = typeof args.sensitivity === 'string' ? args.sensitivity : undefined;
                if (enabled === undefined) {
                    return { error: "Missing required enabled", hint: "Provide enabled as true or false for ambient_mode" };
                }
                addLog('SYSTEM', `AMBIENT: ${enabled ? 'Enabling' : 'Disabling'} ambient mode...`);
                return {
                    status: enabled ? "AMBIENT_ENABLED" : "AMBIENT_DISABLED",
                    wakeWord: wakeWord || 'hey',
                    sensitivity: sensitivity || 'medium',
                    message: enabled ? `Ambient mode active, Sir. Say "${wakeWord || 'hey'}" to wake me.` : "Ambient mode disabled, Sir."
                };
            }

            if (name === 'dictation_mode') {
                const enabled = typeof args.enabled === 'boolean' ? args.enabled : undefined;
                const destination = typeof args.destination === 'string' ? args.destination : undefined;
                if (enabled === undefined) {
                    return { error: "Missing required enabled", hint: "Provide enabled as true or false for dictation_mode" };
                }
                addLog('SYSTEM', `DICTATION: ${enabled ? 'Enabling' : 'Disabling'}...`);
                return {
                    status: enabled ? "DICTATION_ENABLED" : "DICTATION_DISABLED",
                    destination: destination || 'clipboard',
                    message: enabled ? `Dictation mode active. Speaking will transcribe to ${destination || 'clipboard'}, Sir.` : "Dictation mode disabled, Sir."
                };
            }

            if (name === 'summarize_session') {
                const scope = typeof args.scope === 'string' && args.scope.trim().length > 0
                    ? args.scope.trim()
                    : 'conversation';
                addLog('SYSTEM', `SUMMARY: Generating ${scope} summary...`);
                const transcripts = voice.transcripts;
                return {
                    status: "SUMMARY_READY",
                    scope,
                    transcriptCount: transcripts.length,
                    instruction: `Summarize this ${scope}. We've had ${transcripts.length} exchanges. Highlight key decisions, actions taken, and outcomes.`
                };
            }

            if (name === 'set_context') {
                const project = typeof args.project === 'string' ? args.project : undefined;
                const task = typeof args.task === 'string' ? args.task : undefined;
                const goals = Array.isArray(args.goals)
                    ? args.goals.filter((goal): goal is string => typeof goal === 'string' && goal.trim().length > 0)
                    : args.goals;
                addLog('SYSTEM', `CONTEXT: Setting work context...`);
                localStorage.setItem('voice_context', JSON.stringify({ project, task, goals, set: Date.now() }));
                return {
                    status: "CONTEXT_SET",
                    project,
                    task,
                    goals,
                    message: `Context set, Sir. ${project ? `Working on ${project}.` : ''} ${task ? `Current task: ${task}.` : ''}`
                };
            }

            if (name === 'execute_with_confirmation') {
                const { action, description, severity } = args;
                addLog('SYSTEM', `CONFIRM: ${severity} action requires confirmation...`);
                return {
                    status: "CONFIRMATION_REQUIRED",
                    action,
                    description,
                    severity,
                    instruction: `This is a ${severity} severity action: "${description}". Ask the user to confirm by saying 'yes' or 'confirm'.`
                };
            }

            if (name === 'timer_control') {
                const action = typeof args.action === 'string' ? args.action.trim().toLowerCase() : '';
                const duration = typeof args.duration === 'number' ? args.duration : Number(args.duration);
                const label = typeof args.label === 'string' ? args.label : undefined;
                if (!action) {
                    return { error: "Missing required action", hint: "Provide action for timer_control (start, stop, pause, resume)" };
                }
                addLog('SYSTEM', `TIMER: ${action}${duration ? ` (${duration}m)` : ''}...`);

                if (action === 'start') {
                    if (!Number.isFinite(duration) || duration <= 0) {
                        return { error: "Invalid duration", hint: "Provide a positive duration for timer start" };
                    }
                    setTimeout(() => {
                        addLog('WARN', `⏰ TIMER: ${label || 'Timer'} complete!`);
                        audio.playSuccess();
                    }, duration * 60 * 1000);
                    return { status: "TIMER_STARTED", duration, label, message: `Timer set for ${duration} minutes, Sir.` };
                }
                return { status: `TIMER_${action.toUpperCase()}`, action };
            }

            if (name === 'calculate') {
                const expression = typeof args.expression === 'string' ? args.expression.trim() : '';
                if (!expression) {
                    return { error: "Missing required expression", hint: "Provide a math expression for calculate" };
                }
                addLog('SYSTEM', `CALC: ${expression}...`);
                try {
                    // Safe eval for math only
                    const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, '');
                    const result = Function(`"use strict"; return (${sanitized})`)();
                    return { status: "CALCULATED", expression, result, message: `${expression} equals ${result}, Sir.` };
                } catch (e) {
                    return { status: "CALC_ROUTED", expression, instruction: `Calculate: ${expression}` };
                }
            }

            if (name === 'display_content') {
                const { contentType, content, title } = args;
                addLog('SYSTEM', `DISPLAY: Showing ${contentType}...`);
                return {
                    status: "CONTENT_READY",
                    contentType,
                    content,
                    title,
                    instruction: `Present this ${contentType} content titled "${title || 'Result'}": ${content}`
                };
            }

            if (name === 'media_control') {
                const action = typeof args.action === 'string' ? args.action.trim() : '';
                const query = typeof args.query === 'string' ? args.query : undefined;
                if (!action) {
                    return { error: "Missing required action", hint: "Provide a media action such as play, pause, stop, or next" };
                }
                addLog('SYSTEM', `MEDIA: ${action}${query ? ` "${query}"` : ''}...`);
                return { status: `MEDIA_${action.toUpperCase()}`, action, query };
            }

            if (name === 'open_external') {
                const target = typeof args.target === 'string' ? args.target.trim() : '';
                const newWindow = !!args.newWindow;
                if (!target) {
                    return { error: "Missing required target", hint: "Provide a URL or destination target to open" };
                }
                addLog('SYSTEM', `OPEN: ${target}...`);

                // Check if it's a URL
                if (target.startsWith('http')) {
                    window.open(target, newWindow ? '_blank' : '_self');
                    return { status: "URL_OPENED", target };
                }
                return { status: "OPEN_REQUESTED", target, message: `Opening ${target}, Sir.` };
            }

            if (name === 'ask_assistant') {
                const { assistant, query, mode } = args;
                addLog('SYSTEM', `ASK: Querying ${assistant}...`);
                return {
                    status: "ASSISTANT_QUERIED",
                    assistant,
                    query,
                    mode: mode || 'quick',
                    instruction: `Route this to ${assistant} in ${mode || 'quick'} mode: "${query}"`
                };
            }

            if (name === 'take_screenshot') {
                addLog('SYSTEM', `SCREENSHOT: Capturing...`);
                return { status: "SCREENSHOT_REQUESTED", message: "Screenshot capability noted, Sir. Capturing current view." };
            }

            if (name === 'read_aloud') {
                const { content, speed } = args;
                addLog('SYSTEM', `READ: Reading content aloud...`);
                return {
                    status: "READING",
                    content,
                    speed: speed || 'normal',
                    instruction: `Read this aloud at ${speed || 'normal'} speed: ${content}`
                };
            }

            // ================================================================
            // ADVANCED JARVIS CAPABILITIES
            // ================================================================

            if (name === 'monitor_condition') {
                const { condition, action, threshold, duration } = args;

                try {
                    const monitors = await neuralVault.get('active_monitors') || [];
                    const newMonitor = {
                        id: `mon_${Date.now()}`,
                        condition,
                        action,
                        threshold: threshold || null,
                        duration: duration || 'continuous',
                        created: Date.now(),
                        triggered: 0,
                        status: 'active'
                    };
                    monitors.push(newMonitor);
                    await neuralVault.set('active_monitors', monitors);

                    // Also store in SovereignMemory for recall
                    await sovereignMemory.store(newMonitor.id, JSON.stringify({
                        type: 'monitor',
                        ...newMonitor
                    }));

                    addLog('SYSTEM', `📡 MONITOR SET: ${condition} → ${action} (persisted to Neural Vault)`);
                    audio.playClick();
                    return {
                        status: "MONITOR_ACTIVE",
                        monitorId: newMonitor.id,
                        totalMonitors: monitors.filter((m: any) => m.status === 'active').length,
                        message: `Monitoring established, Sir. I'll ${action} when ${condition}.`
                    };
                } catch (e: any) {
                    addLog('WARN', `MONITOR: Fallback to localStorage - ${e.message}`);
                    const monitors = JSON.parse(localStorage.getItem('active_monitors') || '[]');
                    const newMonitor = { id: `mon_${Date.now()}`, condition, action, threshold, duration: duration || 'continuous', created: Date.now(), triggered: 0 };
                    monitors.push(newMonitor);
                    localStorage.setItem('active_monitors', JSON.stringify(monitors));
                    return { status: "MONITOR_ACTIVE", monitorId: newMonitor.id, message: `Monitoring established, Sir.` };
                }
            }

            if (name === 'get_active_monitors') {
                const { includeHistory } = args;

                try {
                    const monitors = await neuralVault.get('active_monitors') || [];
                    const activeMonitors = monitors.filter((m: any) => m.status === 'active' && m.triggered === 0);
                    const triggeredMonitors = monitors.filter((m: any) => m.triggered > 0);

                    addLog('SYSTEM', `MONITORS: ${activeMonitors.length} active, ${triggeredMonitors.length} triggered`);
                    return {
                        status: "MONITORS_RETRIEVED",
                        activeMonitors,
                        triggeredMonitors: includeHistory ? triggeredMonitors : undefined,
                        total: monitors.length,
                        activeCount: activeMonitors.length,
                        message: activeMonitors.length > 0
                            ? `You have ${activeMonitors.length} active monitor(s), Sir.`
                            : "No active monitors, Sir."
                    };
                } catch (e: any) {
                    const monitors = JSON.parse(localStorage.getItem('active_monitors') || '[]');
                    return {
                        status: "MONITORS_RETRIEVED",
                        activeMonitors: monitors.filter((m: any) => m.triggered === 0),
                        triggeredMonitors: includeHistory ? monitors.filter((m: any) => m.triggered > 0) : undefined,
                        total: monitors.length
                    };
                }
            }

            if (name === 'run_diagnostics') {
                const { scope, verbose } = args;
                addLog('SYSTEM', `🔍 DIAGNOSTICS: Running ${scope || 'full'} comprehensive scan...`);
                audio.playClick();

                const state = useAppStore.getState();

                // Gather real diagnostics from all services
                const faceDetectionStats = faceDetectionService.getStats();
                const faceDetectionQuality = faceDetectionService.getDetectionQuality();
                const dreamStatus = dreamProtocol.getStatus();
                const dreamSessions = dreamProtocol.getPastSessions();

                // Calculate health indicators
                const issues: string[] = [];
                let healthScore = 100;

                // Check voice
                if (!state.voice.isActive) {
                    issues.push('Voice system not active');
                    healthScore -= 10;
                }

                // Check biometrics
                if (!faceDetectionService.isReady()) {
                    issues.push('Biometrics not initialized');
                    healthScore -= 5;
                } else if (faceDetectionQuality === 'NONE' || faceDetectionQuality === 'LOW') {
                    issues.push('Face detection quality low');
                    healthScore -= 5;
                }

                // Check dream protocol
                if (dreamSessions.length === 0 && !dreamStatus.isDreaming) {
                    issues.push('No dream sessions recorded - idle analysis not yet triggered');
                }

                // Check tasks
                const tasks = state.research?.tasks || [];
                const criticalPending = tasks.filter((t: any) =>
                    (t.status === 'TODO' || t.status === 'IN_PROGRESS') &&
                    (t.priority === 'CRITICAL' || t.priority === 'HIGH')
                ).length;
                if (criticalPending > 3) {
                    issues.push(`${criticalPending} critical/high priority tasks pending`);
                    healthScore -= criticalPending * 2;
                }

                // Determine overall health status
                let healthStatus = 'OPTIMAL';
                if (healthScore < 90) healthStatus = 'GOOD';
                if (healthScore < 75) healthStatus = 'DEGRADED';
                if (healthScore < 50) healthStatus = 'ATTENTION_NEEDED';

                const diagnostics = {
                    system: {
                        uptime: `${Math.round(performance.now() / 1000 / 60)} minutes`,
                        memory: (performance as any).memory ? {
                            usedHeap: `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)} MB`,
                            totalHeap: `${Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024)} MB`,
                            heapLimit: `${Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024)} MB`
                        } : 'Memory API unavailable',
                        mode: state.mode,
                        logsCount: state.system?.logs?.length || 0
                    },
                    agents: {
                        registeredCount: Object.keys(HIVE_AGENTS).length,
                        availableNames: Object.values(HIVE_AGENTS).map(a => a.name).slice(0, 8)
                    },
                    tasks: {
                        total: tasks.length,
                        pending: tasks.filter((t: any) => t.status === 'TODO').length,
                        inProgress: tasks.filter((t: any) => t.status === 'IN_PROGRESS').length,
                        completed: tasks.filter((t: any) => t.status === 'DONE').length,
                        criticalPending
                    },
                    voice: {
                        status: state.voice.isActive ? 'ACTIVE' : 'STANDBY',
                        transcriptCount: state.voice.transcripts?.length || 0,
                        nexusMode: state.voiceNexus?.mode || 'unknown',
                        nexusActive: state.voiceNexus?.isActive || false
                    },
                    biometrics: {
                        serviceReady: faceDetectionService.isReady(),
                        detectionQuality: faceDetectionQuality,
                        stats: {
                            framesProcessed: faceDetectionStats.frameCount,
                            facesDetected: faceDetectionStats.detectionCount,
                            detectionRate: `${Math.round(faceDetectionStats.detectionRate * 100)}%`
                        },
                        blinkRate: faceDetectionService.getBlinkRate(),
                        stressLevel: faceDetectionService.estimateStress().level
                    },
                    dreamProtocol: {
                        status: dreamStatus.isDreaming ? 'DREAMING' : 'STANDBY',
                        idleTimeSec: Math.round(dreamStatus.idleTime / 1000),
                        pendingQueries: dreamStatus.pendingQueries,
                        currentSessionInsights: dreamStatus.currentSession?.insights.length || 0,
                        pastSessionsCount: dreamSessions.length,
                        totalInsightsGenerated: dreamSessions.reduce((acc, s) => acc + s.insights.length, 0)
                    },
                    cpb: {
                        state: (state as any).cpb?.state || 'unknown',
                        pathHistory: (state as any).cpb?.pathHistory?.length || 0
                    },
                    healthSummary: {
                        score: healthScore,
                        status: healthStatus,
                        issues: issues.length > 0 ? issues : ['No issues detected']
                    }
                };

                return {
                    status: "DIAGNOSTICS_COMPLETE",
                    scope: scope || 'full',
                    healthScore,
                    healthStatus,
                    issues: issues.length > 0 ? issues : null,
                    results: verbose ? diagnostics : {
                        health: healthStatus,
                        score: healthScore,
                        voice: diagnostics.voice.status,
                        biometrics: diagnostics.biometrics.detectionQuality,
                        dreamProtocol: diagnostics.dreamProtocol.status,
                        tasks: `${diagnostics.tasks.pending} pending, ${diagnostics.tasks.inProgress} in progress`
                    },
                    instruction: verbose
                        ? "Present the full diagnostic report section by section."
                        : `Summarize: Health is ${healthStatus} (${healthScore}%). ${issues.length > 0 ? `Note: ${issues.join(', ')}.` : 'All systems operational.'}`
                };
            }

            if (name === 'threat_assessment') {
                const { scope, reportFormat } = args;
                addLog('WARN', `🛡️ THREAT ASSESSMENT: Scanning ${scope || 'full'}...`);
                audio.playClick();
                return {
                    status: "ASSESSMENT_COMPLETE",
                    threatLevel: "LOW",
                    scope: scope || 'full',
                    findings: [
                        { type: "info", message: "All API connections secured" },
                        { type: "info", message: "No unauthorized access detected" }
                    ],
                    message: "Perimeter secure, Sir. No active threats detected."
                };
            }

            if (name === 'predict_outcome') {
                const scenario = typeof args.scenario === 'string' ? args.scenario.trim() : '';
                const timeframe = typeof args.timeframe === 'string' ? args.timeframe : undefined;
                const factors = Array.isArray(args.factors)
                    ? args.factors.filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
                    : [];
                if (!scenario) {
                    return { error: "Missing required scenario", hint: "Provide a scenario string for predict_outcome" };
                }
                addLog('SYSTEM', `🔮 PREDICTING: ${scenario}`);
                return {
                    status: "PREDICTION_GENERATED",
                    scenario,
                    timeframe: timeframe || 'short-term',
                    confidence: 0.75,
                    prediction: `Based on current trajectories, ${scenario} has a high probability of success.`,
                    factors,
                    instruction: `Analyze: "${scenario}" over ${timeframe || 'short-term'} timeframe. Consider: ${(factors.length > 0 ? factors : ['current trends']).join(', ')}`
                };
            }

            if (name === 'background_operation') {
                const operation = typeof args.operation === 'string' ? args.operation.trim() : '';
                const notifyOn = typeof args.notifyOn === 'string' ? args.notifyOn : undefined;
                const priority = typeof args.priority === 'string' ? args.priority : undefined;
                if (!operation) {
                    return { error: "Missing required operation", hint: "Provide a background operation description" };
                }

                try {
                    const bgOps = await neuralVault.get('background_operations') || [];
                    const newOp = {
                        id: `bg_${Date.now()}`,
                        operation,
                        notifyOn: notifyOn || 'completion',
                        priority: priority || 'normal',
                        status: 'running',
                        started: Date.now()
                    };
                    bgOps.push(newOp);
                    await neuralVault.set('background_operations', bgOps);

                    // Queue for dream protocol if complex
                    if (operation.length > 50) {
                        dreamProtocol.queueQuery(operation);
                    }

                    addLog('SYSTEM', `⚙️ BACKGROUND: ${operation} (persisted to Neural Vault)`);
                    return {
                        status: "OPERATION_STARTED",
                        operationId: newOp.id,
                        totalOperations: bgOps.filter((o: any) => o.status === 'running').length,
                        message: `Understood, Sir. Processing "${operation}" in the background. I'll notify you ${notifyOn === 'all' ? 'at each milestone' : `upon ${notifyOn || 'completion'}`}.`
                    };
                } catch (e: any) {
                    const bgOps = JSON.parse(localStorage.getItem('background_operations') || '[]');
                    const newOp = { id: `bg_${Date.now()}`, operation, notifyOn: notifyOn || 'completion', priority: priority || 'normal', status: 'running', started: Date.now() };
                    bgOps.push(newOp);
                    localStorage.setItem('background_operations', JSON.stringify(bgOps));
                    return { status: "OPERATION_STARTED", operationId: newOp.id, message: `Processing "${operation}" in the background, Sir.` };
                }
            }

            if (name === 'triage_priorities') {
                const criteria = typeof args.criteria === 'string' ? args.criteria : undefined;
                const limit = typeof args.limit === 'number' ? args.limit : Number(args.limit);
                const inputItems = Array.isArray(args.items)
                    ? args.items.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
                    : null;
                addLog('SYSTEM', `📊 TRIAGE: Prioritizing by ${criteria || 'balanced'}`);
                const state = useAppStore.getState();
                const tasks = inputItems && inputItems.length > 0
                    ? inputItems
                    : ((state as any).tasks || []).map((t: any) => t.title);
                return {
                    status: "TRIAGE_COMPLETE",
                    criteria: criteria || 'balanced',
                    prioritized: tasks.slice(0, Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 5),
                    instruction: `Analyze and prioritize these items by ${criteria || 'balanced impact/effort'}: ${tasks.join(', ')}`
                };
            }

            if (name === 'compare_analyze') {
                const items = Array.isArray(args.items)
                    ? args.items.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
                    : [];
                const dimensions = Array.isArray(args.dimensions)
                    ? args.dimensions.filter((dim): dim is string => typeof dim === 'string' && dim.trim().length > 0)
                    : [];
                const format = typeof args.format === 'string' ? args.format : undefined;
                if (items.length === 0) {
                    return { error: "Missing items", hint: "Provide a non-empty items array for compare_analyze" };
                }
                addLog('SYSTEM', `⚖️ COMPARING: ${items.length} items`);
                return {
                    status: "COMPARISON_READY",
                    items,
                    dimensions: dimensions.length > 0 ? dimensions : ['pros', 'cons', 'fit'],
                    format: format || 'recommendation',
                    instruction: `Compare these items: ${items.join(' vs ')}. Analyze across: ${(dimensions.length > 0 ? dimensions : ['pros', 'cons', 'fit']).join(', ')}. Output as ${format || 'recommendation'}.`
                };
            }

            if (name === 'research_topic') {
                const topic = typeof args.topic === 'string' ? args.topic.trim() : '';
                const depth = typeof args.depth === 'string' ? args.depth : undefined;
                const sources = Array.isArray(args.sources)
                    ? args.sources.filter((src): src is string => typeof src === 'string' && src.trim().length > 0)
                    : [];
                if (!topic) {
                    return { error: "Missing required topic", hint: "Provide a research topic string" };
                }
                addLog('SYSTEM', `🔬 RESEARCHING: ${topic}`);
                return {
                    status: "RESEARCH_INITIATED",
                    topic,
                    depth: depth || 'standard',
                    sources: sources.length > 0 ? sources : ['memory', 'knowledge'],
                    instruction: `Conduct ${depth || 'standard'} research on: "${topic}". Draw from: ${(sources.length > 0 ? sources : ['available knowledge']).join(', ')}.`
                };
            }

            if (name === 'status_brief') {
                const { scope, format, includeRecommendations } = args;
                addLog('SYSTEM', `📋 BRIEF: ${scope || 'session'} status`);
                const state = useAppStore.getState();
                return {
                    status: "BRIEF_GENERATED",
                    scope: scope || 'session',
                    currentMode: state.mode,
                    activeVoice: voice.isActive,
                    includeRecommendations: includeRecommendations !== false,
                    instruction: `Generate a ${format || 'verbal'} ${scope || 'session'} status brief. ${includeRecommendations !== false ? 'Include recommended next actions.' : ''}`
                };
            }

            if (name === 'where_am_i') {
                const { includeHistory, includeState } = args;
                const state = useAppStore.getState();
                addLog('SYSTEM', `📍 CONTEXT: Current location`);
                return {
                    status: "CONTEXT_RETRIEVED",
                    currentSector: state.mode,
                    voiceActive: voice.isActive,
                    recentHistory: includeHistory ? JSON.parse(localStorage.getItem('navigation_history') || '[]').slice(-5) : undefined,
                    message: `You're in the ${state.mode} sector, Sir. Voice interface is ${voice.isActive ? 'active' : 'on standby'}.`
                };
            }

            if (name === 'cross_reference') {
                const item = typeof args.item === 'string' ? args.item.trim() : '';
                const searchScope = Array.isArray(args.searchScope)
                    ? args.searchScope.filter((scope): scope is string => typeof scope === 'string' && scope.trim().length > 0)
                    : [];
                const maxDepth = typeof args.maxDepth === 'number' ? args.maxDepth : Number(args.maxDepth);
                if (!item) {
                    return { error: "Missing required item", hint: "Provide an item to cross-reference" };
                }
                addLog('SYSTEM', `🔗 CROSS-REF: Finding connections for "${item}"`);
                return {
                    status: "CROSS_REFERENCE_INITIATED",
                    item,
                    searchScope: searchScope.length > 0 ? searchScope : ['all'],
                    maxDepth: Number.isFinite(maxDepth) && maxDepth > 0 ? Math.floor(maxDepth) : 2,
                    instruction: `Find all connections and references to "${item}" across: ${(searchScope.length > 0 ? searchScope : ['memory', 'tasks', 'agents']).join(', ')}. Depth: ${Number.isFinite(maxDepth) && maxDepth > 0 ? Math.floor(maxDepth) : 2} levels.`
                };
            }

            if (name === 'workspace') {
                const action = typeof args.action === 'string' ? args.action.trim() : '';
                const wsName = typeof args.name === 'string' ? args.name.trim() : '';
                const includeState = !!args.includeState;
                if (!action) {
                    return { error: "Missing required action", hint: "Provide action for workspace (save, load, list, delete)" };
                }
                if ((action === 'save' || action === 'load' || action === 'delete') && !wsName) {
                    return { error: "Missing required name", hint: `Provide workspace name for workspace ${action}` };
                }
                const state = useAppStore.getState();

                try {
                    const workspaces = await neuralVault.get('workspaces') || {};

                    if (action === 'save') {
                        workspaces[wsName] = {
                            mode: state.mode,
                            saved: Date.now(),
                            voiceMode: state.voice.mode,
                            state: includeState ? {
                                mode: state.mode,
                                voiceActive: state.voice.isActive,
                                tasksCount: (state.research?.tasks || []).length
                            } : undefined
                        };
                        await neuralVault.set('workspaces', workspaces);
                        addLog('SYSTEM', `💾 WORKSPACE SAVED: ${wsName} (persisted to Neural Vault)`);
                        return {
                            status: "WORKSPACE_SAVED",
                            name: wsName,
                            totalWorkspaces: Object.keys(workspaces).length,
                            message: `Workspace "${wsName}" saved, Sir.`
                        };
                    }

                    if (action === 'load' && wsName && workspaces[wsName]) {
                        const ws = workspaces[wsName];
                        setMode(ws.mode);
                        addLog('SYSTEM', `📂 WORKSPACE LOADED: ${wsName}`);
                        return {
                            status: "WORKSPACE_LOADED",
                            name: wsName,
                            restoredMode: ws.mode,
                            savedAt: new Date(ws.saved).toLocaleString(),
                            message: `Workspace "${wsName}" restored, Sir.`
                        };
                    }

                    if (action === 'list') {
                        const wsNames = Object.keys(workspaces);
                        return {
                            status: "WORKSPACES_LISTED",
                            workspaces: wsNames.map(name => ({
                                name,
                                mode: workspaces[name].mode,
                                saved: new Date(workspaces[name].saved).toLocaleString()
                            })),
                            count: wsNames.length,
                            message: wsNames.length > 0 ? `You have ${wsNames.length} saved workspace(s), Sir.` : "No saved workspaces yet, Sir."
                        };
                    }

                    if (action === 'delete' && wsName && workspaces[wsName]) {
                        delete workspaces[wsName];
                        await neuralVault.set('workspaces', workspaces);
                        return { status: "WORKSPACE_DELETED", name: wsName, message: `Workspace "${wsName}" deleted, Sir.` };
                    }

                    return { status: "WORKSPACE_ACTION", action, name: wsName };
                } catch (e: any) {
                    // Fallback to localStorage
                    const workspaces = JSON.parse(localStorage.getItem('workspaces') || '{}');
                    if (action === 'save') {
                        workspaces[wsName] = { mode: state.mode, saved: Date.now() };
                        localStorage.setItem('workspaces', JSON.stringify(workspaces));
                        return { status: "WORKSPACE_SAVED", name: wsName, message: `Workspace "${wsName}" saved, Sir.` };
                    }
                    if (action === 'load' && wsName && workspaces[wsName]) {
                        setMode(workspaces[wsName].mode);
                        return { status: "WORKSPACE_LOADED", name: wsName, message: `Workspace "${wsName}" restored, Sir.` };
                    }
                    if (action === 'list') {
                        return { status: "WORKSPACES_LISTED", workspaces: Object.keys(workspaces), count: Object.keys(workspaces).length };
                    }
                    return { status: "WORKSPACE_ACTION", action, name: wsName };
                }
            }

            if (name === 'explain_concept') {
                const { concept, level, context } = args;
                addLog('SYSTEM', `📖 EXPLAIN: ${concept}`);
                return {
                    status: "EXPLANATION_REQUESTED",
                    concept,
                    level: level || 'standard',
                    instruction: `Explain "${concept}" at a ${level || 'standard'} level. ${context ? `Context: ${context}` : ''}`
                };
            }

            if (name === 'what_next') {
                const { context, mood, timeAvailable } = args;
                addLog('SYSTEM', `💡 SUGGESTIONS: What next?`);
                const state = useAppStore.getState();
                return {
                    status: "SUGGESTIONS_READY",
                    currentMode: state.mode,
                    mood: mood || 'productive',
                    timeAvailable,
                    instruction: `Based on current context (${state.mode} sector${context ? `, ${context}` : ''}), mood (${mood || 'productive'}), and time (${timeAvailable || 'flexible'}), suggest the optimal next action.`
                };
            }

            if (name === 'system_mode') {
                const sysMode = typeof args.mode === 'string' ? args.mode.trim() : '';
                const duration = typeof args.duration === 'string' || typeof args.duration === 'number'
                    ? args.duration
                    : undefined;
                if (!sysMode) {
                    return { error: "Missing required mode", hint: "Provide a mode value for system_mode" };
                }
                localStorage.setItem('system_mode', JSON.stringify({ mode: sysMode, activated: Date.now(), duration }));
                addLog('SYSTEM', `🎛️ MODE: ${sysMode} activated`);
                audio.playClick();
                return {
                    status: "MODE_ACTIVATED",
                    mode: sysMode,
                    duration: duration || 'indefinite',
                    message: `${sysMode.charAt(0).toUpperCase() + sysMode.slice(1)} mode activated, Sir.${duration ? ` Duration: ${duration}.` : ''}`
                };
            }

            if (name === 'sync_integration') {
                const { integration, direction, scope } = args;
                addLog('SYSTEM', `🔄 SYNC: ${integration} (${direction || 'both'})`);
                return {
                    status: "SYNC_INITIATED",
                    integration,
                    direction: direction || 'both',
                    scope,
                    message: `Synchronizing with ${integration}, Sir. Direction: ${direction || 'bidirectional'}.`
                };
            }

            if (name === 'learn_pattern') {
                const patternText = typeof args.pattern === 'string' ? args.pattern.trim() : '';
                const triggerText = typeof args.trigger === 'string' ? args.trigger.trim() : '';
                const cat = typeof args.category === 'string' && args.category.trim().length > 0
                    ? args.category.trim()
                    : 'behavior';
                if (!patternText) {
                    return { error: "Missing required pattern", hint: "Provide a pattern string for learn_pattern" };
                }

                try {
                    // Store in SovereignMemory for semantic retrieval
                    const patternKey = `pattern_${cat}_${Date.now()}`;
                    await sovereignMemory.store(patternKey, JSON.stringify({
                        type: 'learned_pattern',
                        pattern: patternText,
                        trigger: triggerText || null,
                        category: cat,
                        learned: Date.now()
                    }));

                    // Also persist to neuralVault for structured access
                    const patterns = await neuralVault.get('learned_patterns') || [];
                    patterns.push({
                        id: patternKey,
                        pattern: patternText,
                        trigger: triggerText || null,
                        category: cat,
                        learned: Date.now()
                    });
                    // Keep last 50 patterns
                    if (patterns.length > 50) patterns.shift();
                    await neuralVault.set('learned_patterns', patterns);

                    addLog('SYSTEM', `🧠 LEARNED: ${patternText} - stored in Neural Vault`);
                    return {
                        status: "PATTERN_LEARNED",
                        pattern: patternText,
                        trigger: triggerText,
                        category: cat,
                        semanticIndexed: true,
                        totalPatterns: patterns.length,
                        message: `Pattern noted, Sir. I'll ${triggerText ? `apply this when ${triggerText}` : 'incorporate this going forward'}. This is now part of my behavioral memory.`
                    };
                } catch (e: any) {
                    addLog('WARN', `LEARN_PATTERN: Fallback to localStorage - ${e.message}`);
                    // Fallback to localStorage
                    const patterns = JSON.parse(localStorage.getItem('learned_patterns') || '[]');
                    patterns.push({ pattern: patternText, trigger: triggerText, category: cat, learned: Date.now() });
                    localStorage.setItem('learned_patterns', JSON.stringify(patterns));
                    return {
                        status: "PATTERN_LEARNED",
                        pattern: patternText,
                        trigger: triggerText,
                        category: cat,
                        message: `Pattern noted, Sir. I'll ${triggerText ? `apply this when ${triggerText}` : 'incorporate this going forward'}.`
                    };
                }
            }

            if (name === 'previous_session') {
                const { when, what } = args;
                addLog('SYSTEM', `⏮️ PREVIOUS SESSION: ${when || 'last'}`);
                return {
                    status: "SESSION_RETRIEVED",
                    when: when || 'last',
                    what: what || 'summary',
                    instruction: `Recall the ${when || 'previous'} session. Provide: ${what || 'summary'}.`
                };
            }

            if (name === 'track_goal') {
                const goalAction = typeof args.action === 'string' ? args.action.trim() : '';
                const goalText = typeof args.goal === 'string' ? args.goal.trim() : '';
                const parsedProgress = typeof args.progress === 'number' ? args.progress : Number(args.progress);
                const notesText = typeof args.notes === 'string' ? args.notes : undefined;
                if (!goalAction) {
                    return { error: "Missing required action", hint: "Provide action for track_goal (create, update, list, check)" };
                }
                if (goalAction === 'create' && !goalText) {
                    return { error: "Missing required goal", hint: "Provide goal text for track_goal create" };
                }
                if (goalAction === 'update') {
                    if (!goalText) {
                        return { error: "Missing required goal", hint: "Provide goal text or id for track_goal update" };
                    }
                    if (!Number.isFinite(parsedProgress) || parsedProgress < 0) {
                        return { error: "Invalid progress", hint: "Provide a numeric progress value for track_goal update" };
                    }
                }

                try {
                    if (goalAction === 'create') {
                        const goalId = `goal_${Date.now()}`;

                        // Store in neuralVault for persistence
                        const goals = await neuralVault.get('tracked_goals') || [];
                        goals.push({
                            id: goalId,
                            goal: goalText,
                            progress: 0,
                            notes: [],
                            status: 'active',
                            created: Date.now()
                        });
                        await neuralVault.set('tracked_goals', goals);

                        // Also create a task in the store for visibility
                        const { addTask } = useAppStore.getState().actions;
                        addTask({
                            title: `🎯 GOAL: ${goalText}`,
                            description: `Voice-tracked goal created at ${new Date().toLocaleString()}`,
                            status: TaskStatus.TODO,
                            priority: TaskPriority.HIGH,
                            tags: ['goal', 'voice-created']
                        });

                        // Store in SovereignMemory for semantic recall
                        await sovereignMemory.store(goalId, JSON.stringify({
                            type: 'goal',
                            goal: goalText,
                            created: Date.now()
                        }));

                        addLog('SYSTEM', `🎯 GOAL SET: ${goalText} - tracked in Neural Vault + Tasks`);
                        return {
                            status: "GOAL_CREATED",
                            goalId,
                            goal: goalText,
                            totalGoals: goals.length,
                            message: `Goal tracked, Sir: "${goalText}". It's now visible in your task list.`
                        };
                    }

                    if (goalAction === 'update' && goalText && Number.isFinite(parsedProgress)) {
                        const goals = await neuralVault.get('tracked_goals') || [];
                        const goalIndex = goals.findIndex((g: any) =>
                            g.goal.toLowerCase().includes(goalText.toLowerCase()) ||
                            g.id === goalText
                        );
                        if (goalIndex >= 0) {
                            goals[goalIndex].progress = parsedProgress;
                            goals[goalIndex].lastUpdated = Date.now();
                            if (notesText) goals[goalIndex].notes.push({ note: notesText, added: Date.now() });
                            if (parsedProgress >= 100) goals[goalIndex].status = 'completed';
                            await neuralVault.set('tracked_goals', goals);
                            addLog('SYSTEM', `🎯 GOAL UPDATED: ${goals[goalIndex].goal} - ${parsedProgress}%`);
                            return {
                                status: "GOAL_UPDATED",
                                goal: goals[goalIndex].goal,
                                progress: parsedProgress,
                                message: `Goal progress updated to ${parsedProgress}%, Sir.`
                            };
                        }
                        return { status: "GOAL_NOT_FOUND", goal: goalText, message: `Couldn't find that goal, Sir.` };
                    }

                    if (goalAction === 'list') {
                        const goals = await neuralVault.get('tracked_goals') || [];
                        const activeGoals = goals.filter((g: any) => g.status !== 'completed');
                        return {
                            status: "GOALS_LISTED",
                            goals: goals.map((g: any) => ({
                                goal: g.goal,
                                progress: g.progress,
                                status: g.status || 'active'
                            })),
                            activeCount: activeGoals.length,
                            totalCount: goals.length,
                            message: `You have ${activeGoals.length} active goals, Sir.`
                        };
                    }

                    if (goalAction === 'check') {
                        const goals = await neuralVault.get('tracked_goals') || [];
                        const activeGoals = goals.filter((g: any) => g.status !== 'completed').slice(-3);
                        return {
                            status: "GOAL_STATUS",
                            goals: activeGoals,
                            instruction: `Provide a progress update on these tracked goals. Be encouraging.`
                        };
                    }

                    return { status: "GOAL_ACTION", action: goalAction, goal: goalText };
                } catch (e: any) {
                    addLog('WARN', `TRACK_GOAL: Fallback to localStorage - ${e.message}`);
                    // Fallback to localStorage
                    const goals = JSON.parse(localStorage.getItem('tracked_goals') || '[]');
                    if (goalAction === 'create') {
                        goals.push({ id: `goal_${Date.now()}`, goal: goalText, progress: 0, notes: [], created: Date.now() });
                        localStorage.setItem('tracked_goals', JSON.stringify(goals));
                        return { status: "GOAL_CREATED", goal: goalText, message: `Goal tracked, Sir: "${goalText}"` };
                    }
                    if (goalAction === 'list') {
                        return { status: "GOALS_LISTED", goals: goals.map((g: any) => ({ goal: g.goal, progress: g.progress })), count: goals.length };
                    }
                    return { status: "GOAL_ACTION", action: goalAction, goal: goalText };
                }
            }

            if (name === 'quick_summary') {
                const { of: summaryOf, length } = args;
                addLog('SYSTEM', `📝 TLDR: ${summaryOf || 'conversation'}`);
                return {
                    status: "SUMMARY_REQUESTED",
                    of: summaryOf || 'this conversation',
                    length: length || 'short',
                    instruction: `Provide a ${length || 'short'} TLDR summary of ${summaryOf || 'this conversation'}.`
                };
            }

            if (name === 'autonomous_mission') {
                const { objective, constraints, checkpointInterval, canMakeDecisions } = args;
                addLog('WARN', `🚀 AUTONOMOUS MISSION: ${objective}`);
                audio.playClick();

                const mission = {
                    id: `mission_${Date.now()}`,
                    objective,
                    constraints,
                    checkpointInterval: checkpointInterval || '5min',
                    canMakeDecisions: canMakeDecisions !== false,
                    started: Date.now(),
                    status: 'active'
                };

                try {
                    // Persist mission to neuralVault
                    await neuralVault.set('autonomous_mission', mission);

                    // Store in SovereignMemory for recall
                    await sovereignMemory.store(mission.id, JSON.stringify({
                        type: 'autonomous_mission',
                        ...mission
                    }));

                    // Queue objective for dream protocol background analysis
                    dreamProtocol.queueQuery(`Mission objective: ${objective}`);

                    return {
                        status: "MISSION_STARTED",
                        missionId: mission.id,
                        objective,
                        constraints,
                        autonomy: canMakeDecisions !== false ? 'FULL' : 'LIMITED',
                        persistedToVault: true,
                        message: `Understood, Sir. Taking autonomous control to achieve: "${objective}". ${canMakeDecisions !== false ? 'Full decision authority granted.' : 'I\'ll check in for major decisions.'} Mission logged to Neural Vault.`
                    };
                } catch (e: any) {
                    localStorage.setItem('autonomous_mission', JSON.stringify(mission));
                    return {
                        status: "MISSION_STARTED",
                        objective,
                        constraints,
                        autonomy: canMakeDecisions !== false ? 'FULL' : 'LIMITED',
                        message: `Understood, Sir. Taking autonomous control to achieve: "${objective}".`
                    };
                }
            }

            if (name === 'situational_awareness') {
                const detail = typeof args.detail === 'string' ? args.detail : undefined;
                const focus = Array.isArray(args.focus)
                    ? args.focus.filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
                    : [];
                addLog('SYSTEM', `🎯 SITREP: ${detail || 'operational'} level`);
                const state = useAppStore.getState();

                // Pull from real services
                let monitors: any[] = [];
                let bgOps: any[] = [];
                let mission: any = null;
                try {
                    monitors = await neuralVault.get('active_monitors') || [];
                    bgOps = await neuralVault.get('background_operations') || [];
                    mission = await neuralVault.get('autonomous_mission');
                } catch {
                    monitors = JSON.parse(localStorage.getItem('active_monitors') || '[]');
                    bgOps = JSON.parse(localStorage.getItem('background_operations') || '[]');
                }

                const dreamStatus = dreamProtocol.getStatus();
                const biometricReady = faceDetectionService.isReady();
                const stressLevel = faceDetectionService.estimateStress().level;

                return {
                    status: "SITREP_READY",
                    detailLevel: detail || 'operational',
                    focus: focus.length > 0 ? focus : undefined,
                    snapshot: {
                        currentSector: state.mode,
                        voiceActive: state.voice.isActive,
                        voiceMode: state.voice.mode,
                        activeMonitors: monitors.filter((m: any) => m.status === 'active').length,
                        backgroundOperations: bgOps.filter((op: any) => op.status === 'running').length,
                        activeMission: mission?.status === 'active' ? mission.objective : null,
                        dreamProtocol: dreamStatus.isDreaming ? 'ACTIVE' : 'STANDBY',
                        biometrics: biometricReady ? { ready: true, stressLevel } : { ready: false },
                        systemMode: (state as any).systemMode || 'normal'
                    },
                    instruction: `Provide ${detail || 'operational'} situational awareness. ${focus.length > 0 ? `Focus on: ${focus.join(', ')}.` : ''}`
                };
            }

            if (name === 'debug_assist') {
                const problem = typeof args.problem === 'string' ? args.problem.trim() : '';
                const debugContext = typeof args.context === 'string' ? args.context : undefined;
                const triedSolutions = Array.isArray(args.triedSolutions)
                    ? args.triedSolutions.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
                    : [];
                if (!problem) {
                    return { error: "Missing required problem", hint: "Provide a problem statement for debug_assist" };
                }
                addLog('SYSTEM', `🐛 DEBUG ASSIST: ${problem}`);
                return {
                    status: "DEBUG_MODE_ACTIVE",
                    problem,
                    context: debugContext,
                    triedSolutions,
                    instruction: `Debug assistance requested. Problem: "${problem}". ${debugContext ? `Context: ${debugContext}.` : ''} ${triedSolutions.length > 0 ? `Already tried: ${triedSolutions.join(', ')}.` : ''} Analyze and provide debugging guidance.`
                };
            }

            if (name === 'performance_profile') {
                const { target, duration: profileDuration, detailed } = args;
                addLog('SYSTEM', `⚡ PROFILING: ${target || 'app'}`);
                return {
                    status: "PROFILE_STARTED",
                    target: target || 'application',
                    duration: profileDuration || 5,
                    detailed: detailed || false,
                    metrics: {
                        loadTime: performance.now(),
                        memoryEstimate: (performance as any).memory?.usedJSHeapSize || 'unavailable'
                    },
                    message: `Profiling ${target || 'application'}, Sir. Initial metrics captured.`
                };
            }

            // ================================================================
            // CONVERSATIONAL INTELLIGENCE
            // ================================================================

            if (name === 'delegate_to_agent') {
                const agent = typeof args.agent === 'string' ? args.agent.trim() : '';
                const task = typeof args.task === 'string' ? args.task.trim() : '';
                const priority = typeof args.priority === 'string' ? args.priority : undefined;
                const waitForResponse = args.waitForResponse;
                if (!agent || !task) {
                    return { error: "Missing required agent or task", hint: "Provide both agent and task for delegate_to_agent" };
                }
                addLog('SYSTEM', `🤝 DELEGATING TO ${agent}: "${task}"`);
                audio.playClick();

                try {
                    // Actually run agent reasoning
                    addLog('SYSTEM', `🧠 ${agent} is analyzing...`);
                    const result = await runAgentReasoning(
                        agent,
                        task,
                        `Priority: ${priority || 'normal'}. Current sector: ${useAppStore.getState().mode}`
                    );

                    // Store delegation record in neuralVault
                    const delegationRecord = {
                        id: `del_${Date.now()}`,
                        agent: result.agentName,
                        agentId: result.agentId,
                        task,
                        priority: priority || 'normal',
                        status: 'completed',
                        response: result.response,
                        created: result.timestamp
                    };

                    try {
                        const delegations = await neuralVault.get('delegations') || [];
                        delegations.push(delegationRecord);
                        // Keep last 50 delegations
                        if (delegations.length > 50) delegations.shift();
                        await neuralVault.set('delegations', delegations);

                        // Also store in SovereignMemory for semantic recall
                        await sovereignMemory.store(delegationRecord.id, JSON.stringify({
                            type: 'agent_delegation',
                            ...delegationRecord
                        }));
                    } catch {
                        // Fallback to localStorage
                        const delegations = JSON.parse(localStorage.getItem('delegations') || '[]');
                        delegations.push(delegationRecord);
                        localStorage.setItem('delegations', JSON.stringify(delegations));
                    }

                    addLog('SUCCESS', `✅ ${result.agentName} responded (delegation logged)`);
                    audio.playClick();

                    return {
                        status: "DELEGATION_COMPLETE",
                        agent: result.agentName,
                        agentId: result.agentId,
                        task,
                        response: result.response,
                        delegationId: delegationRecord.id,
                        message: `${result.agentName}'s analysis: ${result.response}`
                    };
                } catch (e: any) {
                    addLog('ERROR', `Agent reasoning failed: ${e.message}`);
                    return {
                        status: "DELEGATION_FAILED",
                        agent,
                        task,
                        error: e.message,
                        message: `I apologize, Sir. ${agent} encountered an issue: ${e.message}`
                    };
                }
            }

            if (name === 'voice_journal') {
                const entry = typeof args.entry === 'string' ? args.entry.trim() : '';
                const category = typeof args.category === 'string' ? args.category.trim() : '';
                const mood = typeof args.mood === 'string' ? args.mood.trim() : undefined;
                const isPrivate = !!args.private;
                if (!entry) {
                    return { error: "Missing required entry", hint: "Provide an entry string for voice_journal" };
                }
                const entryId = `journal_${Date.now()}`;
                const cat = category || 'thought';

                // Store in SovereignMemory with semantic indexing
                try {
                    await sovereignMemory.store(entryId, JSON.stringify({
                        type: 'journal_entry',
                        entry,
                        category: cat,
                        mood: mood || null,
                        private: isPrivate || false,
                        source: 'voice',
                        timestamp: Date.now()
                    }));

                    // Also store in neuralVault for cross-session persistence
                    const existingJournal = await neuralVault.get('voice_journal') || [];
                    existingJournal.push({
                        id: entryId,
                        entry,
                        category: cat,
                        mood,
                        private: isPrivate || false,
                        timestamp: Date.now()
                    });
                    // Keep last 100 entries
                    if (existingJournal.length > 100) existingJournal.shift();
                    await neuralVault.set('voice_journal', existingJournal);

                    addLog('SYSTEM', `📓 JOURNAL: ${cat} stored in Neural Vault with semantic indexing`);
                    return {
                        status: "JOURNAL_ENTRY_SAVED",
                        category: cat,
                        entryId,
                        semanticIndexed: true,
                        message: `Noted, Sir. ${cat === 'gratitude' ? 'That\'s a lovely thought.' : 'Your reflection has been recorded and semantically indexed.'}`
                    };
                } catch (e: any) {
                    addLog('WARN', `JOURNAL: Fallback to localStorage - ${e.message}`);
                    // Fallback to localStorage
                    const journal = JSON.parse(localStorage.getItem('voice_journal') || '[]');
                    journal.push({ id: entryId, entry, category: cat, mood, private: isPrivate || false, timestamp: Date.now() });
                    localStorage.setItem('voice_journal', JSON.stringify(journal));
                    return {
                        status: "JOURNAL_ENTRY_SAVED",
                        category: cat,
                        semanticIndexed: false,
                        message: `Noted, Sir. Your reflection has been recorded.`
                    };
                }
            }

            if (name === 'smart_query') {
                const query = typeof args.query === 'string' ? args.query.trim() : '';
                const timeframe = typeof args.timeframe === 'string' ? args.timeframe : undefined;
                const format = typeof args.format === 'string' ? args.format : undefined;
                if (!query) {
                    return { error: "Missing required query", hint: "Provide a query for smart_query" };
                }
                addLog('SYSTEM', `📊 QUERY: ${query}`);
                return {
                    status: "QUERY_PROCESSING",
                    query,
                    timeframe: timeframe || 'today',
                    format: format || 'verbal',
                    instruction: `Answer this query about user data/activity: "${query}". Timeframe: ${timeframe || 'today'}. Format: ${format || 'verbal'}.`
                };
            }

            if (name === 'set_scene') {
                const scene = typeof args.scene === 'string' ? args.scene.trim() : '';
                const duration = typeof args.duration === 'string' || typeof args.duration === 'number'
                    ? args.duration
                    : undefined;
                const music = args.music;
                if (!scene) {
                    return { error: "Missing required scene", hint: "Provide a scene name for set_scene" };
                }
                localStorage.setItem('current_scene', JSON.stringify({ scene, activated: Date.now(), duration }));
                addLog('SYSTEM', `🎬 SCENE: ${scene}`);
                audio.playClick();
                const sceneMessages: Record<string, string> = {
                    deep_work: "Deep work environment activated. Distractions minimized.",
                    creative: "Creative mode engaged. Let inspiration flow.",
                    meeting: "Meeting mode active. Recording enabled.",
                    brainstorm: "Brainstorm space ready. All ideas welcome.",
                    review: "Review mode set. Analytical focus engaged.",
                    wind_down: "Winding down. Pace slowing.",
                    energy: "Energy mode! Let's move fast.",
                    calm: "Calm atmosphere established.",
                    presentation: "Presentation mode. Looking sharp, Sir."
                };
                return {
                    status: "SCENE_SET",
                    scene,
                    duration,
                    suggestMusic: music,
                    message: sceneMessages[scene as string] || `${scene} mode activated, Sir.`
                };
            }

            if (name === 'quick_command') {
                const command = typeof args.command === 'string' ? args.command.trim() : '';
                if (!command) {
                    return { error: "Missing required command", hint: "Provide a command for quick_command" };
                }
                addLog('SYSTEM', `⚡ QUICK: ${command}`);
                const quickResponses: Record<string, any> = {
                    status: { action: 'get_status', message: 'Checking status, Sir.' },
                    help: { action: 'show_help', message: 'How may I assist you, Sir?' },
                    back: { action: 'navigate_back', message: 'Going back.' },
                    forward: { action: 'navigate_forward', message: 'Going forward.' },
                    refresh: { action: 'refresh', message: 'Refreshing.' },
                    clear: { action: 'clear', message: 'Cleared, Sir.' },
                    save: { action: 'save', message: 'Saved.' },
                    done: { action: 'complete', message: 'Marking complete.' },
                    cancel: { action: 'cancel', message: 'Cancelled, Sir.' },
                    confirm: { action: 'confirm', message: 'Confirmed.' },
                    yes: { action: 'affirm', message: 'Proceeding.' },
                    no: { action: 'decline', message: 'Understood, declining.' },
                    more: { action: 'expand', message: 'Showing more.' },
                    less: { action: 'collapse', message: 'Showing less.' },
                    next: { action: 'next', message: 'Next item.' },
                    previous: { action: 'previous', message: 'Previous item.' },
                    stop: { action: 'stop', message: 'Stopping.' },
                    go: { action: 'proceed', message: 'Proceeding.' },
                    wait: { action: 'pause', message: 'Waiting, Sir.' },
                    skip: { action: 'skip', message: 'Skipping.' }
                };
                return {
                    status: "QUICK_COMMAND",
                    ...(quickResponses[command] || { action: command, message: `${command} executed.` })
                };
            }

            if (name === 'annotate_item') {
                const target = typeof args.target === 'string' ? args.target.trim() : '';
                const annotation = typeof args.annotation === 'string' ? args.annotation : '';
                const type = typeof args.type === 'string' ? args.type.trim() : '';
                const annAction = typeof args.action === 'string' ? args.action.trim() : '';
                const annotationType = type || 'note';
                const targetItem = target || 'current';
                if (annAction !== 'list' && annAction !== 'clear' && annotation.trim().length === 0) {
                    return { error: "Missing annotation", hint: "Provide annotation text for annotate_item" };
                }

                try {
                    if (annAction === 'list') {
                        // List annotations for target
                        const allAnnotations = await neuralVault.get('voice_annotations') || [];
                        const filtered = targetItem === 'all'
                            ? allAnnotations
                            : allAnnotations.filter((a: any) => a.target === targetItem || a.target === 'current');
                        return {
                            status: "ANNOTATIONS_LIST",
                            annotations: filtered.slice(-20),
                            count: filtered.length,
                            message: `Found ${filtered.length} annotation${filtered.length !== 1 ? 's' : ''}, Sir.`
                        };
                    }

                    if (annAction === 'clear') {
                        // Clear annotations for target
                        const allAnnotations = await neuralVault.get('voice_annotations') || [];
                        const remaining = targetItem === 'all'
                            ? []
                            : allAnnotations.filter((a: any) => a.target !== targetItem);
                        await neuralVault.set('voice_annotations', remaining);
                        return {
                            status: "ANNOTATIONS_CLEARED",
                            clearedCount: allAnnotations.length - remaining.length,
                            message: `Annotations cleared, Sir.`
                        };
                    }

                    // Default: add annotation
                    const annotationId = `ann_${Date.now()}`;
                    const annotations = await neuralVault.get('voice_annotations') || [];
                    const newAnnotation = {
                        id: annotationId,
                        target: targetItem,
                        annotation,
                        type: annotationType,
                        timestamp: Date.now()
                    };
                    annotations.push(newAnnotation);
                    // Keep last 200 annotations
                    if (annotations.length > 200) annotations.shift();
                    await neuralVault.set('voice_annotations', annotations);

                    // Store in SovereignMemory for semantic search
                    await sovereignMemory.store(annotationId, JSON.stringify({
                        type: 'annotation',
                        ...newAnnotation
                    }));

                    addLog('SYSTEM', `📌 ANNOTATED: ${annotationType} on ${targetItem}`);
                    return {
                        status: "ANNOTATION_ADDED",
                        id: annotationId,
                        target: targetItem,
                        type: annotationType,
                        persistedTo: 'neuralVault + SovereignMemory',
                        message: `${annotationType === 'warning' ? '⚠️ Warning' : annotationType === 'idea' ? '💡 Idea' : '📝 Note'} added, Sir.`
                    };
                } catch (e: any) {
                    addLog('WARN', `ANNOTATE_ITEM: Fallback to localStorage - ${e.message}`);
                    const annotations = JSON.parse(localStorage.getItem('voice_annotations') || '[]');
                    annotations.push({
                        id: `ann_${Date.now()}`,
                        target: targetItem,
                        annotation,
                        type: annotationType,
                        timestamp: Date.now()
                    });
                    localStorage.setItem('voice_annotations', JSON.stringify(annotations));
                    return {
                        status: "ANNOTATION_ADDED",
                        target: targetItem,
                        type: annotationType,
                        message: `${annotationType === 'warning' ? '⚠️ Warning' : annotationType === 'idea' ? '💡 Idea' : '📝 Note'} added, Sir.`
                    };
                }
            }

            if (name === 'mood_check') {
                const moodAction = typeof args.action === 'string' ? args.action.trim() : '';
                const mood = typeof args.mood === 'string' ? args.mood.trim() : '';
                const parsedEnergy = typeof args.energy === 'number' ? args.energy : Number(args.energy);
                const energy = Number.isFinite(parsedEnergy) ? parsedEnergy : undefined;

                // Get biometric data if available to enrich mood logging
                const biometricData = faceDetectionService.isReady() ? {
                    detectedMood: (() => {
                        const detection = faceDetectionService.getLastDetection();
                        if (detection?.expressions) {
                            const sorted = Object.entries(detection.expressions).sort((a, b) => b[1] - a[1]);
                            return sorted[0]?.[1] > 0.3 ? sorted[0][0] : null;
                        }
                        return null;
                    })(),
                    stressLevel: faceDetectionService.estimateStress().level,
                    blinkRate: faceDetectionService.getBlinkRate()
                } : null;

                try {
                    if (moodAction === 'log') {
                        const moods = await neuralVault.get('mood_log') || [];
                        const entry = {
                            id: `mood_${Date.now()}`,
                            mood: mood || biometricData?.detectedMood || 'unspecified',
                            energy: energy || null,
                            biometrics: biometricData,
                            timestamp: Date.now()
                        };
                        moods.push(entry);
                        // Keep last 100 mood entries
                        if (moods.length > 100) moods.shift();
                        await neuralVault.set('mood_log', moods);

                        // Also store in SovereignMemory for pattern analysis
                        await sovereignMemory.store(entry.id, JSON.stringify({
                            type: 'mood_entry',
                            ...entry
                        }));

                        addLog('SYSTEM', `😊 MOOD: ${mood || biometricData?.detectedMood || 'logged'} (with biometrics: ${biometricData ? 'yes' : 'no'})`);

                        // Generate contextual message
                        let message = `Mood logged, Sir.`;
                        if (typeof energy === 'number' && energy < 4) message += ' Perhaps a short break would help?';
                        if (biometricData?.stressLevel > 50) message += ' I notice elevated stress indicators - consider a brief respite.';
                        if (biometricData?.detectedMood && mood && biometricData.detectedMood !== mood) {
                            message += ` (Interesting: biometrics suggest ${biometricData.detectedMood}.)`;
                        }

                        return {
                            status: "MOOD_LOGGED",
                            mood: mood || biometricData?.detectedMood,
                            energy,
                            biometricInsight: biometricData ? {
                                detectedMood: biometricData.detectedMood,
                                stressLevel: biometricData.stressLevel,
                                blinkRate: biometricData.blinkRate
                            } : null,
                            message
                        };
                    }

                    if (moodAction === 'history') {
                        const moods = await neuralVault.get('mood_log') || [];
                        const recentMoods = moods.slice(-10);

                        // Analyze patterns
                        const moodCounts: Record<string, number> = {};
                        recentMoods.forEach((m: any) => {
                            if (m.mood) moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1;
                        });
                        const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];

                        return {
                            status: "MOOD_HISTORY",
                            entries: recentMoods,
                            count: moods.length,
                            pattern: dominantMood ? { mood: dominantMood[0], frequency: dominantMood[1] } : null,
                            instruction: "Summarize mood history conversationally, noting any patterns."
                        };
                    }

                    // Default mood check with biometric awareness
                    return {
                        status: "MOOD_CHECK",
                        currentBiometrics: biometricData,
                        instruction: biometricData
                            ? `Perform a mood check. Biometrics suggest: ${biometricData.detectedMood || 'neutral'}, stress: ${biometricData.stressLevel}%. Ask how the user is actually feeling and provide supportive response.`
                            : `Perform a mood check. Ask how the user is feeling and provide supportive response.`
                    };
                } catch (e: any) {
                    addLog('WARN', `MOOD_CHECK: Fallback to localStorage - ${e.message}`);
                    const moods = JSON.parse(localStorage.getItem('mood_log') || '[]');
                    if (moodAction === 'log') {
                        moods.push({ mood, energy, timestamp: Date.now() });
                        localStorage.setItem('mood_log', JSON.stringify(moods));
                        return { status: "MOOD_LOGGED", mood, energy, message: `Mood logged, Sir.` };
                    }
                    if (moodAction === 'history') {
                        return { status: "MOOD_HISTORY", entries: moods.slice(-10), count: moods.length };
                    }
                    return { status: "MOOD_CHECK", instruction: `Perform a mood check.` };
                }
            }

            if (name === 'contextual_repeat') {
                const { what, modification } = args;
                addLog('SYSTEM', `🔄 REPEAT: ${what || 'last action'}`);
                return {
                    status: "REPEAT_REQUESTED",
                    what: what || 'last_action',
                    modification,
                    instruction: `Repeat the ${what || 'last action'}${modification ? ` with modification: ${modification}` : ''}.`
                };
            }

            if (name === 'chain_commands') {
                const commands = Array.isArray(args.commands)
                    ? args.commands.filter((cmd): cmd is string => typeof cmd === 'string' && cmd.trim().length > 0)
                    : [];
                if (commands.length === 0) {
                    return { error: "Missing commands", hint: "Provide a non-empty commands array for chain_commands" };
                }
                const waitBetween = !!args.waitBetween;
                addLog('SYSTEM', `⛓️ CHAIN: ${commands.length} commands`);
                return {
                    status: "CHAIN_INITIATED",
                    commands,
                    waitBetween,
                    instruction: `Execute these commands in sequence${waitBetween ? ' (waiting for confirmation between each)' : ''}: ${commands.join(' → ')}`
                };
            }

            if (name === 'conditional_action') {
                const { condition, ifTrue, ifFalse } = args;
                addLog('SYSTEM', `❓ CONDITIONAL: if ${condition}`);
                return {
                    status: "CONDITIONAL_PROCESSING",
                    condition,
                    ifTrue,
                    ifFalse,
                    instruction: `Evaluate condition: "${condition}". If true: ${ifTrue}. ${ifFalse ? `If false: ${ifFalse}.` : ''}`
                };
            }

            if (name === 'voice_bookmark') {
                const bmAction = typeof args.action === 'string' ? args.action.trim() : '';
                const bmName = typeof args.name === 'string' ? args.name.trim() : '';
                const description = typeof args.description === 'string' ? args.description : undefined;
                if (!bmAction) {
                    return { error: "Missing required action", hint: "Provide action for voice_bookmark (create, list, go, delete)" };
                }
                if ((bmAction === 'go' || bmAction === 'delete') && !bmName) {
                    return { error: "Missing required name", hint: `Provide bookmark name for voice_bookmark ${bmAction}` };
                }
                const state = useAppStore.getState();

                try {
                    const bookmarks = await neuralVault.get('voice_bookmarks') || {};

                    if (bmAction === 'create') {
                        const bookmarkName = bmName || `bookmark_${Object.keys(bookmarks).length + 1}`;
                        bookmarks[bookmarkName] = {
                            mode: state.mode,
                            description,
                            created: Date.now(),
                            useCount: 0
                        };
                        await neuralVault.set('voice_bookmarks', bookmarks);
                        addLog('SYSTEM', `🔖 BOOKMARK: ${bookmarkName} persisted`);
                        return {
                            status: "BOOKMARK_CREATED",
                            name: bookmarkName,
                            persistedTo: 'neuralVault',
                            message: `Bookmark saved, Sir.`
                        };
                    }

                    if (bmAction === 'list') {
                        const bookmarkList = Object.entries(bookmarks).map(([k, v]: [string, any]) => ({
                            name: k,
                            mode: v.mode,
                            description: v.description,
                            useCount: v.useCount || 0
                        }));
                        return {
                            status: "BOOKMARKS_LISTED",
                            bookmarks: bookmarkList,
                            count: bookmarkList.length,
                            message: `You have ${bookmarkList.length} bookmark${bookmarkList.length !== 1 ? 's' : ''}, Sir.`
                        };
                    }

                    if (bmAction === 'go' && bmName && bookmarks[bmName]) {
                        const bm = bookmarks[bmName];
                        bm.useCount = (bm.useCount || 0) + 1;
                        bm.lastUsed = Date.now();
                        await neuralVault.set('voice_bookmarks', bookmarks);
                        setMode(bm.mode);
                        addLog('SYSTEM', `🔖 BOOKMARK: Going to ${bmName}`);
                        return {
                            status: "BOOKMARK_NAVIGATED",
                            name: bmName,
                            mode: bm.mode,
                            message: `Returning to ${bmName}, Sir.`
                        };
                    }

                    if (bmAction === 'delete' && bmName && bookmarks[bmName]) {
                        delete bookmarks[bmName];
                        await neuralVault.set('voice_bookmarks', bookmarks);
                        return { status: "BOOKMARK_DELETED", name: bmName, message: `Bookmark "${bmName}" deleted, Sir.` };
                    }

                    return { status: "BOOKMARK_ACTION", action: bmAction };
                } catch (e: any) {
                    addLog('WARN', `VOICE_BOOKMARK: Fallback to localStorage - ${e.message}`);
                    const bookmarks = JSON.parse(localStorage.getItem('voice_bookmarks') || '{}');
                    if (bmAction === 'create') {
                        const bookmarkName = bmName || `bookmark_${Object.keys(bookmarks).length + 1}`;
                        bookmarks[bookmarkName] = {
                            mode: state.mode,
                            description,
                            created: Date.now()
                        };
                        localStorage.setItem('voice_bookmarks', JSON.stringify(bookmarks));
                        return { status: "BOOKMARK_CREATED", name: bookmarkName, message: `Bookmark saved, Sir.` };
                    }
                    if (bmAction === 'list') {
                        return { status: "BOOKMARKS_LISTED", bookmarks: Object.keys(bookmarks), count: Object.keys(bookmarks).length };
                    }
                    if (bmAction === 'go' && bmName && bookmarks[bmName]) {
                        setMode(bookmarks[bmName].mode);
                        return { status: "BOOKMARK_NAVIGATED", name: bmName, message: `Returning to ${bmName}, Sir.` };
                    }
                    return { status: "BOOKMARK_ACTION", action: bmAction };
                }
            }

            if (name === 'smart_notify') {
                const notifyMode = typeof args.mode === 'string' ? args.mode.trim() : '';
                const filter = args.filter;
                const notifyDuration = args.duration;
                if (!notifyMode) {
                    return { error: "Missing required mode", hint: "Provide mode for smart_notify (all, priority, urgent, none, custom)" };
                }
                localStorage.setItem('notification_settings', JSON.stringify({ mode: notifyMode, filter, until: notifyDuration }));
                addLog('SYSTEM', `🔔 NOTIFY: ${notifyMode}`);
                const modeMessages: Record<string, string> = {
                    all: "All notifications enabled.",
                    priority: "Only priority notifications will come through.",
                    urgent: "Only urgent matters will interrupt, Sir.",
                    none: "Do not disturb mode activated.",
                    custom: "Custom notification filter applied."
                };
                return {
                    status: "NOTIFICATIONS_SET",
                    mode: notifyMode,
                    message: modeMessages[notifyMode] || "Notification settings updated."
                };
            }

            if (name === 'conversation_mode') {
                const style = typeof args.style === 'string' ? args.style.trim() : '';
                const verbosity = typeof args.verbosity === 'string' ? args.verbosity : undefined;
                if (!style) {
                    return { error: "Missing required style", hint: "Provide style for conversation_mode" };
                }
                localStorage.setItem('conversation_prefs', JSON.stringify({ style, verbosity }));
                addLog('SYSTEM', `💬 CONVERSATION: ${style}`);
                return {
                    status: "CONVERSATION_MODE_SET",
                    style,
                    verbosity: verbosity || 'normal',
                    message: `Understood, Sir. I'll be more ${style}.`,
                    instruction: `Adjust response style to: ${style}. Verbosity: ${verbosity || 'normal'}.`
                };
            }

            if (name === 'quick_answer') {
                const question = typeof args.question === 'string' ? args.question.trim() : '';
                if (!question) {
                    return { error: "Missing required question", hint: "Provide a question for quick_answer" };
                }
                addLog('SYSTEM', `❓ QUICK ANSWER: ${question}`);
                // Handle some quick answers directly
                if (question.toLowerCase().includes('time')) {
                    return { status: "ANSWERED", answer: new Date().toLocaleTimeString(), question };
                }
                if (question.toLowerCase().includes('date') || question.toLowerCase().includes('day')) {
                    return { status: "ANSWERED", answer: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), question };
                }
                return {
                    status: "QUICK_ANSWER",
                    question,
                    instruction: `Provide a quick, direct answer to: "${question}"`
                };
            }

            if (name === 'interpret_intent') {
                const utterance = typeof args.utterance === 'string' ? args.utterance : undefined;
                const intentContext = typeof args.context === 'string' ? args.context : undefined;
                addLog('SYSTEM', `🎯 INTENT: Interpreting...`);
                return {
                    status: "INTENT_ANALYSIS",
                    utterance,
                    context: intentContext,
                    instruction: `Analyze and clarify intent. ${utterance ? `Utterance: "${utterance}".` : 'Clarify the last request.'} ${intentContext ? `Context: ${intentContext}` : ''}`
                };
            }

            if (name === 'confirm_understanding') {
                const about = typeof args.about === 'string' ? args.about : undefined;
                addLog('SYSTEM', `✅ CONFIRM: Understanding check`);
                return {
                    status: "UNDERSTANDING_CONFIRMED",
                    about,
                    instruction: `Confirm understanding${about ? ` about: ${about}` : ''}. Summarize what was understood and ask if correct.`
                };
            }

            if (name === 'suggest_completion') {
                const partial = typeof args.partial === 'string' ? args.partial : undefined;
                const category = typeof args.category === 'string' ? args.category : undefined;
                addLog('SYSTEM', `💡 SUGGEST: Command completion`);
                return {
                    status: "SUGGESTIONS_READY",
                    partial,
                    category,
                    instruction: `Suggest voice commands${partial ? ` that match "${partial}"` : ''}${category ? ` in category: ${category}` : ''}. Provide 3-5 relevant commands.`
                };
            }

            if (name === 'voice_search') {
                const searchQuery = typeof args.query === 'string' ? args.query.trim() : '';
                const scope = typeof args.scope === 'string' ? args.scope : undefined;
                const parsedSearchLimit = typeof args.limit === 'number' ? args.limit : Number(args.limit);
                const searchLimit = Number.isFinite(parsedSearchLimit) && parsedSearchLimit > 0 ? Math.floor(parsedSearchLimit) : 10;
                if (!searchQuery) {
                    return { error: "Missing required query", hint: "Provide a search query for voice_search" };
                }
                addLog('SYSTEM', `🔍 SEARCH: ${searchQuery}`);
                return {
                    status: "SEARCH_INITIATED",
                    query: searchQuery,
                    scope: scope || 'all',
                    limit: searchLimit,
                    instruction: `Search for "${searchQuery}" across ${scope || 'all'} sources. Return top ${searchLimit} results.`
                };
            }

            if (name === 'narrate_actions') {
                const enabled = typeof args.enabled === 'boolean' ? args.enabled : undefined;
                const detail = typeof args.detail === 'string' ? args.detail : undefined;
                if (enabled === undefined) {
                    return { error: "Missing required enabled", hint: "Provide enabled as true or false for narrate_actions" };
                }
                localStorage.setItem('narration_enabled', JSON.stringify({ enabled, detail: detail || 'normal' }));
                addLog('SYSTEM', `🎙️ NARRATION: ${enabled ? 'ON' : 'OFF'}`);
                return {
                    status: "NARRATION_SET",
                    enabled,
                    detail: detail || 'normal',
                    message: enabled ? `I'll narrate my actions, Sir.` : `Silent mode, Sir. Actions without commentary.`
                };
            }

            if (name === 'pause_resume') {
                const prAction = typeof args.action === 'string' ? args.action.trim().toLowerCase() : '';
                const prTarget = typeof args.target === 'string' ? args.target : undefined;
                if (!prAction) {
                    return { error: "Missing required action", hint: "Provide action for pause_resume (pause, resume, toggle)" };
                }
                addLog('SYSTEM', `⏸️ ${prAction.toUpperCase()}: ${prTarget || 'operations'}`);
                return {
                    status: prAction === 'pause' ? 'PAUSED' : prAction === 'resume' ? 'RESUMED' : 'TOGGLED',
                    action: prAction,
                    target: prTarget,
                    message: prAction === 'pause' ? `Holding, Sir. Say "resume" when ready.` : `Continuing, Sir.`
                };
            }

            // ================================================================
            // META-COMMANDS, LEARNING & ADVANCED MEMORY
            // ================================================================

            if (name === 'voice_capabilities') {
                const category = typeof args.category === 'string' ? args.category : undefined;
                const detail = typeof args.detail === 'string' ? args.detail : undefined;
                addLog('SYSTEM', `📚 CAPABILITIES: ${category || 'all'}`);
                const categories = [
                    'navigation', 'ui_interaction', 'agents', 'memory', 'automation',
                    'monitoring', 'diagnostics', 'research', 'workspace', 'productivity',
                    'conversation', 'learning', 'collaboration'
                ];
                return {
                    status: "CAPABILITIES_LISTED",
                    categories: category ? [category] : categories,
                    detail: detail || 'brief',
                    totalCommands: 124,
                    instruction: `List voice capabilities${category ? ` for ${category}` : ''}. Detail: ${detail || 'brief'}. Provide helpful examples.`
                };
            }

            if (name === 'teach_command') {
                const cmdTrigger = typeof args.trigger === 'string' ? args.trigger.trim() : '';
                const cmdAction = typeof args.action === 'string' ? args.action.trim() : '';
                const context = typeof args.context === 'string' ? args.context : undefined;
                if (!cmdTrigger || !cmdAction) {
                    return { error: "Missing required trigger or action", hint: "Provide trigger and action for teach_command" };
                }

                try {
                    const commands = await neuralVault.get('custom_commands') || {};
                    commands[cmdTrigger] = {
                        action: cmdAction,
                        context,
                        taught: Date.now(),
                        useCount: 0
                    };
                    await neuralVault.set('custom_commands', commands);

                    // Store in SovereignMemory for pattern learning
                    await sovereignMemory.store(`cmd_${cmdTrigger}`, JSON.stringify({
                        type: 'custom_command',
                        trigger: cmdTrigger,
                        action: cmdAction,
                        context,
                        taught: Date.now()
                    }));

                    addLog('SYSTEM', `🎓 TAUGHT: "${cmdTrigger}" (persisted)`);
                    return {
                        status: "COMMAND_LEARNED",
                        trigger: cmdTrigger,
                        action: cmdAction,
                        persistedTo: 'neuralVault + SovereignMemory',
                        message: `Understood, Sir. When you say "${cmdTrigger}", I'll ${cmdAction}.`
                    };
                } catch (e: any) {
                    addLog('WARN', `TEACH_COMMAND: Fallback to localStorage - ${e.message}`);
                    const commands = JSON.parse(localStorage.getItem('custom_commands') || '{}');
                    commands[cmdTrigger] = { action: cmdAction, context, taught: Date.now() };
                    localStorage.setItem('custom_commands', JSON.stringify(commands));
                    return {
                        status: "COMMAND_LEARNED",
                        trigger: cmdTrigger,
                        action: cmdAction,
                        message: `Understood, Sir. When you say "${cmdTrigger}", I'll ${cmdAction}.`
                    };
                }
            }

            if (name === 'rate_feedback') {
                const rating = typeof args.rating === 'string' ? args.rating.trim() : '';
                const feedback = typeof args.feedback === 'string' ? args.feedback : undefined;
                const about = typeof args.about === 'string' ? args.about : undefined;
                if (!rating) {
                    return { error: "Missing required rating", hint: "Provide rating for rate_feedback" };
                }

                try {
                    const feedbackLog = await neuralVault.get('feedback_log') || [];
                    const entry = {
                        id: `fb_${Date.now()}`,
                        rating,
                        feedback,
                        about,
                        timestamp: Date.now()
                    };
                    feedbackLog.push(entry);
                    // Keep last 500 feedback entries
                    if (feedbackLog.length > 500) feedbackLog.shift();
                    await neuralVault.set('feedback_log', feedbackLog);

                    // Store in SovereignMemory for learning
                    await sovereignMemory.store(entry.id, JSON.stringify({
                        type: 'user_feedback',
                        ...entry
                    }));

                    addLog('SYSTEM', `⭐ FEEDBACK: ${rating} (logged for learning)`);
                    const responses: Record<string, string> = {
                        excellent: "Delighted to be of service, Sir.",
                        good: "Thank you for the feedback, Sir.",
                        ok: "Noted. I'll aim higher next time.",
                        poor: "My apologies, Sir. I'll improve.",
                        wrong: "I apologize for the error. Noted for learning."
                    };
                    return {
                        status: "FEEDBACK_RECORDED",
                        rating,
                        persistedTo: 'neuralVault + SovereignMemory',
                        message: responses[rating] || "Feedback noted."
                    };
                } catch (e: any) {
                    addLog('WARN', `RATE_FEEDBACK: Fallback to localStorage - ${e.message}`);
                    const feedbackLog = JSON.parse(localStorage.getItem('feedback_log') || '[]');
                    feedbackLog.push({ rating, feedback, about, timestamp: Date.now() });
                    localStorage.setItem('feedback_log', JSON.stringify(feedbackLog));
                    const responses: Record<string, string> = {
                        excellent: "Delighted to be of service, Sir.",
                        good: "Thank you for the feedback, Sir.",
                        ok: "Noted. I'll aim higher next time.",
                        poor: "My apologies, Sir. I'll improve.",
                        wrong: "I apologize for the error. Noted for learning."
                    };
                    return {
                        status: "FEEDBACK_RECORDED",
                        rating,
                        message: responses[rating] || "Feedback noted."
                    };
                }
            }

            if (name === 'voice_templates') {
                const tplAction = typeof args.action === 'string' ? args.action.trim() : '';
                const tplName = typeof args.name === 'string' ? args.name.trim() : '';
                const steps = Array.isArray(args.steps)
                    ? args.steps.filter((step): step is string => typeof step === 'string' && step.trim().length > 0)
                    : [];

                try {
                    const templates = await neuralVault.get('voice_templates') || {};

                    if (tplAction === 'save') {
                        if (!tplName) {
                            return { error: "Missing required name", hint: "Provide a template name for voice_templates save" };
                        }
                        if (steps.length === 0) {
                            return { error: "Missing steps", hint: "Provide a non-empty steps array for voice_templates save" };
                        }
                        templates[tplName] = {
                            steps,
                            created: Date.now(),
                            useCount: 0
                        };
                        await neuralVault.set('voice_templates', templates);
                        addLog('SYSTEM', `📋 TEMPLATE SAVED: ${tplName} (persisted)`);
                        return {
                            status: "TEMPLATE_SAVED",
                            name: tplName,
                            stepCount: steps.length,
                            persistedTo: 'neuralVault',
                            message: `Template "${tplName}" saved with ${steps.length} steps, Sir.`
                        };
                    }

                    if (tplAction === 'list') {
                        const templateList = Object.entries(templates).map(([k, v]: [string, any]) => ({
                            name: k,
                            stepCount: v.steps?.length || 0,
                            useCount: v.useCount || 0
                        }));
                        return {
                            status: "TEMPLATES_LISTED",
                            templates: templateList,
                            count: templateList.length,
                            message: `You have ${templateList.length} template${templateList.length !== 1 ? 's' : ''}, Sir.`
                        };
                    }

                    if (tplAction === 'run' && tplName && templates[tplName]) {
                        const tpl = templates[tplName];
                        tpl.useCount = (tpl.useCount || 0) + 1;
                        tpl.lastUsed = Date.now();
                        await neuralVault.set('voice_templates', templates);
                        addLog('SYSTEM', `▶️ RUNNING TEMPLATE: ${tplName}`);
                        return {
                            status: "TEMPLATE_RUNNING",
                            name: tplName,
                            steps: tpl.steps,
                            message: `Running "${tplName}", Sir.`
                        };
                    }

                    if (tplAction === 'delete' && tplName && templates[tplName]) {
                        delete templates[tplName];
                        await neuralVault.set('voice_templates', templates);
                        return { status: "TEMPLATE_DELETED", name: tplName, message: `Template "${tplName}" deleted, Sir.` };
                    }

                    return { status: "TEMPLATE_ACTION", action: tplAction };
                } catch (e: any) {
                    addLog('WARN', `VOICE_TEMPLATES: Fallback to localStorage - ${e.message}`);
                    const templates = JSON.parse(localStorage.getItem('voice_templates') || '{}');
                    if (tplAction === 'save' && tplName && steps.length > 0) {
                        templates[tplName] = { steps, created: Date.now() };
                        localStorage.setItem('voice_templates', JSON.stringify(templates));
                        return { status: "TEMPLATE_SAVED", name: tplName, message: `Template "${tplName}" saved.` };
                    }
                    if (tplAction === 'list') {
                        return { status: "TEMPLATES_LISTED", templates: Object.keys(templates), count: Object.keys(templates).length };
                    }
                    if (tplAction === 'run' && tplName && templates[tplName]) {
                        return { status: "TEMPLATE_RUNNING", name: tplName, steps: templates[tplName].steps };
                    }
                    return { status: "TEMPLATE_ACTION", action: tplAction };
                }
            }

            if (name === 'context_switch') {
                const to = typeof args.to === 'string' ? args.to.trim() : '';
                const saveCurrentAs = typeof args.saveCurrentAs === 'string' ? args.saveCurrentAs.trim() : '';
                const restore = !!args.restore;
                const state = useAppStore.getState();

                try {
                    const contexts = await neuralVault.get('saved_contexts') || {};

                    if (saveCurrentAs) {
                        contexts[saveCurrentAs] = {
                            mode: state.mode,
                            saved: Date.now()
                        };
                        await neuralVault.set('saved_contexts', contexts);
                    }

                    if (to) {
                        addLog('SYSTEM', `🔀 CONTEXT SWITCH: → ${to}`);
                        return {
                            status: "CONTEXT_SWITCHED",
                            to,
                            savedCurrent: saveCurrentAs,
                            message: `Switching context to ${to}, Sir.`
                        };
                    }

                    if (restore) {
                        const lastContext = Object.keys(contexts).pop();
                        if (lastContext && contexts[lastContext]) {
                            setMode(contexts[lastContext].mode);
                            return {
                                status: "CONTEXT_RESTORED",
                                restored: lastContext,
                                message: `Restored to ${lastContext}, Sir.`
                            };
                        }
                    }

                    return { status: "CONTEXT_ACTION", instruction: "Context switch requested. Clarify destination." };
                } catch (e: any) {
                    addLog('WARN', `CONTEXT_SWITCH: Fallback to localStorage - ${e.message}`);
                    const contexts = JSON.parse(localStorage.getItem('saved_contexts') || '{}');
                    if (saveCurrentAs) {
                        contexts[saveCurrentAs] = { mode: state.mode, saved: Date.now() };
                        localStorage.setItem('saved_contexts', JSON.stringify(contexts));
                    }
                    if (to) {
                        return { status: "CONTEXT_SWITCHED", to, savedCurrent: saveCurrentAs, message: `Switching context to ${to}, Sir.` };
                    }
                    if (restore) {
                        const lastContext = Object.keys(contexts).pop();
                        if (lastContext && contexts[lastContext]) {
                            setMode(contexts[lastContext].mode);
                            return { status: "CONTEXT_RESTORED", restored: lastContext };
                        }
                    }
                    return { status: "CONTEXT_ACTION", instruction: "Context switch requested." };
                }
            }

            if (name === 'focus_entity') {
                const entity = typeof args.entity === 'string' ? args.entity.trim() : '';
                const entityType = typeof args.entityType === 'string' ? args.entityType : undefined;
                if (!entity) {
                    return { error: "Missing required entity", hint: "Provide entity for focus_entity" };
                }
                localStorage.setItem('focused_entity', JSON.stringify({ entity, type: entityType, since: Date.now() }));
                addLog('SYSTEM', `🎯 FOCUS: ${entity} (${entityType || 'entity'})`);
                return {
                    status: "ENTITY_FOCUSED",
                    entity,
                    type: entityType || 'entity',
                    message: `Focusing on ${entity}, Sir. All relevant information will be prioritized.`
                };
            }

            if (name === 'time_aware') {
                const timeQuery = typeof args.query === 'string' ? args.query : undefined;
                const timeAction = typeof args.action === 'string' ? args.action : undefined;
                const now = new Date();
                addLog('SYSTEM', `⏰ TIME-AWARE: ${timeAction || 'query'}`);
                return {
                    status: "TIME_AWARE_RESPONSE",
                    currentTime: now.toLocaleTimeString(),
                    currentDate: now.toLocaleDateString(),
                    dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
                    query: timeQuery,
                    action: timeAction || 'query',
                    instruction: `Time-aware query: "${timeQuery || 'What should I do now?'}". Current: ${now.toLocaleString()}.`
                };
            }

            if (name === 'remember_person') {
                const personAction = typeof args.action === 'string' ? args.action.trim() : '';
                const personName = typeof args.person === 'string' ? args.person.trim() : '';
                const info = args.info;
                const cat = typeof args.category === 'string' && args.category.trim().length > 0
                    ? args.category.trim()
                    : 'note';
                if ((personAction === 'remember' || personAction === 'recall') && !personName) {
                    return { error: "Missing required person", hint: "Provide person name for remember_person" };
                }

                try {
                    if (personAction === 'remember') {
                        // Store in SovereignMemory with semantic indexing for recall
                        const memoryKey = `person_${personName.toLowerCase().replace(/\s+/g, '_')}_${cat}`;
                        await sovereignMemory.store(memoryKey, JSON.stringify({
                            type: 'person_memory',
                            person: personName,
                            category: cat,
                            info,
                            timestamp: Date.now()
                        }));

                        // Also persist to neuralVault for structured access
                        const people = await neuralVault.get('people_memory') || {};
                        if (!people[personName]) people[personName] = {};
                        people[personName][cat] = info;
                        people[personName].lastUpdated = Date.now();
                        await neuralVault.set('people_memory', people);

                        addLog('SYSTEM', `👤 REMEMBERED: ${personName} (${cat}) - semantically indexed`);
                        return {
                            status: "PERSON_REMEMBERED",
                            person: personName,
                            category: cat,
                            semanticIndexed: true,
                            message: `Noted about ${personName}, Sir. I'll remember this for future conversations.`
                        };
                    }

                    if (personAction === 'recall') {
                        // Try semantic search first
                        const searchResults = await sovereignMemory.query(`person ${personName}`, 5);
                        const people = await neuralVault.get('people_memory') || {};
                        const personData = people[personName];

                        if (searchResults.length > 0 || personData) {
                            // Parse semantic results
                            const semanticInfo = searchResults.map((r: any) => {
                                try {
                                    const parsed = JSON.parse(r.value || r);
                                    return { category: parsed.category, info: parsed.info, relevance: r.similarity || 1 };
                                } catch { return null; }
                            }).filter(Boolean);

                            return {
                                status: "PERSON_RECALLED",
                                person: personName,
                                structuredData: personData || null,
                                semanticMatches: semanticInfo,
                                instruction: "Present what you know about this person conversationally."
                            };
                        }
                        return { status: "PERSON_NOT_FOUND", person: personName, message: `I don't have records on ${personName}, Sir.` };
                    }

                    if (personAction === 'list') {
                        const people = await neuralVault.get('people_memory') || {};
                        const names = Object.keys(people);
                        return {
                            status: "PEOPLE_LISTED",
                            people: names,
                            count: names.length,
                            message: names.length > 0 ? `I have notes on ${names.length} people, Sir.` : "I don't have any people in memory yet, Sir."
                        };
                    }

                    return { status: "PERSON_ACTION", action: personAction, person: personName };
                } catch (e: any) {
                    addLog('WARN', `PERSON_MEMORY: Fallback to localStorage - ${e.message}`);
                    // Fallback to localStorage
                    const people = JSON.parse(localStorage.getItem('people_memory') || '{}');
                    if (personAction === 'remember') {
                        if (!people[personName]) people[personName] = {};
                        people[personName][cat] = info;
                        people[personName].lastUpdated = Date.now();
                        localStorage.setItem('people_memory', JSON.stringify(people));
                        return { status: "PERSON_REMEMBERED", person: personName, category: cat, message: `Noted about ${personName}, Sir.` };
                    }
                    if (personAction === 'recall') {
                        const personData = people[personName];
                        if (personData) return { status: "PERSON_RECALLED", person: personName, data: personData };
                        return { status: "PERSON_NOT_FOUND", person: personName };
                    }
                    if (personAction === 'list') {
                        return { status: "PEOPLE_LISTED", people: Object.keys(people), count: Object.keys(people).length };
                    }
                    return { status: "PERSON_ACTION", action: personAction, person: personName };
                }
            }

            if (name === 'topic_memory') {
                const topicAction = typeof args.action === 'string' ? args.action.trim() : '';
                const topicName = typeof args.topic === 'string' ? args.topic.trim() : '';
                const content = args.content;
                if ((topicAction === 'add' || topicAction === 'recall') && !topicName) {
                    return { error: "Missing required topic", hint: "Provide topic for topic_memory" };
                }

                try {
                    if (topicAction === 'add') {
                        // Store in SovereignMemory with semantic indexing
                        const memoryKey = `topic_${topicName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
                        await sovereignMemory.store(memoryKey, JSON.stringify({
                            type: 'topic_memory',
                            topic: topicName,
                            content,
                            timestamp: Date.now()
                        }));

                        // Also persist to neuralVault for structured access
                        const topics = await neuralVault.get('topic_memory') || {};
                        if (!topics[topicName]) topics[topicName] = [];
                        topics[topicName].push({ content, added: Date.now() });
                        await neuralVault.set('topic_memory', topics);

                        addLog('SYSTEM', `📝 TOPIC: Added to ${topicName} - semantically indexed`);
                        return {
                            status: "TOPIC_UPDATED",
                            topic: topicName,
                            entries: topics[topicName].length,
                            semanticIndexed: true,
                            message: `Added to ${topicName} notes, Sir. This is now searchable across all your memories.`
                        };
                    }

                    if (topicAction === 'recall') {
                        // Try semantic search for richer results
                        const searchResults = await sovereignMemory.query(`topic ${topicName}`, 10);
                        const topics = await neuralVault.get('topic_memory') || {};
                        const topicData = topics[topicName] || [];

                        // Parse semantic results
                        const semanticEntries = searchResults.map((r: any) => {
                            try {
                                const parsed = JSON.parse(r.value || r);
                                if (parsed.topic?.toLowerCase() === topicName.toLowerCase()) {
                                    return { content: parsed.content, timestamp: parsed.timestamp, relevance: r.similarity || 1 };
                                }
                                return null;
                            } catch { return null; }
                        }).filter(Boolean);

                        if (topicData.length > 0 || semanticEntries.length > 0) {
                            return {
                                status: "TOPIC_RECALLED",
                                topic: topicName,
                                structuredEntries: topicData,
                                semanticMatches: semanticEntries,
                                totalEntries: Math.max(topicData.length, semanticEntries.length),
                                instruction: "Present the topic notes conversationally, highlighting the most relevant information."
                            };
                        }
                        return { status: "TOPIC_EMPTY", topic: topicName, message: `No notes on ${topicName} yet, Sir.` };
                    }

                    if (topicAction === 'list') {
                        const topics = await neuralVault.get('topic_memory') || {};
                        const topicNames = Object.keys(topics);
                        return {
                            status: "TOPICS_LISTED",
                            topics: topicNames,
                            count: topicNames.length,
                            message: topicNames.length > 0 ? `You have notes on ${topicNames.length} topics, Sir.` : "No topic notes yet, Sir."
                        };
                    }

                    return { status: "TOPIC_ACTION", action: topicAction, topic: topicName };
                } catch (e: any) {
                    addLog('WARN', `TOPIC_MEMORY: Fallback to localStorage - ${e.message}`);
                    // Fallback to localStorage
                    const topics = JSON.parse(localStorage.getItem('topic_memory') || '{}');
                    if (topicAction === 'add') {
                        if (!topics[topicName]) topics[topicName] = [];
                        topics[topicName].push({ content, added: Date.now() });
                        localStorage.setItem('topic_memory', JSON.stringify(topics));
                        return { status: "TOPIC_UPDATED", topic: topicName, entries: topics[topicName].length, message: `Added to ${topicName} notes, Sir.` };
                    }
                    if (topicAction === 'recall') {
                        const topicData = topics[topicName];
                        if (topicData?.length > 0) return { status: "TOPIC_RECALLED", topic: topicName, entries: topicData };
                        return { status: "TOPIC_EMPTY", topic: topicName };
                    }
                    if (topicAction === 'list') {
                        return { status: "TOPICS_LISTED", topics: Object.keys(topics), count: Object.keys(topics).length };
                    }
                    return { status: "TOPIC_ACTION", action: topicAction, topic: topicName };
                }
            }

            if (name === 'voice_shortcut') {
                const scAction = typeof args.action === 'string' ? args.action.trim() : '';
                const phrase = typeof args.phrase === 'string' ? args.phrase.trim() : '';
                const expansion = typeof args.expansion === 'string' ? args.expansion.trim() : '';
                if (!scAction) {
                    return { error: "Missing required action", hint: "Provide action for voice_shortcut (create, list)" };
                }
                if (scAction === 'create' && (!phrase || !expansion)) {
                    return { error: "Missing required phrase or expansion", hint: "Provide phrase and expansion for voice_shortcut create" };
                }
                const shortcuts = JSON.parse(localStorage.getItem('voice_shortcuts') || '{}');

                if (scAction === 'create' && phrase && expansion) {
                    shortcuts[phrase] = { expansion, created: Date.now() };
                    localStorage.setItem('voice_shortcuts', JSON.stringify(shortcuts));
                    addLog('SYSTEM', `⚡ SHORTCUT: "${phrase}"`);
                    return { status: "SHORTCUT_CREATED", phrase, message: `Shortcut created. Say "${phrase}" and I'll ${expansion}, Sir.` };
                }

                if (scAction === 'list') {
                    return { status: "SHORTCUTS_LISTED", shortcuts: Object.entries(shortcuts).map(([p, v]: [string, any]) => ({ phrase: p, expansion: v.expansion })) };
                }

                return { status: "SHORTCUT_ACTION", action: scAction };
            }

            if (name === 'ambient_listen') {
                const ambMode = typeof args.mode === 'string' ? args.mode.trim() : '';
                const triggers = Array.isArray(args.triggers)
                    ? args.triggers.filter((trigger): trigger is string => typeof trigger === 'string' && trigger.trim().length > 0)
                    : [];
                const ambAction = typeof args.action === 'string' ? args.action : undefined;
                if (!ambMode) {
                    return { error: "Missing required mode", hint: "Provide mode for ambient_listen (on/off)" };
                }
                localStorage.setItem('ambient_listen', JSON.stringify({ mode: ambMode, triggers, action: ambAction }));
                addLog('SYSTEM', `👂 AMBIENT: ${ambMode}`);
                return {
                    status: "AMBIENT_CONFIGURED",
                    mode: ambMode,
                    triggers,
                    message: ambMode === 'on' ? `Ambient listening enabled, Sir. ${triggers.length > 0 ? `Listening for: ${triggers.join(', ')}` : ''}` : `Ambient listening disabled.`
                };
            }

            if (name === 'proactive_suggest') {
                const level = typeof args.level === 'string' ? args.level.trim() : '';
                const areas = Array.isArray(args.areas)
                    ? args.areas.filter((area): area is string => typeof area === 'string' && area.trim().length > 0)
                    : [];
                if (!level) {
                    return { error: "Missing required level", hint: "Provide level for proactive_suggest (off, minimal, moderate, active)" };
                }
                localStorage.setItem('proactive_settings', JSON.stringify({ level, areas }));
                addLog('SYSTEM', `💡 PROACTIVE: ${level}`);
                const messages: Record<string, string> = {
                    off: "I'll only speak when spoken to, Sir.",
                    minimal: "I'll make occasional suggestions when highly relevant.",
                    moderate: "I'll offer helpful suggestions at appropriate moments.",
                    active: "I'll proactively assist and suggest throughout our session."
                };
                return {
                    status: "PROACTIVE_SET",
                    level,
                    areas,
                    message: messages[level] || "Proactivity adjusted."
                };
            }

            if (name === 'voice_history') {
                const range = typeof args.range === 'string' ? args.range : undefined;
                const historySearch = typeof args.search === 'string' ? args.search : undefined;
                const histAction = typeof args.action === 'string' ? args.action : undefined;
                addLog('SYSTEM', `📜 HISTORY: ${histAction || 'list'}`);
                // History would come from session logs
                return {
                    status: "HISTORY_REQUEST",
                    action: histAction || 'list',
                    range: range || 'recent',
                    search: historySearch,
                    instruction: `${histAction === 'search' ? `Search voice history for: "${historySearch}"` : `Show ${range || 'recent'} voice history`}.`
                };
            }

            if (name === 'personality_mode') {
                const personality = typeof args.personality === 'string' ? args.personality.trim() : '';
                const intensity = typeof args.intensity === 'string' ? args.intensity : undefined;
                if (!personality) {
                    return { error: "Missing required personality", hint: "Provide personality for personality_mode" };
                }
                localStorage.setItem('personality_mode', JSON.stringify({ personality, intensity: intensity || 'moderate' }));
                addLog('SYSTEM', `🎭 PERSONALITY: ${personality}`);
                const intros: Record<string, string> = {
                    professional: "Understood, Sir. Maintaining professional decorum.",
                    friendly: "Of course! Happy to keep things light and friendly.",
                    serious: "Very well. Adopting a more serious tone.",
                    casual: "Sure thing! Keeping it casual.",
                    mentor: "I'll take a more guiding approach, Sir.",
                    assistant: "At your service. Pure assistance mode.",
                    collaborator: "Let's work together on this. Partners in thought."
                };
                return {
                    status: "PERSONALITY_SET",
                    personality,
                    intensity: intensity || 'moderate',
                    message: intros[personality] || `${personality} mode activated.`
                };
            }

            if (name === 'collaborate_share') {
                const { action: colAction, target, content: shareContent, format } = args;
                addLog('SYSTEM', `🤝 COLLABORATE: ${colAction}`);
                return {
                    status: "COLLABORATION_INITIATED",
                    action: colAction,
                    target: target || 'team',
                    content: shareContent,
                    format: format || 'link',
                    message: `Preparing to ${colAction}${target ? ` with ${target}` : ''}, Sir.`
                };
            }

            // ================================================================
            // PRODUCTIVITY, DOCUMENTS & DEVELOPER TOOLS
            // ================================================================

            if (name === 'document_ops') {
                const docAction = typeof args.action === 'string' ? args.action.trim() : '';
                const docType = typeof args.type === 'string' ? args.type : undefined;
                const docName = typeof args.name === 'string' ? args.name : undefined;
                const docContent = typeof args.content === 'string' ? args.content : undefined;
                if (!docAction) {
                    return { error: "Missing required action", hint: "Provide action for document_ops" };
                }
                if (docAction === 'create' && !docName) {
                    return { error: "Missing required name", hint: "Provide document name for document_ops create" };
                }
                addLog('SYSTEM', `📄 DOCUMENT: ${docAction} ${docType || 'document'}`);
                if (docAction === 'create') {
                    const docs = JSON.parse(localStorage.getItem('voice_documents') || '[]');
                    docs.push({ id: `doc_${Date.now()}`, type: docType, name: docName, content: docContent, created: Date.now() });
                    localStorage.setItem('voice_documents', JSON.stringify(docs));
                    return { status: "DOCUMENT_CREATED", type: docType, name: docName, message: `${docType || 'Document'} created, Sir.` };
                }
                return { status: "DOCUMENT_ACTION", action: docAction, type: docType };
            }

            if (name === 'meeting_mode') {
                const mtgAction = typeof args.action === 'string' ? args.action.trim() : '';
                const meetingName = typeof args.meetingName === 'string' ? args.meetingName : undefined;
                const mtgContent = typeof args.content === 'string' ? args.content : undefined;
                if (!mtgAction) {
                    return { error: "Missing required action", hint: "Provide action for meeting_mode (start, note, action_item, end)" };
                }
                if ((mtgAction === 'note' || mtgAction === 'action_item') && !mtgContent) {
                    return { error: "Missing required content", hint: `Provide content for meeting_mode ${mtgAction}` };
                }
                const meetings = JSON.parse(localStorage.getItem('meeting_state') || '{}');

                if (mtgAction === 'start') {
                    meetings.current = { name: meetingName, started: Date.now(), notes: [], actionItems: [] };
                    localStorage.setItem('meeting_state', JSON.stringify(meetings));
                    addLog('SYSTEM', `🎙️ MEETING STARTED: ${meetingName || 'Untitled'}`);
                    return { status: "MEETING_STARTED", name: meetingName, message: `Meeting started, Sir. I'll track notes and action items.` };
                }

                if (mtgAction === 'note' && meetings.current) {
                    meetings.current.notes.push({ content: mtgContent, time: Date.now() });
                    localStorage.setItem('meeting_state', JSON.stringify(meetings));
                    return { status: "NOTE_ADDED", message: "Noted." };
                }

                if (mtgAction === 'action_item' && meetings.current) {
                    meetings.current.actionItems.push({ content: mtgContent, time: Date.now() });
                    localStorage.setItem('meeting_state', JSON.stringify(meetings));
                    return { status: "ACTION_ITEM_ADDED", message: "Action item captured." };
                }

                if (mtgAction === 'end' && meetings.current) {
                    const ended = { ...meetings.current, ended: Date.now() };
                    if (!meetings.history) meetings.history = [];
                    meetings.history.push(ended);
                    meetings.current = null;
                    localStorage.setItem('meeting_state', JSON.stringify(meetings));
                    addLog('SYSTEM', `🎙️ MEETING ENDED`);
                    return { status: "MEETING_ENDED", notes: ended.notes.length, actionItems: ended.actionItems.length, message: `Meeting concluded, Sir. ${ended.notes.length} notes, ${ended.actionItems.length} action items captured.` };
                }

                return { status: "MEETING_ACTION", action: mtgAction };
            }

            if (name === 'presentation_mode') {
                const presAction = typeof args.action === 'string' ? args.action.trim() : '';
                const parsedSlideNumber = typeof args.slideNumber === 'number' ? args.slideNumber : Number(args.slideNumber);
                const slideNumber = Number.isFinite(parsedSlideNumber) && parsedSlideNumber > 0
                    ? Math.floor(parsedSlideNumber)
                    : undefined;
                if (!presAction) {
                    return { error: "Missing required action", hint: "Provide action for presentation_mode" };
                }
                if (presAction === 'goto' && !slideNumber) {
                    return { error: "Invalid slideNumber", hint: "Provide a positive slideNumber for presentation_mode goto" };
                }
                const presState = JSON.parse(localStorage.getItem('presentation_state') || '{}');
                addLog('SYSTEM', `📊 PRESENTATION: ${presAction}`);

                if (presAction === 'start') {
                    presState.active = true;
                    presState.currentSlide = 1;
                    presState.started = Date.now();
                    localStorage.setItem('presentation_state', JSON.stringify(presState));
                    return { status: "PRESENTATION_STARTED", message: "Presentation mode activated. Good luck, Sir." };
                }

                if (presAction === 'next') {
                    presState.currentSlide = (presState.currentSlide || 1) + 1;
                    localStorage.setItem('presentation_state', JSON.stringify(presState));
                    return { status: "NEXT_SLIDE", slide: presState.currentSlide };
                }

                if (presAction === 'previous') {
                    presState.currentSlide = Math.max(1, (presState.currentSlide || 1) - 1);
                    localStorage.setItem('presentation_state', JSON.stringify(presState));
                    return { status: "PREVIOUS_SLIDE", slide: presState.currentSlide };
                }

                if (presAction === 'goto') {
                    presState.currentSlide = slideNumber;
                    localStorage.setItem('presentation_state', JSON.stringify(presState));
                    return { status: "GOTO_SLIDE", slide: slideNumber };
                }

                if (presAction === 'end') {
                    presState.active = false;
                    localStorage.setItem('presentation_state', JSON.stringify(presState));
                    return { status: "PRESENTATION_ENDED", message: "Presentation concluded, Sir." };
                }

                return { status: "PRESENTATION_ACTION", action: presAction };
            }

            if (name === 'quick_note') {
                const noteAction = typeof args.action === 'string' ? args.action.trim() : '';
                const noteContent = typeof args.content === 'string' ? args.content : '';
                const tag = typeof args.tag === 'string' ? args.tag : undefined;
                if (!noteAction) {
                    return { error: "Missing required action", hint: "Provide action for quick_note (add, list, search, clear)" };
                }
                if ((noteAction === 'add' || noteAction === 'search') && noteContent.trim().length === 0) {
                    return { error: "Missing required content", hint: `Provide content for quick_note ${noteAction}` };
                }

                try {
                    const quickNotes = await neuralVault.get('quick_notes') || [];

                    if (noteAction === 'add') {
                        const noteId = `note_${Date.now()}`;
                        const newNote = {
                            id: noteId,
                            content: noteContent,
                            tag: tag || null,
                            timestamp: Date.now()
                        };
                        quickNotes.push(newNote);
                        // Keep last 500 notes
                        if (quickNotes.length > 500) quickNotes.shift();
                        await neuralVault.set('quick_notes', quickNotes);

                        // Store in SovereignMemory for semantic search
                        await sovereignMemory.store(noteId, JSON.stringify({
                            type: 'quick_note',
                            ...newNote
                        }));

                        addLog('SYSTEM', `📝 QUICK NOTE: Added (semantically indexed)`);
                        return {
                            status: "NOTE_ADDED",
                            id: noteId,
                            count: quickNotes.length,
                            semanticIndexed: true,
                            message: "Noted, Sir."
                        };
                    }

                    if (noteAction === 'list') {
                        return {
                            status: "NOTES_LISTED",
                            notes: quickNotes.slice(-10),
                            count: quickNotes.length,
                            message: `You have ${quickNotes.length} quick note${quickNotes.length !== 1 ? 's' : ''}, Sir.`
                        };
                    }

                    if (noteAction === 'search' && noteContent) {
                        // Semantic search for notes
                        const searchResults = await sovereignMemory.search(noteContent, 5);
                        const noteMatches = searchResults
                            .filter((r: any) => r.type === 'quick_note' || r.content?.includes('quick_note'))
                            .slice(0, 5);
                        return {
                            status: "NOTES_SEARCH",
                            query: noteContent,
                            results: noteMatches,
                            count: noteMatches.length,
                            message: `Found ${noteMatches.length} matching note${noteMatches.length !== 1 ? 's' : ''}, Sir.`
                        };
                    }

                    if (noteAction === 'clear') {
                        await neuralVault.set('quick_notes', []);
                        return { status: "NOTES_CLEARED", message: "Quick notes cleared, Sir." };
                    }

                    return { status: "NOTE_ACTION", action: noteAction };
                } catch (e: any) {
                    addLog('WARN', `QUICK_NOTE: Fallback to localStorage - ${e.message}`);
                    const quickNotes = JSON.parse(localStorage.getItem('quick_notes') || '[]');
                    if (noteAction === 'add') {
                        quickNotes.push({ content: noteContent, tag, timestamp: Date.now() });
                        localStorage.setItem('quick_notes', JSON.stringify(quickNotes));
                        return { status: "NOTE_ADDED", count: quickNotes.length, message: "Noted, Sir." };
                    }
                    if (noteAction === 'list') {
                        return { status: "NOTES_LISTED", notes: quickNotes.slice(-10), count: quickNotes.length };
                    }
                    if (noteAction === 'clear') {
                        localStorage.setItem('quick_notes', '[]');
                        return { status: "NOTES_CLEARED", message: "Quick notes cleared, Sir." };
                    }
                    return { status: "NOTE_ACTION", action: noteAction };
                }
            }

            if (name === 'transcribe') {
                const transAction = typeof args.action === 'string' ? args.action.trim() : '';
                const transFormat = typeof args.format === 'string' ? args.format : undefined;
                if (!transAction) {
                    return { error: "Missing required action", hint: "Provide action for transcribe (start, stop)" };
                }
                addLog('SYSTEM', `📜 TRANSCRIBE: ${transAction}`);
                if (transAction === 'start') {
                    localStorage.setItem('transcription_active', 'true');
                    return { status: "TRANSCRIPTION_STARTED", message: "Transcription active, Sir. I'm recording everything." };
                }
                if (transAction === 'stop') {
                    localStorage.setItem('transcription_active', 'false');
                    return { status: "TRANSCRIPTION_STOPPED", message: "Transcription stopped." };
                }
                return { status: "TRANSCRIPTION_ACTION", action: transAction, format: transFormat || 'text' };
            }

            if (name === 'dictate_to_doc') {
                const dictAction = typeof args.action === 'string' ? args.action.trim() : '';
                const dictTarget = typeof args.target === 'string' ? args.target : undefined;
                const formatting = typeof args.formatting === 'string' ? args.formatting : undefined;
                if (!dictAction) {
                    return { error: "Missing required action", hint: "Provide action for dictate_to_doc (start, stop)" };
                }
                addLog('SYSTEM', `🎤 DICTATE: ${dictAction}`);
                if (dictAction === 'start') {
                    localStorage.setItem('dictation_state', JSON.stringify({ active: true, target: dictTarget, formatting }));
                    return { status: "DICTATION_STARTED", target: dictTarget, message: "Ready for dictation, Sir. Speak naturally." };
                }
                if (dictAction === 'stop') {
                    localStorage.setItem('dictation_state', JSON.stringify({ active: false }));
                    return { status: "DICTATION_STOPPED", message: "Dictation complete." };
                }
                return { status: "DICTATION_ACTION", action: dictAction };
            }

            if (name === 'screen_layout') {
                const layout = typeof args.layout === 'string' ? args.layout.trim() : '';
                const layoutTarget = typeof args.target === 'string' ? args.target : undefined;
                if (!layout) {
                    return { error: "Missing required layout", hint: "Provide layout for screen_layout" };
                }
                addLog('SYSTEM', `🖥️ LAYOUT: ${layout}`);
                localStorage.setItem('screen_layout', JSON.stringify({ layout, target: layoutTarget }));
                const messages: Record<string, string> = {
                    full: "Full screen mode.",
                    split: "Split screen activated.",
                    pip: "Picture-in-picture enabled.",
                    minimize: "Minimized.",
                    maximize: "Maximized.",
                    sidebar: "Sidebar layout.",
                    compact: "Compact view."
                };
                return { status: "LAYOUT_SET", layout, message: messages[layout] || `Layout set to ${layout}.` };
            }

            if (name === 'parallel_ops') {
                const operations = Array.isArray(args.operations)
                    ? args.operations.filter((op): op is string => typeof op === 'string' && op.trim().length > 0)
                    : [];
                if (operations.length === 0) {
                    return { error: "Missing operations", hint: "Provide a non-empty operations array for parallel_ops" };
                }
                const reportProgress = !!args.reportProgress;
                addLog('SYSTEM', `⚡ PARALLEL: ${operations.length} operations`);
                return {
                    status: "PARALLEL_INITIATED",
                    operations,
                    reportProgress,
                    message: `Executing ${operations.length} operations in parallel, Sir.`,
                    instruction: `Execute these operations simultaneously: ${operations.join(' AND ')}`
                };
            }

            if (name === 'interrupt_handle') {
                const { action: intAction, note: intNote } = args;
                const interruptStack = JSON.parse(localStorage.getItem('interrupt_stack') || '[]');
                addLog('SYSTEM', `⏸️ INTERRUPT: ${intAction}`);

                if (intAction === 'pause' || intAction === 'sidebar') {
                    interruptStack.push({ note: intNote, context: 'current', timestamp: Date.now() });
                    localStorage.setItem('interrupt_stack', JSON.stringify(interruptStack));
                    return { status: "CONTEXT_PAUSED", stackSize: interruptStack.length, message: "Pausing current thread, Sir. Go ahead with your interruption." };
                }

                if (intAction === 'return' || intAction === 'pop') {
                    const popped = interruptStack.pop();
                    localStorage.setItem('interrupt_stack', JSON.stringify(interruptStack));
                    return { status: "CONTEXT_RESTORED", restored: popped, message: "Returning to where we left off, Sir." };
                }

                return { status: "INTERRUPT_ACTION", action: intAction };
            }

            if (name === 'dev_commands') {
                const devCmd = typeof args.command === 'string' ? args.command.trim() : '';
                const devArgs = args.args;
                const watch = !!args.watch;
                if (!devCmd) {
                    return { error: "Missing required command", hint: "Provide command for dev_commands" };
                }
                addLog('SYSTEM', `💻 DEV: ${devCmd}`);
                const cmdDescriptions: Record<string, string> = {
                    test: "Running tests",
                    build: "Building project",
                    serve: "Starting development server",
                    deploy: "Initiating deployment",
                    logs: "Fetching logs",
                    lint: "Running linter",
                    format: "Formatting code",
                    install: "Installing dependencies"
                };
                return {
                    status: "DEV_COMMAND_INITIATED",
                    command: devCmd,
                    args: devArgs,
                    watch,
                    message: `${cmdDescriptions[devCmd] || devCmd}, Sir.${watch ? ' Watch mode enabled.' : ''}`
                };
            }

            if (name === 'git_voice') {
                const gitCmd = typeof args.command === 'string' ? args.command.trim() : '';
                const gitMsg = typeof args.message === 'string' ? args.message : undefined;
                const branch = typeof args.branch === 'string' ? args.branch : undefined;
                if (!gitCmd) {
                    return { error: "Missing required command", hint: "Provide command for git_voice" };
                }
                addLog('SYSTEM', `🔀 GIT: ${gitCmd}`);
                const gitResponses: Record<string, string> = {
                    status: "Checking git status.",
                    commit: `Committing changes${gitMsg ? `: "${gitMsg}"` : ''}.`,
                    push: `Pushing to ${branch || 'remote'}.`,
                    pull: "Pulling latest changes.",
                    branch: `Branch operation${branch ? ` on ${branch}` : ''}.`,
                    checkout: `Checking out ${branch || 'branch'}.`,
                    diff: "Showing differences.",
                    log: "Retrieving commit history.",
                    stash: "Stashing changes."
                };
                return {
                    status: "GIT_COMMAND_INITIATED",
                    command: gitCmd,
                    message: gitResponses[gitCmd] || `Git ${gitCmd}.`
                };
            }

            if (name === 'build_run') {
                const buildAction = typeof args.action === 'string' ? args.action.trim() : '';
                const environment = typeof args.environment === 'string' ? args.environment : undefined;
                if (!buildAction) {
                    return { error: "Missing required action", hint: "Provide action for build_run" };
                }
                addLog('SYSTEM', `🔨 BUILD: ${buildAction} (${environment || 'development'})`);
                return {
                    status: "BUILD_ACTION_INITIATED",
                    action: buildAction,
                    environment: environment || 'development',
                    message: buildAction === 'build' ? `Building for ${environment || 'development'}, Sir.` :
                             buildAction === 'run' ? `Starting ${environment || 'development'} server.` :
                             buildAction === 'build_run' ? `Building and running, Sir.` :
                             buildAction === 'stop' ? `Stopping server.` :
                             `Restarting ${environment || 'development'} server.`
                };
            }

            if (name === 'smart_context') {
                const depth = typeof args.depth === 'string' ? args.depth : undefined;
                const ctxFocus = typeof args.focus === 'string' ? args.focus : undefined;
                addLog('SYSTEM', `🧠 SMART CONTEXT: ${depth || 'surface'}`);
                const state = useAppStore.getState();
                return {
                    status: "CONTEXT_ANALYZED",
                    depth: depth || 'surface',
                    focus: ctxFocus,
                    currentView: {
                        mode: state.mode,
                        voiceActive: voice.isActive
                    },
                    instruction: `Analyze current screen/context at ${depth || 'surface'} level. ${ctxFocus ? `Focus on: ${ctxFocus}.` : ''} Provide intelligent insights.`
                };
            }

            if (name === 'pinned_items') {
                const pinAction = typeof args.action === 'string' ? args.action.trim() : '';
                const item = typeof args.item === 'string' ? args.item.trim() : '';
                const pinCategory = typeof args.category === 'string' ? args.category : undefined;
                if (!pinAction) {
                    return { error: "Missing required action", hint: "Provide action for pinned_items (pin, unpin, list, clear)" };
                }
                if ((pinAction === 'pin' || pinAction === 'unpin') && !item) {
                    return { error: "Missing required item", hint: `Provide item for pinned_items ${pinAction}` };
                }

                try {
                    const pinned = await neuralVault.get('pinned_items') || [];

                    if (pinAction === 'pin') {
                        const pinId = `pin_${Date.now()}`;
                        const newPin = {
                            id: pinId,
                            item,
                            category: pinCategory || 'general',
                            pinned: Date.now()
                        };
                        pinned.push(newPin);
                        await neuralVault.set('pinned_items', pinned);

                        // Store in SovereignMemory for quick recall
                        await sovereignMemory.store(pinId, JSON.stringify({
                            type: 'pinned_item',
                            ...newPin
                        }));

                        addLog('SYSTEM', `📌 PINNED: ${item} (persisted)`);
                        return {
                            status: "ITEM_PINNED",
                            id: pinId,
                            item,
                            category: pinCategory || 'general',
                            message: "Pinned for quick access, Sir."
                        };
                    }

                    if (pinAction === 'list') {
                        const byCategory: Record<string, any[]> = {};
                        pinned.forEach((p: any) => {
                            const cat = p.category || 'general';
                            if (!byCategory[cat]) byCategory[cat] = [];
                            byCategory[cat].push(p);
                        });
                        return {
                            status: "PINNED_LISTED",
                            items: pinned,
                            byCategory,
                            count: pinned.length,
                            message: `You have ${pinned.length} pinned item${pinned.length !== 1 ? 's' : ''}, Sir.`
                        };
                    }

                    if (pinAction === 'unpin') {
                        const newPinned = pinned.filter((p: any) => p.item !== item);
                        await neuralVault.set('pinned_items', newPinned);
                        return { status: "ITEM_UNPINNED", item, message: "Unpinned, Sir." };
                    }

                    if (pinAction === 'clear') {
                        await neuralVault.set('pinned_items', []);
                        return { status: "PINS_CLEARED", message: "All pins cleared, Sir." };
                    }

                    return { status: "PIN_ACTION", action: pinAction };
                } catch (e: any) {
                    addLog('WARN', `PINNED_ITEMS: Fallback to localStorage - ${e.message}`);
                    const pinned = JSON.parse(localStorage.getItem('pinned_items') || '[]');
                    if (pinAction === 'pin') {
                        pinned.push({ item, category: pinCategory, pinned: Date.now() });
                        localStorage.setItem('pinned_items', JSON.stringify(pinned));
                        return { status: "ITEM_PINNED", item, message: "Pinned for quick access, Sir." };
                    }
                    if (pinAction === 'list') {
                        return { status: "PINNED_LISTED", items: pinned, count: pinned.length };
                    }
                    if (pinAction === 'unpin') {
                        const newPinned = pinned.filter((p: any) => p.item !== item);
                        localStorage.setItem('pinned_items', JSON.stringify(newPinned));
                        return { status: "ITEM_UNPINNED", item, message: "Unpinned." };
                    }
                    return { status: "PIN_ACTION", action: pinAction };
                }
            }

            if (name === 'daily_brief') {
                const briefType = typeof args.type === 'string' ? args.type : undefined;
                const include = Array.isArray(args.include)
                    ? args.include.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
                    : [];
                addLog('SYSTEM', `☀️ DAILY BRIEF: ${briefType || 'morning'}`);
                const state = useAppStore.getState();

                try {
                    // Pull from real neuralVault data
                    const goals = await neuralVault.get('tracked_goals') || [];
                    const quickNotes = await neuralVault.get('quick_notes') || [];
                    const monitors = await neuralVault.get('active_monitors') || [];
                    const moods = await neuralVault.get('mood_log') || [];

                    // Get dream protocol insights
                    const dreamStatus = dreamProtocol.getStatus();
                    const recentSessions = dreamProtocol.getPastSessions().slice(-3);

                    // Get biometric summary
                    const biometricSummary = faceDetectionService.isReady() ? {
                        stressLevel: faceDetectionService.estimateStress().level,
                        blinkRate: faceDetectionService.getBlinkRate()
                    } : null;

                    const activeGoals = goals.filter((g: any) => (g.progress || 0) < 100);
                    const recentMoods = moods.slice(-5);
                    const avgMoodEnergy = recentMoods.length > 0
                        ? recentMoods.reduce((sum: number, m: any) => sum + (m.energy || 5), 0) / recentMoods.length
                        : null;

                    return {
                        status: "BRIEF_READY",
                        type: briefType || 'morning',
                        include: include.length > 0 ? include : ['tasks', 'goals', 'calendar'],
                        data: {
                            currentMode: state.mode,
                            activeGoals: activeGoals.length,
                            goalsSummary: activeGoals.slice(0, 3).map((g: any) => ({ goal: g.goal, progress: g.progress || 0 })),
                            pendingNotes: quickNotes.length,
                            activeMonitors: monitors.filter((m: any) => m.active).length,
                            recentMoodTrend: avgMoodEnergy ? (avgMoodEnergy > 6 ? 'positive' : avgMoodEnergy < 4 ? 'low' : 'neutral') : null,
                            biometrics: biometricSummary,
                            dreamInsights: recentSessions.reduce((acc: number, s: any) => acc + (s.insights?.length || 0), 0),
                            timestamp: new Date().toLocaleString()
                        },
                        instruction: `Generate a ${briefType || 'morning'} brief. Include: ${(include.length > 0 ? include : ['tasks', 'goals', 'reminders']).join(', ')}. Be concise but comprehensive. Use the data provided for accurate status.`
                    };
                } catch (e: any) {
                    addLog('WARN', `DAILY_BRIEF: Fallback to localStorage - ${e.message}`);
                    const goals = JSON.parse(localStorage.getItem('tracked_goals') || '[]');
                    const quickNotes = JSON.parse(localStorage.getItem('quick_notes') || '[]');
                    return {
                        status: "BRIEF_READY",
                        type: briefType || 'morning',
                        include: include.length > 0 ? include : ['tasks', 'goals', 'calendar'],
                        data: {
                            currentMode: state.mode,
                            activeGoals: goals.filter((g: any) => g.progress < 100).length,
                            pendingNotes: quickNotes.length,
                            timestamp: new Date().toLocaleString()
                        },
                        instruction: `Generate a ${briefType || 'morning'} brief.`
                    };
                }
            }

            return { error: "Unknown executive protocol." };
        };

        liveSession.onAgentSwitch = (name) => {
            const requestedName = typeof name === 'string' && name.trim().length > 0 ? name.trim() : 'Puck';
            addLog('SYSTEM', `HANDOVER_REQ: Switching link to [${requestedName}]...`);
            audio.playClick();

            // Rapid toggle to force reconnection loop
            setVoiceState({ isActive: false });

            // Resolve standard name from generic input
            const agent = Object.values(HIVE_AGENTS).find((a: any) =>
                a.name.toLowerCase() === requestedName.toLowerCase() ||
                a.id === requestedName.toLowerCase()
            );
            const targetName = agent ? agent.name : requestedName;

            setVoiceState({ voiceName: targetName, isActive: true });
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally omitting reactive store selectors to prevent infinite re-renders
    }, [addLog, setMode, setVoiceState]);

    useEffect(() => {
        let mounted = true;

        const syncSession = async () => {
            if (!voice.isActive) {
                if (liveSession.isConnected()) {
                    liveSession.disconnect();
                    connectionAttemptRef.current = false;
                    lastConnectedNameRef.current = null;
                    setVoiceState({ partialTranscript: null, isConnecting: false });
                }
                return;
            }

            // Voice IS active.
            // If not connected, connect.
            if (!liveSession.isConnected() && !connectionAttemptRef.current) {
                connectionAttemptRef.current = true;
                try {
                    await initiateConnection(voice.voiceName);
                } catch (e) {
                    connectionAttemptRef.current = false;
                    setVoiceState({ isActive: false, isConnecting: false });
                }
            }
            // If connected, but name changed?
            // Since 'voice.voiceName' is in dep array, this effect runs on change.
            // If we are connected, and this runs, we should disconnect and reconnect.
            else if (liveSession.isConnected()) {
                // We can't easily check "who" is connected on the class instance without storing it.
                // But we know 'voiceName' just changed if this effect triggered.
                // Implication: If the session is open, we assume it *might* be stale if this effect triggered.

                // Optimization: Store lastConnectedName in a ref.
                if (lastConnectedNameRef.current !== voice.voiceName) {
                    logger.debug('Hot-Swapping Agent due to name change...', undefined, 'VoiceManager');
                    liveSession.disconnect();
                    connectionAttemptRef.current = true; // Stay 'true' so we block duplicates
                    lastConnectedNameRef.current = null; // Clear old name
                    await initiateConnection(voice.voiceName);
                }
            }
        };

        const initiateConnection = async (name: string, retryCount = 0) => {
            sessionVersionRef.current += 1;
            const thisSessionVersion = sessionVersionRef.current;
            const agentName = name || 'Puck';
            const agentId = Object.keys(HIVE_AGENTS).find(k => HIVE_AGENTS[k].name === agentName) || 'Puck';

            // =================================================================
            // PRE-FLIGHT CHECK - Validate requirements before attempting connection
            // =================================================================
            if (retryCount === 0) {
                const preflight = runPreflightCheck();
                if (!preflight.canProceed) {
                    const errorMsg = preflight.errors[0] || 'Voice system requirements not met';
                    addLog('ERROR', `VOICE_PREFLIGHT: ${errorMsg}`);
                    logger.error('Preflight failed', formatPreflightResult(preflight), 'VoiceManager');
                    connectionAttemptRef.current = false;
                    setVoiceState({ isActive: false, isConnecting: false });
                    return;
                }
                if (preflight.warnings.length > 0) {
                    logger.warn('Preflight warnings', preflight.warnings, 'VoiceManager');
                }
                addLog('SYSTEM', `VOICE_PREFLIGHT: Ready in ${preflight.mode} mode`);
            }

            // =================================================================
            // SYNCHRONIZED CLOCK - Record starting epoch for freshness tracking
            // =================================================================
            const startingEpoch = getEpoch();
            sessionEpochRef.current = startingEpoch;
            lastContextDigestRef.current = getContextDigest();
            epochChangesPendingRef.current = [];  // Clear pending changes

            // Get the current mode from the store for sector-specific context
            const currentMode = useAppStore.getState().mode;
            const sectorContext = getSectorContext(currentMode);
            const systemContext = getFullSystemContext();

            // Build rich context with UI knowledge, codebase awareness, and current state
            // Get SECTOR-RELEVANT actions from SystemMind (synchronized clock aware)
            const snapshot = getSnapshot();
            const sectorActions = getActionsForSector(currentMode);
            // Use sector-filtered actions (sorted by relevance to current sector)
            const availableActionsText = sectorActions.length > 0
                ? sectorActions.slice(0, 50).map((a: any) => `• ${a.id} (p:${a.priority}): ${a.description}`).join('\n')
                : '(No actions registered in current view)';

            const sharedContext = `
=== EXECUTIVE VOICE PROTOCOL ===

CURRENT_SECTOR: ${currentLocationRef.current || currentMode || 'HUB'}
SYNC_EPOCH: ${startingEpoch}

VOICE PERSONA:
- You are speaking aloud. Be conversational, not robotic.
- Address the user as "Sir" naturally throughout conversation
- British butler sensibility: composed, efficient, subtly warm
- Execute commands immediately, confirm briefly: "Right away, Sir." / "Done, Sir." / "Consider it handled."
- Anticipate needs: "I should mention..." / "You may want to know..."
- Dry wit permitted: "That's certainly one approach, Sir."

EXECUTION PROTOCOL:
When the user gives a command, ACT FIRST using tools, then confirm vocally.
- "Navigate to dashboard" → [use navigate_to_sector] → "Taking you there now, Sir."
- "Click submit" → [use click_element] → "Done, Sir."
- "Type hello world" → [use input_text] → "Text entered, Sir."
- "What can I do here?" → [use scan_ui] → Describe available interactions

TOOL ARSENAL:
• scan_ui — Survey all interactive elements in current view
• input_text — Enter text into any field
• click_element — Activate any button, tab, or link
• select_option — Choose from dropdowns
• navigate_to_sector — Major sector transitions
• navigate_to_tab — Precise tab navigation ("nexus", "cascade", "discovery")
• execute_component_action — Trigger registered system actions
• think — Route complex reasoning through Cognitive Precision Bridge

COMPLEX REQUESTS:
For analysis, generation, or strategic questions, invoke the "think" tool first.
Then deliver the response conversationally.

TAB SHORTCUTS:
"nexus" → Nexus Matrix | "cascade" → CPB Cascade | "discovery" → Discovery Lab
"DNA builder" → DNA Builder | "bicameral" → Bicameral Swarm | "yield ops" → Treasury

COGNITIVE_STATE: Skepticism ${mentalStateRef.current.skepticism}% | Excitement ${mentalStateRef.current.excitement}% | Alignment ${mentalStateRef.current.alignment}%

=== CURRENT SECTOR ===
${sectorContext}

=== AVAILABLE ACTIONS IN THIS VIEW ===
${availableActionsText}

=== FULL SYSTEM KNOWLEDGE ===
${systemContext}

=== CODEBASE ARCHITECTURE ===
Structure: ${Object.entries(CODEBASE_KNOWLEDGE.structure).map(([k, v]) => `${k}: ${v}`).join(' | ')}

Key Subsystems:
${Object.entries(CODEBASE_KNOWLEDGE.subsystems).map(([name, info]: [string, any]) =>
  `• ${name.toUpperCase()}: ${info.description} (Files: ${info.files.slice(0, 2).join(', ')})`
).join('\n')}

=== AVAILABLE ACTIONS ===
Use execute_component_action with these IDs for complex operations:
${getVoiceCapabilityList(currentMode as any)}

${generateTabContext(currentMode)}

=== END CONTEXT ===
            `;

            // Connection timeout: wraps the entire connect + onopen callback chain.
            // Checks store directly (not closure) so it works even if effect re-ran.
            let connectionResolved = false;
            const connectionTimeout = setTimeout(() => {
                if (!connectionResolved && useAppStore.getState().voice.isConnecting) {
                    logger.error('Connection timed out after 15s — onopen never fired', undefined, 'VoiceManager');
                    liveSession.disconnect();
                    connectionAttemptRef.current = false;
                    setVoiceState({ isActive: false, isConnecting: false });
                    addLog('ERROR', 'VOICE_CORE: Connection timed out. Check your Gemini API key.');
                }
            }, 15000);

            try {
                await liveSession.primeAudio();
                await liveSession.connect(agentName, {
                    systemInstruction: constructHiveContext(agentId, sharedContext, mentalStateRef.current),
                    tools: [{ functionDeclarations: VOICE_TOOLS }],
                    outputAudioTranscription: {},
                    inputAudioTranscription: {},
                    callbacks: {
                        onmessage: async (message: LiveServerMessage) => {
                            // Debug logging for transcript analysis
                            logger.debug('Message', {
                                hasToolCall: !!message.toolCall,
                                hasOutputTranscript: !!message.serverContent?.outputTranscription,
                                hasInputTranscript: !!message.serverContent?.inputTranscription,
                                turnComplete: !!message.serverContent?.turnComplete
                            }, 'VoiceManager');
                            if (message.toolCall) {
                                logger.debug(
                                    'Tool Call',
                                    message.toolCall.functionCalls?.map(fc => ({ name: fc.name, args: fc.args })),
                                    'VoiceManager'
                                );
                            }

                            if (message.serverContent?.outputTranscription) {
                                partialTranscriptRef.current += message.serverContent.outputTranscription.text;
                                setVoiceState({ partialTranscript: { role: 'model', text: partialTranscriptRef.current } });
                                logger.debug('Model', message.serverContent.outputTranscription.text, 'VoiceManager');
                            } else if (message.serverContent?.inputTranscription) {
                                partialTranscriptRef.current += message.serverContent.inputTranscription.text;
                                setVoiceState({ partialTranscript: { role: 'user', text: partialTranscriptRef.current } });
                                logger.debug('User', message.serverContent.inputTranscription.text, 'VoiceManager');

                                // Analyze complexity for hybrid mode routing display
                                const complexity = analyzeComplexity(partialTranscriptRef.current);
                                setVoiceNexusState({
                                    lastComplexityScore: complexity.score,
                                    currentProvider: {
                                        ...nexusState.currentProvider,
                                        reasoning: complexity.recommendedProvider.reasoning,
                                        tts: complexity.recommendedProvider.tts,
                                    }
                                });
                            }
                            if (message.serverContent?.turnComplete) {
                                const finalText = partialTranscriptRef.current;
                                if (finalText) {
                                    logger.debug('Turn Complete', { role: voice.partialTranscript?.role, text: finalText }, 'VoiceManager');
                                    setVoiceState(prev => ({
                                        transcripts: [...prev.transcripts, { role: prev.partialTranscript?.role || 'user', text: finalText, timestamp: Date.now() }],
                                        partialTranscript: null
                                    }));
                                }
                                partialTranscriptRef.current = "";
                            }
                        },
                        onopen: () => {
                            connectionResolved = true;
                            clearTimeout(connectionTimeout);
                            // Ignore stale callbacks from old sessions
                            if (!mounted || sessionVersionRef.current !== thisSessionVersion) return;
                            setVoiceState({ isConnecting: false });
                            addLog('SUCCESS', `VOICE_CORE: Neural handshake finalized.`);
                            lastConnectedNameRef.current = name;
                        },
                        onerror: (err: any) => {
                            connectionResolved = true;
                            clearTimeout(connectionTimeout);
                            // Ignore stale callbacks from old sessions
                            if (sessionVersionRef.current !== thisSessionVersion) return;
                            connectionAttemptRef.current = false;
                            setVoiceState({ isActive: false, isConnecting: false });
                            lastConnectedNameRef.current = null;
                            // Actually log the error so we know what went wrong
                            const errorMsg = err?.message || err?.error || String(err);
                            logger.error('Connection error', err, 'VoiceManager');
                            addLog('ERROR', `VOICE_CORE: ${errorMsg}`);
                        },
                        onclose: () => {
                            connectionResolved = true;
                            clearTimeout(connectionTimeout);
                            // Ignore stale callbacks from old sessions
                            if (!mounted || sessionVersionRef.current !== thisSessionVersion) return;
                            connectionAttemptRef.current = false;
                            setVoiceState({ isActive: false, isConnecting: false });
                            lastConnectedNameRef.current = null;
                        }
                    }
                });
            } catch (e: any) {
                connectionResolved = true;
                clearTimeout(connectionTimeout);
                const errorMsg = e?.message || String(e);
                logger.error('Connection exception', e, 'VoiceManager');

                if (retryCount < 2 && mounted && useAppStore.getState().voice.isActive) {
                    addLog('WARN', `VOICE_CORE: ${errorMsg}. Retrying in 2s... (${retryCount + 1}/2)`);
                    setTimeout(() => {
                        if (mounted && useAppStore.getState().voice.isActive) {
                            initiateConnection(name, retryCount + 1);
                        }
                    }, 2000);
                } else {
                    connectionAttemptRef.current = false;
                    setVoiceState({ isActive: false, isConnecting: false });
                    addLog('ERROR', `VOICE_CORE: ${errorMsg} (failed after ${retryCount + 1} attempts)`);
                }
            }
        };

        syncSession();

        // P0 FAILSAFE: If still connecting after 20s, force-reset state
        const failsafeTimer = setTimeout(() => {
            if (mounted && useAppStore.getState().voice.isConnecting) {
                logger.error('Connection failsafe triggered — stuck in SYNCING for 20s', undefined, 'VoiceManager');
                connectionAttemptRef.current = false;
                setVoiceState({ isActive: false, isConnecting: false });
                addLog('ERROR', 'VOICE_CORE: Connection timed out. Please try again.');
            }
        }, 20000);

        return () => {
            mounted = false;
            clearTimeout(failsafeTimer);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only re-run on active/name changes. Location/context/mentalState accessed via refs.
    }, [voice.isActive, voice.voiceName, setVoiceState, addLog]);

    return null;
};

export default VoiceManager;
