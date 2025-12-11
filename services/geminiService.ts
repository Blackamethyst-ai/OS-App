

import { GoogleGenAI, Type, Schema, FunctionDeclaration, LiveServerMessage, Modality } from "@google/genai";
import { AspectRatio, ImageSize, AnalysisResult, BookDNA, AutopoieticFramework, ComponentRecommendation, ArtifactAnalysis, UserIntent, ArtifactNode, FileData, SearchResultItem, GovernanceSchema } from '../types';

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
      reasoning: { type: Type.STRING }
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

export async function generateCode(prompt: string, language: string = 'typescript'): Promise<string> {
  const ai = getAI();
  const systemInstruction = `You are an elite software architect and developer. 
  Generate high-quality, production-ready ${language} code based on the user's prompt. 
  Provide ONLY the code block if possible, or minimal explanation. 
  If the request implies multiple files, combine them or use comments to separate.
  Ensure the code is clean, efficient, and well-documented.
  Use a "Cyberpunk" or "Sci-Fi" styling for any UI components if applicable to the request.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
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


// --- 3. Live API (Voice Mode) ---

class LiveSessionHandler {
  private session: any = null;
  public onVolumeUpdate: (vol: number) => void = () => {};
  public onTranscriptUpdate: (role: 'user' | 'model', text: string) => void = () => {};
  public onDisconnect: () => void = () => {};
  
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

  async connect(voiceName: string) {
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

    // Define System Control Tool
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

    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        inputAudioTranscription: {},
        tools: [{ functionDeclarations: [controlSystemTool] }],
        systemInstruction: "You are the Voice Core of Sovereign OS. You can control the UI and execute commands. When asked to navigate or perform tasks, use the control_system tool."
      },
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
            if (fc.name === 'control_system') {
                let action = fc.args['action'] as string;
                
                // Map generic actions to specific intent types if needed
                if (action === 'SEARCH') action = 'HARDWARE_SEARCH';

                const intent: UserIntent = {
                    action: action as any,
                    target: fc.args['target'] as any,
                    reasoning: "Voice Command Execution"
                };
                
                // Trigger callback
                this.onCommand(intent);

                // Send response back
                this.session.sendToolResponse({
                    functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: { result: "Command Executed Successfully" }
                    }
                });
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
