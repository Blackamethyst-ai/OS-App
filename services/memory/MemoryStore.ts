import { LongTermMemory } from './interfaces';
import { neuralVault } from '../persistenceService';
import { generateEmbedding } from '../geminiService';

/**
 * SovereignMemory: High-performance semantic recall core.
 * Leverages vector embeddings for O(1) knowledge retrieval.
 */
export class SovereignMemory implements LongTermMemory {
  
  /**
   * Stores a new memory trace with vector orientation.
   */
  async store(key: string, data: string): Promise<void> {
    // 1. Persist as physical artifact
    const artifactId = await neuralVault.saveArtifact(new Blob([data], { type: 'text/plain' }), {
        classification: 'MEMORY_FRAGMENT',
        ambiguityScore: 0,
        entities: ['System Memory'],
        summary: data.slice(0, 100) + '...'
    });

    // 2. Vectorize for semantic search
    const embedding = await generateEmbedding(data);
    if (embedding.length > 0) {
        await neuralVault.saveVector(artifactId, embedding, { key });
    }
    
    console.debug(`[SovereignMemory] Traceized fragment: ${key}`);
  }

  /**
   * Recalls relevant memories via Vector Similarity.
   */
  async query(searchText: string, limit: number): Promise<string[]> {
    const start = performance.now();
    
    // 1. Vectorize query intent
    const queryVector = await generateEmbedding(searchText);
    if (queryVector.length === 0) return [];

    // 2. Semantic search in Neural Vault
    const matches = await neuralVault.searchVectors(queryVector, limit);
    if (matches.length === 0) return [];

    // 3. Hydrate results from artifact store
    const results = await Promise.all(matches.map(async match => {
        const art = await neuralVault.getArtifact(match.id);
        if (!art) return null;
        const text = await art.data.text();
        return `[RECALL_${Math.round(match.score * 100)}%] ${text}`;
    }));

    console.debug(`[SovereignMemory] Vector Recall took ${(performance.now() - start).toFixed(2)}ms`);
    return results.filter((r): r is string => r !== null);
  }
}