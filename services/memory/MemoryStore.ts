import { LongTermMemory } from './interfaces';
import { neuralVault } from '../persistenceService';
import { generateEmbedding } from '../geminiService';

/**
 * SovereignMemory: The persistent long-term knowledge base.
 * Bridges the Context Compiler with the NeuralVault via Semantic Search.
 */
export class SovereignMemory implements LongTermMemory {
  
  /**
   * Encodes a new memory trace into the vault with a vector embedding.
   */
  async store(key: string, data: string): Promise<void> {
    const file = new File([data], `${key}.txt`, { type: 'text/plain' });
    
    const id = await neuralVault.saveArtifact(file, {
        classification: 'MEMORY_FRAGMENT',
        ambiguityScore: 0,
        entities: ['System Memory'],
        summary: (data || '').substring(0, 80) + '...'
    });

    const embedding = await generateEmbedding(data);
    if (embedding.length > 0) {
        await neuralVault.saveVector(id, embedding, { name: key });
    }
    
    console.log(`[SovereignMemory] Memory Trace Vectorized: ${key}`);
  }

  /**
   * Queries the Neural Vault using O(1) Vector Similarity for semantic recall.
   */
  async query(searchText: string, limit: number): Promise<string[]> {
    const start = performance.now();
    
    // Injection 1: Generate Embedding for the Search Term
    const queryVector = await generateEmbedding(searchText);
    if (queryVector.length === 0) return [];

    // Bypass linear scans: call searchVectors directly
    const vectorMatches = await neuralVault.searchVectors(queryVector, limit);
    if (vectorMatches.length === 0) return [];

    // Hydrate matches with artifact metadata
    const artifacts = await neuralVault.getArtifacts();
    const results = vectorMatches.map(match => {
        const art = artifacts.find(a => a.id === match.id);
        if (!art) return null;
        return `[ARTIFACT: ${art.name}] Summary: ${art.analysis?.summary || 'Raw fragment cached.'}`;
    }).filter(Boolean) as string[];
    
    console.debug(`[SovereignMemory] Semantic Recall for "${searchText}" took ${(performance.now() - start).toFixed(2)}ms.`);

    return results;
  }
}