// Cinema Studio — OpenAI Sora 2 provider.
// Escape hatch for >12s continuous shots and OpenAI-native dialogue.

import type { ModelCard, RenderRequest, RenderResult, ProgressCallback, ProviderCredentials } from '../types';
import { Provider, ProviderError, requireCred } from './base';

interface SoraSubmitResponse {
  id: string;
  object: string;
  created_at: number;
  status: string;
}

interface SoraStatusResponse {
  id: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  completed_at?: number;
  url?: string;
  error?: { message: string };
}

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 600; // Sora can take 10+ min for 25s clips

export const openaiProvider: Provider = {
  key: 'openai',
  supports(model) {
    return model.provider === 'openai';
  },
  async render(model, req, creds, onProgress) {
    const key = requireCred(creds.openai, 'openai', model.id, 'OpenAI API key');
    const startedAt = new Date().toISOString();
    const t0 = performance.now();

    onProgress?.({ type: 'started', modelId: model.id });

    const body: Record<string, unknown> = {
      model: model.endpoint,
      prompt: req.prompt,
      seconds: String(Math.min(req.durationSec ?? 10, model.capabilities.maxDurationSec)),
      size: req.resolution === '1080p' ? '1024x1792' : '720x1280',
    };
    if (req.refImages?.[0]) body.input_reference = req.refImages[0].url;

    const submit = await fetch('https://api.openai.com/v1/videos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!submit.ok) {
      const errBody = await submit.text().catch(() => '');
      throw new ProviderError('openai', model.id, 'submit', `HTTP ${submit.status}: ${errBody.slice(0, 300)}`);
    }
    const submitted = (await submit.json()) as SoraSubmitResponse;
    onProgress?.({ type: 'queued', modelId: model.id, message: submitted.id });

    let videoUrl: string | undefined;
    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      const r = await fetch(`https://api.openai.com/v1/videos/${submitted.id}`, {
        headers: { 'Authorization': `Bearer ${key}` },
      });
      if (!r.ok) throw new ProviderError('openai', model.id, 'poll', `HTTP ${r.status}`);
      const status = (await r.json()) as SoraStatusResponse;
      onProgress?.({
        type: 'progress',
        modelId: model.id,
        progress: status.progress ?? (status.status === 'in_progress' ? 0.5 : 0.1),
      });
      if (status.status === 'failed') {
        throw new ProviderError('openai', model.id, 'poll', status.error?.message ?? 'Generation failed');
      }
      if (status.status === 'completed') {
        videoUrl = status.url;
        break;
      }
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    }
    if (!videoUrl) {
      throw new ProviderError('openai', model.id, 'fetch', 'Timeout or no URL returned');
    }

    const t1 = performance.now();
    const completedAt = new Date().toISOString();
    const dur = Math.min(req.durationSec ?? 10, model.capabilities.maxDurationSec);
    const res = req.resolution ?? '720p';
    const rate = res === '1080p' ? (model.pricing.per1080pSec ?? 0) : (model.pricing.per720pSec ?? 0);

    onProgress?.({ type: 'completed', modelId: model.id, progress: 1 });

    return {
      videoUrl,
      durationSec: dur,
      resolution: res,
      modelId: model.id,
      provider: 'openai',
      startedAt,
      completedAt,
      costUsd: rate * dur,
      latencyMs: t1 - t0,
    };
  },
};
