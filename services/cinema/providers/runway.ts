// Cinema Studio — Runway Gen-4 Turbo provider.
// Escape hatch for motion-brush precision and Runway-native scene consistency.

import type { ModelCard, RenderRequest, RenderResult, ProgressCallback, ProviderCredentials } from '../types';
import { Provider, ProviderError, requireCred } from './base';

interface RunwayTaskResponse {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'THROTTLED';
  output?: string[];
  failure?: string;
  progress?: number;
}

const BASE = 'https://api.dev.runwayml.com/v1';
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 120;

export const runwayProvider: Provider = {
  key: 'runway',
  supports(model) {
    return model.provider === 'runway';
  },
  async render(model, req, creds, onProgress) {
    const key = requireCred(creds.runway, 'runway', model.id, 'Runway API key');
    const startedAt = new Date().toISOString();
    const t0 = performance.now();
    onProgress?.({ type: 'started', modelId: model.id });

    const isI2V = !!req.refImages?.[0];
    const path = isI2V ? '/image_to_video' : '/text_to_video';
    const body: Record<string, unknown> = {
      model: model.endpoint,
      promptText: req.prompt,
      duration: Math.min(req.durationSec ?? 5, model.capabilities.maxDurationSec),
      ratio: req.aspectRatio === '9:16' ? '720:1280' : '1280:720',
      ...(req.seed !== undefined ? { seed: req.seed } : {}),
      ...(isI2V ? { promptImage: req.refImages![0].url } : {}),
    };

    const submit = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06',
      },
      body: JSON.stringify(body),
    });
    if (!submit.ok) {
      const errBody = await submit.text().catch(() => '');
      throw new ProviderError('runway', model.id, 'submit', `HTTP ${submit.status}: ${errBody.slice(0, 300)}`);
    }
    const submitted = (await submit.json()) as RunwayTaskResponse;
    onProgress?.({ type: 'queued', modelId: model.id, message: submitted.id });

    let videoUrl: string | undefined;
    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      const r = await fetch(`${BASE}/tasks/${submitted.id}`, {
        headers: { 'Authorization': `Bearer ${key}`, 'X-Runway-Version': '2024-11-06' },
      });
      if (!r.ok) throw new ProviderError('runway', model.id, 'poll', `HTTP ${r.status}`);
      const status = (await r.json()) as RunwayTaskResponse;
      onProgress?.({
        type: 'progress',
        modelId: model.id,
        progress: status.progress ?? (status.status === 'RUNNING' ? 0.5 : 0.1),
      });
      if (status.status === 'FAILED' || status.status === 'CANCELLED') {
        throw new ProviderError('runway', model.id, 'poll', status.failure ?? status.status);
      }
      if (status.status === 'SUCCEEDED') {
        videoUrl = status.output?.[0];
        break;
      }
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    }
    if (!videoUrl) {
      throw new ProviderError('runway', model.id, 'fetch', 'No output URL after polling');
    }

    const t1 = performance.now();
    const completedAt = new Date().toISOString();
    const dur = Math.min(req.durationSec ?? 5, model.capabilities.maxDurationSec);
    const res = req.resolution ?? '720p';
    const rate = model.pricing.per720pSec ?? 0;

    onProgress?.({ type: 'completed', modelId: model.id, progress: 1 });

    return {
      videoUrl,
      durationSec: dur,
      resolution: res,
      modelId: model.id,
      provider: 'runway',
      startedAt,
      completedAt,
      costUsd: rate * dur,
      latencyMs: t1 - t0,
    };
  },
};
