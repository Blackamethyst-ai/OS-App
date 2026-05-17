// Cinema Studio — Google Vertex AI provider.
// Escape hatch for 1080p+ work and Veo-native vertical output.
//
// Vertex auth model is OAuth bearer token — typically minted by gcloud or a
// service account exchanger. We accept the token already-minted via creds.
// For browser use, route through a thin server-side proxy (not implemented
// here) to avoid shipping service account creds to the client.

import type { ModelCard, RenderRequest, RenderResult, ProgressCallback, ProviderCredentials } from '../types';
import { Provider, ProviderError, requireCred } from './base';

interface VeoOperationResponse {
  name: string;
  done?: boolean;
  response?: {
    videos?: Array<{ uri: string; gcsUri?: string }>;
  };
  error?: { code: number; message: string };
}

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 240;

function endpoint(project: string, location: string, modelEndpoint: string) {
  return `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${modelEndpoint}:predictLongRunning`;
}

export const vertexProvider: Provider = {
  key: 'vertex',
  supports(model) {
    return model.provider === 'vertex';
  },
  async render(model, req, creds, onProgress) {
    const project = requireCred(creds.vertexProject, 'vertex', model.id, 'vertex project ID');
    const location = creds.vertexLocation ?? 'us-central1';
    const token = requireCred(creds.vertexAccessToken, 'vertex', model.id, 'vertex OAuth bearer token');

    const startedAt = new Date().toISOString();
    const t0 = performance.now();
    onProgress?.({ type: 'started', modelId: model.id });

    const instances = [
      {
        prompt: req.prompt,
        ...(req.refImages?.[0]
          ? { image: { bytesBase64Encoded: undefined, gcsUri: req.refImages[0].url } }
          : {}),
        ...(req.refImages && req.refImages.length > 0
          ? { referenceImages: req.refImages.slice(0, 3).map(r => ({ gcsUri: r.url })) }
          : {}),
      },
    ];

    const parameters = {
      durationSeconds: Math.min(req.durationSec ?? 5, model.capabilities.maxDurationSec),
      aspectRatio: req.aspectRatio ?? '16:9',
      sampleCount: 1,
      generateAudio: req.generateAudio ?? model.capabilities.nativeAudio,
      resolution: req.resolution ?? '720p',
      ...(req.seed !== undefined ? { seed: req.seed } : {}),
    };

    const submit = await fetch(endpoint(project, location, model.endpoint), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ instances, parameters }),
    });
    if (!submit.ok) {
      const body = await submit.text().catch(() => '');
      throw new ProviderError('vertex', model.id, 'submit', `HTTP ${submit.status}: ${body.slice(0, 300)}`);
    }
    const op = (await submit.json()) as VeoOperationResponse;
    const operationName = op.name;
    onProgress?.({ type: 'queued', modelId: model.id, message: operationName });

    // Poll long-running operation
    let videoUri: string | undefined;
    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      const r = await fetch(
        `https://${location}-aiplatform.googleapis.com/v1/${operationName}`,
        { headers: { 'Authorization': `Bearer ${token}` } },
      );
      if (!r.ok) {
        throw new ProviderError('vertex', model.id, 'poll', `HTTP ${r.status}`);
      }
      const status = (await r.json()) as VeoOperationResponse;
      onProgress?.({
        type: status.done ? 'progress' : 'queued',
        modelId: model.id,
        progress: status.done ? 1 : 0.4,
      });
      if (status.error) {
        throw new ProviderError('vertex', model.id, 'poll', status.error.message);
      }
      if (status.done) {
        videoUri = status.response?.videos?.[0]?.uri ?? status.response?.videos?.[0]?.gcsUri;
        break;
      }
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    }
    if (!videoUri) {
      throw new ProviderError('vertex', model.id, 'fetch', 'Operation completed without video URI');
    }

    const t1 = performance.now();
    const completedAt = new Date().toISOString();
    const dur = Math.min(req.durationSec ?? 5, model.capabilities.maxDurationSec);
    const res = req.resolution ?? '720p';
    const rate = res === '1080p' ? (model.pricing.per1080pSec ?? 0) : (model.pricing.per720pSec ?? 0);

    onProgress?.({ type: 'completed', modelId: model.id, progress: 1 });

    return {
      videoUrl: videoUri,
      durationSec: dur,
      resolution: res,
      modelId: model.id,
      provider: 'vertex',
      startedAt,
      completedAt,
      costUsd: rate * dur,
      latencyMs: t1 - t0,
    };
  },
};
