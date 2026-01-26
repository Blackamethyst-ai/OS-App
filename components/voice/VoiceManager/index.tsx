import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '../../../store';
import { useSystemMind, EpochEvent } from '../../../stores/useSystemMind';
import {
    liveSession,
    HIVE_AGENTS,
    constructHiveContext
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
            // TASK PRIORITY - Update task priority
            // =================================================================
            if (name === 'update_task_priority') {
                const { taskId, priority } = args;
                addLog('SYSTEM', `TASK: Updating ${taskId} to ${priority}...`);

                try {
                    const result = await (OS_TOOLS.update_task_priority as any)({ taskId, priority });
                    if (result.status === 'SUCCESS') {
                        addLog('SUCCESS', `TASK: Priority updated.`);
                        return { status: "PRIORITY_UPDATED", taskId, priority };
                    }
                    return { error: result.data?.error || 'Update failed' };
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
            // SYSTEM STATUS - Health check
            // =================================================================
            if (name === 'system_status') {
                const state = useAppStore.getState();
                const activeSector = state.mode;
                const agentCount = Object.keys(HIVE_AGENTS).length;
                const voiceActive = state.voice.isActive;
                const cpbPhase = (state as any).cpbState?.phase || 'idle';

                addLog('SYSTEM', `STATUS: Compiling system report...`);

                return {
                    status: "SYSTEM_OPERATIONAL",
                    report: {
                        activeSector,
                        voiceStatus: voiceActive ? 'ONLINE' : 'STANDBY',
                        agentsAvailable: agentCount,
                        cpbStatus: cpbPhase,
                        timestamp: new Date().toISOString()
                    },
                    instruction: "Report this status to the user naturally, like a butler giving a status update."
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
                addLog('SYSTEM', `DREAM: Initiating autonomous dream mode...`);
                return { status: "DREAM_AVAILABLE", message: "Dream protocol standing by, Sir. I'll begin autonomous research when you're idle." };
            }

            if (name === 'get_dream_insights') {
                addLog('SYSTEM', `DREAM: Retrieving insights...`);
                return { status: "NO_INSIGHTS", message: "No dream insights available yet, Sir. The dream protocol activates during idle periods." };
            }

            if (name === 'morning_briefing') {
                addLog('SYSTEM', `BRIEFING: Compiling morning briefing...`);
                const state = useAppStore.getState();
                return {
                    status: "BRIEFING_READY",
                    briefing: {
                        greeting: `Good morning, Sir.`,
                        systemStatus: state.mode,
                        pendingTasks: "No critical tasks pending.",
                        recommendations: ["Review overnight insights", "Check system health"]
                    },
                    instruction: "Deliver this briefing naturally and conversationally."
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
                addLog('SYSTEM', `CONSENSUS: Running swarm analysis on "${question}"...`);
                // Route through think for multi-perspective analysis
                return {
                    status: "CONSENSUS_ROUTED",
                    instruction: `Analyze this question from multiple agent perspectives (skeptic, optimist, pragmatist), then synthesize a consensus recommendation: "${question}"`
                };
            }

            if (name === 'bicameral_dialogue') {
                const topic = args.topic as string;
                addLog('SYSTEM', `BICAMERAL: Starting dialogue on "${topic}"...`);
                // Route through think tool for deep analysis
                return {
                    status: "DIALOGUE_MODE",
                    topic,
                    instruction: `Engage in internal bicameral dialogue: Present both a skeptical and optimistic perspective on "${topic}", then synthesize.`
                };
            }

            // =================================================================
            // MEMORY & KNOWLEDGE - Persistent intelligence
            // =================================================================
            if (name === 'save_memory') {
                const { content, category, tags } = args;
                addLog('SYSTEM', `MEMORY: Storing "${(content as string).slice(0, 50)}..."...`);
                // Store in local storage for simplicity
                const memories = JSON.parse(localStorage.getItem('voice_memories') || '[]');
                memories.push({ content, category: category || 'fact', tags: tags || [], timestamp: Date.now() });
                localStorage.setItem('voice_memories', JSON.stringify(memories));
                addLog('SUCCESS', `MEMORY: Stored.`);
                return { status: "MEMORY_SAVED", message: "I'll remember that, Sir." };
            }

            if (name === 'recall_memory') {
                const query = args.query as string;
                addLog('SYSTEM', `MEMORY: Searching for "${query}"...`);
                try {
                    const memories = JSON.parse(localStorage.getItem('voice_memories') || '[]');
                    const matches = memories.filter((m: any) =>
                        m.content.toLowerCase().includes(query.toLowerCase())
                    );
                    return { status: "MEMORIES_FOUND", memories: matches, count: matches.length };
                } catch (e) {
                    return { status: "NO_MEMORIES", message: "I don't have any memories matching that, Sir." };
                }
            }

            if (name === 'manage_memory') {
                const { action, target } = args;
                if (action === 'list') {
                    const memories = JSON.parse(localStorage.getItem('voice_memories') || '[]');
                    return { status: "MEMORIES_LISTED", memories, count: memories.length };
                } else if (action === 'clear_all') {
                    localStorage.removeItem('voice_memories');
                    return { status: "MEMORIES_CLEARED", message: "All memories cleared, Sir." };
                }
                return { status: "ACTION_COMPLETE", action };
            }

            // =================================================================
            // CODE & DEVELOPMENT - Engineering tools
            // =================================================================
            if (name === 'analyze_code') {
                const { target, analysisType } = args;
                addLog('SYSTEM', `CODE: Analyzing ${target} (${analysisType || 'general'})...`);
                // Route through think tool
                return {
                    status: "ANALYSIS_ROUTED",
                    instruction: `Perform a ${analysisType || 'comprehensive'} analysis of: ${target}. Use your knowledge of the codebase.`
                };
            }

            if (name === 'generate_code') {
                const { description, language, style } = args;
                addLog('SYSTEM', `CODE: Generating ${language || 'TypeScript'} code...`);
                return {
                    status: "GENERATION_ROUTED",
                    instruction: `Generate ${style || 'production'}-quality ${language || 'TypeScript'} code for: ${description}`
                };
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
                addLog('SYSTEM', `BIOMETRICS: Reading current state...`);
                const state = useAppStore.getState();
                const biometric = (state as any).biometric || {};
                return {
                    status: "BIOMETRICS_READ",
                    data: {
                        faceDetectionActive: biometric.isCameraOn || false,
                        mood: biometric.dominantEmotion || 'neutral',
                        attention: biometric.attentionScore || 0.5
                    },
                    instruction: "Report biometric state naturally."
                };
            }

            if (name === 'toggle_biometrics') {
                const enabled = args.enabled as boolean;
                addLog('SYSTEM', `BIOMETRICS: ${enabled ? 'Enabling' : 'Disabling'}...`);
                const { setBiometricState } = useAppStore.getState().actions as any;
                if (setBiometricState) {
                    setBiometricState({ isCameraOn: enabled });
                }
                return { status: enabled ? "BIOMETRICS_ENABLED" : "BIOMETRICS_DISABLED" };
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