// Cinema Studio — shared types.
// All providers and pipeline stages speak this contract.

export type Resolution = '480p' | '720p' | '1080p' | '2K' | '4K';
export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | '21:9';
export type Modality = 't2v' | 'i2v' | 'r2v';
export type LatencyClass = 'realtime' | 'fast' | 'standard' | 'slow';
export type BudgetTier = 'ultra-low' | 'low' | 'mid' | 'high' | 'unlimited';

export interface ProviderId {
  fal: 'fal';
  vertex: 'vertex';
  openai: 'openai';
  runway: 'runway';
  replicate: 'replicate';
  bytePlus: 'byteplus';
}
export type ProviderKey = keyof ProviderId;

export interface ModelCapabilities {
  modalities: Modality[];
  nativeAudio: boolean;
  lipSync: boolean;
  maxDurationSec: number;
  maxResolution: Resolution;
  resolutions: Resolution[];
  aspectRatios: AspectRatio[];
  maxRefImages: number;
  maxRefVideos: number;
  maxRefAudio: number;
  fpsOptions: number[];
}

export interface ModelPricing {
  // Cost in USD per second of generated video, by resolution.
  per720pSec?: number;
  per1080pSec?: number;
  per480pSec?: number;
  // Multiplier when video references are passed (Seedance: 0.6).
  videoRefMultiplier?: number;
  // Surcharge when audio is enabled (some Veo tiers).
  audioSurcharge?: number;
}

export interface ModelCard {
  id: string;
  label: string;
  provider: ProviderKey;
  endpoint: string;
  family: string;
  variant?: 'std' | 'fast' | 'lite' | 'pro' | 'master' | 'turbo';
  capabilities: ModelCapabilities;
  pricing: ModelPricing;
  latency: LatencyClass;
  qualityScore: number;     // 0-100, weighted blend of VBench + AA + user preference
  motionScore: number;      // 0-100
  promptAdherence: number;  // 0-100
  releasedISO: string;
  notes?: string;
  capabilityTags: CapabilityTag[];
}

export type CapabilityTag =
  | 'cinematic'
  | 'action'
  | 'character-consistent'
  | 'long-form'
  | 'cheap-bulk'
  | 'max-fidelity'
  | 'native-audio'
  | 'lip-sync'
  | 'multimodal-refs'
  | 'open-source'
  | 'vertical-video'
  | '4k-native'
  // Policy tags — drive substrate routing.
  // 'accepts-real-likeness' = model accepts photorealistic Dico refs without partner_validation (Kling, Luma, Veo, Wan, Runway).
  // 'blocks-real-likeness' = model rejects photorealistic person likeness via classifier (Seedance — ByteDance partner_validation).
  | 'accepts-real-likeness'
  | 'blocks-real-likeness';

export interface RenderRequest {
  prompt: string;
  modality: Modality;

  // Visual references (NanoBanana keyframes etc.)
  refImages?: ImageRef[];
  refVideos?: VideoRef[];
  refAudio?: AudioRef[];

  // Output spec
  durationSec?: number;
  aspectRatio?: AspectRatio;
  resolution?: Resolution;
  fps?: number;

  // Audio control
  generateAudio?: boolean;
  lipSync?: boolean;

  // Routing hints
  tags?: CapabilityTag[];
  budgetTier?: BudgetTier;
  preferredModelId?: string;
  excludeModelIds?: string[];

  // Optional seed for determinism
  seed?: number;

  // Optional shot metadata for provenance manifest
  shotName?: string;
  sceneId?: string;
}

// Anchor provenance — drives substrate routing. Real photos and photoreal AI
// portraits get blocked by ByteDance partner_validation; only "composite" or
// non-photoreal refs are safe for Seedance. Face-lock substrates (Kling/Luma)
// accept all three.
export type AnchorSource = 'real_photo' | 'ai_generated' | 'composite';

export interface ImageRef {
  url: string;            // remote URL or data URL
  alias?: string;         // 'character' | 'environment' | 'style'; surfaces as [Image1] in prompt
  weight?: number;        // 0-1
  source?: AnchorSource;  // provenance — drives Seedance vs Kling routing
  isPersonLikeness?: boolean;  // set by Soul Cast when ref came from face-api match
}

export interface VideoRef {
  url: string;
  alias?: string;
  role?: 'motion' | 'style' | 'composition';
}

export interface AudioRef {
  url: string;
  alias?: string;
  role?: 'voice' | 'soundtrack' | 'sfx';
}

export interface RenderResult {
  videoUrl: string;
  thumbnailUrl?: string;
  durationSec: number;
  resolution: Resolution;
  modelId: string;
  provider: ProviderKey;
  seed?: number;
  startedAt: string;
  completedAt: string;
  costUsd: number;
  latencyMs: number;
  rawProviderResponse?: unknown;
}

export interface RenderEvent {
  type: 'queued' | 'started' | 'progress' | 'completed' | 'failed' | 'fallback';
  message?: string;
  progress?: number;       // 0-1
  modelId?: string;
  providerError?: string;
}

export type ProgressCallback = (event: RenderEvent) => void;

export interface RoutingDecision {
  primary: ModelCard;
  fallbacks: ModelCard[];
  estimatedCostUsd: number;
  rationale: string;
}

export interface ProviderCredentials {
  fal?: string;
  openai?: string;
  vertexProject?: string;
  vertexLocation?: string;
  vertexAccessToken?: string;
  runway?: string;
  replicate?: string;
}
