
import { ContextProcessor } from './Processor';
import { Event, LongTermMemory, ExternalArtifactStore, WorkingContext, CurrentScope } from './interfaces';
import { KNOWLEDGE_LAYERS } from '../../data/knowledgeLayers';
import { useAppStore } from '../../store';
import { neuralVault } from '../persistenceService';
import { KnowledgeLayer } from '../../types';

/**
 * KnowledgeLayerProcessor: Dynamic Contextual Handshake
 * Asynchronously aggregates static and dynamic knowledge protocols 
 * based on active layer toggles.
 */
export class KnowledgeLayerProcessor implements ContextProcessor {
    name = 'KnowledgeLayerProcessor';

    async process(
        session: Event[],
        memoryStore: LongTermMemory,
        artifactStore: ExternalArtifactStore,
        scope: CurrentScope
    ): Promise<WorkingContext[]> {
        const state = useAppStore.getState();
        const activeLayerIds = state.knowledge.activeLayers || [];

        if (activeLayerIds.length === 0) return [];

        // Pre-fetch dynamic layers from the vault to combine with static layers
        const dynamicLayers = await neuralVault.getKnowledgeLayers();
        const allLayers: Record<string, KnowledgeLayer> = {
            ...KNOWLEDGE_LAYERS,
            ...Object.fromEntries(dynamicLayers.map(l => [l.id, l]))
        };

        const contextParts: WorkingContext[] = [];

        activeLayerIds.forEach((id: string) => {
            const layer = allLayers[id];
            if (layer) {
                // Inject specialized protocol into the model turn
                contextParts.push({
                    role: 'system', 
                    content: `[PROTOCOL_ENGAGED: ${layer.label.toUpperCase()}]\n${layer.systemInstruction.trim()}`
                });
            }
        });

        return contextParts;
    }
}
