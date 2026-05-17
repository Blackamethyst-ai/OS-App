// Cinema Studio — provider registry. Maps ModelCard.provider → adapter.

import type { ModelCard } from '../types';
import type { Provider } from './base';
import { falProvider } from './fal';
import { vertexProvider } from './vertex';
import { openaiProvider } from './openai';
import { runwayProvider } from './runway';

export { falProvider, vertexProvider, openaiProvider, runwayProvider };
export type { Provider } from './base';
export { ProviderError } from './base';

const PROVIDERS: Provider[] = [falProvider, vertexProvider, openaiProvider, runwayProvider];

export function findProvider(model: ModelCard): Provider {
  const p = PROVIDERS.find(p => p.supports(model));
  if (!p) throw new Error(`No provider registered for model ${model.id} (${model.provider})`);
  return p;
}
