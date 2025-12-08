
import { GoogleGenAI } from "@google/genai";
import { ImageSize, AspectRatio, FileData, GovernanceSchema } from "../types";

// Helper to get client securely
const getClient = async (): Promise<GoogleGenAI> => {
  const aistudio = (window as any).aistudio;
  const hasKey = await aistudio?.hasSelectedApiKey();
  if (!hasKey) {
    throw new Error("API Key not selected. Please select a paid API key to continue.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const promptSelectKey = async () => {
  const aistudio = (window as any).aistudio;
  if (aistudio?.openSelectKey) {
    await aistudio.openSelectKey();
  }
};

export const generateArchitectureImage = async (
  prompt: string,
  aspectRatio: AspectRatio,
  size: ImageSize
): Promise<string> => {
  try {
    const ai = await getClient();
    const model = 'gemini-3-pro-image-preview';

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: size,
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned from Gemini.");
  } catch (error: any) {
    console.error("Image Generation Error:", error);
    throw error;
  }
};

export const generateMermaidDiagram = async (
  governance: GovernanceSchema,
  files: FileData[]
): Promise<string> => {
  try {
    const ai = await getClient();
    const model = 'gemini-3-pro-preview';

    const promptText = `
      GOVERNANCE DIRECTIVE:
      Target System: ${governance.targetSystem}
      Constraint Level: ${governance.constraintLevel}
      Desired Topology: ${governance.outputTopology}
      Additional Directives: ${governance.additionalDirectives}

      TASK:
      Analyze the provided artifacts and generate a VALID Mermaid.js diagram code that accurately reflects the Target System structure, adhering to the specified Topology and Constraints.
    `;

    const systemInstruction = `
      You are the Sovereign Architect, a high-precision systems engineer.
      
      RULES:
      1. Output ONLY the Mermaid code. No markdown blocks, no commentary.
      2. Strictly adhere to the 'outputTopology'.
         - Hierarchical -> mindmap or graph TD
         - Network -> graph LR or TD (highly interconnected)
         - Sequential -> sequenceDiagram or graph LR (linear)
         - Hub & Spoke -> mindmap or graph TD (central node)
      3. If 'Constraint Level' is 'Strict', ensure every node has a clear type/class and relationships are explicitly labeled.
      4. Ensure syntax is valid.
    `;

    const parts: any[] = [{ text: promptText }];
    files.forEach(file => {
      parts.push({
        inlineData: {
          data: file.inlineData.data,
          mimeType: file.inlineData.mimeType
        }
      });
    });

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        systemInstruction,
        temperature: governance.constraintLevel === 'Strict' ? 0.1 : 0.4, 
      }
    });

    const text = response.text || "";
    return text.replace(/```mermaid/g, '').replace(/```/g, '').trim();

  } catch (error: any) {
    console.error("Diagram Generation Error:", error);
    throw error;
  }
};

export const chatWithFiles = async (
  message: string, 
  history: { role: string, parts: { text: string }[] }[], 
  files: FileData[]
): Promise<string> => {
  try {
    const ai = await getClient();
    const model = 'gemini-2.5-flash';

    const parts: any[] = [{ text: message }];
    
    if (history.length === 0) {
        files.forEach(file => {
            parts.push({
                inlineData: {
                    data: file.inlineData.data,
                    mimeType: file.inlineData.mimeType
                }
            });
        });
    }

    const chat = ai.chats.create({
        model,
        history: history.map(h => ({
            role: h.role,
            parts: h.parts
        })),
        config: {
            systemInstruction: "You are the Tactical Oracle, a high-agency systems advisor. Answer concisely, use bullet points for action plans, and maintain a professional, slightly cyberpunk tone. You have access to the user's uploaded documents."
        }
    });

    const result = await chat.sendMessage({ message: parts });
    return result.text;

  } catch (error: any) {
      console.error("Chat Error:", error);
      throw error;
  }
}


export const generateAudioOverview = async (files: FileData[]): Promise<string> => {
  try {
    const ai = await getClient();
    const model = 'gemini-2.5-flash-preview-tts';

    const promptText = `
      Generate a "Deep Dive" podcast-style conversation between two hosts, "R" (Host 1) and "S" (Host 2).
      They should discuss the content of the attached files in an engaging, insightful, and slightly informal way, 
      like they are breaking down a complex topic for listeners.
      Start with a welcoming intro and cover the main points.
    `;

    const parts: any[] = [{ text: promptText }];
    files.forEach(file => {
      parts.push({
        inlineData: {
          data: file.inlineData.data,
          mimeType: file.inlineData.mimeType
        }
      });
    });

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: 'R',
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
              },
              {
                speaker: 'S',
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
              }
            ]
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("No audio data returned.");
    }

    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const wavBlob = pcmToWav(bytes, 24000);
    return URL.createObjectURL(wavBlob);

  } catch (error: any) {
    console.error("Audio Generation Error:", error);
    throw error;
  }
};

function pcmToWav(pcmData: Uint8Array, sampleRate: number) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const pcmView = new Uint8Array(buffer, 44);
  pcmView.set(pcmData);

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export const fileToGenerativePart = (file: File): Promise<FileData> => {
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
};
