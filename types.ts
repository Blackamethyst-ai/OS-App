
export enum AppMode {
  DASHBOARD = 'DASHBOARD',
  PROCESS_MAP = 'PROCESS_MAP',
  IMAGE_GEN = 'IMAGE_GEN',
}

export enum ImageSize {
  SIZE_1K = '1K',
  SIZE_2K = '2K',
  SIZE_4K = '4K',
}

export enum AspectRatio {
  RATIO_1_1 = '1:1',
  RATIO_2_3 = '2:3',
  RATIO_3_2 = '3:2',
  RATIO_3_4 = '3:4',
  RATIO_4_3 = '4:3',
  RATIO_9_16 = '9:16',
  RATIO_16_9 = '16:9',
  RATIO_21_9 = '21:9',
}

export interface GeneratedImage {
  url: string;
  prompt: string;
  aspectRatio: AspectRatio;
  size: ImageSize;
}

export interface FileData {
  inlineData: {
    data: string;
    mimeType: string;
  };
  name: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export type DiagramType = 'mindmap' | 'flowchart' | 'sequence';

export type IngestionStatus = 'pending' | 'scanning' | 'verified' | 'rejected';

export interface ArtifactNode {
  id: string;
  file: File;
  status: IngestionStatus;
  data: FileData | null;
  error?: string;
}

export interface GovernanceSchema {
  targetSystem: string;
  constraintLevel: 'Permissive' | 'Standard' | 'Strict';
  outputTopology: 'Hierarchical' | 'Network' | 'Sequential' | 'Hub & Spoke';
  additionalDirectives: string;
}

export interface ProcessState {
  prompt: string; // Deprecated in UI, keeping for compatibility
  governance: GovernanceSchema;
  artifacts: ArtifactNode[];
  isLoading: boolean;
  generatedCode: string;
  chatHistory: Message[];
  audioUrl: string | null;
  error: string | null;
}
