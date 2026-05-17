// Cinema Studio — substrate-first router.
//
// Default destination is the Seedance 2.0 substrate. Escape hatches are
// invoked only when a hard constraint or explicit tag forces us off-substrate.
// The router returns a primary + ranked fallback chain so the pipeline can
// retry on provider failure without re-deciding policy.

import type { ModelCard, RenderRequest, RoutingDecision } from './types';
import {
  SEEDANCE_REFERENCE,
  SEEDANCE_FAST,
  SEEDANCE_FAST_I2V,
  SEEDANCE_FAST_REF,
  SEEDANCE_I2V,
  SEEDANCE_T2V,
  VEO_3_1,
  VEO_3_1_FAST,
  VEO_3_1_LITE,
  SORA_2,
  SORA_2_PRO,
  KLING_3_0_MASTER,
  KLING_3_0_PRO,
  KLING_2_1_MASTER,
  KLING_2_6_PRO,
  RUNWAY_GEN_4_TURBO,
  WAN_2_2,
  LUMA_RAY_2,
  FACE_LOCK_SUBSTRATES,
  getModel,
  listModels,
} from './models';

const SUBSTRATE_MAX_DURATION = 12;
const SUBSTRATE_MAX_RES_WIDTH = 720;

const RES_WIDTH: Record<string, number> = {
  '480p': 480,
  '720p': 720,
  '1080p': 1080,
  '2K': 1440,
  '4K': 2160,
};

interface EscapeCondition {
  reason: string;
  predicate: (req: RenderRequest) => boolean;
  candidates: ModelCard[];
}

// Detects refs that ByteDance partner_validation will reject. Real photos and
// photoreal AI portraits both fail; only 'composite' or refs explicitly marked
// non-likeness are safe for Seedance.
function hasPersonLikeness(req: RenderRequest): boolean {
  const imgs = req.refImages ?? [];
  if (imgs.some(r => r.isPersonLikeness === true)) return true;
  if (imgs.some(r => r.source === 'real_photo' || r.source === 'ai_generated')) return true;
  // Tag-based hint from Soul Cast / face-lock UIs.
  if ((req.tags ?? []).includes('character-consistent')) {
    // Only treat as person likeness if at least one ref is image (i2v/r2v with face).
    return imgs.length > 0;
  }
  return false;
}

// Ordered: first matching escape wins. Conditions are conservative —
// when in doubt, stay on substrate.
const ESCAPE_CONDITIONS: EscapeCondition[] = [
  {
    // Highest priority: ByteDance partner_validation hard-blocks face-lock.
    // Always escape to Kling/Luma when refs contain photorealistic person likeness.
    // Candidates are dynamically filtered to those whose maxRefImages can hold
    // the request's ref count, so Elements is only picked when 2+ refs exist.
    reason: 'face-lock: refs contain person likeness, Seedance partner_validation rejects',
    predicate: hasPersonLikeness,
    candidates: FACE_LOCK_SUBSTRATES,
  },
  {
    reason: 'long-form: shot exceeds substrate 12s ceiling',
    predicate: (r) => (r.durationSec ?? 0) > SUBSTRATE_MAX_DURATION,
    candidates: [SORA_2_PRO, SORA_2],
  },
  {
    reason: 'high-res: 1080p+ requested, substrate caps at 720p',
    predicate: (r) =>
      RES_WIDTH[r.resolution ?? '720p'] > SUBSTRATE_MAX_RES_WIDTH,
    candidates: [KLING_3_0_PRO, KLING_3_0_MASTER, LUMA_RAY_2, VEO_3_1, VEO_3_1_FAST, VEO_3_1_LITE],
  },
  {
    reason: 'tag: max-fidelity requested for complex multi-subject scene',
    predicate: (r) => (r.tags ?? []).includes('max-fidelity'),
    candidates: [KLING_3_0_MASTER, KLING_3_0_PRO, VEO_3_1, KLING_2_6_PRO],
  },
  {
    reason: 'tag: open-source / on-prem path required',
    predicate: (r) => (r.tags ?? []).includes('open-source'),
    candidates: [WAN_2_2],
  },
  {
    reason: 'tag: 4K-native required',
    predicate: (r) => (r.tags ?? []).includes('4k-native'),
    candidates: [VEO_3_1],
  },
];

function selectSubstrateVariant(req: RenderRequest): ModelCard {
  // Reference-to-video is the substrate hero: it accepts up to 9 imgs +
  // 3 vids + 3 audio refs. Use it whenever multimodal refs are present.
  const refsCount =
    (req.refImages?.length ?? 0) +
    (req.refVideos?.length ?? 0) +
    (req.refAudio?.length ?? 0);

  const cheap = req.budgetTier === 'ultra-low' || req.budgetTier === 'low';

  if (refsCount > 1) return cheap ? SEEDANCE_FAST_REF : SEEDANCE_REFERENCE;
  if ((req.refImages?.length ?? 0) === 1 && refsCount === 1)
    return cheap ? SEEDANCE_FAST_I2V : SEEDANCE_I2V;

  // No refs at all — text-to-video.
  if (cheap) return SEEDANCE_FAST;
  return SEEDANCE_T2V;
}

function buildSubstrateFallbacks(primary: ModelCard): ModelCard[] {
  // Substrate fallback chain — fal-hosted only. Vertex/Veo and OpenAI/Sora
  // are deliberately NOT in the substrate chain (different provider, different
  // auth, user wants Seedance via fal). They're only reachable via explicit
  // pin or escape conditions (>12s, 1080p+, etc).
  if (primary.id === SEEDANCE_REFERENCE.id)
    return [SEEDANCE_FAST_REF, SEEDANCE_I2V, SEEDANCE_FAST_I2V, KLING_3_0_MASTER, LUMA_RAY_2];
  if (primary.id === SEEDANCE_FAST_REF.id)
    return [SEEDANCE_REFERENCE, SEEDANCE_FAST_I2V, SEEDANCE_I2V, KLING_3_0_MASTER];
  if (primary.id === SEEDANCE_I2V.id)
    return [SEEDANCE_FAST_I2V, SEEDANCE_REFERENCE, SEEDANCE_FAST_REF, KLING_2_6_PRO, LUMA_RAY_2];
  if (primary.id === SEEDANCE_FAST_I2V.id)
    return [SEEDANCE_I2V, SEEDANCE_FAST_REF, KLING_2_6_PRO, WAN_2_2];
  if (primary.id === SEEDANCE_FAST.id)
    return [SEEDANCE_T2V, SEEDANCE_FAST_REF, WAN_2_2];
  if (primary.id === SEEDANCE_T2V.id)
    return [SEEDANCE_FAST, SEEDANCE_FAST_REF, WAN_2_2];
  return [SEEDANCE_FAST, SEEDANCE_T2V];
}

function buildEscapeFallbacks(primary: ModelCard, req: RenderRequest): ModelCard[] {
  // Escape-route fallbacks: prefer same family/provider, then degrade.
  const all = listModels().filter(m => m.id !== primary.id);
  const sameFamily = all.filter(m => m.family === primary.family);
  const otherEscapes = all.filter(m => m.family !== primary.family && m.family !== 'seedance');
  // Pull substrate fast as last-ditch — sometimes Seedance can satisfy
  // a softer interpretation of the request even after escape failure.
  const seedanceLast = listModels().filter(m => m.family === 'seedance' && m.id !== primary.id);
  return [...sameFamily.slice(0, 2), ...otherEscapes.slice(0, 2), ...seedanceLast.slice(0, 1)];
}

function estimateCost(model: ModelCard, req: RenderRequest): number {
  const dur = req.durationSec ?? 5;
  const res = req.resolution ?? '720p';
  const baseRate =
    res === '480p' && model.pricing.per480pSec
      ? model.pricing.per480pSec
      : RES_WIDTH[res] >= 1080 && model.pricing.per1080pSec
        ? model.pricing.per1080pSec
        : model.pricing.per720pSec ?? 0;

  const hasVideoRef = (req.refVideos?.length ?? 0) > 0;
  const refMultiplier =
    hasVideoRef && model.pricing.videoRefMultiplier
      ? model.pricing.videoRefMultiplier
      : 1;

  const audioSurcharge =
    req.generateAudio && model.pricing.audioSurcharge
      ? model.pricing.audioSurcharge
      : 0;

  return baseRate * refMultiplier * dur + audioSurcharge;
}

export function route(req: RenderRequest): RoutingDecision {
  // Honor explicit pin first.
  if (req.preferredModelId) {
    const pinned = getModel(req.preferredModelId);
    if (pinned) {
      const fallbacks = pinned.family === 'seedance'
        ? buildSubstrateFallbacks(pinned)
        : buildEscapeFallbacks(pinned, req);
      return {
        primary: pinned,
        fallbacks: filterExcluded(fallbacks, req),
        estimatedCostUsd: estimateCost(pinned, req),
        rationale: `Explicit pin: ${pinned.label}.`,
      };
    }
  }

  // Check escape conditions in order — first match wins.
  for (const cond of ESCAPE_CONDITIONS) {
    if (cond.predicate(req)) {
      // Filter candidates to those that can actually accept the request's
      // ref count. Avoids picking Kling Elements when only 1 ref is present
      // (Elements requires multi-image input).
      const refCount = req.refImages?.length ?? 0;
      const refsCompatible = cond.candidates.filter(c => {
        const max = c.capabilities.maxRefImages;
        // For multi-ref-only models (Elements has maxRefImages=4 but min=2),
        // require at least 2 refs. We approximate by the model id.
        if (c.id === 'kling-elements' && refCount < 2) return false;
        return refCount <= max;
      });
      const candidates = filterExcluded(refsCompatible, req);
      if (candidates.length === 0) continue;
      const primary = candidates[0];
      return {
        primary,
        fallbacks: filterExcluded(
          [...candidates.slice(1), ...buildEscapeFallbacks(primary, req)],
          req,
        ),
        estimatedCostUsd: estimateCost(primary, req),
        rationale: `Escape from substrate — ${cond.reason}. Primary: ${primary.label}.`,
      };
    }
  }

  // Default: stay on substrate.
  const primary = selectSubstrateVariant(req);
  return {
    primary,
    fallbacks: filterExcluded(buildSubstrateFallbacks(primary), req),
    estimatedCostUsd: estimateCost(primary, req),
    rationale: `Substrate route — ${primary.label}. ${describeRefs(req)}`,
  };
}

function describeRefs(req: RenderRequest): string {
  const i = req.refImages?.length ?? 0;
  const v = req.refVideos?.length ?? 0;
  const a = req.refAudio?.length ?? 0;
  if (i + v + a === 0) return 'No refs.';
  return `Refs: ${i} img / ${v} vid / ${a} audio.`;
}

function filterExcluded(models: ModelCard[], req: RenderRequest): ModelCard[] {
  const ex = new Set(req.excludeModelIds ?? []);
  return models.filter(m => !ex.has(m.id));
}

// Convenience: produce a human-readable routing report for the UI.
export function explainRoute(req: RenderRequest): string {
  const d = route(req);
  const lines = [
    `▶ ${d.primary.label}  (~$${d.estimatedCostUsd.toFixed(3)} for ${req.durationSec ?? 5}s)`,
    `   ${d.rationale}`,
    `   fallbacks: ${d.fallbacks.map(f => f.id).join(' → ') || '(none)'}`,
  ];
  return lines.join('\n');
}
