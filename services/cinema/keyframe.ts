// Cinema Studio — NanoBanana Pro keyframe generator.
//
// Mirrors ~/projects/apps/researchgravity/visual/gemini_native.py exactly:
//   - model: gemini-3-pro-image-preview (NanoBanana Pro)
//   - generateContentStream with response_modalities IMAGE+TEXT
//   - up to 14 input images for identity-locked composition
//   - native 1K / 2K / 4K via ImageConfig.image_size
//
// Output: data URL keyframes ready to drop into Seedance 2.0 [Image1..9]
// reference-to-video slots. No fal upload needed — Seedance accepts data URLs.

import { GoogleGenAI } from '@google/genai';
import type { ImageRef, AspectRatio } from './types';
import { DICO_FACE_ANCHOR, DICO_PRODUCTION_BIBLE, DICO_STYLE_LINE } from './faceAnchor';

export const NANOBANANA_PRO = 'gemini-3-pro-image-preview';
export const NANOBANANA_FLASH = 'gemini-2.5-flash-image';

// Maximum input images (matches MAX_INPUT_IMAGES in gemini_native.py)
const MAX_INPUT_IMAGES = 14;

export type KeyframeQuality = '1K' | '2K' | '4K';

const ASPECT_OK: Record<string, '1:1' | '3:4' | '4:3' | '9:16' | '16:9'> = {
  '1:1': '1:1',
  '3:4': '3:4',
  '4:3': '4:3',
  '9:16': '9:16',
  '16:9': '16:9',
  '21:9': '16:9',
};

export interface KeyframeRole {
  alias: 'character' | 'character-pose' | 'environment' | 'lighting' | 'style' | 'wardrobe';
  prompt: string;
  aspectRatio?: AspectRatio;
}

export interface KeyframeOptions {
  apiKey: string;
  fast?: boolean;                  // use gemini-2.5-flash-image vs gemini-3-pro-image-preview
  quality?: KeyframeQuality;       // default 4K on Pro, 2K on Flash
  faceAnchorPrompt?: string;       // identity block (default: DICO_FACE_ANCHOR)
  productionBible?: string;        // production bible (default: DICO_PRODUCTION_BIBLE)
  sharedStylePrompt?: string;      // style line (default: DICO_STYLE_LINE)
  inputImages?: ImageRef[];        // identity-anchor refs (max 14) — passed verbatim to NanoBanana Pro
}

export interface GeneratedKeyframe extends ImageRef {
  role: KeyframeRole['alias'];
  modelUsed: string;
  quality: KeyframeQuality;
  promptUsed: string;
  generatedAt: string;
}

// =============================================================================

async function refToInlinePart(ref: ImageRef): Promise<{ inlineData: { mimeType: string; data: string } }> {
  // Accept data URLs (base64-encoded already), https URLs (fetch + b64), or local file URLs.
  if (ref.url.startsWith('data:')) {
    const [header, data] = ref.url.split(',', 2);
    const m = header.match(/data:([^;]+)/);
    return { inlineData: { mimeType: m?.[1] ?? 'image/png', data } };
  }
  // https or path-relative — fetch and base64.
  const res = await fetch(ref.url);
  if (!res.ok) throw new Error(`Failed to fetch ref ${ref.url}: HTTP ${res.status}`);
  const blob = await res.blob();
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return {
    inlineData: {
      mimeType: blob.type || 'image/png',
      data: btoa(binary),
    },
  };
}

// =============================================================================

export async function generateKeyframe(
  role: KeyframeRole,
  opts: KeyframeOptions,
): Promise<GeneratedKeyframe> {
  const ai = new GoogleGenAI({ apiKey: opts.apiKey });
  const model = opts.fast ? NANOBANANA_FLASH : NANOBANANA_PRO;
  const quality: KeyframeQuality = opts.quality ?? (opts.fast ? '2K' : '4K');
  const aspectRatio = ASPECT_OK[role.aspectRatio ?? '16:9'];

  const fullPrompt = [
    role.prompt,
    opts.faceAnchorPrompt ?? DICO_FACE_ANCHOR,
    opts.productionBible ?? DICO_PRODUCTION_BIBLE,
    opts.sharedStylePrompt ?? DICO_STYLE_LINE,
  ].filter(Boolean).join('\n\n');

  // Build parts: identity-anchor input images first, then text prompt.
  const refs = (opts.inputImages ?? []).slice(0, MAX_INPUT_IMAGES);
  const refParts = await Promise.all(refs.map(refToInlinePart));
  const parts: any[] = [...refParts, { text: fullPrompt }];

  // Match gemini_native.py config exactly.
  const config: any = {
    responseModalities: ['IMAGE', 'TEXT'],
    imageConfig: {
      imageSize: quality,
      aspectRatio,
    },
  };

  // Stream — gemini-3-pro-image-preview returns image inline_data parts.
  let dataUrl: string | undefined;
  let mimeType = 'image/png';

  const stream = await ai.models.generateContentStream({
    model,
    contents: [{ role: 'user', parts }],
    config,
  });

  for await (const chunk of stream) {
    const candidates = (chunk as any).candidates ?? [];
    for (const c of candidates) {
      const cParts = c.content?.parts ?? [];
      for (const p of cParts) {
        if (p.inlineData?.data) {
          mimeType = p.inlineData.mimeType ?? mimeType;
          dataUrl = `data:${mimeType};base64,${p.inlineData.data}`;
        }
      }
    }
  }

  if (!dataUrl) {
    throw new Error(`NanoBanana Pro returned no image (role=${role.alias}, model=${model})`);
  }

  return {
    url: dataUrl,
    alias: role.alias,
    role: role.alias,
    weight: 1,
    // NanoBanana keyframes are photorealistic AI portraits of the user.
    // Mark provenance so the router escapes Seedance and routes to Kling/Luma.
    source: 'ai_generated',
    isPersonLikeness: true,
    modelUsed: model,
    quality,
    promptUsed: fullPrompt,
    generatedAt: new Date().toISOString(),
  };
}

// =============================================================================

export async function generateCharacterSheet(
  faceAnchorPrompt: string,
  options: {
    apiKey: string;
    sharedStylePrompt?: string;
    productionBible?: string;
    fast?: boolean;
    quality?: KeyframeQuality;
    inputImages?: ImageRef[];   // existing master_frame anchors travel into every shot
  },
): Promise<GeneratedKeyframe[]> {
  // Five frames that give Seedance enough identity signal to lock the face
  // across motion. All five carry the same input_images, ensuring continuity.
  const roles: KeyframeRole[] = [
    {
      alias: 'character',
      aspectRatio: '3:4',
      prompt:
        'Direct forward gaze, neutral expression, even key lighting from 11 oclock. Close-up chest-up portrait. Studio backdrop neutral gray gradient. This is the face identity anchor — render with absolute photorealistic fidelity.',
    },
    {
      alias: 'character-pose',
      aspectRatio: '3:4',
      prompt:
        'Three-quarter profile turn to camera left, contemplative gaze slightly downward. Same lighting, same wardrobe, same identity as anchor. Rim light from 4 oclock electric cyan low-intensity.',
    },
    {
      alias: 'character-pose',
      aspectRatio: '3:4',
      prompt:
        'Full profile camera right, jaw set, looking off into distance. Same lighting, same wardrobe, same identity as anchor.',
    },
    {
      alias: 'character-pose',
      aspectRatio: '16:9',
      prompt:
        'Three-quarter body shot, knees up, standing relaxed with hand in pocket, slight knowing half-smile. Cinematic key from 2 oclock warm tungsten, fill cool 1:4 ratio. Same identity as anchor.',
    },
    {
      alias: 'wardrobe',
      aspectRatio: '3:4',
      prompt:
        'Wardrobe study: leather jacket detail, fabric grain visible, pin and lapel, tailored fit. No face — focus on garment construction. Neutral mannequin or invisible-figure framing.',
    },
  ];

  return Promise.all(roles.map(role => generateKeyframe(role, {
    apiKey: options.apiKey,
    faceAnchorPrompt,
    productionBible: options.productionBible,
    sharedStylePrompt: options.sharedStylePrompt,
    fast: options.fast,
    quality: options.quality,
    inputImages: options.inputImages,
  })));
}
