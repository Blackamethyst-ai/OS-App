
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
    private baseUrl = 'http://localhost:11434/api';

    async isAvailable(): Promise<boolean> {
        try {
            // Quick list check
            const res = await fetch(`${this.baseUrl}/tags`, { method: 'GET' });
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
            console.error('Ollama Generation Failed:', e);
            throw e;
        }
    }
}

export const ollamaService = new OllamaService();
