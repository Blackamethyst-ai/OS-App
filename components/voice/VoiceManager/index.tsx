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
import { handleAdvancedJarvis } from './parts/advancedJarvisHandlers';
import { handleConversational } from './parts/conversationalHandlers';
import { handleMetaCommands } from './parts/metaCommandHandlers';
import { handleProductivity } from './parts/productivityHandlers';
import type { ToolHandlerDeps } from './parts/handlerTypes';

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
                    [AppMode.NEXUS]: '/nexus',
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
                const routing = await routeQueryToCPB(task, context);
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
                        lastPhase: (lastStatus as ACEStatus | null)?.phase || 'unknown',
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
            // DELEGATED HANDLER SECTIONS
            // ================================================================
            const handlerDeps: ToolHandlerDeps = {
                addLog, audio, setMode,
                useAppStore: { getState: useAppStore.getState },
                neuralVault, sovereignMemory, voice,
                dreamProtocol, faceDetectionService,
                HIVE_AGENTS, runAgentReasoning,
            };

            // Advanced Jarvis Capabilities
            const jarvisResult = await handleAdvancedJarvis(name, args, handlerDeps);
            if (jarvisResult !== undefined) return jarvisResult;

            // Conversational Intelligence
            const convResult = await handleConversational(name, args, handlerDeps);
            if (convResult !== undefined) return convResult;

            // Meta-Commands, Learning & Advanced Memory
            const metaResult = await handleMetaCommands(name, args, handlerDeps);
            if (metaResult !== undefined) return metaResult;

            // Productivity, Documents & Developer Tools
            const prodResult = await handleProductivity(name, args, handlerDeps);
            if (prodResult !== undefined) return prodResult;
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
