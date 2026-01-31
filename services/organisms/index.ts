/**
 * Agentic Organism Framework
 *
 * Three biological-inspired layers that transform the AgentKernel
 * into a living digital organism:
 *
 * - genome: Agent Genome - portable skills via MCP protocol (DNA)
 * - swarm: Swarm Orchestration - self-organizing teams (Nervous System)
 * - cognitive: Cognitive Cycles - wake/sleep consolidation (Sleep)
 *
 * Research basis:
 * - arXiv:2504.07079 (SkillWeaver)
 * - arXiv:2512.23880 (CASCADE)
 * - arXiv:2506.15672 (SwarmAgentic)
 * - arXiv:2601.02553 (SimpleMem)
 */

// Base layer
export {
  AbstractOrganismLayer,
  organismRegistry,
} from './OrganismLayer';

// Genome layer types
export type {
  SkillGenome,
  JSONSchema,
  SerializedFunction,
  SkillRef,
  MCPSkillResource,
  MCPToolSchema,
  PortabilitySpec,
  OrthogonalDimension,
  SkillOrigin,
  SynthesisPattern,
  SynthesisRequest,
  SynthesisConstraints,
  SynthesizedSkill,
  ExecutionPlan,
  ExecutionStep,
  PortableSkillPackage,
  OrthogonalSkillVector,
  CompatibilityReport,
  SkillRegistration,
  SkillStats,
} from './genome/types';

// Genome layer codec
export {
  SkillGenomeCodec,
  skillGenomeCodec,
  serializeSkill,
  deserializeSkill,
  validateSkill,
  computeSkillChecksum,
} from './genome/codec';

// Genome layer MCP server
export {
  MCPSkillServer,
  mcpSkillServer,
  registerSkill,
  listSkills,
  readSkill,
  exposeAsTool,
} from './genome/mcpServer';

export type {
  SkillFilter,
  SkillListResult,
  MCPResourceEntry,
  MCPToolEntry,
} from './genome/mcpServer';

// Genome layer Portable Transfer (US-005)
export {
  PortableSkillTransfer,
  portableSkillTransfer,
  decomposeSkill,
  exportSkill,
  importSkill,
  verifySkillCompatibility,
  calculateSkillSimilarity,
} from './genome/portableTransfer';

// Genome layer SkillWeaver (US-004)
export {
  SkillWeaver,
  InMemorySkillRegistry,
  createSkillWeaver,
} from './genome/skillWeaver';

export type {
  SkillRegistry,
  ConditionEvaluator,
  SynthesisContext,
  MergeStrategy,
  SkillWeaverConfig,
} from './genome/skillWeaver';

// Swarm layer - Adaptive MoE (US-007)
export type {
  ExpertSpec,
  ExpertMetrics,
  ExpertResult,
  OutcomeRecord,
  ExpertValidator,
  MoEConfig,
} from './swarm/adaptiveMoE';

export {
  AdaptiveExpertMixture,
  adaptiveMoE,
  createAdaptiveMoE,
} from './swarm/adaptiveMoE';

// Swarm layer - Stigmergic Environment (US-008)
export type {
  SignalType,
  StigmergicSignal,
  VoteSignal,
  DQTraceSignal,
  PatternSignal,
  PatternContext,
  PatternOutcome,
  SignalQuery,
  StigmergicPrior,
  ConsensusResult,
  ConvergenceResult,
  StigmergicConfig,
} from './swarm/stigmergy';

export {
  StigmergicEnvironment,
  stigmergicEnvironment,
  createStigmergicEnvironment,
} from './swarm/stigmergy';

// Swarm layer - ACE Integration (US-009)
export type {
  EnrichedAuctionConfig,
  ACEIntegrationConfig,
} from './swarm/aceIntegration';

export {
  ACEIntegration,
  aceIntegration,
  createACEIntegration,
  connectToACE,
  enrichAuctionWithStigmergy,
  recordACEConsensus,
  getSwarmPriors,
} from './swarm/aceIntegration';

// Cognitive layer - Wake/Sleep Agent (US-011)
export type {
  Episode,
  ImportanceSignals,
  EpisodeMetadata,
  SleepPhase,
  SleepTrigger,
  ConsolidationResult,
  DreamResult,
  CycleMetrics,
  WakeSleepConfig,
  WorkingMemoryEntry,
} from './cognitive/wakeSleep';

export {
  WakeSleepAgent,
  wakeSleepAgent,
  createWakeSleepAgent,
} from './cognitive/wakeSleep';

// Cognitive layer - SimpleMem 3-Stage Pipeline (US-010)
export type {
  RawEpisode,
  EpisodeType,
  EpisodeSource,
  EpisodeContext,
  SemanticEntity,
  EntityType,
  SemanticRelation,
  RelationType,
  CompressedEpisode,
  ConsolidatedMemory,
  RetrievalQuery,
  RetrievalIntent,
  IntentType,
  RankedEpisodes,
  RetrievalResult,
  IndexType,
  RetrievalStrategy,
  SimpleMemMetrics,
  SimpleMemConfig,
} from './cognitive/simpleMem';

export {
  SimpleMem,
  simpleMem,
  createSimpleMem,
} from './cognitive/simpleMem';

// Cognitive layer - Goldilocks Replay Buffer (US-012)
export type {
  GoldilocksZone,
  LearningMetrics,
  FisherInformation,
  EWCPenalty,
  SyntheticReplayConfig,
  ReplaySelectionResult,
  GoldilocksBufferConfig,
  GoldilocksMetrics,
} from './cognitive/goldilocksBuffer';

export {
  GoldilocksBuffer,
  goldilocksBuffer,
  createGoldilocksBuffer,
} from './cognitive/goldilocksBuffer';

// Cognitive layer - Storage Integration (US-013)
export type {
  EpisodeRecord,
  ConsolidationLogRecord,
  SleepMetricsRecord,
  EpisodeQuery,
  VectorSearchResult,
  StorageBackend,
  VectorStore,
  StorageConfig,
  StorageStatus,
} from './cognitive/storageIntegration';

export {
  CognitiveStorageIntegration,
  cognitiveStorage,
  createCognitiveStorage,
  SQL_SCHEMA,
} from './cognitive/storageIntegration';

// Re-export organism types from archon
export type {
  OrganismLayer,
  OrganismTask,
  OrganismResult,
  OrganismMetrics,
  BiometricContext,
  ContextPack,
} from '../archon/types';

export {
  isOrganismLayer,
  ORGANISM_LAYERS,
  ORGANISM_BUDGET_RATIOS,
} from '../archon/types';

// Integration layer - Biometric Hooks (US-016)
export type {
  BiometricHooksConfig,
} from './integration/biometricHooks';

export {
  BiometricHooks,
  biometricHooks,
  createBiometricHooks,
  registerOrganismLayers,
  onBiometricUpdate,
  adjustSwarmBehavior,
  triggerConsolidation,
} from './integration/biometricHooks';
