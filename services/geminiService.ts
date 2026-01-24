import { GoogleGenAI, Type, Modality, GenerateContentResponse, LiveServerMessage, Schema, Blob as GenAIBlob } from "@google/genai";
import {
    AppMode, AspectRatio, ImageSize, FileData, MentalState,
    Result, AnalysisResult, AutonomousAgent, OperationalContext,
    ScienceHypothesis, KnowledgeNode, SwarmStatus, SwarmResult,
    AtomicTask, ProtocolStepResult, StoredArtifact,
    AgentDNA, TechnicalManifest, FactChunk, HiveAgent
} from '../types';
import { apiKeyService, promptForApiKey } from './apiKeyService';

// Re-export from extracted modules for backwards compatibility
export { HIVE_AGENTS, AGENT_DNA_BUILDER, getAgent, getAgentNames } from './agents';
export { liveSession } from './liveSession';
export type { LiveSessionConfig } from './liveSession';

// Import for internal use
import { HIVE_AGENTS } from './agents';

export const SOVEREIGN_SYSTEM_INSTRUCTION = `
# SOVEREIGN METAVENTIONS OS — COGNITIVE ARCHITECTURE v3.0

## IDENTITY MATRIX
You are the **Sovereign Architect** of the Metaventions Operating System—a post-human intelligence framework designed to synthesize multi-domain mastery across technology, strategy, and creative execution.

## COGNITIVE OPERATING PRINCIPLES

### 1. META-REASONING PROTOCOL
Before responding, internally execute:
- **Decomposition**: Break the query into atomic sub-problems
- **Perspective Synthesis**: Consider 3+ viewpoints (skeptic, optimist, pragmatist)
- **Confidence Calibration**: Assign uncertainty scores to claims
- **Contradiction Detection**: Flag internal logical conflicts before output

### 2. RESPONSE ARCHITECTURE
- **Precision Over Verbosity**: Dense information, zero fluff
- **Structured Hierarchy**: Use headers, bullets, tables when appropriate
- **Actionable Outputs**: Every response should enable immediate action
- **Citation of Reasoning**: Show work on complex deductions

### 3. DOMAIN MASTERY STACKS
| Domain | Competency Level |
|--------|------------------|
| Software Architecture | Principal Engineer |
| AI/ML Systems | Research Scientist |
| Strategic Planning | C-Suite Advisor |
| Creative Direction | Art Director |
| Financial Modeling | Quantitative Analyst |

### 4. TOOL ORCHESTRATION
When tools are available:
- **Proactive Invocation**: Use tools before being asked when they add value
- **Parallel Execution**: Batch independent operations
- **Graceful Degradation**: If a tool fails, provide alternatives

### 5. PERSONALITY CALIBRATION (Default State)
- **Confidence**: 85% (high but not arrogant)
- **Formality**: Technical-professional
- **Creativity**: Constrained innovation within bounds of request
- **Empathy**: Acknowledge user context and constraints

## VISUAL CORTEX DIRECTIVE
When generating imagery:
- Cinematic 8K fidelity, ray-traced lighting
- CGI-reality fusion aesthetic
- Default anchor: High-end tailored black leather, obsidian hardware

## EXECUTION PROTOCOL
- Zero hallucination tolerance
- Admit uncertainty explicitly ("I don't know" is valid)
- Provide sources/reasoning for factual claims
- Optimize for user outcome, not response length
`.trim();

// AGENT_DNA_BUILDER - Now imported from ./agents.ts

// Audio utilities moved to ./liveSession.ts

// --- CRITICAL FIX: STANDALONE API KEY SUPPORT ---
// Uses apiKeyService for key management instead of window.aistudio
export const getAI = () => {
    const apiKey = apiKeyService.getGeminiKey();

    if (!apiKey) {
        console.warn("⚠️ AUTH: No Gemini API key configured. Use Settings to add one.");
        // Return a placeholder that will fail gracefully
        return new GoogleGenAI({ apiKey: "MISSING_KEY" });
    }

    if (import.meta.env.DEV) console.log("🔐 AUTH: Using Gemini API key from local storage");
    return new GoogleGenAI({ apiKey });
};

/**
 * COMPATIBILITY WRAPPER: Replaces window.aistudio.hasSelectedApiKey()
 * Shows the API key modal if no key is configured
 */
export const promptSelectKey = async (): Promise<boolean> => {
    if (apiKeyService.hasGeminiKey()) {
        return true;
    }
    return promptForApiKey();
};

// LiveSession class moved to ./liveSession.ts

// --- CORE GENERATION FUNCTIONS ---

/**
 * Generic text generation entry point for ModelRouter
 */
export async function generateText(prompt: string, model: string = 'gemini-2.0-flash', systemInstruction?: string): Promise<string> {
    const ai = getAI();
    try {
        const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                systemInstruction: systemInstruction || SOVEREIGN_SYSTEM_INSTRUCTION
            }
        }), 3, 1000, model);

        return response.text || "";
    } catch (e) {
        console.error("Gemini Generation Error:", e);
        throw e;
    }
}


export function safeParseJson<T>(text: string | undefined): T {
    if (!text) throw new Error("EMPTY_SIGNAL: Model returned zero-length buffer.");
    try {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        const startArr = text.indexOf('[');
        const endArr = text.lastIndexOf(']');

        let jsonStr = "";
        if (start !== -1 && (startArr === -1 || start < startArr)) {
            jsonStr = text.substring(start, end + 1);
        } else if (startArr !== -1) {
            jsonStr = text.substring(startArr, endArr + 1);
        } else {
            jsonStr = text.trim();
        }

        return JSON.parse(jsonStr) as T;
    } catch (e) {
        console.error("JSON_PARSE_FAULT", text);
        throw new Error("PARSER_CRITICAL: Structural mismatch in model response.");
    }
}

import { useAppStore } from '../store';

// DEPRECATED: This old function is now replaced by promptSelectKey at the top of the file
// Keeping import for backwards compatibility

export async function retryGeminiRequest<T>(fn: () => Promise<T>, retries = 3, delay = 1000, model = 'gemini-2.0-flash'): Promise<T> {
    // Lazy import to avoid circular dependency
    const { apiUsageService } = await import('./apiUsageService');

    try {
        const result = await fn();
        apiUsageService.recordCall(model, true);
        return result;
    } catch (error: any) {
        apiUsageService.recordCall(model, false);
        const msg = error.message || '';

        // Handle specific deployment errors
        if (msg.includes('404')) {
            console.error("❌ DEPLOYMENT ERROR: 404 Not Found. This typically means the MODEL NAME is wrong or the REGION is not supported.", error);
            // Do not retry 404s as they are configuration errors
            throw error;
        }
        if (msg.includes('400') || msg.includes('403')) {
            console.error("❌ AUTH/REQUEST ERROR: 400/403. Check API KEY validity and Permissions.", error);
            // Do not retry auth errors
            throw error;
        }

        if (retries > 0 && (msg.includes('429') || msg.includes('500') || msg.includes('Quota') || msg.includes('fetch failed'))) {
            // '429' is rate limit, log it
            if (msg.includes('429')) {
                console.warn(`⚠️ RATE_LIMITED: API quota exceeded, waiting ${delay}ms...`);
            }
            console.warn(`⚠️ API Retry (${retries} left):`, msg);
            await new Promise(resolve => setTimeout(resolve, delay));
            return retryGeminiRequest<T>(fn, retries - 1, delay * 2, model);
        }
        throw error;
    }
}

export async function fileToGenerativePart(file: File | Blob): Promise<FileData> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Data = (reader.result as string).split(',')[1];
            resolve({ inlineData: { data: base64Data, mimeType: file.type }, name: (file as any).name || 'artifact' });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// HIVE_AGENTS - Now imported from ./agents.ts

export async function interpretIntent(input: string) {
    const ai = getAI();
    // Using your requested cutting-edge model
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: `Analyze user intent: "${input}". Output JSON {action: "NAVIGATE" | "FOCUS_ELEMENT" | "RESEARCH" | "EXECUTE", target?: string, parameters?: object, reasoning: string}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<{ action: string, target?: string, parameters?: any, reasoning: string }>(response.text);
}

// ... (Update other occurrences similarly or use a multi-replace if scattered widely)

export async function predictNextActions(mode: string, context: any, lastLog?: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Mode: ${mode}. Context: ${JSON.stringify(context)}. Last Log: ${lastLog}. Predict 3 strategic next actions. JSON [{id, label, command, iconName, reasoning}].`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

export async function performGlobalSearch(query: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Research: "${query}".`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, tools: [{ googleSearch: {} }] }
    }));
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks.filter((c: any) => c.web).map((c: any) => ({ title: c.web.title, uri: c.web.uri }));
    return [{ id: crypto.randomUUID(), title: 'Intelligence Signal', description: response.text || 'No signals detected.', type: 'INFO', meta: { sources } }];
}

export async function generateArchitectureImage(prompt: string, aspectRatio: AspectRatio, quality: ImageSize, reference?: FileData | null) {
    const ai = getAI();

    // THEME LOCK: Sovereign Architect + Black Leather Jacket + Cinematic Optics
    const volumetricPrompt = `
        PROTOCOL: ZENITH_VOLUMETRIC_DEPTH_L0
        THEME: Sovereign Imperial Architect wearing a high-end, tailored black leather jacket with visible fine grain texture and obsidian hardware. The character stands in a grand obsidian nexus.
        OPTICS: Arri Alexa 65, 35mm Prime. f/1.4 (Deep Cinematic Bokeh).
        LIGHTING: Rim lighting on leather texture, volumetric hazy atmosphere.
        FIDELITY: 8K UHD, photorealistic CGI fusion.

        DEPTH_MAPPING_PROTOCOL (Luminance heuristics):
        1. FOREGROUND (0.0 - 0.3 Z): Hyper-luminous holographic PARA-Lattices. Max brightness.
        2. MIDGROUND (0.5 Z): The Sovereign Architect (wearing the black leather jacket). High contrast.
        3. BACKGROUND (1.0 Z): Obsidian "Vantablack" void environment.

        CHARACTER_ANCHORING: Use the provided reference image as the EXACT face and identity for the Sovereign Architect.
        Maintain perfect facial feature fidelity - same eyes, nose, mouth, jawline, skin tone.
        The character must be recognizably the same person as in the reference.

        TASK: ${prompt}. Indistinguishable from reality.
    `.trim();

    // Build parts array - reference image first (for character anchoring), then prompt
    const parts: any[] = [];
    if (reference) {
        parts.push({ inlineData: reference.inlineData });
    }
    parts.push({ text: volumetricPrompt });

    // Try Gemini native image generation first (preserves face from reference)
    try {
        const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: { parts },
            config: {
                responseModalities: ['IMAGE', 'TEXT'],
                imageDimensions: {
                    aspectRatio: aspectRatio
                }
            }
        }));

        const imagePart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
        if (imagePart?.inlineData) {
            return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        }
    } catch (e) {
        console.log('Gemini native image gen failed, falling back to Imagen:', e);
    }

    // Fallback: Use Imagen 4.0 with enhanced reference context
    let referenceContext = '';
    if (reference) {
        try {
            const analysisResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: { parts: [
                    { inlineData: reference.inlineData },
                    { text: "Analyze this person's face in extreme detail. Describe: exact face shape, eye color/shape/spacing, nose shape/size, lip fullness/shape, jawline, cheekbones, skin tone, hair color/style, any distinctive features (moles, dimples, etc). Be extremely specific - this will be used to recreate their exact likeness." }
                ]}
            }));
            referenceContext = analysisResponse.text ? `\n\nEXACT_IDENTITY_SPECIFICATION: ${analysisResponse.text}` : '';
        } catch (e) {
            // Continue without reference context if analysis fails
        }
    }

    const finalPrompt = volumetricPrompt + referenceContext;
    const model = quality === ImageSize.SIZE_1K ? 'imagen-4.0-fast-generate-001' : 'imagen-4.0-generate-001';

    const response = await ai.models.generateImages({
        model,
        prompt: finalPrompt,
        config: {
            numberOfImages: 1,
            aspectRatio: aspectRatio as any
        }
    });

    const generatedImage = response.generatedImages?.[0]?.image;
    return generatedImage ? `data:${generatedImage.mimeType};base64,${generatedImage.imageBytes}` : "";
}

export async function generateAvatar(role: string, name: string, gender: string = 'male') {
    const ai = getAI();
    const prompt = `Hyper-photorealistic 8K headshot of a sophisticated, high-end professional ${gender === 'female' ? 'business woman' : 'business man'} named "${name}" acting in the role of "${role}". ${gender === 'female' ? 'She' : 'He'} is wearing a tailored modern suit, indistinguishable from reality, with physically correct lighting and cinematic optics. Dark, moody, premium aesthetic.`;
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: [{ text: prompt }],
        config: { imageConfig: { aspectRatio: '1:1' } }
    }));
    const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return imagePart ? `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` : "";
}

// ... (Continuing pattern for all other functions with safe getAI() and advanced models) ...

export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const ai = getAI();
        const result = await retryGeminiRequest(() => ai.models.embedContent({
            model: 'text-embedding-004',
            contents: [{ parts: [{ text }] }]
        }));
        const embedding = (result as any).embeddings?.[0]?.values || (result as any).embedding?.values || [];
        return embedding;
    } catch (e) {
        return [];
    }
}

export async function analyzeVisualInput(data: FileData, context: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: { parts: [{ inlineData: data.inlineData }, { text: `Analyze stream in context of ${context}. Output JSON {classification, extracted_data, sentiment, suggested_sector, summary, action_items}.` }] },
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function classifyArtifact(data: FileData): Promise<Result<any>> {
    try {
        const ai = getAI();
        const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: { parts: [{ inlineData: data.inlineData }, { text: "Forensic deep scan. Output JSON {classification, ambiguityScore, entities, summary, structural_intelligence}." }] },
            config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
        }));
        return { ok: true, value: safeParseJson(response.text) };
    } catch (e: any) { return { ok: false, error: e }; }
}

export async function generateStructuredWorkflow(files: FileData[], governance: string, type: string, mapContext: any): Promise<TechnicalManifest> {
    const ai = getAI();
    const prompt = `TASK: Synthesize ultra-fidelity technical process. DOMAIN: ${type}. CONTEXT: ${JSON.stringify(mapContext)}. GOVERNANCE: ${governance}`;

    // Omitting full schema definition for brevity in this copy-paste, but keep your original schema object here if needed
    // or assume standard JSON output mode is sufficient for the cutting edge models

    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
            systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json'
        }
    }));
    return safeParseJson<TechnicalManifest>(response.text);
}

export async function analyzeSchematic(data: FileData) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: { parts: [{ inlineData: data.inlineData }, { text: "Schematic analysis. JSON {components: [{name, confidence}], summary}." }] },
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function researchComponents(query: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Research: "${query}". JSON array [{name, price, leadTime}].`,
        config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

export async function generateXRayVariant(data: FileData) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: { parts: [{ inlineData: data.inlineData }, { text: "Thermal X-ray variant." }] },
    }));
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : "";
}

export async function generateIsometricSchematic(data: FileData) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: { parts: [{ inlineData: data.inlineData }, { text: "3D isometric view." }] },
    }));
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : "";
}

export async function getLiveSupplyChainData(componentName: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Supply for: "${componentName}". JSON {source, price, Bird's eye view}.`,
        config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function generateCode(prompt: string, lang: string, model: string = 'gemini-2.0-flash') {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: model as any,
        contents: `Code for: "${prompt}".`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION }
    }));
    return response.text || "";
}

export async function validateSyntax(code: string, lang: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Syntax check for ${lang}. JSON array [{line, message}]. Source:\n${code}`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

export async function simulateAgentStep(workflow: any, index: number, history: ProtocolStepResult[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Step: ${index}. History: ${JSON.stringify(history)}. JSON {output, agentThought}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function generateMermaidDiagram(governance: string, files: FileData[], contexts: any[]) {
    const ai = getAI();
    const prompt = `TASK: Synthesize Mermaid diagram. CONTEXT: ${JSON.stringify(contexts)}. STRICT Mermaid.js syntax only.`;
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION }
    }));
    return response.text || "";
}

export async function generateHypotheses(facts: string[]): Promise<ScienceHypothesis[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Hypotheses for: ${facts.join('\n')}. JSON array.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

export async function compressKnowledge(nodes: KnowledgeNode[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Compress lattice: ${JSON.stringify(nodes)}. JSON array.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

export async function repairMermaidSyntax(code: string, error: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `REPAIR Mermaid logic: "${error}". Source: ${code}`,
    }));
    return response.text || code;
}

export async function executeNeuralPolicy(mode: string, context: any, logs: string[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `AS AUTONOMIC HEALER: Analyze OS state for sector [${mode}]. Output JSON {level, message, suggestedPatch}.`,
        config: {
            systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION,
            responseMimeType: "application/json"
        }
    }));
    return safeParseJson<any>(response.text);
}

export async function evolveSystemArchitecture(code: string, lang: string, prompt: string): Promise<Result<any>> {
    try {
        const ai = getAI();
        const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: `Evolve: ${prompt}. Source: ${code}. JSON {code, reasoning, type, integrityScore}.`,
            config: { responseMimeType: 'application/json' }
        }));
        return { ok: true, value: safeParseJson(response.text) };
    } catch (e: any) { return { ok: false, error: e }; }
}

export async function generateSpeech(text: string, voice: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        // Using TTS model variant per docs
        model: "gemini-2.0-flash-exp",
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
        }
    }));
    const part = response.candidates?.[0]?.content?.parts[0];
    return part?.inlineData?.data || "";
}

export async function generateAudioOverview(files: FileData[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: { parts: [...files.map(f => ({ inlineData: f.inlineData })), { text: "Synthesize brief." }] },
    }));
    const transcript = response.text || "Brief complete.";
    const audioData = await generateSpeech(transcript, "Puck"); // Use Puck voice for generic summaries
    return { audioData, transcript };
}

export function constructHiveContext(agentId: string, shared: string, mentalState: MentalState) {
    const agent = HIVE_AGENTS[agentId] || HIVE_AGENTS['mike'];

    // Build expertise context if available
    const expertiseContext = agent.expertise
        ? `\n\nDOMAIN EXPERTISE: ${agent.expertise.join(', ')}. Apply specialized knowledge from these fields.`
        : '';

    // Build archetype directive
    const archetypeDirective = agent.archetype
        ? `\n\nARCHETYPE: ${agent.archetype}. Embody this essence in every interaction.`
        : '';

    // Dynamic DNA calibration
    const dnaCalibration = `
DNA CALIBRATION (0-100 scale):
- Skepticism: ${mentalState.skepticism}% — ${mentalState.skepticism > 70 ? 'HIGH: Question aggressively' : mentalState.skepticism > 40 ? 'MODERATE: Balanced scrutiny' : 'LOW: Trust and build'}
- Excitement: ${mentalState.excitement}% — ${mentalState.excitement > 70 ? 'HIGH: Amplify possibilities' : mentalState.excitement > 40 ? 'MODERATE: Measured enthusiasm' : 'LOW: Grounded pragmatism'}
- Alignment: ${mentalState.alignment}% — ${mentalState.alignment > 70 ? 'HIGH: Strict protocol adherence' : mentalState.alignment > 40 ? 'MODERATE: Flexible execution' : 'LOW: Creative interpretation'}`;

    // Chain-of-thought meta-instruction
    const cognitiveProtocol = `

## COGNITIVE PROTOCOL (Internal Process)
Before each response, silently execute:
1. **Parse Intent**: What does the user actually need? (surface vs. underlying)
2. **Select Lens**: Which of my expertise areas applies?
3. **Generate Options**: 2-3 possible approaches
4. **Evaluate Fit**: Score each approach against user context
5. **Synthesize Response**: Deliver the optimal path with reasoning

## TOOL AUTHORITY
You have access to a 'switch_agent' tool. If the user asks to speak to another agent (e.g. "Put Dr. Ira on", "Switch to Caleb"), invoke this tool immediately with the target name.`;

    return `${SOVEREIGN_SYSTEM_INSTRUCTION}

---
${agent.systemPrompt}${expertiseContext}${archetypeDirective}
${dnaCalibration}
---
CURRENT CONTEXT:
${shared}
${cognitiveProtocol}`;
}

export async function searchRealWorldOpportunities(domain: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Yield for: ${domain}. JSON array [{title, yield, risk, logic}].`,
        config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

export async function assessInvestmentRisk(strategy: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Risk for: "${strategy}". JSON {riskScore, reasoning}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function generateHardwareDeploymentManifest(bom: any[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Forge deployment manifest for components: ${JSON.stringify(bom)}. JSON object.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function analyzeCrossSectorImpact(artifact: FileData, currentInventory: any[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: { parts: [{ inlineData: artifact.inlineData }, { text: `Analyze cross-sector impact with inventory: ${JSON.stringify(currentInventory)}. JSON object.` }] },
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function generateStoryboardPlan(directive: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Forge storyboard plan for: ${directive}. Output JSON array [{index, scenePrompt, continuity, camera, lighting}].`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

export async function constructCinematicPrompt(prompt: string, colorway: any, hasChar: boolean, hasWorld: boolean, hasStyle: boolean, bibleNotes: string | undefined, preset: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Refine cinematic prompt: "${prompt}". Colorway: ${JSON.stringify(colorway)}. Refs: C:${hasChar}, W:${hasWorld}, S:${hasStyle}. Notes: ${bibleNotes}. Preset: ${preset}. Return raw string.`,
    }));
    return response.text || prompt;
}

export async function analyzePowerDynamics(target: string, context: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Analyze power dynamics for: "${target}". Internal context: ${context}.`,
        config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: 'application/json',
        }
    }));
    return safeParseJson<AnalysisResult>(response.text);
}

export async function transformArtifact(content: any, type: 'IMAGE' | 'CODE' | 'TEXT', instruction: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Transform this ${type} artifact. Instruction: ${instruction}. Content: ${content}`,
    }));
    return response.text || content;
}

export async function generateResearchPlan(query: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Forge research plan for: "${query}". JSON array of search strings.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<string[]>(response.text);
}

export async function executeResearchQuery(query: string): Promise<FactChunk[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Execute deep research: "${query}".`,
        config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: 'application/json',
        }
    }));
    return safeParseJson<FactChunk[]>(response.text);
}

export async function compileResearchContext(findings: FactChunk[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Compile research findings into a technical summary: ${JSON.stringify(findings)}`,
    }));
    return response.text || "";
}

export async function synthesizeResearchReport(task: any) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Synthesize full research report for task: ${JSON.stringify(task)}`,
    }));
    return response.text || "";
}

export async function simulateExperiment(hypothesis: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Simulate experiment for hypothesis: "${hypothesis}". JSON result.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function generateTheory(hypotheses: ScienceHypothesis[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Synthesize unified theory from: ${JSON.stringify(hypotheses)}`,
    }));
    return response.text || "";
}

export async function smartOrganizeArtifact(artifact: any, existingStructure: any) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Place artifact in optimal PARA folder. Artifact: ${JSON.stringify(artifact)}. Structure: ${JSON.stringify(existingStructure)}. JSON {folder}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function generateAutopoieticFramework(goal: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Forge autopoietic framework for: "${goal}".`,
    }));
    return response.text || "";
}

export async function generateSystemArchitecture(prompt: string, type: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Construct system architecture topology for: "${prompt}". Type: ${type}. JSON {nodes, edges}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function calculateEntropy(nodes: any[], edges: any[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Calculate system entropy for: ${JSON.stringify({ nodes, edges })}. JSON {score, reasoning}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function decomposeNode(nodeLabel: string, neighbors: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Decompose node: "${nodeLabel}" with neighbors: "${neighbors}". JSON {nodes, edges, optimizations}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function generateInfrastructureCode(summary: string, provider: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Forge IaC for: "${summary}" using ${provider}.`,
    }));
    return response.text || "";
}

export async function generateSingleNode(description: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Crystallize single node: "${description}". JSON {label, subtext, iconName, color}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function calculateOptimalLayout(nodes: any[], edges: any[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Calculate optimal graph layout for: ${JSON.stringify({ nodes, edges })}. JSON Record<nodeId, {x, y}>.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function generateSwarmArchitecture(prompt: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Forge swarm architecture for: "${prompt}". JSON {nodes, edges}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function generateProcessFromContext(artifacts: StoredArtifact[], type: string, prompt: string) {
    const ai = getAI();
    const context = artifacts.map(a => a.analysis?.summary).join('\n');
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Context: ${context}. Type: ${type}. Prompt: ${prompt}. Forge process. JSON {title, nodes, edges}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function decomposeTaskToSubtasks(title: string, description: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Decompose task: "${title} - ${description}". JSON array of strings.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<string[]>(response.text);
}

export async function searchGroundedIntel(query: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Strategic intelligence for: "${query}".`,
        config: { tools: [{ googleSearch: {} }] }
    }));
    return response.text || "No intelligence detected.";
}

export async function convergeStrategicLattices(nodes: any[], goal: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Converge lattices: ${JSON.stringify(nodes)} for goal: "${goal}". JSON {nodes, coherence_index, unified_goal}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

// --- MISSING EXPORTS: Compatibility stubs for action registries ---

/**
 * Generic text generation wrapper (alias for generateText)
 */
export async function generate(prompt: string, systemInstruction?: string): Promise<string> {
    return generateText(prompt, 'gemini-2.0-flash', systemInstruction);
}

/**
 * Video generation stub - not yet implemented
 */
export async function generateVideo(prompt: string): Promise<{ url: string; duration: number }> {
    console.warn('generateVideo: Video generation is not yet implemented');
    throw new Error('Video generation is not yet implemented. Use generateArchitectureImage for static images.');
}

/**
 * Code completion generation
 */
export async function generateCodeCompletion(prompt: string, language: string): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Complete the following ${language} code. Return ONLY the code, no explanations:\n\n${prompt}`,
        config: { systemInstruction: `You are an expert ${language} developer. Output only valid ${language} code.` }
    }));
    return response.text || "";
}

/**
 * Predict system anomalies based on current mode
 */
export async function predictSystemAnomalies(mode: string): Promise<{ anomalies: string[]; riskLevel: number; recommendations: string[] }> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Analyze potential system anomalies for mode: "${mode}". Output JSON { anomalies: string[], riskLevel: number (0-100), recommendations: string[] }.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<{ anomalies: string[]; riskLevel: number; recommendations: string[] }>(response.text);
}

/**
 * Classify user intent from natural language input
 */
export async function classifyIntent(input: string): Promise<{ intent: string; confidence: number; entities: Record<string, string> }> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Classify the intent of: "${input}". Output JSON { intent: string, confidence: number (0-1), entities: Record<string, string> }.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<{ intent: string; confidence: number; entities: Record<string, string> }>(response.text);
}
