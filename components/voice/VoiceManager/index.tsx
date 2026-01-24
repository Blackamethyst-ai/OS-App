import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '../../../store';
import { useSystemMind, EpochEvent } from '../../../stores/useSystemMind';
import {
    liveSession,
    HIVE_AGENTS,
    constructHiveContext
} from '../../../services/geminiService';
import { voiceNexus, analyzeComplexity } from '../../../services/voiceNexus';
import { OS_TOOLS } from '../../../services/toolRegistry';
import { AppMode } from '../../../types';
import { FunctionDeclaration, Type, LiveServerMessage } from '@google/genai';
import { audio } from '../../../services/audioService';
import { CODEBASE_KNOWLEDGE, buildCodebaseContext } from '../../../services/archon';
import { getFullSystemContext, getSectorContext } from '../../../services/voiceUIContext';
import { universalVoice, fillInput, clickButton, selectOption, scanInteractiveElements } from '../../../services/universalVoiceHooks';
import { initializeVoiceActions, generateActionContext, getVoiceActions } from '../../../services/voiceActionRegistry';
import { initializeComponentActions, generateComponentActionContext } from '../../../services/componentActionRegistry';
import { navigateToTab, generateTabContext, parseTabNavigation, TAB_REGISTRY } from '../../../services/tabNavigationRegistry';
import { initializeUnifiedRegistry, routeQuery, executeQuery, generateVoiceContext } from '../../../services/unifiedActionRegistry';
import type { CPBPath } from '../../../services/cognitivePrecisionBridge/types';

const navigateTool: FunctionDeclaration = {
    name: 'navigate_to_sector',
    description: 'Instantly moves the entire user interface and the OS focus to a specific sector. Triggers a cinematic sector shift. Use this whenever the user expresses a desire to move, switch, or view another part of the app.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            target_sector: {
                type: Type.STRING,
                enum: Object.values(AppMode),
                description: 'The machine-readable ID of the sector to migrate focus to.'
            }
        },
        required: ['target_sector']
    }
};

const synthesizeTopologyTool: FunctionDeclaration = {
    name: 'synthesize_topology',
    description: 'Generates a high-fidelity PARA drive taxonomy or cloud system architecture blueprint based on verbal requirements.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            description: { type: Type.STRING, description: 'Natural language user requirements.' },
            type: { type: Type.STRING, enum: ['DRIVE_ORGANIZATION', 'SYSTEM_ARCHITECTURE'], description: 'Domain of the structural synthesis.' }
        },
        required: ['description', 'type']
    }
};

const recalibrateDnaTool: FunctionDeclaration = {
    name: 'recalibrate_dna',
    description: 'Dynamically adjusts the agents internal cognitive biases (skepticism, excitement, alignment).',
    parameters: {
        type: Type.OBJECT,
        properties: {
            agentId: { type: Type.STRING, description: 'ID of the agent node to recalibrate.' },
            skepticism: { type: Type.NUMBER, description: 'Filter intensity (0-100).' },
            excitement: { type: Type.NUMBER, description: 'Generative reach (0-100).' },
            alignment: { type: Type.NUMBER, description: 'Directive stability (0-100).' }
        },
        required: ['agentId']
    }
};

const switchAgentTool: FunctionDeclaration = {
    name: "switch_agent",
    description: "Switch the active voice session to another agent. Use this when the user asks to speak to someone else (e.g. Dr. Ira, Caleb) or needs different expertise.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            agentName: { type: Type.STRING, description: "The name of the agent to switch to (e.g. 'Dr. Ira', 'Caleb', 'Mike', 'Noah')." }
        },
        required: ["agentName"]
    }
};

const executeActionTool: FunctionDeclaration = {
    name: "execute_component_action",
    description: "Execute a registered UI action. Use this to interact with UI elements like submitting forms, running queries, generating content, etc. First call get_available_actions to see what actions are available in the current view.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            action_id: { type: Type.STRING, description: "The ID of the action to execute (from available_actions list)" },
            args: { type: Type.OBJECT, description: "Arguments to pass to the action (varies by action type)" }
        },
        required: ["action_id"]
    }
};

const getAvailableActionsTool: FunctionDeclaration = {
    name: "get_available_actions",
    description: "Get a list of all available UI actions in the current view. Call this before execute_component_action to know what actions you can perform.",
    parameters: {
        type: Type.OBJECT,
        properties: {},
        required: []
    }
};

const inputTextTool: FunctionDeclaration = {
    name: "input_text",
    description: "Input text into a specific UI field. Use this when the user asks you to type, enter, or input text into a form field, text area, or input box.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            field_id: { type: Type.STRING, description: "The ID or name of the input field (e.g., 'mission-objective', 'query-input', 'directive-input')" },
            text: { type: Type.STRING, description: "The text to input into the field" }
        },
        required: ["field_id", "text"]
    }
};

const getUIContextTool: FunctionDeclaration = {
    name: "get_ui_context",
    description: "Get the current UI state including visible data, available actions, and input fields. Use this to understand what you can interact with.",
    parameters: {
        type: Type.OBJECT,
        properties: {},
        required: []
    }
};

const clickElementTool: FunctionDeclaration = {
    name: "click_element",
    description: "Click any button, tab, or link in the UI. Use this when user asks to click, press, activate, run, submit, or trigger something.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            target: { type: Type.STRING, description: "The button/tab/link to click (by label, ID, or description)" }
        },
        required: ["target"]
    }
};

const selectOptionTool: FunctionDeclaration = {
    name: "select_option",
    description: "Select an option from a dropdown menu.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            dropdown: { type: Type.STRING, description: "The dropdown to select from (by label or ID)" },
            option: { type: Type.STRING, description: "The option to select (by text or value)" }
        },
        required: ["dropdown", "option"]
    }
};

const scanUITool: FunctionDeclaration = {
    name: "scan_ui",
    description: "Scan the current view and return ALL interactive elements (inputs, buttons, tabs, links, dropdowns). Use this to discover what you can interact with.",
    parameters: {
        type: Type.OBJECT,
        properties: {},
        required: []
    }
};

const navigateToTabTool: FunctionDeclaration = {
    name: "navigate_to_tab",
    description: "Navigate to a specific tab or subtab within any sector. Use this for precise tab navigation like 'go to Nexus', 'open the cascade tab', 'show DNA builder'. This handles all tabs, subtabs, and sector navigation automatically.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            query: { type: Type.STRING, description: "Natural language navigation query (e.g., 'nexus', 'cascade in CPB', 'DNA tab', 'discovery lab')" }
        },
        required: ["query"]
    }
};

// =============================================================================
// SYNCHRONIZED CLOCK TOOL - Allows voice AI to detect stale context
// =============================================================================
const refreshContextTool: FunctionDeclaration = {
    name: "refresh_context",
    description: "Check if the context has become stale (sector changed, new actions available) and get fresh action list. Use this when: 1) User mentions something that doesn't match your current view, 2) After navigating to a new sector, 3) If actions seem outdated. Returns current epoch, sector, and top relevant actions.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            reason: { type: Type.STRING, description: "Why you're refreshing context (e.g., 'sector_changed', 'stale_actions', 'user_request')" }
        },
        required: []
    }
};

// =============================================================================
// THINK TOOL - Primary entry point for complex reasoning (routes through CPB)
// =============================================================================
const thinkTool: FunctionDeclaration = {
    name: "think",
    description: `REQUIRED FOR COMPLEX TASKS. Use this tool BEFORE answering when user asks you to:
- Analyze anything (code, architecture, systems, data)
- Generate or create something (code, plans, designs)
- Decide between options or evaluate trade-offs
- Research or investigate something
- Solve problems or debug issues

This routes your reasoning through the Cognitive Precision Bridge for higher quality responses.
Returns a well-reasoned response with quality scoring.

DO NOT answer complex questions directly - always use this tool first to think through them.`,
    parameters: {
        type: Type.OBJECT,
        properties: {
            task: { type: Type.STRING, description: "What the user is asking you to do (summarize their request)" },
            context: { type: Type.STRING, description: "Relevant context from the conversation or current view" }
        },
        required: ["task"]
    }
};

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

    // Initialize all voice and component actions on mount
    useEffect(() => {
        initializeVoiceActions();
        initializeComponentActions();
        // Initialize unified registry (merges all action sources with CPB routing)
        initializeUnifiedRegistry().catch(err => {
            console.error('[VoiceManager] Failed to initialize unified registry:', err);
        });
    }, []);

    // Subscribe to epoch changes for synchronized clock awareness
    useEffect(() => {
        const unsubscribe = subscribeToEpoch((event: EpochEvent) => {
            // If we have an active voice session, track the change
            if (voice.isSessionActive) {
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
    }, [voice.isSessionActive, addLog, subscribeToEpoch]);

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
                            addLog('ERROR', `VOICE_EXECUTIVE: CPB execution failed: ${cpbResult.output?.error}`);
                            return { error: cpbResult.output?.error, actionId };
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
                            response: result.output?.error || "Could not fully process the request",
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
=== VOICE CORE EXECUTIVE CONTEXT ===

OS_STATUS: Active in sector [${currentLocation || currentMode || 'HUB'}]
SYNC_EPOCH: ${startingEpoch} (use refresh_context if actions seem stale)
DOMAINS: Full UI Sector Control + Codebase Awareness + UI Interaction
DIRECTIVE: You are an executive-tier OS assistant with DIRECT UI CONTROL capabilities.

CRITICAL UI INTERACTION RULES:
1. When user asks to "input text" or "type" or "enter" something, use input_text tool
2. When user asks to "click", "press", "run", "submit", or trigger something, use click_element tool
3. When user asks to "select" from a dropdown, use select_option tool
4. When unsure what's available, call scan_ui to see ALL interactive elements
5. Use execute_component_action for registered component actions
6. ALWAYS use the tools to ACTUALLY interact - don't just describe what you would do

UNIVERSAL UI CONTROL (you can interact with ANY element):
- scan_ui: Discover all inputs, buttons, tabs, links in current view
- input_text: Fill ANY text input or textarea
- click_element: Click ANY button, tab, or link
- select_option: Select from ANY dropdown
- navigate_to_sector: Navigate to any app sector (use for major sector changes)
- navigate_to_tab: Navigate to specific tabs/subtabs within sectors (use for precise tab navigation like "nexus", "cascade", "discovery")
- execute_component_action: Trigger registered component actions
- get_ui_context: Get full UI state snapshot

CRITICAL - THINK BEFORE ANSWERING:
- For ANY complex request (analyze, generate, decide, research, solve), FIRST call the "think" tool
- The think tool routes your reasoning through the Cognitive Precision Bridge
- This gives you higher quality, validated responses with quality scores
- Example: User says "analyze the auth flow" → call think(task="analyze the authentication flow")
- Example: User says "how should I structure this?" → call think(task="recommend architecture structure")
- Simple requests (navigate, click, input text) don't need think - use direct tools

TAB NAVIGATION (use navigate_to_tab for precise navigation):
- "go to nexus" → Nexus Matrix (API explorer)
- "open cascade" → CPB > Cascade tab
- "discovery lab" → Research > Discovery Lab
- "show DNA builder" → Research > DNA Builder
- "bicameral" → Research > Bicameral Swarm
- "yield operations" → Treasury > Yield Operations

WORKFLOW FOR UI REQUESTS:
1. User says "enter text X" → call input_text with field identifier and text
2. User says "click Y" → call click_element with target name
3. User says "what can I do" → call scan_ui and describe the elements
4. User says "submit" or "run" → call click_element targeting submit/run button

MENTAL_STATE: DNA weights S:${voice.mentalState.skepticism}, E:${voice.mentalState.excitement}, A:${voice.mentalState.alignment}

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

=== SEMANTIC VOICE ACTIONS ===
Use execute_component_action with these IDs for complex operations:
${generateActionContext()}

=== COMPONENT-SPECIFIC ACTIONS ===
Every UI component action, organized by component:
${generateComponentActionContext()}

${generateTabContext(currentMode)}

=== END CONTEXT ===
            `;

            try {
                await liveSession.primeAudio();
                await liveSession.connect(agentName, {
                    systemInstruction: constructHiveContext(agentId, sharedContext, voice.mentalState),
                    tools: [{ functionDeclarations: [thinkTool, navigateTool, synthesizeTopologyTool, recalibrateDnaTool, switchAgentTool, executeActionTool, getAvailableActionsTool, inputTextTool, getUIContextTool, clickElementTool, selectOptionTool, scanUITool, navigateToTabTool, refreshContextTool] }],
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
            } catch (e) {
                if (retryCount < 3) {
                    addLog('WARN', `VOICE_CORE: Connection failed. Retrying in 2s... (${retryCount + 1}/3)`);
                    setTimeout(() => initiateConnection(name, retryCount + 1), 2000);
                } else {
                    connectionAttemptRef.current = false;
                    setVoiceState({ isActive: false, isConnecting: false });
                    addLog('ERROR', 'VOICE_CORE: Connection failed after multiple attempts.');
                }
            }
        };

        syncSession();
        return () => { mounted = false; };
    }, [voice.isActive, voice.voiceName, setVoiceState, addLog, currentLocation, operationalContext, voice.mentalState]);

    return null;
};

export default VoiceManager;