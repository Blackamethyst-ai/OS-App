/**
 * CPB Core - Auto Provider Detection Example
 *
 * This example shows how to automatically detect and use available providers.
 */

import { createCPB } from '@metaventionsai/cpb-core';
import { createDefaultProviders } from '@metaventionsai/cpb-core/providers';

async function main() {
    // Automatically create providers based on available API keys
    const providers = createDefaultProviders();

    console.log('Detected providers:');
    console.log('  Fast:', providers.fast?.name || 'none');
    console.log('  Balanced:', providers.balanced?.name || 'none');
    console.log('  Deep:', providers.deep?.name || 'none');

    if (!providers.fast && !providers.balanced && !providers.deep) {
        console.error('\nNo providers configured. Set at least one API key:');
        console.error('  ANTHROPIC_API_KEY');
        console.error('  GOOGLE_GENERATIVE_AI_API_KEY');
        console.error('  XAI_API_KEY');
        process.exit(1);
    }

    // Create CPB with detected providers
    const cpb = createCPB(providers);

    // Execute a query
    const result = await cpb.execute({
        query: 'Explain the CAP theorem in distributed systems'
    });

    console.log('\nResult:');
    console.log(result.output);
    console.log('\nMetadata:');
    console.log('  Path:', result.path);
    console.log('  DQ Score:', result.dqScore.overall);
}

main().catch(console.error);
