
import { ExternalArtifactStore } from './interfaces';
import { FileData } from '../../types';

/**
 * Unified store for external data:
 * 1. Active User Files (Artifacts)
 * 2. Tool Schemas (External Capabilities)
 */
export class UnifiedArtifactStore implements ExternalArtifactStore {
    private currentFiles: FileData[];
    private schemas: Map<string, object> = new Map();

    constructor(files: FileData[]) {
        this.currentFiles = files;
        
        // Seed with mock schemas as requested for the ToolSchemaProcessor
        this.schemas.set('calculator', {
            name: 'calculator',
            description: 'A tool to perform basic arithmetic operations.',
            parameters: {
                type: 'object',
                properties: { 
                    num1: { type: 'number' }, 
                    num2: { type: 'number' }, 
                    operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide'] } 
                },
                required: ['num1', 'num2', 'operation']
            }
        });
        
        this.schemas.set('weather_api', {
            name: 'get_current_weather',
            description: 'A tool to fetch weather data for a specified location.',
            parameters: {
                type: 'object',
                properties: { location: { type: 'string' } },
                required: ['location']
            }
        });
        
        this.schemas.set('search_tool', {
            name: 'google_search',
            description: 'Search the web for real-time information.',
            parameters: {
                type: 'object',
                properties: { query: { type: 'string' } },
                required: ['query']
            }
        });
    }

    async getActiveArtifacts(): Promise<FileData[]> {
        return this.currentFiles;
    }

    async getSchema(name: string): Promise<object> {
        const schema = this.schemas.get(name);
        if (!schema) {
            console.warn(`[ArtifactStore] Schema not found for: ${name}`);
            // Return empty object rather than throwing to prevent pipeline crash
            return {}; 
        }
        return Promise.resolve(schema);
    }
}
