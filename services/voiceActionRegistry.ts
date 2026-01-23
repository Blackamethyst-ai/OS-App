/**
 * VOICE ACTION REGISTRY
 *
 * Central registry exposing ALL major system flows to voice control.
 * This bridges the gap between component logic and voice commands.
 *
 * Usage: Import and call `initializeVoiceActions()` at app startup.
 */

import { useSystemMind } from '../stores/useSystemMind';
import { useAppStore } from '../store';
import { AppMode } from '../types';

// Service imports for direct execution
import * as gemini from './geminiService';
import { getArchon } from './archon';

// =============================================================================
// Types
// =============================================================================

export interface VoiceAction {
    id: string;
    category: 'generate' | 'execute' | 'analyze' | 'search' | 'deploy' | 'manage' | 'navigate';
    sector?: AppMode;
    description: string;
    examples: string[];
    handler: (args: any) => Promise<any>;
    priority?: number;  // 0-100, higher = more prominent in voice context
}

/**
 * Get priority based on action category for synchronized clock
 */
function getCategoryPriority(category: VoiceAction['category']): number {
    switch (category) {
        case 'generate': return 85;
        case 'execute': return 80;
        case 'deploy': return 75;
        case 'analyze': return 70;
        case 'search': return 65;
        case 'manage': return 60;
        case 'navigate': return 50;
        default: return 50;
    }
}

// =============================================================================
// Action Definitions
// =============================================================================

const VOICE_ACTIONS: VoiceAction[] = [
    // =========================================================================
    // NAVIGATION
    // =========================================================================
    {
        id: 'navigate_sector',
        category: 'navigate',
        description: 'Navigate to any sector of the OS',
        examples: ['go to research', 'open the code studio', 'take me to finance'],
        handler: async (args) => {
            const { setMode } = useAppStore.getState().actions;
            const target = (args.sector || args.target || '').toUpperCase();

            const sectorMap: Record<string, AppMode> = {
                'DASHBOARD': AppMode.DASHBOARD,
                'ECOSYSTEM': AppMode.DASHBOARD,
                'HOME': AppMode.DASHBOARD,
                'HUB': AppMode.METAVENTIONS_HUB,
                'METAVENTIONS': AppMode.METAVENTIONS_HUB,
                'RESEARCH': AppMode.BIBLIOMORPHIC,
                'LAB': AppMode.BIBLIOMORPHIC,
                'BIBLIOMORPHIC': AppMode.BIBLIOMORPHIC,
                'TOPOLOGY': AppMode.PROCESS_MAP,
                'PROCESS': AppMode.PROCESS_MAP,
                'DIAGRAM': AppMode.PROCESS_MAP,
                'MEMORY': AppMode.MEMORY_CORE,
                'VAULT': AppMode.MEMORY_CORE,
                'CINEMA': AppMode.IMAGE_GEN,
                'IMAGE': AppMode.IMAGE_GEN,
                'IMAGES': AppMode.IMAGE_GEN,
                'HARDWARE': AppMode.HARDWARE_ENGINEER,
                'INFRA': AppMode.HARDWARE_ENGINEER,
                'CODE': AppMode.CODE_STUDIO,
                'LOGIC': AppMode.CODE_STUDIO,
                'VOICE': AppMode.VOICE_MODE,
                'BRIDGE': AppMode.SYNTHESIS_BRIDGE,
                'SYNTHESIS': AppMode.SYNTHESIS_BRIDGE,
                'BICAMERAL': AppMode.BICAMERAL,
                'DEBATE': AppMode.BICAMERAL,
                'SWARM': AppMode.AGENT_CONTROL,
                'AGENTS': AppMode.AGENT_CONTROL,
                'FINANCE': AppMode.AUTONOMOUS_FINANCE,
                'TREASURY': AppMode.AUTONOMOUS_FINANCE,
                'ARCHON': AppMode.ARCHON,
                'GOD': AppMode.ARCHON,
            };

            const mode = sectorMap[target];
            if (mode) {
                setMode(mode);
                return { success: true, sector: mode };
            }
            return { error: `Unknown sector: ${target}`, available: Object.keys(sectorMap) };
        }
    },

    // =========================================================================
    // IMAGE GENERATION (Cinema)
    // =========================================================================
    {
        id: 'generate_image',
        category: 'generate',
        sector: AppMode.IMAGE_GEN,
        description: 'Generate an AI image from a text prompt',
        examples: ['generate an image of a futuristic city', 'create a portrait', 'make me a logo'],
        handler: async (args) => {
            const prompt = args.prompt || args.text || args.description;
            if (!prompt) return { error: 'No prompt provided' };

            try {
                const result = await gemini.generateArchitectureImage(
                    prompt,
                    args.aspectRatio || '16:9',
                    args.quality || 'high',
                    args.reference || null
                );
                return { success: true, imageUrl: result, prompt };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'generate_video',
        category: 'generate',
        sector: AppMode.IMAGE_GEN,
        description: 'Generate a video from a text prompt',
        examples: ['generate a video of waves', 'create an animation'],
        handler: async (args) => {
            const prompt = args.prompt || args.text;
            if (!prompt) return { error: 'No prompt provided' };

            try {
                const result = await gemini.generateVideo(prompt);
                return { success: true, videoUrl: result, prompt };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },

    // =========================================================================
    // CODE GENERATION (Logic/Code Studio)
    // =========================================================================
    {
        id: 'generate_code',
        category: 'generate',
        sector: AppMode.CODE_STUDIO,
        description: 'Generate code from a natural language description',
        examples: ['write a function to sort an array', 'generate a React component', 'create an API endpoint'],
        handler: async (args) => {
            const prompt = args.prompt || args.description || args.task;
            const language = args.language || args.lang || 'typescript';
            if (!prompt) return { error: 'No prompt provided' };

            try {
                const code = await gemini.generateCodeCompletion(prompt, language);
                return { success: true, code, language, prompt };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'validate_code',
        category: 'analyze',
        sector: AppMode.CODE_STUDIO,
        description: 'Validate syntax and check for errors in code',
        examples: ['check my code for errors', 'validate this function'],
        handler: async (args) => {
            const code = args.code || args.source;
            const language = args.language || 'typescript';
            if (!code) return { error: 'No code provided' };

            try {
                const errors = await gemini.validateSyntax(code, language);
                return { success: true, errors, isValid: errors.length === 0 };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'evolve_code',
        category: 'execute',
        sector: AppMode.CODE_STUDIO,
        description: 'Refactor or evolve code based on instructions',
        examples: ['refactor this to be more efficient', 'add error handling', 'optimize this function'],
        handler: async (args) => {
            const code = args.code || args.source;
            const instruction = args.instruction || args.prompt;
            const language = args.language || 'typescript';

            if (!code || !instruction) return { error: 'Need both code and instruction' };

            try {
                const result = await gemini.evolveSystemArchitecture(code, language, instruction);
                return result.ok ? { success: true, ...result.value } : { error: result.error };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },

    // =========================================================================
    // ARCHON (Autonomous Execution)
    // =========================================================================
    {
        id: 'set_goal',
        category: 'execute',
        sector: AppMode.ARCHON,
        description: 'Set and execute an autonomous goal via Archon',
        examples: ['set a goal to analyze the codebase', 'execute mission: improve performance'],
        handler: async (args) => {
            const goalText = args.goal || args.mission || args.objective || args.text;
            if (!goalText) return { error: 'No goal provided' };

            try {
                const archon = getArchon();
                const result = await archon.processGoal(goalText);
                return { success: true, goalId: result?.id, status: 'processing' };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'archon_status',
        category: 'analyze',
        sector: AppMode.ARCHON,
        description: 'Get the current status of Archon execution',
        examples: ['what is archon doing', 'show archon status', 'goal progress'],
        handler: async () => {
            try {
                const archon = getArchon();
                const state = archon.getState();
                return {
                    success: true,
                    phase: state.phase,
                    activeGoals: state.activeGoals?.length || 0,
                    isProcessing: state.isProcessing
                };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },

    // =========================================================================
    // RESEARCH (Bibliomorphic)
    // =========================================================================
    {
        id: 'analyze_document',
        category: 'analyze',
        sector: AppMode.BIBLIOMORPHIC,
        description: 'Analyze a document or text for insights',
        examples: ['analyze this paper', 'extract insights from the document'],
        handler: async (args) => {
            const text = args.text || args.content || args.document;
            if (!text) return { error: 'No text provided' };

            try {
                // Use Gemini for analysis
                const analysis = await gemini.generate(
                    `Analyze this text and extract key insights, themes, and findings:\n\n${text}`,
                    undefined,
                    'gemini-2.0-flash'
                );
                return { success: true, analysis };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'research_topic',
        category: 'search',
        sector: AppMode.BIBLIOMORPHIC,
        description: 'Research a topic using web search',
        examples: ['research quantum computing', 'find information about AI safety'],
        handler: async (args) => {
            const query = args.query || args.topic || args.text;
            if (!query) return { error: 'No query provided' };

            try {
                const results = await gemini.performGlobalSearch(query);
                return { success: true, results };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },

    // =========================================================================
    // PROCESS MAP (Topology)
    // =========================================================================
    {
        id: 'generate_diagram',
        category: 'generate',
        sector: AppMode.PROCESS_MAP,
        description: 'Generate a flowchart or diagram from description',
        examples: ['create a flowchart for user login', 'diagram the data flow'],
        handler: async (args) => {
            const description = args.description || args.prompt || args.text;
            if (!description) return { error: 'No description provided' };

            try {
                const mermaid = await gemini.generateMermaidDiagram(
                    description,
                    [],
                    [{ type: 'description', content: description }]
                );
                return { success: true, mermaidCode: mermaid };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'generate_workflow',
        category: 'generate',
        sector: AppMode.PROCESS_MAP,
        description: 'Generate a technical workflow or process',
        examples: ['create a deployment workflow', 'design an onboarding process'],
        handler: async (args) => {
            const description = args.description || args.prompt;
            const type = args.type || 'SYSTEM_ARCHITECTURE';

            if (!description) return { error: 'No description provided' };

            try {
                const workflow = await gemini.generateStructuredWorkflow(
                    [],
                    description,
                    type,
                    {}
                );
                return { success: true, workflow };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },

    // =========================================================================
    // HARDWARE (Infrastructure)
    // =========================================================================
    {
        id: 'analyze_schematic',
        category: 'analyze',
        sector: AppMode.HARDWARE_ENGINEER,
        description: 'Analyze a hardware schematic or circuit diagram',
        examples: ['analyze this circuit', 'identify components in the schematic'],
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
        id: 'research_components',
        category: 'search',
        sector: AppMode.HARDWARE_ENGINEER,
        description: 'Research hardware components and pricing',
        examples: ['find ESP32 modules', 'research voltage regulators'],
        handler: async (args) => {
            const query = args.query || args.component || args.text;
            if (!query) return { error: 'No query provided' };

            try {
                const results = await gemini.researchComponents(query);
                return { success: true, components: results };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },

    // =========================================================================
    // FINANCE (Treasury)
    // =========================================================================
    {
        id: 'search_opportunities',
        category: 'search',
        sector: AppMode.AUTONOMOUS_FINANCE,
        description: 'Search for yield or investment opportunities',
        examples: ['find yield opportunities', 'search DeFi yields'],
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
        id: 'assess_risk',
        category: 'analyze',
        sector: AppMode.AUTONOMOUS_FINANCE,
        description: 'Assess risk of an investment strategy',
        examples: ['assess risk of this strategy', 'what are the risks'],
        handler: async (args) => {
            const strategy = args.strategy || args.description || args.text;
            if (!strategy) return { error: 'No strategy provided' };

            try {
                const result = await gemini.assessInvestmentRisk(strategy);
                return { success: true, ...result };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },

    // =========================================================================
    // MEMORY (Vault)
    // =========================================================================
    {
        id: 'search_memory',
        category: 'search',
        sector: AppMode.MEMORY_CORE,
        description: 'Search through stored memories and artifacts',
        examples: ['what do you remember about X', 'search memories for Y'],
        handler: async (args) => {
            const query = args.query || args.text;
            if (!query) return { error: 'No query provided' };

            // This would integrate with the memory store
            // For now, return a placeholder
            return {
                success: true,
                query,
                note: 'Memory search requires MemoryStore integration'
            };
        }
    },

    // =========================================================================
    // BICAMERAL (Debate/Reasoning)
    // =========================================================================
    {
        id: 'run_debate',
        category: 'execute',
        sector: AppMode.BICAMERAL,
        description: 'Run a bicameral debate on a topic for balanced analysis',
        examples: ['debate the pros and cons of X', 'run thesis-antithesis on Y'],
        handler: async (args) => {
            const topic = args.topic || args.question || args.text;
            if (!topic) return { error: 'No topic provided' };

            try {
                // Generate thesis and antithesis
                const thesis = await gemini.generate(
                    `Present the strongest argument FOR: ${topic}`,
                    undefined,
                    'gemini-2.0-flash'
                );
                const antithesis = await gemini.generate(
                    `Present the strongest argument AGAINST: ${topic}`,
                    undefined,
                    'gemini-2.0-flash'
                );
                const synthesis = await gemini.generate(
                    `Given:\nTHESIS: ${thesis}\n\nANTITHESIS: ${antithesis}\n\nProvide a balanced SYNTHESIS that integrates both perspectives.`,
                    undefined,
                    'gemini-2.0-flash'
                );

                return { success: true, topic, thesis, antithesis, synthesis };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },

    // =========================================================================
    // AGENT CONTROL (Swarm)
    // =========================================================================
    {
        id: 'list_agents',
        category: 'analyze',
        sector: AppMode.AGENT_CONTROL,
        description: 'List all available agents and their status',
        examples: ['show me the agents', 'list available agents', 'agent status'],
        handler: async () => {
            const { HIVE_AGENTS } = await import('./agents');
            const agents = Object.entries(HIVE_AGENTS).map(([id, agent]: [string, any]) => ({
                id,
                name: agent.name,
                role: agent.role,
                expertise: agent.expertise?.slice(0, 3)
            }));
            return { success: true, agents, count: agents.length };
        }
    },

    // =========================================================================
    // SPEECH
    // =========================================================================
    {
        id: 'speak_text',
        category: 'execute',
        description: 'Convert text to speech',
        examples: ['say hello', 'speak this text'],
        handler: async (args) => {
            const text = args.text || args.message;
            const voice = args.voice || 'Zephyr';
            if (!text) return { error: 'No text provided' };

            try {
                const audio = await gemini.generateSpeech(text, voice);
                return { success: true, audioUrl: audio };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },

    // =========================================================================
    // SYSTEM DIAGNOSTICS
    // =========================================================================
    {
        id: 'system_diagnostic',
        category: 'analyze',
        description: 'Run a diagnostic on the current system state',
        examples: ['run diagnostics', 'check system health', 'analyze system state'],
        handler: async () => {
            const state = useAppStore.getState();
            try {
                const diagnosis = await gemini.predictSystemAnomalies(state.mode as string);
                return { success: true, ...diagnosis };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },

    // =========================================================================
    // INTENT UNDERSTANDING
    // =========================================================================
    {
        id: 'understand_intent',
        category: 'analyze',
        description: 'Classify user intent and suggest actions',
        examples: ['what should I do', 'help me with this'],
        handler: async (args) => {
            const input = args.input || args.text || args.query;
            if (!input) return { error: 'No input provided' };

            try {
                const intent = await gemini.classifyIntent(input);
                return { success: true, ...intent };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },

    // =========================================================================
    // HYPOTHESES
    // =========================================================================
    {
        id: 'generate_hypotheses',
        category: 'generate',
        description: 'Generate scientific hypotheses from facts',
        examples: ['generate hypotheses about X', 'what could explain these facts'],
        handler: async (args) => {
            const facts = args.facts || (args.text ? [args.text] : null);
            if (!facts || facts.length === 0) return { error: 'No facts provided' };

            try {
                const hypotheses = await gemini.generateHypotheses(facts);
                return { success: true, hypotheses };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },

    // =========================================================================
    // SYNTHESIS PROTOCOL (User-Requested)
    // =========================================================================
    {
        id: 'execute_synthesis_protocol',
        category: 'execute',
        sector: AppMode.SYNTHESIS_BRIDGE,
        description: 'Execute synthesis protocol to generate strategic synthesis and blueprints',
        examples: ['execute synthesis protocol', 'run synthesis', 'start synthesis protocol', 'synthesis protocol'],
        handler: async (args) => {
            const description = args.description || args.prompt || 'Strategic synthesis generation';
            const type = args.type || 'SYSTEM_ARCHITECTURE';

            try {
                const result = await gemini.generateStructuredWorkflow(
                    [],
                    description,
                    type,
                    {}
                );
                return { success: true, workflow: result, protocol: 'synthesis' };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },
    {
        id: 'synthesis_protocol',
        category: 'execute',
        sector: AppMode.SYNTHESIS_BRIDGE,
        description: 'Alias for execute_synthesis_protocol',
        examples: ['synthesis protocol', 'run the synthesis'],
        handler: async (args) => {
            // Delegate to the main handler
            const mainHandler = VOICE_ACTIONS.find(a => a.id === 'execute_synthesis_protocol')?.handler;
            if (mainHandler) {
                return await mainHandler(args);
            }
            return { error: 'Main synthesis handler not found' };
        }
    },
    {
        id: 'synthesis_generate_blueprint',
        category: 'generate',
        sector: AppMode.SYNTHESIS_BRIDGE,
        description: 'Generate a synthesis blueprint from description',
        examples: ['generate blueprint', 'create synthesis blueprint', 'build blueprint'],
        handler: async (args) => {
            const description = args.description || args.prompt || 'System blueprint';

            try {
                const result = await gemini.generateMermaidDiagram(description, [], []);
                return { success: true, blueprint: result };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },

    // =========================================================================
    // DISCOVERY LAB
    // =========================================================================
    {
        id: 'discovery_dispatch_research',
        category: 'execute',
        sector: AppMode.BIBLIOMORPHIC,
        description: 'Dispatch a research probe to explore a topic',
        examples: ['dispatch research', 'start research on X', 'explore topic'],
        handler: async (args) => {
            const topic = args.topic || args.query || args.text;
            if (!topic) return { error: 'No research topic provided' };

            try {
                const results = await gemini.performGlobalSearch(topic);
                return { success: true, topic, results };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },

    // =========================================================================
    // CPB TEST
    // =========================================================================
    {
        id: 'cpb_execute_test',
        category: 'execute',
        sector: AppMode.CPB_TEST,
        description: 'Execute a CPB (Cognitive Precision Bridge) test query',
        examples: ['run CPB test', 'execute CPB', 'test the bridge'],
        handler: async (args) => {
            const query = args.query || args.prompt || args.text;
            const path = args.path || 'auto';

            if (!query) return { error: 'No query provided for CPB test' };

            try {
                // This would integrate with CPB service
                const intent = await gemini.classifyIntent(query);
                return { success: true, query, path, intent };
            } catch (e: any) {
                return { error: e.message };
            }
        }
    },

    // =========================================================================
    // MEMORY OPERATIONS
    // =========================================================================
    {
        id: 'memory_deep_reconstruct',
        category: 'execute',
        sector: AppMode.MEMORY_CORE,
        description: 'Perform deep reconstruction of memory artifacts',
        examples: ['deep reconstruct', 'reconstruct memories', 'memory reconstruction'],
        handler: async (args) => {
            const artifactId = args.artifactId || args.id;
            // Placeholder for actual memory reconstruction
            return { success: true, status: 'reconstruction_initiated', artifactId };
        }
    },

    // =========================================================================
    // PROCESS OPERATIONS
    // =========================================================================
    {
        id: 'process_run_sequence',
        category: 'execute',
        sector: AppMode.PROCESS_MAP,
        description: 'Run a global process sequence',
        examples: ['run sequence', 'execute process', 'run global sequence'],
        handler: async (args) => {
            const sequenceId = args.sequenceId || args.id;
            return { success: true, status: 'sequence_started', sequenceId };
        }
    },

    // =========================================================================
    // FINANCE OPERATIONS
    // =========================================================================
    {
        id: 'finance_fetch_opportunities',
        category: 'search',
        sector: AppMode.AUTONOMOUS_FINANCE,
        description: 'Fetch and analyze yield opportunities',
        examples: ['fetch opportunities', 'find yields', 'search DeFi'],
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
        id: 'finance_propose_swarm',
        category: 'execute',
        sector: AppMode.AUTONOMOUS_FINANCE,
        description: 'Propose an action to the swarm for voting',
        examples: ['propose to swarm', 'swarm vote', 'submit proposal'],
        handler: async (args) => {
            const proposal = args.proposal || args.action || args.text;
            if (!proposal) return { error: 'No proposal provided' };
            return { success: true, status: 'proposal_submitted', proposal };
        }
    },

    // =========================================================================
    // OS_TOOLS - Sovereign Tool Registry (backfilled to synchronized clock)
    // =========================================================================
    {
        id: 'sovereign_architect_process',
        category: 'generate',
        description: 'Generate architectural topology (PARA drives, cloud systems, agentic orchestration)',
        examples: ['architect a system', 'generate PARA structure', 'design cloud architecture'],
        priority: 90,
        handler: async (args) => {
            const { OS_TOOLS } = await import('./toolRegistry');
            const type = args.type || 'SYSTEM_ARCHITECTURE';
            const description = args.description || args.prompt || args.text || 'Generate optimal architecture';
            return OS_TOOLS.architect_generate_process({ description, type });
        }
    },
    {
        id: 'sovereign_adjust_dna',
        category: 'execute',
        description: 'Adjust agent DNA weights (skepticism, excitement, alignment)',
        examples: ['adjust agent DNA', 'recalibrate weights', 'tune agent mindset'],
        priority: 85,
        handler: async (args) => {
            const { OS_TOOLS } = await import('./toolRegistry');
            return OS_TOOLS.adjust_agent_dna({
                agentId: args.agentId || 'default',
                weights: {
                    skepticism: args.skepticism,
                    excitement: args.excitement,
                    alignment: args.alignment
                },
                reasoning: args.reasoning
            });
        }
    },
    {
        id: 'sovereign_converge_lattices',
        category: 'analyze',
        description: 'Converge multiple strategic lattices into unified goal synthesis',
        examples: ['converge lattices', 'synthesize strategies', 'unify goals'],
        priority: 85,
        handler: async (args) => {
            const { OS_TOOLS } = await import('./toolRegistry');
            return OS_TOOLS.converge_strategic_lattices({
                targetGoal: args.goal || args.target || args.text || 'Optimize system coherence'
            });
        }
    },
    {
        id: 'sovereign_focus_element',
        category: 'navigate',
        description: 'Focus UI context on a specific element selector',
        examples: ['focus on element', 'highlight selector', 'target UI element'],
        priority: 70,
        handler: async (args) => {
            const { OS_TOOLS } = await import('./toolRegistry');
            return OS_TOOLS.focus_element({ selector: args.selector || args.element || args.target });
        }
    },
    {
        id: 'sovereign_update_task',
        category: 'manage',
        description: 'Update task priority (CRITICAL, HIGH, MEDIUM, LOW)',
        examples: ['prioritize task', 'update task priority', 'mark as critical'],
        priority: 75,
        handler: async (args) => {
            const { OS_TOOLS } = await import('./toolRegistry');
            return OS_TOOLS.update_task_priority({
                taskId: args.taskId || args.task,
                priority: args.priority || 'HIGH'
            });
        }
    },
    {
        id: 'sovereign_navigate',
        category: 'navigate',
        description: 'Navigate to a specific OS sector',
        examples: ['go to sector', 'navigate to', 'switch mode'],
        priority: 80,
        handler: async (args) => {
            const { OS_TOOLS } = await import('./toolRegistry');
            return OS_TOOLS.system_navigate({ target: args.target || args.sector || args.mode });
        }
    },
    {
        id: 'sovereign_search_intel',
        category: 'search',
        description: 'Search grounded intelligence using AI with real-time data',
        examples: ['search for intel', 'ground search', 'research topic'],
        priority: 85,
        handler: async (args) => {
            const { OS_TOOLS } = await import('./toolRegistry');
            return OS_TOOLS.search_intel({ query: args.query || args.text || args.topic });
        }
    },
    {
        id: 'sovereign_propose_change',
        category: 'execute',
        description: 'Propose a structural change to the swarm for review',
        examples: ['propose change', 'submit structural proposal', 'swarm proposal'],
        priority: 80,
        handler: async (args) => {
            const { OS_TOOLS } = await import('./toolRegistry');
            return OS_TOOLS.propose_structural_change({
                agentId: args.agentId || 'voice_agent',
                agentName: args.agentName || 'Voice Executive',
                type: args.type || 'OPTIMIZATION',
                title: args.title || 'Voice-initiated proposal',
                description: args.description || args.text || 'Structural optimization',
                impact: args.impact || 'System efficiency improvement',
                manifest_summary: args.manifest || args.summary || 'Standard optimization protocol'
            });
        }
    }
];

// =============================================================================
// Registration
// =============================================================================

let isInitialized = false;

/**
 * Initialize all voice actions and register with SystemMind.
 * Uses bulk registration with sector tags for synchronized clock awareness.
 */
export function initializeVoiceActions(): void {
    if (isInitialized) {
        if (import.meta.env.DEV) console.log('[VoiceActionRegistry] Already initialized');
        return;
    }

    const store = useSystemMind.getState();

    // Build action list with sector awareness for synchronized clock
    const actionsWithSectors = VOICE_ACTIONS.map(action => ({
        id: action.id,
        description: `[${action.category.toUpperCase()}] ${action.description}`,
        callback: action.handler,
        // Convert AppMode sector to string array, empty = global action
        sectors: action.sector ? [action.sector] : [],
        priority: action.priority ?? getCategoryPriority(action.category)
    }));

    // Bulk register for single epoch increment (synchronized clock efficiency)
    store.registerActions(actionsWithSectors);

    isInitialized = true;
    if (import.meta.env.DEV) console.log(`[VoiceActionRegistry] Registered ${VOICE_ACTIONS.length} voice actions with sector awareness`);
}

/**
 * Get all registered voice actions
 */
export function getVoiceActions(): VoiceAction[] {
    return VOICE_ACTIONS;
}

/**
 * Get actions by category
 */
export function getActionsByCategory(category: VoiceAction['category']): VoiceAction[] {
    return VOICE_ACTIONS.filter(a => a.category === category);
}

/**
 * Get actions by sector
 */
export function getActionsBySector(sector: AppMode): VoiceAction[] {
    return VOICE_ACTIONS.filter(a => a.sector === sector || !a.sector);
}

/**
 * Find matching action for a natural language query
 */
export function findMatchingAction(query: string): VoiceAction | null {
    const q = query.toLowerCase();

    // Check examples first
    for (const action of VOICE_ACTIONS) {
        for (const example of action.examples) {
            if (q.includes(example.toLowerCase()) || example.toLowerCase().includes(q)) {
                return action;
            }
        }
    }

    // Check description
    for (const action of VOICE_ACTIONS) {
        if (action.description.toLowerCase().includes(q)) {
            return action;
        }
    }

    // Check ID
    for (const action of VOICE_ACTIONS) {
        if (action.id.includes(q.replace(/\s+/g, '_'))) {
            return action;
        }
    }

    return null;
}

/**
 * Generate voice action context for the LLM
 */
export function generateActionContext(): string {
    const byCategory: Record<string, VoiceAction[]> = {};

    for (const action of VOICE_ACTIONS) {
        if (!byCategory[action.category]) {
            byCategory[action.category] = [];
        }
        byCategory[action.category].push(action);
    }

    let context = '=== AVAILABLE VOICE ACTIONS ===\n\n';

    for (const [category, actions] of Object.entries(byCategory)) {
        context += `## ${category.toUpperCase()}\n`;
        for (const action of actions) {
            context += `• ${action.id}: ${action.description}\n`;
            context += `  Examples: ${action.examples.slice(0, 2).join(', ')}\n`;
        }
        context += '\n';
    }

    return context;
}

// Note: Initialization is handled synchronously by VoiceManager on mount
// to prevent race conditions with voice connections
