/**
 * OPENAI SERVICE
 * Service for interacting with OpenAI's API (GPT-4, GPT-4o, etc.)
 * Handles authentication via apiKeyService and request formatting.
 */
import { apiKeyService } from './apiKeyService';

export interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | OpenAIContentPart[];
}

export interface OpenAITextContent {
    type: 'text';
    text: string;
}

export interface OpenAIImageContent {
    type: 'image_url';
    image_url: {
        url: string;
        detail?: 'auto' | 'low' | 'high';
    };
}

export type OpenAIContentPart = OpenAITextContent | OpenAIImageContent;

export interface OpenAIResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

class OpenAIService {
    private baseUrl = 'https://api.openai.com/v1/chat/completions';

    /**
     * Generate content using OpenAI GPT models
     */
    async generateContent(
        messages: OpenAIMessage[],
        systemPrompt?: string,
        model: string = 'gpt-4o'
    ): Promise<string> {
        const apiKey = apiKeyService.getKey('openai');

        if (!apiKey) {
            throw new Error('OpenAI API key not found. Please configure it in Settings.');
        }

        // Prepend system message if provided
        const allMessages: OpenAIMessage[] = systemPrompt
            ? [{ role: 'system', content: systemPrompt }, ...messages]
            : messages;

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: model,
                    messages: allMessages,
                    max_tokens: 4096,
                    temperature: 0.7,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`OpenAI API Error: ${response.status} - ${JSON.stringify(errorData)}`);
            }

            const data: OpenAIResponse = await response.json();

            if (data.choices && data.choices.length > 0) {
                return data.choices[0].message.content;
            }

            return '';
        } catch (error) {
            console.error('OpenAI API request failed:', error);
            throw error;
        }
    }

    /**
     * Generate content with vision (image analysis)
     */
    async generateVision(
        prompt: string,
        imageBase64: string,
        mediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' = 'image/png',
        model: string = 'gpt-4o'
    ): Promise<string> {
        const apiKey = apiKeyService.getKey('openai');

        if (!apiKey) {
            throw new Error('OpenAI API key not found. Please configure it in Settings.');
        }

        const message: OpenAIMessage = {
            role: 'user',
            content: [
                {
                    type: 'image_url',
                    image_url: {
                        url: `data:${mediaType};base64,${imageBase64}`,
                        detail: 'auto',
                    },
                },
                {
                    type: 'text',
                    text: prompt,
                },
            ],
        };

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: model,
                    messages: [message],
                    max_tokens: 1024,
                    temperature: 0.3,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`OpenAI Vision API Error: ${response.status} - ${JSON.stringify(errorData)}`);
            }

            const data: OpenAIResponse = await response.json();

            if (data.choices && data.choices.length > 0) {
                return data.choices[0].message.content;
            }

            return '';
        } catch (error) {
            console.error('OpenAI Vision API request failed:', error);
            throw error;
        }
    }

    /**
     * Generate streaming content
     */
    async *generateStream(
        messages: OpenAIMessage[],
        systemPrompt?: string,
        model: string = 'gpt-4o'
    ): AsyncGenerator<string, void, unknown> {
        const apiKey = apiKeyService.getKey('openai');

        if (!apiKey) {
            throw new Error('OpenAI API key not found. Please configure it in Settings.');
        }

        const allMessages: OpenAIMessage[] = systemPrompt
            ? [{ role: 'system', content: systemPrompt }, ...messages]
            : messages;

        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                messages: allMessages,
                max_tokens: 4096,
                temperature: 0.7,
                stream: true,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`OpenAI API Error: ${response.status} - ${JSON.stringify(errorData)}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') return;

                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices?.[0]?.delta?.content;
                        if (content) {
                            yield content;
                        }
                    } catch {
                        // Ignore parsing errors for partial JSON
                    }
                }
            }
        }
    }

    /**
     * Check if OpenAI is configured
     */
    isConfigured(): boolean {
        return !!apiKeyService.getKey('openai');
    }
}

export const openaiService = new OpenAIService();
