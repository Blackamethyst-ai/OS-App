// Cinema Studio — substrate-first pipeline orchestrator.
//
// Renders a single shot with:
//   1. Route via substrate-first router
//   2. Try primary; on failure walk fallback chain
//   3. Persist full provenance + cost trail to manifest
//
// Higher-level helpers compose this into multi-shot scenes / character-sheet
// + reference-to-video flows.

import type {
  RenderRequest,
  RenderResult,
  ProgressCallback,
  ProviderCredentials,
  ImageRef,
} from './types';
import { route } from './router';
import { findProvider, ProviderError } from './providers';
import { getModel } from './models';
import {
  createEntry,
  recordAttempt,
  completeEntry,
  failEntry,
  type ManifestEntry,
} from './manifest';
import {
  generateCharacterSheet,
  generateKeyframe,
  type KeyframeRole,
  type GeneratedKeyframe,
} from './keyframe';

export interface RenderShotOptions {
  creds: ProviderCredentials;
  onProgress?: ProgressCallback;
  // If true, write provenance to IndexedDB manifest. Default: true.
  persist?: boolean;
  // If true, trigger browser download of completed video on success. Default: true.
  // Browser will save to user's default Downloads folder.
  autoDownload?: boolean;
}

// fal-hosted videos expire on fal's CDN. Pull bytes locally as soon as the
// render lands so the user always has a permanent copy.
async function triggerVideoDownload(
  result: RenderResult,
  req: RenderRequest,
): Promise<void> {
  if (!result.videoUrl || typeof document === 'undefined') return;
  const res = await fetch(result.videoUrl);
  if (!res.ok) throw new Error(`Download fetch failed HTTP ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const ts = result.completedAt.replace(/[:.]/g, '-').replace(/T/, '_').slice(0, 19);
  const slug = (req.shotName ?? result.modelId).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const a = document.createElement('a');
  a.href = url;
  a.download = `cinema-${slug}-${ts}.mp4`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export interface ShotOutput {
  result: RenderResult;
  manifestEntryId: string;
  fellBackFromPrimary: boolean;
}

export async function renderShot(
  req: RenderRequest,
  opts: RenderShotOptions,
): Promise<ShotOutput> {
  const decision = route(req);
  const persist = opts.persist !== false;
  const entry: ManifestEntry | null = persist ? await createEntry(req, decision) : null;

  const chain = [decision.primary, ...decision.fallbacks];
  let lastError: Error | null = null;

  for (let i = 0; i < chain.length; i++) {
    const model = chain[i];
    const isFallback = i > 0;
    if (isFallback) {
      opts.onProgress?.({
        type: 'fallback',
        modelId: model.id,
        message: `Substrate primary failed, escaping to ${model.label}`,
      });
    }
    const provider = findProvider(model);
    const t0 = performance.now();
    const startedAt = new Date().toISOString();
    try {
      const result = await provider.render(model, req, opts.creds, opts.onProgress);
      const t1 = performance.now();
      if (entry) {
        await recordAttempt(entry.id, {
          modelId: model.id,
          startedAt,
          endedAt: new Date().toISOString(),
          outcome: 'success',
          costUsd: result.costUsd,
          latencyMs: t1 - t0,
        });
        await completeEntry(
          entry.id,
          result,
          isFallback ? 'fallback-succeeded' : 'succeeded',
        );
      }
      // Auto-download — fal-hosted videos are ephemeral. Trigger a browser
      // download to ~/Downloads as soon as the URL lands so user has a
      // permanent local copy. Filename includes shot name + timestamp.
      if (result.videoUrl && opts.autoDownload !== false) {
        try { await triggerVideoDownload(result, req); }
        catch (e) { console.warn('[cinema] auto-download failed', e); }
      }
      return {
        result,
        manifestEntryId: entry?.id ?? '',
        fellBackFromPrimary: isFallback,
      };
    } catch (err) {
      const t1 = performance.now();
      const errMsg = err instanceof Error ? err.message : String(err);
      lastError = err instanceof Error ? err : new Error(errMsg);
      if (entry) {
        await recordAttempt(entry.id, {
          modelId: model.id,
          startedAt,
          endedAt: new Date().toISOString(),
          outcome: 'failure',
          error: errMsg,
          latencyMs: t1 - t0,
        });
      }
      // Auth failures should NOT trigger fallback to a different provider —
      // it'll just fail again. Bail.
      if (err instanceof ProviderError && err.stage === 'auth') {
        if (entry) await failEntry(entry.id);
        throw err;
      }
      // Otherwise continue to next in chain.
    }
  }

  if (entry) await failEntry(entry.id);
  throw lastError ?? new Error('All models in fallback chain failed');
}

// =============================================================================
// HIGHER-LEVEL FLOWS
// =============================================================================

export interface SceneSpec {
  sceneId: string;
  faceAnchorPrompt: string;       // Identity block from visual_character_profile.md
  sharedStylePrompt?: string;     // "Peter Lindbergh meets..."
  shots: ShotSpec[];
}

export interface ShotSpec {
  shotName: string;
  prompt: string;                  // Action description, including [Image1]..[Image9] grammar
  durationSec?: number;
  aspectRatio?: RenderRequest['aspectRatio'];
  resolution?: RenderRequest['resolution'];
  generateAudio?: boolean;
  motionRefVideos?: string[];      // up to 3 — packed as [Video1]..[Video3]
  voiceRefAudio?: string[];        // up to 3 — packed as [Audio1]..[Audio3]
  extraKeyframeRoles?: KeyframeRole[];  // shot-specific keyframes beyond the sheet
  preferredModelId?: string;
  budgetTier?: RenderRequest['budgetTier'];
}

export interface RenderSceneOptions extends RenderShotOptions {
  geminiApiKey: string;
  fastKeyframes?: boolean;
}

export interface SceneOutput {
  sceneId: string;
  characterSheet: GeneratedKeyframe[];
  shots: Array<ShotOutput & { shotName: string }>;
  totalCostUsd: number;
}

export async function renderScene(
  scene: SceneSpec,
  opts: RenderSceneOptions,
): Promise<SceneOutput> {
  // 1. Build the character sheet ONCE — these refs travel with every shot.
  opts.onProgress?.({ type: 'started', message: `Building character sheet for ${scene.sceneId}` });
  const characterSheet = await generateCharacterSheet(scene.faceAnchorPrompt, {
    apiKey: opts.geminiApiKey,
    sharedStylePrompt: scene.sharedStylePrompt,
    fast: opts.fastKeyframes,
  });

  // 2. Render each shot, packing the sheet into [Image1..Image5] and any
  //    shot-specific keyframes into [Image6..Image9].
  const shotOutputs: SceneOutput['shots'] = [];
  let totalCost = 0;

  for (const shot of scene.shots) {
    const shotKeyframes: GeneratedKeyframe[] = [];
    for (const role of shot.extraKeyframeRoles ?? []) {
      shotKeyframes.push(
        await generateKeyframe(role, {
          apiKey: opts.geminiApiKey,
          faceAnchorPrompt: scene.faceAnchorPrompt,
          sharedStylePrompt: scene.sharedStylePrompt,
          fast: opts.fastKeyframes,
        }),
      );
    }

    const refImages: ImageRef[] = [
      ...characterSheet.slice(0, 5),
      ...shotKeyframes.slice(0, 4),
    ].slice(0, 9);

    const out = await renderShot(
      {
        prompt: shot.prompt,
        modality: 'r2v',
        refImages,
        refVideos: shot.motionRefVideos?.slice(0, 3).map(url => ({ url })) ?? [],
        refAudio: shot.voiceRefAudio?.slice(0, 3).map(url => ({ url })) ?? [],
        durationSec: shot.durationSec ?? 6,
        aspectRatio: shot.aspectRatio ?? '16:9',
        resolution: shot.resolution ?? '720p',
        generateAudio: shot.generateAudio ?? true,
        budgetTier: shot.budgetTier ?? 'mid',
        preferredModelId: shot.preferredModelId,
        shotName: shot.shotName,
        sceneId: scene.sceneId,
        tags: ['cinematic', 'character-consistent'],
      },
      opts,
    );

    totalCost += out.result.costUsd;
    shotOutputs.push({ ...out, shotName: shot.shotName });
  }

  return {
    sceneId: scene.sceneId,
    characterSheet,
    shots: shotOutputs,
    totalCostUsd: totalCost,
  };
}

// Quick helper — visible model for whoever's debugging.
export function inspectModel(id: string) {
  return getModel(id);
}

// =============================================================================
// SEGMENTED RENDER — golden-window strategy
// =============================================================================
//
// Single i2v has a "golden window" property (verified 2026-05-01 on Kling 3.0
// Pro): the first ~3s and last ~3s of any 10s render are sharp; the middle
// drifts. To produce 10s+ output without drift, render N parallel 3s shots
// from the SAME ref and concat them. Each shot is in its own golden window
// because none exceed the drift threshold.
//
// This helper does the parallel renders and emits a concat-list. The actual
// concat is done CLI-side (ffmpeg) for now — browser auto-concat is a follow-up
// that requires shipping @ffmpeg/ffmpeg (~30 MB).

export interface SegmentedShotResult {
  segments: ShotOutput[];
  totalCostUsd: number;
  totalDurationSec: number;
  // ffmpeg concat list — one path per line, suitable for `ffmpeg -f concat -i list.txt -c copy out.mp4`.
  // URLs need to be downloaded first; helper below derives default download names.
  concatList: string;
  // Suggested output filename slug (no extension).
  suggestedSlug: string;
}

export async function renderSegmentedShot(
  req: RenderRequest,
  opts: RenderShotOptions & {
    /** Length of each segment in seconds. Default 3 — Kling i2v golden window. */
    segmentSec?: number;
    /** Total target duration. Defaults to req.durationSec. */
    totalSec?: number;
    /** Run all segments in parallel (default) or sequentially. Sequential is slower but cheaper on burst rate-limits. */
    parallel?: boolean;
  },
): Promise<SegmentedShotResult> {
  const segmentSec = opts.segmentSec ?? 3;
  const totalSec = opts.totalSec ?? req.durationSec ?? 10;
  const segmentCount = Math.ceil(totalSec / segmentSec);
  const parallel = opts.parallel !== false;

  opts.onProgress?.({
    type: 'started',
    message: `Segmented render: ${segmentCount} × ${segmentSec}s from same ref`,
  });

  const baseSlug = (req.shotName ?? 'cinema-segment')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const buildSegmentReq = (idx: number): RenderRequest => ({
    ...req,
    durationSec: segmentSec,
    shotName: `${baseSlug}-seg${String(idx + 1).padStart(2, '0')}`,
  });

  const segments: ShotOutput[] = [];
  if (parallel) {
    const results = await Promise.all(
      Array.from({ length: segmentCount }, (_, i) =>
        renderShot(buildSegmentReq(i), opts),
      ),
    );
    segments.push(...results);
  } else {
    for (let i = 0; i < segmentCount; i++) {
      segments.push(await renderShot(buildSegmentReq(i), opts));
    }
  }

  const totalCostUsd = segments.reduce((s, x) => s + x.result.costUsd, 0);
  // Per-segment download names — must match what triggerVideoDownload writes.
  const concatLines = segments.map((s, i) => {
    const ts = s.result.completedAt.replace(/[:.]/g, '-').replace(/T/, '_').slice(0, 19);
    return `file 'cinema-${baseSlug}-seg${String(i + 1).padStart(2, '0')}-${ts}.mp4'`;
  });
  const concatList = concatLines.join('\n') + '\n';

  return {
    segments,
    totalCostUsd,
    totalDurationSec: segmentCount * segmentSec,
    concatList,
    suggestedSlug: `${baseSlug}-${segmentCount}x${segmentSec}s`,
  };
}
