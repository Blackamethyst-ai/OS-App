/**
 * MCP External Client Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MCPExternalClient,
  KNOWN_SERVERS,
  TOOL_CATALOGS,
} from '../genome/mcpClient';
import { MCPSkillServer } from '../genome/mcpServer';

describe('MCPExternalClient', () => {
  let client: MCPExternalClient;

  beforeEach(() => {
    MCPExternalClient.resetInstance();
    MCPSkillServer.resetInstance();
    client = MCPExternalClient.getInstance();
  });

  describe('Server Management', () => {
    it('should load known servers on init', () => {
      const servers = client.getServers();
      expect(servers.length).toBe(KNOWN_SERVERS.length);
      expect(servers.length).toBeGreaterThanOrEqual(6);
    });

    it('should list enabled servers', () => {
      const enabled = client.getEnabledServers();
      expect(enabled.length).toBe(KNOWN_SERVERS.filter((s) => s.enabled).length);
    });

    it('should add custom servers', () => {
      client.addServer({
        id: 'custom',
        name: 'Custom Server',
        type: 'stdio',
        endpoint: 'node custom-server.js',
        enabled: true,
        tags: ['custom'],
      });

      expect(client.getServers().length).toBe(KNOWN_SERVERS.length + 1);
    });

    it('should enable/disable servers', () => {
      expect(client.setServerEnabled('github', false)).toBe(true);
      const disabled = client.getServers().find((s) => s.id === 'github');
      expect(disabled?.enabled).toBe(false);
    });

    it('should return false for unknown server', () => {
      expect(client.setServerEnabled('nonexistent', false)).toBe(false);
    });
  });

  describe('Tool Discovery', () => {
    it('should discover GitHub tools', () => {
      const result = client.discoverTools('github');
      expect(result.tools.length).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
      expect(result.server.id).toBe('github');
    });

    it('should discover Supabase tools', () => {
      const result = client.discoverTools('supabase');
      expect(result.tools.length).toBeGreaterThan(0);
    });

    it('should discover ResearchGravity tools', () => {
      const result = client.discoverTools('researchgravity');
      expect(result.tools.length).toBeGreaterThan(0);
    });

    it('should discover UCW tools', () => {
      const result = client.discoverTools('researchgravity-ucw');
      expect(result.tools.length).toBeGreaterThan(0);
    });

    it('should handle unknown server gracefully', () => {
      const result = client.discoverTools('nonexistent');
      expect(result.tools).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should discover all tools from all servers', () => {
      const results = client.discoverAllTools();
      expect(results.length).toBe(client.getEnabledServers().length);
    });
  });

  describe('Skill Registration', () => {
    it('should register GitHub tools as skills', () => {
      const result = client.registerServerTools('github');
      expect(result.registered).toBeGreaterThan(0);
      expect(result.skipped).toBe(0);
    });

    it('should create SkillGenome with correct structure', () => {
      const githubTools = TOOL_CATALOGS.github;
      const skill = client.registerExternalTool(githubTools[0]);

      expect(skill.id).toMatch(/^ext_github_/);
      expect(skill.tags).toContain('external');
      expect(skill.tags).toContain('mcp');
      expect(skill.tags).toContain('github');
      expect(skill.origin.type).toBe('imported');
      expect(skill.origin.sourceAgent).toBe('github');
      expect(skill.portability.isPortable).toBe(false); // External tools can't transfer
      expect(skill.mcpResource.uri).toMatch(/^mcp:\/\/agent-genome\/skills\//);
    });

    it('should not duplicate skills on re-registration', () => {
      client.registerServerTools('github');
      const second = client.registerServerTools('github');
      expect(second.registered).toBe(0);
      expect(second.skipped).toBeGreaterThan(0);
    });

    it('should register all known tools', () => {
      const result = client.registerAllKnownTools();
      expect(result.total).toBeGreaterThan(0);
      expect(Object.keys(result.byServer).length).toBe(client.getEnabledServers().length);
    });

    it('should track registered skill IDs', () => {
      client.registerServerTools('github');
      const ids = client.getExternalSkillIds();
      expect(ids.length).toBeGreaterThan(0);
      expect(ids[0]).toMatch(/^ext_github_/);
    });
  });

  describe('Queries', () => {
    beforeEach(() => {
      client.registerAllKnownTools();
    });

    it('should find skills by server', () => {
      const githubSkills = client.findByServer('github');
      expect(githubSkills.length).toBeGreaterThan(0);
      githubSkills.forEach((id) => {
        expect(id).toMatch(/^ext_github_/);
      });
    });

    it('should find servers by tag', () => {
      const dbServers = client.findByTag('database');
      expect(dbServers.length).toBeGreaterThan(0);
      expect(dbServers[0].id).toBe('supabase');
    });

    it('should get total external tool count', () => {
      const count = client.getExternalToolCount();
      // Should have registered tools from all enabled servers
      expect(count).toBeGreaterThan(15);
    });

    it('should get discovery results', () => {
      client.discoverTools('github');
      const result = client.getDiscoveryResult('github');
      expect(result).toBeDefined();
      expect(result!.tools.length).toBeGreaterThan(0);
    });

    it('should generate summary', () => {
      const summary = client.getSummary();
      expect(summary.totalServers).toBeGreaterThanOrEqual(6);
      expect(summary.enabledServers).toBeGreaterThan(0);
      expect(summary.totalTools).toBeGreaterThan(0);
      expect(summary.registeredSkills).toBeGreaterThan(0);
      expect(summary.serverBreakdown.length).toBe(summary.totalServers);
    });
  });

  describe('Tool Catalog Coverage', () => {
    it('should have catalogs for all known servers', () => {
      for (const server of KNOWN_SERVERS) {
        expect(TOOL_CATALOGS[server.id]).toBeDefined();
        expect(TOOL_CATALOGS[server.id].length).toBeGreaterThan(0);
      }
    });

    it('should have valid tool schemas in all catalogs', () => {
      for (const [serverId, tools] of Object.entries(TOOL_CATALOGS)) {
        for (const tool of tools) {
          expect(tool.name).toBeTruthy();
          expect(tool.description).toBeTruthy();
          expect(tool.inputSchema).toBeDefined();
          expect(tool.inputSchema.type).toBe('object');
          expect(tool.serverId).toBe(serverId);
        }
      }
    });
  });
});
