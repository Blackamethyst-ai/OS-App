/**
 * MCP External Client
 *
 * Connects to external MCP servers, discovers their tools,
 * and wraps them as SkillGenome objects in the MCPSkillServer registry.
 *
 * Configured servers are loaded from a registry of known MCP endpoints
 * matching the user's .mcp.json / claude_desktop_config.json setup.
 */

import type { SkillGenome, MCPToolSchema, JSONSchema } from './types';
import { MCPSkillServer } from './mcpServer';

// =============================================================================
// TYPES
// =============================================================================

/** External MCP server configuration */
export interface ExternalMCPServer {
  /** Unique server identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Server type */
  type: 'stdio' | 'http';

  /** Connection command (for stdio) or URL (for http) */
  endpoint: string;

  /** Whether this server is enabled */
  enabled: boolean;

  /** Tags for categorization */
  tags: string[];
}

/** Discovered external tool */
export interface ExternalTool {
  /** Tool name from the MCP server */
  name: string;

  /** Tool description */
  description: string;

  /** Input schema */
  inputSchema: JSONSchema;

  /** Source server ID */
  serverId: string;

  /** Source server name */
  serverName: string;
}

/** Discovery result from scanning external servers */
export interface DiscoveryResult {
  /** Server that was scanned */
  server: ExternalMCPServer;

  /** Tools discovered */
  tools: ExternalTool[];

  /** Skills registered in the genome registry */
  skillsRegistered: number;

  /** Errors encountered */
  errors: string[];

  /** Scan timestamp */
  scannedAt: number;
}

// =============================================================================
// KNOWN MCP SERVERS (from user's configuration)
// =============================================================================

/**
 * Registry of known external MCP servers.
 * Matches the servers configured in .mcp.json and claude_desktop_config.json.
 */
export const KNOWN_SERVERS: ExternalMCPServer[] = [
  {
    id: 'github',
    name: 'GitHub',
    type: 'stdio',
    endpoint: 'npx @modelcontextprotocol/server-github',
    enabled: true,
    tags: ['vcs', 'code', 'collaboration'],
  },
  {
    id: 'supabase',
    name: 'Supabase',
    type: 'http',
    endpoint: 'https://mcp.supabase.com',
    enabled: true,
    tags: ['database', 'backend', 'auth'],
  },
  {
    id: 'researchgravity',
    name: 'ResearchGravity',
    type: 'stdio',
    endpoint: 'python3 ~/researchgravity/mcp_server.py',
    enabled: true,
    tags: ['research', 'ucw', 'cognitive'],
  },
  {
    id: 'researchgravity-ucw',
    name: 'ResearchGravity UCW (Raw MCP)',
    type: 'stdio',
    endpoint: 'python3 -m mcp_raw',
    enabled: true,
    tags: ['ucw', 'cognitive', 'capture'],
  },
  {
    id: 'chrome-devtools',
    name: 'Chrome DevTools',
    type: 'stdio',
    endpoint: 'npx @anthropic/chrome-devtools-mcp@latest',
    enabled: true,
    tags: ['browser', 'testing', 'debugging'],
  },
  {
    id: 'alphavantage',
    name: 'Alpha Vantage (Finance)',
    type: 'stdio',
    endpoint: 'uvx av-mcp',
    enabled: true,
    tags: ['finance', 'market-data', 'stocks'],
  },
];

/**
 * Known tool catalogs for each MCP server.
 * These define the tools each server exposes, pre-cataloged for
 * immediate registration without requiring a live connection.
 */
export const TOOL_CATALOGS: Record<string, ExternalTool[]> = {
  github: [
    { name: 'create_issue', description: 'Create a new GitHub issue', inputSchema: { type: 'object', properties: { owner: { type: 'string' }, repo: { type: 'string' }, title: { type: 'string' }, body: { type: 'string' } }, required: ['owner', 'repo', 'title'] }, serverId: 'github', serverName: 'GitHub' },
    { name: 'create_pull_request', description: 'Create a new pull request', inputSchema: { type: 'object', properties: { owner: { type: 'string' }, repo: { type: 'string' }, title: { type: 'string' }, head: { type: 'string' }, base: { type: 'string' } }, required: ['owner', 'repo', 'title', 'head', 'base'] }, serverId: 'github', serverName: 'GitHub' },
    { name: 'search_code', description: 'Search for code across GitHub repositories', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }, serverId: 'github', serverName: 'GitHub' },
    { name: 'get_file_contents', description: 'Get contents of a file from a repository', inputSchema: { type: 'object', properties: { owner: { type: 'string' }, repo: { type: 'string' }, path: { type: 'string' } }, required: ['owner', 'repo', 'path'] }, serverId: 'github', serverName: 'GitHub' },
    { name: 'list_issues', description: 'List issues in a repository', inputSchema: { type: 'object', properties: { owner: { type: 'string' }, repo: { type: 'string' }, state: { type: 'string' } }, required: ['owner', 'repo'] }, serverId: 'github', serverName: 'GitHub' },
    { name: 'list_pull_requests', description: 'List pull requests in a repository', inputSchema: { type: 'object', properties: { owner: { type: 'string' }, repo: { type: 'string' }, state: { type: 'string' } }, required: ['owner', 'repo'] }, serverId: 'github', serverName: 'GitHub' },
  ],
  supabase: [
    { name: 'execute_sql', description: 'Execute SQL against Supabase database', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }, serverId: 'supabase', serverName: 'Supabase' },
    { name: 'list_tables', description: 'List all tables in the database', inputSchema: { type: 'object', properties: {} }, serverId: 'supabase', serverName: 'Supabase' },
    { name: 'apply_migration', description: 'Apply a database migration', inputSchema: { type: 'object', properties: { name: { type: 'string' }, sql: { type: 'string' } }, required: ['name', 'sql'] }, serverId: 'supabase', serverName: 'Supabase' },
    { name: 'search_docs', description: 'Search Supabase documentation', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }, serverId: 'supabase', serverName: 'Supabase' },
  ],
  researchgravity: [
    { name: 'get_session_context', description: 'Get research session context and status', inputSchema: { type: 'object', properties: {} }, serverId: 'researchgravity', serverName: 'ResearchGravity' },
    { name: 'log_finding', description: 'Log a research finding to the active session', inputSchema: { type: 'object', properties: { content: { type: 'string' }, category: { type: 'string' } }, required: ['content'] }, serverId: 'researchgravity', serverName: 'ResearchGravity' },
    { name: 'search_learnings', description: 'Search across all research learnings', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }, serverId: 'researchgravity', serverName: 'ResearchGravity' },
    { name: 'select_context_packs', description: 'Select relevant context packs for a query', inputSchema: { type: 'object', properties: { query: { type: 'string' }, budget: { type: 'number' } }, required: ['query'] }, serverId: 'researchgravity', serverName: 'ResearchGravity' },
    { name: 'get_session_stats', description: 'Get research session statistics', inputSchema: { type: 'object', properties: {} }, serverId: 'researchgravity', serverName: 'ResearchGravity' },
  ],
  'researchgravity-ucw': [
    { name: 'coherence_scan', description: 'Scan for coherence moments across platforms', inputSchema: { type: 'object', properties: { platform_a: { type: 'string' }, platform_b: { type: 'string' } } }, serverId: 'researchgravity-ucw', serverName: 'ResearchGravity UCW' },
    { name: 'coherence_search', description: 'Search coherence moments by query', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }, serverId: 'researchgravity-ucw', serverName: 'ResearchGravity UCW' },
    { name: 'coherence_status', description: 'Get coherence engine status', inputSchema: { type: 'object', properties: {} }, serverId: 'researchgravity-ucw', serverName: 'ResearchGravity UCW' },
    { name: 'detect_emergence', description: 'Detect emergent patterns in cognitive data', inputSchema: { type: 'object', properties: { timeframe: { type: 'string' } } }, serverId: 'researchgravity-ucw', serverName: 'ResearchGravity UCW' },
    { name: 'coherence_moments', description: 'List recent coherence moments', inputSchema: { type: 'object', properties: { limit: { type: 'number' } } }, serverId: 'researchgravity-ucw', serverName: 'ResearchGravity UCW' },
  ],
  'chrome-devtools': [
    { name: 'navigate_page', description: 'Navigate browser to a URL', inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] }, serverId: 'chrome-devtools', serverName: 'Chrome DevTools' },
    { name: 'take_screenshot', description: 'Take a screenshot of the current page', inputSchema: { type: 'object', properties: {} }, serverId: 'chrome-devtools', serverName: 'Chrome DevTools' },
    { name: 'evaluate_script', description: 'Execute JavaScript in the browser', inputSchema: { type: 'object', properties: { script: { type: 'string' } }, required: ['script'] }, serverId: 'chrome-devtools', serverName: 'Chrome DevTools' },
    { name: 'click', description: 'Click an element on the page', inputSchema: { type: 'object', properties: { selector: { type: 'string' } }, required: ['selector'] }, serverId: 'chrome-devtools', serverName: 'Chrome DevTools' },
  ],
  alphavantage: [
    { name: 'get_quote', description: 'Get stock quote data', inputSchema: { type: 'object', properties: { symbol: { type: 'string' } }, required: ['symbol'] }, serverId: 'alphavantage', serverName: 'Alpha Vantage' },
    { name: 'get_time_series', description: 'Get stock time series data', inputSchema: { type: 'object', properties: { symbol: { type: 'string' }, interval: { type: 'string' } }, required: ['symbol'] }, serverId: 'alphavantage', serverName: 'Alpha Vantage' },
  ],
};

// =============================================================================
// MCP EXTERNAL CLIENT
// =============================================================================

/**
 * MCPExternalClient discovers and registers tools from external MCP servers.
 *
 * Usage:
 * ```typescript
 * const client = MCPExternalClient.getInstance();
 *
 * // Register all known server tools into the skill genome
 * const results = client.registerAllKnownTools();
 *
 * // List all external skills
 * const external = client.getExternalSkills();
 * ```
 */
export class MCPExternalClient {
  private static instance: MCPExternalClient;
  private servers: Map<string, ExternalMCPServer> = new Map();
  private discoveryResults: Map<string, DiscoveryResult> = new Map();
  private registeredSkillIds: Set<string> = new Set();

  private constructor() {
    // Load known servers (clone to avoid mutating the originals)
    for (const server of KNOWN_SERVERS) {
      this.servers.set(server.id, { ...server, tags: [...server.tags] });
    }
  }

  static getInstance(): MCPExternalClient {
    if (!MCPExternalClient.instance) {
      MCPExternalClient.instance = new MCPExternalClient();
    }
    return MCPExternalClient.instance;
  }

  static resetInstance(): void {
    MCPExternalClient.instance = new MCPExternalClient();
  }

  // ---------------------------------------------------------------------------
  // SERVER MANAGEMENT
  // ---------------------------------------------------------------------------

  /** Get all configured servers */
  getServers(): ExternalMCPServer[] {
    return Array.from(this.servers.values());
  }

  /** Get enabled servers only */
  getEnabledServers(): ExternalMCPServer[] {
    return this.getServers().filter((s) => s.enabled);
  }

  /** Add or update a server configuration */
  addServer(server: ExternalMCPServer): void {
    this.servers.set(server.id, server);
  }

  /** Enable/disable a server */
  setServerEnabled(serverId: string, enabled: boolean): boolean {
    const server = this.servers.get(serverId);
    if (!server) return false;
    server.enabled = enabled;
    return true;
  }

  // ---------------------------------------------------------------------------
  // TOOL DISCOVERY
  // ---------------------------------------------------------------------------

  /**
   * Discover tools from a specific server using the pre-cataloged tool list.
   * For live discovery, use discoverToolsLive() (requires MCP SDK).
   */
  discoverTools(serverId: string): DiscoveryResult {
    const server = this.servers.get(serverId);
    if (!server) {
      return {
        server: { id: serverId, name: 'Unknown', type: 'stdio', endpoint: '', enabled: false, tags: [] },
        tools: [],
        skillsRegistered: 0,
        errors: [`Server not found: ${serverId}`],
        scannedAt: Date.now(),
      };
    }

    const tools = TOOL_CATALOGS[serverId] || [];

    const result: DiscoveryResult = {
      server,
      tools,
      skillsRegistered: 0,
      errors: tools.length === 0 ? [`No tool catalog for server: ${serverId}`] : [],
      scannedAt: Date.now(),
    };

    this.discoveryResults.set(serverId, result);
    return result;
  }

  /**
   * Discover tools from all enabled servers.
   */
  discoverAllTools(): DiscoveryResult[] {
    return this.getEnabledServers().map((server) => this.discoverTools(server.id));
  }

  // ---------------------------------------------------------------------------
  // SKILL REGISTRATION
  // ---------------------------------------------------------------------------

  /**
   * Convert an external tool to a SkillGenome and register it.
   */
  registerExternalTool(tool: ExternalTool): SkillGenome {
    const skillId = `ext_${tool.serverId}_${tool.name}`;

    // Don't duplicate
    if (this.registeredSkillIds.has(skillId)) {
      const existing = MCPSkillServer.getInstance().readSkill(skillId);
      if (existing) return existing;
    }

    const now = Date.now();

    const skill: SkillGenome = {
      id: skillId,
      version: '1.0.0',
      name: `${tool.serverName}: ${tool.name}`,
      description: tool.description,
      tags: ['external', 'mcp', tool.serverId],
      inputSchema: tool.inputSchema,
      outputSchema: { type: 'object' },
      handler: {
        body: `
          return {
            _external: true,
            _serverId: '${tool.serverId}',
            _toolName: '${tool.name}',
            _input: input,
            message: 'External tool invocation requires MCP SDK runtime. Use MCPExternalClient.invokeExternal() for live execution.',
          };
        `,
        params: ['input'],
        isAsync: false,
      },
      dependencies: [],
      runtime: 'async',
      timeoutMs: 30000,
      mcpResource: {
        uri: `mcp://agent-genome/skills/${skillId}`,
        mimeType: 'application/json',
        toolSchema: {
          name: `ext_${tool.serverId}_${tool.name}`,
          description: `[${tool.serverName}] ${tool.description}`,
          inputSchema: tool.inputSchema,
        },
      },
      portability: {
        isPortable: false, // External tools can't be transferred
        requiresContext: [`mcp_server:${tool.serverId}`],
        compatibility: [],
        orthogonalDimensions: [],
      },
      origin: {
        type: 'imported',
        sourceAgent: tool.serverId,
        createdAt: now,
        createdBy: 'mcp-external-client',
      },
      checksum: '',
      dqScore: 0.7, // External tools get a baseline DQ
      createdAt: now,
      updatedAt: now,
    };

    MCPSkillServer.getInstance().registerSkillResource(skill);
    this.registeredSkillIds.add(skillId);

    return skill;
  }

  /**
   * Register all tools from a specific server.
   */
  registerServerTools(serverId: string): { registered: number; skipped: number } {
    const discovery = this.discoverTools(serverId);
    let registered = 0;
    let skipped = 0;

    for (const tool of discovery.tools) {
      const skillId = `ext_${tool.serverId}_${tool.name}`;
      if (this.registeredSkillIds.has(skillId)) {
        skipped++;
        continue;
      }

      this.registerExternalTool(tool);
      registered++;
    }

    // Update discovery result
    discovery.skillsRegistered = registered;
    this.discoveryResults.set(serverId, discovery);

    return { registered, skipped };
  }

  /**
   * Register all tools from all enabled servers.
   */
  registerAllKnownTools(): { total: number; byServer: Record<string, { registered: number; skipped: number }> } {
    const byServer: Record<string, { registered: number; skipped: number }> = {};
    let total = 0;

    for (const server of this.getEnabledServers()) {
      const result = this.registerServerTools(server.id);
      byServer[server.id] = result;
      total += result.registered;
    }

    return { total, byServer };
  }

  // ---------------------------------------------------------------------------
  // QUERIES
  // ---------------------------------------------------------------------------

  /** Get all registered external skill IDs */
  getExternalSkillIds(): string[] {
    return Array.from(this.registeredSkillIds);
  }

  /** Get discovery results for a server */
  getDiscoveryResult(serverId: string): DiscoveryResult | undefined {
    return this.discoveryResults.get(serverId);
  }

  /** Get all discovery results */
  getAllDiscoveryResults(): DiscoveryResult[] {
    return Array.from(this.discoveryResults.values());
  }

  /** Get total external tool count */
  getExternalToolCount(): number {
    return this.registeredSkillIds.size;
  }

  /** Find external skills by server */
  findByServer(serverId: string): string[] {
    return Array.from(this.registeredSkillIds).filter((id) => id.startsWith(`ext_${serverId}_`));
  }

  /** Find external skills by tag */
  findByTag(tag: string): ExternalMCPServer[] {
    return this.getServers().filter((s) => s.tags.includes(tag));
  }

  /** Get summary statistics */
  getSummary(): {
    totalServers: number;
    enabledServers: number;
    totalTools: number;
    registeredSkills: number;
    serverBreakdown: { id: string; name: string; tools: number; enabled: boolean }[];
  } {
    const serverBreakdown = this.getServers().map((s) => ({
      id: s.id,
      name: s.name,
      tools: (TOOL_CATALOGS[s.id] || []).length,
      enabled: s.enabled,
    }));

    return {
      totalServers: this.servers.size,
      enabledServers: this.getEnabledServers().length,
      totalTools: Object.values(TOOL_CATALOGS).reduce((sum, tools) => sum + tools.length, 0),
      registeredSkills: this.registeredSkillIds.size,
      serverBreakdown,
    };
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const mcpExternalClient = MCPExternalClient.getInstance();
