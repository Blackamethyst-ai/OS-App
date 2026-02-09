/**
 * VOICE NEXUS - Knowledge Injector
 *
 * Enriches voice prompts with context from the Agent Core knowledge base.
 * Injects relevant research sessions, findings, and agent expertise.
 */

import type { HiveAgent } from '../../types/domain/agents';
import type { KnowledgeContext, KnowledgeInjectorConfig } from './types';
import { AgentCoreClient } from '../../libs/agent-core-sdk/src/client';
import type { SearchResult, Finding } from '../../libs/agent-core-sdk/src/types';

// Default configuration
const DEFAULT_CONFIG: KnowledgeInjectorConfig = {
    maxSearchResults: 5,
    maxFindings: 3,
    includeFindingTypes: ['thesis', 'innovation', 'pattern', 'finding'],
    includeAgentExpertise: true,
};

class KnowledgeInjector {
    private client: AgentCoreClient;
    private config: KnowledgeInjectorConfig;
    private isAvailable: boolean = false;

    constructor(config: Partial<KnowledgeInjectorConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.client = new AgentCoreClient({
            baseUrl: import.meta.env.VITE_AGENT_CORE_URL || 'http://localhost:3847',
            project: 'os-app',
            timeout: 5000, // Short timeout for voice responsiveness
        });

        // Check availability on init
        this.checkAvailability();
    }

    /**
     * Check if the Agent Core API is available
     */
    async checkAvailability(): Promise<boolean> {
        try {
            this.isAvailable = await this.client.isHealthy();
            return this.isAvailable;
        } catch {
            this.isAvailable = false;
            return false;
        }
    }

    /**
     * Inject knowledge context into a query
     */
    async injectContext(
        query: string,
        agent?: HiveAgent
    ): Promise<KnowledgeContext> {
        // If API not available, return minimal context
        if (!this.isAvailable) {
            return {
                searchResults: [],
                injectedPrompt: this.buildMinimalPrompt(query, agent),
            };
        }

        try {
            // Fetch context in parallel
            const [searchResults, findings] = await Promise.all([
                this.fetchSearchResults(query),
                this.fetchFindings(),
            ]);

            // Build enriched prompt
            const injectedPrompt = this.buildEnrichedPrompt(
                query,
                searchResults,
                findings,
                agent
            );

            // Debug logging for knowledge injection
            if (import.meta.env.DEV) {
                console.log('[KnowledgeInjector] Query:', query);
                console.log('[KnowledgeInjector] Found:', searchResults.length, 'search results,', findings?.length || 0, 'findings');
                if (searchResults.length > 0) {
                    console.log('[KnowledgeInjector] Top result:', searchResults[0].content?.substring(0, 100) + '...');
                }
            }

            return {
                searchResults,
                findings,
                agentExpertise: agent?.expertise,
                injectedPrompt,
            };
        } catch (error) {
            console.warn('Knowledge injection failed, using minimal context:', error);
            return {
                searchResults: [],
                injectedPrompt: this.buildMinimalPrompt(query, agent),
            };
        }
    }

    /**
     * Fetch semantic search results
     */
    private async fetchSearchResults(query: string): Promise<SearchResult[]> {
        try {
            return await this.client.search(query, {
                limit: this.config.maxSearchResults,
            });
        } catch {
            return [];
        }
    }

    /**
     * Fetch relevant findings
     */
    private async fetchFindings(): Promise<Finding[]> {
        try {
            const results: Finding[] = [];

            // Fetch findings for each type
            for (const type of this.config.includeFindingTypes || []) {
                const findings = await this.client.searchFindings({
                    type,
                    limit: 1, // One of each type
                });
                results.push(...findings);
            }

            return results.slice(0, this.config.maxFindings);
        } catch {
            return [];
        }
    }

    /**
     * Build minimal prompt without knowledge injection
     */
    private buildMinimalPrompt(query: string, agent?: HiveAgent): string {
        if (agent?.expertise?.length) {
            return `
## Agent Context
You are ${agent.name}. Your expertise areas: ${agent.expertise.join(', ')}.

---
USER QUERY: ${query}
            `.trim();
        }

        return query;
    }

    /**
     * Build enriched prompt with knowledge context
     */
    private buildEnrichedPrompt(
        query: string,
        searchResults: SearchResult[],
        findings: Finding[],
        agent?: HiveAgent
    ): string {
        const sections: string[] = [];

        // Header
        sections.push('## KNOWLEDGE CONTEXT');

        // Relevant research (from semantic search)
        if (searchResults.length > 0) {
            sections.push('\n### Relevant Research');
            searchResults.forEach((r, i) => {
                const similarity = Math.round((r.similarity || 0) * 100);
                const truncatedContent = r.content.length > 200
                    ? r.content.substring(0, 200) + '...'
                    : r.content;
                sections.push(`${i + 1}. ${truncatedContent} (${similarity}% match)`);
            });
        }

        // Key findings
        if (findings.length > 0) {
            sections.push('\n### Key Findings');
            findings.forEach(f => {
                const type = f.type.toUpperCase();
                sections.push(`• [${type}] ${f.content}`);
            });
        }

        // Agent expertise
        if (this.config.includeAgentExpertise && agent?.expertise?.length) {
            sections.push(`\n### Agent Expertise: ${agent.expertise.join(', ')}`);
        }

        // Separator and query
        sections.push('\n---');
        sections.push(`USER QUERY: ${query}`);

        return sections.join('\n');
    }

    /**
     * Quick check if knowledge is relevant to query
     */
    async hasRelevantKnowledge(query: string, threshold = 0.5): Promise<boolean> {
        if (!this.isAvailable) return false;

        try {
            const results = await this.client.search(query, { limit: 1 });
            return results.length > 0 && (results[0].similarity || 0) >= threshold;
        } catch {
            return false;
        }
    }

    /**
     * Log an insight from voice interaction
     */
    async logInsight(content: string, type: string = 'finding'): Promise<void> {
        if (!this.isAvailable) return;

        try {
            await this.client.logInsight(content, type, ['voice-nexus', 'auto-captured']);
        } catch (error) {
            console.warn('Failed to log insight:', error);
        }
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<KnowledgeInjectorConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current availability status
     */
    getAvailability(): boolean {
        return this.isAvailable;
    }
}

// Singleton export
export const knowledgeInjector = new KnowledgeInjector();
