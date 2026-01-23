/**
 * Voice Nexus - Basic Usage Example
 *
 * This example shows how to set up Voice Nexus with real providers.
 *
 * Prerequisites:
 * - npm install @metaventionsai/voice-nexus @google/genai
 * - Set GOOGLE_GENERATIVE_AI_API_KEY environment variable
 * - Set ELEVENLABS_API_KEY for premium TTS (optional)
 *
 * Note: STT and browser TTS only work in browser environments.
 */

import { createVoiceNexus } from '@metaventionsai/voice-nexus';
import { createGeminiReasoning } from '@metaventionsai/voice-nexus/providers/reasoning/google';
import { createElevenLabsTTS } from '@metaventionsai/voice-nexus/providers/tts/elevenlabs';

async function main() {
    // Create providers
    const reasoning = createGeminiReasoning();
    const tts = createElevenLabsTTS();

    console.log('Gemini configured:', reasoning.isAvailable());
    console.log('ElevenLabs configured:', tts.isAvailable());

    // Create Voice Nexus instance
    const nexus = createVoiceNexus({
        config: {
            mode: 'turn-based',
            knowledgeInjection: false,
            providers: {
                reasoning,
                tts
            }
        },
        events: {
            onTranscriptUpdate: (t) => {
                console.log(`[${t.role}] ${t.text}`);
            },
            onComplexityAnalyzed: (c) => {
                console.log(`Complexity: ${c.score.toFixed(2)} -> ${c.tier} tier`);
            },
            onProcessingStart: () => console.log('Processing...'),
            onProcessingEnd: () => console.log('Done.'),
            onError: (e) => console.error('Error:', e.message)
        }
    });

    // Process a text input
    console.log('\n--- Processing text input ---');
    const response = await nexus.processTextInput(
        'What are the key principles of good API design?'
    );

    if (response) {
        console.log('\nResponse:', response.text);
        console.log('Model:', response.model);
        console.log('Latency:', response.latencyMs, 'ms');
    }
}

main().catch(console.error);
