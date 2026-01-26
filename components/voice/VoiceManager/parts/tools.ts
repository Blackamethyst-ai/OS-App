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

/**
 * All voice tools for Gemini Live API.
 */
export const VOICE_TOOLS: FunctionDeclaration[] = [
    // Core reasoning
    thinkTool,

    // Navigation
    navigateTool,
    navigateToTabTool,

    // UI Interaction
    scanUITool,
    clickElementTool,
    inputTextTool,
    selectOptionTool,
    getUIContextTool,
    executeActionTool,
    getAvailableActionsTool,
    refreshContextTool,

    // Agent control
    switchAgentTool,
    recalibrateDnaTool,

    // Architecture & synthesis
    synthesizeTopologyTool,
    convergeLatticesTool,

    // Intelligence & search
    searchIntelTool,

    // Task & proposal management
    updateTaskPriorityTool,
    proposeChangeTool,

    // System operations
    systemStatusTool,
    setReminderTool,
];
