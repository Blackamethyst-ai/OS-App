// Cinema Studio — model registry.
// Seedance 2.0 is the SUBSTRATE — every other model is an escape hatch
// invoked only when a hard constraint forces us off-substrate.
//
// Pricing snapshot: April 2026. fal.ai docs are the source of truth for
// Seedance/Kling/Luma/Wan tiers; Vertex AI for Veo; OpenAI for Sora.

import type { ModelCard } from './types';

// =============================================================================
// SUBSTRATE — Seedance 2.0 (3 variants)
// =============================================================================

export const SEEDANCE_REFERENCE: ModelCard = {
  id: 'seedance-2.0-reference',
  label: 'Seedance 2.0 — Reference-to-Video',
  provider: 'fal',
  endpoint: 'bytedance/seedance-2.0/reference-to-video',
  family: 'seedance',
  variant: 'std',
  capabilities: {
    modalities: ['t2v', 'i2v', 'r2v'],
    nativeAudio: true,
    lipSync: true,
    maxDurationSec: 12,
    maxResolution: '720p',
    resolutions: ['480p', '720p'],
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '21:9'],
    maxRefImages: 9,
    maxRefVideos: 3,
    maxRefAudio: 3,
    fpsOptions: [24, 30],
  },
  pricing: {
    per720pSec: 0.3024,
    per480pSec: 0.21,
    videoRefMultiplier: 0.6,
  },
  latency: 'standard',
  qualityScore: 94,
  motionScore: 96,
  promptAdherence: 92,
  releasedISO: '2026-04-09',
  notes:
    'The substrate. 9 imgs + 3 vids + 3 audio refs in one call, [Image1]..[Audio3] grammar, native lip-sync. Default for everything unless a constraint forces an escape.',
  capabilityTags: [
    'cinematic',
    'action',
    'character-consistent',
    'native-audio',
    'lip-sync',
    'multimodal-refs',
    // Verified 2026-05-01: ByteDance partner_validation rejects all photorealistic
    // person likeness (real photos AND photoreal AI portraits). Use only for
    // environments, action without faces, abstract/object scenes, or text-to-video.
    'blocks-real-likeness',
  ],
};

export const SEEDANCE_FAST: ModelCard = {
  ...SEEDANCE_REFERENCE,
  id: 'seedance-2.0-fast-t2v',
  label: 'Seedance 2.0 Fast — Text-to-Video',
  endpoint: 'bytedance/seedance-2.0/fast/text-to-video',
  variant: 'fast',
  capabilities: {
    ...SEEDANCE_REFERENCE.capabilities,
    maxRefImages: 0,
    maxRefVideos: 0,
    maxRefAudio: 0,
  },
  pricing: { per720pSec: 0.2419, per480pSec: 0.17 },
  latency: 'fast',
  qualityScore: 90,
  notes: 'Cheap text-to-video for iteration / rough cuts. No refs.',
};

export const SEEDANCE_FAST_I2V: ModelCard = {
  ...SEEDANCE_REFERENCE,
  id: 'seedance-2.0-fast-i2v',
  label: 'Seedance 2.0 Fast — Image-to-Video',
  endpoint: 'bytedance/seedance-2.0/fast/image-to-video',
  variant: 'fast',
  capabilities: {
    ...SEEDANCE_REFERENCE.capabilities,
    maxRefImages: 1,
    maxRefVideos: 0,
    maxRefAudio: 0,
  },
  pricing: { per720pSec: 0.2419, per480pSec: 0.17 },
  latency: 'fast',
  qualityScore: 89,
  notes: 'Cheap single-keyframe → animation. Use for iteration before committing to std reference-to-video.',
};

export const SEEDANCE_FAST_REF: ModelCard = {
  ...SEEDANCE_REFERENCE,
  id: 'seedance-2.0-fast-ref',
  label: 'Seedance 2.0 Fast — Reference-to-Video',
  endpoint: 'bytedance/seedance-2.0/fast/reference-to-video',
  variant: 'fast',
  pricing: {
    per720pSec: 0.2419,
    per480pSec: 0.17,
    videoRefMultiplier: 0.6,
  },
  latency: 'fast',
  qualityScore: 91,
  notes: 'Cheap version of the substrate hero — same 9 imgs + 3 vids + 3 audio refs. Perfect for testing before committing to std rates.',
};

export const SEEDANCE_I2V: ModelCard = {
  ...SEEDANCE_REFERENCE,
  id: 'seedance-2.0-i2v',
  label: 'Seedance 2.0 — Image-to-Video',
  endpoint: 'bytedance/seedance-2.0/image-to-video',
  variant: 'std',
  capabilities: {
    ...SEEDANCE_REFERENCE.capabilities,
    maxRefImages: 1,
    maxRefVideos: 0,
    maxRefAudio: 0,
  },
  pricing: { per720pSec: 0.3024 },
  notes: 'Single keyframe → animated shot. Use when you have one anchor image and motion intent.',
};

export const SEEDANCE_T2V: ModelCard = {
  ...SEEDANCE_REFERENCE,
  id: 'seedance-2.0-t2v',
  label: 'Seedance 2.0 — Text-to-Video',
  endpoint: 'bytedance/seedance-2.0/text-to-video',
  variant: 'std',
  capabilities: {
    ...SEEDANCE_REFERENCE.capabilities,
    maxRefImages: 0,
    maxRefVideos: 0,
    maxRefAudio: 0,
  },
  pricing: { per720pSec: 0.3034 },
  notes: 'Pure text-to-video on substrate. Use only when no refs available.',
};

// =============================================================================
// ESCAPE HATCHES — invoked only when Seedance constraint is violated
// =============================================================================

// Escape: need 1080p or 4K
export const VEO_3_1: ModelCard = {
  id: 'veo-3.1',
  label: 'Veo 3.1',
  provider: 'vertex',
  endpoint: 'veo-3.1-generate-preview',
  family: 'veo',
  variant: 'std',
  capabilities: {
    modalities: ['t2v', 'i2v', 'r2v'],
    nativeAudio: true,
    lipSync: true,
    maxDurationSec: 8,
    maxResolution: '1080p',
    resolutions: ['720p', '1080p'],
    aspectRatios: ['16:9', '9:16'],
    maxRefImages: 3,
    maxRefVideos: 0,
    maxRefAudio: 0,
    fpsOptions: [24],
  },
  pricing: { per720pSec: 0.40, per1080pSec: 0.40 },
  latency: 'standard',
  qualityScore: 91,
  motionScore: 88,
  promptAdherence: 90,
  releasedISO: '2025-10-15',
  notes: 'Escape hatch for 1080p+ work and Google-native vertical output. Max 3 refs vs Seedance 9.',
  capabilityTags: ['cinematic', '4k-native', 'native-audio', 'character-consistent', 'vertical-video'],
};

export const VEO_3_1_FAST: ModelCard = {
  ...VEO_3_1,
  id: 'veo-3.1-fast',
  label: 'Veo 3.1 Fast (no audio)',
  endpoint: 'veo-3.1-fast-generate-preview',
  variant: 'fast',
  capabilities: { ...VEO_3_1.capabilities, nativeAudio: false, lipSync: false },
  pricing: { per720pSec: 0.10, per1080pSec: 0.10 },
  latency: 'fast',
  qualityScore: 86,
  notes: 'Cheapest 1080p path. No audio. Pair with Suno/ElevenLabs for sound.',
  capabilityTags: ['cinematic', '4k-native', 'cheap-bulk'],
};

export const VEO_3_1_LITE: ModelCard = {
  ...VEO_3_1,
  id: 'veo-3.1-lite',
  label: 'Veo 3.1 Lite',
  endpoint: 'veo-3.1-lite-generate-preview',
  variant: 'lite',
  pricing: { per720pSec: 0.05, per1080pSec: 0.05 },
  latency: 'fast',
  qualityScore: 80,
  notes: 'Ultra-cheap 1080p tier. Quality drop vs Seedance, but $0.05/s makes it the bulk choice.',
  capabilityTags: ['cheap-bulk', 'cinematic'],
};

// Escape: need >12s continuous shot
export const SORA_2_PRO: ModelCard = {
  id: 'sora-2-pro',
  label: 'Sora 2 Pro',
  provider: 'openai',
  endpoint: 'sora-2-pro',
  family: 'sora',
  variant: 'pro',
  capabilities: {
    modalities: ['t2v', 'i2v'],
    nativeAudio: true,
    lipSync: true,
    maxDurationSec: 25,
    maxResolution: '1080p',
    resolutions: ['720p', '1080p'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    maxRefImages: 1,
    maxRefVideos: 0,
    maxRefAudio: 0,
    fpsOptions: [24, 30],
  },
  pricing: { per720pSec: 0.30, per1080pSec: 0.50 },
  latency: 'slow',
  qualityScore: 92,
  motionScore: 90,
  promptAdherence: 95,
  releasedISO: '2025-09-30',
  notes: 'Escape hatch for >12s shots and OpenAI-native dialogue. Max 1 ref vs Seedance 9.',
  capabilityTags: ['cinematic', 'long-form', 'native-audio', 'lip-sync'],
};

export const SORA_2: ModelCard = {
  ...SORA_2_PRO,
  id: 'sora-2',
  label: 'Sora 2',
  endpoint: 'sora-2',
  variant: 'std',
  capabilities: { ...SORA_2_PRO.capabilities, maxResolution: '720p', resolutions: ['720p'] },
  pricing: { per720pSec: 0.10 },
  qualityScore: 86,
  notes: 'Cheapest >12s path. 720p only.',
  capabilityTags: ['long-form', 'native-audio', 'cheap-bulk'],
};

// =============================================================================
// FACE-LOCK SUBSTRATES — accept photorealistic Dico likeness on fal
// (Kling 3.0 Pro/Master verified 2026-05-01)
// =============================================================================

// Kling 3.0 MASTER — top quality, verified working result fetch as of 2026-05-01.
// Used for high-fidelity face-lock i2v shots.
export const KLING_3_0_MASTER: ModelCard = {
  id: 'kling-3.0-master',
  label: 'Kling 3.0 Master (face-lock)',
  provider: 'fal',
  endpoint: 'fal-ai/kling-video/o3/master/image-to-video',
  family: 'kling',
  variant: 'master',
  capabilities: {
    modalities: ['i2v'],
    nativeAudio: false,
    lipSync: false,
    maxDurationSec: 10,
    maxResolution: '1080p',
    resolutions: ['720p', '1080p'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    maxRefImages: 1,    // single i2v ref; multi-ref uses Kling Elements (separate model)
    maxRefVideos: 0,
    maxRefAudio: 0,
    fpsOptions: [24, 30],
  },
  pricing: { per720pSec: 0.42, per1080pSec: 0.56 },
  latency: 'standard',
  qualityScore: 94,
  motionScore: 90,
  promptAdherence: 90,
  releasedISO: '2026-04-01',
  notes:
    'Primary face-lock substrate — accepts photorealistic person likeness. Kling 3.0 master tier. Dolly-in / camera moves: golden 0-3s + 7-10s, drift in middle 3-7s on single i2v. Use cfg_scale 0.95 + minimal subject motion for best 10s shot.',
  capabilityTags: ['cinematic', 'character-consistent', 'max-fidelity', 'accepts-real-likeness'],
};

// Kling 3.0 PRO — secondary face-lock substrate, more reliable result fetch on fal.
export const KLING_3_0_PRO: ModelCard = {
  ...KLING_3_0_MASTER,
  id: 'kling-3.0-pro',
  label: 'Kling 3.0 Pro (face-lock)',
  endpoint: 'fal-ai/kling-video/o3/pro/image-to-video',
  variant: 'pro',
  pricing: { per720pSec: 0.40, per1080pSec: 0.50 },
  qualityScore: 92,
  notes:
    'Pro tier of Kling 3.0 — reliable result fetch on fal. Face-lock substrate, accepts real likeness. Slight quality drop vs Master.',
  capabilityTags: ['cinematic', 'character-consistent', 'accepts-real-likeness'],
};

// Kling 2.1 Master — proven, reliable, lower price. Recommended fallback.
export const KLING_2_1_MASTER: ModelCard = {
  ...KLING_3_0_MASTER,
  id: 'kling-2.1-master',
  label: 'Kling 2.1 Master',
  endpoint: 'fal-ai/kling-video/v2.1/master/image-to-video',
  variant: 'master',
  pricing: { per720pSec: 0.28, per1080pSec: 0.40 },
  qualityScore: 91,
  releasedISO: '2025-12-01',
  notes: 'Proven Kling 2.1 master tier. Verified 2026-05-01. Cheaper than v3, golden 0-3s window. Solid fallback when v3 unavailable.',
  capabilityTags: ['cinematic', 'character-consistent', 'accepts-real-likeness'],
};

// Kling Elements — multi-character-ref endpoint. Accepts up to 4 reference
// images for sustained face-lock past the 3-7s drift window of single-ref i2v.
// Pair with the 14-frame Maximum Character Sheet for best results.
export const KLING_ELEMENTS: ModelCard = {
  ...KLING_3_0_MASTER,
  id: 'kling-elements',
  label: 'Kling Elements (multi-ref face-lock)',
  endpoint: 'fal-ai/kling-video/v2.1/master/multi-image-to-video',
  variant: 'master',
  capabilities: {
    ...KLING_3_0_MASTER.capabilities,
    maxRefImages: 4,    // Elements accepts up to 4 character refs
  },
  pricing: { per720pSec: 0.45, per1080pSec: 0.60 },
  qualityScore: 95,
  notes:
    'Multi-reference Kling endpoint — up to 4 character anchors. Recommended for 10s+ shots once 14-frame Maximum Character Sheet is populated. Avoids single-ref drift window.',
  capabilityTags: ['cinematic', 'character-consistent', 'max-fidelity', 'multimodal-refs', 'accepts-real-likeness'],
};

export const KLING_2_6_PRO: ModelCard = {
  ...KLING_3_0_MASTER,
  id: 'kling-2.6-pro',
  label: 'Kling 2.6 Pro',
  endpoint: 'fal-ai/kling-video/v1.6/pro/image-to-video',
  variant: 'pro',
  pricing: { per720pSec: 0.07 },
  qualityScore: 87,
  notes: 'Cheap fidelity-tier escape. $0.07/s. Lower-quality Kling tier.',
  capabilityTags: ['max-fidelity', 'cheap-bulk', 'accepts-real-likeness'],
};

// Escape: need motion brushes / scene consistency benchmark winner
export const RUNWAY_GEN_4_TURBO: ModelCard = {
  id: 'runway-gen-4-turbo',
  label: 'Runway Gen-4 Turbo',
  provider: 'runway',
  endpoint: 'gen4_turbo',
  family: 'runway',
  variant: 'turbo',
  capabilities: {
    modalities: ['t2v', 'i2v'],
    nativeAudio: false,
    lipSync: false,
    maxDurationSec: 10,
    maxResolution: '720p',
    resolutions: ['720p'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    maxRefImages: 1,
    maxRefVideos: 0,
    maxRefAudio: 0,
    fpsOptions: [24],
  },
  pricing: { per720pSec: 0.05 },
  latency: 'fast',
  qualityScore: 89,
  motionScore: 91,
  promptAdherence: 87,
  releasedISO: '2025-08-01',
  notes: 'Escape for motion-brush precision and Runway-native scene consistency.',
  capabilityTags: ['cinematic', 'cheap-bulk'],
};

// Open-source / on-prem / unlimited volume + accepts real likeness
export const WAN_2_2: ModelCard = {
  id: 'wan-2.2',
  label: 'Wan 2.2 (open-source)',
  provider: 'fal',
  endpoint: 'fal-ai/wan/v2.2/image-to-video',  // verified 2026-05-01
  family: 'wan',
  variant: 'std',
  capabilities: {
    modalities: ['t2v', 'i2v'],
    nativeAudio: false,
    lipSync: false,
    maxDurationSec: 8,
    maxResolution: '1080p',
    resolutions: ['720p', '1080p'],
    aspectRatios: ['16:9', '9:16'],
    maxRefImages: 1,
    maxRefVideos: 0,
    maxRefAudio: 0,
    fpsOptions: [24],
  },
  pricing: { per720pSec: 0.04 },
  latency: 'standard',
  qualityScore: 84,
  motionScore: 82,
  promptAdherence: 81,
  releasedISO: '2025-12-15',
  notes: 'Open-source escape. VBench 84.7%+. Self-host path available. Accepts real likeness (no policy filter).',
  capabilityTags: ['open-source', 'cheap-bulk', 'accepts-real-likeness'],
};

// Smooth motion specialist + accepts real likeness — verified face-lock substrate.
export const LUMA_RAY_2: ModelCard = {
  id: 'luma-ray-2',
  label: 'Luma Ray 2 (face-lock)',
  provider: 'fal',
  endpoint: 'fal-ai/luma-dream-machine/ray-2/image-to-video',  // verified 2026-05-01
  family: 'luma',
  variant: 'std',
  capabilities: {
    modalities: ['t2v', 'i2v'],
    nativeAudio: false,
    lipSync: false,
    maxDurationSec: 9,
    maxResolution: '1080p',
    resolutions: ['720p', '1080p'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    maxRefImages: 1,
    maxRefVideos: 0,
    maxRefAudio: 0,
    fpsOptions: [24],
  },
  pricing: { per720pSec: 0.10 },
  latency: 'standard',
  qualityScore: 85,
  motionScore: 87,
  promptAdherence: 84,
  releasedISO: '2025-07-01',
  notes: 'Smooth motion specialist. Accepts real likeness — secondary face-lock substrate after Kling. ~$0.50/render flat.',
  capabilityTags: ['cinematic', 'character-consistent', 'accepts-real-likeness'],
};

// =============================================================================
// REGISTRY
// =============================================================================

export const MODEL_REGISTRY: Record<string, ModelCard> = {
  // Substrate
  [SEEDANCE_REFERENCE.id]: SEEDANCE_REFERENCE,
  [SEEDANCE_FAST.id]: SEEDANCE_FAST,
  [SEEDANCE_FAST_I2V.id]: SEEDANCE_FAST_I2V,
  [SEEDANCE_FAST_REF.id]: SEEDANCE_FAST_REF,
  [SEEDANCE_I2V.id]: SEEDANCE_I2V,
  [SEEDANCE_T2V.id]: SEEDANCE_T2V,
  // Escape hatches
  [VEO_3_1.id]: VEO_3_1,
  [VEO_3_1_FAST.id]: VEO_3_1_FAST,
  [VEO_3_1_LITE.id]: VEO_3_1_LITE,
  [SORA_2_PRO.id]: SORA_2_PRO,
  [SORA_2.id]: SORA_2,
  [KLING_3_0_MASTER.id]: KLING_3_0_MASTER,
  [KLING_3_0_PRO.id]: KLING_3_0_PRO,
  [KLING_2_1_MASTER.id]: KLING_2_1_MASTER,
  [KLING_ELEMENTS.id]: KLING_ELEMENTS,
  [KLING_2_6_PRO.id]: KLING_2_6_PRO,
  [RUNWAY_GEN_4_TURBO.id]: RUNWAY_GEN_4_TURBO,
  [WAN_2_2.id]: WAN_2_2,
  [LUMA_RAY_2.id]: LUMA_RAY_2,
};

export const SUBSTRATE_MODEL_ID = SEEDANCE_REFERENCE.id;

export const SUBSTRATE_VARIANTS = [
  SEEDANCE_REFERENCE,
  SEEDANCE_FAST_REF,
  SEEDANCE_I2V,
  SEEDANCE_FAST_I2V,
  SEEDANCE_T2V,
  SEEDANCE_FAST,
];

export const ESCAPE_HATCHES = [
  VEO_3_1,
  VEO_3_1_FAST,
  VEO_3_1_LITE,
  SORA_2_PRO,
  SORA_2,
  KLING_3_0_MASTER,
  KLING_3_0_PRO,
  KLING_2_1_MASTER,
  KLING_2_6_PRO,
  RUNWAY_GEN_4_TURBO,
  WAN_2_2,
  LUMA_RAY_2,
];

// Face-lock substrates — accept photorealistic person likeness on fal.
// Ordered by preference (Elements first when multi-ref pack available; Pro
// next for fal result-fetch reliability with single-ref i2v).
export const FACE_LOCK_SUBSTRATES = [
  KLING_ELEMENTS,    // multi-ref — best when 4+ anchors available
  KLING_3_0_PRO,
  KLING_3_0_MASTER,
  KLING_2_1_MASTER,
  LUMA_RAY_2,
  WAN_2_2,
];

export const FACE_LOCK_SUBSTRATE_ID = KLING_3_0_PRO.id;

export function isFaceLockSubstrate(id: string): boolean {
  return FACE_LOCK_SUBSTRATES.some(m => m.id === id);
}

export function acceptsRealLikeness(card: ModelCard): boolean {
  return card.capabilityTags.includes('accepts-real-likeness');
}

export function blocksRealLikeness(card: ModelCard): boolean {
  return card.capabilityTags.includes('blocks-real-likeness');
}

export function getModel(id: string): ModelCard | undefined {
  return MODEL_REGISTRY[id];
}

export function listModels(): ModelCard[] {
  return Object.values(MODEL_REGISTRY);
}

export function isSubstrate(id: string): boolean {
  return SUBSTRATE_VARIANTS.some(m => m.id === id);
}
