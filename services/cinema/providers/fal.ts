// Cinema Studio — fal.ai provider.
// Hosts the Seedance 2.0 substrate plus Kling, Luma, and Wan escape models.
//
// Uses @fal-ai/client SDK (not raw fetch) so:
//   - CORS works in browser (queue.fal.run blocks direct fetch from arbitrary origins;
//     the SDK routes through fal.run which has CORS configured).
//   - data:image/* URLs are auto-uploaded to fal storage before submit.
//   - Retries, status polling, and result fetch are handled internally.
//
// Seedance reference grammar: prompt body refers to refs as
// [Image1]..[Image9], [Video1]..[Video3], [Audio1]..[Audio3].

import { fal } from '@fal-ai/client';
import type {
  ModelCard,
  RenderRequest,
  RenderResult,
  ProgressCallback,
  ProviderCredentials,
  ImageRef,
  VideoRef,
  AudioRef,
} from '../types';
import { Provider, ProviderError, requireCred } from './base';

let configuredKey: string | undefined;

function ensureFalConfig(key: string) {
  if (configuredKey === key) return;
  fal.config({ credentials: key });
  configuredKey = key;
}

// Convert any URL the fal worker can't reach (data:, blob:, relative path,
// localhost) into a fal.media URL. fal-hosted URLs pass through unchanged.
async function ensureHostedUrl(url: string): Promise<string> {
  if (/^https:\/\/(.*\.)?fal\.(media|run|ai)\b/.test(url)) return url;
  if (/^https?:\/\//i.test(url) && !/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.)/.test(url)) {
    // Public HTTPS — fal worker can fetch directly.
    return url;
  }
  // data:, blob:, relative path, or localhost — fetch locally + upload.
  console.log('[fal] uploading ref to fal storage:', url.slice(0, 80));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ref ${url.slice(0, 80)}: HTTP ${res.status}`);
  const blob = await res.blob();
  return await fal.storage.upload(blob);
}

async function hostRefImages(refs: ImageRef[] | undefined): Promise<string[]> {
  if (!refs?.length) return [];
  return Promise.all(refs.map(r => ensureHostedUrl(r.url)));
}

async function hostRefVideos(refs: VideoRef[] | undefined): Promise<string[]> {
  if (!refs?.length) return [];
  return Promise.all(refs.map(r => ensureHostedUrl(r.url)));
}

async function hostRefAudio(refs: AudioRef[] | undefined): Promise<string[]> {
  if (!refs?.length) return [];
  return Promise.all(refs.map(r => ensureHostedUrl(r.url)));
}

async function buildSeedanceInput(
  model: ModelCard,
  req: RenderRequest,
): Promise<Record<string, unknown>> {
  const imageUrls = await hostRefImages(req.refImages);
  const videoUrls = await hostRefVideos(req.refVideos);
  const audioUrls = await hostRefAudio(req.refAudio);

  const base: Record<string, unknown> = {
    prompt: req.prompt,
    duration: String(Math.min(req.durationSec ?? 5, model.capabilities.maxDurationSec)),
    aspect_ratio: req.aspectRatio ?? '16:9',
    resolution: req.resolution ?? '720p',
    generate_audio: req.generateAudio ?? model.capabilities.nativeAudio,
  };

  if (req.seed !== undefined) base.seed = req.seed;

  switch (model.id) {
    case 'seedance-2.0-reference':
    case 'seedance-2.0-fast-ref':
      base.image_urls = imageUrls.slice(0, 9);
      if (videoUrls.length) base.video_urls = videoUrls.slice(0, 3);
      if (audioUrls.length) base.audio_urls = audioUrls.slice(0, 3);
      break;
    case 'seedance-2.0-i2v':
    case 'seedance-2.0-fast-i2v':
      if (imageUrls[0]) base.image_url = imageUrls[0];
      break;
    case 'seedance-2.0-fast-t2v':
    case 'seedance-2.0-fast':
    case 'seedance-2.0-t2v':
      // text-only, no ref fields
      break;
    case 'kling-3.0':
    case 'kling-2.6-pro':
    case 'luma-ray-2':
    case 'wan-2.2':
      if (imageUrls[0]) base.image_url = imageUrls[0];
      break;
  }
  return base;
}

interface SeedanceQueueResult {
  data: { video: { url: string; content_type?: string }; seed?: number };
  requestId?: string;
}

export const falProvider: Provider = {
  key: 'fal',
  supports(model) {
    return model.provider === 'fal';
  },
  async render(model, req, creds, onProgress) {
    const key = requireCred(creds.fal, 'fal', model.id, 'fal API key (VITE_FAL_API_KEY)');
    ensureFalConfig(key);

    const startedAt = new Date().toISOString();
    const t0 = performance.now();

    onProgress?.({ type: 'started', modelId: model.id, message: 'Uploading refs to fal storage' });
    const input = await buildSeedanceInput(model, req);

    onProgress?.({ type: 'queued', modelId: model.id, message: 'Submitting to ' + model.endpoint });

    const response = (await (fal.subscribe as any)(model.endpoint, {
      input,
      logs: true,
      onQueueUpdate: (update: any) => {
        const status = update?.status;
        if (status === 'IN_QUEUE') {
          onProgress?.({
            type: 'queued',
            modelId: model.id,
            message: `IN_QUEUE${update?.position !== undefined ? ` (pos ${update.position})` : ''}`,
            progress: 0.1,
          });
        } else if (status === 'IN_PROGRESS') {
          const lastLog = update?.logs?.at?.(-1)?.message;
          onProgress?.({
            type: 'progress',
            modelId: model.id,
            message: lastLog ?? 'Generating frames',
            progress: 0.5,
          });
        }
      },
    })) as unknown as SeedanceQueueResult;

    if (!response?.data?.video?.url) {
      throw new ProviderError('fal', model.id, 'fetch', 'Provider returned no video URL');
    }

    const t1 = performance.now();
    const completedAt = new Date().toISOString();
    const dur = Math.min(req.durationSec ?? 5, model.capabilities.maxDurationSec);
    const res = req.resolution ?? '720p';
    const rate = model.pricing.per720pSec ?? 0;
    const refMul = (req.refVideos?.length ?? 0) > 0 && model.pricing.videoRefMultiplier
      ? model.pricing.videoRefMultiplier
      : 1;
    const costUsd = rate * refMul * dur;

    onProgress?.({ type: 'completed', modelId: model.id, progress: 1 });

    return {
      videoUrl: response.data.video.url,
      durationSec: dur,
      resolution: res,
      modelId: model.id,
      provider: 'fal',
      seed: response.data.seed,
      startedAt,
      completedAt,
      costUsd,
      latencyMs: t1 - t0,
      rawProviderResponse: response,
    };
  },
};
