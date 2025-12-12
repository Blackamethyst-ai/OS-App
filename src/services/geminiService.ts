
import { GoogleGenAI, Type, Schema, FunctionDeclaration, LiveServerMessage, Modality } from "@google/genai";
import { AspectRatio, ImageSize, AnalysisResult, BookDNA, AutopoieticFramework, ComponentRecommendation, ArtifactAnalysis, UserIntent, ArtifactNode, FileData, SearchResultItem, GovernanceSchema, SystemWorkflow, ProjectTopology, StructuredScaffold, WorkerAgent, SuggestedAction, ResearchTask } from '../types';
import { useAppStore } from '../store';

// --- Utility: Key Selection ---

export const promptSelectKey = async () => {
  if (window.aistudio && window.aistudio.openSelectKey) {
    await window.aistudio.openSelectKey();
  }
};

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Utility: File Conversion ---

export async function fileToGenerativePart(file: File): Promise<FileData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: { data: base64String, mimeType: file.type },
        name: file.name
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// --- Deep Research Agent (Interactions API Simulation) ---

export async function startDeepResearchTask(query: string) {
    const store = useAppStore.getState();
    const taskId = `research-${Date.now()}`;
    
    // 1. Init Task
    const newTask: ResearchTask = {
        id: taskId,
        query,
        status: 'QUEUED',
        progress: 0,
        logs: ['Task queued for background execution...'],
        timestamp: Date.now()
    };
    store.addResearchTask(newTask);

    try {
        // 2. Start Execution (Mocking "Background" nature by not awaiting immediately in UI thread logic if simpler, but here we define the flow)
        store.updateResearchTask(taskId, { status: 'RESEARCHING', progress: 10, logs: ['Agent "deep-research-pro" initialized.', 'Analyzing query intent...'] });
        
        const ai = getAI();
        
        // Phase 1: Planning & Search
        // We use gemini-3-pro-preview to simulate the deep research agent
        const planResponse = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `You are the Deep Research Agent (preview-12-2025). 
            GOAL: Create a high-level research plan for: "${query}".
            Return a list of 3-5 specific search queries to execute to get comprehensive coverage.`,
            config: { responseMimeType: 'application/json' }
        });
        
        store.updateResearchTask(taskId, { progress: 30, logs: ['Research plan generated.', 'Executing parallel search vectors...'] });
        
        // Phase 2: Execution (Real Search)
        const researchPrompt = `
        Perform a Deep Research task on: "${query}".
        
        Use the 'googleSearch' tool to find detailed, factual, and up-to-date information.
        Synthesize findings into a comprehensive report.
        
        Structure the report with:
        1. Executive Summary
        2. Key Findings (with citations/sources)
        3. Timeline/History (if applicable)
        4. Technical/Deep Analysis
        5. Future Outlook / Conclusion
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: researchPrompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        store.updateResearchTask(taskId, { status: 'SYNTHESIZING', progress: 80, logs: ['Aggregating sources...', 'Drafting final report...'] });
        
        // Artificial delay to feel "Deep"
        await new Promise(r => setTimeout(r, 1500));

        const resultText = response.text || "Research completed but no text generated.";
        
        // Phase 3: Completion
        store.updateResearchTask(taskId, { 
            status: 'COMPLETED', 
            progress: 100, 
            logs: ['Research Complete.', 'Report filed to memory.'],
            result: resultText
        });

        store.addLog('SUCCESS', `RESEARCH: Task "${query.substring(0, 20)}..." completed.`);

    } catch (err: any) {
        console.error("Deep Research Failed", err);
        store.updateResearchTask(taskId, { 
            status: 'FAILED', 
            progress: 0, 
            logs: [`FATAL ERROR: ${err.message}`] 
        });
        store.addLog('ERROR', `RESEARCH_FAIL: ${err.message}`);
    }
}

// --- 1. Image Generation (Asset Studio) ---

export async function generateArchitectureImage(
  prompt: string, 
  aspectRatio: AspectRatio = AspectRatio.RATIO_16_9, 
  size: ImageSize = ImageSize.SIZE_1K,
  referenceImage?: FileData
): Promise<string> {
  const ai = getAI();
  const isHighRes = size !== ImageSize.SIZE_1K;
  
  // Use Pro model for higher resolution or complex prompts
  const model = isHighRes ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  
  const parts: any[] = [{ text: prompt }];
  if (referenceImage) {
    parts.push(referenceImage);
  }

  const response = await ai.models.generateContent({
    model,
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio,
        // imageSize is only supported on Pro
        imageSize: isHighRes ? size : undefined 
      }
    }
  });

  // Extract image
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
}

export async function generateXRayVariant(fileData: FileData): Promise<string> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        fileData,
        { text: "Generate a technical X-Ray view of this hardware schematic. High contrast, blue and cyan wireframe aesthetic, transparent internal components." }
      ]
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("X-Ray generation failed");
}

export async function generateIsometricSchematic(fileData: FileData): Promise<string> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        fileData,
        { text: "Generate a high-fidelity 3D isometric engineering view of this schematic. Focus on the physical layout, vertical component placement, and spatial relationships. Use a clean, futuristic technical blueprint style with glowing white lines on a deep dark blue background to provide an intuitive understanding of the assembly." }
      ]
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Isometric generation failed");
}

// --- 2. Structured Analysis & Reasoning ---

export async function performGlobalSearch(query: string): Promise<SearchResultItem[]> {
  const ai = getAI();
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      results: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['NAV', 'ACTION', 'QUERY'] },
            meta: {
              type: Type.OBJECT,
              properties: {
                targetMode: { type: Type.STRING },
                actionType: { type: Type.STRING },
                payload: { type: Type.STRING } // JSON stringified payload
              }
            }
          }
        }
      }
    }
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `User Global Search Query: "${query}".
    Map this to relevant application actions, navigation targets, or knowledge queries.
    
    Available Modes:
    - DASHBOARD (Overview, Telemetry)
    - PROCESS_MAP (Governance, Logic Flow)
    - IMAGE_GEN (Asset Creation, 4K Renders)
    - POWER_XRAY (System Analysis, Diagnostics)
    - BIBLIOMORPHIC (Text Analysis, DNA Extraction)
    - HARDWARE_ENGINEER (Schematics, BOM, Thermal)
    - VOICE_MODE (Real-time Audio)
    - CODE_STUDIO (Code Generation)
    - MEMORY_CORE (Drive Organization, Artifacts)

    If the user asks to "Generate", "Create", or "Code", map to ACTION.
    If the user asks to "Go to", "Open", "Show", map to NAV.
    If the user asks "What is", "Explain", map to QUERY.
    
    Return at least 3 relevant results.
    `,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema
    }
  });

  const parsed = JSON.parse(response.text || "{}");
  return parsed.results || [];
}

export async function interpretIntent(input: string): Promise<UserIntent> {
  const ai = getAI();
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      action: { 
        type: Type.STRING, 
        enum: ['NAVIGATE', 'CONFIGURE_GOVERNANCE', 'CONFIGURE_IMAGE', 'ANALYZE_POWER', 'GENERATE_CODE', 'HARDWARE_SEARCH', 'ACTIVATE_VOICE'] 
      },
      target: { type: Type.STRING, description: "For navigation, the target module name (e.g. HARDWARE_ENGINEER)" },
      parameters: { 
        type: Type.OBJECT, 
        properties: {
            targetSystem: {type: Type.STRING},
            constraintLevel: {type: Type.STRING},
            outputTopology: {type: Type.STRING},
            aspectRatio: {type: Type.STRING},
            size: {type: Type.STRING},
            prompt: {type: Type.STRING},
            query: {type: Type.STRING},
            language: {type: Type.STRING},
            voiceName: {type: Type.STRING}
        }, 
        description: "Extracted parameters for the action" 
      },
      reasoning: { type: Type.STRING },
      payload: { type: Type.STRING }
    },
    required: ['action', 'reasoning']
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: input,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      systemInstruction: "You are an intent parser for the Sovereign OS. Map user commands to system actions. Example: 'Write a python script' -> GENERATE_CODE with language=Python."
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function predictNextActions(mode: string, lastLog?: string): Promise<SuggestedAction[]> {
    const ai = getAI();
    const schema: Schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                label: { type: Type.STRING, description: "Short title for the action button" },
                command: { type: Type.STRING, description: "The natural language instruction to execute this action" },
                iconName: { type: Type.STRING, enum: ['Zap', 'Code', 'Search', 'Cpu', 'Image', 'BookOpen', 'Shield', 'Terminal'] },
                reasoning: { type: Type.STRING }
            },
            required: ['label', 'command', 'iconName']
        }
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `
        The user is currently using the "${mode}" module of the Sovereign OS AI system.
        Last system log: "${lastLog || 'System Idle'}"
        
        Suggest 3 highly relevant, specific next actions the user might want to take. 
        These should be actionable commands like "Generate a 3D isometric view", "Analyze power consumption", "Write a React component", etc.
        Keep labels short (under 20 chars).
        `,
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    });

    const raw = JSON.parse(response.text || "[]");
    return raw.map((r: any, i: number) => ({ ...r, id: `suggest-${i}` }));
}

export async function analyzeSchematic(fileData: FileData): Promise<any> {
  const ai = getAI();
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      efficiencyRating: { type: Type.NUMBER },
      powerRails: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            voltage: { type: Type.STRING },
            source: { type: Type.STRING },
            category: { type: Type.STRING, enum: ['digital', 'analog', 'rf', 'power'] },
            status: { type: Type.STRING, enum: ['stable', 'noisy', 'critical'] }
          }
        }
      },
      issues: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            severity: { type: Type.STRING, enum: ['critical', 'warning', 'info'] },
            location: { type: Type.STRING },
            description: { type: Type.STRING },
            recommendation: { type: Type.STRING }
          }
        }
      }
    }
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [fileData, { text: "Analyze this electronic schematic for power integrity, design efficiency, and potential issues." }] },
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function researchComponents(query: string): Promise<ComponentRecommendation[]> {
  const ai = getAI();
  // We use googleSearch to get real component data
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Find electronic components matching: ${query}. Return a list of 3-5 top recommendations with specs.`,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  const searchResult = response.text;
  
  // Revised schema to use Key-Value Array instead of empty Object properties to avoid API errors
  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        partNumber: { type: Type.STRING },
        manufacturer: { type: Type.STRING },
        description: { type: Type.STRING },
        reasoning: { type: Type.STRING },
        specs: { 
            type: Type.ARRAY, 
            items: { 
                type: Type.OBJECT, 
                properties: { 
                    key: { type: Type.STRING }, 
                    value: { type: Type.STRING } 
                } 
            },
            description: "List of specifications as key-value pairs (e.g. Lead Time, Voltage, Stock Status)"
        }
      }
    }
  };

  const formatResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Extract component recommendations from this text into JSON. For specs, explicitely look for keys like 'Lead Time', 'Stock Status', 'Buy Link', 'Voltage', 'Package'.\n\n${searchResult}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema
    }
  });

  const rawResults = JSON.parse(formatResponse.text || "[]");
  
  if (!Array.isArray(rawResults)) return [];

  // Transform back to Record<string, string> for UI compatibility with robust checking
  return rawResults
    .filter((item: any) => item && typeof item === 'object')
    .map((item: any) => ({
      ...item,
      specs: (item.specs && Array.isArray(item.specs)) 
        ? item.specs.reduce((acc: any, curr: any) => ({ ...acc, [curr.key]: curr.value }), {}) 
        : {}
  }));
}

export async function analyzePowerDynamics(systemInput: string): Promise<AnalysisResult> {
  const ai = getAI();
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      sustainer: { type: Type.STRING },
      destroyer: { type: Type.STRING },
      extractor: { type: Type.STRING },
      insight: { type: Type.STRING },
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
      vectors: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            mechanism: { type: Type.STRING },
            vulnerability: { type: Type.STRING }
          }
        }
      }
    }
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview', // High reasoning
    contents: `Analyze the power dynamics of: "${systemInput}". Deconstruct its control structures, hidden costs, and vitality.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function generateMermaidDiagram(governance: any, files: FileData[]): Promise<string> {
  const ai = getAI();
  const parts: any[] = [{ text: `
    Generate a sophisticated Mermaid.js flowchart (graph TD or LR) representing the system architecture described in these files.
    
    SYSTEM GOVERNANCE:
    - Target System: ${governance.targetSystem}
    - Constraint Level: ${governance.constraintLevel}
    - Topology: ${governance.outputTopology}

    INSTRUCTIONS:
    1. Analyze the input files to understand entities, data flows, and logical relationships.
    2. Group components into SUBGRAPHS based on functional areas (e.g., 'Client Layer', 'API Gateway', 'Microservices', 'Data Persistence').
    3. Use descriptive node labels (e.g., "Auth Service" instead of just "Auth").
    4. Apply specific styles using 'classDef' to differentiate component types:
       - Core/Logic: fill:#000,stroke:#9d4edd,stroke-width:2px,color:#fff (Class: core)
       - Data/Storage: fill:#000,stroke:#22d3ee,stroke-width:2px,color:#fff (Class: data)
       - Interface/UI: fill:#000,stroke:#42be65,stroke-width:2px,color:#fff (Class: ui)
       - External/3rd Party: fill:#000,stroke:#f59e0b,stroke-width:2px,stroke-dasharray: 5 5,color:#fff (Class: ext)
    5. Assign classes to nodes using 'class NODE_ID className'.
    6. Ensure the syntax is strictly valid Mermaid code.
    7. Do NOT include markdown code blocks. Return ONLY the raw code string.
    ` 
  }];
  
  files.forEach(f => parts.push(f));

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts }
  });

  let code = response.text || '';
  // Cleanup markdown if present (redundant check, but safe)
  code = code.replace(/```mermaid/g, '').replace(/```/g, '').trim();
  return code;
}

export async function repairMermaidSyntax(brokenCode: string, errorMessage: string): Promise<string> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Fix the following Mermaid.js diagram code. It produced an error: "${errorMessage}".
    
    BROKEN CODE:
    ${brokenCode}
    
    Return ONLY the corrected raw Mermaid code. No markdown. No explanations.
    `,
  });
  
  let code = response.text || brokenCode;
  code = code.replace(/```mermaid/g, '').replace(/```/g, '').trim();
  return code;
}

export async function generateCode(prompt: string, language: string = 'typescript', model: string = 'gemini-2.5-flash'): Promise<string> {
  const ai = getAI();
  const systemInstruction = `You are an elite software architect and developer. 
  Generate high-quality, production-ready ${language} code based on the user's prompt. 
  Provide ONLY the code block if possible, or minimal explanation. 
  If the request implies multiple files, combine them or use comments to separate.
  Ensure the code is clean, efficient, and well-documented.
  Use a "Cyberpunk" or "Sci-Fi" styling for any UI components if applicable to the request.`;

  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: {
      systemInstruction: systemInstruction,
    }
  });

  // Strip Markdown
  let code = response.text || '';
  code = code.replace(/```[a-z]*\n/gi, '').replace(/```/g, '').trim();
  return code;
}

export async function fixCode(code: string, error: string, language: string): Promise<string> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Fix the following ${language} code based on the runtime error provided.
    
    CODE:
    ${code}
    
    ERROR:
    ${error}
    
    Return ONLY the corrected code. No markdown wrapping if possible.
    `,
  });
  
  let fixed = response.text || code;
  fixed = fixed.replace(/```[a-z]*\n/gi, '').replace(/```/g, '').trim();
  return fixed;
}

export async function formatCode(code: string, language: string): Promise<string> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `You are a code formatter. Format the following ${language} code strictly following standard style guidelines (e.g. Prettier, PEP8). 
    Do not change the logic. Return ONLY the raw formatted code. Do not wrap in markdown.\n\n${code}`,
  });
  
  let formatted = response.text || code;
  // Cleanup if model adds markdown despite instructions
  formatted = formatted.replace(/^```[a-z]*\n/i, '').replace(/```$/, '').trim();
  return formatted;
}

export async function simulateCodeExecution(code: string, language: string): Promise<string> {
  const ai = getAI();
  const systemInstruction = `You are a Neural Runtime Environment. 
  Your task is to SIMULATE the execution of the provided code in a ${language} environment.
  
  PREDICT the standard output (stdout) and standard error (stderr).
  If the code has logic errors, simulate the crash or error message.
  If the code starts a server, simulate the boot log.
  If the code has print statements, simulate them.
  
  DO NOT explain the code. DO NOT generate new code.
  RETURN ONLY THE SIMULATED TERMINAL OUTPUT.
  Format it to look like a real terminal (e.g., timestamps, log levels [INFO], [ERROR], [WARN]).`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Execute this code simulation:\n\n${code}`,
    config: {
      systemInstruction: systemInstruction,
    }
  });

  return response.text || "> Execution finished with no output.";
}

export async function chatWithFiles(message: string, history: any[], files: FileData[], systemContext?: string): Promise<string> {
  const ai = getAI();
  const parts: any[] = [];
  files.forEach(f => parts.push(f));
  parts.push({ text: message });
  
  const contents = [
    ...history.map(h => ({ role: h.role, parts: h.parts })),
    { role: 'user', parts }
  ];

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: contents,
    config: {
      systemInstruction: systemContext || "You are a specialized analysis engine. Provide concise, technical answers."
    }
  });

  return response.text || "";
}

export async function generateAudioOverview(files: FileData[]): Promise<string> {
  const ai = getAI();
  
  // 1. Generate Summary
  const parts: any[] = [{ text: "Generate a concise 30-second audio script summarizing the key architectural points of these documents. Keep it punchy and professional." }];
  files.forEach(f => parts.push(f));

  const scriptResp = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts }
  });
  const script = scriptResp.text;

  // 2. Generate Audio
  const audioResp = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-tts',
    contents: { parts: [{ text: script }] },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
      }
    }
  });

  const base64Audio = audioResp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Audio generation failed");
  
  return `data:audio/wav;base64,${base64Audio}`; 
}

export async function classifyArtifact(fileData: FileData): Promise<ArtifactAnalysis> {
  const ai = getAI();
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      classification: { type: Type.STRING },
      ambiguityScore: { type: Type.NUMBER },
      entities: { type: Type.ARRAY, items: { type: Type.STRING } },
      summary: { type: Type.STRING }
    }
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [fileData, { text: "Classify this document artifact." }] },
    config: { responseMimeType: 'application/json', responseSchema: schema }
  });

  return JSON.parse(response.text || "{}");
}

export async function generateAutopoieticFramework(fileData: FileData, governance?: GovernanceSchema): Promise<AutopoieticFramework> {
  const ai = getAI();
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
        framework_identity: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, acronym: { type: Type.STRING }, philosophical_origin: { type: Type.STRING } } },
        operational_logic: { 
            type: Type.ARRAY, 
            items: { 
                type: Type.OBJECT, 
                required: ["step", "designation", "execution_vector"],
                properties: { 
                    step: { type: Type.STRING }, 
                    designation: { type: Type.STRING }, 
                    execution_vector: { type: Type.STRING } 
                } 
            } 
        },
        governance_mandate: { type: Type.STRING },
        visual_signature: { type: Type.OBJECT, properties: { color_hex: { type: Type.STRING }, icon_metaphor: { type: Type.STRING } } }
    }
  };

  let prompt = "Derive an Autopoietic Framework from this text. Create a philosophical self-organizing system model. The operational_logic should contain at least 4 distinct steps.";
  
  if (governance) {
    prompt += `\n\nSYSTEM GOVERNANCE ALIGNMENT:\nTarget System: ${governance.targetSystem}\nConstraint Level: ${governance.constraintLevel}\nTopology: ${governance.outputTopology}\nDirectives: ${governance.additionalDirectives}\n\nEnsure the framework identity and logic reflect these governance constraints.`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: [fileData, { text: prompt }] },
    config: { responseMimeType: 'application/json', responseSchema: schema }
  });

  return JSON.parse(response.text || "{}");
}

export async function analyzeBookDNA(fileData: FileData): Promise<BookDNA> {
  const ai = getAI();
  
  const schema: Schema = {
    type: Type.OBJECT,
    required: ["title", "author", "kernelIdentity", "axioms", "modules"],
    properties: {
      title: { type: Type.STRING },
      author: { type: Type.STRING },
      extractionRate: { type: Type.NUMBER },
      toneAnalysis: { type: Type.STRING },
      systemPrompt: { type: Type.STRING },
      axioms: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            concept: { type: Type.STRING },
            codeSnippet: { type: Type.STRING }
          }
        }
      },
      modules: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['UI', 'LOGIC', 'DATABASE', 'KERNEL'] },
            reasoning: { type: Type.STRING }
          }
        }
      },
      kernelIdentity: {
        type: Type.OBJECT,
        required: ["designation", "primeDirective", "architecturalPhilosophy"],
        properties: {
          designation: { type: Type.STRING },
          architecturalPhilosophy: { type: Type.STRING },
          primeDirective: { type: Type.STRING },
          status: { type: Type.STRING },
          contextIngestion: { type: Type.STRING }
        }
      },
      architectureProposal: {
        type: Type.OBJECT,
        properties: {
          projectCodename: { type: Type.STRING },
          overview: { type: Type.STRING },
          systemCore: { 
              type: Type.OBJECT,
              properties: {
                   cognitiveEngine: {
                       type: Type.OBJECT,
                       properties: {
                           architectureType: { type: Type.STRING },
                           components: { 
                               type: Type.OBJECT,
                               properties: {
                                   workingMemory: { type: Type.OBJECT, properties: { function: { type: Type.STRING } } },
                                   proceduralMemory: { type: Type.OBJECT, properties: { function: { type: Type.STRING } } },
                                   decisionCycle: { 
                                       type: Type.OBJECT, 
                                       properties: {
                                           observation: { type: Type.STRING },
                                           orientation: { type: Type.STRING },
                                           decision: { type: Type.STRING },
                                           action: { type: Type.STRING }
                                       } 
                                   }
                               }
                           }
                       }
                   },
                   controlStructures: { type: Type.OBJECT, properties: {
                       hierarchicalController: { type: Type.OBJECT, properties: { layers: { type: Type.ARRAY, items: { type: Type.STRING } } } }
                   } }
              }
          },
          peripheralInterface: { 
            type: Type.OBJECT, 
            properties: {
                virtualSensorArray: { type: Type.OBJECT, properties: { description: { type: Type.STRING } } },
                characterIotBridge: { type: Type.OBJECT, properties: { concept: { type: Type.STRING } } },
                mixedRealityRenderer: { type: Type.OBJECT, properties: { function: { type: Type.STRING } } }
            }
          },
          ethicalRootkit: { type: Type.OBJECT, properties: { status: {type: Type.STRING}, mandates: {type: Type.ARRAY, items: {type: Type.STRING}} } }
        }
      }
    }
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: [fileData, { text: "Analyze the DNA of this book. Extract axioms, propose system modules, and define a kernel identity." }] },
    config: { 
        responseMimeType: 'application/json',
        responseSchema: schema
    } 
  });
  
  // Extract JSON from markdown block if present
  let text = response.text || "{}";
  if (text.startsWith("```json")) text = text.replace(/```json|```/g, "");
  const result = JSON.parse(text);
  
  // Defensive: Ensure kernelIdentity exists even if model hallucinations occur
  if (!result.kernelIdentity) {
      result.kernelIdentity = {
          designation: "UNKNOWN_KERNEL",
          primeDirective: "NO_DATA",
          architecturalPhilosophy: "UNDEFINED",
          status: "ERROR",
          contextIngestion: "FAILED"
      };
  }
  
  return result;
}

export async function calculateEntropy(files: FileData[]): Promise<number> {
    const ai = getAI();
    const fileNames = files.map(f => f.name).join(', ');
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analyze this list of filenames for disorganization, inconsistency, and lack of structure. Return a single number between 0 and 100, where 100 is maximum entropy (total chaos) and 0 is perfect order. Only return the number. Filenames: ${fileNames}`
    });
    
    const score = parseInt(response.text?.trim() || "0");
    return isNaN(score) ? 50 : score;
}

export async function generateStructuredWorkflow(
    files: FileData[], 
    governance: GovernanceSchema, 
    type: 'DRIVE_ORG' | 'SYSTEM_ARCH' = 'DRIVE_ORG'
): Promise<SystemWorkflow> {
    const ai = getAI();
    
    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            structureTree: { type: Type.STRING, description: type === 'DRIVE_ORG' ? "ASCII representation of the ideal folder structure" : "ASCII representation of the system component hierarchy" },
            protocols: { 
                type: Type.ARRAY, 
                items: {
                    type: Type.OBJECT,
                    properties: {
                        rule: { type: Type.STRING },
                        reasoning: { type: Type.STRING }
                    }
                }
            },
            automationScript: { type: Type.STRING, description: type === 'DRIVE_ORG' ? "Bash or Shell script to create the directory structure" : "Deployment script (e.g. Docker Compose or Terraform) for the system" },
            processDiagram: { type: Type.STRING, description: "Mermaid.js flowchart code (graph TD) visualizing the workflow or system data flow." }
        },
        required: ['structureTree', 'protocols', 'automationScript', 'processDiagram']
    };

    const promptText = type === 'DRIVE_ORG' 
        ? `Analyze these files and the governance mandate to design a perfect "Drive Organization System". 
           1. Structure Tree: Create a logical, hierarchical ASCII folder structure optimized for retrieval.
           2. Protocols: Define strict File Naming Conventions (e.g. YYYY-MM-DD_Project_Type), Version Control rules, and Archival/Deletion policies.
           3. Automation: A shell script to generate this folder structure.`
        : `Analyze these artifacts and the governance mandate to design a robust "System Architecture".
           Define a clear Component Hierarchy and Data Flow protocols.
           The automation script should be a deployment manifest (like Docker Compose or Terraform) suitable for this architecture.`;

    const parts: any[] = [
        { text: `${promptText}
        
        GOVERNANCE:
        - System: ${governance.targetSystem}
        - Topology: ${governance.outputTopology}
        - Constraint: ${governance.constraintLevel}
        ` }
    ];
    files.forEach(f => parts.push(f));

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts },
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    });

    return JSON.parse(response.text || "{}");
}

export async function generateTaxonomy(items: string[]): Promise<{ category: string; items: string[] }[]> {
    const ai = getAI();
    const schema: Schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                category: { type: Type.STRING, description: "Logical folder name (e.g. 'Source Code', 'Assets', 'Docs')" },
                items: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Exact names of items belonging to this category" }
            }
        }
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Organize the following items into a logical directory structure. Create semantically meaningful categories.\n\nItems:\n${items.join('\n')}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    });

    return JSON.parse(response.text || "[]");
}

// --- Architect Mode Upgrades ---

export async function determineTopology(files: FileData[]): Promise<ProjectTopology> {
    const ai = getAI();
    
    // We force the model to think like the research paper authors
    const prompt = `
    Analyze these project artifacts. Calculate the "Domain Complexity (D)" based on:
    1. Sequential Interdependence (Do step B depend on step A?)
    2. Partial Observability (Is information hidden?)
    3. Tool Complexity (How many tools are needed?)

    Referencing the "Science of Scaling" principles:
    - If D < 0.4 (Low Complexity): Recommend DECENTRALIZED or INDEPENDENT.
    - If 0.4 < D < 0.7 (Structured): Recommend CENTRALIZED (High efficiency gain).
    - If D > 0.7 (Chaotic/Sequential): Recommend SINGLE-AGENT or STRICT HIERARCHY (to prevent -70% degradation).

    Return JSON.
    `;

    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            complexityScore: { type: Type.NUMBER },
            recommendedMode: { type: Type.STRING, enum: ['CENTRALIZED', 'DECENTRALIZED', 'INDEPENDENT', 'HYBRID', 'SINGLE-AGENT', 'STRICT HIERARCHY'] },
            reasoning: { type: Type.STRING },
            scalingFactor: { type: Type.NUMBER }
        },
        required: ['complexityScore', 'recommendedMode', 'reasoning']
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [...files, { text: prompt }] },
        config: { responseMimeType: 'application/json', responseSchema: schema }
    });

    return JSON.parse(response.text || "{}");
}

export async function generateScaffold(topology: ProjectTopology, governance: GovernanceSchema): Promise<StructuredScaffold> {
    const ai = getAI();
    
    // The scaffold changes physically based on the topology
    let structuralDirective = "";
    if (topology.recommendedMode === 'CENTRALIZED' || topology.recommendedMode === 'STRICT HIERARCHY') {
        structuralDirective = "Create a strictly hierarchical folder structure. MUST include an 'orchestrator/' directory and 'validation_gates/' to prevent error propagation (4.4x containment).";
    } else if (topology.recommendedMode === 'DECENTRALIZED') {
        structuralDirective = "Create a flat, module-based structure. MUST include 'shared_context/' and 'event_bus/' for peer-to-peer info fusion.";
    }

    const prompt = `
    Design the perfect system architecture and drive organization.
    TOPOLOGY: ${topology.recommendedMode} (Complexity D=${topology.complexityScore}).
    DIRECTIVE: ${structuralDirective}
    GOVERNANCE: ${governance.constraintLevel}

    Output:
    1. ASCII Tree Structure.
    2. Protocol Rules (e.g. "All merges require Orchestrator sign-off").
    3. A Bash script to generate this structure.
    `;

    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            tree: { type: Type.STRING },
            protocols: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { rule: { type: Type.STRING }, type: { type: Type.STRING } } } },
            script: { type: Type.STRING }
        },
        required: ['tree', 'protocols', 'script']
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: schema }
    });

    return JSON.parse(response.text || "{}");
}

// --- Swarm Intelligence (O(1) Parallelism) ---

export async function decomposeTask(prompt: string): Promise<WorkerAgent[]> {
    const ai = getAI();
    const schema: Schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                task: { type: Type.STRING, description: "Specific sub-task to execute" },
                role: { type: Type.STRING, description: "Role of the agent (e.g. Researcher, Coder)" }
            },
            required: ['task', 'role']
        }
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Break down this complex request into independent, parallelizable sub-tasks for a Multi-Agent Swarm. 
        Request: "${prompt}"
        Ensure tasks are atomic and can be executed simultaneously.`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    });

    const tasks = JSON.parse(response.text || "[]");
    return tasks.map((t: any, i: number) => ({
        id: `agent-${Date.now()}-${i}`,
        role: t.role,
        task: t.task,
        status: 'IDLE'
    }));
}

export async function executeAgentTask(agent: WorkerAgent): Promise<string> {
    const ai = getAI();
    // Simulate thinking/network time + actual generation
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are a ${agent.role}. Execute this task concisely: ${agent.task}`
    });
    return response.text || "No response generated.";
}

// --- 3. Live API (Voice Mode) ---

class LiveSessionHandler {
  private session: any = null;
  public onVolumeUpdate: (vol: number) => void = () => {};
  public onTranscriptUpdate: (role: 'user' | 'model', text: string) => void = () => {};
  public onDisconnect: () => void = () => {};
  
  // Generic Tool Handler Callback
  public onToolCall: (name: string, args: any) => Promise<any> = async () => ({ error: "Not implemented" });
  
  // Voice Command Listener
  public onCommand: (cmd: UserIntent) => void = () => {};

  private audioContext: AudioContext | null = null;
  private inputAudioContext: AudioContext | null = null; // Track input context
  private analyser: AnalyserNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;
  private inputDataArray: Uint8Array | null = null;
  private outputDataArray: Uint8Array | null = null;
  
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();

  async connect(voiceName: string, config?: any) {
    const ai = getAI();
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    // Setup Audio Output Analyser
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.outputDataArray = new Uint8Array(this.analyser.frequencyBinCount);
    
    // Setup Audio Input
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Use stored inputAudioContext
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const source = this.inputAudioContext.createMediaStreamSource(stream);
    
    // Setup Input Analyser
    this.inputAnalyser = this.inputAudioContext.createAnalyser();
    this.inputAnalyser.fftSize = 128;
    this.inputDataArray = new Uint8Array(this.inputAnalyser.frequencyBinCount);
    source.connect(this.inputAnalyser);

    // Define System Tools
    const controlSystemTool: FunctionDeclaration = {
        name: 'control_system',
        description: 'Control the application interface, navigate to modules, or execute system commands.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                action: { type: Type.STRING, enum: ['NAVIGATE', 'GENERATE_CODE', 'ANALYZE', 'SEARCH'], description: "The type of action to perform." },
                target: { type: Type.STRING, description: "The target module or object (e.g. 'DASHBOARD', 'HARDWARE', 'CODE_STUDIO')" },
                payload: { type: Type.STRING, description: "Additional parameters for the action (e.g. search query, prompt)" }
            },
            required: ['action']
        }
    };

    const telemetryTool: FunctionDeclaration = {
        name: 'get_telemetry',
        description: 'Get real-time system telemetry (CPU, Memory, Network, Temperature).',
        parameters: { type: Type.OBJECT, properties: {} }
    };

    const searchTool: FunctionDeclaration = {
        name: 'search_knowledge',
        description: 'Search the internal knowledge base / memory core for artifacts or information.',
        parameters: {
            type: Type.OBJECT,
            properties: { query: { type: Type.STRING, description: "The search query." } },
            required: ['query']
        }
    };

    // Default Tools
    const tools = [{ functionDeclarations: [controlSystemTool, telemetryTool, searchTool] }];
    
    // Merge config if provided (e.g. from AgoraPanel)
    const finalConfig = {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        tools: config?.tools || tools,
        systemInstruction: config?.systemInstruction || "You are the Voice Core of Sovereign OS. You can control the UI and execute commands. When asked to navigate or perform tasks, use the control_system tool. Use get_telemetry to check system status. Use search_knowledge to find information."
    };

    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: finalConfig,
      callbacks: {
          onopen: () => console.log('Session connected'),
          onmessage: (msg: LiveServerMessage) => this.handleMessage(msg),
          onclose: () => this.onDisconnect(),
          onerror: (err) => { console.error(err); this.onDisconnect(); }
      }
    });

    this.session = await sessionPromise;
    
    // Processor
    const scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    scriptProcessor.onaudioprocess = (e) => {
      if (!this.session) return;
      const inputData = e.inputBuffer.getChannelData(0);
      const base64Data = this.pcmToB64(inputData);
      // Send to model
      this.session.sendRealtimeInput({ media: { mimeType: "audio/pcm;rate=16000", data: base64Data } });
    };
    
    source.connect(scriptProcessor);
    scriptProcessor.connect(this.inputAudioContext.destination);

    this.analyzeLoop();
  }

  async handleMessage(msg: LiveServerMessage) {
    // Tool Calls (Function Calling)
    if (msg.toolCall) {
        for (const fc of msg.toolCall.functionCalls) {
            
            // --- Legacy Control System Handling ---
            if (fc.name === 'control_system') {
                let action = fc.args['action'] as string;
                if (action === 'SEARCH') action = 'HARDWARE_SEARCH'; // Alias

                const intent: UserIntent = {
                    action: action as any,
                    target: fc.args['target'] as any,
                    reasoning: "Voice Command Execution",
                    payload: fc.args['payload'] as string
                };
                
                this.onCommand(intent);
                
                this.session.sendToolResponse({
                    functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: { result: "Command Executed Successfully" }
                    }
                });
            } 
            // --- Generic Tool Handler (New) ---
            else {
                try {
                    const result = await this.onToolCall(fc.name, fc.args);
                    this.session.sendToolResponse({
                        functionResponses: {
                            id: fc.id,
                            name: fc.name,
                            response: { result }
                        }
                    });
                } catch (e: any) {
                    console.error("Tool execution failed", e);
                    this.session.sendToolResponse({
                        functionResponses: {
                            id: fc.id,
                            name: fc.name,
                            response: { error: e.message }
                        }
                    });
                }
            }
        }
    }

    // Audio Output
    const data = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (data) {
      await this.playAudio(data);
    }

    // Transcription
    if (msg.serverContent?.outputTranscription?.text) {
        this.onTranscriptUpdate('model', msg.serverContent.outputTranscription.text);
    }
    if (msg.serverContent?.inputTranscription?.text) {
        this.onTranscriptUpdate('user', msg.serverContent.inputTranscription.text);
    }
    
    // Interruptions
    if (msg.serverContent?.interrupted) {
        this.sources.forEach(s => s.stop());
        this.sources.clear();
        this.nextStartTime = 0;
    }
  }
  
  async playAudio(base64Data: string) {
    if (!this.audioContext) return;
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    const dataInt16 = new Int16Array(bytes.buffer);
    const buffer = this.audioContext.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    if (this.analyser) source.connect(this.analyser);
    source.connect(this.audioContext.destination);
    
    const now = this.audioContext.currentTime;
    const start = Math.max(this.nextStartTime, now);
    source.start(start);
    this.nextStartTime = start + buffer.duration;
    
    this.sources.add(source);
    source.onended = () => {
        this.sources.delete(source);
    };
  }

  pcmToB64(data: Float32Array) {
     const buffer = new ArrayBuffer(data.length * 2);
     const view = new DataView(buffer);
     for (let i = 0; i < data.length; i++) {
         const s = Math.max(-1, Math.min(1, data[i]));
         view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
     }
     return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }

  analyzeLoop() {
      const loop = () => {
          if (!this.session) return;
          if (this.analyser && this.outputDataArray) {
              this.analyser.getByteFrequencyData(this.outputDataArray);
              const avg = this.outputDataArray.reduce((a,b)=>a+b,0) / this.outputDataArray.length;
              this.onVolumeUpdate(avg); 
          }
          requestAnimationFrame(loop);
      };
      loop();
  }

  getInputFrequencies() {
      if (this.inputAnalyser && this.inputDataArray) {
          this.inputAnalyser.getByteFrequencyData(this.inputDataArray);
          return Array.from(this.inputDataArray);
      }
      return [];
  }

  getOutputFrequencies() {
      if (this.analyser && this.outputDataArray) {
          this.analyser.getByteFrequencyData(this.outputDataArray);
          return Array.from(this.outputDataArray);
      }
      return [];
  }

  disconnect() {
      if (this.session) {
          this.session.close();
      }
      this.session = null;
      
      // Defensively close output context
      if (this.audioContext) {
          if (this.audioContext.state !== 'closed') {
              this.audioContext.close().catch(e => console.warn("Output AudioContext close error:", e));
          }
          this.audioContext = null;
      }

      // Defensively close input context
      if (this.inputAudioContext) {
          if (this.inputAudioContext.state !== 'closed') {
              this.inputAudioContext.close().catch(e => console.warn("Input AudioContext close error:", e));
          }
          this.inputAudioContext = null;
      }
      
      this.onDisconnect();
      this.sources.clear();
  }
}

export const liveSession = new LiveSessionHandler();
