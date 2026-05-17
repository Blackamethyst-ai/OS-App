// Cinema Studio — preset pack composer.
// Stitches camera-move + framing + style-signature preset prompts onto the
// user's base prompt before sending to Seedance. Each preset is optional; an
// empty selection just yields the base prompt unchanged.
//
// Custom packs: drop a new entry into any of the three pack files. They're
// plain TS modules — hot-reload friendly.

import { CAMERA_MOVES, getCameraMove } from './cameraMoves';
import { FRAMING_PRESETS, getFraming } from './framing';
import { STYLE_SIGNATURES, getStyleSignature } from './styleSignatures';

export type { CameraMovePreset } from './cameraMoves';
export type { FramingPreset } from './framing';
export type { StyleSignature } from './styleSignatures';

export { CAMERA_MOVES, FRAMING_PRESETS, STYLE_SIGNATURES };
export { getCameraMove, getFraming, getStyleSignature };

export interface ComposeOpts {
  basePrompt: string;
  cameraMoveId?: string;
  framingId?: string;
  styleId?: string;
  customCamera?: string;
  customFraming?: string;
  customStyle?: string;
}

/**
 * Compose a final prompt by appending preset fragments to the base.
 * Order: base → framing → camera move → style.
 * This order matters — Seedance reads top-down and applies framing
 * before motion before style.
 */
export function composeShotPrompt(opts: ComposeOpts): string {
  const lines = [opts.basePrompt.trim()];

  const framing = opts.framingId ? getFraming(opts.framingId) : undefined;
  const camera = opts.cameraMoveId ? getCameraMove(opts.cameraMoveId) : undefined;
  const style = opts.styleId ? getStyleSignature(opts.styleId) : undefined;

  if (framing) lines.push('', framing.prompt);
  else if (opts.customFraming) lines.push('', `Framing: ${opts.customFraming}`);

  if (camera) lines.push('', camera.prompt);
  else if (opts.customCamera) lines.push('', `Camera: ${opts.customCamera}`);

  if (style) lines.push('', style.prompt);
  else if (opts.customStyle) lines.push('', `Style: ${opts.customStyle}`);

  return lines.join('\n');
}

export function explainCompose(opts: ComposeOpts): string {
  const parts: string[] = ['base'];
  if (opts.framingId) parts.push(`framing=${opts.framingId}`);
  else if (opts.customFraming) parts.push('framing=custom');
  if (opts.cameraMoveId) parts.push(`camera=${opts.cameraMoveId}`);
  else if (opts.customCamera) parts.push('camera=custom');
  if (opts.styleId) parts.push(`style=${opts.styleId}`);
  else if (opts.customStyle) parts.push('style=custom');
  return parts.join(' + ');
}
