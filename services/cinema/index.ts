// Cinema Studio — public API.
//
// Substrate: Seedance 2.0 (reference-to-video on fal.ai).
// Escape hatches: Veo 3.1, Sora 2, Kling 3.0, Runway Gen-4 Turbo, Wan 2.2, Luma Ray 2.
//
// Entry points:
//   renderShot(req, opts)      — single shot with substrate-first routing
//   renderScene(scene, opts)   — multi-shot scene with character sheet
//   route(req)                 — inspect routing decision without rendering
//   listModels()               — full model catalog
//   listRecent()               — recent renders from manifest

export type {
  RenderRequest,
  RenderResult,
  RenderEvent,
  ProgressCallback,
  RoutingDecision,
  ModelCard,
  ModelCapabilities,
  ModelPricing,
  CapabilityTag,
  AnchorSource,
  ImageRef,
  VideoRef,
  AudioRef,
  ProviderCredentials,
  Resolution,
  AspectRatio,
  Modality,
  LatencyClass,
  BudgetTier,
} from './types';

export {
  MODEL_REGISTRY,
  SUBSTRATE_MODEL_ID,
  SUBSTRATE_VARIANTS,
  ESCAPE_HATCHES,
  FACE_LOCK_SUBSTRATES,
  FACE_LOCK_SUBSTRATE_ID,
  getModel,
  listModels,
  isSubstrate,
  isFaceLockSubstrate,
  acceptsRealLikeness,
  blocksRealLikeness,
  SEEDANCE_REFERENCE,
  SEEDANCE_FAST,
  SEEDANCE_I2V,
  SEEDANCE_T2V,
  KLING_3_0_MASTER,
  KLING_3_0_PRO,
  KLING_2_1_MASTER,
  LUMA_RAY_2,
} from './models';

export { route, explainRoute } from './router';

export { renderShot, renderScene, renderSegmentedShot, inspectModel } from './pipeline';
export type {
  SceneSpec, ShotSpec, SceneOutput, ShotOutput,
  RenderShotOptions, RenderSceneOptions,
  SegmentedShotResult,
} from './pipeline';

export {
  generateKeyframe,
  generateCharacterSheet,
} from './keyframe';
export type { KeyframeRole, KeyframeOptions, GeneratedKeyframe } from './keyframe';

export {
  listRecent,
  listByScene,
  totalSpendUsd,
} from './manifest';
export type { ManifestEntry, AttemptRecord } from './manifest';

export { SCENE_PRESETS, getPreset } from './presets';
export type { ScenePreset } from './presets';

export { uploadToFalStorage, uploadRefImage } from './falStorage';

export { DICO_FACE_ANCHOR, DICO_PRODUCTION_BIBLE, DICO_STYLE_LINE } from './faceAnchor';

export {
  CAMERA_MOVES,
  FRAMING_PRESETS,
  STYLE_SIGNATURES,
  getCameraMove,
  getFraming,
  getStyleSignature,
  composeShotPrompt,
  explainCompose,
} from './presetPacks';
export type { CameraMovePreset, FramingPreset, StyleSignature, ComposeOpts } from './presetPacks';

export {
  computeFaceDescriptor,
  averageDescriptors,
  descriptorDistance,
  distanceToScore,
  computeVariance,
  scanLibrary,
  listSouls,
  getSoul,
  getRoster,
  getActiveSoulId,
  setActiveSoulId,
  deleteSoul,
  createSoul,
  curateFromLibrary,
  tagHeroAnchors,
  recordRender,
  topAnchors,
  DICO_WARDROBE,
  getWardrobeLook,
  HERO_14,
  getAnglePose,
  generateMaximumCharacterSheet,
} from './soul';
export type {
  SoulCast,
  SoulRoster,
  SoulAnchor,
  FaceDescriptor,
  ScanProgress,
  CreateSoulInput,
  WardrobeLook,
  AnglePose,
  CharacterPackProgress,
  GenerateCharacterPackOpts,
} from './soul';

export { findProvider, ProviderError } from './providers';
