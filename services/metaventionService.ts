import { modelRouter } from './modelRouter';
import { useAppStore } from '../store';
import { InterventionProtocol } from '../types';

export interface LayerAnalysis {
    integrity: number;
    threats: string[];
    opportunities: string[];
    timestamp: number;
}

const STRATA_PROMPTS: Record<string, string> = {
    'LAYER_DEPIN': "Analyze the physical decentralized infrastructure nodes. Focus on hardware latency, geographic distribution, and power consumption. Identify optimization vectors.",
    'LAYER_AI': "Analyze the strategic intelligence layer. Focus on model drift, inference costs, and decision coherence. Identify cognitive dissonance vectors.",
    'LAYER_FINANCE': "Analyze the economic capital flow. Focus on yield velocity, liquidity depth, and slippage events. Identify arbitrage vectors."
};

class MetaventionService {

    async analyzeLayer(layerId: string): Promise<LayerAnalysis> {
        const prompt = `${STRATA_PROMPTS[layerId] || "Analyze system entropy."} \n\nOutput strict JSON format: { "integrity": number (0-100), "threats": string[], "opportunities": string[] }`;

        try {
            const raw = await modelRouter.generateContent(prompt, { tier: 'powerful' });
            // Clean markdown code blocks if present
            const clean = raw.replace(/```json|```/g, '').trim();
            return JSON.parse(clean);
        } catch (e) {
            console.error("Metavention Analysis Failed:", e);
            return {
                integrity: 85.0,
                threats: ["Analysis link unstable", "Packet loss detected"],
                opportunities: ["Retry connection"],
                timestamp: Date.now()
            };
        }
    }

    async generateStrategy(layerId: string, context: string): Promise<InterventionProtocol> {
        const prompt = `Generate a specific Metavention Protocol for ${layerId}. Context: ${context}.
        
        Output strict JSON format matching InterventionProtocol interface:
        {
          "id": "generated-uuid",
          "title": "Protocol Title",
          "context": "Context description",
          "logic": "Strategic rationale",
          "steps": ["Actionable Step 1", "Actionable Step 2", "Actionable Step 3"],
          "physicalImpact": "Expected impact description",
          "timestamp": number
        }`;

        try {
            const raw = await modelRouter.generateContent(prompt, { tier: 'creative' });
            const clean = raw.replace(/```json|```/g, '').trim();
            const protocol = JSON.parse(clean);
            return { ...protocol, id: `proto-${Date.now()}` };
        } catch (e) {
            console.error("Strategy Generation Failed:", e);
            throw new Error("Failed to synthesize protocol.");
        }
    }
}

export const metaventionService = new MetaventionService();
