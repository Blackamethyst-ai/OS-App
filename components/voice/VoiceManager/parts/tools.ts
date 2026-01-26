/**
 * VoiceManager - Tool Declarations
 *
 * FunctionDeclaration definitions for Gemini Live API tools.
 * These tools enable voice-driven UI interaction and navigation.
 */

import { FunctionDeclaration, Type } from '@google/genai';
import { AppMode } from '../../../../types';

/**
 * Navigate to a specific sector in the app.
 */
export const navigateTool: FunctionDeclaration = {
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

/**
 * Generate drive taxonomy or system architecture blueprints.
 */
export const synthesizeTopologyTool: FunctionDeclaration = {
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

/**
 * Adjust agent cognitive biases.
 */
export const recalibrateDnaTool: FunctionDeclaration = {
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

/**
 * Switch to a different voice agent.
 */
export const switchAgentTool: FunctionDeclaration = {
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

/**
 * Execute a registered UI action.
 */
export const executeActionTool: FunctionDeclaration = {
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

/**
 * Get list of available UI actions.
 */
export const getAvailableActionsTool: FunctionDeclaration = {
    name: "get_available_actions",
    description: "Get a list of all available UI actions in the current view. Call this before execute_component_action to know what actions you can perform.",
    parameters: {
        type: Type.OBJECT,
        properties: {},
        required: []
    }
};

/**
 * Input text into a UI field.
 */
export const inputTextTool: FunctionDeclaration = {
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

/**
 * Get current UI state.
 */
export const getUIContextTool: FunctionDeclaration = {
    name: "get_ui_context",
    description: "Get the current UI state including visible data, available actions, and input fields. Use this to understand what you can interact with.",
    parameters: {
        type: Type.OBJECT,
        properties: {},
        required: []
    }
};

/**
 * Click a button, tab, or link.
 */
export const clickElementTool: FunctionDeclaration = {
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

/**
 * Select from a dropdown.
 */
export const selectOptionTool: FunctionDeclaration = {
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

/**
 * Scan UI for interactive elements.
 */
export const scanUITool: FunctionDeclaration = {
    name: "scan_ui",
    description: "Scan the current view and return ALL interactive elements (inputs, buttons, tabs, links, dropdowns). Use this to discover what you can interact with.",
    parameters: {
        type: Type.OBJECT,
        properties: {},
        required: []
    }
};

/**
 * Navigate to a specific tab.
 */
export const navigateToTabTool: FunctionDeclaration = {
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

/**
 * Refresh context for synchronized clock.
 */
export const refreshContextTool: FunctionDeclaration = {
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

/**
 * Think tool for complex reasoning through CPB.
 */
export const thinkTool: FunctionDeclaration = {
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

/**
 * Search for real-time information via grounded intelligence.
 */
export const searchIntelTool: FunctionDeclaration = {
    name: "search_intel",
    description: "Search for real-time information, news, documentation, or any query that needs current data. Uses grounded search intelligence. Use this when user asks about current events, wants to look something up, or needs information you don't have.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            query: { type: Type.STRING, description: "The search query" }
        },
        required: ["query"]
    }
};

/**
 * Converge multiple strategic concepts into unified synthesis.
 */
export const convergeLatticesTool: FunctionDeclaration = {
    name: "converge_lattices",
    description: "Synthesize and converge multiple strategic concepts, ideas, or architectural patterns into a unified coherent framework. Use when user wants to combine ideas, merge strategies, or create synthesis from multiple inputs.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            targetGoal: { type: Type.STRING, description: "The goal or outcome to converge toward" }
        },
        required: ["targetGoal"]
    }
};

/**
 * Update task priority in the system.
 */
export const updateTaskPriorityTool: FunctionDeclaration = {
    name: "update_task_priority",
    description: "Change the priority of a task in the task management system. Use when user wants to reprioritize, escalate, or deprioritize tasks.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            taskId: { type: Type.STRING, description: "The ID of the task to update" },
            priority: { type: Type.STRING, enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"], description: "The new priority level" }
        },
        required: ["taskId", "priority"]
    }
};

/**
 * Submit a structural change proposal to the swarm.
 */
export const proposeChangeTool: FunctionDeclaration = {
    name: "propose_change",
    description: "Submit a structural change proposal for swarm review. Use when you or the user want to propose optimizations, expansions, or security improvements to the system architecture.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            type: { type: Type.STRING, enum: ["OPTIMIZATION", "EXPANSION", "SECURITY"], description: "Type of structural change" },
            title: { type: Type.STRING, description: "Brief title for the proposal" },
            description: { type: Type.STRING, description: "Detailed description of the proposed change" },
            impact: { type: Type.STRING, description: "Expected impact of the change" }
        },
        required: ["type", "title", "description"]
    }
};

/**
 * Get system status and health metrics.
 */
export const systemStatusTool: FunctionDeclaration = {
    name: "system_status",
    description: "Get current system status, health metrics, active processes, and operational state. Use when user asks 'how are systems', 'status report', 'what's running', or wants a general health check.",
    parameters: {
        type: Type.OBJECT,
        properties: {},
        required: []
    }
};

/**
 * Set a reminder or timer.
 */
export const setReminderTool: FunctionDeclaration = {
    name: "set_reminder",
    description: "Set a reminder or timer for the user. Use when user says 'remind me', 'set a timer', 'alert me in X minutes', etc.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            message: { type: Type.STRING, description: "What to remind the user about" },
            delayMinutes: { type: Type.NUMBER, description: "Minutes from now to trigger the reminder" }
        },
        required: ["message", "delayMinutes"]
    }
};

// =============================================================================
// DREAM PROTOCOL - Autonomous Background Intelligence
// =============================================================================

/**
 * Activate dream mode for autonomous research.
 */
export const startDreamingTool: FunctionDeclaration = {
    name: "start_dreaming",
    description: "Activate autonomous dream mode. The OS will run background research, pattern analysis, and insight generation while idle. Use when user says 'start dreaming', 'background research', 'autonomous mode'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            focusArea: { type: Type.STRING, description: "Optional area to focus dream research on" }
        },
        required: []
    }
};

/**
 * Get dream insights from last session.
 */
export const getDreamInsightsTool: FunctionDeclaration = {
    name: "get_dream_insights",
    description: "Retrieve insights from the last dream session. Use when user asks 'what did you find', 'dream results', 'any insights'.",
    parameters: {
        type: Type.OBJECT,
        properties: {},
        required: []
    }
};

/**
 * Get morning briefing.
 */
export const morningBriefingTool: FunctionDeclaration = {
    name: "morning_briefing",
    description: "Generate a comprehensive morning briefing with overnight insights, priorities, and recommendations. Use when user says 'morning briefing', 'daily summary', 'what do I need to know'.",
    parameters: {
        type: Type.OBJECT,
        properties: {},
        required: []
    }
};

// =============================================================================
// MULTI-AGENT REASONING - Swarm Intelligence
// =============================================================================

/**
 * Decompose a complex goal into atomic tasks.
 */
export const decomposeTaskTool: FunctionDeclaration = {
    name: "decompose_task",
    description: "Break down a complex goal into atomic, executable sub-tasks. Use for complex problems that need structured decomposition. Say 'break this down', 'decompose this goal', 'create a task breakdown'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            goal: { type: Type.STRING, description: "The complex goal to decompose" }
        },
        required: ["goal"]
    }
};

/**
 * Run multi-agent consensus on a decision.
 */
export const runConsensusTool: FunctionDeclaration = {
    name: "run_consensus",
    description: "Run a multi-agent swarm consensus to reach a decision. Multiple AI agents debate and vote. Use for important decisions: 'get consensus on this', 'what do the agents think', 'swarm vote'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            question: { type: Type.STRING, description: "The question or decision to reach consensus on" },
            options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Optional: specific options to vote on" }
        },
        required: ["question"]
    }
};

/**
 * Start a bicameral dialogue between two AI perspectives.
 */
export const bicameralDialogueTool: FunctionDeclaration = {
    name: "bicameral_dialogue",
    description: "Start a bicameral dialogue - two AI perspectives (skeptic vs optimist, or custom) debate a topic. Use for nuanced analysis: 'debate this', 'bicameral analysis', 'two perspectives on'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            topic: { type: Type.STRING, description: "The topic to debate" },
            perspective1: { type: Type.STRING, description: "First perspective (default: skeptic)" },
            perspective2: { type: Type.STRING, description: "Second perspective (default: optimist)" }
        },
        required: ["topic"]
    }
};

// =============================================================================
// MEMORY & KNOWLEDGE - Persistent Intelligence
// =============================================================================

/**
 * Save something to long-term memory.
 */
export const saveMemoryTool: FunctionDeclaration = {
    name: "save_memory",
    description: "Save important information to long-term memory. Use when user says 'remember this', 'save this', 'store this for later', 'don't forget'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            content: { type: Type.STRING, description: "The information to remember" },
            category: { type: Type.STRING, enum: ["fact", "preference", "decision", "insight", "task"], description: "Category of memory" },
            tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Tags for retrieval" }
        },
        required: ["content"]
    }
};

/**
 * Recall from memory.
 */
export const recallMemoryTool: FunctionDeclaration = {
    name: "recall_memory",
    description: "Search and recall from long-term memory. Use when user asks 'what did I say about', 'do you remember', 'recall', 'what do you know about'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            query: { type: Type.STRING, description: "What to search for in memory" }
        },
        required: ["query"]
    }
};

/**
 * Clear or manage memories.
 */
export const manageMemoryTool: FunctionDeclaration = {
    name: "manage_memory",
    description: "Manage memories - list, clear, or organize. Use when user says 'what do you remember', 'clear memories', 'forget about X'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            action: { type: Type.STRING, enum: ["list", "clear_all", "clear_category", "forget"], description: "Action to take" },
            target: { type: Type.STRING, description: "Target for clear_category or forget actions" }
        },
        required: ["action"]
    }
};

// =============================================================================
// CODE & DEVELOPMENT - Engineering Tools
// =============================================================================

/**
 * Analyze code structure or architecture.
 */
export const analyzeCodeTool: FunctionDeclaration = {
    name: "analyze_code",
    description: "Analyze code, architecture, or technical concepts. Routes through CPB for deep analysis. Use when user wants code review, architecture analysis, or technical deep-dive.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            target: { type: Type.STRING, description: "What to analyze (file, component, system, concept)" },
            analysisType: { type: Type.STRING, enum: ["architecture", "security", "performance", "quality", "dependencies"], description: "Type of analysis" }
        },
        required: ["target"]
    }
};

/**
 * Generate code or technical artifacts.
 */
export const generateCodeTool: FunctionDeclaration = {
    name: "generate_code",
    description: "Generate code, components, functions, or technical artifacts. Use when user says 'write code for', 'generate a function', 'create a component'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            description: { type: Type.STRING, description: "What to generate" },
            language: { type: Type.STRING, description: "Programming language (default: TypeScript)" },
            style: { type: Type.STRING, enum: ["minimal", "documented", "production"], description: "Code style" }
        },
        required: ["description"]
    }
};

// =============================================================================
// DATA & EXPORT - Information Management
// =============================================================================

/**
 * Export data or generate reports.
 */
export const exportDataTool: FunctionDeclaration = {
    name: "export_data",
    description: "Export data, generate reports, or create summaries. Use when user says 'export this', 'generate a report', 'summarize the data', 'create a CSV'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            dataType: { type: Type.STRING, enum: ["logs", "transcripts", "insights", "tasks", "session"], description: "Type of data to export" },
            format: { type: Type.STRING, enum: ["json", "csv", "markdown", "summary"], description: "Export format" }
        },
        required: ["dataType"]
    }
};

/**
 * Save current state/snapshot.
 */
export const saveSnapshotTool: FunctionDeclaration = {
    name: "save_snapshot",
    description: "Save a snapshot of current state for later restoration. Use when user says 'save state', 'checkpoint', 'save progress', 'bookmark this'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            label: { type: Type.STRING, description: "Label for this snapshot" }
        },
        required: ["label"]
    }
};

/**
 * Load a previous snapshot.
 */
export const loadSnapshotTool: FunctionDeclaration = {
    name: "load_snapshot",
    description: "Load a previously saved snapshot. Use when user says 'restore state', 'load checkpoint', 'go back to'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            label: { type: Type.STRING, description: "Label of snapshot to load (or 'latest')" }
        },
        required: ["label"]
    }
};

// =============================================================================
// BIOMETRICS & SENSING - Human Interface
// =============================================================================

/**
 * Read current biometric/mood state.
 */
export const readBiometricsTool: FunctionDeclaration = {
    name: "read_biometrics",
    description: "Read current biometric state including detected mood, stress level, attention. Use when user asks 'how am I doing', 'read my state', 'what's my mood'.",
    parameters: {
        type: Type.OBJECT,
        properties: {},
        required: []
    }
};

/**
 * Toggle biometric sensing.
 */
export const toggleBiometricsTool: FunctionDeclaration = {
    name: "toggle_biometrics",
    description: "Turn biometric sensing (face detection, mood tracking) on or off. Use when user says 'enable face tracking', 'disable biometrics', 'turn off camera'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            enabled: { type: Type.BOOLEAN, description: "Enable or disable biometric sensing" }
        },
        required: ["enabled"]
    }
};

// =============================================================================
// FOCUS & PRODUCTIVITY - Work Management
// =============================================================================

/**
 * Enter focus mode.
 */
export const focusModeTool: FunctionDeclaration = {
    name: "focus_mode",
    description: "Enter or exit focus mode - minimizes distractions, hides non-essential UI, enables deep work. Use when user says 'focus mode', 'deep work', 'minimize distractions', 'I need to concentrate'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            enabled: { type: Type.BOOLEAN, description: "Enable or disable focus mode" },
            duration: { type: Type.NUMBER, description: "Optional duration in minutes" }
        },
        required: ["enabled"]
    }
};

/**
 * Quick capture - capture a thought without breaking flow.
 */
export const quickCaptureTool: FunctionDeclaration = {
    name: "quick_capture",
    description: "Quickly capture a thought, idea, or note without breaking flow. Use when user says 'note this', 'quick thought', 'capture', 'jot down'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            thought: { type: Type.STRING, description: "The thought to capture" }
        },
        required: ["thought"]
    }
};

// =============================================================================
// CLIPBOARD & QUICK ACTIONS
// =============================================================================

/**
 * Copy to clipboard.
 */
export const copyToClipboardTool: FunctionDeclaration = {
    name: "copy_to_clipboard",
    description: "Copy text or data to the clipboard. Use when user says 'copy that', 'copy to clipboard', 'save to clipboard'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            content: { type: Type.STRING, description: "Content to copy (or 'last_response' for your last response)" }
        },
        required: ["content"]
    }
};

/**
 * Read from clipboard.
 */
export const readClipboardTool: FunctionDeclaration = {
    name: "read_clipboard",
    description: "Read current clipboard contents. Use when user says 'what's in clipboard', 'read clipboard', 'paste what I copied'.",
    parameters: {
        type: Type.OBJECT,
        properties: {},
        required: []
    }
};

// =============================================================================
// VOICE CONTROL
// =============================================================================

/**
 * Adjust voice settings.
 */
export const voiceSettingsTool: FunctionDeclaration = {
    name: "voice_settings",
    description: "Adjust voice settings like speed, volume, or mode. Use when user says 'speak slower', 'speak faster', 'louder', 'quieter', 'change voice mode'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            speed: { type: Type.STRING, enum: ["slower", "normal", "faster"], description: "Speaking speed" },
            volume: { type: Type.STRING, enum: ["quieter", "normal", "louder"], description: "Volume level" },
            mode: { type: Type.STRING, enum: ["realtime", "hybrid", "quality"], description: "Voice mode" }
        },
        required: []
    }
};

/**
 * Repeat last response.
 */
export const repeatResponseTool: FunctionDeclaration = {
    name: "repeat_response",
    description: "Repeat the last spoken response. Use when user says 'repeat that', 'say that again', 'what did you say'.",
    parameters: {
        type: Type.OBJECT,
        properties: {},
        required: []
    }
};

// =============================================================================
// SUPERPOWERS - Advanced Automation & Control
// =============================================================================

/**
 * Execute a multi-step automation sequence.
 */
export const executeSequenceTool: FunctionDeclaration = {
    name: "execute_sequence",
    description: "Execute a multi-step automation sequence. Chain multiple actions together. Use when user says 'do X then Y then Z', 'automate this workflow', 'chain these actions'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            steps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of actions to execute in sequence"
            },
            parallel: { type: Type.BOOLEAN, description: "Execute steps in parallel instead of sequence" }
        },
        required: ["steps"]
    }
};

/**
 * Create a voice macro - custom command shortcut.
 */
export const createMacroTool: FunctionDeclaration = {
    name: "create_macro",
    description: "Create a custom voice macro - when user says trigger phrase, execute actions. Use when user says 'when I say X, do Y', 'create shortcut for', 'make a macro'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            trigger: { type: Type.STRING, description: "The phrase that triggers this macro" },
            actions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Actions to execute when triggered" },
            description: { type: Type.STRING, description: "What this macro does" }
        },
        required: ["trigger", "actions"]
    }
};

/**
 * List and manage macros.
 */
export const manageMacrosTool: FunctionDeclaration = {
    name: "manage_macros",
    description: "List, edit, or delete voice macros. Use when user asks 'what macros do I have', 'list shortcuts', 'delete macro X'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            action: { type: Type.STRING, enum: ["list", "delete", "edit"], description: "Action to perform" },
            macroName: { type: Type.STRING, description: "Name of macro for delete/edit" }
        },
        required: ["action"]
    }
};

/**
 * Schedule a future action.
 */
export const scheduleActionTool: FunctionDeclaration = {
    name: "schedule_action",
    description: "Schedule an action for later - specific time or recurring. Use when user says 'at 3pm do X', 'every morning run Y', 'schedule this for tomorrow'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            action: { type: Type.STRING, description: "The action to schedule" },
            when: { type: Type.STRING, description: "When to execute (e.g., '3pm', 'in 2 hours', 'tomorrow 9am')" },
            recurring: { type: Type.STRING, enum: ["once", "daily", "weekly", "hourly"], description: "Recurrence pattern" }
        },
        required: ["action", "when"]
    }
};

/**
 * Emergency stop - halt all operations.
 */
export const emergencyStopTool: FunctionDeclaration = {
    name: "emergency_stop",
    description: "EMERGENCY STOP - immediately halt all running operations, cancel pending actions, and return to safe state. Use when user says 'stop', 'cancel everything', 'abort', 'halt', 'emergency stop'.",
    parameters: {
        type: Type.OBJECT,
        properties: {},
        required: []
    }
};

/**
 * Undo recent actions.
 */
export const undoActionsTool: FunctionDeclaration = {
    name: "undo_actions",
    description: "Undo recent actions. Use when user says 'undo', 'go back', 'revert that', 'undo last 3 actions'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            count: { type: Type.NUMBER, description: "Number of actions to undo (default: 1)" }
        },
        required: []
    }
};

/**
 * Get action history.
 */
export const getHistoryTool: FunctionDeclaration = {
    name: "get_history",
    description: "Get history of recent actions and commands. Use when user asks 'what did I do', 'show history', 'recent actions'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            limit: { type: Type.NUMBER, description: "Number of actions to show (default: 10)" }
        },
        required: []
    }
};

/**
 * Analyze current screen/context.
 */
export const analyzeScreenTool: FunctionDeclaration = {
    name: "analyze_screen",
    description: "Analyze what's currently on screen and provide intelligent suggestions. Use when user asks 'what am I looking at', 'analyze this view', 'what should I do here', 'help me with this'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            focusArea: { type: Type.STRING, description: "Specific area to focus analysis on" }
        },
        required: []
    }
};

/**
 * Get proactive suggestions.
 */
export const getSuggestionsTool: FunctionDeclaration = {
    name: "get_suggestions",
    description: "Get intelligent proactive suggestions based on current context, time, and patterns. Use when user asks 'what should I do', 'any suggestions', 'what's next'.",
    parameters: {
        type: Type.OBJECT,
        properties: {},
        required: []
    }
};

/**
 * Learn a preference.
 */
export const learnPreferenceTool: FunctionDeclaration = {
    name: "learn_preference",
    description: "Learn and remember a user preference for future interactions. Use when user says 'I prefer X', 'always do Y', 'remember I like Z', 'default to'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            category: { type: Type.STRING, description: "Category of preference (e.g., 'voice', 'ui', 'workflow', 'code')" },
            preference: { type: Type.STRING, description: "The preference to remember" },
            value: { type: Type.STRING, description: "The preferred value or behavior" }
        },
        required: ["preference", "value"]
    }
};

/**
 * Get learned preferences.
 */
export const getPreferencesTool: FunctionDeclaration = {
    name: "get_preferences",
    description: "Retrieve learned preferences. Use when user asks 'what are my preferences', 'how do I like things', 'show my settings'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            category: { type: Type.STRING, description: "Filter by category (optional)" }
        },
        required: []
    }
};

/**
 * Trigger external webhook/integration.
 */
export const triggerWebhookTool: FunctionDeclaration = {
    name: "trigger_webhook",
    description: "Trigger an external webhook or integration. Use when user says 'notify Slack', 'send to webhook', 'trigger integration', 'post to Discord'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            target: { type: Type.STRING, description: "Target service or webhook name" },
            payload: { type: Type.STRING, description: "Message or data to send" },
            webhookUrl: { type: Type.STRING, description: "Direct webhook URL (optional)" }
        },
        required: ["target", "payload"]
    }
};

/**
 * Control ambient/always-on mode.
 */
export const ambientModeTool: FunctionDeclaration = {
    name: "ambient_mode",
    description: "Control ambient/always-listening mode. When enabled, the AI listens passively and responds to wake words. Use when user says 'stay listening', 'ambient mode', 'always on', 'wake word mode'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            enabled: { type: Type.BOOLEAN, description: "Enable or disable ambient mode" },
            wakeWord: { type: Type.STRING, description: "Custom wake word (default: 'hey')" },
            sensitivity: { type: Type.STRING, enum: ["low", "medium", "high"], description: "Wake word sensitivity" }
        },
        required: ["enabled"]
    }
};

/**
 * Dictation mode - pure transcription.
 */
export const dictationModeTool: FunctionDeclaration = {
    name: "dictation_mode",
    description: "Enter dictation mode - pure speech-to-text without AI responses. Use when user says 'dictation mode', 'just transcribe', 'take notes', 'transcription only'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            enabled: { type: Type.BOOLEAN, description: "Enable or disable dictation mode" },
            destination: { type: Type.STRING, description: "Where to send transcribed text (clipboard, file, input field)" }
        },
        required: ["enabled"]
    }
};

/**
 * Summarize conversation/session.
 */
export const summarizeSessionTool: FunctionDeclaration = {
    name: "summarize_session",
    description: "Summarize the current conversation or work session. Use when user says 'summarize this', 'what did we cover', 'session summary', 'recap'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            scope: { type: Type.STRING, enum: ["conversation", "session", "day", "week"], description: "Scope of summary" }
        },
        required: []
    }
};

/**
 * Set context/working on.
 */
export const setContextTool: FunctionDeclaration = {
    name: "set_context",
    description: "Set what you're currently working on so AI can provide relevant assistance. Use when user says 'I'm working on X', 'context is Y', 'focusing on Z'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            project: { type: Type.STRING, description: "Current project name" },
            task: { type: Type.STRING, description: "Current task description" },
            goals: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Session goals" }
        },
        required: []
    }
};

/**
 * Execute with confirmation.
 */
export const executeWithConfirmationTool: FunctionDeclaration = {
    name: "execute_with_confirmation",
    description: "Execute a potentially destructive or important action with user confirmation. The AI will describe what will happen and ask for confirmation.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            action: { type: Type.STRING, description: "The action to execute" },
            description: { type: Type.STRING, description: "Human-readable description of what will happen" },
            severity: { type: Type.STRING, enum: ["low", "medium", "high", "critical"], description: "Severity/importance level" }
        },
        required: ["action", "description"]
    }
};

/**
 * Voice-controlled timer/stopwatch.
 */
export const timerControlTool: FunctionDeclaration = {
    name: "timer_control",
    description: "Control timers and stopwatches by voice. Use when user says 'start timer', 'stop timer', 'how much time left', 'start stopwatch', 'lap time'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            action: { type: Type.STRING, enum: ["start", "stop", "pause", "resume", "lap", "status", "reset"], description: "Timer action" },
            duration: { type: Type.NUMBER, description: "Duration in minutes (for countdown timer)" },
            label: { type: Type.STRING, description: "Label for this timer" }
        },
        required: ["action"]
    }
};

/**
 * Quick math/calculation.
 */
export const calculateTool: FunctionDeclaration = {
    name: "calculate",
    description: "Perform quick calculations. Use when user asks math questions, conversions, or says 'calculate', 'what is X times Y', 'convert X to Y'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            expression: { type: Type.STRING, description: "Math expression or conversion to calculate" }
        },
        required: ["expression"]
    }
};

/**
 * Generate and display content.
 */
export const displayContentTool: FunctionDeclaration = {
    name: "display_content",
    description: "Generate and display content in a modal or overlay. Use when user wants to see generated content, charts, or visualizations.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            contentType: { type: Type.STRING, enum: ["text", "code", "chart", "diagram", "table"], description: "Type of content to display" },
            content: { type: Type.STRING, description: "Content to display or instructions for generation" },
            title: { type: Type.STRING, description: "Title for the display" }
        },
        required: ["contentType", "content"]
    }
};

/**
 * Control music/media playback.
 */
export const mediaControlTool: FunctionDeclaration = {
    name: "media_control",
    description: "Control media playback - play/pause music, adjust volume, skip tracks. Use when user says 'play music', 'pause', 'next track', 'volume up'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            action: { type: Type.STRING, enum: ["play", "pause", "stop", "next", "previous", "volume_up", "volume_down", "mute"], description: "Media action" },
            query: { type: Type.STRING, description: "Search query for play action" }
        },
        required: ["action"]
    }
};

/**
 * Open external app/URL.
 */
export const openExternalTool: FunctionDeclaration = {
    name: "open_external",
    description: "Open an external application, URL, or file. Use when user says 'open Chrome', 'go to github.com', 'open the document', 'launch Slack'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            target: { type: Type.STRING, description: "App name, URL, or file path to open" },
            newWindow: { type: Type.BOOLEAN, description: "Open in new window/tab" }
        },
        required: ["target"]
    }
};

/**
 * Query/interact with AI assistants.
 */
export const askAssistantTool: FunctionDeclaration = {
    name: "ask_assistant",
    description: "Query a specific AI model or assistant for a task. Use when user wants to specifically use Claude, GPT, or another model. 'Ask Claude about X', 'Get GPT's opinion on Y'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            assistant: { type: Type.STRING, enum: ["claude", "gemini", "gpt", "local"], description: "Which assistant to query" },
            query: { type: Type.STRING, description: "The question or task" },
            mode: { type: Type.STRING, enum: ["quick", "deep", "creative"], description: "Response mode" }
        },
        required: ["assistant", "query"]
    }
};

/**
 * Take a screenshot.
 */
export const screenshotTool: FunctionDeclaration = {
    name: "take_screenshot",
    description: "Take a screenshot of current view. Use when user says 'screenshot', 'capture screen', 'save this view'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            area: { type: Type.STRING, enum: ["full", "visible", "element"], description: "Area to capture" },
            elementId: { type: Type.STRING, description: "Element ID if capturing specific element" }
        },
        required: []
    }
};

/**
 * Text-to-speech for reading content.
 */
export const readAloudTool: FunctionDeclaration = {
    name: "read_aloud",
    description: "Read text content aloud. Use when user says 'read this', 'read aloud', 'read the article', 'read selected text'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            content: { type: Type.STRING, description: "Text to read (or 'selected' for selected text, 'clipboard' for clipboard)" },
            speed: { type: Type.STRING, enum: ["slow", "normal", "fast"], description: "Reading speed" }
        },
        required: ["content"]
    }
};

// ============================================================================
// ADVANCED JARVIS CAPABILITIES - Monitoring, Diagnostics, Intelligence
// ============================================================================

/**
 * Set up condition monitoring and alerts.
 */
export const monitorConditionTool: FunctionDeclaration = {
    name: "monitor_condition",
    description: "Set up continuous monitoring for a condition. Get alerted when something happens. 'Monitor the system', 'Alert me if errors occur', 'Watch for changes in X', 'Notify me when complete'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            condition: { type: Type.STRING, description: "What to monitor for (e.g., 'task completion', 'error threshold', 'data change')" },
            action: { type: Type.STRING, enum: ["alert", "log", "execute", "notify"], description: "What to do when condition triggers" },
            threshold: { type: Type.STRING, description: "Trigger threshold if applicable (e.g., '>5 errors', 'changes detected')" },
            duration: { type: Type.STRING, description: "How long to monitor (e.g., '1h', '24h', 'continuous')" }
        },
        required: ["condition", "action"]
    }
};

/**
 * Get active monitors.
 */
export const getActiveMonitorsTool: FunctionDeclaration = {
    name: "get_active_monitors",
    description: "List all active monitoring conditions. 'What am I monitoring?', 'Show active alerts', 'List watchers'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            includeHistory: { type: Type.BOOLEAN, description: "Include recently triggered monitors" }
        },
        required: []
    }
};

/**
 * Run comprehensive system diagnostics.
 */
export const runDiagnosticsTool: FunctionDeclaration = {
    name: "run_diagnostics",
    description: "Run comprehensive system diagnostics. 'Run diagnostics', 'System health check', 'Check all systems', 'Is everything working?'",
    parameters: {
        type: Type.OBJECT,
        properties: {
            scope: { type: Type.STRING, enum: ["full", "quick", "network", "memory", "performance", "services"], description: "Diagnostic scope" },
            verbose: { type: Type.BOOLEAN, description: "Include detailed output" }
        },
        required: []
    }
};

/**
 * Security threat assessment.
 */
export const threatAssessmentTool: FunctionDeclaration = {
    name: "threat_assessment",
    description: "Run security threat assessment. 'Security scan', 'Check for threats', 'Vulnerability check', 'Is the system secure?', 'Run security audit'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            scope: { type: Type.STRING, enum: ["full", "quick", "api", "data", "access"], description: "Assessment scope" },
            reportFormat: { type: Type.STRING, enum: ["summary", "detailed", "critical_only"], description: "Report detail level" }
        },
        required: []
    }
};

/**
 * Predictive intelligence and forecasting.
 */
export const predictOutcomeTool: FunctionDeclaration = {
    name: "predict_outcome",
    description: "Use AI to predict outcomes and forecast trends. 'Predict the result', 'What will happen if...', 'Forecast for this project', 'Estimate success probability'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            scenario: { type: Type.STRING, description: "The scenario or decision to predict outcomes for" },
            timeframe: { type: Type.STRING, description: "Prediction timeframe (e.g., '1 week', '1 month')" },
            factors: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Key factors to consider" }
        },
        required: ["scenario"]
    }
};

/**
 * Run operations in background autonomously.
 */
export const backgroundOperationTool: FunctionDeclaration = {
    name: "background_operation",
    description: "Start a long-running operation in the background. 'Handle this in the background', 'Continue autonomously', 'Run this while I work on something else', 'Process this offline'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            operation: { type: Type.STRING, description: "Operation to run in background" },
            notifyOn: { type: Type.STRING, enum: ["completion", "error", "milestone", "all"], description: "When to notify user" },
            priority: { type: Type.STRING, enum: ["low", "normal", "high"], description: "Operation priority" }
        },
        required: ["operation"]
    }
};

/**
 * Triage and prioritize work items.
 */
export const triagePrioritiesTool: FunctionDeclaration = {
    name: "triage_priorities",
    description: "Analyze and prioritize work items intelligently. 'What's most urgent?', 'Prioritize my work', 'Triage these tasks', 'What should I focus on?'",
    parameters: {
        type: Type.OBJECT,
        properties: {
            items: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Items to triage (optional, uses current tasks if empty)" },
            criteria: { type: Type.STRING, enum: ["urgency", "impact", "effort", "deadline", "balanced"], description: "Prioritization criteria" },
            limit: { type: Type.NUMBER, description: "Max items to return" }
        },
        required: []
    }
};

/**
 * Compare and analyze multiple items.
 */
export const compareAnalyzeTool: FunctionDeclaration = {
    name: "compare_analyze",
    description: "Compare and analyze multiple items, options, or approaches. 'Compare these', 'What's the difference between...', 'Analyze trade-offs', 'Which is better?'",
    parameters: {
        type: Type.OBJECT,
        properties: {
            items: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Items to compare (2-5)" },
            dimensions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Comparison dimensions (e.g., 'cost', 'speed', 'quality')" },
            format: { type: Type.STRING, enum: ["table", "prose", "bullets", "recommendation"], description: "Output format" }
        },
        required: ["items"]
    }
};

/**
 * Research a topic in depth.
 */
export const researchTopicTool: FunctionDeclaration = {
    name: "research_topic",
    description: "Conduct research on a topic. 'Research this', 'Find out about...', 'Investigate X', 'Deep dive into...', 'What do we know about...'",
    parameters: {
        type: Type.OBJECT,
        properties: {
            topic: { type: Type.STRING, description: "Topic to research" },
            depth: { type: Type.STRING, enum: ["quick", "standard", "comprehensive"], description: "Research depth" },
            sources: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Preferred sources (e.g., 'memory', 'web', 'codebase')" }
        },
        required: ["topic"]
    }
};

/**
 * Generate status brief/report.
 */
export const statusBriefTool: FunctionDeclaration = {
    name: "status_brief",
    description: "Generate a status brief or report. 'Give me a brief', 'Status report', 'Update me on everything', 'What's the situation?'",
    parameters: {
        type: Type.OBJECT,
        properties: {
            scope: { type: Type.STRING, enum: ["session", "project", "system", "all"], description: "Brief scope" },
            format: { type: Type.STRING, enum: ["verbal", "bullets", "detailed"], description: "Report format" },
            includeRecommendations: { type: Type.BOOLEAN, description: "Include recommended actions" }
        },
        required: []
    }
};

/**
 * Contextual awareness - where am I, what's happening.
 */
export const whereAmITool: FunctionDeclaration = {
    name: "where_am_i",
    description: "Get contextual awareness of current state. 'Where am I?', 'What's on screen?', 'Current context', 'What view is this?', 'What was I doing?'",
    parameters: {
        type: Type.OBJECT,
        properties: {
            includeHistory: { type: Type.BOOLEAN, description: "Include recent navigation history" },
            includeState: { type: Type.BOOLEAN, description: "Include detailed state information" }
        },
        required: []
    }
};

/**
 * Cross-reference and find connections.
 */
export const crossReferenceTool: FunctionDeclaration = {
    name: "cross_reference",
    description: "Find connections and cross-references between items. 'Find connections', 'How is X related to Y?', 'Link related items', 'What's connected to this?'",
    parameters: {
        type: Type.OBJECT,
        properties: {
            item: { type: Type.STRING, description: "Item to find connections for" },
            searchScope: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Where to search (e.g., 'tasks', 'memory', 'files', 'agents')" },
            maxDepth: { type: Type.NUMBER, description: "Maximum connection depth (1-3)" }
        },
        required: ["item"]
    }
};

/**
 * Workspace management.
 */
export const workspaceTool: FunctionDeclaration = {
    name: "workspace",
    description: "Manage workspaces - save and restore complete working contexts. 'Save workspace', 'Load workspace', 'Switch to my coding setup', 'Restore yesterday's context'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            action: { type: Type.STRING, enum: ["save", "load", "list", "delete"], description: "Workspace action" },
            name: { type: Type.STRING, description: "Workspace name" },
            includeState: { type: Type.BOOLEAN, description: "Include full app state (not just layout)" }
        },
        required: ["action"]
    }
};

/**
 * Explain concepts and terminology.
 */
export const explainConceptTool: FunctionDeclaration = {
    name: "explain_concept",
    description: "Explain a concept, term, or piece of code. 'What is X?', 'Explain this', 'Tell me about...', 'How does X work?', 'Define Y'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            concept: { type: Type.STRING, description: "Concept to explain" },
            level: { type: Type.STRING, enum: ["simple", "standard", "technical", "expert"], description: "Explanation level" },
            context: { type: Type.STRING, description: "Context for tailored explanation" }
        },
        required: ["concept"]
    }
};

/**
 * Proactive suggestions - what should I do next.
 */
export const whatNextTool: FunctionDeclaration = {
    name: "what_next",
    description: "Get proactive suggestions for what to do next. 'What should I do?', 'What's next?', 'Suggest something', 'I'm stuck', 'Help me decide'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            context: { type: Type.STRING, description: "Current context or goal" },
            mood: { type: Type.STRING, enum: ["productive", "creative", "exploratory", "routine"], description: "Current mood/energy" },
            timeAvailable: { type: Type.STRING, description: "Time available (e.g., '30min', '2h')" }
        },
        required: []
    }
};

/**
 * System mode switching.
 */
export const systemModeTool: FunctionDeclaration = {
    name: "system_mode",
    description: "Switch system operation modes. 'Stealth mode', 'Performance mode', 'Power save', 'Night mode', 'Focus mode', 'Demo mode'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            mode: { type: Type.STRING, enum: ["normal", "stealth", "performance", "power_save", "night", "focus", "demo", "presentation"], description: "Mode to activate" },
            duration: { type: Type.STRING, description: "Mode duration (e.g., '1h', 'until I say stop')" }
        },
        required: ["mode"]
    }
};

/**
 * Integration sync and push.
 */
export const syncIntegrationTool: FunctionDeclaration = {
    name: "sync_integration",
    description: "Sync with external integrations. 'Sync with GitHub', 'Push to cloud', 'Update integration', 'Sync everything', 'Refresh data'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            integration: { type: Type.STRING, description: "Integration to sync (e.g., 'github', 'calendar', 'all')" },
            direction: { type: Type.STRING, enum: ["pull", "push", "both"], description: "Sync direction" },
            scope: { type: Type.STRING, description: "What to sync" }
        },
        required: ["integration"]
    }
};

/**
 * Learn patterns from user behavior.
 */
export const learnPatternTool: FunctionDeclaration = {
    name: "learn_pattern",
    description: "Learn a pattern or behavior. 'Learn this pattern', 'Remember I prefer X', 'Always do Y when Z', 'Adapt to my style'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            pattern: { type: Type.STRING, description: "Pattern to learn" },
            trigger: { type: Type.STRING, description: "When to apply this pattern" },
            category: { type: Type.STRING, enum: ["behavior", "preference", "workflow", "response"], description: "Pattern category" }
        },
        required: ["pattern"]
    }
};

/**
 * Access previous session context.
 */
export const previousSessionTool: FunctionDeclaration = {
    name: "previous_session",
    description: "Access previous session context and history. 'What did I do last time?', 'Previous session', 'Yesterday's work', 'Resume where I left off'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            when: { type: Type.STRING, description: "Which session (e.g., 'last', 'yesterday', '3 days ago')" },
            what: { type: Type.STRING, enum: ["summary", "tasks", "decisions", "all"], description: "What to retrieve" }
        },
        required: []
    }
};

/**
 * Track goals and progress.
 */
export const trackGoalTool: FunctionDeclaration = {
    name: "track_goal",
    description: "Track goals and progress. 'Track my goal', 'Set a goal', 'Progress on X', 'How am I doing?', 'Update goal status'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            action: { type: Type.STRING, enum: ["create", "update", "check", "list", "complete"], description: "Goal action" },
            goal: { type: Type.STRING, description: "Goal description" },
            progress: { type: Type.NUMBER, description: "Progress percentage (0-100)" },
            notes: { type: Type.STRING, description: "Progress notes" }
        },
        required: ["action"]
    }
};

/**
 * Quick TLDR summary.
 */
export const quickSummaryTool: FunctionDeclaration = {
    name: "quick_summary",
    description: "Get a quick TLDR summary. 'TLDR', 'Quick summary', 'Summarize', 'Bottom line', 'In a nutshell'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            of: { type: Type.STRING, description: "What to summarize (e.g., 'this conversation', 'the document', 'today's work')" },
            length: { type: Type.STRING, enum: ["one_line", "short", "medium"], description: "Summary length" }
        },
        required: []
    }
};

/**
 * Start autonomous mission.
 */
export const autonomousMissionTool: FunctionDeclaration = {
    name: "autonomous_mission",
    description: "Start an autonomous mission - AI works independently toward a goal. 'Take over', 'Handle this autonomously', 'You drive', 'Autopilot mode', 'Complete this on your own'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            objective: { type: Type.STRING, description: "Mission objective" },
            constraints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Constraints and boundaries" },
            checkpointInterval: { type: Type.STRING, description: "How often to report progress" },
            canMakeDecisions: { type: Type.BOOLEAN, description: "Allow AI to make decisions without confirmation" }
        },
        required: ["objective"]
    }
};

/**
 * Full situational awareness.
 */
export const situationalAwarenessTool: FunctionDeclaration = {
    name: "situational_awareness",
    description: "Get complete situational awareness - everything that's happening. 'What's going on?', 'Full situation report', 'Brief me on everything', 'Status of all systems'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            detail: { type: Type.STRING, enum: ["executive", "operational", "tactical"], description: "Detail level" },
            focus: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Areas to focus on" }
        },
        required: []
    }
};

/**
 * Debug assistance.
 */
export const debugAssistTool: FunctionDeclaration = {
    name: "debug_assist",
    description: "Get AI assistance for debugging. 'Help me debug this', 'What's wrong?', 'Analyze this error', 'Why isn't this working?', 'Debug mode'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            problem: { type: Type.STRING, description: "Problem description or error message" },
            context: { type: Type.STRING, description: "Relevant context" },
            triedSolutions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "What you've already tried" }
        },
        required: ["problem"]
    }
};

/**
 * Performance profiling and optimization.
 */
export const performanceProfileTool: FunctionDeclaration = {
    name: "performance_profile",
    description: "Profile and optimize performance. 'Check performance', 'Why is this slow?', 'Optimize', 'Profile this', 'Speed up'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            target: { type: Type.STRING, description: "What to profile (e.g., 'app', 'current view', 'query')" },
            duration: { type: Type.NUMBER, description: "Profile duration in seconds" },
            detailed: { type: Type.BOOLEAN, description: "Include detailed breakdown" }
        },
        required: []
    }
};

// ============================================================================
// CONVERSATIONAL INTELLIGENCE - Natural Dialogue & Delegation
// ============================================================================

/**
 * Delegate task to a specific agent.
 */
export const delegateToAgentTool: FunctionDeclaration = {
    name: "delegate_to_agent",
    description: "Delegate a task to a specific agent. 'Have Dr. Ira analyze this', 'Let Mike handle the architecture', 'Ask Caleb to execute', 'Get Noah's opinion'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            agent: { type: Type.STRING, description: "Agent name (Dr. Ira, Mike, Caleb, Noah, Helen, etc.)" },
            task: { type: Type.STRING, description: "Task to delegate" },
            priority: { type: Type.STRING, enum: ["low", "normal", "high", "urgent"], description: "Task priority" },
            waitForResponse: { type: Type.BOOLEAN, description: "Wait for agent response before continuing" }
        },
        required: ["agent", "task"]
    }
};

/**
 * Voice journaling and notes.
 */
export const voiceJournalTool: FunctionDeclaration = {
    name: "voice_journal",
    description: "Voice journaling and personal notes. 'Note to self', 'Add to journal', 'Personal note', 'Remember this thought', 'Log this idea'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            entry: { type: Type.STRING, description: "Journal entry content" },
            category: { type: Type.STRING, enum: ["thought", "idea", "decision", "reflection", "reminder", "gratitude"], description: "Entry category" },
            mood: { type: Type.STRING, description: "Current mood tag" },
            private: { type: Type.BOOLEAN, description: "Mark as private entry" }
        },
        required: ["entry"]
    }
};

/**
 * Natural language data queries.
 */
export const smartQueryTool: FunctionDeclaration = {
    name: "smart_query",
    description: "Natural language queries about data. 'How many tasks did I complete today?', 'What's my most productive time?', 'Show me my patterns', 'Analyze my week'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            query: { type: Type.STRING, description: "Natural language query" },
            timeframe: { type: Type.STRING, description: "Time period (e.g., 'today', 'this week', 'last month')" },
            format: { type: Type.STRING, enum: ["verbal", "chart", "list", "summary"], description: "Response format" }
        },
        required: ["query"]
    }
};

/**
 * Set scene/mood for work.
 */
export const setSceneTool: FunctionDeclaration = {
    name: "set_scene",
    description: "Set the scene/mood for a work session. 'Set the mood for deep work', 'Creative mode', 'Prepare for a meeting', 'Wind down', 'Energy mode'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            scene: { type: Type.STRING, enum: ["deep_work", "creative", "meeting", "brainstorm", "review", "wind_down", "energy", "calm", "presentation"], description: "Scene/mood to set" },
            duration: { type: Type.STRING, description: "Scene duration" },
            music: { type: Type.BOOLEAN, description: "Include ambient audio suggestions" }
        },
        required: ["scene"]
    }
};

/**
 * Ultra-short quick commands.
 */
export const quickCommandTool: FunctionDeclaration = {
    name: "quick_command",
    description: "Ultra-short voice commands. 'Status', 'Help', 'Back', 'Forward', 'Refresh', 'Clear', 'Save', 'Done', 'Cancel', 'Confirm', 'Yes', 'No'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            command: { type: Type.STRING, enum: ["status", "help", "back", "forward", "refresh", "clear", "save", "done", "cancel", "confirm", "yes", "no", "more", "less", "next", "previous", "stop", "go", "wait", "skip"], description: "Quick command" }
        },
        required: ["command"]
    }
};

/**
 * Add voice annotations to items.
 */
export const annotateItemTool: FunctionDeclaration = {
    name: "annotate_item",
    description: "Add voice annotation to an item. 'Add note to this task', 'Annotate this', 'Comment on current item', 'Voice note for this'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            target: { type: Type.STRING, description: "What to annotate (e.g., 'current task', 'selected item', specific ID)" },
            annotation: { type: Type.STRING, description: "Annotation content" },
            type: { type: Type.STRING, enum: ["note", "warning", "idea", "question", "todo"], description: "Annotation type" }
        },
        required: ["annotation"]
    }
};

/**
 * Mood check and emotional awareness.
 */
export const moodCheckTool: FunctionDeclaration = {
    name: "mood_check",
    description: "Check or log mood and emotional state. 'How am I doing?', 'Mood check', 'I'm feeling...', 'Track my energy', 'Stress level'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            action: { type: Type.STRING, enum: ["check", "log", "history", "suggest"], description: "Mood action" },
            mood: { type: Type.STRING, description: "Mood to log (if logging)" },
            energy: { type: Type.NUMBER, description: "Energy level 1-10" }
        },
        required: ["action"]
    }
};

/**
 * Contextual repeat/redo.
 */
export const contextualRepeatTool: FunctionDeclaration = {
    name: "contextual_repeat",
    description: "Repeat or redo contextual actions. 'Do that again', 'Repeat', 'One more time', 'Same thing', 'Again but different'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            what: { type: Type.STRING, enum: ["last_action", "last_response", "last_command", "last_navigation"], description: "What to repeat" },
            modification: { type: Type.STRING, description: "How to modify the repeat (optional)" }
        },
        required: []
    }
};

/**
 * Chain multiple commands together.
 */
export const chainCommandsTool: FunctionDeclaration = {
    name: "chain_commands",
    description: "Chain multiple commands in natural language. 'Navigate to tasks then show me urgent ones', 'Save this and then switch to dashboard', 'After you finish that, remind me'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            commands: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Commands to chain" },
            waitBetween: { type: Type.BOOLEAN, description: "Wait for confirmation between commands" }
        },
        required: ["commands"]
    }
};

/**
 * Conditional actions.
 */
export const conditionalActionTool: FunctionDeclaration = {
    name: "conditional_action",
    description: "Execute action based on conditions. 'If there are no urgent tasks, start focus mode', 'When the timer ends, notify me', 'Unless I'm in a meeting, play music'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            condition: { type: Type.STRING, description: "Condition to check" },
            ifTrue: { type: Type.STRING, description: "Action if condition is true" },
            ifFalse: { type: Type.STRING, description: "Action if condition is false (optional)" }
        },
        required: ["condition", "ifTrue"]
    }
};

/**
 * Voice bookmarks.
 */
export const voiceBookmarkTool: FunctionDeclaration = {
    name: "voice_bookmark",
    description: "Create voice bookmarks for quick access. 'Bookmark this', 'Save this spot', 'Mark this location', 'Quick save', 'Remember this place'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            action: { type: Type.STRING, enum: ["create", "list", "go", "delete"], description: "Bookmark action" },
            name: { type: Type.STRING, description: "Bookmark name" },
            description: { type: Type.STRING, description: "Bookmark description" }
        },
        required: ["action"]
    }
};

/**
 * Smart notifications control.
 */
export const smartNotifyTool: FunctionDeclaration = {
    name: "smart_notify",
    description: "Smart notification control. 'Notify me when done', 'Don't disturb unless urgent', 'Only alert for errors', 'Mute notifications', 'Priority alerts only'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            mode: { type: Type.STRING, enum: ["all", "priority", "urgent", "none", "custom"], description: "Notification mode" },
            filter: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Notification types to allow" },
            duration: { type: Type.STRING, description: "How long this setting lasts" }
        },
        required: ["mode"]
    }
};

/**
 * Conversation mode settings.
 */
export const conversationModeTool: FunctionDeclaration = {
    name: "conversation_mode",
    description: "Set conversation mode/style. 'Be more concise', 'Explain in detail', 'Talk casually', 'Be formal', 'Quick responses only'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            style: { type: Type.STRING, enum: ["concise", "detailed", "casual", "formal", "technical", "friendly", "professional"], description: "Conversation style" },
            verbosity: { type: Type.STRING, enum: ["minimal", "normal", "verbose"], description: "Response length preference" }
        },
        required: ["style"]
    }
};

/**
 * Quick factual answers.
 */
export const quickAnswerTool: FunctionDeclaration = {
    name: "quick_answer",
    description: "Get quick factual answers. 'What time is it?', 'What day is today?', 'How long have I been working?', 'What's 15% of 200?'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            question: { type: Type.STRING, description: "Quick question to answer" }
        },
        required: ["question"]
    }
};

/**
 * Interpret user intent.
 */
export const interpretIntentTool: FunctionDeclaration = {
    name: "interpret_intent",
    description: "Clarify or interpret ambiguous user intent. 'What did I mean by that?', 'Clarify my last request', 'Did you understand?', 'What are my options?'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            utterance: { type: Type.STRING, description: "Utterance to interpret" },
            context: { type: Type.STRING, description: "Additional context" }
        },
        required: []
    }
};

/**
 * Confirm understanding.
 */
export const confirmUnderstandingTool: FunctionDeclaration = {
    name: "confirm_understanding",
    description: "Confirm AI understood correctly. 'Is that right?', 'Did you get that?', 'Confirm', 'Am I clear?', 'You understand?'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            about: { type: Type.STRING, description: "What to confirm understanding about" }
        },
        required: []
    }
};

/**
 * Suggest command completion.
 */
export const suggestCompletionTool: FunctionDeclaration = {
    name: "suggest_completion",
    description: "Get command suggestions and completions. 'What can I say?', 'Suggest commands', 'How do I...', 'What are my options?'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            partial: { type: Type.STRING, description: "Partial command or intent" },
            category: { type: Type.STRING, description: "Command category to suggest from" }
        },
        required: []
    }
};

/**
 * Voice-activated search.
 */
export const voiceSearchTool: FunctionDeclaration = {
    name: "voice_search",
    description: "Voice-activated search across the system. 'Find', 'Search for', 'Look up', 'Where is', 'Show me anything about'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            query: { type: Type.STRING, description: "Search query" },
            scope: { type: Type.STRING, enum: ["all", "tasks", "memory", "files", "agents", "settings"], description: "Search scope" },
            limit: { type: Type.NUMBER, description: "Max results" }
        },
        required: ["query"]
    }
};

/**
 * Narrate actions as they happen.
 */
export const narrateActionsTool: FunctionDeclaration = {
    name: "narrate_actions",
    description: "Toggle narration of actions. 'Narrate what you're doing', 'Tell me as you go', 'Silent mode', 'Explain your actions'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            enabled: { type: Type.BOOLEAN, description: "Enable/disable narration" },
            detail: { type: Type.STRING, enum: ["minimal", "normal", "verbose"], description: "Narration detail level" }
        },
        required: ["enabled"]
    }
};

/**
 * Pause and resume operations.
 */
export const pauseResumeTool: FunctionDeclaration = {
    name: "pause_resume",
    description: "Pause or resume ongoing operations. 'Pause', 'Hold on', 'Wait a moment', 'Continue', 'Resume', 'Go ahead', 'Proceed'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            action: { type: Type.STRING, enum: ["pause", "resume", "toggle"], description: "Pause/resume action" },
            target: { type: Type.STRING, description: "What to pause/resume (optional, defaults to current operation)" }
        },
        required: ["action"]
    }
};

/**
 * All voice tools for Gemini Live API.
 */
export const VOICE_TOOLS: FunctionDeclaration[] = [
    // === CORE REASONING ===
    thinkTool,

    // === NAVIGATION ===
    navigateTool,
    navigateToTabTool,

    // === UI INTERACTION ===
    scanUITool,
    clickElementTool,
    inputTextTool,
    selectOptionTool,
    getUIContextTool,
    executeActionTool,
    getAvailableActionsTool,
    refreshContextTool,

    // === AGENT CONTROL ===
    switchAgentTool,
    recalibrateDnaTool,

    // === ARCHITECTURE & SYNTHESIS ===
    synthesizeTopologyTool,
    convergeLatticesTool,

    // === INTELLIGENCE & SEARCH ===
    searchIntelTool,

    // === TASK & PROPOSAL MANAGEMENT ===
    updateTaskPriorityTool,
    proposeChangeTool,

    // === SYSTEM OPERATIONS ===
    systemStatusTool,
    setReminderTool,

    // === DREAM PROTOCOL ===
    startDreamingTool,
    getDreamInsightsTool,
    morningBriefingTool,

    // === MULTI-AGENT REASONING ===
    decomposeTaskTool,
    runConsensusTool,
    bicameralDialogueTool,

    // === MEMORY & KNOWLEDGE ===
    saveMemoryTool,
    recallMemoryTool,
    manageMemoryTool,

    // === CODE & DEVELOPMENT ===
    analyzeCodeTool,
    generateCodeTool,

    // === DATA & EXPORT ===
    exportDataTool,
    saveSnapshotTool,
    loadSnapshotTool,

    // === BIOMETRICS & SENSING ===
    readBiometricsTool,
    toggleBiometricsTool,

    // === FOCUS & PRODUCTIVITY ===
    focusModeTool,
    quickCaptureTool,

    // === CLIPBOARD & QUICK ACTIONS ===
    copyToClipboardTool,
    readClipboardTool,

    // === VOICE CONTROL ===
    voiceSettingsTool,
    repeatResponseTool,

    // === SUPERPOWERS ===
    executeSequenceTool,
    createMacroTool,
    manageMacrosTool,
    scheduleActionTool,
    emergencyStopTool,
    undoActionsTool,
    getHistoryTool,
    analyzeScreenTool,
    getSuggestionsTool,
    learnPreferenceTool,
    getPreferencesTool,
    triggerWebhookTool,
    ambientModeTool,
    dictationModeTool,
    summarizeSessionTool,
    setContextTool,
    executeWithConfirmationTool,
    timerControlTool,
    calculateTool,
    displayContentTool,
    mediaControlTool,
    openExternalTool,
    askAssistantTool,
    screenshotTool,
    readAloudTool,

    // === ADVANCED JARVIS CAPABILITIES ===
    monitorConditionTool,
    getActiveMonitorsTool,
    runDiagnosticsTool,
    threatAssessmentTool,
    predictOutcomeTool,
    backgroundOperationTool,
    triagePrioritiesTool,
    compareAnalyzeTool,
    researchTopicTool,
    statusBriefTool,
    whereAmITool,
    crossReferenceTool,
    workspaceTool,
    explainConceptTool,
    whatNextTool,
    systemModeTool,
    syncIntegrationTool,
    learnPatternTool,
    previousSessionTool,
    trackGoalTool,
    quickSummaryTool,
    autonomousMissionTool,
    situationalAwarenessTool,
    debugAssistTool,
    performanceProfileTool,

    // === CONVERSATIONAL INTELLIGENCE ===
    delegateToAgentTool,
    voiceJournalTool,
    smartQueryTool,
    setSceneTool,
    quickCommandTool,
    annotateItemTool,
    moodCheckTool,
    contextualRepeatTool,
    chainCommandsTool,
    conditionalActionTool,
    voiceBookmarkTool,
    smartNotifyTool,
    conversationModeTool,
    quickAnswerTool,
    interpretIntentTool,
    confirmUnderstandingTool,
    suggestCompletionTool,
    voiceSearchTool,
    narrateActionsTool,
    pauseResumeTool,
];
