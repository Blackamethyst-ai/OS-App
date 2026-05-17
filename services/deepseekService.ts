/**
 * DEEPSEEK SERVICE
 *
 * Primary LLM provider as of 2026-05. OpenAI-compatible chat completions.
 * Docs: https://api-docs.deepseek.com/
 *
 * Model alias: `DeepSeekMetaventionsAI` -> `deepseek-v4-pro` on the wire.
 * Use `deepseek-v4-flash` for low-latency / cheap calls.
 */

import { apiKeyService } from './apiKeyService';
import { logger } from './logger';

const DEFAULT_BASE_URL = 'https://api.deepseek.com';

export type DeepSeekModelAlias = 'DeepSeekMetaventionsAI' | 'deepseek-v4-pro' | 'deepseek-v4-flash';

const ALIAS_MAP: Record<string, string> = {
  DeepSeekMetaventionsAI: 'deepseek-v4-pro',
};

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepSeekChatOptions {
  model?: DeepSeekModelAlias | string;
  temperature?: number;
  maxTokens?: number;
  stream?: false;
}

export interface DeepSeekChatResponse {
  content: string;
  reasoning?: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  finishReason: string;
}

function resolveModel(alias?: string): string {
  if (!alias) return 'deepseek-v4-pro';
  return ALIAS_MAP[alias] ?? alias;
}

function getBaseUrl(): string {
  return import.meta.env.VITE_DEEPSEEK_BASE_URL || DEFAULT_BASE_URL;
}

export function hasDeepSeekKey(): boolean {
  return !!apiKeyService.getKey('deepseek');
}

export async function deepseekChat(
  messages: DeepSeekMessage[],
  options: DeepSeekChatOptions = {}
): Promise<DeepSeekChatResponse> {
  const apiKey = apiKeyService.getKey('deepseek');
  if (!apiKey) {
    throw new Error('DeepSeek API key not configured. Set VITE_DEEPSEEK_API_KEY or store in vault.');
  }

  const model = resolveModel(options.model);
  const url = `${getBaseUrl()}/chat/completions`;

  // DeepSeek V4 models burn tokens on chain-of-thought reasoning before
  // emitting any content. Default budget must leave room for both.
  const body = {
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 8192,
    stream: false,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.error(`DeepSeek API error ${res.status}: ${text}`, undefined, 'DeepSeekService');
    throw new Error(`DeepSeek API error ${res.status}: ${text || res.statusText}`);
  }

  const data: any = await res.json();
  const choice = data.choices?.[0];
  const message = choice?.message ?? {};

  // Reasoning models split chain-of-thought into `reasoning_content`. Surface
  // it separately so callers can ignore or display it; deepseekGenerate falls
  // back to it when `content` came back empty (truncated by max_tokens).
  return {
    content: message.content ?? '',
    reasoning: message.reasoning_content,
    model: data.model ?? model,
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
    finishReason: choice?.finish_reason ?? 'stop',
  };
}

export async function deepseekGenerate(
  prompt: string,
  systemInstruction?: string,
  options: DeepSeekChatOptions = {}
): Promise<string> {
  const messages: DeepSeekMessage[] = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
  messages.push({ role: 'user', content: prompt });
  const response = await deepseekChat(messages, options);
  // Truncated reasoning calls leave `content` empty; surface reasoning so
  // the caller still gets something instead of "".
  return response.content || response.reasoning || '';
}
