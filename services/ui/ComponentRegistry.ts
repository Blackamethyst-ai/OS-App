/**
 * COMPONENT REGISTRY
 *
 * Initializes the DOMRegenerator component registry with actual app components.
 * This enables dynamic component synthesis based on LLM-generated layouts.
 *
 * Usage:
 * - Import this file once at app startup
 * - Call initializeComponentRegistry() to register all components
 */

import { domRegenerator } from './DOMRegenerator';

// ============================================================================
// LAZY COMPONENT IMPORTS
// We use dynamic imports to avoid circular dependencies
// ============================================================================

/**
 * Initialize the component registry with all available components
 */
export async function initializeComponentRegistry(): Promise<void> {
  if (import.meta.env.DEV) console.log('COMPONENT_REGISTRY: Initializing...');

  const registrations: Array<{ name: string; loader: () => Promise<any> }> = [
    // Dashboard & Hub
    {
      name: 'MetaventionsHub',
      loader: () => import('../../components/MetaventionsHub').then(m => m.default),
    },
    {
      name: 'Dashboard',
      loader: () => import('../../components/Dashboard').then(m => m.default),
    },
    {
      name: 'GlobalStatusBar',
      loader: () => import('../../components/GlobalStatusBar').then(m => m.default),
    },
    {
      name: 'NeuralDock',
      loader: () => import('../../components/NeuralDock').then(m => m.default),
    },

    // Biometrics
    {
      name: 'BiometricPanel',
      loader: () => import('../../components/BiometricPanel').then(m => m.BiometricPanel),
    },
    {
      name: 'GazeReticle',
      loader: () => import('../../components/GazeReticle').then(m => m.GazeReticle),
    },

    // Agent & Process
    {
      name: 'AgentControlCenter',
      loader: () => import('../../components/AgentControlCenter').then(m => m.default),
    },
    {
      name: 'AgenticHUD',
      loader: () => import('../../components/AgenticHUD').then(m => m.default),
    },
    {
      name: 'ProcessVisualizer',
      loader: () => import('../../components/ProcessVisualizer').then(m => m.default),
    },
    {
      name: 'SynapticRouter',
      loader: () => import('../../components/SynapticRouter').then(m => m.default),
    },
    {
      name: 'TaskBoard',
      loader: () => import('../../components/TaskBoard').then(m => m.default),
    },

    // Code & Development
    {
      name: 'CodeStudio',
      loader: () => import('../../components/CodeStudio').then(m => m.default),
    },
    {
      name: 'NexusAPIExplorer',
      loader: () => import('../../components/NexusAPIExplorer').then(m => m.default),
    },
    {
      name: 'HolographicCommandDeck',
      loader: () => import('../../components/HolographicCommandDeck').then(m => m.default),
    },
    {
      name: 'CommandPalette',
      loader: () => import('../../components/CommandPalette').then(m => m.default),
    },

    // Visualizations
    {
      name: 'DEcosystem',
      loader: () => import('../../components/DEcosystem').then(m => m.default),
    },
    {
      name: 'ContextVelocityChart',
      loader: () => import('../../components/ContextVelocityChart').then(m => m.default),
    },
    {
      name: 'KnowledgeGraph',
      loader: () => import('../../components/KnowledgeGraph').then(m => m.default),
    },
    {
      name: 'EmotionalResonanceGraph',
      loader: () => import('../../components/EmotionalResonanceGraph').then(m => m.default),
    },
    {
      name: 'FlywheelOrbit',
      loader: () => import('../../components/FlywheelOrbit').then(m => m.default),
    },

    // Voice & Media
    {
      name: 'VoiceMode',
      loader: () => import('../../components/VoiceMode').then(m => m.default),
    },
    {
      name: 'VoiceManager',
      loader: () => import('../../components/VoiceManager').then(m => m.default),
    },
    {
      name: 'ImageGen',
      loader: () => import('../../components/ImageGen').then(m => m.default),
    },

    // Memory & Knowledge
    {
      name: 'MemoryCore',
      loader: () => import('../../components/MemoryCore').then(m => m.default),
    },
    {
      name: 'SynapticContextHub',
      loader: () => import('../../components/SynapticContextHub').then(m => m.default),
    },

    // System
    {
      name: 'HelpCenter',
      loader: () => import('../../components/HelpCenter').then(m => m.default),
    },
    {
      name: 'StrategicConsole',
      loader: () => import('../../components/StrategicConsole').then(m => m.StrategicConsole),
    },
    {
      name: 'ZenithDisplay',
      loader: () => import('../../components/ZenithDisplay').then(m => m.ZenithDisplay),
    },

    // Adaptive UI
    {
      name: 'AdaptiveContainer',
      loader: () => import('../../components/AdaptiveContainer').then(m => m.AdaptiveContainer),
    },
    {
      name: 'AdaptivePanel',
      loader: () => import('../../components/AdaptiveContainer').then(m => m.AdaptivePanel),
    },
    {
      name: 'AdaptiveRegion',
      loader: () => import('../../components/AdaptiveContainer').then(m => m.AdaptiveRegion),
    },
  ];

  // Register components in parallel
  const results = await Promise.allSettled(
    registrations.map(async ({ name, loader }) => {
      try {
        const component = await loader();
        if (component) {
          domRegenerator.registerComponent(name, component);
          return { name, success: true };
        }
        return { name, success: false, reason: 'Component not found' };
      } catch (error: any) {
        // Component might not exist, which is fine
        console.warn(`COMPONENT_REGISTRY: Failed to load '${name}': ${error.message}`);
        return { name, success: false, reason: error.message };
      }
    })
  );

  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.length - successful;

  if (import.meta.env.DEV) console.log(`COMPONENT_REGISTRY: Initialized ${successful} components (${failed} failed to load)`);
}

/**
 * Get list of registered component names
 */
export function getRegisteredComponents(): string[] {
  // This would need to be exposed from DOMRegenerator
  // For now, return the list we attempted to register
  return [
    'MetaventionsHub',
    'Dashboard',
    'GlobalStatusBar',
    'NeuralDock',
    'BiometricPanel',
    'GazeReticle',
    'AgentControlCenter',
    'AgenticHUD',
    'ProcessVisualizer',
    'SynapticRouter',
    'TaskBoard',
    'CodeStudio',
    'NexusAPIExplorer',
    'HolographicCommandDeck',
    'CommandPalette',
    'DEcosystem',
    'ContextVelocityChart',
    'KnowledgeGraph',
    'EmotionalResonanceGraph',
    'FlywheelOrbit',
    'VoiceMode',
    'VoiceManager',
    'ImageGen',
    'MemoryCore',
    'SynapticContextHub',
    'HelpCenter',
    'StrategicConsole',
    'ZenithDisplay',
    'AdaptiveContainer',
    'AdaptivePanel',
    'AdaptiveRegion',
  ];
}

/**
 * Component metadata for LLM context
 */
export const COMPONENT_METADATA: Record<string, { category: string; description: string; adaptable: boolean }> = {
  MetaventionsHub: {
    category: 'Dashboard',
    description: 'Main hub dashboard with SOC, metrics belt, and sidebar',
    adaptable: true,
  },
  BiometricPanel: {
    category: 'Biometrics',
    description: 'Real-time biometric sensor display (stress, gaze, attention)',
    adaptable: true,
  },
  DEcosystem: {
    category: 'Visualization',
    description: 'Large ecosystem visualization with sector loads',
    adaptable: true,
  },
  ContextVelocityChart: {
    category: 'Metrics',
    description: 'Context throughput velocity chart',
    adaptable: true,
  },
  StrategicConsole: {
    category: 'System',
    description: 'Strategic command console with agent dispatching',
    adaptable: true,
  },
  ZenithDisplay: {
    category: 'Visualization',
    description: '3D Zenith display for high-fidelity views',
    adaptable: false,
  },
  AgentControlCenter: {
    category: 'Agents',
    description: 'Agent management and spawning interface',
    adaptable: true,
  },
  CodeStudio: {
    category: 'Development',
    description: 'Integrated code editing environment',
    adaptable: true,
  },
  VoiceMode: {
    category: 'Voice',
    description: 'Voice interaction interface',
    adaptable: true,
  },
  ImageGen: {
    category: 'Media',
    description: 'AI image generation interface',
    adaptable: true,
  },
  MemoryCore: {
    category: 'Memory',
    description: 'Memory management and retrieval interface',
    adaptable: true,
  },
  KnowledgeGraph: {
    category: 'Visualization',
    description: 'Knowledge graph visualization',
    adaptable: true,
  },
};
