import { GoogleGenAI, Type, Schema, FunctionDeclaration, Blob as GenAIBlob, LiveServerMessage, Modality, GenerateContentResponse } from "@google/genai";
import { 
    AppMode, FileData, SuggestedAction, AspectRatio, ImageSize, AnalysisResult, 
    ArtifactAnalysis, BookDNA, FactChunk, ScienceHypothesis, KnowledgeNode, 
    UserIntent, SyntheticPersona, SwarmStatus, AtomicTask, SwarmResult, VoteLedger, SearchResultItem,
    ResonancePoint, Colorway, Message, HardwareTier, ComponentRecommendation, EconomicProtocol
} from '../types';

export type HiveAgent = {
    id: string;
    name: string;
    role: string;
    voice: string;
    systemPrompt: string;
    weights: { logic: number; skepticism: number; creativity: number; empathy: number };
};

export const PERSONA_ROLES = ['SKEPTIC', 'VISIONARY', 'PRAGMATIST', 'OPERATOR'];

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function retryGeminiRequest<T>(
    operation: () => Promise<T>, 
    retries: number = 3, 
    baseDelay: number = 2000
): Promise<T> {
    try {
        return await operation();
    } catch (error: any) {
        const status = error.status || error.response?.status || error.statusCode;
        const msg = error.message?.toLowerCase() || '';
        const isRetryable = status === 503 || status === 429 || status === 500 || 
                            msg.includes('unavailable') || msg.includes('overloaded');
        if (retries > 0 && isRetryable) {
            await new Promise(resolve => setTimeout(resolve, baseDelay));
            return retryGeminiRequest(operation, retries - 1, baseDelay * 2); 
        }
        throw error;
    }
}

export async function promptSelectKey(): Promise<void> {
    if (window.aistudio?.openSelectKey) await window.aistudio.clearApiKeySelection(); // Reset if error occurs
    if (window.aistudio?.openSelectKey) await window.aistudio.openSelectKey();
}

export async function fileToGenerativePart(file: File): Promise<FileData> {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return { inlineData: { data: await base64EncodedDataPromise, mimeType: file.type }, name: file.name };
}

export const HIVE_AGENTS: Record<string, HiveAgent> = {
    'Puck': { id: 'Puck', name: 'Puck', role: 'Visionary Strategy Architect', voice: 'Puck', systemPrompt: 'You are Puck, a visionary strategist.', weights: { logic: 0.6, skepticism: 0.2, creativity: 0.9, empathy: 0.7 } },
    'Charon': { id: 'Charon', name: 'Charon', role: 'Skeptical Systems Analyst', voice: 'Charon', systemPrompt: 'You are Charon, a deeply skeptical analyst.', weights: { logic: 0.9, skepticism: 0.9, creativity: 0.3, empathy: 0.2 } },
    'Fenrir': { id: 'Fenrir', name: 'Fenrir', role: 'Pragmatic Execution Lead', voice: 'Fenrir', systemPrompt: 'You are Fenrir, a pragmatist.', weights: { logic: 0.8, skepticism: 0.5, creativity: 0.4, empathy: 0.4 } }
};

export function constructHiveContext(agentId: string, additionalContext: string): string {
    const agent = HIVE_AGENTS[agentId] || HIVE_AGENTS['Puck'];
    return `${agent.systemPrompt}\n\nSESSION CONTEXT:\n${additionalContext}`;
}

export async function interpretIntent(input: string): Promise<UserIntent> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Interpret intent: "${input}". Return JSON {action, target, reasoning}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "{}");
}

export async function predictNextActions(mode: AppMode, context: any, lastLog?: string): Promise<SuggestedAction[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Predict 3 next actions for mode ${mode}. Context: ${JSON.stringify(context)}. Return JSON array.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "[]");
}

export async function generateArchitectureImage(prompt: string, aspectRatio: AspectRatio, size: ImageSize, reference?: FileData): Promise<string> {
    const ai = getAI();
    const parts: any[] = [{ text: prompt }];
    if (reference) parts.unshift(reference);
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: { imageConfig: { aspectRatio, imageSize: size } }
    }));
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("Generation failed");
}

export async function analyzeImageVision(file: FileData): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [
                file,
                { text: "Analyze this image in extreme technical detail. Identify objects, lighting physics, artistic style, and potential narrative context. Format as a technical briefing with headings." }
            ]
        }
    }));
    return response.text || "Analysis failed.";
}

export async function analyzePowerDynamics(input: string): Promise<AnalysisResult> {
  const ai = getAI();
  const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Perform a deep sovereign diagnostic on the system: "${input}". 
      
      Requirements:
      1. Core Trinity: Sustainer (growth logic), Extractor (yield logic), Destroyer (entropic threat).
      2. High-Fidelity Scores (0-100): centralization, entropy, vitality, opacity, adaptability.
      3. Precise Attack Vectors: At least 3 specific, unique mechanisms of control and their corresponding vulnerabilities. 
      4. Sovereign Insight: A master-level strategic synthesis.
      
      Return valid JSON matching the specified schema.`,
      config: { 
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scores: {
              type: Type.OBJECT,
              properties: {
                centralization: { type: Type.NUMBER },
                entropy: { type: Type.NUMBER },
                vitality: { type: Type.NUMBER },
                opacity: { type: Type.NUMBER },
                adaptability: { type: Type.NUMBER }
              }
            },
            sustainer: { type: Type.STRING },
            extractor: { type: Type.STRING },
            destroyer: { type: Type.STRING },
            vectors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  mechanism: { type: Type.STRING, description: "Technical control protocol name" },
                  vulnerability: { type: Type.STRING, description: "Detailed logic flaw description" },
                  severity: { type: Type.STRING, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] }
                }
              }
            },
            insight: { type: Type.STRING }
          }
        }
      }
  }));
  return JSON.parse(response.text || "{}");
}

export async function refractStrategy(strategy: any, layers: string[]): Promise<any[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Refract this strategy: ${JSON.stringify(strategy)} through these prisms: ${layers.join(', ')}. Return JSON array of {layerId, refraction, delta_impact}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "[]");
}

export async function runStrategicStressTest(metavention: any, sensingMatrix: any): Promise<any> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `STRESS TEST directive: ${JSON.stringify(metavention)}. SENSING MATRIX: ${JSON.stringify(sensingMatrix)}. Identify 3 critical vulnerabilities, 1 Black Swan event, and a mitigation protocol. Return as JSON.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "{}");
}

export async function synthesizeEconomicDirective(context: any): Promise<Partial<EconomicProtocol>> {
    const ai = getAI();
    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            budget: { type: Type.STRING },
            action: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['LIQUIDITY', 'DEPIN_PAYMENT', 'COMPUTE_LEASE', 'TREASURY', 'PHYSICAL_SERVICE'] }
        },
        required: ['title', 'budget', 'action', 'type']
    };
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate an autonomous economic directive for an AI agent. 
        Context: ${JSON.stringify(context)}. 
        Include capability to pay for physical services (maintenance, delivery, data center ops).
        Role: Agentic Finance Layer. Output JSON.`,
        config: { responseMimeType: 'application/json', responseSchema: schema }
    }));
    return JSON.parse(response.text || "{}");
}

export async function analyzeBookDNA(file: FileData): Promise<BookDNA> {
  const ai = getAI();
  const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [file, { text: "Extract Book DNA: Return JSON {title, author, systemPrompt, axioms:[], kernelIdentity:{designation, primeDirective}}" }] },
      config: { responseMimeType: 'application/json' }
  }));
  return JSON.parse(response.text || "{}");
}

export async function performGlobalSearch(query: string): Promise<SearchResultItem[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: query,
        config: {
            tools: [{ googleSearch: {} }]
        }
    }));
    return [{ id: 'search-1', type: 'WEB', title: 'Search Result', description: response.text || "" }];
}

export async function smartOrganizeArtifact(file: FileData): Promise<any> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [file, { text: "Organize artifact: Return JSON {name, tags:[]}" }] },
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "{}");
}

export async function generateTaxonomy(items: string[]): Promise<any[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Taxonomy for: ${items.join(',')}. Return JSON array of {category, items:[]}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "[]");
}

export async function applyWorkflowToArtifacts(files: any[], workflow: any): Promise<any[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Apply workflow ${JSON.stringify(workflow)} to files ${JSON.stringify(files)}. Return JSON array of {id, newName, tags:[], path}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "[]");
}

export async function generateAvatar(role: string, name: string): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: `Cybernetic avatar for ${role} ${name}.`
    }));
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("Avatar failed");
}

export async function transformArtifact(content: any, type: string, instruction: string): Promise<any> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `${instruction}\n\nContent: ${content}`
    }));
    return response.text || "";
}

export async function executeNeuralPolicy(mode: AppMode, context: any, logs: string[]): Promise<any> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Neural policy for ${mode}. Context: ${JSON.stringify(context)}. Return JSON {message, level, suggestedPatch:{code, explanation}}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "{}");
}

export async function generateMermaidDiagram(governance: string, files: FileData[], context: any[]): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts: [...files, { text: `Diagram for governance: ${governance}. Context: ${JSON.stringify(context)}` }] }
    }));
    return response.text || "";
}

export async function repairMermaidSyntax(code: string, error: string): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Fix Mermaid syntax. Error: ${error}. Code:\n${code}`
    }));
    return response.text?.replace(/```mermaid\n|```/g, '').trim() || code;
}

export async function generateAutopoieticFramework(file: FileData, governance: string): Promise<any> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts: [file, { text: `Autopoietic framework for: ${governance}` }] },
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "{}");
}

export async function generateStructuredWorkflow(files: FileData[], governance: string, type: string, mapContext?: any): Promise<any> {
    const ai = getAI();
    
    let domainSpecificPrompt = `Workflow ${type} for governance ${governance}. Map context: ${JSON.stringify(mapContext)}.`;
    
    if (type === 'DRIVE_ORGANIZATION') {
        domainSpecificPrompt = `Generate a high-fidelity Drive Organization and File Management Workflow. 
        Focus on naming conventions (e.g., date-prefixed or client-prefixed), hierarchical nesting using the PARA method (Projects, Areas, Resources, Archives), automated tagging logic for metadata, and explicit archival triggers.
        The user governance is: ${governance}.
        Return JSON {protocols:[{step, action, role, tool, description, priority}], taxonomy:{root:[{folder, subfolders:[], tags:[]}]}}.`;
    } else if (type === 'SYSTEM_ARCHITECTURE') {
        domainSpecificPrompt = `Generate a structured System and Architectural Process for high-availability distributed systems. 
        Focus on CI/CD pipeline automation, horizontal scaling thresholds, multi-region failover sequences, and automated security attestation loops.
        The system governance is: ${governance}.
        Return JSON {protocols:[{step, action, role, tool, description, priority}], metrics:[{key, alertThreshold, recoveryAction}]}.`;
    } else {
        domainSpecificPrompt += ` Return JSON {protocols:[{step, action, role, tool, description, priority}]}.`;
    }

    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [...files, { text: domainSpecificPrompt }] },
        config: { responseMimeType: 'application/json' }
      }));
      return JSON.parse(response.text || "{}");
}

export async function generateSystemArchitecture(prompt: string): Promise<any> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Blueprint: ${prompt}. Return JSON {nodes:[{id, label, subtext, iconName, color}], edges:[{id, source, target, label}]}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "{}");
}

export async function decomposeNode(label: string, neighbors: string): Promise<any> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Decompose "${label}" given neighbors ${neighbors}. Identify potential sub-components and architectural optimizations. Return JSON {nodes:[], edges:[], optimizations:[{id, title, impact}]}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "{}");
}

export async function generateSingleNode(description: string): Promise<any> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate logic node for: "${description}". Return JSON {label, subtext, iconName, color}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "{}");
}

export async function generateInfrastructureCode(summary: string, pointer: string): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Generate ${pointer} code for: ${summary}`
    }));
    return response.text || "";
}

export async function generateHypotheses(facts: string[]): Promise<ScienceHypothesis[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Hypotheses for facts: ${facts.join(',')}. Return JSON array of {statement, confidence}.`,
        config: { responseMimeType: 'application/json' }
    }));
    const data = JSON.parse(response.text || "[]");
    return data.map((h: any) => ({ ...h, id: crypto.randomUUID(), status: 'PROPOSED' }));
}

export async function simulateExperiment(hypothesis: ScienceHypothesis, facts: string): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Simulate experiment for: "${hypothesis.statement}" using facts: ${facts}`
    }));
    return response.text || "Result unavailable.";
}

export async function generateTheory(hypotheses: ScienceHypothesis[]): Promise<string> {
    const ai = getAI();
    const facts = hypotheses.filter(h => h.status === 'VALIDATED').map(h => h.statement).join(',');
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Synthesize theory from: ${facts}`
    }));
    return response.text || "";
}

export async function crystallizeKnowledge(nodes: KnowledgeNode[]): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Crystallize knowledge from: ${JSON.stringify(nodes)}`
    }));
    return response.text || "";
}

export async function synthesizeNodes(nodeA: KnowledgeNode, nodeB: KnowledgeNode): Promise<KnowledgeNode> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Synthesize bridge between "${nodeA.label}" and "${nodeB.label}". Return JSON {label, type:'BRIDGE'}.`,
        config: { responseMimeType: 'application/json' }
    }));
    const data = JSON.parse(response.text || "{}");
    return { ...data, id: crypto.randomUUID(), strength: 0.8, connections: [nodeA.id, nodeB.id] };
}

export async function generateStoryboardPlan(context: any, frameCount: number): Promise<any[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Storyboard plan for ${frameCount} frames: ${JSON.stringify(context)}. Return JSON array of {scenePrompt, continuity, camera, lighting, audio_cue}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "[]");
}

export async function constructCinematicPrompt(basePrompt: string, colorway: Colorway, hasStyleRefs: boolean, resonance?: any, stylePreset?: string, camera?: string, lighting?: string): Promise<string> {
    let styleKeywords = "";
    switch(stylePreset) {
        case 'CYBER_NOIR': styleKeywords = "Cyberpunk aesthetic, moody rain-slicked neon streets, heavy film grain, deep shadows, high-contrast anamorphic lighting."; break;
        case 'CINEMATIC_REALISM': styleKeywords = "Ultra-realistic, 8K resolution, shot on 35mm IMAX, crisp focus, natural lighting, intricate textures, photorealistic skin and materials."; break;
        case 'ETHEREAL_SOLARPUNK': styleKeywords = "Sustainable biomimetic architecture, lush integrated greenery, soft warm golden hour glow, utopian atmosphere, clean glass and white composite surfaces."; break;
        case 'ANALOG_HORROR': styleKeywords = "Lo-fi VHS aesthetic, chromatic aberration, glitched video artifacts, liminal space vibes, unsettling lighting, 4:3 aspect ratio artifacts."; break;
        case 'STUDIO_GHIBLI': styleKeywords = "Ghibli-style hand-painted art, vibrant pastel color palette, cel-shaded characters, whimsical background details, soft painterly textures."; break;
        case 'GRITTY_REALISM': styleKeywords = "Tactical realism, muted earth tones, handheld camera motion blur, harsh overcast lighting, raw and unpolished documentary aesthetic."; break;
        default: styleKeywords = "Cinematic 8K render, professional color grading, high detail.";
    }

    return `
    CHARACTER CONSISTENCY (LEAD ACTOR LOCK):
    Provided reference images define the primary actor. Maintain facial features and physical build strictly.

    VISUAL STYLE INTEGRITY:
    ${hasStyleRefs ? "Synthesize style reference images with the preset." : ""}
    Preset Mode: ${stylePreset}. 
    Specific Visual Directives: ${styleKeywords}
    Color scheme: ${colorway.label}. Primarily utilizing ${colorway.baseSurfaces} with ${colorway.uiAccentPrimary} and ${colorway.uiAccentSecondary} highlights.

    SCENE DIRECTIVE:
    ${basePrompt}

    CINEMATOGRAPHY:
    Camera Viewport: ${camera || 'Standard cinematic medium shot'}
    Lighting Engine: ${lighting || 'Dramatic lighting with depth'}
    ${resonance ? `Emotional Tension Intensity: ${resonance.tension / 100}, Visual Dynamics: ${resonance.dynamics / 100}` : ""}

    TECHNICAL SPECS:
    8K resolution, cinematic composition.
    `.trim();
}

/**
 * Generates an expanded narrative and an emotional resonance curve based on a prompt and optional vision analysis.
 * Used for autonomic expansion in the Cinematic Asset Studio.
 */
export async function generateNarrativeContext(prompt: string, visionAnalysis: string): Promise<{ narrative: string, resonance: ResonancePoint[] }> {
    const ai = getAI();
    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            narrative: { type: Type.STRING, description: "An expanded narrative storyboard prompt." },
            resonance: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        frame: { type: Type.NUMBER },
                        tension: { type: Type.NUMBER, description: "0-100 score for emotional tension." },
                        dynamics: { type: Type.NUMBER, description: "0-100 score for visual dynamics." }
                    },
                    required: ['frame', 'tension', 'dynamics']
                },
                minItems: 10,
                maxItems: 10
            }
        },
        required: ['narrative', 'resonance']
    };

    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Based on this prompt: "${prompt}" and this vision analysis: "${visionAnalysis}", generate an expanded narrative and a 10-point emotional resonance curve.`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    }));

    return JSON.parse(response.text || "{}");
}

export async function generateAudioOverview(files: FileData[]): Promise<{ audioData: string; transcript: string }> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [...files, { text: "Summarize briefing." }] }],
        config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { voiceName: 'Zephyr' as any } } }
    }));
    return { audioData: response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "", transcript: response.text || "" };
}

export async function generateSpeech(text: string, voiceName: string): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text }] }],
        config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { voiceName: voiceName as any } } }
    }));
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
}

export async function validateSyntax(code: string, language: string): Promise<{ line: number; message: string }[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Validate ${language} code. Return JSON array of {line, message}. Code:\n${code}`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "[]");
}

export async function generateCodeSuggestions(code: string, language: string): Promise<string[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `3 improvement suggestions for ${language}. Return JSON array of strings. Code:\n${code}`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "[]");
}

export async function applyCodeSuggestion(code: string, suggestion: string, language: string): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Apply suggestion "${suggestion}" to ${language} code. Return ONLY fixed code:\n${code}`
    }));
    return response.text?.replace(/```[a-z]*\n|```/gi, '').trim() || code;
}

export async function generateCode(prompt: string, language: string, model: string, context?: FileData[]): Promise<string> {
    const ai = getAI();
    const parts: any[] = [...(context || []), { text: `Generate ${language} code for: ${prompt}` }];
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: model as any,
        contents: { parts }
    }));
    return response.text?.replace(/```[a-z]*\n|```/gi, '').trim() || "";
}

export async function simulateCodeExecution(code: string, language: string): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Simulate ${language} terminal output for:\n${code}`
    }));
    return response.text || "Success.";
}

export async function formatCode(code: string, language: string): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Format ${language} code. Return ONLY code:\n${code}`
    }));
    return response.text?.replace(/```[a-z]*\n|```/gi, '').trim() || code;
}

export async function fixCode(code: string, error: string, language: string): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Fix ${language} code. Error: ${error}. Return ONLY code:\n${code}`
    }));
    return response.text?.replace(/```[a-z]*\n|```/gi, '').trim() || code;
}

export async function analyzeSchematic(file: FileData): Promise<any> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts: [file, { text: "Analyze schematic. Return JSON {efficiencyRating, powerRails:[{source, voltage, status}], issues:[{severity, location, description, recommendation, boundingBox:[ymin, xmin, ymax, xmax]}], identifiedComponents:[{name, boundingBox}]}" }] },
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "{}");
}

export async function researchComponents(query: string): Promise<ComponentRecommendation[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Research components for: "${query}". Return JSON array of {partNumber, manufacturer, description, specs:{}}`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "[]");
}

export async function generateXRayVariant(file: FileData): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [file, { text: "Generate an X-Ray blueprint style version of this image." }] }
    }));
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("X-Ray generation failed");
}

export async function generateIsometricSchematic(file: FileData): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [file, { text: "Generate an isometric 3D projection of this schematic." }] }
    }));
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("Isometric generation failed");
}

export async function classifyArtifact(file: FileData): Promise<ArtifactAnalysis> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [file, { text: "Analyze artifact. Return JSON {classification, ambiguityScore, entities:[], summary}" }] },
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "{}");
}

export async function calculateEntropy(nodes: any[]): Promise<number> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Calculate entropy score (0-100) for these system nodes: ${JSON.stringify(nodes)}. Return JSON {score}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || '{"score": 0}').score;
}

export async function generateResearchPlan(query: string): Promise<string[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Generate research plan for: "${query}". Return JSON array of 3-5 sub-queries.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(response.text || "[]");
}

export async function executeResearchQuery(query: string): Promise<FactChunk[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: query,
        config: { tools: [{ googleSearch: {} }] }
    }));
    const factsResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Extract 3 verifiable facts from: "${response.text}". Return JSON array of {fact, confidence}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return JSON.parse(factsResponse.text || "[]").map((f: any) => ({ ...f, id: crypto.randomUUID(), source: 'Google Search' }));
}

export async function compileResearchContext(findings: FactChunk[]): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Compile research context from findings: ${JSON.stringify(findings)}`
    }));
    return response.text || "";
}

export async function synthesizeResearchReport(query: string, context: string): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Synthesize report for "${query}" using context:\n${context}`
    }));
    return response.text || "";
}

class LiveSessionManager {
    private session: any = null;
    private audioContext: AudioContext | null = null;
    private inputAudioContext: AudioContext | null = null;
    private stream: MediaStream | null = null;
    private nextStartTime = 0;
    private sources = new Set<AudioBufferSourceNode>();
    
    public onTranscriptUpdate?: (role: string, text: string, isNew?: boolean) => void;
    public onCommand?: (intent: UserIntent) => void;
    public onToolCall?: (name: string, args: any) => Promise<any>;
    public onDisconnect?: () => void;

    private analyser: AnalyserNode | null = null;
    private inputAnalyser: AnalyserNode | null = null;

    isConnected() { return !!this.session; }

    async connect(voiceName: string, config: { systemInstruction: string, tools: any[] }) {
        if (this.session) return;

        const ai = getAI();
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.connect(this.audioContext.destination);

        this.inputAnalyser = this.inputAudioContext.createAnalyser();
        this.inputAnalyser.fftSize = 256;

        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    const source = this.inputAudioContext!.createMediaStreamSource(this.stream!);
                    const scriptProcessor = this.inputAudioContext!.createScriptProcessor(4096, 1, 1);
                    scriptProcessor.onaudioprocess = (e) => {
                        const inputData = e.inputBuffer.getChannelData(0);
                        const pcmBlob = this.createBlob(inputData);
                        sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
                    };
                    source.connect(this.inputAnalyser!);
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(this.inputAudioContext!.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
                        const data = message.serverContent.modelTurn.parts[0].inlineData.data;
                        this.playAudio(data);
                    }
                    if (message.serverContent?.outputTranscription) {
                        this.onTranscriptUpdate?.('model', (message.serverContent.outputTranscription as any).text, message.serverContent.turnComplete);
                    }
                    if (message.serverContent?.inputTranscription) {
                        this.onTranscriptUpdate?.('user', (message.serverContent.inputTranscription as any).text, message.serverContent.turnComplete);
                    }
                    if (message.toolCall) {
                        for (const fc of message.toolCall.functionCalls) {
                            const result = await this.onToolCall?.(fc.name, fc.args);
                            sessionPromise.then(s => s.sendToolResponse({
                                functionResponses: { id: fc.id, name: fc.name, response: result || { status: 'ok' } }
                            }));
                        }
                    }
                },
                onclose: () => this.disconnect(),
                onerror: (e) => console.error("Live session error", e)
            },
            config: {
                ...config,
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                outputAudioTranscription: {},
                inputAudioTranscription: {}
            }
        });

        this.session = await sessionPromise;
    }

    private createBlob(data: Float32Array): GenAIBlob {
        const l = data.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) int16[i] = data[i] * 32768;
        const encode = (bytes: Uint8Array) => {
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
            return btoa(binary);
        };
        return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
    }

    private async playAudio(base64: string) {
        const decode = (b64: string) => {
            const binary = atob(b64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            return bytes;
        };
        const decodeAudioData = async (data: Uint8Array, ctx: AudioContext) => {
            const dataInt16 = new Int16Array(data.buffer);
            const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
            const channelData = buffer.getChannelData(0);
            for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
            return buffer;
        };
        const buffer = await decodeAudioData(decode(base64), this.audioContext!);
        const source = this.audioContext!.createBufferSource();
        source.buffer = buffer;
        source.connect(this.analyser!);
        this.nextStartTime = Math.max(this.nextStartTime, this.audioContext!.currentTime);
        source.start(this.nextStartTime);
        this.nextStartTime += buffer.duration;
        this.sources.add(source);
        source.onended = () => this.sources.delete(source);
    }

    public sendText(text: string) {
        if (this.session) this.session.sendRealtimeInput({ text });
    }

    public getInputFrequencies(): Uint8Array {
        const data = new Uint8Array(this.inputAnalyser?.frequencyBinCount || 0);
        this.inputAnalyser?.getByteFrequencyData(data);
        return data;
    }

    public getOutputFrequencies(): Uint8Array {
        const data = new Uint8Array(this.analyser?.frequencyBinCount || 0);
        this.analyser?.getByteFrequencyData(data);
        return data;
    }

    disconnect() {
        if (this.session) this.session.close();
        this.session = null;
        this.stream?.getTracks().forEach(t => t.stop());
        this.sources.forEach(s => s.stop());
        this.sources.clear();
        this.audioContext?.close();
        this.inputAudioContext?.close();
        this.onDisconnect?.();
    }
}

export const liveSession = new LiveSessionManager();

export async function consensusEngine(
    task: AtomicTask, 
    onStatusUpdate: (status: SwarmStatus) => void
): Promise<SwarmResult> {
    const ai = getAI();
    const TARGET_GAP = 3; 
    const MAX_ROUNDS = 15;
    const MODEL = 'gemini-3-flash-preview';

    let votes: Record<string, number> = {}; 
    let answerMap: Record<string, string> = {}; 
    let bestOutput = "";
    let leaderKey = "";
    let runnerUpKey = "";
    let killedAgents = 0;
    let rounds = 0;

    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            output: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            reasoning: { type: Type.STRING }
        },
        required: ['output', 'confidence', 'reasoning']
    };

    while (rounds < MAX_ROUNDS) {
        rounds++;
        const agentId = `AGENT_${rounds}`;

        try {
            const response: GenerateContentResponse = await retryGeminiRequest(() => ai.models.generateContent({
                model: MODEL,
                contents: `Perform task: "${task.instruction}". Input: "${task.isolated_input}".`,
                config: {
                    temperature: 0.7 + (rounds * 0.05),
                    responseMimeType: 'application/json',
                    responseSchema: schema
                }
            }));

            const result = JSON.parse(response.text || "{}");
            let rawOutput = result.output?.trim() || "";
            rawOutput = rawOutput.replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '').trim();
            
            if (!rawOutput) throw new Error("Empty output");
            const key = rawOutput.toLowerCase().replace(/\s+/g, ' ').substring(0, 200);
            if (!answerMap[key]) answerMap[key] = rawOutput;

            votes[key] = (votes[key] || 0) + 1;
            if (!bestOutput || (result.confidence > 80)) bestOutput = rawOutput;

            const sortedCandidates = Object.entries(votes).sort((a, b) => b[1] - a[1]);
            leaderKey = sortedCandidates[0][0];
            const leaderCount = sortedCandidates[0][1];
            runnerUpKey = sortedCandidates.length > 1 ? sortedCandidates[1][0] : "";
            const runnerUpCount = sortedCandidates.length > 1 ? (sortedCandidates[1][1] as number) : 0;
            const currentGap = leaderCount - runnerUpCount;

            onStatusUpdate({ taskId: task.id, votes, killedAgents, currentGap, targetGap: TARGET_GAP, totalAttempts: rounds });

            if (currentGap >= TARGET_GAP) {
                return {
                    taskId: task.id,
                    output: answerMap[leaderKey] || rawOutput,
                    confidence: Math.min(99, 80 + (currentGap * 5)),
                    agentId,
                    executionTime: Date.now(),
                    voteLedger: { winner: leaderKey.substring(0, 20), count: leaderCount, runnerUp: runnerUpKey.substring(0, 20), runnerUpCount, totalRounds: rounds, killedAgents }
                };
            }
        } catch (e) {
            killedAgents++;
            onStatusUpdate({ taskId: task.id, votes, killedAgents, currentGap: 0, targetGap: TARGET_GAP, totalAttempts: rounds });
        }
        await new Promise(r => setTimeout(r, 200));
    }

    const totalVotes = Object.values(votes).reduce((a, b) => (a as number) + (b as number), 0);
    const leaderVotes = votes[leaderKey] || 0;
    return {
        taskId: task.id,
        output: answerMap[leaderKey] || bestOutput || "Consensus Failed",
        confidence: Math.max(10, Math.round((leaderVotes / (totalVotes || 1)) * 100) - 20),
        agentId: "TIMEOUT",
        executionTime: Date.now(),
        voteLedger: { winner: leaderKey.substring(0, 20), count: leaderVotes, runnerUp: "", runnerUpCount: 0, totalRounds: rounds, killedAgents }
    };
}
