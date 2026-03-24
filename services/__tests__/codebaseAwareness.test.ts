import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock logger before importing the module
vi.mock('../logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    }
}));

// We need to import the service fresh for each describe block
// The module creates a singleton on import, so we test via the exported instance
import { codebaseAwareness } from '../codebaseAwareness';
import { AppMode } from '../../types';

describe('CodebaseAwarenessService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('isReady', () => {
        it('should be initialized after construction', () => {
            expect(codebaseAwareness.isReady()).toBe(true);
        });
    });

    describe('getAllComponents', () => {
        it('should return all registered components', () => {
            const components = codebaseAwareness.getAllComponents();
            expect(components.length).toBeGreaterThan(0);
            expect(components.length).toBe(16); // 16 components in registry
        });

        it('should return a copy, not the original array', () => {
            const a = codebaseAwareness.getAllComponents();
            const b = codebaseAwareness.getAllComponents();
            expect(a).not.toBe(b);
            expect(a).toEqual(b);
        });
    });

    describe('getByMode', () => {
        it('should return component for a valid mode', () => {
            const result = codebaseAwareness.getByMode(AppMode.DASHBOARD);
            expect(result).toBeDefined();
            expect(result!.id).toBe('dashboard');
            expect(result!.displayName).toBe('Dashboard');
        });

        it('should return undefined for an invalid mode', () => {
            const result = codebaseAwareness.getByMode('NONEXISTENT' as AppMode);
            expect(result).toBeUndefined();
        });
    });

    describe('getById', () => {
        it('should return component by ID', () => {
            const result = codebaseAwareness.getById('code-studio');
            expect(result).toBeDefined();
            expect(result!.mode).toBe(AppMode.CODE_STUDIO);
        });

        it('should return undefined for unknown ID', () => {
            expect(codebaseAwareness.getById('nonexistent')).toBeUndefined();
        });
    });

    describe('getRoute', () => {
        it('should return route for a valid mode', () => {
            expect(codebaseAwareness.getRoute(AppMode.CODE_STUDIO)).toBe('/code');
        });

        it('should return undefined for an invalid mode', () => {
            expect(codebaseAwareness.getRoute('FAKE' as AppMode)).toBeUndefined();
        });
    });

    describe('findComponent', () => {
        it('should return null for empty query', () => {
            expect(codebaseAwareness.findComponent('')).toBeNull();
        });

        it('should find exact alias match with confidence 1.0', () => {
            const match = codebaseAwareness.findComponent('dashboard');
            expect(match).not.toBeNull();
            expect(match!.confidence).toBe(1.0);
            expect(match!.component.id).toBe('dashboard');
            expect(match!.matchedAlias).toBe('dashboard');
        });

        it('should find multi-word alias match', () => {
            const match = codebaseAwareness.findComponent('logic studio');
            expect(match).not.toBeNull();
            expect(match!.component.id).toBe('code-studio');
            expect(match!.confidence).toBeGreaterThanOrEqual(0.9);
        });

        it('should match case-insensitively', () => {
            const match = codebaseAwareness.findComponent('DASHBOARD');
            expect(match).not.toBeNull();
            expect(match!.component.id).toBe('dashboard');
        });

        it('should find partial word matches', () => {
            const match = codebaseAwareness.findComponent('coding stuff');
            expect(match).not.toBeNull();
            expect(match!.component.id).toBe('code-studio');
        });

        it('should match by capability when no alias matches', () => {
            // "orchestration" as a word appears only in capabilities, not as a standalone alias
            // but "orchestration" IS an alias for agent-control. Use a capability-only term.
            const match = codebaseAwareness.findComponent('need dialectic');
            expect(match).not.toBeNull();
            expect(match!.matchedCapability).toBeDefined();
            expect(match!.confidence).toBe(0.6);
        });

        it('should return null for completely unrelated query', () => {
            const match = codebaseAwareness.findComponent('xy');
            expect(match).toBeNull();
        });
    });

    describe('parseNavigationIntent', () => {
        it('should parse "go to dashboard"', () => {
            const result = codebaseAwareness.parseNavigationIntent('go to dashboard');
            expect(result).not.toBeNull();
            expect(result!.mode).toBe(AppMode.DASHBOARD);
        });

        it('should parse "navigate to code studio"', () => {
            const result = codebaseAwareness.parseNavigationIntent('navigate to code studio');
            expect(result).not.toBeNull();
            expect(result!.mode).toBe(AppMode.CODE_STUDIO);
        });

        it('should parse "open agents please"', () => {
            const result = codebaseAwareness.parseNavigationIntent('open agents please');
            expect(result).not.toBeNull();
            expect(result!.mode).toBe(AppMode.AGENT_CONTROL);
        });

        it('should return null for unrecognized intent', () => {
            const result = codebaseAwareness.parseNavigationIntent('go to xyzzy');
            expect(result).toBeNull();
        });

        it('should detect subtab mentions for CPB test', () => {
            const result = codebaseAwareness.parseNavigationIntent('go to cpb cascade');
            expect(result).not.toBeNull();
            expect(result!.mode).toBe(AppMode.CPB_TEST);
            expect(result!.subtab).toBe('cascade');
        });
    });

    describe('buildContext', () => {
        it('should build context string without current mode', () => {
            const context = codebaseAwareness.buildContext();
            expect(context).toContain('## Available UI Destinations');
            expect(context).toContain('Dashboard');
            expect(context).toContain('Code Studio');
        });

        it('should include current location when mode provided', () => {
            const context = codebaseAwareness.buildContext(AppMode.CODE_STUDIO);
            expect(context).toContain('## Current Location');
            expect(context).toContain('Code Studio');
            expect(context).toContain('code generation');
        });

        it('should include subtabs in context when present', () => {
            const context = codebaseAwareness.buildContext(AppMode.CPB_TEST);
            expect(context).toContain('Subtabs:');
            expect(context).toContain('cascade');
        });
    });

    describe('generateToolDefinitions', () => {
        it('should return 3 tool definitions', () => {
            const tools = codebaseAwareness.generateToolDefinitions();
            expect(tools).toHaveLength(3);
        });

        it('should include navigate_to_mode tool', () => {
            const tools = codebaseAwareness.generateToolDefinitions();
            const navTool = tools.find(t => t.name === 'navigate_to_mode');
            expect(navTool).toBeDefined();
            expect(navTool!.parameters.required).toContain('target');
        });

        it('should include search_codebase tool', () => {
            const tools = codebaseAwareness.generateToolDefinitions();
            const searchTool = tools.find(t => t.name === 'search_codebase');
            expect(searchTool).toBeDefined();
            expect(searchTool!.parameters.required).toContain('query');
        });

        it('should include get_component_info tool', () => {
            const tools = codebaseAwareness.generateToolDefinitions();
            const infoTool = tools.find(t => t.name === 'get_component_info');
            expect(infoTool).toBeDefined();
        });
    });

    describe('getFiles and getFolders (no graph loaded)', () => {
        it('should return empty array for getFiles when no graph loaded', () => {
            expect(codebaseAwareness.getFiles()).toEqual([]);
        });

        it('should return empty array for getFolders when no graph loaded', () => {
            expect(codebaseAwareness.getFolders()).toEqual([]);
        });
    });

    describe('getStats', () => {
        it('should return stats with 0 nodes/edges when no graph loaded', () => {
            const stats = codebaseAwareness.getStats();
            expect(stats.nodes).toBe(0);
            expect(stats.edges).toBe(0);
            expect(stats.components).toBe(16);
        });
    });

    describe('loadGraph', () => {
        it('should handle fetch failure gracefully', async () => {
            const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
            vi.stubGlobal('fetch', mockFetch);

            await codebaseAwareness.loadGraph();
            // Service should still work
            expect(codebaseAwareness.isReady()).toBe(true);
            expect(codebaseAwareness.getFiles()).toEqual([]);

            vi.unstubAllGlobals();
        });

        it('should load graph on successful fetch', async () => {
            const mockGraph = {
                nodes: [
                    { id: 'n1', label: 'file1.ts', type: 'file', path: '/src/file1.ts' },
                    { id: 'n2', label: 'src', type: 'folder', path: '/src' },
                ],
                edges: [{ source: 'n2', target: 'n1' }]
            };

            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockGraph),
            });
            vi.stubGlobal('fetch', mockFetch);

            await codebaseAwareness.loadGraph();

            const stats = codebaseAwareness.getStats();
            expect(stats.nodes).toBe(2);
            expect(stats.edges).toBe(1);

            const files = codebaseAwareness.getFiles();
            expect(files).toHaveLength(1);
            expect(files[0].label).toBe('file1.ts');

            const folders = codebaseAwareness.getFolders();
            expect(folders).toHaveLength(1);

            vi.unstubAllGlobals();
        });

        it('should filter files by folder', async () => {
            const mockGraph = {
                nodes: [
                    { id: 'n1', label: 'a.ts', type: 'file', path: '/src/a.ts' },
                    { id: 'n2', label: 'b.ts', type: 'file', path: '/lib/b.ts' },
                ],
                edges: []
            };

            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockGraph),
            });
            vi.stubGlobal('fetch', mockFetch);

            await codebaseAwareness.loadGraph();

            const srcFiles = codebaseAwareness.getFiles({ folder: '/src' });
            expect(srcFiles).toHaveLength(1);
            expect(srcFiles[0].label).toBe('a.ts');

            vi.unstubAllGlobals();
        });

        it('should filter files by type extension', async () => {
            const mockGraph = {
                nodes: [
                    { id: 'n1', label: 'a.ts', type: 'file', path: '/a.ts' },
                    { id: 'n2', label: 'b.css', type: 'file', path: '/b.css' },
                ],
                edges: []
            };

            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockGraph),
            });
            vi.stubGlobal('fetch', mockFetch);

            await codebaseAwareness.loadGraph();

            const tsFiles = codebaseAwareness.getFiles({ type: '.ts' });
            expect(tsFiles).toHaveLength(1);
            expect(tsFiles[0].label).toBe('a.ts');

            vi.unstubAllGlobals();
        });

        it('should handle non-ok response', async () => {
            const mockFetch = vi.fn().mockResolvedValue({ ok: false });
            vi.stubGlobal('fetch', mockFetch);

            await codebaseAwareness.loadGraph();
            // Should not crash, stats should remain as before or 0
            expect(codebaseAwareness.isReady()).toBe(true);

            vi.unstubAllGlobals();
        });
    });
});
