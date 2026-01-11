
import * as fs from 'fs';
import * as path from 'path';

interface Node {
    id: number;
    path: string;
}

interface Edge {
    u: number; // Source (The file BEING imported)
    v: number; // Target (The file DOING the importing)
    w: number;
}

export interface CodebaseGraphData {
    n: number;
    edges: Edge[];
    meta: {
        idToPath: Record<number, string>;
        pathToId: Record<string, number>;
    }
}

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.agent', 'libs']; // Ignoring libs to avoid circular dependency analysis on itself for now, or just focus on src

export function scanCodebase(rootPath: string): CodebaseGraphData {
    const files: string[] = [];
    const absoluteRoot = path.resolve(rootPath);

    // 1. Walk file system
    function walk(dir: string) {
        const list = fs.readdirSync(dir);
        list.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                if (!IGNORE_DIRS.includes(file)) {
                    walk(filePath);
                }
            } else {
                if (EXTENSIONS.includes(path.extname(file))) {
                    files.push(filePath);
                }
            }
        });
    }

    walk(absoluteRoot);

    // 2. Map files to IDs
    const pathToId: Record<string, number> = {};
    const idToPath: Record<number, string> = {};

    files.forEach((file, index) => {
        pathToId[file] = index;
        idToPath[index] = file;
    });

    const edges: Edge[] = [];

    // 3. Parse imports and build edges
    // Direction: If A imports B, we want to know that changing B affects A.
    // Edge: B (u) -> A (v)

    files.forEach(importerFile => {
        const content = fs.readFileSync(importerFile, 'utf-8');
        const importerId = pathToId[importerFile];

        // Regex for string imports: import ... from '...' or import('...') or require('...')
        // Simplifying to static imports for this phase
        const importRegex = /import\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]/g;
        const dynamicImportRegex = /import\(['"]([^'"]+)['"]\)/g;

        const matches = [...content.matchAll(importRegex), ...content.matchAll(dynamicImportRegex)];

        matches.forEach(match => {
            const importPath = match[1];

            // Skip node_modules (non-relative imports usually)
            if (!importPath.startsWith('.')) return;

            try {
                // Resolve path
                const importDir = path.dirname(importerFile);
                let resolvedPath = path.resolve(importDir, importPath);

                // Handle extension resolution
                let exactPath = '';

                // Check if it exists as is (unlikely for ts)
                if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
                    exactPath = resolvedPath;
                } else {
                    // Try extensions
                    for (const ext of EXTENSIONS) {
                        if (fs.existsSync(resolvedPath + ext)) {
                            exactPath = resolvedPath + ext;
                            break;
                        }
                    }
                    // Try index files
                    if (!exactPath) {
                        for (const ext of EXTENSIONS) {
                            const indexPath = path.join(resolvedPath, 'index' + ext);
                            if (fs.existsSync(indexPath)) {
                                exactPath = indexPath;
                                break;
                            }
                        }
                    }
                }

                if (exactPath && pathToId[exactPath] !== undefined) {
                    const importedId = pathToId[exactPath];

                    // Add Edge: Imported -> Importer
                    // "Blast Radius" flow
                    edges.push({
                        u: importedId,
                        v: importerId,
                        w: 1
                    });
                }
            } catch (e) {
                // Ignore resolution errors
            }
        });
    });

    return {
        n: files.length,
        edges,
        meta: {
            idToPath,
            pathToId
        }
    };
}
