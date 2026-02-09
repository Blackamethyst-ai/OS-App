import { logger } from './logger';

export interface OllamaMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface OllamaResponse {
    model: string;
    created_at: string;
    message: {
        role: string;
        content: string;
    };
    done: boolean;
}

class OllamaService {
    private baseUrl = import.meta.env.VITE_OLLAMA_URL ? `${import.meta.env.VITE_OLLAMA_URL}/api` : 'http://localhost:11434/api';

    async isAvailable(): Promise<boolean> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            const res = await fetch(`${this.baseUrl}/tags`, { method: 'GET', signal: controller.signal });
            clearTimeout(timeoutId);
            return res.ok;
        } catch (e) {
            return false;
        }
    }

    async generateChatCompletion(
        messages: OllamaMessage[],
        model: string = 'llama3'
    ): Promise<string> {
        try {
            const response = await fetch(`${this.baseUrl}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    messages,
                    stream: false
                })
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Ollama Error: ${err}`);
            }

            const data: OllamaResponse = await response.json();
            return data.message.content;
        } catch (e) {
            logger.error('Ollama generation failed', e, 'OllamaService');
            throw e;
        }
    }
}

export const ollamaService = new OllamaService();
