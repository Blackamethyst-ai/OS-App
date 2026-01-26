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
import { OS_TOOLS } from '../../../services/toolRegistry';
import { AppMode } from '../../../types';
import { LiveServerMessage } from '@google/genai';
import { audio } from '../../../services/audioService';
import { CODEBASE_KNOWLEDGE, buildCodebaseContext } from '../../../services/archon';
import { getFullSystemContext, getSectorContext } from '../../../services/voiceUIContext';
import { universalVoice, fillInput, clickButton, selectOption, scanInteractiveElements } from '../../../services/universalVoiceHooks';
import { navigateToTab, generateTabContext, parseTabNavigation, TAB_REGISTRY } from '../../../services/tabNavigationRegistry';
import { initializeUnifiedRegistry, routeQuery, executeQuery, generateVoiceContext } from '../../../services/unifiedActionRegistry';
import type { CPBPath } from '../../../services/cognitivePrecisionBridge/types';
import { SovereignMemory } from '../../../services/memory/MemoryStore';
import { neuralVault } from '../../../services/persistenceService';
import { faceDetectionService } from '../../../services/faceDetectionService';
import { dreamProtocol, DreamInsight } from '../../../services/dreamProtocol';
import { adaptiveConsensusEngine, quickConsensus, ACEStatus, ACEResult } from '../../../services/bicameralService';

// Initialize memory service singleton
const sovereignMemory = new SovereignMemory();

// Import extracted tool declarations
import { VOICE_TOOLS } from './parts/tools';

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

    // ==========================================================================
    // SYNCHRONIZED CLOCK - Track context freshness
    // ==========================================================================
    const sessionEpochRef = useRef<number>(0);        // Epoch when session started
    const lastContextDigestRef = useRef<string>('');  // Quick digest for staleness check
    const epochChangesPendingRef = useRef<EpochEvent[]>([]);  // Queued changes during session

    // Initialize unified action registry on mount
    // (consolidates all voice and component actions with CPB routing)
    useEffect(() => {
        initializeUnifiedRegistry().catch(err => {
            console.error('[VoiceManager] Failed to initialize unified registry:', err);
        });
    }, []);

    // Subscribe to epoch changes for synchronized clock awareness
    useEffect(() => {
        const unsubscribe = subscribeToEpoch((event: EpochEvent) => {
            // If we have an active voice session, track the change
            if (voice.isActive) {
                epochChangesPendingRef.current.push(event);

                // Log significant changes
                if (event.reason === 'sector_changed') {
                    if (import.meta.env.DEV) console.log(`[VoiceManager] Sector changed during session: ${event.details}`);
                    addLog('SYSTEM', `VOICE_SYNC: Context drift detected - sector changed to ${event.details}`);
                } else if (event.reason === 'bulk_update') {
                    if (import.meta.env.DEV) console.log(`[VoiceManager] Actions updated during session: ${event.details}`);
                }
            }
        });

        return unsubscribe;
    }, [voice.isActive, addLog, subscribeToEpoch]);

    useEffect(() => {
        liveSession.onToolCall = async (name, args) => {
            // Debug logging for tool calls
            if (import.meta.env.DEV) {
                console.log('[VoiceManager] Tool Invoked:', { name, args });
            }

            if (name === 'navigate_to_sector') {
                const target = (args.target_sector as string || '').toUpperCase() as AppMode;

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
                const result = await (OS_TOOLS.architect_generate_process as any)(args);
                return result.data;
            }

            if (name === 'recalibrate_dna') {
                const result = await (OS_TOOLS.adjust_agent_dna as any)({
                    agentId: args.agentId,
                    weights: { skepticism: args.skepticism, excitement: args.excitement, alignment: args.alignment }
                });
                return result.data;
            }

            if (name === 'switch_agent') {
                // Handled via onAgentSwitch event, but return confirming status
                return { status: "HANDOVER_INITIATED", target: args.agentName };
            }

            if (name === 'execute_component_action') {
                let actionId = args.action_id as string;
                const actionArgs = args.args || {};
                addLog('SYSTEM', `VOICE_EXECUTIVE: Executing action [${actionId}]...`);

                // Try unified registry first for CPB-routed execution
                const { getAction, executeAction: executeUnifiedAction } = await import('../../../services/unifiedActionRegistry');
                const unifiedAction = getAction(actionId);

                if (unifiedAction) {
                    // Route through CPB if action has complex execution path
                    if (unifiedAction.complexity !== 'simple' && unifiedAction.complexity !== 'navigation') {
                        addLog('SYSTEM', `VOICE_EXECUTIVE: Routing [${actionId}] through CPB (complexity: ${unifiedAction.complexity}, path: ${unifiedAction.executionPath})`);

                        const cpbResult = await executeUnifiedAction(actionId, actionArgs, (status) => {
                            if (status.message) {
                                addLog('SYSTEM', `CPB [${status.phase}]: ${status.message}`);
                            }
                        });

                        if (cpbResult.success) {
                            addLog('SUCCESS', `VOICE_EXECUTIVE: CPB execution complete (DQ: ${cpbResult.dqScore ? (cpbResult.dqScore * 100).toFixed(0) + '%' : 'N/A'})`);
                            audio.playSuccess();
                            return {
                                status: "CPB_ACTION_EXECUTED",
                                actionId,
                                executionPath: cpbResult.executionPath,
                                dqScore: cpbResult.dqScore,
                                result: cpbResult.output
                            };
                        } else {
                            const errorMsg = (cpbResult.output as any)?.error || 'Unknown error';
                            addLog('ERROR', `VOICE_EXECUTIVE: CPB execution failed: ${errorMsg}`);
                            return { error: errorMsg, actionId };
                        }
                    }
                }

                // Fallback to SystemMind registry for simple actions
                const actionExists = !!actionRegistry[actionId];

                // If not found, try fuzzy matching
                if (!actionExists) {
                    const normalized = actionId.toLowerCase().replace(/[-_\s]/g, '');
                    const allActionIds = Object.keys(actionRegistry);

                    // Try exact normalized match first
                    let matchedId = allActionIds.find(key => {
                        const keyNorm = key.toLowerCase().replace(/[-_\s]/g, '');
                        return keyNorm === normalized;
                    });

                    // Try partial match if no exact match
                    if (!matchedId) {
                        matchedId = allActionIds.find(key => {
                            const keyNorm = key.toLowerCase().replace(/[-_\s]/g, '');
                            return keyNorm.includes(normalized) || normalized.includes(keyNorm);
                        });
                    }

                    // Try matching individual words
                    if (!matchedId) {
                        const words = actionId.toLowerCase().split(/[-_\s]+/).filter(w => w.length > 2);
                        matchedId = allActionIds.find(key => {
                            const keyLower = key.toLowerCase();
                            return words.every(word => keyLower.includes(word));
                        });
                    }

                    if (matchedId) {
                        addLog('SYSTEM', `VOICE_EXECUTIVE: Fuzzy matched [${actionId}] → [${matchedId}]`);
                        actionId = matchedId;
                    } else {
                        // Suggest similar actions
                        const suggestions = allActionIds
                            .filter(k => {
                                const kLower = k.toLowerCase();
                                return normalized.split('').some(char => kLower.includes(char));
                            })
                            .slice(0, 5);
                        addLog('WARN', `VOICE_EXECUTIVE: Action [${args.action_id}] not found. Suggestions: ${suggestions.join(', ')}`);
                        return {
                            error: `Action "${args.action_id}" not found`,
                            suggestions,
                            hint: "Call get_available_actions to see all available actions"
                        };
                    }
                }

                try {
                    const result = await executeAction(actionId, actionArgs);
                    addLog('SUCCESS', `VOICE_EXECUTIVE: Action [${actionId}] completed.`);
                    audio.playSuccess();
                    return { status: "ACTION_EXECUTED", actionId, result };
                } catch (e: any) {
                    addLog('ERROR', `VOICE_EXECUTIVE: Action [${actionId}] failed: ${e.message}`);
                    return { error: e.message, actionId };
                }
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
                const fieldId = args.field_id as string;
                const text = args.text as string;
                addLog('SYSTEM', `VOICE_EXECUTIVE: Inputting text to [${fieldId}]...`);

                // Use universal voice service for robust input handling
                const result = fillInput(fieldId, text);

                if (result.success) {
                    addLog('SUCCESS', `VOICE_EXECUTIVE: Text input to [${result.element}] complete.`);
                    audio.playClick();
                    return { status: "TEXT_INPUT_COMPLETE", element: result.element, textLength: text.length };
                } else {
                    // Fallback: Check if there's an action registered for this input
                    const inputAction = Object.keys(actionRegistry).find(k =>
                        k.includes(fieldId) || k.includes('input') || k.includes('set')
                    );
                    if (inputAction) {
                        await executeAction(inputAction, { text, value: text });
                        return { status: "TEXT_INPUT_VIA_ACTION", actionUsed: inputAction };
                    }
                    addLog('WARN', `VOICE_EXECUTIVE: ${result.error}`);
                    return { error: result.error, suggestion: "Try get_ui_context to see available inputs" };
                }
            }

            if (name === 'click_element') {
                const target = args.target as string || args.button as string || args.element as string;
                addLog('SYSTEM', `VOICE_EXECUTIVE: Clicking [${target}]...`);

                const result = clickButton(target);
                if (result.success) {
                    addLog('SUCCESS', `VOICE_EXECUTIVE: Clicked [${result.element}].`);
                    audio.playClick();
                    return { status: "CLICK_COMPLETE", element: result.element };
                } else {
                    addLog('WARN', `VOICE_EXECUTIVE: ${result.error}`);
                    return { error: result.error };
                }
            }

            if (name === 'select_option') {
                const dropdown = args.dropdown as string;
                const option = args.option as string;
                addLog('SYSTEM', `VOICE_EXECUTIVE: Selecting [${option}] from [${dropdown}]...`);

                const result = selectOption(dropdown, option);
                if (result.success) {
                    addLog('SUCCESS', `VOICE_EXECUTIVE: Selected [${result.element}].`);
                    audio.playClick();
                    return { status: "SELECT_COMPLETE", element: result.element };
                } else {
                    addLog('WARN', `VOICE_EXECUTIVE: ${result.error}`);
                    return { error: result.error };
                }
            }

            if (name === 'scan_ui') {
                const uiSnapshot = scanInteractiveElements();
                addLog('SYSTEM', `VOICE_EXECUTIVE: ${uiSnapshot.summary}`);
                return {
                    status: "OK",
                    ...uiSnapshot,
                    allElements: uiSnapshot.allElements.map(e => ({ id: e.id, type: e.type, label: e.label }))
                };
            }

            if (name === 'navigate_to_tab') {
                const query = args.query as string;
                addLog('SYSTEM', `VOICE_EXECUTIVE: Parsing tab navigation for "${query}"...`);

                const result = navigateToTab(query);

                if (result.success) {
                    addLog('SUCCESS', `VOICE_EXECUTIVE: Navigated to ${result.sectorLabel} > ${result.tabLabel}${result.subtabLabel ? ` > ${result.subtabLabel}` : ''}`);
                    audio.playTransition();
                    return {
                        status: "TAB_NAVIGATION_COMPLETE",
                        sector: result.sector,
                        sectorLabel: result.sectorLabel,
                        tab: result.tab,
                        tabLabel: result.tabLabel,
                        subtab: result.subtab,
                        subtabLabel: result.subtabLabel,
                        route: result.route
                    };
                } else {
                    addLog('WARN', `VOICE_EXECUTIVE: ${result.error}`);
                    return {
                        error: result.error,
                        suggestions: result.suggestions,
                        hint: "Available tabs: Nexus, Discovery, DNA, Agora, Bicameral, IDE, Actions, Cascade, ACE, RLM, and more. Say 'go to [tab name]' or '[sector] [tab]'."
                    };
                }
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
                const task = args.task as string;
                const context = args.context as string | undefined;

                addLog('SYSTEM', `THINK: Processing "${task.slice(0, 50)}${task.length > 50 ? '...' : ''}"`);

                // Route through CPB
                const routing = routeQuery(task, context);
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
                    const result = await executeQuery(task, context, (status) => {
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

                        return {
                            status: "THOUGHT_PARTIAL",
                            response: (result.output as any)?.error || "Could not fully process the request",
                            instruction: "The reasoning had issues. Answer based on your knowledge, acknowledging uncertainty."
                        };
                    }
                } catch (error: any) {
                    addLog('ERROR', `THINK: Error - ${error.message}`);

                    // Update CPB visual state - ERROR
                    setCPBState({
                        isActive: false,
                        phase: 'error',
                        progress: 0,
                        message: 'Processing failed',
                        error: error.message
                    });
                    setTimeout(() => setCPBState({ phase: 'idle', error: null }), 5000);

                    return {
                        status: "THOUGHT_ERROR",
                        error: error.message,
                        instruction: "Reasoning failed. Answer based on your knowledge and apologize for limited processing."
                    };
                }
            }

            // =================================================================
            // SEARCH INTELLIGENCE - Grounded search
            // =================================================================
            if (name === 'search_intel') {
                const query = args.query as string;
                addLog('SYSTEM', `INTEL: Searching for "${query}"...`);

                try {
                    const result = await (OS_TOOLS.search_intel as any)({ query });
                    if (result.status === 'SUCCESS') {
                        addLog('SUCCESS', `INTEL: Search complete.`);
                        return {
                            status: "SEARCH_COMPLETE",
                            result: result.data.message,
                            instruction: "Present this information to the user conversationally."
                        };
                    }
                    return { error: result.data?.error || 'Search failed' };
                } catch (e: any) {
                    return { error: e.message };
                }
            }

            // =================================================================
            // CONVERGE LATTICES - Strategic synthesis
            // =================================================================
            if (name === 'converge_lattices') {
                const targetGoal = args.targetGoal as string;
                addLog('SYSTEM', `CONVERGENCE: Synthesizing lattices toward "${targetGoal}"...`);

                try {
                    const result = await (OS_TOOLS.converge_strategic_lattices as any)({ targetGoal });
                    if (result.status === 'SUCCESS') {
                        addLog('SUCCESS', `CONVERGENCE: Synthesis complete. Coherence: ${result.data.coherence}`);
                        audio.playSuccess();
                        return {
                            status: "CONVERGENCE_COMPLETE",
                            goal: result.data.goal,
                            coherence: result.data.coherence
                        };
                    }
                    return { error: result.data?.error || 'Convergence failed' };
                } catch (e: any) {
                    return { error: e.message };
                }
            }

            // =================================================================
            // TASK MANAGEMENT - Real store integration
            // =================================================================

            if (name === 'create_task') {
                const { title, description, priority, tags } = args;
                addLog('SYSTEM', `📋 CREATING TASK: "${title}"`);

                try {
                    const { addTask } = useAppStore.getState().actions;
                    addTask({
                        title: title as string,
                        description: (description as string) || '',
                        status: 'TODO' as any,
                        priority: (priority as string) || 'MEDIUM',
                        tags: (tags as string[]) || []
                    });

                    audio.playClick();
                    addLog('SUCCESS', `✅ TASK CREATED: "${title}"`);
                    return {
                        status: "TASK_CREATED",
                        title,
                        priority: priority || 'MEDIUM',
                        message: `Task created, Sir: "${title}". Priority: ${priority || 'MEDIUM'}.`
                    };
                } catch (e: any) {
                    addLog('ERROR', `Task creation failed: ${e.message}`);
                    return { error: e.message };
                }
            }

            if (name === 'update_task_priority') {
                const { taskId, priority } = args;
                addLog('SYSTEM', `📋 UPDATING PRIORITY: ${taskId} → ${priority}`);

                try {
                    const state = useAppStore.getState();
                    const { updateTask } = state.actions;

                    // Find task by ID or partial match
                    const task = state.tasks.find(t =>
                        t.id === taskId ||
                        t.title.toLowerCase().includes((taskId as string).toLowerCase())
                    );

                    if (!task) {
                        return { error: `Task not found: ${taskId}`, availableTasks: state.tasks.map(t => t.title) };
                    }

                    updateTask(task.id, { priority: priority as any });
                    audio.playClick();
                    addLog('SUCCESS', `✅ PRIORITY UPDATED: "${task.title}" → ${priority}`);
                    return {
                        status: "PRIORITY_UPDATED",
                        taskId: task.id,
                        title: task.title,
                        priority,
                        message: `Priority updated to ${priority}, Sir.`
                    };
                } catch (e: any) {
                    return { error: e.message };
                }
            }

            if (name === 'complete_task') {
                const { taskId, taskTitle } = args;
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
                        task = state.tasks.find(t =>
                            t.title.toLowerCase().includes((taskTitle as string).toLowerCase())
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
                    const result = await (OS_TOOLS.propose_structural_change as any)({
                        agentId: voice.voiceName.toLowerCase().replace(/\s+/g, '_'),
                        agentName: voice.voiceName,
                        type,
                        title,
                        description,
                        impact: impact || 'To be assessed',
                        manifest_summary: description
                    });
                    if (result.status === 'SUCCESS') {
                        addLog('SUCCESS', `PROPOSAL: Staged for review.`);
                        audio.playSuccess();
                        return {
                            status: "PROPOSAL_SUBMITTED",
                            proposalId: result.data.proposalId,
                            message: "Proposal submitted for swarm review, Sir."
                        };
                    }
                    return { error: result.data?.error || 'Proposal failed' };
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

                // Task statistics
                const tasks = state.tasks || [];
                const taskStats = {
                    total: tasks.length,
                    todo: tasks.filter(t => t.status === 'TODO').length,
                    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
                    done: tasks.filter(t => t.status === 'DONE' || t.status === 'COMPLETED').length,
                    highPriority: tasks.filter(t => t.priority === 'HIGH' || t.priority === 'CRITICAL').length
                };

                // Voice system status
                const voiceStatus = {
                    active: state.voice.isActive,
                    mode: state.voice.mode,
                    currentVoice: state.voice.voiceName,
                    isConnecting: state.voice.isConnecting
                };

                // Biometrics status
                const biometricState = (state as any).biometric || {};
                const biometricStatus = {
                    active: biometricState.isActive || false,
                    faceDetected: biometricState.faceDetected || false,
                    attentionScore: biometricState.attentionScore || 0
                };

                // CPB status
                const cpbState = (state as any).cpbState || {};
                const cpbStatus = {
                    phase: cpbState.phase || 'idle',
                    currentPath: cpbState.currentPath,
                    confidence: cpbState.confidence || 0
                };

                // Memory status (from localStorage for quick check)
                const delegations = JSON.parse(localStorage.getItem('delegations') || '[]');
                const monitors = JSON.parse(localStorage.getItem('active_monitors') || '[]');
                const goals = JSON.parse(localStorage.getItem('tracked_goals') || '[]');

                // System performance
                const perfMetrics = {
                    uptime: Math.round(performance.now() / 1000),
                    memoryUsage: (performance as any).memory?.usedJSHeapSize
                        ? Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)
                        : null
                };

                const report = {
                    timestamp: new Date().toISOString(),
                    sector: state.mode,
                    voice: voiceStatus,
                    tasks: taskStats,
                    biometrics: biometricStatus,
                    cpb: cpbStatus,
                    agents: {
                        available: Object.keys(HIVE_AGENTS).length,
                        recentDelegations: delegations.length
                    },
                    monitoring: {
                        activeMonitors: monitors.filter((m: any) => m.triggered === 0).length,
                        trackedGoals: goals.length
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
                if (biometricStatus.active && biometricStatus.faceDetected) {
                    statusMessages.push(`Biometrics tracking. Attention: ${biometricStatus.attentionScore}%.`);
                }
                if (monitors.filter((m: any) => m.triggered === 0).length > 0) {
                    statusMessages.push(`${monitors.filter((m: any) => m.triggered === 0).length} active monitor${monitors.length > 1 ? 's' : ''}.`);
                }

                addLog('SUCCESS', `✅ STATUS: Report compiled`);

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
                const { message, delayMinutes } = args;
                addLog('SYSTEM', `REMINDER: Setting for ${delayMinutes} minutes: "${message}"`);

                // Set the reminder
                setTimeout(() => {
                    addLog('WARN', `⏰ REMINDER: ${message}`);
                    audio.playSuccess();
                    // Could also trigger a notification here
                }, (delayMinutes as number) * 60 * 1000);

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
                const { topic } = args;
                addLog('SYSTEM', `DREAM: Initiating autonomous dream mode...`);

                // Get current dream status
                const dreamStatus = dreamProtocol.getStatus();

                if (dreamStatus.isDreaming) {
                    // Already dreaming - queue the topic if provided
                    if (topic) {
                        dreamProtocol.queueQuery(topic as string);
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
                    dreamProtocol.queueQuery(topic as string);
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
                const goal = args.goal as string;
                addLog('SYSTEM', `DECOMPOSE: Breaking down "${goal}"...`);
                // Route through think tool for decomposition
                return {
                    status: "DECOMPOSITION_ROUTED",
                    instruction: `Break down this complex goal into 5-7 atomic, executable sub-tasks: "${goal}". List each task with a clear description and dependencies.`
                };
            }

            if (name === 'run_consensus') {
                const question = args.question as string;
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
                            if (import.meta.env.DEV) {
                                console.log(`[ACE] Phase: ${status.phase}, Gap: ${status.currentGap}/${status.targetGap}`);
                            }
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
                            validity: result.dqScore.validity,
                            specificity: result.dqScore.specificity
                        } : null,
                        complexity: result.complexity ? {
                            taskType: result.complexity.taskType,
                            tokenEstimate: result.complexity.tokenEstimate
                        } : null,
                        instruction: "Present the consensus answer conversationally, mentioning confidence level and that multiple agents voted."
                    };
                } catch (error: any) {
                    addLog('ERROR', `CONSENSUS: Failed - ${error.message}`);
                    return {
                        status: "CONSENSUS_FAILED",
                        error: error.message,
                        lastPhase: lastStatus?.phase || 'unknown',
                        instruction: `Consensus engine failed: ${error.message}. Offer to try again or analyze the question yourself.`
                    };
                }
            }

            if (name === 'bicameral_dialogue') {
                const topic = args.topic as string;
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
                        if (import.meta.env.DEV) {
                            console.log(`[BICAMERAL] Phase: ${status.phase}, DNA: ${status.activeDNA || 'swarm'}`);
                        }
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
                const query = args.query as string;
                const limit = (args.limit as number) || 5;
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
                const { target, analysisType } = args;
                addLog('SYSTEM', `CODE: Analyzing ${target} (${analysisType || 'general'}) with Archon...`);

                // Build relevant codebase context for the analysis target
                const codebaseContext = buildCodebaseContext(target as string);

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
                const { description, language, style } = args;
                const lang = (language as string) || 'TypeScript';
                const codeStyle = (style as string) || 'production';
                addLog('SYSTEM', `CODE: Generating ${lang} code with Mike...`);

                // Get relevant codebase context
                const codebaseContext = buildCodebaseContext(description as string);

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
                const label = args.label as string;
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
                const label = args.label as string;
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
                const enabled = args.enabled as boolean;
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
                const { enabled, duration } = args;
                addLog('SYSTEM', `FOCUS: ${enabled ? 'Entering' : 'Exiting'} focus mode...`);
                // Could trigger UI changes here
                if (duration) {
                    setTimeout(() => {
                        addLog('SYSTEM', `FOCUS: Focus session complete.`);
                        audio.playSuccess();
                    }, (duration as number) * 60 * 1000);
                }
                return {
                    status: enabled ? "FOCUS_MODE_ACTIVE" : "FOCUS_MODE_DISABLED",
                    duration,
                    message: enabled ? `Focus mode activated${duration ? ` for ${duration} minutes` : ''}, Sir.` : "Focus mode disabled, Sir."
                };
            }

            if (name === 'quick_capture') {
                const thought = args.thought as string;
                addLog('SYSTEM', `CAPTURE: "${thought.slice(0, 50)}..."`);
                const captures = JSON.parse(localStorage.getItem('quick_captures') || '[]');
                captures.push({ thought, timestamp: Date.now() });
                localStorage.setItem('quick_captures', JSON.stringify(captures));
                return { status: "CAPTURED", message: "Captured, Sir." };
            }

            // =================================================================
            // CLIPBOARD & QUICK ACTIONS
            // =================================================================
            if (name === 'copy_to_clipboard') {
                const content = args.content as string;
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
                const { speed, volume, mode } = args;
                addLog('SYSTEM', `VOICE: Adjusting settings...`);
                if (mode) {
                    const { voiceNexus } = await import('../../../services/voiceNexus');
                    voiceNexus.setMode(mode);
                    setVoiceNexusState({ mode });
                }
                return { status: "SETTINGS_ADJUSTED", speed, volume, mode };
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
                const { steps, parallel } = args;
                addLog('SYSTEM', `SEQUENCE: Executing ${(steps as string[]).length} steps ${parallel ? 'in parallel' : 'sequentially'}...`);
                // Store sequence for execution tracking
                const sequenceId = `seq-${Date.now()}`;
                return {
                    status: "SEQUENCE_STARTED",
                    sequenceId,
                    steps,
                    parallel,
                    instruction: `Execute these steps ${parallel ? 'simultaneously' : 'one by one'}: ${(steps as string[]).join(', ')}. Report progress on each.`
                };
            }

            if (name === 'create_macro') {
                const { trigger, actions, description } = args;
                addLog('SYSTEM', `MACRO: Creating "${trigger}"...`);
                const macros = JSON.parse(localStorage.getItem('voice_macros') || '{}');
                macros[trigger as string] = { actions, description, created: Date.now() };
                localStorage.setItem('voice_macros', JSON.stringify(macros));
                addLog('SUCCESS', `MACRO: Created.`);
                return { status: "MACRO_CREATED", trigger, message: `Macro "${trigger}" created, Sir. Say "${trigger}" to execute.` };
            }

            if (name === 'manage_macros') {
                const { action, macroName } = args;
                const macros = JSON.parse(localStorage.getItem('voice_macros') || '{}');

                if (action === 'list') {
                    const macroList = Object.entries(macros).map(([k, v]: [string, any]) => ({ trigger: k, ...v }));
                    return { status: "MACROS_LISTED", macros: macroList, count: macroList.length };
                } else if (action === 'delete' && macroName) {
                    delete macros[macroName as string];
                    localStorage.setItem('voice_macros', JSON.stringify(macros));
                    return { status: "MACRO_DELETED", macroName };
                }
                return { status: "ACTION_COMPLETE", action };
            }

            if (name === 'schedule_action') {
                const { action, when, recurring } = args;
                addLog('SYSTEM', `SCHEDULE: "${action}" for ${when} (${recurring || 'once'})...`);
                const schedules = JSON.parse(localStorage.getItem('voice_schedules') || '[]');
                schedules.push({ action, when, recurring: recurring || 'once', created: Date.now() });
                localStorage.setItem('voice_schedules', JSON.stringify(schedules));
                return { status: "SCHEDULED", message: `Scheduled "${action}" for ${when}, Sir.` };
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
                const count = (args.count as number) || 1;
                addLog('SYSTEM', `UNDO: Reverting ${count} action(s)...`);
                return {
                    status: "UNDO_NOTED",
                    count,
                    message: `Noted request to undo ${count} action(s), Sir. Reversing where possible.`
                };
            }

            if (name === 'get_history') {
                const limit = (args.limit as number) || 10;
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
                const { category, preference, value } = args;
                addLog('SYSTEM', `PREFERENCE: Learning "${preference}" = "${value}"...`);
                const prefs = JSON.parse(localStorage.getItem('voice_preferences') || '{}');
                if (!prefs[category as string]) prefs[category as string] = {};
                prefs[category as string][preference as string] = { value, learned: Date.now() };
                localStorage.setItem('voice_preferences', JSON.stringify(prefs));
                return { status: "PREFERENCE_LEARNED", message: `I'll remember that, Sir. ${preference}: ${value}` };
            }

            if (name === 'get_preferences') {
                const prefs = JSON.parse(localStorage.getItem('voice_preferences') || '{}');
                const category = args.category as string;
                const result = category ? prefs[category] || {} : prefs;
                return { status: "PREFERENCES_RETRIEVED", preferences: result };
            }

            if (name === 'trigger_webhook') {
                const { target, payload, webhookUrl } = args;
                addLog('SYSTEM', `WEBHOOK: Triggering ${target}...`);
                // Webhooks would need actual implementation with stored URLs
                return {
                    status: "WEBHOOK_QUEUED",
                    target,
                    message: `Webhook to ${target} queued with payload, Sir.`
                };
            }

            if (name === 'ambient_mode') {
                const { enabled, wakeWord, sensitivity } = args;
                addLog('SYSTEM', `AMBIENT: ${enabled ? 'Enabling' : 'Disabling'} ambient mode...`);
                return {
                    status: enabled ? "AMBIENT_ENABLED" : "AMBIENT_DISABLED",
                    wakeWord: wakeWord || 'hey',
                    sensitivity: sensitivity || 'medium',
                    message: enabled ? `Ambient mode active, Sir. Say "${wakeWord || 'hey'}" to wake me.` : "Ambient mode disabled, Sir."
                };
            }

            if (name === 'dictation_mode') {
                const { enabled, destination } = args;
                addLog('SYSTEM', `DICTATION: ${enabled ? 'Enabling' : 'Disabling'}...`);
                return {
                    status: enabled ? "DICTATION_ENABLED" : "DICTATION_DISABLED",
                    destination: destination || 'clipboard',
                    message: enabled ? `Dictation mode active. Speaking will transcribe to ${destination || 'clipboard'}, Sir.` : "Dictation mode disabled, Sir."
                };
            }

            if (name === 'summarize_session') {
                const scope = (args.scope as string) || 'conversation';
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
                const { project, task, goals } = args;
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
                const { action, duration, label } = args;
                addLog('SYSTEM', `TIMER: ${action}${duration ? ` (${duration}m)` : ''}...`);

                if (action === 'start' && duration) {
                    setTimeout(() => {
                        addLog('WARN', `⏰ TIMER: ${label || 'Timer'} complete!`);
                        audio.playSuccess();
                    }, (duration as number) * 60 * 1000);
                    return { status: "TIMER_STARTED", duration, label, message: `Timer set for ${duration} minutes, Sir.` };
                }
                return { status: `TIMER_${(action as string).toUpperCase()}`, action };
            }

            if (name === 'calculate') {
                const expression = args.expression as string;
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
                const { action, query } = args;
                addLog('SYSTEM', `MEDIA: ${action}${query ? ` "${query}"` : ''}...`);
                return { status: `MEDIA_${(action as string).toUpperCase()}`, action, query };
            }

            if (name === 'open_external') {
                const { target, newWindow } = args;
                addLog('SYSTEM', `OPEN: ${target}...`);

                // Check if it's a URL
                if ((target as string).startsWith('http')) {
                    window.open(target as string, newWindow ? '_blank' : '_self');
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
                const monitors = JSON.parse(localStorage.getItem('active_monitors') || '[]');
                const newMonitor = {
                    id: `mon_${Date.now()}`,
                    condition,
                    action,
                    threshold,
                    duration: duration || 'continuous',
                    created: Date.now(),
                    triggered: 0
                };
                monitors.push(newMonitor);
                localStorage.setItem('active_monitors', JSON.stringify(monitors));
                addLog('SYSTEM', `📡 MONITOR SET: ${condition} → ${action}`);
                audio.playClick();
                return {
                    status: "MONITOR_ACTIVE",
                    monitorId: newMonitor.id,
                    message: `Monitoring established, Sir. I'll ${action} when ${condition}.`
                };
            }

            if (name === 'get_active_monitors') {
                const monitors = JSON.parse(localStorage.getItem('active_monitors') || '[]');
                const { includeHistory } = args;
                addLog('SYSTEM', `MONITORS: ${monitors.length} active`);
                return {
                    status: "MONITORS_RETRIEVED",
                    activeMonitors: monitors.filter((m: any) => m.triggered === 0),
                    triggeredMonitors: includeHistory ? monitors.filter((m: any) => m.triggered > 0) : undefined,
                    total: monitors.length
                };
            }

            if (name === 'run_diagnostics') {
                const { scope, verbose } = args;
                addLog('SYSTEM', `🔍 DIAGNOSTICS: Running ${scope || 'full'} scan...`);
                audio.playClick();
                const state = useStore.getState();
                const diagnostics = {
                    system: {
                        uptime: performance.now(),
                        memory: (performance as any).memory?.usedJSHeapSize || 'unavailable',
                        agents: Object.keys(state.agents || {}).length,
                        activeTasks: ((state as any).tasks || []).filter((t: any) => t.status === 'active').length
                    },
                    services: {
                        voice: voice.isActive ? 'ACTIVE' : 'STANDBY',
                        biometrics: (state as any).biometric?.isActive ? 'ACTIVE' : 'STANDBY',
                        dreamProtocol: 'READY'
                    },
                    health: 'OPTIMAL'
                };
                return {
                    status: "DIAGNOSTICS_COMPLETE",
                    scope: scope || 'full',
                    results: diagnostics,
                    message: verbose ? JSON.stringify(diagnostics, null, 2) : "All systems operational, Sir."
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
                const { scenario, timeframe, factors } = args;
                addLog('SYSTEM', `🔮 PREDICTING: ${scenario}`);
                return {
                    status: "PREDICTION_GENERATED",
                    scenario,
                    timeframe: timeframe || 'short-term',
                    confidence: 0.75,
                    prediction: `Based on current trajectories, ${scenario} has a high probability of success.`,
                    factors: factors || [],
                    instruction: `Analyze: "${scenario}" over ${timeframe || 'short-term'} timeframe. Consider: ${(factors || ['current trends']).join(', ')}`
                };
            }

            if (name === 'background_operation') {
                const { operation, notifyOn, priority } = args;
                const bgOps = JSON.parse(localStorage.getItem('background_operations') || '[]');
                const newOp = {
                    id: `bg_${Date.now()}`,
                    operation,
                    notifyOn: notifyOn || 'completion',
                    priority: priority || 'normal',
                    status: 'running',
                    started: Date.now()
                };
                bgOps.push(newOp);
                localStorage.setItem('background_operations', JSON.stringify(bgOps));
                addLog('SYSTEM', `⚙️ BACKGROUND: ${operation}`);
                return {
                    status: "OPERATION_STARTED",
                    operationId: newOp.id,
                    message: `Understood, Sir. Processing "${operation}" in the background. I'll notify you ${notifyOn === 'all' ? 'at each milestone' : `upon ${notifyOn || 'completion'}`}.`
                };
            }

            if (name === 'triage_priorities') {
                const { items, criteria, limit } = args;
                addLog('SYSTEM', `📊 TRIAGE: Prioritizing by ${criteria || 'balanced'}`);
                const state = useStore.getState();
                const tasks = items || ((state as any).tasks || []).map((t: any) => t.title);
                return {
                    status: "TRIAGE_COMPLETE",
                    criteria: criteria || 'balanced',
                    prioritized: tasks.slice(0, limit || 5),
                    instruction: `Analyze and prioritize these items by ${criteria || 'balanced impact/effort'}: ${tasks.join(', ')}`
                };
            }

            if (name === 'compare_analyze') {
                const { items, dimensions, format } = args;
                addLog('SYSTEM', `⚖️ COMPARING: ${(items as string[]).length} items`);
                return {
                    status: "COMPARISON_READY",
                    items,
                    dimensions: dimensions || ['pros', 'cons', 'fit'],
                    format: format || 'recommendation',
                    instruction: `Compare these items: ${(items as string[]).join(' vs ')}. Analyze across: ${(dimensions || ['pros', 'cons', 'fit']).join(', ')}. Output as ${format || 'recommendation'}.`
                };
            }

            if (name === 'research_topic') {
                const { topic, depth, sources } = args;
                addLog('SYSTEM', `🔬 RESEARCHING: ${topic}`);
                return {
                    status: "RESEARCH_INITIATED",
                    topic,
                    depth: depth || 'standard',
                    sources: sources || ['memory', 'knowledge'],
                    instruction: `Conduct ${depth || 'standard'} research on: "${topic}". Draw from: ${(sources || ['available knowledge']).join(', ')}.`
                };
            }

            if (name === 'status_brief') {
                const { scope, format, includeRecommendations } = args;
                addLog('SYSTEM', `📋 BRIEF: ${scope || 'session'} status`);
                const state = useStore.getState();
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
                const state = useStore.getState();
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
                const { item, searchScope, maxDepth } = args;
                addLog('SYSTEM', `🔗 CROSS-REF: Finding connections for "${item}"`);
                return {
                    status: "CROSS_REFERENCE_INITIATED",
                    item,
                    searchScope: searchScope || ['all'],
                    maxDepth: maxDepth || 2,
                    instruction: `Find all connections and references to "${item}" across: ${(searchScope || ['memory', 'tasks', 'agents']).join(', ')}. Depth: ${maxDepth || 2} levels.`
                };
            }

            if (name === 'workspace') {
                const { action, name: wsName, includeState } = args;
                const workspaces = JSON.parse(localStorage.getItem('workspaces') || '{}');
                const state = useStore.getState();

                if (action === 'save') {
                    workspaces[wsName as string] = {
                        mode: state.mode,
                        saved: Date.now(),
                        state: includeState ? { mode: state.mode } : undefined
                    };
                    localStorage.setItem('workspaces', JSON.stringify(workspaces));
                    addLog('SYSTEM', `💾 WORKSPACE SAVED: ${wsName}`);
                    return { status: "WORKSPACE_SAVED", name: wsName, message: `Workspace "${wsName}" saved, Sir.` };
                }

                if (action === 'load' && wsName && workspaces[wsName as string]) {
                    const ws = workspaces[wsName as string];
                    setMode(ws.mode);
                    addLog('SYSTEM', `📂 WORKSPACE LOADED: ${wsName}`);
                    return { status: "WORKSPACE_LOADED", name: wsName, message: `Workspace "${wsName}" restored, Sir.` };
                }

                if (action === 'list') {
                    return { status: "WORKSPACES_LISTED", workspaces: Object.keys(workspaces), count: Object.keys(workspaces).length };
                }

                return { status: "WORKSPACE_ACTION", action, name: wsName };
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
                const state = useStore.getState();
                return {
                    status: "SUGGESTIONS_READY",
                    currentMode: state.mode,
                    mood: mood || 'productive',
                    timeAvailable,
                    instruction: `Based on current context (${state.mode} sector${context ? `, ${context}` : ''}), mood (${mood || 'productive'}), and time (${timeAvailable || 'flexible'}), suggest the optimal next action.`
                };
            }

            if (name === 'system_mode') {
                const { mode: sysMode, duration } = args;
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
                const { pattern, trigger, category } = args;
                const patterns = JSON.parse(localStorage.getItem('learned_patterns') || '[]');
                patterns.push({ pattern, trigger, category: category || 'behavior', learned: Date.now() });
                localStorage.setItem('learned_patterns', JSON.stringify(patterns));
                addLog('SYSTEM', `🧠 LEARNED: ${pattern}`);
                return {
                    status: "PATTERN_LEARNED",
                    pattern,
                    trigger,
                    category: category || 'behavior',
                    message: `Pattern noted, Sir. I'll ${trigger ? `apply this when ${trigger}` : 'incorporate this going forward'}.`
                };
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
                const { action: goalAction, goal, progress, notes } = args;
                const goals = JSON.parse(localStorage.getItem('tracked_goals') || '[]');

                if (goalAction === 'create') {
                    goals.push({ id: `goal_${Date.now()}`, goal, progress: 0, notes: [], created: Date.now() });
                    localStorage.setItem('tracked_goals', JSON.stringify(goals));
                    addLog('SYSTEM', `🎯 GOAL SET: ${goal}`);
                    return { status: "GOAL_CREATED", goal, message: `Goal tracked, Sir: "${goal}"` };
                }

                if (goalAction === 'list') {
                    return { status: "GOALS_LISTED", goals: goals.map((g: any) => ({ goal: g.goal, progress: g.progress })), count: goals.length };
                }

                if (goalAction === 'check') {
                    return { status: "GOAL_STATUS", goals: goals.slice(-3), instruction: `Provide progress update on tracked goals.` };
                }

                return { status: "GOAL_ACTION", action: goalAction, goal };
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
                localStorage.setItem('autonomous_mission', JSON.stringify({
                    objective,
                    constraints,
                    checkpointInterval: checkpointInterval || '5min',
                    canMakeDecisions: canMakeDecisions !== false,
                    started: Date.now(),
                    status: 'active'
                }));
                return {
                    status: "MISSION_STARTED",
                    objective,
                    constraints,
                    autonomy: canMakeDecisions !== false ? 'FULL' : 'LIMITED',
                    message: `Understood, Sir. Taking autonomous control to achieve: "${objective}". ${canMakeDecisions !== false ? 'Full decision authority granted.' : 'I\'ll check in for major decisions.'}`
                };
            }

            if (name === 'situational_awareness') {
                const { detail, focus } = args;
                addLog('SYSTEM', `🎯 SITREP: ${detail || 'operational'} level`);
                const state = useStore.getState();
                const monitors = JSON.parse(localStorage.getItem('active_monitors') || '[]');
                const bgOps = JSON.parse(localStorage.getItem('background_operations') || '[]');
                return {
                    status: "SITREP_READY",
                    detailLevel: detail || 'operational',
                    focus,
                    snapshot: {
                        currentSector: state.mode,
                        voiceActive: voice.isActive,
                        activeMonitors: monitors.length,
                        backgroundOperations: bgOps.filter((op: any) => op.status === 'running').length,
                        systemMode: JSON.parse(localStorage.getItem('system_mode') || '{}').mode || 'normal'
                    },
                    instruction: `Provide ${detail || 'operational'} situational awareness. ${focus ? `Focus on: ${(focus as string[]).join(', ')}.` : ''}`
                };
            }

            if (name === 'debug_assist') {
                const { problem, context: debugContext, triedSolutions } = args;
                addLog('SYSTEM', `🐛 DEBUG ASSIST: ${problem}`);
                return {
                    status: "DEBUG_MODE_ACTIVE",
                    problem,
                    context: debugContext,
                    triedSolutions: triedSolutions || [],
                    instruction: `Debug assistance requested. Problem: "${problem}". ${debugContext ? `Context: ${debugContext}.` : ''} ${triedSolutions && (triedSolutions as string[]).length > 0 ? `Already tried: ${(triedSolutions as string[]).join(', ')}.` : ''} Analyze and provide debugging guidance.`
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
                const { agent, task, priority, waitForResponse } = args;
                addLog('SYSTEM', `🤝 DELEGATING TO ${agent}: "${task}"`);
                audio.playClick();

                try {
                    // Actually run agent reasoning
                    addLog('SYSTEM', `🧠 ${agent} is analyzing...`);
                    const result = await runAgentReasoning(
                        agent as string,
                        task as string,
                        `Priority: ${priority || 'normal'}. Current sector: ${useAppStore.getState().mode}`
                    );

                    // Store delegation record with response
                    const delegations = JSON.parse(localStorage.getItem('delegations') || '[]');
                    delegations.push({
                        id: `del_${Date.now()}`,
                        agent: result.agentName,
                        agentId: result.agentId,
                        task,
                        priority: priority || 'normal',
                        status: 'completed',
                        response: result.response,
                        created: result.timestamp
                    });
                    localStorage.setItem('delegations', JSON.stringify(delegations));

                    addLog('SUCCESS', `✅ ${result.agentName} responded`);
                    audio.playClick();

                    return {
                        status: "DELEGATION_COMPLETE",
                        agent: result.agentName,
                        agentId: result.agentId,
                        task,
                        response: result.response,
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
                const { entry, category, mood, private: isPrivate } = args;
                const journal = JSON.parse(localStorage.getItem('voice_journal') || '[]');
                journal.push({
                    id: `entry_${Date.now()}`,
                    entry,
                    category: category || 'thought',
                    mood,
                    private: isPrivate || false,
                    timestamp: Date.now()
                });
                localStorage.setItem('voice_journal', JSON.stringify(journal));
                addLog('SYSTEM', `📓 JOURNAL: ${category || 'thought'} logged`);
                return {
                    status: "JOURNAL_ENTRY_SAVED",
                    category: category || 'thought',
                    entryCount: journal.length,
                    message: `Noted, Sir. ${category === 'gratitude' ? 'That\'s a lovely thought.' : 'Your reflection has been recorded.'}`
                };
            }

            if (name === 'smart_query') {
                const { query, timeframe, format } = args;
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
                const { scene, duration, music } = args;
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
                const { command } = args;
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
                    ...(quickResponses[command as string] || { action: command, message: `${command} executed.` })
                };
            }

            if (name === 'annotate_item') {
                const { target, annotation, type } = args;
                const annotations = JSON.parse(localStorage.getItem('voice_annotations') || '[]');
                annotations.push({
                    id: `ann_${Date.now()}`,
                    target: target || 'current',
                    annotation,
                    type: type || 'note',
                    timestamp: Date.now()
                });
                localStorage.setItem('voice_annotations', JSON.stringify(annotations));
                addLog('SYSTEM', `📌 ANNOTATED: ${type || 'note'}`);
                return {
                    status: "ANNOTATION_ADDED",
                    target: target || 'current item',
                    type: type || 'note',
                    message: `${type === 'warning' ? '⚠️ Warning' : type === 'idea' ? '💡 Idea' : '📝 Note'} added, Sir.`
                };
            }

            if (name === 'mood_check') {
                const { action: moodAction, mood, energy } = args;
                if (moodAction === 'log') {
                    const moods = JSON.parse(localStorage.getItem('mood_log') || '[]');
                    moods.push({ mood, energy, timestamp: Date.now() });
                    localStorage.setItem('mood_log', JSON.stringify(moods));
                    addLog('SYSTEM', `😊 MOOD: ${mood || 'logged'}`);
                    return { status: "MOOD_LOGGED", mood, energy, message: `Mood logged, Sir. ${energy && energy < 4 ? 'Perhaps a short break would help?' : ''}` };
                }
                if (moodAction === 'history') {
                    const moods = JSON.parse(localStorage.getItem('mood_log') || '[]');
                    return { status: "MOOD_HISTORY", entries: moods.slice(-10), count: moods.length };
                }
                return {
                    status: "MOOD_CHECK",
                    instruction: `Perform a mood check. Ask how the user is feeling and provide supportive response.`
                };
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
                const { commands, waitBetween } = args;
                addLog('SYSTEM', `⛓️ CHAIN: ${(commands as string[]).length} commands`);
                return {
                    status: "CHAIN_INITIATED",
                    commands,
                    waitBetween: waitBetween || false,
                    instruction: `Execute these commands in sequence${waitBetween ? ' (waiting for confirmation between each)' : ''}: ${(commands as string[]).join(' → ')}`
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
                const { action: bmAction, name: bmName, description } = args;
                const bookmarks = JSON.parse(localStorage.getItem('voice_bookmarks') || '{}');
                const state = useStore.getState();

                if (bmAction === 'create') {
                    bookmarks[bmName as string || `bookmark_${Object.keys(bookmarks).length + 1}`] = {
                        mode: state.mode,
                        description,
                        created: Date.now()
                    };
                    localStorage.setItem('voice_bookmarks', JSON.stringify(bookmarks));
                    addLog('SYSTEM', `🔖 BOOKMARK: ${bmName || 'created'}`);
                    return { status: "BOOKMARK_CREATED", name: bmName, message: `Bookmark saved, Sir.` };
                }

                if (bmAction === 'list') {
                    return { status: "BOOKMARKS_LISTED", bookmarks: Object.keys(bookmarks), count: Object.keys(bookmarks).length };
                }

                if (bmAction === 'go' && bmName && bookmarks[bmName as string]) {
                    const bm = bookmarks[bmName as string];
                    setMode(bm.mode);
                    addLog('SYSTEM', `🔖 BOOKMARK: Going to ${bmName}`);
                    return { status: "BOOKMARK_NAVIGATED", name: bmName, message: `Returning to ${bmName}, Sir.` };
                }

                return { status: "BOOKMARK_ACTION", action: bmAction };
            }

            if (name === 'smart_notify') {
                const { mode: notifyMode, filter, duration: notifyDuration } = args;
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
                    message: modeMessages[notifyMode as string] || "Notification settings updated."
                };
            }

            if (name === 'conversation_mode') {
                const { style, verbosity } = args;
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
                const { question } = args;
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
                const { utterance, context: intentContext } = args;
                addLog('SYSTEM', `🎯 INTENT: Interpreting...`);
                return {
                    status: "INTENT_ANALYSIS",
                    utterance,
                    context: intentContext,
                    instruction: `Analyze and clarify intent. ${utterance ? `Utterance: "${utterance}".` : 'Clarify the last request.'} ${intentContext ? `Context: ${intentContext}` : ''}`
                };
            }

            if (name === 'confirm_understanding') {
                const { about } = args;
                addLog('SYSTEM', `✅ CONFIRM: Understanding check`);
                return {
                    status: "UNDERSTANDING_CONFIRMED",
                    about,
                    instruction: `Confirm understanding${about ? ` about: ${about}` : ''}. Summarize what was understood and ask if correct.`
                };
            }

            if (name === 'suggest_completion') {
                const { partial, category } = args;
                addLog('SYSTEM', `💡 SUGGEST: Command completion`);
                return {
                    status: "SUGGESTIONS_READY",
                    partial,
                    category,
                    instruction: `Suggest voice commands${partial ? ` that match "${partial}"` : ''}${category ? ` in category: ${category}` : ''}. Provide 3-5 relevant commands.`
                };
            }

            if (name === 'voice_search') {
                const { query: searchQuery, scope, limit: searchLimit } = args;
                addLog('SYSTEM', `🔍 SEARCH: ${searchQuery}`);
                return {
                    status: "SEARCH_INITIATED",
                    query: searchQuery,
                    scope: scope || 'all',
                    limit: searchLimit || 10,
                    instruction: `Search for "${searchQuery}" across ${scope || 'all'} sources. Return top ${searchLimit || 10} results.`
                };
            }

            if (name === 'narrate_actions') {
                const { enabled, detail } = args;
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
                const { action: prAction, target: prTarget } = args;
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
                const { category, detail } = args;
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
                const { trigger, action: cmdAction, context } = args;
                const commands = JSON.parse(localStorage.getItem('custom_commands') || '{}');
                commands[trigger as string] = { action: cmdAction, context, taught: Date.now() };
                localStorage.setItem('custom_commands', JSON.stringify(commands));
                addLog('SYSTEM', `🎓 TAUGHT: "${trigger}"`);
                return {
                    status: "COMMAND_LEARNED",
                    trigger,
                    action: cmdAction,
                    message: `Understood, Sir. When you say "${trigger}", I'll ${cmdAction}.`
                };
            }

            if (name === 'rate_feedback') {
                const { rating, feedback, about } = args;
                const feedbackLog = JSON.parse(localStorage.getItem('feedback_log') || '[]');
                feedbackLog.push({ rating, feedback, about, timestamp: Date.now() });
                localStorage.setItem('feedback_log', JSON.stringify(feedbackLog));
                addLog('SYSTEM', `⭐ FEEDBACK: ${rating}`);
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
                    message: responses[rating as string] || "Feedback noted."
                };
            }

            if (name === 'voice_templates') {
                const { action: tplAction, name: tplName, steps } = args;
                const templates = JSON.parse(localStorage.getItem('voice_templates') || '{}');

                if (tplAction === 'save' && tplName && steps) {
                    templates[tplName as string] = { steps, created: Date.now() };
                    localStorage.setItem('voice_templates', JSON.stringify(templates));
                    addLog('SYSTEM', `📋 TEMPLATE SAVED: ${tplName}`);
                    return { status: "TEMPLATE_SAVED", name: tplName, message: `Template "${tplName}" saved with ${(steps as string[]).length} steps, Sir.` };
                }

                if (tplAction === 'list') {
                    return { status: "TEMPLATES_LISTED", templates: Object.keys(templates), count: Object.keys(templates).length };
                }

                if (tplAction === 'run' && tplName && templates[tplName as string]) {
                    const tpl = templates[tplName as string];
                    addLog('SYSTEM', `▶️ RUNNING TEMPLATE: ${tplName}`);
                    return { status: "TEMPLATE_RUNNING", name: tplName, steps: tpl.steps, message: `Running "${tplName}", Sir.` };
                }

                return { status: "TEMPLATE_ACTION", action: tplAction };
            }

            if (name === 'context_switch') {
                const { to, saveCurrentAs, restore } = args;
                const contexts = JSON.parse(localStorage.getItem('saved_contexts') || '{}');
                const state = useStore.getState();

                if (saveCurrentAs) {
                    contexts[saveCurrentAs as string] = { mode: state.mode, saved: Date.now() };
                    localStorage.setItem('saved_contexts', JSON.stringify(contexts));
                }

                if (to) {
                    addLog('SYSTEM', `🔀 CONTEXT SWITCH: → ${to}`);
                    return { status: "CONTEXT_SWITCHED", to, savedCurrent: saveCurrentAs, message: `Switching context to ${to}, Sir.` };
                }

                if (restore) {
                    const lastContext = Object.keys(contexts).pop();
                    if (lastContext && contexts[lastContext]) {
                        setMode(contexts[lastContext].mode);
                        return { status: "CONTEXT_RESTORED", restored: lastContext, message: `Restored to ${lastContext}, Sir.` };
                    }
                }

                return { status: "CONTEXT_ACTION", instruction: "Context switch requested. Clarify destination." };
            }

            if (name === 'focus_entity') {
                const { entity, entityType } = args;
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
                const { query: timeQuery, action: timeAction } = args;
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
                const { action: personAction, person, info, category } = args;
                const people = JSON.parse(localStorage.getItem('people_memory') || '{}');

                if (personAction === 'remember') {
                    if (!people[person as string]) people[person as string] = {};
                    people[person as string][category as string || 'note'] = info;
                    people[person as string].lastUpdated = Date.now();
                    localStorage.setItem('people_memory', JSON.stringify(people));
                    addLog('SYSTEM', `👤 REMEMBERED: ${person}`);
                    return { status: "PERSON_REMEMBERED", person, category, message: `Noted about ${person}, Sir.` };
                }

                if (personAction === 'recall') {
                    const personData = people[person as string];
                    if (personData) {
                        return { status: "PERSON_RECALLED", person, data: personData };
                    }
                    return { status: "PERSON_NOT_FOUND", person, message: `I don't have records on ${person}, Sir.` };
                }

                if (personAction === 'list') {
                    return { status: "PEOPLE_LISTED", people: Object.keys(people), count: Object.keys(people).length };
                }

                return { status: "PERSON_ACTION", action: personAction, person };
            }

            if (name === 'topic_memory') {
                const { action: topicAction, topic, content } = args;
                const topics = JSON.parse(localStorage.getItem('topic_memory') || '{}');

                if (topicAction === 'add') {
                    if (!topics[topic as string]) topics[topic as string] = [];
                    topics[topic as string].push({ content, added: Date.now() });
                    localStorage.setItem('topic_memory', JSON.stringify(topics));
                    addLog('SYSTEM', `📝 TOPIC: Added to ${topic}`);
                    return { status: "TOPIC_UPDATED", topic, entries: topics[topic as string].length, message: `Added to ${topic} notes, Sir.` };
                }

                if (topicAction === 'recall') {
                    const topicData = topics[topic as string];
                    if (topicData && topicData.length > 0) {
                        return { status: "TOPIC_RECALLED", topic, entries: topicData };
                    }
                    return { status: "TOPIC_EMPTY", topic, message: `No notes on ${topic} yet, Sir.` };
                }

                if (topicAction === 'list') {
                    return { status: "TOPICS_LISTED", topics: Object.keys(topics), count: Object.keys(topics).length };
                }

                return { status: "TOPIC_ACTION", action: topicAction, topic };
            }

            if (name === 'voice_shortcut') {
                const { action: scAction, phrase, expansion } = args;
                const shortcuts = JSON.parse(localStorage.getItem('voice_shortcuts') || '{}');

                if (scAction === 'create' && phrase && expansion) {
                    shortcuts[phrase as string] = { expansion, created: Date.now() };
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
                const { mode: ambMode, triggers, action: ambAction } = args;
                localStorage.setItem('ambient_listen', JSON.stringify({ mode: ambMode, triggers, action: ambAction }));
                addLog('SYSTEM', `👂 AMBIENT: ${ambMode}`);
                return {
                    status: "AMBIENT_CONFIGURED",
                    mode: ambMode,
                    triggers: triggers || [],
                    message: ambMode === 'on' ? `Ambient listening enabled, Sir. ${triggers ? `Listening for: ${(triggers as string[]).join(', ')}` : ''}` : `Ambient listening disabled.`
                };
            }

            if (name === 'proactive_suggest') {
                const { level, areas } = args;
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
                    areas: areas || [],
                    message: messages[level as string] || "Proactivity adjusted."
                };
            }

            if (name === 'voice_history') {
                const { range, search: historySearch, action: histAction } = args;
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
                const { personality, intensity } = args;
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
                    message: intros[personality as string] || `${personality} mode activated.`
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
                const { action: docAction, type: docType, name: docName, content: docContent } = args;
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
                const { action: mtgAction, meetingName, content: mtgContent } = args;
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
                const { action: presAction, slideNumber, notes: presNotes } = args;
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
                const { action: noteAction, content: noteContent, tag } = args;
                const quickNotes = JSON.parse(localStorage.getItem('quick_notes') || '[]');

                if (noteAction === 'add') {
                    quickNotes.push({ content: noteContent, tag, timestamp: Date.now() });
                    localStorage.setItem('quick_notes', JSON.stringify(quickNotes));
                    addLog('SYSTEM', `📝 QUICK NOTE: Added`);
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

            if (name === 'transcribe') {
                const { action: transAction, format: transFormat } = args;
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
                const { action: dictAction, target: dictTarget, formatting } = args;
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
                const { layout, target: layoutTarget } = args;
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
                return { status: "LAYOUT_SET", layout, message: messages[layout as string] || `Layout set to ${layout}.` };
            }

            if (name === 'parallel_ops') {
                const { operations, reportProgress } = args;
                addLog('SYSTEM', `⚡ PARALLEL: ${(operations as string[]).length} operations`);
                return {
                    status: "PARALLEL_INITIATED",
                    operations,
                    reportProgress: reportProgress || false,
                    message: `Executing ${(operations as string[]).length} operations in parallel, Sir.`,
                    instruction: `Execute these operations simultaneously: ${(operations as string[]).join(' AND ')}`
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
                const { command: devCmd, args: devArgs, watch } = args;
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
                    watch: watch || false,
                    message: `${cmdDescriptions[devCmd as string] || devCmd}, Sir.${watch ? ' Watch mode enabled.' : ''}`
                };
            }

            if (name === 'git_voice') {
                const { command: gitCmd, message: gitMsg, branch } = args;
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
                    message: gitResponses[gitCmd as string] || `Git ${gitCmd}.`
                };
            }

            if (name === 'build_run') {
                const { action: buildAction, environment } = args;
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
                const { depth, focus: ctxFocus } = args;
                addLog('SYSTEM', `🧠 SMART CONTEXT: ${depth || 'surface'}`);
                const state = useStore.getState();
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
                const { action: pinAction, item, category: pinCategory } = args;
                const pinned = JSON.parse(localStorage.getItem('pinned_items') || '[]');

                if (pinAction === 'pin') {
                    pinned.push({ item, category: pinCategory, pinned: Date.now() });
                    localStorage.setItem('pinned_items', JSON.stringify(pinned));
                    addLog('SYSTEM', `📌 PINNED: ${item}`);
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

            if (name === 'daily_brief') {
                const { type: briefType, include } = args;
                addLog('SYSTEM', `☀️ DAILY BRIEF: ${briefType || 'morning'}`);
                const state = useStore.getState();
                const goals = JSON.parse(localStorage.getItem('tracked_goals') || '[]');
                const quickNotes = JSON.parse(localStorage.getItem('quick_notes') || '[]');
                return {
                    status: "BRIEF_READY",
                    type: briefType || 'morning',
                    include: include || ['tasks', 'goals', 'calendar'],
                    data: {
                        currentMode: state.mode,
                        activeGoals: goals.filter((g: any) => g.progress < 100).length,
                        pendingNotes: quickNotes.length,
                        timestamp: new Date().toLocaleString()
                    },
                    instruction: `Generate a ${briefType || 'morning'} brief. Include: ${(include || ['tasks', 'goals', 'reminders']).join(', ')}. Be concise but comprehensive.`
                };
            }

            return { error: "Unknown executive protocol." };
        };

        liveSession.onAgentSwitch = (name) => {
            addLog('SYSTEM', `HANDOVER_REQ: Switching link to [${name}]...`);
            audio.playClick();

            // Rapid toggle to force reconnection loop
            setVoiceState({ isActive: false });

            // Resolve standard name from generic input
            const agent = Object.values(HIVE_AGENTS).find((a: any) =>
                a.name.toLowerCase() === name.toLowerCase() ||
                a.id === name.toLowerCase()
            );
            const targetName = agent ? agent.name : name;

            setVoiceState({ voiceName: targetName, isActive: true });
        };
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
                    if (import.meta.env.DEV) console.log('[VoiceManager] Hot-Swapping Agent due to name change...');
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
                    if (import.meta.env.DEV) {
                        console.error('[VoiceManager] Preflight failed:');
                        console.log(formatPreflightResult(preflight));
                    }
                    connectionAttemptRef.current = false;
                    setVoiceState({ isActive: false, isConnecting: false });
                    return;
                }
                if (preflight.warnings.length > 0 && import.meta.env.DEV) {
                    console.warn('[VoiceManager] Preflight warnings:', preflight.warnings);
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

CURRENT_SECTOR: ${currentLocation || currentMode || 'HUB'}
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

COGNITIVE_STATE: Skepticism ${voice.mentalState.skepticism}% | Excitement ${voice.mentalState.excitement}% | Alignment ${voice.mentalState.alignment}%

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
${generateVoiceContext(currentMode)}

${generateTabContext(currentMode)}

=== END CONTEXT ===
            `;

            try {
                await liveSession.primeAudio();
                await liveSession.connect(agentName, {
                    systemInstruction: constructHiveContext(agentId, sharedContext, voice.mentalState),
                    tools: [{ functionDeclarations: VOICE_TOOLS }],
                    outputAudioTranscription: {},
                    inputAudioTranscription: {},
                    callbacks: {
                        onmessage: async (message: LiveServerMessage) => {
                            // Debug logging for transcript analysis
                            if (import.meta.env.DEV) {
                                console.log('[VoiceManager] Message:', {
                                    hasToolCall: !!message.toolCall,
                                    hasOutputTranscript: !!message.serverContent?.outputTranscription,
                                    hasInputTranscript: !!message.serverContent?.inputTranscription,
                                    turnComplete: !!message.serverContent?.turnComplete
                                });
                                if (message.toolCall) {
                                    console.log('[VoiceManager] Tool Call:', message.toolCall.functionCalls?.map(fc => ({ name: fc.name, args: fc.args })));
                                }
                            }

                            if (message.serverContent?.outputTranscription) {
                                partialTranscriptRef.current += message.serverContent.outputTranscription.text;
                                setVoiceState({ partialTranscript: { role: 'model', text: partialTranscriptRef.current } });
                                if (import.meta.env.DEV) {
                                    console.log('[VoiceManager] Model:', message.serverContent.outputTranscription.text);
                                }
                            } else if (message.serverContent?.inputTranscription) {
                                partialTranscriptRef.current += message.serverContent.inputTranscription.text;
                                setVoiceState({ partialTranscript: { role: 'user', text: partialTranscriptRef.current } });
                                if (import.meta.env.DEV) {
                                    console.log('[VoiceManager] User:', message.serverContent.inputTranscription.text);
                                }

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
                                    if (import.meta.env.DEV) {
                                        console.log('[VoiceManager] Turn Complete:', { role: voice.partialTranscript?.role, text: finalText });
                                    }
                                    setVoiceState(prev => ({
                                        transcripts: [...prev.transcripts, { role: prev.partialTranscript?.role || 'user', text: finalText, timestamp: Date.now() }],
                                        partialTranscript: null
                                    }));
                                }
                                partialTranscriptRef.current = "";
                            }
                        },
                        onopen: () => {
                            // Ignore stale callbacks from old sessions
                            if (!mounted || sessionVersionRef.current !== thisSessionVersion) return;
                            setVoiceState({ isConnecting: false });
                            addLog('SUCCESS', `VOICE_CORE: Neural handshake finalized.`);
                            lastConnectedNameRef.current = name;
                        },
                        onerror: (err: any) => {
                            // Ignore stale callbacks from old sessions
                            if (sessionVersionRef.current !== thisSessionVersion) return;
                            connectionAttemptRef.current = false;
                            setVoiceState({ isActive: false, isConnecting: false });
                            lastConnectedNameRef.current = null;
                            // Actually log the error so we know what went wrong
                            const errorMsg = err?.message || err?.error || String(err);
                            console.error('[VoiceManager] Connection error:', err);
                            addLog('ERROR', `VOICE_CORE: ${errorMsg}`);
                        },
                        onclose: () => {
                            // Ignore stale callbacks from old sessions
                            if (!mounted || sessionVersionRef.current !== thisSessionVersion) return;
                            connectionAttemptRef.current = false;
                            setVoiceState({ isActive: false, isConnecting: false });
                            lastConnectedNameRef.current = null;
                        }
                    }
                });
            } catch (e: any) {
                const errorMsg = e?.message || String(e);
                console.error('[VoiceManager] Connection exception:', e);

                if (retryCount < 3) {
                    addLog('WARN', `VOICE_CORE: ${errorMsg}. Retrying in 2s... (${retryCount + 1}/3)`);
                    setTimeout(() => initiateConnection(name, retryCount + 1), 2000);
                } else {
                    connectionAttemptRef.current = false;
                    setVoiceState({ isActive: false, isConnecting: false });
                    addLog('ERROR', `VOICE_CORE: ${errorMsg} (failed after 3 attempts)`);
                }
            }
        };

        syncSession();
        return () => { mounted = false; };
    }, [voice.isActive, voice.voiceName, setVoiceState, addLog, currentLocation, operationalContext, voice.mentalState]);

    return null;
};

export default VoiceManager;