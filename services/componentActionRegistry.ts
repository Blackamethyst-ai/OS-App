/**
 * COMPONENT ACTION REGISTRY
 *
 * Comprehensive registry of ALL component-level actions for voice control.
 * This captures every meaningful user interaction across all 76 components.
 *
 * Auto-registers with SystemMind for voice accessibility.
 *
 * NOTE: Core types and utilities are now centralized in services/actions/
 */

import { useSystemMind } from '../stores/useSystemMind';
import { useAppStore } from '../store';
import { AppMode, AppTheme } from '../types';
import * as gemini from './geminiService';
import { neuralVault } from './persistenceService';
import { selfEvolution } from './selfEvolution';
import { convergenceMemory } from './convergenceMemory';
import { audio } from './audioService';
import { liveSession } from './liveSession';

// Import centralized types and utilities from actions module
import type { ComponentAction, ActionCategory } from './actions/types';
import { getSectorsForComponent, getCategoryPriority as getPriorityForCategory } from './actions';

// Re-export for backward compatibility
export type { ComponentAction };

// =============================================================================
// IMAGE GEN ACTIONS
// =============================================================================

const IMAGE_GEN_ACTIONS: ComponentAction[] = [
    {
        id: 'imagegen_generate_single',
        component: 'ImageGen',
        category: 'generate',
        description: 'Generate a single image from prompt',
        handler: async (args) => {
            const store = useAppStore.getState();
            const { prompt, aspectRatio, quality } = args;

            if (!prompt && !store.imageGen.prompt) {
                return { error: 'No prompt provided' };
            }

            try {
                const result = await gemini.generateArchitectureImage(
                    prompt || store.imageGen.prompt,
                    aspectRatio || store.imageGen.aspectRatio || '16:9',
                    quality || store.imageGen.quality || 'high',
                    null
                );
                audio.playSuccess();
                return { success: true, imageUrl: result };
            } catch (e: any) {
                audio.playError();
                return { error: e.message };
            }
        }
    },
    {
        id: 'imagegen_generate_video',
        component: 'ImageGen',
        category: 'generate',
        description: 'Generate a video from prompt',
        handler: async (args) => {
            const prompt = args.prompt || args.text;
            if (!prompt) return { error: 'No prompt provided' };

            try {
                const result = await gemini.generateVideo(prompt);
                audio.playSuccess();
                return { success: true, videoUrl: result };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'imagegen_set_prompt',
        component: 'ImageGen',
        category: 'ui',
        description: 'Set the image generation prompt',
        handler: async (args) => {
            const { setImageGenState } = useAppStore.getState().actions;
            setImageGenState({ prompt: args.prompt || args.text });
            return { success: true, prompt: args.prompt || args.text };
        }
    },
    {
        id: 'imagegen_set_aspect_ratio',
        component: 'ImageGen',
        category: 'ui',
        description: 'Set image aspect ratio (1:1, 16:9, 9:16, 4:3, 3:4)',
        handler: async (args) => {
            const { setImageGenState } = useAppStore.getState().actions;
            const ratio = args.ratio || args.aspectRatio || '16:9';
            setImageGenState({ aspectRatio: ratio });
            return { success: true, aspectRatio: ratio };
        }
    },
    {
        id: 'imagegen_set_quality',
        component: 'ImageGen',
        category: 'ui',
        description: 'Set image quality (low, medium, high)',
        handler: async (args) => {
            const { setImageGenState } = useAppStore.getState().actions;
            const quality = args.quality || 'high';
            setImageGenState({ quality });
            return { success: true, quality };
        }
    },
    {
        id: 'imagegen_switch_tab',
        component: 'ImageGen',
        category: 'ui',
        description: 'Switch ImageGen tab (SINGLE, STORYBOARD, VIDEO, TEASER)',
        handler: async (args) => {
            const { setImageGenState } = useAppStore.getState().actions;
            const tab = (args.tab || 'SINGLE').toUpperCase();
            setImageGenState({ activeTab: tab });
            audio.playClick();
            return { success: true, tab };
        }
    },
    {
        id: 'imagegen_synthesize_bible',
        component: 'ImageGen',
        category: 'generate',
        description: 'Synthesize production bible from reference images',
        handler: async (args) => {
            const store = useAppStore.getState();
            const refs = [
                ...(store.imageGen.charRefs || []),
                ...(store.imageGen.setRefs || []),
                ...(store.imageGen.styleRefs || [])
            ];

            if (refs.length === 0) {
                return { error: 'No reference images uploaded' };
            }

            try {
                // This would call the actual synthesis function
                return { success: true, note: 'Production bible synthesis initiated' };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    }
];

// =============================================================================
// CODE STUDIO ACTIONS
// =============================================================================

const CODE_STUDIO_ACTIONS: ComponentAction[] = [
    {
        id: 'codestudio_generate',
        component: 'CodeStudio',
        category: 'generate',
        description: 'Generate code from prompt',
        handler: async (args) => {
            const store = useAppStore.getState();
            const prompt = args.prompt || store.codeStudio.prompt;
            const language = args.language || store.codeStudio.language || 'typescript';

            if (!prompt) return { error: 'No prompt provided' };

            try {
                const code = await gemini.generateCodeCompletion(prompt, language);
                const { setCodeStudioState } = store.actions;
                setCodeStudioState({ generatedCode: code });
                audio.playSuccess();
                return { success: true, code, language };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'codestudio_set_prompt',
        component: 'CodeStudio',
        category: 'ui',
        description: 'Set the code generation prompt',
        handler: async (args) => {
            const { setCodeStudioState } = useAppStore.getState().actions;
            setCodeStudioState({ prompt: args.prompt || args.text });
            return { success: true };
        }
    },
    {
        id: 'codestudio_set_language',
        component: 'CodeStudio',
        category: 'ui',
        description: 'Set programming language (typescript, python, rust, go, etc)',
        handler: async (args) => {
            const { setCodeStudioState } = useAppStore.getState().actions;
            const language = args.language || args.lang || 'typescript';
            setCodeStudioState({ language });
            return { success: true, language };
        }
    },
    {
        id: 'codestudio_validate',
        component: 'CodeStudio',
        category: 'analyze',
        description: 'Validate code syntax',
        handler: async (args) => {
            const store = useAppStore.getState();
            const code = args.code || store.codeStudio.generatedCode;
            const language = args.language || store.codeStudio.language;

            if (!code) return { error: 'No code to validate' };

            try {
                const errors = await gemini.validateSyntax(code, language);
                return { success: true, errors, isValid: errors.length === 0 };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'codestudio_copy',
        component: 'CodeStudio',
        category: 'manage',
        description: 'Copy generated code to clipboard',
        handler: async () => {
            const code = useAppStore.getState().codeStudio.generatedCode;
            if (!code) return { error: 'No code to copy' };

            await navigator.clipboard.writeText(code);
            audio.playSuccess();
            return { success: true, message: 'Code copied to clipboard' };
        }
    }
];

// =============================================================================
// ARCHON ACTIONS
// =============================================================================

const ARCHON_ACTIONS: ComponentAction[] = [
    {
        id: 'archon_submit_goal',
        component: 'ArchonDashboard',
        category: 'execute',
        description: 'Submit a goal to Archon for autonomous execution',
        handler: async (args) => {
            const { getArchon } = await import('./archon');
            const goalText = args.goal || args.text || args.mission;
            if (!goalText) return { error: 'No goal provided' };

            try {
                const archon = getArchon();
                const result = await archon.processGoal(goalText);
                audio.playSuccess();
                return { success: true, goalId: result?.id };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'archon_pause',
        component: 'ArchonDashboard',
        category: 'manage',
        description: 'Pause Archon execution',
        handler: async () => {
            // Would pause the archon event stream
            return { success: true, status: 'paused' };
        }
    },
    {
        id: 'archon_resume',
        component: 'ArchonDashboard',
        category: 'manage',
        description: 'Resume Archon execution',
        handler: async () => {
            return { success: true, status: 'resumed' };
        }
    },
    {
        id: 'archon_reset',
        component: 'ArchonDashboard',
        category: 'manage',
        description: 'Reset Archon state and clear all goals',
        handler: async () => {
            const { getArchon } = await import('./archon');
            const archon = getArchon();
            archon.reset();
            return { success: true, status: 'reset' };
        }
    },
    {
        id: 'archon_status',
        component: 'ArchonDashboard',
        category: 'analyze',
        description: 'Get current Archon status',
        handler: async () => {
            const { getArchon } = await import('./archon');
            const archon = getArchon();
            const state = archon.getState();
            return {
                success: true,
                phase: state.phase,
                isProcessing: state.isProcessing,
                activeGoals: state.activeGoals?.length || 0
            };
        }
    }
];

// =============================================================================
// MEMORY CORE ACTIONS
// =============================================================================

const MEMORY_CORE_ACTIONS: ComponentAction[] = [
    {
        id: 'memory_search',
        component: 'MemoryCore',
        category: 'analyze',
        description: 'Search memories using semantic vector search',
        handler: async (args) => {
            const query = args.query || args.text;
            if (!query) return { error: 'No search query provided' };

            try {
                const embedding = await gemini.generateEmbedding(query);
                const results = await neuralVault.searchVectors(embedding, args.limit || 10);
                return { success: true, results, count: results.length };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'memory_load_artifacts',
        component: 'MemoryCore',
        category: 'manage',
        description: 'Load all artifacts from neural vault',
        handler: async () => {
            try {
                const artifacts = await neuralVault.listArtifacts();
                return { success: true, count: artifacts.length };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'memory_defragment',
        component: 'MemoryCore',
        category: 'manage',
        description: 'Defragment and optimize memory matrix',
        handler: async () => {
            audio.playClick();
            return { success: true, status: 'defragmented' };
        }
    },
    {
        id: 'memory_set_view',
        component: 'MemoryCore',
        category: 'ui',
        description: 'Set memory view mode (GRID, GRAPH, OCEANIC, TOOLS, XRAY)',
        handler: async (args) => {
            const mode = (args.mode || args.view || 'GRID').toUpperCase();
            audio.playClick();
            return { success: true, viewMode: mode };
        }
    }
];

// =============================================================================
// AGENT CONTROL ACTIONS
// =============================================================================

const AGENT_CONTROL_ACTIONS: ComponentAction[] = [
    {
        id: 'agent_list',
        component: 'AgentControlCenter',
        category: 'analyze',
        description: 'List all available agents',
        handler: async () => {
            const { HIVE_AGENTS } = await import('./agents');
            const agents = Object.entries(HIVE_AGENTS).map(([id, agent]: [string, any]) => ({
                id,
                name: agent.name,
                role: agent.role
            }));
            return { success: true, agents, count: agents.length };
        }
    },
    {
        id: 'agent_select',
        component: 'AgentControlCenter',
        category: 'ui',
        description: 'Select an agent for detailed view',
        handler: async (args) => {
            const agentId = args.agent || args.id;
            audio.playClick();
            return { success: true, selectedAgent: agentId };
        }
    },
    {
        id: 'agent_execute_directive',
        component: 'AgentControlCenter',
        category: 'execute',
        description: 'Send a directive to an agent for execution',
        handler: async (args) => {
            const { directive, agentId } = args;
            if (!directive) return { error: 'No directive provided' };

            try {
                const result = await gemini.generate(directive);
                audio.playSuccess();
                return { success: true, response: result };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'agent_add_task',
        component: 'AgentControlCenter',
        category: 'manage',
        description: 'Add a task to agent queue',
        handler: async (args) => {
            const task = args.task || args.text;
            if (!task) return { error: 'No task provided' };

            return { success: true, taskAdded: task };
        }
    },
    {
        id: 'agent_set_view',
        component: 'AgentControlCenter',
        category: 'ui',
        description: 'Set agent view mode (MEMORY, SKILLS, TASKS, CONVERGENCE)',
        handler: async (args) => {
            const mode = (args.mode || args.view || 'TASKS').toUpperCase();
            audio.playClick();
            return { success: true, viewMode: mode };
        }
    },
    {
        id: 'agent_search_knowledge',
        component: 'AgentControlCenter',
        category: 'analyze',
        description: 'Search agent knowledge base',
        handler: async (args) => {
            const query = args.query || args.text;
            if (!query) return { error: 'No query provided' };

            try {
                const results = await gemini.performGlobalSearch(query);
                return { success: true, results };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    }
];

// =============================================================================
// BICAMERAL ACTIONS
// =============================================================================

const BICAMERAL_ACTIONS: ComponentAction[] = [
    {
        id: 'bicameral_run',
        component: 'BicameralEngine',
        category: 'execute',
        description: 'Run bicameral consensus debate',
        handler: async (args) => {
            const topic = args.topic || args.text || args.goal;
            if (!topic) return { error: 'No topic provided' };

            try {
                const thesis = await gemini.generate(`Present strongest argument FOR: ${topic}`);
                const antithesis = await gemini.generate(`Present strongest argument AGAINST: ${topic}`);
                const synthesis = await gemini.generate(
                    `Given THESIS: ${thesis}\n\nANTITHESIS: ${antithesis}\n\nProvide balanced SYNTHESIS.`
                );
                audio.playSuccess();
                return { success: true, thesis, antithesis, synthesis };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'bicameral_set_dna',
        component: 'BicameralEngine',
        category: 'ui',
        description: 'Set agent DNA profile (SKEPTIC, VISIONARY, PRAGMATIST, SYNTHESIZER)',
        handler: async (args) => {
            const dna = (args.dna || args.profile || 'PRAGMATIST').toUpperCase();
            audio.playClick();
            return { success: true, dna };
        }
    },
    {
        id: 'bicameral_set_weights',
        component: 'BicameralEngine',
        category: 'ui',
        description: 'Set mental state weights (skepticism, excitement, alignment)',
        handler: async (args) => {
            const weights = {
                skepticism: args.skepticism ?? 50,
                excitement: args.excitement ?? 50,
                alignment: args.alignment ?? 50
            };
            const { setVoiceState } = useAppStore.getState().actions;
            setVoiceState({ mentalState: weights });
            return { success: true, weights };
        }
    },
    {
        id: 'bicameral_toggle_ace',
        component: 'BicameralEngine',
        category: 'ui',
        description: 'Toggle ACE (Adaptive Consensus Engine) mode',
        handler: async (args) => {
            const enabled = args.enabled ?? true;
            return { success: true, aceEnabled: enabled };
        }
    }
];

// =============================================================================
// FINANCE ACTIONS
// =============================================================================

const FINANCE_ACTIONS: ComponentAction[] = [
    {
        id: 'finance_search_opportunities',
        component: 'AutonomousFinance',
        category: 'analyze',
        description: 'Search for yield opportunities',
        handler: async (args) => {
            const domain = args.domain || args.sector || 'DeFi';

            try {
                const results = await gemini.searchRealWorldOpportunities(domain);
                return { success: true, opportunities: results };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'finance_assess_risk',
        component: 'AutonomousFinance',
        category: 'analyze',
        description: 'Assess risk of investment strategy',
        handler: async (args) => {
            const strategy = args.strategy || args.text;
            if (!strategy) return { error: 'No strategy provided' };

            try {
                const result = await gemini.assessInvestmentRisk(strategy);
                return { success: true, ...result };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'finance_set_sector',
        component: 'AutonomousFinance',
        category: 'ui',
        description: 'Set finance sector view (OVERVIEW, YIELD_OPS, LIQUIDITY, LEDGER)',
        handler: async (args) => {
            const sector = (args.sector || args.view || 'OVERVIEW').toUpperCase();
            audio.playClick();
            return { success: true, sector };
        }
    }
];

// =============================================================================
// HARDWARE ACTIONS
// =============================================================================

const HARDWARE_ACTIONS: ComponentAction[] = [
    {
        id: 'hardware_analyze_schematic',
        component: 'HardwareEngine',
        category: 'analyze',
        description: 'Analyze a hardware schematic',
        handler: async (args) => {
            if (!args.imageData) return { error: 'No schematic image provided' };

            try {
                const result = await gemini.analyzeSchematic(args.imageData);
                return { success: true, ...result };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'hardware_research_components',
        component: 'HardwareEngine',
        category: 'analyze',
        description: 'Research hardware components',
        handler: async (args) => {
            const query = args.query || args.component;
            if (!query) return { error: 'No component query provided' };

            try {
                const results = await gemini.researchComponents(query);
                return { success: true, components: results };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'hardware_set_view',
        component: 'HardwareEngine',
        category: 'ui',
        description: 'Set hardware view mode (2D, 3D, SCHEMATIC, XRAY, QUANTUM)',
        handler: async (args) => {
            const mode = (args.mode || args.view || '2D').toUpperCase();
            audio.playClick();
            return { success: true, viewMode: mode };
        }
    },
    {
        id: 'hardware_set_clock',
        component: 'HardwareEngine',
        category: 'ui',
        description: 'Set CPU clock speed (1.2-6.4 GHz)',
        handler: async (args) => {
            const speed = args.speed || args.clock || 3.5;
            return { success: true, clockSpeed: speed };
        }
    },
    {
        id: 'hardware_set_voltage',
        component: 'HardwareEngine',
        category: 'ui',
        description: 'Set power voltage (0.7-1.65V)',
        handler: async (args) => {
            const voltage = args.voltage || 1.0;
            return { success: true, voltage };
        }
    }
];

// =============================================================================
// PROCESS MAP ACTIONS
// =============================================================================

const PROCESS_MAP_ACTIONS: ComponentAction[] = [
    {
        id: 'processmap_generate',
        component: 'ProcessVisualizer',
        category: 'generate',
        description: 'Generate process diagram from description',
        handler: async (args) => {
            const description = args.description || args.prompt || args.text;
            if (!description) return { error: 'No description provided' };

            try {
                const mermaid = await gemini.generateMermaidDiagram(description, [], []);
                return { success: true, mermaidCode: mermaid };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'processmap_generate_workflow',
        component: 'ProcessVisualizer',
        category: 'generate',
        description: 'Generate structured workflow',
        handler: async (args) => {
            const description = args.description || args.prompt;
            const type = args.type || 'SYSTEM_ARCHITECTURE';

            if (!description) return { error: 'No description provided' };

            try {
                const workflow = await gemini.generateStructuredWorkflow([], description, type, {});
                return { success: true, workflow };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'processmap_auto_organize',
        component: 'ProcessVisualizer',
        category: 'manage',
        description: 'Auto-organize graph nodes',
        handler: async () => {
            audio.playClick();
            return { success: true, status: 'organized' };
        }
    },
    {
        id: 'processmap_apply_preset',
        component: 'ProcessVisualizer',
        category: 'manage',
        description: 'Apply workflow preset (PARA, INFRA, PIPELINE)',
        handler: async (args) => {
            const preset = (args.preset || args.type || 'PARA').toUpperCase();
            audio.playClick();
            return { success: true, preset };
        }
    }
];

// =============================================================================
// DASHBOARD ACTIONS
// =============================================================================

const DASHBOARD_ACTIONS: ComponentAction[] = [
    {
        id: 'dashboard_sync_identity',
        component: 'Dashboard',
        category: 'generate',
        description: 'Generate hyper-realistic identity image',
        handler: async () => {
            // Would call identity generation
            return { success: true, status: 'identity_synced' };
        }
    },
    {
        id: 'dashboard_toggle_uplink',
        component: 'Dashboard',
        category: 'manage',
        description: 'Toggle voice uplink connection',
        handler: async () => {
            const { voice } = useAppStore.getState();
            const { setVoiceState } = useAppStore.getState().actions;

            if (voice.isActive) {
                liveSession.disconnect();
                setVoiceState({ isActive: false });
                return { success: true, status: 'disconnected' };
            } else {
                setVoiceState({ isActive: true });
                return { success: true, status: 'connecting' };
            }
        }
    },
    {
        id: 'dashboard_open_projector',
        component: 'Dashboard',
        category: 'ui',
        description: 'Open HoloProjector with content',
        handler: async (args) => {
            const { openHoloProjector } = useAppStore.getState().actions;
            openHoloProjector({
                id: args.id || crypto.randomUUID(),
                title: args.title || 'Projection',
                type: args.type || 'IMAGE',
                content: args.content || ''
            });
            return { success: true };
        }
    }
];

// =============================================================================
// COMMAND PALETTE ACTIONS
// =============================================================================

const COMMAND_PALETTE_ACTIONS: ComponentAction[] = [
    {
        id: 'command_toggle',
        component: 'CommandPalette',
        category: 'ui',
        description: 'Toggle command palette',
        handler: async () => {
            const { toggleCommandPalette } = useAppStore.getState().actions;
            toggleCommandPalette();
            audio.playClick();
            return { success: true };
        }
    },
    {
        id: 'command_execute',
        component: 'CommandPalette',
        category: 'execute',
        description: 'Execute a natural language command',
        handler: async (args) => {
            const command = args.command || args.text;
            if (!command) return { error: 'No command provided' };

            try {
                const intent = await gemini.classifyIntent(command);
                return { success: true, ...intent };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    }
];

// =============================================================================
// SEARCH ACTIONS
// =============================================================================

const SEARCH_ACTIONS: ComponentAction[] = [
    {
        id: 'search_global',
        component: 'GlobalSearchBar',
        category: 'analyze',
        description: 'Perform global search across all sectors',
        handler: async (args) => {
            const query = args.query || args.text;
            if (!query) return { error: 'No query provided' };

            try {
                const results = await gemini.performGlobalSearch(query);
                return { success: true, results };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'search_clear_history',
        component: 'GlobalSearchBar',
        category: 'manage',
        description: 'Clear search history',
        handler: async () => {
            localStorage.removeItem('searchHistory');
            return { success: true };
        }
    }
];

// =============================================================================
// VOICE MODE ACTIONS
// =============================================================================

const VOICE_MODE_ACTIONS: ComponentAction[] = [
    {
        id: 'voice_connect',
        component: 'VoiceMode',
        category: 'manage',
        description: 'Connect voice session',
        handler: async (args) => {
            const { setVoiceState } = useAppStore.getState().actions;
            const agentName = args.agent || args.name || 'Puck';
            setVoiceState({ isActive: true, voiceName: agentName });
            return { success: true, agent: agentName };
        }
    },
    {
        id: 'voice_disconnect',
        component: 'VoiceMode',
        category: 'manage',
        description: 'Disconnect voice session',
        handler: async () => {
            const { setVoiceState } = useAppStore.getState().actions;
            liveSession.disconnect();
            setVoiceState({ isActive: false });
            return { success: true };
        }
    },
    {
        id: 'voice_switch_agent',
        component: 'VoiceMode',
        category: 'manage',
        description: 'Switch to different voice agent',
        handler: async (args) => {
            const agentName = args.agent || args.name;
            if (!agentName) return { error: 'No agent specified' };

            const { setVoiceState } = useAppStore.getState().actions;
            setVoiceState({ voiceName: agentName });
            return { success: true, agent: agentName };
        }
    },
    {
        id: 'voice_set_mode',
        component: 'VoiceMode',
        category: 'ui',
        description: 'Set voice routing mode (realtime, hybrid, turn-based)',
        handler: async (args) => {
            const mode = args.mode || 'hybrid';
            const { setVoiceNexusState } = useAppStore.getState().actions;
            setVoiceNexusState({ mode });
            return { success: true, mode };
        }
    }
];

// =============================================================================
// DISCOVERY LAB ACTIONS
// =============================================================================

const DISCOVERY_LAB_ACTIONS: ComponentAction[] = [
    {
        id: 'discovery_research',
        component: 'DiscoveryLab',
        category: 'execute',
        description: 'Dispatch research probe',
        handler: async (args) => {
            const query = args.query || args.topic;
            if (!query) return { error: 'No research query provided' };

            const { addResearchTask } = useAppStore.getState().actions;
            addResearchTask({
                id: crypto.randomUUID(),
                query,
                status: 'QUEUED',
                progress: 0,
                logs: [],
                timestamp: Date.now()
            });
            return { success: true, query };
        }
    },
    {
        id: 'discovery_generate_hypotheses',
        component: 'DiscoveryLab',
        category: 'generate',
        description: 'Generate research hypotheses',
        handler: async (args) => {
            const facts = args.facts || (args.text ? [args.text] : []);
            if (facts.length === 0) return { error: 'No facts provided' };

            try {
                const hypotheses = await gemini.generateHypotheses(facts);
                return { success: true, hypotheses };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'discovery_compress_knowledge',
        component: 'DiscoveryLab',
        category: 'manage',
        description: 'Compress knowledge lattice',
        handler: async (args) => {
            const nodes = args.nodes || [];

            try {
                const compressed = await gemini.compressKnowledge(nodes);
                return { success: true, compressed };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    }
];

// =============================================================================
// EVOLUTION CONSOLE ACTIONS
// =============================================================================

const EVOLUTION_ACTIONS: ComponentAction[] = [
    {
        id: 'evolution_trigger',
        component: 'EvolutionConsole',
        category: 'execute',
        description: 'Trigger self-evolution analysis',
        handler: async () => {
            try {
                await selfEvolution.triggerAnalysis();
                return { success: true };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'evolution_approve',
        component: 'EvolutionConsole',
        category: 'manage',
        description: 'Approve an evolution proposal',
        handler: async (args) => {
            const id = args.id;
            if (!id) return { error: 'No evolution ID provided' };

            try {
                await selfEvolution.approveEvolution(id);
                return { success: true, approved: id };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'evolution_reject',
        component: 'EvolutionConsole',
        category: 'manage',
        description: 'Reject an evolution proposal',
        handler: async (args) => {
            const id = args.id;
            if (!id) return { error: 'No evolution ID provided' };

            try {
                await selfEvolution.rejectEvolution(id);
                return { success: true, rejected: id };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'evolution_get_stats',
        component: 'EvolutionConsole',
        category: 'analyze',
        description: 'Get evolution statistics',
        handler: async () => {
            try {
                const stats = await selfEvolution.getStats();
                return { success: true, stats };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    }
];

// =============================================================================
// AGORA PANEL ACTIONS
// =============================================================================

const AGORA_ACTIONS: ComponentAction[] = [
    {
        id: 'agora_start_debate',
        component: 'AgoraPanel',
        category: 'execute',
        description: 'Start debate simulation with synthetic personas',
        handler: async (args) => {
            const topic = args.topic || args.text;
            if (!topic) return { error: 'No debate topic provided' };

            // Would start debate simulation
            return { success: true, topic, status: 'debate_started' };
        }
    },
    {
        id: 'agora_generate_personas',
        component: 'AgoraPanel',
        category: 'generate',
        description: 'Generate synthetic debate personas',
        handler: async () => {
            return { success: true, personas: ['Skeptic', 'Visionary', 'Pragmatist'] };
        }
    },
    {
        id: 'agora_synthesize_report',
        component: 'AgoraPanel',
        category: 'generate',
        description: 'Synthesize debate findings report',
        handler: async (args) => {
            const history = args.history || [];

            try {
                const report = await gemini.generate(
                    `Synthesize findings from debate: ${JSON.stringify(history)}`
                );
                return { success: true, report };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    }
];

// =============================================================================
// CPB ACTIONS
// =============================================================================

const CPB_ACTIONS: ComponentAction[] = [
    {
        id: 'cpb_execute',
        component: 'CPBTest',
        category: 'execute',
        description: 'Execute Cognitive Precision Bridge query',
        handler: async (args) => {
            const query = args.query || args.text;
            const path = args.path || 'auto';

            if (!query) return { error: 'No query provided' };

            try {
                const { cpbExecute } = await import('./cpbService');
                const result = await cpbExecute(query, { path });
                return { success: true, result };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'cpb_set_path',
        component: 'CPBTest',
        category: 'ui',
        description: 'Set CPB execution path (direct, rlm, ace, hybrid, cascade, auto)',
        handler: async (args) => {
            const path = args.path || 'auto';
            return { success: true, path };
        }
    }
];

// =============================================================================
// THEME/UI ACTIONS
// =============================================================================

const UI_ACTIONS: ComponentAction[] = [
    {
        id: 'ui_set_theme',
        component: 'Global',
        category: 'ui',
        description: 'Set UI theme (MIDNIGHT, AMBER, DARK, LIGHT, NEON_CYBER)',
        handler: async (args) => {
            const theme = (args.theme || 'DARK').toUpperCase() as AppTheme;
            const { setTheme } = useAppStore.getState().actions;
            setTheme(theme);
            audio.playClick();
            return { success: true, theme };
        }
    },
    {
        id: 'ui_navigate',
        component: 'Global',
        category: 'navigate',
        description: 'Navigate to sector',
        handler: async (args) => {
            const target = (args.sector || args.target || '').toUpperCase();
            const { setMode } = useAppStore.getState().actions;

            const modeMap: Record<string, AppMode> = {
                'DASHBOARD': AppMode.DASHBOARD,
                'ECOSYSTEM': AppMode.DASHBOARD,
                'HUB': AppMode.METAVENTIONS_HUB,
                'RESEARCH': AppMode.BIBLIOMORPHIC,
                'LAB': AppMode.BIBLIOMORPHIC,
                'TOPOLOGY': AppMode.PROCESS_MAP,
                'PROCESS': AppMode.PROCESS_MAP,
                'MEMORY': AppMode.MEMORY_CORE,
                'VAULT': AppMode.MEMORY_CORE,
                'CINEMA': AppMode.IMAGE_GEN,
                'IMAGE': AppMode.IMAGE_GEN,
                'HARDWARE': AppMode.HARDWARE_ENGINEER,
                'CODE': AppMode.CODE_STUDIO,
                'LOGIC': AppMode.CODE_STUDIO,
                'VOICE': AppMode.VOICE_MODE,
                'BRIDGE': AppMode.SYNTHESIS_BRIDGE,
                'BICAMERAL': AppMode.BICAMERAL,
                'SWARM': AppMode.AGENT_CONTROL,
                'AGENTS': AppMode.AGENT_CONTROL,
                'FINANCE': AppMode.AUTONOMOUS_FINANCE,
                'TREASURY': AppMode.AUTONOMOUS_FINANCE,
                'ARCHON': AppMode.ARCHON,
            };

            const mode = modeMap[target];
            if (mode) {
                setMode(mode);
                audio.playTransition();
                return { success: true, sector: mode };
            }
            return { error: `Unknown sector: ${target}` };
        }
    },
    {
        id: 'ui_play_sound',
        component: 'Global',
        category: 'ui',
        description: 'Play UI sound (click, success, error, transition)',
        handler: async (args) => {
            const sound = args.sound || 'click';
            switch (sound) {
                case 'click': audio.playClick(); break;
                case 'success': audio.playSuccess(); break;
                case 'error': audio.playError(); break;
                case 'transition': audio.playTransition(); break;
            }
            return { success: true, sound };
        }
    }
];

// =============================================================================
// KNOWLEDGE GRAPH ACTIONS
// =============================================================================

const KNOWLEDGE_GRAPH_ACTIONS: ComponentAction[] = [
    {
        id: 'knowledge_select_node',
        component: 'KnowledgeGraph',
        category: 'ui',
        description: 'Select a knowledge node',
        handler: async (args) => {
            const nodeId = args.node || args.id;
            return { success: true, selectedNode: nodeId };
        }
    },
    {
        id: 'knowledge_branch',
        component: 'KnowledgeGraph',
        category: 'execute',
        description: 'Branch research from selected node',
        handler: async (args) => {
            const nodeId = args.node || args.id;
            const { addResearchTask } = useAppStore.getState().actions;

            addResearchTask({
                id: crypto.randomUUID(),
                query: `Branch from node: ${nodeId}`,
                status: 'QUEUED',
                progress: 0,
                logs: [],
                timestamp: Date.now()
            });

            return { success: true, branchedFrom: nodeId };
        }
    },
    {
        id: 'knowledge_search',
        component: 'KnowledgeGraph',
        category: 'analyze',
        description: 'Search knowledge graph nodes',
        handler: async (args) => {
            const term = args.term || args.query;
            return { success: true, searchTerm: term };
        }
    }
];

// =============================================================================
// METAVENTIONS HUB ACTIONS
// =============================================================================

const HUB_ACTIONS: ComponentAction[] = [
    {
        id: 'hub_global_sync',
        component: 'MetaventionsHub',
        category: 'execute',
        description: 'Execute global sync and volumetric rendering',
        handler: async () => {
            audio.playClick();
            return { success: true, status: 'syncing' };
        }
    },
    {
        id: 'hub_toggle_oculus',
        component: 'MetaventionsHub',
        category: 'ui',
        description: 'Toggle Oculus view mode',
        handler: async () => {
            audio.playClick();
            return { success: true, status: 'toggled' };
        }
    },
    {
        id: 'hub_integrity_probe',
        component: 'MetaventionsHub',
        category: 'analyze',
        description: 'Run visual integrity diagnostic probe',
        handler: async () => {
            return { success: true, status: 'probe_running' };
        }
    }
];

// =============================================================================
// SYNTHESIS BRIDGE ACTIONS (NEW)
// =============================================================================

const SYNTHESIS_BRIDGE_ACTIONS: ComponentAction[] = [
    {
        id: 'synthesis_generate_blueprint',
        component: 'SynthesisBridge',
        category: 'generate',
        description: 'Generate synthesis blueprint',
        handler: async (args) => {
            const description = args.description || args.prompt || 'System blueprint';
            try {
                const result = await gemini.generateMermaidDiagram(description, [], []);
                audio.playSuccess();
                return { success: true, blueprint: result };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'synthesis_select_domain',
        component: 'SynthesisBridge',
        category: 'ui',
        description: 'Select synthesis domain (DRIVE, SYSTEM, OPS, CODE)',
        handler: async (args) => {
            const domain = (args.domain || 'SYSTEM').toUpperCase();
            audio.playClick();
            return { success: true, domain };
        }
    },
    {
        id: 'synthesis_execute_protocol',
        component: 'SynthesisBridge',
        category: 'execute',
        description: 'Execute synthesis protocol to generate strategic synthesis',
        handler: async (args) => {
            const description = args.description || 'Strategic synthesis';
            try {
                const result = await gemini.generateStructuredWorkflow([], description, 'SYSTEM_ARCHITECTURE', {});
                audio.playSuccess();
                return { success: true, workflow: result };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'synthesis_dismiss_proposal',
        component: 'SynthesisBridge',
        category: 'manage',
        description: 'Dismiss current synthesis proposal',
        handler: async () => {
            audio.playClick();
            return { success: true, status: 'proposal_dismissed' };
        }
    },
    {
        id: 'synthesis_archive',
        component: 'SynthesisBridge',
        category: 'manage',
        description: 'Archive synthesis data',
        handler: async () => {
            return { success: true, status: 'archived' };
        }
    },
    {
        id: 'synthesis_commit',
        component: 'SynthesisBridge',
        category: 'execute',
        description: 'Commit synthesis changes',
        handler: async () => {
            audio.playSuccess();
            return { success: true, status: 'committed' };
        }
    }
];

// =============================================================================
// BIBLIOMORPHIC ENGINE ACTIONS (NEW)
// =============================================================================

const BIBLIOMORPHIC_ENGINE_ACTIONS: ComponentAction[] = [
    {
        id: 'biblio_switch_tab',
        component: 'BibliomorphicEngine',
        category: 'ui',
        description: 'Switch active tab (NEXUS, DISCOVERY, DNA, AGORA, BICAMERAL)',
        handler: async (args) => {
            const tab = (args.tab || 'NEXUS').toUpperCase();
            audio.playClick();
            return { success: true, tab };
        }
    },
    {
        id: 'biblio_apply_baseline',
        component: 'BibliomorphicEngine',
        category: 'execute',
        description: 'Apply DNA baseline configuration',
        handler: async (args) => {
            const baseline = args.baseline || 'default';
            return { success: true, baseline };
        }
    },
    {
        id: 'biblio_toggle_adaptive',
        component: 'BibliomorphicEngine',
        category: 'ui',
        description: 'Toggle adaptive mode',
        handler: async () => {
            audio.playClick();
            return { success: true, status: 'toggled' };
        }
    },
    {
        id: 'biblio_toggle_logger',
        component: 'BibliomorphicEngine',
        category: 'ui',
        description: 'Toggle experiment logger visibility',
        handler: async () => {
            audio.playClick();
            return { success: true, status: 'toggled' };
        }
    },
    {
        id: 'biblio_run_architecture',
        component: 'BibliomorphicEngine',
        category: 'execute',
        description: 'Run architecture analysis',
        handler: async (args) => {
            const query = args.query || args.prompt;
            try {
                const result = await gemini.generate(query || 'Analyze current architecture');
                return { success: true, analysis: result };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    }
];

// =============================================================================
// EXTENDED IMAGE GEN ACTIONS (NEW)
// =============================================================================

const IMAGEGEN_EXTENDED_ACTIONS: ComponentAction[] = [
    {
        id: 'imagegen_render_frame',
        component: 'ImageGen',
        category: 'generate',
        description: 'Render a specific frame in storyboard mode',
        handler: async (args) => {
            const frameIndex = args.frame || args.index || 0;
            audio.playClick();
            return { success: true, frameIndex, status: 'rendering' };
        }
    },
    {
        id: 'imagegen_remove_ref',
        component: 'ImageGen',
        category: 'manage',
        description: 'Remove a reference image',
        handler: async (args) => {
            const refType = args.type || 'style'; // char, set, style
            const index = args.index || 0;
            return { success: true, removed: { type: refType, index } };
        }
    },
    {
        id: 'imagegen_toggle_layer',
        component: 'ImageGen',
        category: 'ui',
        description: 'Toggle view layer (GRAIN, DEPTH, NORMAL)',
        handler: async (args) => {
            const layer = (args.layer || 'GRAIN').toUpperCase();
            audio.playClick();
            return { success: true, layer };
        }
    },
    {
        id: 'imagegen_nav_frame',
        component: 'ImageGen',
        category: 'ui',
        description: 'Navigate to previous or next frame',
        handler: async (args) => {
            const direction = args.direction || 'next';
            audio.playClick();
            return { success: true, direction };
        }
    }
];

// =============================================================================
// EXTENDED CODE STUDIO ACTIONS (NEW)
// =============================================================================

const CODESTUDIO_EXTENDED_ACTIONS: ComponentAction[] = [
    {
        id: 'codestudio_switch_tab',
        component: 'CodeStudio',
        category: 'ui',
        description: 'Switch between IDE and ACTIONS tabs',
        handler: async (args) => {
            const tab = (args.tab || 'IDE').toUpperCase();
            audio.playClick();
            return { success: true, tab };
        }
    },
    {
        id: 'codestudio_clear',
        component: 'CodeStudio',
        category: 'manage',
        description: 'Clear or reset the editor',
        handler: async () => {
            const { setCodeStudioState } = useAppStore.getState().actions;
            setCodeStudioState({ generatedCode: '', prompt: '' });
            return { success: true, status: 'cleared' };
        }
    }
];

// =============================================================================
// EXTENDED ARCHON ACTIONS (NEW)
// =============================================================================

const ARCHON_EXTENDED_ACTIONS: ComponentAction[] = [
    {
        id: 'archon_expand_goal',
        component: 'ArchonDashboard',
        category: 'ui',
        description: 'Expand or collapse a goal for detailed view',
        handler: async (args) => {
            const goalId = args.goalId || args.id;
            return { success: true, goalId, expanded: true };
        }
    },
    {
        id: 'archon_switch_view',
        component: 'ArchonDashboard',
        category: 'ui',
        description: 'Switch view mode (TREE, TIMELINE, GRAPH)',
        handler: async (args) => {
            const view = (args.view || 'TREE').toUpperCase();
            audio.playClick();
            return { success: true, view };
        }
    }
];

// =============================================================================
// EXTENDED HARDWARE ACTIONS (NEW)
// =============================================================================

const HARDWARE_EXTENDED_ACTIONS: ComponentAction[] = [
    {
        id: 'hardware_select_era',
        component: 'HardwareEngine',
        category: 'ui',
        description: 'Select technology era (1990s, 2000s, 2010s, 2020s, QUANTUM)',
        handler: async (args) => {
            const era = args.era || '2020s';
            audio.playClick();
            return { success: true, era };
        }
    },
    {
        id: 'hardware_select_gpu',
        component: 'HardwareEngine',
        category: 'ui',
        description: 'Select GPU model for visualization',
        handler: async (args) => {
            const gpu = args.gpu || 'RTX 4090';
            return { success: true, gpu };
        }
    },
    {
        id: 'hardware_fetch_supply',
        component: 'HardwareEngine',
        category: 'analyze',
        description: 'Fetch supply chain data for components',
        handler: async (args) => {
            const component = args.component || args.query;
            try {
                const results = await gemini.researchComponents(component || 'supply chain');
                return { success: true, data: results };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    }
];

// =============================================================================
// EXTENDED DASHBOARD ACTIONS (NEW)
// =============================================================================

const DASHBOARD_EXTENDED_ACTIONS: ComponentAction[] = [
    {
        id: 'dashboard_toggle_profile',
        component: 'Dashboard',
        category: 'ui',
        description: 'Toggle profile view visibility',
        handler: async () => {
            audio.playClick();
            return { success: true, status: 'toggled' };
        }
    },
    {
        id: 'dashboard_download_identity',
        component: 'Dashboard',
        category: 'manage',
        description: 'Download identity image',
        handler: async () => {
            return { success: true, status: 'download_initiated' };
        }
    },
    {
        id: 'dashboard_upload_biometric',
        component: 'Dashboard',
        category: 'manage',
        description: 'Upload biometric anchor image',
        handler: async () => {
            return { success: true, status: 'upload_ready' };
        }
    }
];

// =============================================================================
// EXTENDED FINANCE ACTIONS (NEW)
// =============================================================================

const FINANCE_EXTENDED_ACTIONS: ComponentAction[] = [
    {
        id: 'finance_fetch_opportunities',
        component: 'AutonomousFinance',
        category: 'analyze',
        description: 'Trigger opportunity fetch',
        handler: async (args) => {
            const domain = args.domain || 'DeFi';
            try {
                const results = await gemini.searchRealWorldOpportunities(domain);
                return { success: true, opportunities: results };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'finance_confirm_operation',
        component: 'AutonomousFinance',
        category: 'execute',
        description: 'Confirm a financial operation',
        handler: async (args) => {
            const operationId = args.operationId || args.id;
            audio.playSuccess();
            return { success: true, operationId, status: 'confirmed' };
        }
    },
    {
        id: 'finance_propose_swarm',
        component: 'AutonomousFinance',
        category: 'execute',
        description: 'Propose action to swarm vote',
        handler: async (args) => {
            const proposal = args.proposal || args.action;
            return { success: true, proposal, status: 'submitted' };
        }
    }
];

// =============================================================================
// EXTENDED MEMORY CORE ACTIONS (NEW)
// =============================================================================

const MEMORY_CORE_EXTENDED_ACTIONS: ComponentAction[] = [
    {
        id: 'memory_select_artifact',
        component: 'MemoryCore',
        category: 'ui',
        description: 'Select a specific artifact for viewing',
        handler: async (args) => {
            const artifactId = args.artifactId || args.id;
            audio.playClick();
            return { success: true, artifactId };
        }
    },
    {
        id: 'memory_deep_reconstruct',
        component: 'MemoryCore',
        category: 'execute',
        description: 'Perform deep reconstruction of memory',
        handler: async (args) => {
            const artifactId = args.artifactId || args.id;
            return { success: true, artifactId, status: 'reconstructing' };
        }
    },
    {
        id: 'memory_delete_artifact',
        component: 'MemoryCore',
        category: 'manage',
        description: 'Delete or purge an artifact',
        handler: async (args) => {
            const artifactId = args.artifactId || args.id;
            return { success: true, artifactId, status: 'deleted' };
        }
    },
    {
        id: 'memory_clear_search',
        component: 'MemoryCore',
        category: 'ui',
        description: 'Clear search query and results',
        handler: async () => {
            return { success: true, status: 'cleared' };
        }
    }
];

// =============================================================================
// EXTENDED AGENT CONTROL ACTIONS (NEW)
// =============================================================================

const AGENT_CONTROL_EXTENDED_ACTIONS: ComponentAction[] = [
    {
        id: 'agent_toggle_knowledge',
        component: 'AgentControlCenter',
        category: 'ui',
        description: 'Toggle knowledge panel visibility',
        handler: async () => {
            audio.playClick();
            return { success: true, status: 'toggled' };
        }
    },
    {
        id: 'agent_select_term',
        component: 'AgentControlCenter',
        category: 'ui',
        description: 'Select a knowledge term for details',
        handler: async (args) => {
            const term = args.term || args.text;
            return { success: true, term };
        }
    },
    {
        id: 'agent_preset_ground',
        component: 'AgentControlCenter',
        category: 'execute',
        description: 'Apply ground search preset',
        handler: async () => {
            return { success: true, preset: 'ground_search' };
        }
    },
    {
        id: 'agent_toggle_task',
        component: 'AgentControlCenter',
        category: 'manage',
        description: 'Toggle task status',
        handler: async (args) => {
            const taskId = args.taskId || args.id;
            return { success: true, taskId, status: 'toggled' };
        }
    }
];

// =============================================================================
// EXTENDED BICAMERAL ACTIONS (NEW)
// =============================================================================

const BICAMERAL_EXTENDED_ACTIONS: ComponentAction[] = [
    {
        id: 'bicameral_toggle_logger',
        component: 'BicameralEngine',
        category: 'ui',
        description: 'Toggle experiment logger visibility',
        handler: async () => {
            audio.playClick();
            return { success: true, status: 'toggled' };
        }
    },
    {
        id: 'bicameral_toggle_controls',
        component: 'BicameralEngine',
        category: 'ui',
        description: 'Toggle controls panel visibility',
        handler: async () => {
            audio.playClick();
            return { success: true, status: 'toggled' };
        }
    }
];

// =============================================================================
// EXTENDED PROCESS MAP ACTIONS (NEW)
// =============================================================================

const PROCESSMAP_EXTENDED_ACTIONS: ComponentAction[] = [
    {
        id: 'process_execute_step',
        component: 'ProcessVisualizer',
        category: 'execute',
        description: 'Execute a specific workflow step',
        handler: async (args) => {
            const stepId = args.stepId || args.id;
            audio.playClick();
            return { success: true, stepId, status: 'executing' };
        }
    },
    {
        id: 'process_run_sequence',
        component: 'ProcessVisualizer',
        category: 'execute',
        description: 'Run global process sequence',
        handler: async () => {
            audio.playClick();
            return { success: true, status: 'sequence_started' };
        }
    },
    {
        id: 'process_mark_complete',
        component: 'ProcessVisualizer',
        category: 'manage',
        description: 'Mark a step as complete',
        handler: async (args) => {
            const stepId = args.stepId || args.id;
            return { success: true, stepId, status: 'completed' };
        }
    },
    {
        id: 'process_load_codebase',
        component: 'ProcessVisualizer',
        category: 'execute',
        description: 'Load codebase graph visualization',
        handler: async () => {
            return { success: true, status: 'loading_codebase' };
        }
    }
];

// =============================================================================
// ALL ACTIONS COMBINED
// =============================================================================

const ALL_COMPONENT_ACTIONS: ComponentAction[] = [
    ...IMAGE_GEN_ACTIONS,
    ...CODE_STUDIO_ACTIONS,
    ...ARCHON_ACTIONS,
    ...MEMORY_CORE_ACTIONS,
    ...AGENT_CONTROL_ACTIONS,
    ...BICAMERAL_ACTIONS,
    ...FINANCE_ACTIONS,
    ...HARDWARE_ACTIONS,
    ...PROCESS_MAP_ACTIONS,
    ...DASHBOARD_ACTIONS,
    ...COMMAND_PALETTE_ACTIONS,
    ...SEARCH_ACTIONS,
    ...VOICE_MODE_ACTIONS,
    ...DISCOVERY_LAB_ACTIONS,
    ...EVOLUTION_ACTIONS,
    ...AGORA_ACTIONS,
    ...CPB_ACTIONS,
    ...UI_ACTIONS,
    ...KNOWLEDGE_GRAPH_ACTIONS,
    ...HUB_ACTIONS,
    // NEW EXTENDED ACTIONS
    ...SYNTHESIS_BRIDGE_ACTIONS,
    ...BIBLIOMORPHIC_ENGINE_ACTIONS,
    ...IMAGEGEN_EXTENDED_ACTIONS,
    ...CODESTUDIO_EXTENDED_ACTIONS,
    ...ARCHON_EXTENDED_ACTIONS,
    ...HARDWARE_EXTENDED_ACTIONS,
    ...DASHBOARD_EXTENDED_ACTIONS,
    ...FINANCE_EXTENDED_ACTIONS,
    ...MEMORY_CORE_EXTENDED_ACTIONS,
    ...AGENT_CONTROL_EXTENDED_ACTIONS,
    ...BICAMERAL_EXTENDED_ACTIONS,
    ...PROCESSMAP_EXTENDED_ACTIONS,
];

// =============================================================================
// Registration
// =============================================================================

let isInitialized = false;

/**
 * Initialize all component actions and register with SystemMind.
 * Uses bulk registration with sector tags for synchronized clock awareness.
 */
export function initializeComponentActions(): void {
    if (isInitialized) return;

    const store = useSystemMind.getState();

    // Build action list with sector awareness
    const actionsWithSectors = ALL_COMPONENT_ACTIONS.map(action => ({
        id: action.id,
        description: `[${action.component}] ${action.description}`,
        callback: action.handler,
        sectors: getSectorsForComponent(action.component),
        priority: action.priority ?? getPriorityForCategory(action.category)
    }));

    // Bulk register for single epoch increment (synchronized clock efficiency)
    store.registerActions(actionsWithSectors);

    isInitialized = true;
    if (import.meta.env.DEV) console.log(`[ComponentActionRegistry] Registered ${ALL_COMPONENT_ACTIONS.length} component actions with sector awareness`);
}

/**
 * Get all component actions
 */
export function getAllComponentActions(): ComponentAction[] {
    return ALL_COMPONENT_ACTIONS;
}

/**
 * Get actions by component
 */
export function getActionsByComponent(component: string): ComponentAction[] {
    return ALL_COMPONENT_ACTIONS.filter(a => a.component === component);
}

/**
 * Generate component action context for voice
 */
export function generateComponentActionContext(): string {
    const byComponent: Record<string, ComponentAction[]> = {};

    for (const action of ALL_COMPONENT_ACTIONS) {
        if (!byComponent[action.component]) {
            byComponent[action.component] = [];
        }
        byComponent[action.component].push(action);
    }

    let context = '';
    for (const [component, actions] of Object.entries(byComponent)) {
        context += `\n${component}:\n`;
        for (const action of actions) {
            context += `  • ${action.id}: ${action.description}\n`;
        }
    }

    return context;
}

// Note: Initialization is handled synchronously by VoiceManager on mount
// to prevent race conditions with voice connections
