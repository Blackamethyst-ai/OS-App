
import { LongTermMemory } from './interfaces';
import { neuralVault } from '../persistenceService';

/**
 * SovereignMemory: The persistent long-term knowledge base.
 * Bridges the Context Compiler with the NeuralVault (IndexedDB).
 */
export class SovereignMemory implements LongTermMemory {
  
  /**
   * Stores a new memory into the Neural Vault (as a text artifact).
   */
  async store(key: string, data: string): Promise<void> {
    const file = new File([data], `${key}.txt`, { type: 'text/plain' });
    
    await neuralVault.saveArtifact(file, {
        classification: 'MEMORY_FRAGMENT',
        ambiguityScore: 0,
        entities: ['System Memory'],
        summary: data.substring(0, 50) + '...'
    });
    
    console.log(`[SovereignMemory] Encoded new memory trace: ${key}`);
  }

  /**
   * Queries the Neural Vault for relevant artifacts based on keyword matching.
   * acts as a "Naive RAG" system.
   */
  async query(searchText: string, limit: number): Promise<string[]> {
    const start = performance.now();
    const artifacts = await neuralVault.getArtifacts();
    const results: { score: number, content: string }[] = [];
    
    const searchTerms = searchText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    // Scan all artifacts (simulated vector search)
    for (const art of artifacts) {
        let score = 0;
        let content = "";

        // 1. Check Metadata
        if (art.name.toLowerCase().includes(searchText.toLowerCase())) score += 10;
        if (art.tags?.some(t => searchText.toLowerCase().includes(t.toLowerCase()))) score += 5;

        // 2. Check Content (if analysis exists)
        if (art.analysis?.summary) {
            const summaryLower = art.analysis.summary.toLowerCase();
            searchTerms.forEach(term => {
                if (summaryLower.includes(term)) score += 2;
            });
            content = `[ARTIFACT: ${art.name}] Summary: ${art.analysis.summary}`;
        } else {
            // Fallback for raw files
            content = `[ARTIFACT: ${art.name}] (Raw Data)`;
            if (art.name.toLowerCase().includes(searchText.toLowerCase())) score += 1;
        }

        if (score > 0) {
            results.push({ score, content });
        }
    }

    // Sort by relevance score
    results.sort((a, b) => b.score - a.score);
    
    console.debug(`[SovereignMemory] Query "${searchText}" took ${(performance.now() - start).toFixed(2)}ms. Found ${results.length} matches.`);

    return results.slice(0, limit).map(r => r.content);
  }
}
