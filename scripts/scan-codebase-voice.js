#!/usr/bin/env node

/**
 * CODEBASE VOICE SCANNER
 *
 * Scans the codebase and generates/updates codebase_graph.json with voice metadata.
 * This enables voice navigation and codebase awareness features.
 *
 * Usage:
 *   node scripts/scan-codebase-voice.js [rootDir] [--output path]
 *
 * Examples:
 *   node scripts/scan-codebase-voice.js
 *   node scripts/scan-codebase-voice.js ./ --output ./public/codebase_graph.json
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// Configuration
// =============================================================================

const CONFIG = {
    // Directories to scan
    includeDirs: [
        'components',
        'services',
        'hooks',
        'stores',
        'utils',
        'libs',
        'api',
        'types',
        'Visualizations'
    ],

    // Files to include
    includeExtensions: ['.ts', '.tsx', '.js', '.jsx'],

    // Directories to exclude
    excludeDirs: [
        'node_modules',
        'dist',
        'build',
        '.git',
        'coverage',
        '__tests__',
        '__mocks__'
    ],

    // Files to exclude
    excludeFiles: [
        '.d.ts',
        '.test.ts',
        '.test.tsx',
        '.spec.ts',
        '.spec.tsx'
    ],

    // Output path
    defaultOutput: './public/codebase_graph.json'
};

// =============================================================================
// File Scanner
// =============================================================================

function shouldIncludeFile(filePath) {
    const ext = path.extname(filePath);
    const basename = path.basename(filePath);

    // Check extension
    if (!CONFIG.includeExtensions.includes(ext)) {
        return false;
    }

    // Check excluded patterns
    for (const pattern of CONFIG.excludeFiles) {
        if (filePath.includes(pattern)) {
            return false;
        }
    }

    return true;
}

function shouldIncludeDir(dirPath) {
    const dirname = path.basename(dirPath);
    return !CONFIG.excludeDirs.includes(dirname);
}

function scanDirectory(dir, rootDir, nodes, edges, parentId = null) {
    if (!fs.existsSync(dir)) {
        return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(rootDir, fullPath);

        if (entry.isDirectory()) {
            if (!shouldIncludeDir(fullPath)) {
                continue;
            }

            // Create folder node
            const folderId = `folder-${relativePath.replace(/\//g, '-')}`;
            nodes.push({
                id: folderId,
                label: entry.name,
                type: 'folder',
                path: relativePath,
                parentId: parentId,
                isArchitectural: CONFIG.includeDirs.includes(entry.name)
            });

            // Recurse
            scanDirectory(fullPath, rootDir, nodes, edges, folderId);
        } else if (entry.isFile()) {
            if (!shouldIncludeFile(fullPath)) {
                continue;
            }

            // Create file node
            const fileId = `file-${nodes.length}`;
            const fileNode = {
                id: fileId,
                path: fullPath,
                relPath: relativePath,
                label: entry.name,
                type: 'file',
                parentId: parentId,
                radius: 0,
                risk: 'LOW',
                tier: 3
            };

            // Analyze file for metadata
            try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                const metadata = analyzeFile(content, entry.name);
                Object.assign(fileNode, metadata);
            } catch (e) {
                // Ignore read errors
            }

            nodes.push(fileNode);

            // Create edge to parent
            if (parentId) {
                edges.push({
                    source: parentId,
                    target: fileId,
                    type: 'contains'
                });
            }
        }
    }
}

// =============================================================================
// File Analyzer
// =============================================================================

function analyzeFile(content, filename) {
    const metadata = {
        radius: 0,
        risk: 'LOW',
        tier: 3,
        exports: [],
        imports: [],
        isComponent: false,
        isService: false,
        isHook: false,
        hasVoiceSupport: false
    };

    // Count lines (rough complexity indicator)
    const lines = content.split('\n').length;
    if (lines > 500) {
        metadata.radius = 5;
        metadata.risk = 'MEDIUM';
        metadata.tier = 1;
    } else if (lines > 200) {
        metadata.radius = 3;
        metadata.tier = 2;
    } else if (lines > 100) {
        metadata.radius = 2;
    }

    // Detect file type
    if (filename.endsWith('.tsx') || filename.endsWith('.jsx')) {
        if (content.includes('React.FC') || content.includes(': FC') || content.includes('function') && content.includes('return (')) {
            metadata.isComponent = true;
        }
    }

    if (filename.startsWith('use') && (filename.endsWith('.ts') || filename.endsWith('.tsx'))) {
        metadata.isHook = true;
    }

    if (filename.includes('Service') || filename.includes('service')) {
        metadata.isService = true;
    }

    // Detect voice support
    if (content.includes('useVoiceExpose') || content.includes('useVoiceAction') || content.includes('VoiceCore')) {
        metadata.hasVoiceSupport = true;
    }

    // Extract exports
    const exportMatches = content.match(/export\s+(?:default\s+)?(?:const|function|class|interface|type|enum)\s+(\w+)/g);
    if (exportMatches) {
        metadata.exports = exportMatches.map(m => {
            const match = m.match(/(\w+)$/);
            return match ? match[1] : null;
        }).filter(Boolean);
    }

    // Extract imports (just count them)
    const importCount = (content.match(/^import\s+/gm) || []).length;
    metadata.radius = Math.max(metadata.radius, Math.min(importCount / 5, 10));

    return metadata;
}

// =============================================================================
// Dependency Analyzer
// =============================================================================

function analyzeImports(nodes, rootDir) {
    const edges = [];
    const fileNodes = nodes.filter(n => n.type === 'file');
    const fileMap = new Map();

    // Build file map for quick lookup
    for (const node of fileNodes) {
        if (node.path) {
            const basename = path.basename(node.path, path.extname(node.path));
            fileMap.set(basename, node.id);
            fileMap.set(node.relPath, node.id);
        }
    }

    // Analyze imports in each file
    for (const node of fileNodes) {
        if (!node.path) continue;

        try {
            const content = fs.readFileSync(node.path, 'utf-8');
            const importRegex = /import\s+(?:[\w{},\s*]+from\s+)?['"]([^'"]+)['"]/g;
            let match;

            while ((match = importRegex.exec(content)) !== null) {
                const importPath = match[1];

                // Skip external packages
                if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
                    continue;
                }

                // Resolve the import path
                const resolvedPath = resolveImportPath(node.path, importPath, rootDir);
                if (resolvedPath) {
                    const basename = path.basename(resolvedPath, path.extname(resolvedPath));
                    const targetId = fileMap.get(basename) || fileMap.get(resolvedPath);

                    if (targetId && targetId !== node.id) {
                        edges.push({
                            source: node.id,
                            target: targetId,
                            type: 'imports'
                        });
                    }
                }
            }
        } catch (e) {
            // Ignore read errors
        }
    }

    return edges;
}

function resolveImportPath(fromFile, importPath, rootDir) {
    const fromDir = path.dirname(fromFile);
    let resolved;

    if (importPath.startsWith('.')) {
        resolved = path.resolve(fromDir, importPath);
    } else {
        resolved = path.resolve(rootDir, importPath);
    }

    // Try different extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'];
    for (const ext of extensions) {
        const withExt = resolved + ext;
        if (fs.existsSync(withExt)) {
            return path.relative(rootDir, withExt);
        }
    }

    if (fs.existsSync(resolved)) {
        return path.relative(rootDir, resolved);
    }

    return null;
}

// =============================================================================
// Main
// =============================================================================

function main() {
    const args = process.argv.slice(2);
    let rootDir = process.cwd();
    let outputPath = CONFIG.defaultOutput;

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--output' && args[i + 1]) {
            outputPath = args[i + 1];
            i++;
        } else if (!args[i].startsWith('-')) {
            rootDir = path.resolve(args[i]);
        }
    }

    console.log(`Scanning codebase at: ${rootDir}`);
    console.log(`Output path: ${outputPath}`);

    const nodes = [];
    const edges = [];

    // Scan each configured directory
    for (const dir of CONFIG.includeDirs) {
        const fullDir = path.join(rootDir, dir);
        if (fs.existsSync(fullDir)) {
            // Create root folder node
            const folderId = `folder-${dir}`;
            nodes.push({
                id: folderId,
                label: dir,
                type: 'folder',
                path: dir,
                isArchitectural: true
            });

            scanDirectory(fullDir, rootDir, nodes, edges, folderId);
        }
    }

    // Scan root level files (App.tsx, store.ts, etc.)
    const rootFiles = fs.readdirSync(rootDir, { withFileTypes: true })
        .filter(e => e.isFile() && shouldIncludeFile(e.name));

    for (const entry of rootFiles) {
        const fullPath = path.join(rootDir, entry.name);
        const fileId = `file-root-${nodes.length}`;

        const fileNode = {
            id: fileId,
            path: fullPath,
            relPath: entry.name,
            label: entry.name,
            type: 'file',
            radius: 1,
            risk: 'LOW',
            tier: 3
        };

        try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const metadata = analyzeFile(content, entry.name);
            Object.assign(fileNode, metadata);
        } catch (e) {
            // Ignore
        }

        nodes.push(fileNode);
    }

    // Analyze imports to create edges
    console.log('Analyzing imports...');
    const importEdges = analyzeImports(nodes, rootDir);
    edges.push(...importEdges);

    // Build the graph
    const graph = {
        nodes,
        edges,
        metadata: {
            generatedAt: new Date().toISOString(),
            rootDir,
            nodeCount: nodes.length,
            edgeCount: edges.length,
            voiceEnabled: nodes.filter(n => n.hasVoiceSupport).length
        }
    };

    // Write output
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2));

    console.log(`\n✓ Generated codebase graph:`);
    console.log(`  - Nodes: ${nodes.length}`);
    console.log(`  - Edges: ${edges.length}`);
    console.log(`  - Components: ${nodes.filter(n => n.isComponent).length}`);
    console.log(`  - Services: ${nodes.filter(n => n.isService).length}`);
    console.log(`  - Hooks: ${nodes.filter(n => n.isHook).length}`);
    console.log(`  - Voice-enabled: ${nodes.filter(n => n.hasVoiceSupport).length}`);
    console.log(`\nOutput written to: ${outputPath}`);
}

main();
