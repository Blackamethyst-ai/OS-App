// Cinema Studio — Flux-on-fal keyframe generator.
//
// Alternative path to NanoBanana when Gemini monthly cap is hit. Uses
// `fal-ai/flux-pro/v1.1-ultra` for quality or `fal-ai/flux/dev` for speed.
// Output shape matches GeneratedKeyframe so generateMaximumCharacterSheet can
// route to either provider via opts.
//
// Limitation vs NanoBanana: Flux on fal does not natively support 14 input
// reference images for identity lock. We pack the strongest 1-4 anchors as
// `image_url` if the chosen Flux variant supports image-to-image; otherwise
// fall back to text-only with face-anchor prompt and accept lower identity
// fidelity.

import { fal } from '@fal-ai/client';
import type { ImageRef } from './types';
import type { KeyframeRole, KeyframeQuality, GeneratedKeyframe } from './keyframe';
import { DICO_FACE_ANCHOR, DICO_PRODUCTION_BIBLE, DICO_STYLE_LINE } from './faceAnchor';

export const FLUX_PRO_ULTRA = 'fal-ai/flux-pro/v1.1-ultra';
export const FLUX_DEV = 'fal-ai/flux/dev';
export const FLUX_REDUX_ULTRA = 'fal-ai/flux-pro/v1.1-ultra/redux';  // image-to-image variant

export interface KeyframeFalOptions {
  falApiKey: string;
  fast?: boolean;                  // FLUX_DEV vs FLUX_PRO_ULTRA
  quality?: KeyframeQuality;       // ignored for Flux (always native res)
  faceAnchorPrompt?: string;
  productionBible?: string;
  sharedStylePrompt?: string;
  inputImages?: ImageRef[];        // packed as redux image_urls if supported
  /** Use Redux variant for image-to-image with up to 4 anchors. Default true if inputImages present. */
  useRedux?: boolean;
}

const ASPECT_TO_FLUX: Record<string, string> = {
  '16:9': '16_9',
  '9:16': '9_16',
  '1:1': '1_1',
  '4:3': '4_3',
  '3:4': '3_4',
  '21:9': '21_9',
};

async function ensureHostedUrl(url: string): Promise<string> {
  if (/^https:\/\/(.*\.)?fal\.(media|run|ai)\b/.test(url)) return url;
  if (/^https?:\/\//i.test(url) && !/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.)/.test(url)) {
    return url;
  }
  const res = await fetch(url);
  const blob = await res.blob();
  return await fal.storage.upload(blob);
}

export async function generateKeyframeFal(
  role: KeyframeRole,
  opts: KeyframeFalOptions,
): Promise<GeneratedKeyframe> {
  fal.config({ credentials: opts.falApiKey });

  const refs = (opts.inputImages ?? []).slice(0, 4);
  const useRedux = opts.useRedux !== false && refs.length > 0;
  const model = opts.fast
    ? FLUX_DEV
    : useRedux
      ? FLUX_REDUX_ULTRA
      : FLUX_PRO_ULTRA;

  const fullPrompt = [
    role.prompt,
    opts.faceAnchorPrompt ?? DICO_FACE_ANCHOR,
    opts.productionBible ?? DICO_PRODUCTION_BIBLE,
    opts.sharedStylePrompt ?? DICO_STYLE_LINE,
  ].filter(Boolean).join('\n\n');

  const aspectRatio = ASPECT_TO_FLUX[role.aspectRatio ?? '16:9'] ?? '16_9';

  // Hoist refs to fal storage if they are data URLs / local.
  const hostedRefs = await Promise.all(refs.map(r => ensureHostedUrl(r.url)));

  const input: Record<string, unknown> = {
    prompt: fullPrompt,
    aspect_ratio: aspectRatio,
    num_images: 1,
    enable_safety_checker: false,
    output_format: 'png',
  };

  if (useRedux && hostedRefs.length > 0) {
    // Redux endpoint takes a single primary `image_url` plus optional secondary refs.
    input.image_url = hostedRefs[0];
    if (hostedRefs.length > 1) input.image_urls = hostedRefs.slice(1);
    input.image_prompt_strength = 0.7;
  }

  const response = (await (fal.subscribe as any)(model, {
    input,
    logs: false,
  })) as unknown as { data?: { images?: Array<{ url: string }> } };

  const url = response?.data?.images?.[0]?.url;
  if (!url) {
    throw new Error(`Flux returned no image (model=${model}, role=${role.alias})`);
  }

  return {
    url,
    alias: role.alias,
    role: role.alias,
    weight: 1,
    source: 'ai_generated',
    isPersonLikeness: true,
    modelUsed: model,
    quality: opts.quality ?? '2K',
    promptUsed: fullPrompt,
    generatedAt: new Date().toISOString(),
  };
}
