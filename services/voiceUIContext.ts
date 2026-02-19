/**
 * VOICE UI CONTEXT - Rich knowledge base for voice agent
 *
 * Provides comprehensive descriptions of all UI sectors, components,
 * and features so the voice agent can explain the app to users.
 */

import { AppMode } from '../types';

export interface SectorKnowledge {
    id: AppMode;
    name: string;
    shortName: string;
    description: string;
    features: string[];
    keyComponents: string[];
    useCases: string[];
    voiceCommands: string[];
}

export const UI_KNOWLEDGE_BASE: Record<AppMode, SectorKnowledge> = {
    [AppMode.DASHBOARD]: {
        id: AppMode.DASHBOARD,
        name: 'Ecosystem Dashboard',
        shortName: 'Ecosystem',
        description: 'The central command hub displaying real-time system health, active agents, recent activity logs, and quick-action widgets. This is your home base for monitoring the entire Metaventions OS.',
        features: [
            'Real-time system health monitoring with CPU, memory, and network metrics',
            'Active agent status cards showing which AI agents are currently running',
            'Activity log stream with filterable event types',
            'Quick-action widgets for common operations',
            'Contextual velocity chart showing productivity patterns',
            'Biometric panel integration for stress and focus detection'
        ],
        keyComponents: ['Dashboard', 'GlobalStatusBar', 'ActivityLog', 'BiometricPanel', 'ContextVelocityChart'],
        useCases: [
            'Monitor overall system performance',
            'Check which agents are active',
            'Review recent activity and logs',
            'Quick navigation to other sectors'
        ],
        voiceCommands: ['show dashboard', 'go to ecosystem', 'system status', 'show me the home']
    },

    [AppMode.METAVENTIONS_HUB]: {
        id: AppMode.METAVENTIONS_HUB,
        name: 'Metaventions Hub',
        shortName: 'Hub',
        description: 'The innovation incubator where new ideas and inventions are tracked, developed, and managed. Contains the patent pipeline, invention cards, and collaborative brainstorming tools.',
        features: [
            'Invention tracking cards with status workflows',
            'Patent pipeline visualization',
            'Collaborative ideation workspace',
            'Innovation scoring and prioritization',
            'Integration with research tools'
        ],
        keyComponents: ['MetaventionsHub', 'InventionCard', 'PatentPipeline'],
        useCases: [
            'Track invention ideas from concept to patent',
            'Collaborate on new innovations',
            'Prioritize R&D efforts',
            'Manage intellectual property pipeline'
        ],
        voiceCommands: ['show inventions', 'open hub', 'metaventions', 'show my ideas']
    },

    [AppMode.BIBLIOMORPHIC]: {
        id: AppMode.BIBLIOMORPHIC,
        name: 'Research Lab (Bibliomorphic Engine)',
        shortName: 'Research',
        description: 'Advanced research and knowledge synthesis engine. Upload documents, analyze papers, extract insights, and build knowledge graphs from your research materials.',
        features: [
            'Document upload and analysis (PDF, images, text)',
            'AI-powered insight extraction and summarization',
            'Knowledge graph visualization of concepts and relationships',
            'Citation tracking and bibliography management',
            'Cross-reference analysis between documents',
            'Research hypothesis generation'
        ],
        keyComponents: ['BibliomorphicEngine', 'KnowledgeGraph', 'DocumentUploader', 'InsightExtractor'],
        useCases: [
            'Analyze research papers and extract key findings',
            'Build knowledge maps from documents',
            'Generate literature reviews',
            'Track citations and references'
        ],
        voiceCommands: ['open research', 'bibliomorphic', 'analyze document', 'show knowledge graph']
    },

    [AppMode.PROCESS_MAP]: {
        id: AppMode.PROCESS_MAP,
        name: 'Topology (Process Map)',
        shortName: 'Topology',
        description: 'Visual process mapping and workflow design tool. Create flowcharts, system architectures, and process diagrams using AI-assisted generation or manual editing.',
        features: [
            'AI-generated process flowcharts from natural language',
            'Mermaid.js diagram rendering',
            'Drag-and-drop workflow editor',
            'Template library for common architectures',
            'Export to various formats (SVG, PNG, Mermaid)',
            'Real-time collaboration on diagrams'
        ],
        keyComponents: ['ProcessMap', 'MermaidRenderer', 'FlowchartEditor', 'TemplateGallery'],
        useCases: [
            'Design system architectures',
            'Map business processes',
            'Create technical documentation diagrams',
            'Visualize data flows'
        ],
        voiceCommands: ['open topology', 'process map', 'create diagram', 'show flowchart']
    },

    [AppMode.MEMORY_CORE]: {
        id: AppMode.MEMORY_CORE,
        name: 'Memory Vault',
        shortName: 'Memory',
        description: 'Persistent memory and knowledge storage system. The OS remembers context, decisions, and learnings across sessions. View, search, and manage stored memories.',
        features: [
            'Semantic memory search',
            'Memory timeline visualization',
            'Context compression and summarization',
            'Memory tagging and categorization',
            'Dream protocol for memory consolidation',
            'Export/import memory snapshots'
        ],
        keyComponents: ['MemoryCore', 'MemoryTimeline', 'SemanticSearch', 'DreamProtocol'],
        useCases: [
            'Review past conversations and decisions',
            'Search for previously discussed topics',
            'Manage what the OS remembers',
            'Consolidate learnings across sessions'
        ],
        voiceCommands: ['open memory', 'show vault', 'what do you remember about', 'search memories']
    },

    [AppMode.IMAGE_GEN]: {
        id: AppMode.IMAGE_GEN,
        name: 'Cinema (Image Generation)',
        shortName: 'Cinema',
        description: 'AI-powered image generation studio. Create photorealistic images, concept art, UI mockups, and visual assets using advanced generative models.',
        features: [
            'Text-to-image generation with multiple styles',
            'Image-to-image transformation',
            'Style presets (photorealistic, concept art, technical)',
            'Batch generation with variations',
            'Image upscaling and enhancement',
            'Gallery management for generated assets'
        ],
        keyComponents: ['ImageGen', 'ImageGallery', 'StylePresets', 'GenerationQueue'],
        useCases: [
            'Generate concept art for projects',
            'Create UI mockups and visual designs',
            'Produce marketing and presentation visuals',
            'Explore visual variations of ideas'
        ],
        voiceCommands: ['open cinema', 'generate image', 'create visual', 'show image gallery']
    },

    [AppMode.HARDWARE_ENGINEER]: {
        id: AppMode.HARDWARE_ENGINEER,
        name: 'Hardware Infrastructure',
        shortName: 'Hardware',
        description: 'Hardware design and schematic analysis tools. Upload circuit schematics, PCB designs, or hardware specs for AI-assisted analysis and component research.',
        features: [
            'Schematic upload and AI analysis',
            'Component identification and lookup',
            'Bill of materials (BOM) generation',
            'X-ray and thermal visualization modes',
            'Component sourcing and price research',
            'Design rule checking'
        ],
        keyComponents: ['HardwareEngine', 'SchematicViewer', 'ComponentDatabase', 'BOMGenerator'],
        useCases: [
            'Analyze circuit schematics',
            'Research component alternatives',
            'Generate bills of materials',
            'Debug hardware designs'
        ],
        voiceCommands: ['open hardware', 'analyze schematic', 'show components', 'infrastructure']
    },

    [AppMode.CODE_STUDIO]: {
        id: AppMode.CODE_STUDIO,
        name: 'Logic (Code Studio)',
        shortName: 'Logic',
        description: 'Integrated code editing and AI-assisted development environment. Write, analyze, refactor, and generate code with AI copilot assistance.',
        features: [
            'Multi-language code editor with syntax highlighting',
            'AI code generation from natural language',
            'Code review and refactoring suggestions',
            'Syntax validation and error detection',
            'Code explanation and documentation generation',
            'Version comparison and diff view'
        ],
        keyComponents: ['CodeStudio', 'CodeEditor', 'AIAssistant', 'SyntaxValidator'],
        useCases: [
            'Write and edit code with AI assistance',
            'Generate code from descriptions',
            'Refactor and optimize existing code',
            'Get explanations of complex code'
        ],
        voiceCommands: ['open code studio', 'show logic', 'write code', 'generate function']
    },

    [AppMode.VOICE_MODE]: {
        id: AppMode.VOICE_MODE,
        name: 'Voice Core',
        shortName: 'Voice',
        description: 'Real-time voice conversation interface. Speak directly with AI agents using natural language. Features voice visualization, transcript history, and agent switching.',
        features: [
            'Real-time voice streaming with Gemini Live',
            'Audio visualization (input/output frequencies)',
            'Live transcription display',
            'Agent switching mid-conversation',
            'Voice command execution for navigation',
            'DNA calibration for agent personality'
        ],
        keyComponents: ['VoiceMode', 'VoiceManager', 'FrequencyVisualizer', 'TranscriptPanel'],
        useCases: [
            'Hands-free interaction with the OS',
            'Natural conversation with AI agents',
            'Voice-controlled navigation',
            'Dictation and voice notes'
        ],
        voiceCommands: ['voice mode', 'start listening', 'switch to agent', 'show transcript']
    },

    [AppMode.SYNTHESIS_BRIDGE]: {
        id: AppMode.SYNTHESIS_BRIDGE,
        name: 'Synthesis Bridge',
        shortName: 'Bridge',
        description: 'Cross-domain synthesis and integration hub. Connect outputs from different sectors, merge insights, and create unified deliverables.',
        features: [
            'Multi-sector data aggregation',
            'Cross-domain insight synthesis',
            'Unified report generation',
            'Integration pipeline management',
            'Export to multiple formats'
        ],
        keyComponents: ['SynthesisBridge', 'DataAggregator', 'ReportGenerator'],
        useCases: [
            'Combine research with generated visuals',
            'Create comprehensive project reports',
            'Integrate outputs from multiple workflows',
            'Generate unified documentation'
        ],
        voiceCommands: ['open bridge', 'synthesis', 'combine outputs', 'generate report']
    },

    [AppMode.BICAMERAL]: {
        id: AppMode.BICAMERAL,
        name: 'Bicameral Engine',
        shortName: 'Bicameral',
        description: 'Dual-mind reasoning system. Run parallel analysis with opposing viewpoints (thesis vs antithesis) to reach balanced synthesis through structured debate.',
        features: [
            'Dual-agent adversarial reasoning',
            'Thesis-antithesis-synthesis framework',
            'Structured debate transcripts',
            'Confidence scoring for conclusions',
            'Argument strength visualization',
            'Decision matrix generation'
        ],
        keyComponents: ['BicameralEngine', 'DebatePanel', 'SynthesisView', 'ArgumentGraph'],
        useCases: [
            'Make complex decisions with balanced analysis',
            'Explore pros and cons systematically',
            'Resolve conflicting viewpoints',
            'Generate well-reasoned conclusions'
        ],
        voiceCommands: ['open bicameral', 'start debate', 'thesis antithesis', 'balanced analysis']
    },

    [AppMode.AGENT_CONTROL]: {
        id: AppMode.AGENT_CONTROL,
        name: 'Swarm (Agent Control Center)',
        shortName: 'Swarm',
        description: 'Multi-agent orchestration dashboard. Manage, deploy, and monitor AI agent swarms. Configure agent DNA, view execution graphs, and coordinate complex multi-agent workflows.',
        features: [
            'Agent deployment and lifecycle management',
            'Real-time agent activity monitoring',
            'DNA calibration for agent personalities',
            'Execution graph visualization',
            'Agent communication logs',
            'Swarm coordination protocols'
        ],
        keyComponents: ['AgentControlCenter', 'AgentCard', 'ExecutionGraph', 'DNAPanel'],
        useCases: [
            'Deploy and manage AI agents',
            'Monitor agent activities in real-time',
            'Configure agent behaviors and personalities',
            'Orchestrate multi-agent workflows'
        ],
        voiceCommands: ['open swarm', 'agent control', 'show agents', 'deploy agent']
    },

    [AppMode.AUTONOMOUS_FINANCE]: {
        id: AppMode.AUTONOMOUS_FINANCE,
        name: 'Treasury (Autonomous Finance)',
        shortName: 'Treasury',
        description: 'Financial analysis and autonomous trading research. Analyze markets, research opportunities, assess risks, and explore yield strategies.',
        features: [
            'Market research with real-time data',
            'Risk assessment and scoring',
            'Yield opportunity analysis',
            'Portfolio simulation',
            'Financial modeling tools',
            'Strategy backtesting'
        ],
        keyComponents: ['AutonomousFinance', 'MarketResearch', 'RiskAssessor', 'YieldAnalyzer'],
        useCases: [
            'Research investment opportunities',
            'Analyze market conditions',
            'Assess risk profiles',
            'Explore yield strategies'
        ],
        voiceCommands: ['open treasury', 'finance', 'market research', 'analyze risk']
    },

    [AppMode.AGENT_CORE_TEST]: {
        id: AppMode.AGENT_CORE_TEST,
        name: 'Agent Core Test',
        shortName: 'ACT',
        description: 'Testing environment for the Agent Core SDK. Run agent experiments, test tool integrations, and validate agent behaviors.',
        features: [
            'Agent SDK testing sandbox',
            'Tool integration validation',
            'Behavior debugging',
            'Performance profiling'
        ],
        keyComponents: ['AgentCoreTest', 'TestRunner', 'DebugConsole'],
        useCases: [
            'Test new agent configurations',
            'Debug agent behaviors',
            'Validate tool integrations',
            'Profile agent performance'
        ],
        voiceCommands: ['agent core test', 'test agents', 'run experiment']
    },

    [AppMode.CPB_TEST]: {
        id: AppMode.CPB_TEST,
        name: 'CPB Test (Cognitive Precision Bridge)',
        shortName: 'CPB',
        description: 'Testing environment for the Cognitive Precision Bridge - the system that ensures high-quality, accurate AI outputs through multi-stage validation.',
        features: [
            'Precision testing interface',
            'Quality validation workflows',
            'Accuracy benchmarking',
            'Cognitive load analysis'
        ],
        keyComponents: ['CPBTest', 'CPBMonitor', 'ValidationPipeline'],
        useCases: [
            'Test cognitive precision workflows',
            'Validate output quality',
            'Benchmark accuracy',
            'Debug precision issues'
        ],
        voiceCommands: ['cpb test', 'precision bridge', 'validate output']
    },

    [AppMode.ARCHON]: {
        id: AppMode.ARCHON,
        name: 'Archon (God Mode)',
        shortName: 'Archon',
        description: 'The supreme command center. Autonomous goal-driven execution engine that can self-direct complex multi-step operations across all sectors.',
        features: [
            'Goal-driven autonomous execution',
            'Multi-sector orchestration',
            'Self-healing error recovery',
            'Metacognitive monitoring',
            'Resource allocation optimization',
            'Execution timeline visualization'
        ],
        keyComponents: ['ArchonDashboard', 'GoalEngine', 'Metacognition', 'ResourceManager'],
        useCases: [
            'Run complex autonomous workflows',
            'Self-directed goal achievement',
            'Cross-sector task orchestration',
            'Monitor autonomous execution'
        ],
        voiceCommands: ['open archon', 'god mode', 'autonomous execute', 'set goal']
    },

    [AppMode.META_LEARNING]: {
        id: AppMode.META_LEARNING,
        name: 'Meta Learning',
        shortName: 'Meta',
        description: 'Autonomous self-improvement and learning system. The system that helps the OS learn from its own interactions and improve over time.',
        features: [
            'Self-improvement protocols',
            'Learning pattern analysis',
            'Performance optimization',
            'Knowledge synthesis'
        ],
        keyComponents: ['MetaLearning', 'LearningEngine', 'PatternAnalyzer'],
        useCases: [
            'Monitor learning progress',
            'Analyze performance patterns',
            'Optimize system behaviors',
            'Track knowledge growth'
        ],
        voiceCommands: ['open meta learning', 'meta', 'learning mode', 'self improve']
    },

    [AppMode.SOVEREIGN_GALLERY]: {
        id: AppMode.SOVEREIGN_GALLERY,
        name: 'Sovereign Vault',
        shortName: 'Vault',
        description: 'Cinematic image gallery and asset vault for storing sovereign visual assets, brand renders, and AI-generated imagery with drag-and-drop upload.',
        features: [
            'Masonry and grid layout views',
            'Drag-and-drop image upload',
            'Cinematic lightbox viewer with keyboard navigation',
            'IndexedDB-backed persistent storage',
            'Collection-based organization',
            'Download and delete management'
        ],
        keyComponents: ['SovereignGallery', 'MasonryGrid', 'Lightbox', 'ImageCard'],
        useCases: [
            'Store brand and promotional images',
            'Browse sovereign asset collection',
            'Organize images into collections',
            'Full-screen cinematic image viewing'
        ],
        voiceCommands: ['open vault', 'gallery', 'sovereign vault', 'show images', 'asset vault']
    }
};

/**
 * Get comprehensive context for the current sector
 */
export function getSectorContext(mode: AppMode): string {
    const sector = UI_KNOWLEDGE_BASE[mode];
    if (!sector) return '';

    return `
CURRENT SECTOR: ${sector.name} (${sector.shortName})
${sector.description}

KEY FEATURES:
${sector.features.map(f => `• ${f}`).join('\n')}

TYPICAL USE CASES:
${sector.useCases.map(u => `• ${u}`).join('\n')}

VOICE COMMANDS FOR THIS SECTOR:
${sector.voiceCommands.map(c => `• "${c}"`).join('\n')}
`.trim();
}

/**
 * Get navigation context for voice commands
 */
export function getNavigationContext(): string {
    const sectors = Object.values(UI_KNOWLEDGE_BASE);

    return `
AVAILABLE SECTORS (for navigation):
${sectors.map(s => `• ${s.shortName.toUpperCase()} → ${s.name}: ${s.description.split('.')[0]}`).join('\n')}

NAVIGATION COMMAND EXAMPLES:
• "Take me to Research" → Opens Bibliomorphic Engine
• "Go to Swarm" → Opens Agent Control Center
• "Show me the Treasury" → Opens Autonomous Finance
• "Open Logic" → Opens Code Studio
`.trim();
}

/**
 * Get full system overview for voice agent
 */
export function getFullSystemContext(): string {
    return `
METAVENTIONS OS - SOVEREIGN OPERATING SYSTEM
A post-human intelligence framework with ${Object.keys(UI_KNOWLEDGE_BASE).length} specialized sectors.

${getNavigationContext()}

SYSTEM CAPABILITIES:
• Multi-agent AI orchestration with personality DNA calibration
• Real-time voice interaction with live transcription
• Research synthesis and knowledge graph building
• AI-powered code generation and analysis
• Image generation and visual asset creation
• Process mapping and architecture diagramming
• Autonomous goal-driven execution (Archon)
• Biometric sensing (stress, focus detection)
• Cross-sector data synthesis

You can navigate to any sector by voice command. Ask me to explain any feature in detail.
`.trim();
}

/**
 * Get context for what's currently visible based on app state
 */
export function getVisibleContext(mode: AppMode, additionalContext?: Record<string, any>): string {
    const sectorContext = getSectorContext(mode);
    const navContext = getNavigationContext();

    let context = `${sectorContext}\n\n${navContext}`;

    if (additionalContext) {
        const contextDetails = Object.entries(additionalContext)
            .filter(([_, v]) => v !== undefined && v !== null)
            .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
            .join('\n');

        if (contextDetails) {
            context += `\n\nCURRENT STATE:\n${contextDetails}`;
        }
    }

    return context;
}
