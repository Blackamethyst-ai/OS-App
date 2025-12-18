
import { ContextProcessor } from './Processor';
import { Event, LongTermMemory, ExternalArtifactStore, WorkingContext, CurrentScope } from './interfaces';
import { KNOWLEDGE_LAYERS } from '../../data/knowledgeLayers';
import { useAppStore } from '../../store';

export class KnowledgeLayerProcessor implements ContextProcessor {
    name = 'KnowledgeLayerProcessor';

    async process(
        session: Event[],
        memoryStore: LongTermMemory,
        artifactStore: ExternalArtifactStore,
        scope: CurrentScope
    ): Promise<WorkingContext[]> {
        // Direct store access to get active layers from knowledge slice
        const state = useAppStore.getState();
        const activeLayerIds = state.knowledge.activeLayers || [];

        if (activeLayerIds.length === 0) return [];

        const contextParts: WorkingContext[] = [];

        activeLayerIds.forEach((id: string) => {
            const layer = KNOWLEDGE_LAYERS[id];
            if (layer) {
                // 1. Inject Persona/Instruction
                contextParts.push({
                    role: 'system', 
                    content: layer.systemInstruction
                });
                // Note: Memory tag injection would happen here in a future hardening phase
            }
        });

        return contextParts;
    }
}
