
import { Message, FileData } from '../../types';

/**
 * Defines the core unit of communication stored in the SessionLog.
 */
export interface Event {
  id: string;
  timestamp: number;
  type: 'user_message' | 'tool_call' | 'tool_result' | 'system_note' | 'error' | 'model_response';
  content: string; // The raw message or data payload
  toolName?: string; // Relevant for tool_call/tool_result types
  metadata?: any;
}

/**
 * Interface for long-term knowledge storage (e.g., Vector DB integration or Neural Vault).
 */
export interface LongTermMemory {
  // Method to retrieve relevant memories based on a query
  query(text: string, limit: number): Promise<string[]>;
  // Method to update/add new memories
  store(key: string, data: string): Promise<void>;
}

/**
 * Interface for external schemas or static data (Artifacts).
 */
export interface ExternalArtifactStore {
  getActiveArtifacts(): Promise<FileData[]>;
  getSchema(name: string): Promise<object>;
}

/**
 * The minimal, filtered, and highly relevant input for the LLM.
 * This directly maps to the Google Gen AI SDK's 'Content' or 'Part' structure.
 */
export interface WorkingContext {
  role: 'user' | 'model' | 'system' | 'function'; // Mapped to Gemini roles
  content: string;
}

/**
 * Scope(t): Defines the immediate context of the current turn.
 */
export interface CurrentScope {
  currentMessage: string;
  activeTools: string[]; // Tools currently available or requested
  mode: string; // Current App Mode (e.g., 'CODE_STUDIO')
}
