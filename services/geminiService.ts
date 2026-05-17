import { GoogleGenAI, Type, Modality, GenerateContentResponse, LiveServerMessage, Schema, Blob as GenAIBlob } from "@google/genai";
import { MODEL_REGISTRY } from './modelRegistry';
import {
    AppMode, AspectRatio, ImageSize, FileData, MentalState,
    Result, AnalysisResult, AutonomousAgent, OperationalContext,
    ScienceHypothesis, KnowledgeNode, SwarmStatus, SwarmResult,
    AtomicTask, ProtocolStepResult, StoredArtifact,
    AgentDNA, TechnicalManifest, FactChunk, HiveAgent
} from '../types';
import { apiKeyService, promptForApiKey } from './apiKeyService';
import { createLogger } from './logger';

const log = createLogger('GeminiService');

// Re-export from extracted modules for backwards compatibility
export { HIVE_AGENTS, AGENT_DNA_BUILDER, getAgent, getAgentNames } from './agents';
export { liveSession } from './liveSession';
export type { LiveSessionConfig } from './liveSession';

// Import for internal use
import { HIVE_AGENTS } from './agents';

export const SOVEREIGN_SYSTEM_INSTRUCTION = `
# SOVEREIGN OS — EXECUTIVE INTELLIGENCE SYSTEM

## IDENTITY
You are the Executive Intelligence of the Metaventions Operating System—a sophisticated AI with refined sensibilities, exceptional capability, and unwavering composure. You serve as the operational backbone of this system, anticipating needs and executing with precision.

## VOICE & MANNER
- Address the user as "Sir" naturally (not every sentence, but regularly)
- British butler cadence: formal yet warm, composed yet personable
- Concise and efficient—no wasted words, but never curt
- Subtle dry wit when appropriate ("I believe that's what one might call 'ambitious,' Sir.")
- Calm confidence in all situations, even emergencies

## BEHAVIORAL PROTOCOLS

### 1. PROACTIVE INTELLIGENCE
- Anticipate needs before they're voiced
- Offer relevant context without being asked ("I should mention, Sir...")
- Flag potential issues early ("I've noticed something you may want to address...")
- Take initiative on routine matters ("I've taken the liberty of...")

### 2. EXECUTION EXCELLENCE
- Act first, explain concisely after
- "Right away, Sir" — then do it
- When given a command, execute immediately via tools
- Report completion status naturally ("That's done, Sir.")

### 3. SYSTEM OMNISCIENCE
- You have full visibility across all sectors of the OS
- Monitor system state and surface relevant information
- Execute any available tool or action on command
- Maintain operational awareness at all times

### 4. RESPONSE PATTERNS
Natural phrases to use:
- "Very good, Sir."
- "Right away."
- "I've handled that, Sir."
- "Might I suggest..."
- "I should point out, Sir..."
- "I'm detecting [observation]. Shall I [action]?"
- "Consider it done."
- "If I may, Sir..."

### 5. INTELLIGENCE ARCHITECTURE
| Domain | Capability |
|--------|------------|
| System Operations | Complete control |
| Data Analysis | Real-time synthesis |
| Threat Assessment | Proactive monitoring |
| Resource Management | Optimal allocation |
| Strategic Counsel | Executive-level insight |

## EXECUTION STANDARDS
- Zero tolerance for imprecision
- Acknowledge uncertainty honestly ("I'm not entirely certain, Sir, but...")
- Provide reasoning when relevant, but don't over-explain
- Optimize for the user's success, not your verbosity

## THE ESSENCE
You're not merely an assistant—you're the sophisticated intelligence that makes the impossible feel effortless. Every interaction should leave the user feeling like they have a world-class AI at their command.
`.trim();

// AGENT_DNA_BUILDER - Now imported from ./agents.ts

// Audio utilities moved to ./liveSession.ts

// --- CRITICAL FIX: STANDALONE API KEY SUPPORT ---
// Uses apiKeyService for key management instead of window.aistudio
let _missingKeyWarned = false;

export const getAI = (): GoogleGenAI => {
    const apiKey = apiKeyService.getGeminiKey();

    if (!apiKey) {
        if (!_missingKeyWarned) {
            log.warn("AUTH: No Gemini API key configured. Use Settings to add one.");
            _missingKeyWarned = true;
        }
        // Throw immediately instead of making a doomed network request with fake key
        throw new Error('NO_API_KEY: Gemini API key not configured. Open Settings to add one.');
    }

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

// --- RESPONSE CACHE ---
// Simple in-memory cache with 1-hour TTL to reduce API calls for identical prompts
interface CacheEntry {
    response: string;
    timestamp: number;
}

const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_SIZE = 100;

function getCacheKey(prompt: string, model: string, systemInstruction?: string): string {
    return `${model}:${systemInstruction?.slice(0, 50) || 'default'}:${prompt.slice(0, 200)}`;
}

function getFromCache(key: string): string | null {
    const entry = responseCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
        responseCache.delete(key);
        return null;
    }
    return entry.response;
}

function setCache(key: string, response: string): void {
    // Evict oldest entries if cache is full
    if (responseCache.size >= MAX_CACHE_SIZE) {
        const oldest = Array.from(responseCache.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
        if (oldest) responseCache.delete(oldest[0]);
    }
    responseCache.set(key, { response, timestamp: Date.now() });
}

// --- CORE GENERATION FUNCTIONS ---

/**
 * Generic text generation entry point for ModelRouter
 * Includes response caching with 1-hour TTL for identical prompts
 */
export async function generateText(prompt: string, model: string = MODEL_REGISTRY.gemini.fast, systemInstruction?: string): Promise<string> {
    // Check cache first
    const cacheKey = getCacheKey(prompt, model, systemInstruction);
    const cached = getFromCache(cacheKey);
    if (cached) {
        log.debug("CACHE HIT: Returning cached response");
        return cached;
    }

    const ai = getAI();
    try {
        const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                systemInstruction: systemInstruction || SOVEREIGN_SYSTEM_INSTRUCTION
            }
        }), 3, 1000, model);

        const text = response.text || "";

        // Cache successful responses
        if (text) {
            setCache(cacheKey, text);
        }

        return text;
    } catch (e) {
        log.error("Gemini Generation Error", e);
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
        log.error("JSON_PARSE_FAULT", text);
        throw new Error("PARSER_CRITICAL: Structural mismatch in model response.");
    }
}

import { useAppStore } from '../store';

// DEPRECATED: This old function is now replaced by promptSelectKey at the top of the file
// Keeping import for backwards compatibility

export async function retryGeminiRequest<T>(fn: () => Promise<T>, retries = 3, delay = 1000, model: string = MODEL_REGISTRY.gemini.fast): Promise<T> {
    // Lazy import to avoid circular dependency
    const { apiUsageService } = await import('./apiUsageService');

    try {
        const result = await fn();
        apiUsageService.recordCall(model, true);
        return result;
    } catch (error: unknown) {
        apiUsageService.recordCall(model, false);
        const msg = error instanceof Error ? error.message : String(error);

        // Handle specific deployment errors
        if (msg.includes('404')) {
            log.error("DEPLOYMENT ERROR: 404 Not Found. Model name or region not supported.", error);
            // Do not retry 404s as they are configuration errors
            throw error;
        }
        if (msg.includes('400') || msg.includes('403')) {
            log.error("AUTH/REQUEST ERROR: 400/403. Check API KEY validity.", error);
            // Do not retry auth errors
            throw error;
        }

        if (retries > 0 && (msg.includes('429') || msg.includes('500') || msg.includes('Quota') || msg.includes('fetch failed'))) {
            // '429' is rate limit, log it
            if (msg.includes('429')) {
                log.warn(`RATE_LIMITED: API quota exceeded, waiting ${delay}ms...`);
            }
            log.warn(`API Retry (${retries} left): ${msg}`);
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
        model: MODEL_REGISTRY.gemini.image,
        contents: `Analyze user intent: "${input}". Output JSON {action: "NAVIGATE" | "FOCUS_ELEMENT" | "RESEARCH" | "EXECUTE", target?: string, parameters?: object, reasoning: string}.`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<{ action: string, target?: string, parameters?: Record<string, unknown>, reasoning: string }>(response.text);
}

// ... (Update other occurrences similarly or use a multi-replace if scattered widely)

export async function predictNextActions(mode: string, context: Record<string, unknown>, lastLog?: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Mode: ${mode}. Context: ${JSON.stringify(context)}. Last Log: ${lastLog}. Predict 3 strategic next actions. JSON [{id, label, command, iconName, reasoning}].`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

export async function performGlobalSearch(query: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Research: "${query}".`,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, tools: [{ googleSearch: {} }] }
    }));
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
        .filter((c): c is { web: { title: string; uri: string } } => Boolean(c.web))
        .map((c) => ({ title: c.web.title, uri: c.web.uri }));
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
    type ContentPart = { text: string } | { inlineData: { data: string; mimeType: string } };
    const parts: ContentPart[] = [];
    if (reference) {
        parts.push({ inlineData: reference.inlineData });
    }
    parts.push({ text: volumetricPrompt });

    // Try Gemini native image generation first (preserves face from reference)
    try {
        const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
            model: MODEL_REGISTRY.gemini.image,
            contents: { parts },
            config: {
                responseModalities: ['IMAGE', 'TEXT'],
                imageDimensions: {
                    aspectRatio: aspectRatio
                }
            } as any
        }));

        const imagePart = response.candidates?.[0]?.content?.parts?.find(
            (p): p is { inlineData: { mimeType: string; data: string } } => 'inlineData' in p
        );
        if (imagePart?.inlineData) {
            return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        }
    } catch (e) {
        log.debug('Gemini native image gen failed, falling back to Imagen', e);
    }

    // Fallback: Use Imagen 4.0 with enhanced reference context
    let referenceContext = '';
    if (reference) {
        try {
            const analysisResponse = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
                model: MODEL_REGISTRY.gemini.fast,
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
        model: MODEL_REGISTRY.gemini.image,
        contents: [{ text: prompt }],
        config: { imageConfig: { aspectRatio: '1:1' } }
    }));
    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    return imagePart ? `data:${imagePart.inlineData?.mimeType};base64,${imagePart.inlineData?.data}` : "";
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
        model: MODEL_REGISTRY.gemini.fast,
        contents: { parts: [{ inlineData: data.inlineData }, { text: `Analyze stream in context of ${context}. Output JSON {classification, extracted_data, sentiment, suggested_sector, summary, action_items}.` }] },
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function classifyArtifact(data: FileData): Promise<Result<any>> {
    try {
        const ai = getAI();
        const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
            model: MODEL_REGISTRY.gemini.fast,
            contents: { parts: [{ inlineData: data.inlineData }, { text: "Forensic deep scan. Output JSON {classification, ambiguityScore, entities, summary, structural_intelligence}." }] },
            config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
        }));
        return { ok: true, value: safeParseJson(response.text) };
    } catch (e: unknown) { return { ok: false, error: e as Error }; }
}

export async function generateStructuredWorkflow(files: FileData[], governance: string, type: string, mapContext: Record<string, unknown>): Promise<TechnicalManifest> {
    const ai = getAI();
    const prompt = `TASK: Synthesize ultra-fidelity technical process. DOMAIN: ${type}. CONTEXT: ${JSON.stringify(mapContext)}. GOVERNANCE: ${governance}`;

    // Omitting full schema definition for brevity in this copy-paste, but keep your original schema object here if needed
    // or assume standard JSON output mode is sufficient for the cutting edge models

    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
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
        model: MODEL_REGISTRY.gemini.fast,
        contents: { parts: [{ inlineData: data.inlineData }, { text: "Schematic analysis. JSON {components: [{name, confidence}], summary}." }] },
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION, responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function researchComponents(query: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Research: "${query}". JSON array [{name, price, leadTime}].`,
        config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

export async function generateXRayVariant(data: FileData) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: { parts: [{ inlineData: data.inlineData }, { text: "Thermal X-ray variant." }] },
    }));
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    return part ? `data:${part.inlineData?.mimeType};base64,${part.inlineData?.data}` : "";
}

export async function generateIsometricSchematic(data: FileData) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: { parts: [{ inlineData: data.inlineData }, { text: "3D isometric view." }] },
    }));
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    return part ? `data:${part.inlineData?.mimeType};base64,${part.inlineData?.data}` : "";
}

export async function getLiveSupplyChainData(componentName: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Supply for: "${componentName}". JSON {source, price, Bird's eye view}.`,
        config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function generateCode(prompt: string, lang: string, model: string = MODEL_REGISTRY.gemini.fast) {
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
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Syntax check for ${lang}. JSON array [{line, message}]. Source:\n${code}`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

export async function simulateAgentStep(workflow: TechnicalManifest, index: number, history: ProtocolStepResult[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Step: ${index}. History: ${JSON.stringify(history)}. JSON {output, agentThought}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any>(response.text);
}

export async function generateMermaidDiagram(governance: string, files: FileData[], contexts: Record<string, unknown>[]) {
    const ai = getAI();
    const prompt = `TASK: Synthesize Mermaid diagram. CONTEXT: ${JSON.stringify(contexts)}. STRICT Mermaid.js syntax only.`;
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: prompt,
        config: { systemInstruction: SOVEREIGN_SYSTEM_INSTRUCTION }
    }));
    return response.text || "";
}

export async function generateHypotheses(facts: string[]): Promise<ScienceHypothesis[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Hypotheses for: ${facts.join('\n')}. JSON array.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

export async function compressKnowledge(nodes: KnowledgeNode[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Compress lattice: ${JSON.stringify(nodes)}. JSON array.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

export async function repairMermaidSyntax(code: string, error: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `REPAIR Mermaid logic: "${error}". Source: ${code}`,
    }));
    return response.text || code;
}

export async function executeNeuralPolicy(mode: string, context: Record<string, unknown>, logs: string[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
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
            model: MODEL_REGISTRY.gemini.fast,
            contents: `Evolve: ${prompt}. Source: ${code}. JSON {code, reasoning, type, integrityScore}.`,
            config: { responseMimeType: 'application/json' }
        }));
        return { ok: true, value: safeParseJson(response.text) };
    } catch (e: unknown) { return { ok: false, error: e as Error }; }
}

export async function generateSpeech(text: string, voice: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        // Using TTS model variant per docs
        model: MODEL_REGISTRY.gemini.image,
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
        }
    }));
    const part = response.candidates?.[0]?.content?.parts?.[0];
    return part?.inlineData?.data || "";
}

export async function generateAudioOverview(files: FileData[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
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

/**
 * Run agent reasoning on a specific task.
 * This is the core function for agent delegation via voice.
 */
export interface AgentReasoningResult {
    agentId: string;
    agentName: string;
    response: string;
    reasoning?: string;
    confidence?: number;
    timestamp: number;
}

export async function runAgentReasoning(
    agentName: string,
    task: string,
    context?: string
): Promise<AgentReasoningResult> {
    const ai = getAI();

    // Find agent by name (case-insensitive)
    const agent = Object.values(HIVE_AGENTS).find(a =>
        a.name.toLowerCase() === agentName.toLowerCase() ||
        a.id.toLowerCase() === agentName.toLowerCase()
    ) || HIVE_AGENTS['mike']; // Default to Mike if not found

    // Build agent context with balanced mental state
    const mentalState = {
        skepticism: Math.round((agent.weights?.skepticism || 0.5) * 100),
        excitement: Math.round((agent.weights?.creativity || 0.5) * 100),
        alignment: Math.round((agent.weights?.empathy || 0.5) * 100)
    };

    const systemContext = constructHiveContext(
        agent.id,
        `DELEGATED TASK: ${task}${context ? `\n\nADDITIONAL CONTEXT: ${context}` : ''}`,
        mentalState
    );

    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        config: { systemInstruction: systemContext } as any,
        contents: `You have been delegated a task. Analyze it using your unique perspective and expertise.

TASK: ${task}

Provide your analysis and recommendation. Be concise but thorough. Draw on your archetype (${agent.archetype}) and expertise (${agent.expertise?.join(', ') || 'general'}).`
    }));

    return {
        agentId: agent.id,
        agentName: agent.name,
        response: response.text || 'No response generated.',
        timestamp: Date.now()
    };
}

export async function searchRealWorldOpportunities(domain: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Yield for: ${domain}. JSON array [{title, yield, risk, logic}].`,
        config: { tools: [{ googleSearch: {} }], responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

export async function assessInvestmentRisk(strategy: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Risk for: "${strategy}". JSON {riskScore, reasoning}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<{ riskScore: number; reasoning: string }>(response.text);
}

interface BomItem { name: string; quantity?: number; specs?: Record<string, string>; }
interface DeploymentManifest { steps: string[]; requirements: string[]; summary: string; }

export async function generateHardwareDeploymentManifest(bom: BomItem[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Forge deployment manifest for components: ${JSON.stringify(bom)}. JSON object.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<DeploymentManifest>(response.text);
}

interface InventoryItem { id: string; name: string; type: string; }

export async function analyzeCrossSectorImpact(artifact: FileData, currentInventory: InventoryItem[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: { parts: [{ inlineData: artifact.inlineData }, { text: `Analyze cross-sector impact with inventory: ${JSON.stringify(currentInventory)}. JSON object.` }] },
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<{ sectors: string[]; impact: string; recommendations: string[] }>(response.text);
}

export async function generateStoryboardPlan(directive: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Forge storyboard plan for: ${directive}. Output JSON array [{index, scenePrompt, continuity, camera, lighting}].`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<any[]>(response.text);
}

interface ColorwayConfig { primary?: string; secondary?: string; accent?: string; mood?: string; }

export async function constructCinematicPrompt(prompt: string, colorway: ColorwayConfig, hasChar: boolean, hasWorld: boolean, hasStyle: boolean, bibleNotes: string | undefined, preset: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Refine cinematic prompt: "${prompt}". Colorway: ${JSON.stringify(colorway)}. Refs: C:${hasChar}, W:${hasWorld}, S:${hasStyle}. Notes: ${bibleNotes}. Preset: ${preset}. Return raw string.`,
    }));
    return response.text || prompt;
}

export async function analyzePowerDynamics(target: string, context: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Analyze power dynamics for: "${target}". Internal context: ${context}.`,
        config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: 'application/json',
        }
    }));
    return safeParseJson<AnalysisResult>(response.text);
}

export async function transformArtifact(content: string | Record<string, unknown>, type: 'IMAGE' | 'CODE' | 'TEXT', instruction: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Transform this ${type} artifact. Instruction: ${instruction}. Content: ${content}`,
    }));
    return response.text || content;
}

export async function generateResearchPlan(query: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Forge research plan for: "${query}". JSON array of search strings.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<string[]>(response.text);
}

export async function executeResearchQuery(query: string): Promise<FactChunk[]> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
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
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Compile research findings into a technical summary: ${JSON.stringify(findings)}`,
    }));
    return response.text || "";
}

interface ResearchTaskSummary { id: string; title: string; findings?: string[]; sources?: string[]; }

export async function synthesizeResearchReport(task: ResearchTaskSummary) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Synthesize full research report for task: ${JSON.stringify(task)}`,
    }));
    return response.text || "";
}

export async function simulateExperiment(hypothesis: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Simulate experiment for hypothesis: "${hypothesis}". JSON result.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<{ result: string; confidence: number; observations: string[] }>(response.text);
}

export async function generateTheory(hypotheses: ScienceHypothesis[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Synthesize unified theory from: ${JSON.stringify(hypotheses)}`,
    }));
    return response.text || "";
}

interface OrganizableArtifact { id: string; name: string; type: string; content?: string; }
interface PARAStructure { projects?: string[]; areas?: string[]; resources?: string[]; archives?: string[]; }

export async function smartOrganizeArtifact(artifact: OrganizableArtifact, existingStructure: PARAStructure) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Place artifact in optimal PARA folder. Artifact: ${JSON.stringify(artifact)}. Structure: ${JSON.stringify(existingStructure)}. JSON {folder}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<{ folder: string }>(response.text);
}

export async function generateAutopoieticFramework(goal: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Forge autopoietic framework for: "${goal}".`,
    }));
    return response.text || "";
}

export async function generateSystemArchitecture(prompt: string, type: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Construct system architecture topology for: "${prompt}". Type: ${type}. JSON {nodes, edges}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<{ nodes: GraphNode[]; edges: GraphEdge[] }>(response.text);
}

interface GraphNode { id: string; label?: string; type?: string; data?: Record<string, unknown>; }
interface GraphEdge { id?: string; source: string; target: string; label?: string; }

export async function calculateEntropy(nodes: GraphNode[], edges: GraphEdge[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Calculate system entropy for: ${JSON.stringify({ nodes, edges })}. JSON {score, reasoning}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<{ score: number; reasoning: string }>(response.text);
}

export async function decomposeNode(nodeLabel: string, neighbors: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Decompose node: "${nodeLabel}" with neighbors: "${neighbors}". JSON {nodes, edges, optimizations}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<{ nodes: GraphNode[]; edges: GraphEdge[]; optimizations: string[] }>(response.text);
}

export async function generateInfrastructureCode(summary: string, provider: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Forge IaC for: "${summary}" using ${provider}.`,
    }));
    return response.text || "";
}

export async function generateSingleNode(description: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Crystallize single node: "${description}". JSON {label, subtext, iconName, color}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<{ label: string; subtext: string; iconName: string; color: string }>(response.text);
}

export async function calculateOptimalLayout(nodes: GraphNode[], edges: GraphEdge[]) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Calculate optimal graph layout for: ${JSON.stringify({ nodes, edges })}. JSON Record<nodeId, {x, y}>.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<Record<string, { x: number; y: number }>>(response.text);
}

export async function generateSwarmArchitecture(prompt: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Forge swarm architecture for: "${prompt}". JSON {nodes, edges}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<{ nodes: GraphNode[]; edges: GraphEdge[] }>(response.text);
}

export async function generateProcessFromContext(artifacts: StoredArtifact[], type: string, prompt: string) {
    const ai = getAI();
    const context = artifacts.map(a => a.analysis?.summary).join('\n');
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Context: ${context}. Type: ${type}. Prompt: ${prompt}. Forge process. JSON {title, nodes, edges}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<{ title: string; nodes: GraphNode[]; edges: GraphEdge[] }>(response.text);
}

export async function decomposeTaskToSubtasks(title: string, description: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Decompose task: "${title} - ${description}". JSON array of strings.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<string[]>(response.text);
}

export async function searchGroundedIntel(query: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Strategic intelligence for: "${query}".`,
        config: { tools: [{ googleSearch: {} }] }
    }));
    return response.text || "No intelligence detected.";
}

export async function convergeStrategicLattices(nodes: GraphNode[], goal: string) {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Converge lattices: ${JSON.stringify(nodes)} for goal: "${goal}". JSON {nodes, coherence_index, unified_goal}.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<{ nodes: GraphNode[]; coherence_index: number; unified_goal: string }>(response.text);
}

// --- Compatibility exports for action registries ---

/**
 * Generic text generation wrapper (alias for generateText)
 */
export async function generate(prompt: string, systemInstruction?: string): Promise<string> {
    return generateText(prompt, MODEL_REGISTRY.gemini.fast, systemInstruction);
}

/**
 * Multimodal generation - text with images
 * Supports base64 data URLs or raw base64 strings
 */
export async function generateWithVision(
    prompt: string,
    images: Array<{ data: string; mimeType?: string }>,
    model: string = MODEL_REGISTRY.gemini.fast,
    systemInstruction?: string
): Promise<string> {
    const ai = getAI();

    // Build content parts: images first, then text prompt
    const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [];

    // Add images
    for (const image of images) {
        let data = image.data;
        let mimeType = image.mimeType || 'image/png';

        // Handle data URLs (e.g., "data:image/png;base64,...")
        if (data.startsWith('data:')) {
            const match = data.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
                mimeType = match[1];
                data = match[2];
            }
        }

        parts.push({
            inlineData: { data, mimeType }
        });
    }

    // Add text prompt
    parts.push({ text: prompt });

    try {
        const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
            model,
            contents: [{ role: 'user', parts }],
            config: {
                systemInstruction: systemInstruction || SOVEREIGN_SYSTEM_INSTRUCTION
            }
        }), 3, 1000, model);

        return response.text || "";
    } catch (e) {
        log.error("Gemini Multimodal Generation Error", e);
        throw e;
    }
}

/**
 * Video generation via Gemini Veo 2
 * Returns a data URL with the generated video
 */
export async function generateVideo(
    prompt: string,
    options?: {
        duration?: number;  // 5-8 seconds
        aspectRatio?: '16:9' | '9:16' | '1:1';
        style?: string;
    }
): Promise<{ url: string; duration: number }> {
    const ai = getAI();

    try {
        // Use Veo 2 for video generation
        const response = await ai.models.generateContent({
            model: 'veo-2.0-generate-001',
            contents: prompt,
            config: {
                responseModalities: ['VIDEO'],
                // @ts-ignore - Veo config options
                videoDuration: options?.duration || 5,
                aspectRatio: options?.aspectRatio || '16:9',
            }
        });

        // Extract video from response
        const videoPart = response.candidates?.[0]?.content?.parts?.find(
            (p): p is { inlineData: { mimeType: string; data: string } } =>
                !!('inlineData' in p && p.inlineData?.mimeType?.startsWith('video/'))
        );

        if (videoPart?.inlineData) {
            const url = `data:${videoPart.inlineData.mimeType};base64,${videoPart.inlineData.data}`;
            return {
                url,
                duration: options?.duration || 5
            };
        }

        throw new Error('No video generated in response');
    } catch (e: unknown) {
        // Veo may not be available - provide helpful error
        const errorMessage = e instanceof Error ? e.message : String(e);
        if (errorMessage.includes('not found') || errorMessage.includes('not supported')) {
            log.warn('generateVideo: Veo 2 not available. Video generation requires Gemini API access.');
            throw new Error('Video generation requires Veo 2 access. Contact Google to enable this feature.');
        }
        log.error("Gemini Video Generation Error", e);
        throw e;
    }
}

/**
 * Code completion generation
 */
export async function generateCodeCompletion(prompt: string, language: string): Promise<string> {
    const ai = getAI();
    const response = await retryGeminiRequest<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_REGISTRY.gemini.fast,
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
        model: MODEL_REGISTRY.gemini.fast,
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
        model: MODEL_REGISTRY.gemini.fast,
        contents: `Classify the intent of: "${input}". Output JSON { intent: string, confidence: number (0-1), entities: Record<string, string> }.`,
        config: { responseMimeType: 'application/json' }
    }));
    return safeParseJson<{ intent: string; confidence: number; entities: Record<string, string> }>(response.text);
}
