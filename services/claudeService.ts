/**
 * CLAUDE SERVICE
 * Service for interacting with Anthropic's Claude API.
 * Handles authentication via apiKeyService and request formatting.
 */
import { apiKeyService } from './apiKeyService';
import { logger } from './logger';

export interface ClaudeTextContent {
    type: 'text';
    text: string;
}

export interface ClaudeImageContent {
    type: 'image';
    source: {
        type: 'base64';
        media_type: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
        data: string;
    };
}

export type ClaudeContentBlock = ClaudeTextContent | ClaudeImageContent;

export interface ClaudeMessage {
    role: 'user' | 'assistant';
    content: string | ClaudeContentBlock[];
}

export interface ClaudeResponse {
    content: Array<{ text: string }>;
    usage: {
        input_tokens: number;
        output_tokens: number;
    };
}

class ClaudeService {
    private baseUrl = 'https://api.anthropic.com/v1/messages';

    // Note: Since we are running client-side, we need to use a proxy or specific headers
    // Anthropic API doesn't support CORS for direct browser calls by default.
    // However, for this implementation we will assume a proxy or appropriately configured backend exists,
    // OR we can use the 'dangerously-allow-browser' header if the user understands the risk (keys exposed in network tab).
    // Given our secure storage implementation, we will try the direct approach but warn about CORS.

    /**
     * Generate content using Claude
     */
    async generateContent(
        messages: ClaudeMessage[],
        systemPrompt?: string,
        model: string = 'claude-3-5-sonnet-20240620'
    ): Promise<string> {
        const apiKey = apiKeyService.getKey('claude');

        if (!apiKey) {
            throw new Error('Claude API key not found. Please configure it in Settings.');
        }

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json',
                    'anthropic-dangerously-allow-browser': 'true' // Required for client-side usage
                },
                body: JSON.stringify({
                    model: model,
                    max_tokens: 4096,
                    messages: messages,
                    system: systemPrompt,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Claude API Error: ${response.status} - ${JSON.stringify(errorData)}`);
            }

            const data: ClaudeResponse = await response.json();

            // Extract text from the response
            if (data.content && data.content.length > 0) {
                return data.content[0].text;
            }

            return '';
        } catch (error) {
            logger.error('API request failed', error, 'Claude');
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
        model: string = 'claude-sonnet-4-20250514'
    ): Promise<string> {
        const apiKey = apiKeyService.getKey('claude');

        if (!apiKey) {
            throw new Error('Claude API key not found. Please configure it in Settings.');
        }

        const message: ClaudeMessage = {
            role: 'user',
            content: [
                {
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: mediaType,
                        data: imageBase64,
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
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json',
                    'anthropic-dangerously-allow-browser': 'true',
                },
                body: JSON.stringify({
                    model: model,
                    max_tokens: 1024,
                    messages: [message],
                    temperature: 0.3, // Lower temperature for structured output
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Claude Vision API Error: ${response.status} - ${JSON.stringify(errorData)}`);
            }

            const data: ClaudeResponse = await response.json();

            if (data.content && data.content.length > 0) {
                return data.content[0].text;
            }

            return '';
        } catch (error) {
            logger.error('Vision API request failed', error, 'Claude');
            throw error;
        }
    }

    /**
     * Check if Claude is configured
     */
    isConfigured(): boolean {
        return !!apiKeyService.getKey('claude');
    }
}

export const claudeService = new ClaudeService();
