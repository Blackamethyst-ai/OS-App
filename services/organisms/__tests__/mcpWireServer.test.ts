/**
 * MCP Wire Server Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MCPWireServer } from '../genome/mcpWireServer';
import { MCPSkillServer } from '../genome/mcpServer';
import { MCPExternalClient } from '../genome/mcpClient';

describe('MCPWireServer', () => {
  beforeEach(() => {
    MCPSkillServer.resetInstance();
    MCPExternalClient.resetInstance();
  });

  it('should bootstrap with seed + whitepaper + external skills', () => {
    // MCPWireServer constructor calls bootstrap()
    const server = new MCPWireServer();
    const stats = MCPSkillServer.getInstance().getServerStats();

    // Should have seed (8) + whitepaper (6) + external tools
    expect(stats.totalSkills).toBeGreaterThanOrEqual(14);
    expect(stats.activeSkills).toBeGreaterThanOrEqual(14);
  });

  it('should list tools after bootstrap', () => {
    const server = new MCPWireServer();
    const mcpServer = MCPSkillServer.getInstance();
    const tools = mcpServer.listAsTools();

    // Verify both seed and whitepaper tools are listed
    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('genome_json_parse');
    expect(toolNames).toContain('genome_semantic_layer_extractor');
    expect(toolNames).toContain('genome_cognitive_asset_scorer');
    expect(toolNames).toContain('genome_coherence_detector');
  });

  it('should list resources after bootstrap', () => {
    const server = new MCPWireServer();
    const mcpServer = MCPSkillServer.getInstance();
    const resources = mcpServer.listAsResources();

    expect(resources.length).toBeGreaterThanOrEqual(14);

    // Verify URIs are valid
    for (const resource of resources) {
      expect(resource.uri).toMatch(/^mcp:\/\//);
      expect(resource.mimeType).toBe('application/json');
    }
  });

  it('should include external tools in listings', () => {
    const server = new MCPWireServer();
    const mcpServer = MCPSkillServer.getInstance();
    const tools = mcpServer.listAsTools();

    // Check for external tools (registered via MCPExternalClient)
    const externalTools = tools.filter((t) => t.name.includes('ext_'));
    expect(externalTools.length).toBeGreaterThan(0);
  });

  it('should invoke internal skills', async () => {
    const server = new MCPWireServer();
    const mcpServer = MCPSkillServer.getInstance();

    const result = await mcpServer.invokeByToolName('genome_dq_scorer', {
      validity: 0.8,
      specificity: 0.7,
      correctness: 0.9,
    });

    expect(result.success).toBe(true);
    expect(result.output).toBeDefined();
    const output = result.output as any;
    expect(output.score).toBeGreaterThan(0);
    expect(output.isActionable).toBe(true);
  });

  it('should invoke whitepaper skills', async () => {
    const server = new MCPWireServer();
    const mcpServer = MCPSkillServer.getInstance();

    const result = await mcpServer.invokeByToolName('genome_semantic_layer_extractor', {
      content: 'This is a novel approach to building distributed cognitive systems.',
      source: 'claude',
    });

    expect(result.success).toBe(true);
    const output = result.output as any;
    expect(output.data).toBeDefined();
    expect(output.light).toBeDefined();
    expect(output.instinct).toBeDefined();
  });

  it('should handle unknown tool invocation', async () => {
    const server = new MCPWireServer();
    const mcpServer = MCPSkillServer.getInstance();

    const result = await mcpServer.invokeByToolName('nonexistent_tool', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });
});
