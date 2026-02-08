/**
 * MCP Wire-Level Server
 *
 * Exposes the GenomeLayer's skill registry as an actual MCP server
 * that speaks the wire protocol. External tools and agents can
 * discover, list, and invoke skills via standard MCP transport.
 *
 * Entry point: `npx tsx services/organisms/genome/mcpWireServer.ts`
 *
 * Protocol: MCP Specification (stdio transport)
 * Resources: mcp://agent-genome/skills/{skillId}
 * Tools: genome_* (all registered skills)
 */

import { MCPSkillServer } from './mcpServer';
import { registerSeedSkills } from './seedSkills';
import { registerWhitepaperSkills } from './whitepaperSkills';
import { MCPExternalClient } from './mcpClient';
import type { SkillGenome } from './types';

// =============================================================================
// TYPES
// =============================================================================

/** JSON-RPC 2.0 message */
interface JsonRpcMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

// =============================================================================
// MCP WIRE SERVER
// =============================================================================

/**
 * MCPWireServer implements the MCP protocol over stdio.
 *
 * Supports:
 * - initialize / initialized
 * - tools/list
 * - tools/call
 * - resources/list
 * - resources/read
 */
export class MCPWireServer {
  private initialized = false;
  private buffer = '';

  constructor() {
    this.bootstrap();
  }

  /** Bootstrap the skill registry with seed + whitepaper skills */
  private bootstrap(): void {
    const server = MCPSkillServer.getInstance();
    const registered: SkillGenome[] = [];
    const registry = {
      register: (s: SkillGenome) => registered.push(s),
      getAll: () => registered,
    };

    registerSeedSkills(registry, server);
    registerWhitepaperSkills(registry, server);

    // Register external tools from known servers
    MCPExternalClient.getInstance().registerAllKnownTools();

    const stats = server.getServerStats();
    process.stderr.write(
      `[MCPWireServer] Bootstrapped: ${stats.totalSkills} skills (${stats.activeSkills} active)\n`
    );
  }

  /** Start listening on stdio */
  start(): void {
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk: string) => this.onData(chunk));
    process.stdin.on('end', () => process.exit(0));
    process.stderr.write('[MCPWireServer] Ready on stdio\n');
  }

  /** Handle incoming data (buffered line-delimited JSON) */
  private onData(chunk: string): void {
    this.buffer += chunk;

    // Process complete lines
    let newlineIdx: number;
    while ((newlineIdx = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIdx).trim();
      this.buffer = this.buffer.slice(newlineIdx + 1);

      if (line.length > 0) {
        try {
          const message = JSON.parse(line) as JsonRpcMessage;
          this.handleMessage(message);
        } catch (e) {
          this.sendError(null, -32700, 'Parse error');
        }
      }
    }
  }

  /** Route incoming JSON-RPC messages */
  private handleMessage(msg: JsonRpcMessage): void {
    if (!msg.method) {
      return; // Notification or response, ignore
    }

    switch (msg.method) {
      case 'initialize':
        this.handleInitialize(msg);
        break;
      case 'initialized':
        this.initialized = true;
        break;
      case 'tools/list':
        this.handleToolsList(msg);
        break;
      case 'tools/call':
        this.handleToolsCall(msg);
        break;
      case 'resources/list':
        this.handleResourcesList(msg);
        break;
      case 'resources/read':
        this.handleResourcesRead(msg);
        break;
      case 'ping':
        this.sendResult(msg.id, {});
        break;
      default:
        this.sendError(msg.id, -32601, `Method not found: ${msg.method}`);
    }
  }

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  private handleInitialize(msg: JsonRpcMessage): void {
    this.sendResult(msg.id, {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: { listChanged: false },
        resources: { subscribe: false, listChanged: false },
      },
      serverInfo: {
        name: 'agent-genome',
        version: '1.0.0',
      },
    });
  }

  private handleToolsList(msg: JsonRpcMessage): void {
    const tools = MCPSkillServer.getInstance().listAsTools();
    this.sendResult(msg.id, {
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    });
  }

  private async handleToolsCall(msg: JsonRpcMessage): Promise<void> {
    const params = msg.params || {};
    const toolName = params.name as string;
    const args = (params.arguments || {}) as Record<string, unknown>;

    if (!toolName) {
      this.sendError(msg.id, -32602, 'Missing tool name');
      return;
    }

    try {
      const result = await MCPSkillServer.getInstance().invokeByToolName(toolName, args);

      if (result.success) {
        this.sendResult(msg.id, {
          content: [{
            type: 'text',
            text: JSON.stringify(result.output, null, 2),
          }],
        });
      } else {
        this.sendResult(msg.id, {
          content: [{
            type: 'text',
            text: result.error || 'Tool execution failed',
          }],
          isError: true,
        });
      }
    } catch (error) {
      this.sendError(msg.id, -32603, `Tool execution error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private handleResourcesList(msg: JsonRpcMessage): void {
    const resources = MCPSkillServer.getInstance().listAsResources();
    this.sendResult(msg.id, {
      resources: resources.map((r) => ({
        uri: r.uri,
        name: r.name,
        description: r.description,
        mimeType: r.mimeType,
      })),
    });
  }

  private handleResourcesRead(msg: JsonRpcMessage): void {
    const params = msg.params || {};
    const uri = params.uri as string;

    if (!uri) {
      this.sendError(msg.id, -32602, 'Missing resource URI');
      return;
    }

    const skill = MCPSkillServer.getInstance().readSkillByUri(uri);
    if (!skill) {
      this.sendError(msg.id, -32602, `Resource not found: ${uri}`);
      return;
    }

    this.sendResult(msg.id, {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({
          id: skill.id,
          name: skill.name,
          description: skill.description,
          version: skill.version,
          tags: skill.tags,
          inputSchema: skill.inputSchema,
          outputSchema: skill.outputSchema,
          dqScore: skill.dqScore,
          origin: skill.origin,
        }, null, 2),
      }],
    });
  }

  // ---------------------------------------------------------------------------
  // TRANSPORT
  // ---------------------------------------------------------------------------

  private sendResult(id: string | number | undefined, result: unknown): void {
    this.send({ jsonrpc: '2.0', id: id ?? null, result });
  }

  private sendError(id: string | number | null | undefined, code: number, message: string): void {
    this.send({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });
  }

  private send(msg: unknown): void {
    const json = JSON.stringify(msg);
    process.stdout.write(json + '\n');
  }
}

// =============================================================================
// ENTRY POINT
// =============================================================================

// Only start server when run directly (not imported)
const isDirectExecution =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].includes('mcpWireServer') || process.argv[1].includes('mcp-wire-server'));

if (isDirectExecution) {
  const server = new MCPWireServer();
  server.start();
}

export default MCPWireServer;
