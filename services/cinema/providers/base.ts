// Cinema Studio — provider interface contract.
// All providers (fal, vertex, openai, runway) implement Provider so the
// pipeline can swap them transparently via the router's fallback chain.

import type {
  ModelCard,
  RenderRequest,
  RenderResult,
  ProgressCallback,
  ProviderCredentials,
  ProviderKey,
} from '../types';

export interface Provider {
  key: ProviderKey;
  supports(model: ModelCard): boolean;
  render(
    model: ModelCard,
    req: RenderRequest,
    creds: ProviderCredentials,
    onProgress?: ProgressCallback,
  ): Promise<RenderResult>;
}

export class ProviderError extends Error {
  constructor(
    public providerKey: ProviderKey,
    public modelId: string,
    public stage: 'auth' | 'submit' | 'poll' | 'fetch' | 'parse',
    message: string,
    public cause?: unknown,
  ) {
    super(`[${providerKey}:${modelId}:${stage}] ${message}`);
    this.name = 'ProviderError';
  }
}

export function requireCred<T>(
  value: T | undefined,
  providerKey: ProviderKey,
  modelId: string,
  hint: string,
): T {
  if (value === undefined || value === null || value === '') {
    throw new ProviderError(
      providerKey,
      modelId,
      'auth',
      `Missing credential: ${hint}`,
    );
  }
  return value;
}
