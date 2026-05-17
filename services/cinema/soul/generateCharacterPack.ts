// Cinema Studio — Maximum Character Sheet generator.
//
// Saturates NanoBanana Pro's 14-image input limit with the Soul's seed photos
// (or top auto-curated anchors) and produces 14 character-locked output
// frames spanning all angles × wardrobe × lighting. These become the
// Soul's canonical anchor set, the top-9 of which auto-fill Seedance
// [Image1..9] reference-to-video slots.
//
// One generator pass = one frame. We run all 14 sequentially with the same
// 14 input refs — keeps identity rock-solid across the sheet.

import type { ImageRef } from '../types';
import type { SoulCast } from './types';
import { generateKeyframe } from '../keyframe';
import type { GeneratedKeyframe } from '../keyframe';
import { generateKeyframeFal } from '../keyframeFal';
import { HERO_14, type AnglePose } from './anglePacks';
import { DICO_WARDROBE, getWardrobeLook, type WardrobeLook } from './wardrobePacks';

const MAX_INPUT_REFS = 14;

export interface CharacterPackProgress {
  total: number;
  completed: number;
  currentId?: string;
  currentLabel?: string;
}

export interface GenerateCharacterPackOpts {
  soul: SoulCast;
  /** Gemini key — required when provider is 'gemini' (default). */
  geminiApiKey?: string;
  /** fal key — required when provider is 'fal'. Bypasses Gemini quota. */
  falApiKey?: string;
  /** 'gemini' = NanoBanana Pro (max identity fidelity, monthly cap).
   *  'fal' = Flux Pro Ultra / Redux on fal (no Gemini cap, lower fidelity). */
  provider?: 'gemini' | 'fal';
  /** Override which angle pack to use. Default: HERO_14. */
  angles?: AnglePose[];
  /** Override which wardrobe to apply. Default: soul.signatureOutfit text or DICO_WARDROBE[0]. */
  wardrobeId?: string;
  /** If set, rotate through multiple wardrobe looks across the sheet. */
  wardrobeRotation?: string[];
  /** 4K / 2K / 1K. Default: 2K (good balance for ref images). */
  quality?: '1K' | '2K' | '4K';
  /** Skip the slow Pro model and use Flash/dev for iteration. Default: false. */
  fast?: boolean;
  onProgress?: (p: CharacterPackProgress) => void;
}

/**
 * Generate the full 14-frame Maximum Character Sheet for a Soul.
 * Returns the keyframes plus updated SoulAnchor entries you can persist
 * via curateFromLibrary or directly merge onto the Soul.
 */
export async function generateMaximumCharacterSheet(
  opts: GenerateCharacterPackOpts,
): Promise<GeneratedKeyframe[]> {
  const { soul, onProgress } = opts;
  const provider = opts.provider ?? 'gemini';
  const angles = opts.angles ?? HERO_14;
  if (provider === 'gemini' && !opts.geminiApiKey) {
    throw new Error('generateMaximumCharacterSheet: provider=gemini requires geminiApiKey');
  }
  if (provider === 'fal' && !opts.falApiKey) {
    throw new Error('generateMaximumCharacterSheet: provider=fal requires falApiKey');
  }

  // Build the 14-image input ref pack from the Soul's anchors.
  // Priority: hero-tagged → highest-match → seed photos.
  const sortedAnchors = [
    ...soul.anchors.filter(a => a.taggedAsHero),
    ...soul.anchors.filter(a => !a.taggedAsHero).sort((a, b) => b.matchScore - a.matchScore),
  ];
  const inputImages: ImageRef[] = sortedAnchors.slice(0, MAX_INPUT_REFS).map(a => ({
    url: a.url,
    alias: 'identity-anchor',
    weight: a.matchScore,
  }));
  if (inputImages.length === 0) {
    throw new Error('Soul has no anchors. Add seed photos before generating the character sheet.');
  }

  // Wardrobe rotation — round-robin across sheet if specified.
  const wardrobeIds = opts.wardrobeRotation && opts.wardrobeRotation.length > 0
    ? opts.wardrobeRotation
    : opts.wardrobeId
      ? [opts.wardrobeId]
      : ['signature-leather'];

  const out: GeneratedKeyframe[] = [];
  for (let i = 0; i < angles.length; i++) {
    const angle = angles[i];
    const wardrobeId = wardrobeIds[i % wardrobeIds.length];
    const wardrobe = getWardrobeLook(wardrobeId) ?? DICO_WARDROBE[0];

    onProgress?.({
      total: angles.length,
      completed: i,
      currentId: angle.id,
      currentLabel: angle.label,
    });

    const composedRolePrompt = composeFramePrompt(angle, wardrobe, soul);
    const role = {
      alias: angleGroupToAlias(angle.group),
      aspectRatio: angle.aspectRatio,
      prompt: composedRolePrompt,
    };

    const keyframe = provider === 'fal'
      ? await generateKeyframeFal(role, {
          falApiKey: opts.falApiKey!,
          fast: opts.fast,
          quality: opts.quality ?? '2K',
          faceAnchorPrompt: soul.faceAnchorPrompt,
          productionBible: soul.productionBible,
          inputImages,
        })
      : await generateKeyframe(role, {
          apiKey: opts.geminiApiKey!,
          faceAnchorPrompt: soul.faceAnchorPrompt,
          productionBible: soul.productionBible,
          sharedStylePrompt: undefined,
          fast: opts.fast,
          quality: opts.quality ?? '2K',
          inputImages,
        });
    out.push(keyframe);
  }

  onProgress?.({ total: angles.length, completed: angles.length });
  return out;
}

function angleGroupToAlias(group: AnglePose['group']): GeneratedKeyframe['role'] {
  switch (group) {
    case 'portrait': return 'character';
    case 'body': return 'character-pose';
    case 'closeup': return 'character';
    case 'environment': return 'environment';
    case 'wardrobe': return 'wardrobe';
    default: return 'character';
  }
}

function composeFramePrompt(angle: AnglePose, wardrobe: WardrobeLook, soul: SoulCast): string {
  return [
    `[Frame ${angle.label}]`,
    angle.prompt,
    '',
    `Lighting: ${angle.lighting}`,
    `Wardrobe: ${wardrobe.prompt}`,
    '',
    `Identity must match the input reference photos exactly. Same face, same proportions, same skin texture, same hair, same expression dynamics across this sheet. ${soul.signatureOutfit ? `Default outfit: ${soul.signatureOutfit}` : ''}`.trim(),
    '',
    'Photorealistic. Phase One IQ4 medium-format aesthetic at 150 megapixels. Skin pores visible, individual hair follicles, leather grain texture. Catchlights in both eyes when face is visible. NO smoothing, NO airbrush, NO CGI tells, NO plasticity.',
  ].filter(Boolean).join('\n');
}
