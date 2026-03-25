import { apiKeyService } from './apiKeyService';
import { logger } from './logger';
import { MODEL_REGISTRY } from './modelRegistry';

export interface GrokMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

class GrokService {
    private baseUrl = 'https://api.x.ai/v1/chat/completions';

    /**
     * Generates content using xAI's Grok model
     */
    async generateContent(
        messages: GrokMessage[],
        systemPrompt?: string,
        model: string = MODEL_REGISTRY.grok.fast
    ): Promise<string> {
        const apiKey = apiKeyService.getKey('grok');

        if (!apiKey) {
            throw new Error('Grok API key not found. Please configure it in Settings.');
        }

        // Prepend system prompt if provided
        const finalMessages = systemPrompt
            ? [{ role: 'system', content: systemPrompt }, ...messages]
            : messages;

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: finalMessages,
                    model: model,
                    stream: false,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Grok API Error (${response.status}): ${errorData}`);
            }

            const data = await response.json();
            return data.choices?.[0]?.message?.content || "";

        } catch (error) {
            logger.error('Grok API request failed', error, 'GrokService');
            throw error;
        }
    }
}

export const grokService = new GrokService();
