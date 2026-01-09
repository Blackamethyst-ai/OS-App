/**
 * UI SERVICES BARREL EXPORT
 *
 * Self-Synthesizing Adaptive UI System
 */

export * from './types';
export { semanticGaze } from './SemanticGaze';
export { auiEngine } from './AUIEngine';
export { domRegenerator } from './DOMRegenerator';
export { judgeAgent } from './JudgeAgent';
export {
  initializeComponentRegistry,
  getRegisteredComponents,
  COMPONENT_METADATA,
} from './ComponentRegistry';
