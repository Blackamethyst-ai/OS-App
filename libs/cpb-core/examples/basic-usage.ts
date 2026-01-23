/**
 * CPB Core - Basic Usage Example
 *
 * This example shows how to set up and use CPB with real providers.
 *
 * Prerequisites:
 * - npm install @metaventionsai/cpb-core @anthropic-ai/sdk @google/genai
 * - Set ANTHROPIC_API_KEY and GOOGLE_GENERATIVE_AI_API_KEY environment variables
 */

import { createCPB } from '@metaventionsai/cpb-core';
import { createClaudeProvider } from '@metaventionsai/cpb-core/providers/anthropic';
import { createGeminiProvider } from '@metaventionsai/cpb-core/providers/google';

async function main() {
    // Create providers
    const gemini = createGeminiProvider();
    const claude = createClaudeProvider();

    // Check which providers are configured
    console.log('Gemini configured:', gemini.isConfigured());
    console.log('Claude configured:', claude.isConfigured());

    // Create CPB instance with tiered providers
    const cpb = createCPB({
        fast: gemini,      // Gemini Flash for quick queries
        balanced: gemini,  // Gemini Pro for standard queries
        deep: claude       // Claude Sonnet for complex reasoning
    });

    // Simple query - will use fast path
    console.log('\n--- Simple Query ---');
    const simple = await cpb.execute(
        { query: 'What is 2 + 2?' },
        (status) => console.log(`  ${status.phase}: ${status.progress}%`)
    );
    console.log('Answer:', simple.output);
    console.log('Path:', simple.path);
    console.log('DQ Score:', simple.dqScore.overall);

    // Complex query - will use deeper path
    console.log('\n--- Complex Query ---');
    const complex = await cpb.execute(
        {
            query: 'Design a rate limiting system for a high-traffic API. Consider distributed scenarios.',
            qualityTarget: 0.8
        },
        (status) => console.log(`  ${status.phase}: ${status.progress}%`)
    );
    console.log('Answer:', complex.output.slice(0, 500) + '...');
    console.log('Path:', complex.path);
    console.log('DQ Score:', complex.dqScore.overall);
    console.log('Execution time:', complex.executionTimeMs, 'ms');
}

main().catch(console.error);
