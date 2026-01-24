/**
 * COMPONENTS BARREL EXPORT
 *
 * Re-exports all components from subdirectories.
 * Use this for cleaner imports:
 *   import { Dashboard, CommandPalette, VoiceManager } from './components';
 */

// Core components
export * from './core';

// Agent components
export * from './agents';

// Voice components
export * from './voice';

// Biometric components
export * from './biometric';

// Generation components
export * from './generation';

// Hardware components
export * from './hardware';

// Research components
export * from './research';

// Finance components
export * from './finance';

// Shared components
export * from './shared';

// Graph components
export * from './graph';


// Visualizations
export { default as AgentGraveyard } from './Visualizations/AgentGraveyard';
export { default as SuperLattice } from './Visualizations/SuperLattice';
export { default as TugOfWarChart } from './Visualizations/TugOfWarChart';

// Layout
export { default as AppHeader } from './layout/AppHeader';

// Overlays
export { default as FocusOverlay } from './overlays/FocusOverlay';
