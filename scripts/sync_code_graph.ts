
import { scanCodebase } from '../libs/codebase-scanner';
import { GraphReasoningEngine } from '../libs/graph-reasoning-engine/engine';
import * as fs from 'fs';
import * as path from 'path';


async function sync() {
    console.log("🔄 Syncing Codebase Graph...");
    const rootDir = process.cwd();
    const graphData = scanCodebase(rootDir);
    const engine = new GraphReasoningEngine();

    const folderNodes: any[] = [];
    const folderMap = new Set<string>();

    const nodes = Object.keys(graphData.meta.pathToId).map(filePath => {
        const id = graphData.meta.pathToId[filePath];
        const relPath = path.relative(rootDir, filePath);
        const folder = path.dirname(relPath);

        // Register folders
        const parts = folder.split(path.sep);
        let currentFolder = "";
        parts.forEach((part, i) => {
            if (part === ".") return;
            const parentFolder = currentFolder;
            currentFolder = currentFolder ? path.join(currentFolder, part) : part;
            if (!folderMap.has(currentFolder)) {
                folderMap.add(currentFolder);
                folderNodes.push({
                    id: `folder-${currentFolder}`,
                    label: part,
                    type: 'folder',
                    path: currentFolder,
                    parentId: parentFolder ? `folder-${parentFolder}` : undefined,
                    isArchitectural: true
                });
            }
        });

        // Calculate Blast Radius
        const paths = engine.computePaths({ sourceNodeId: id, graphData: graphData });
        let radius = 0;
        if (paths.distances) {
            for (let i = 0; i < paths.distances.length; i++) {
                if (i !== id && paths.distances[i] !== Infinity) {
                    radius++;
                }
            }
        }

        // Tier classification based on architecture
        let tier = 3; // Default: UI/Components
        if (relPath.includes('services/')) tier = 1;
        else if (relPath.includes('libs/')) tier = 0;
        else if (relPath.includes('hooks/') || relPath.includes('utils/')) tier = 2;
        else if (relPath.includes('types.ts') || relPath.includes('store.ts')) tier = 0;
        else if (relPath.includes('views/')) tier = 4;

        let risk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
        if (radius >= 20) risk = 'HIGH';
        else if (radius >= 5) risk = 'MEDIUM';

        return {
            id: id.toString(),
            path: filePath,
            relPath,
            label: path.basename(filePath),
            type: 'file',
            parentId: folder !== "." ? `folder-${folder}` : undefined,
            radius,
            risk,
            tier
        };
    });

    const edges = graphData.edges.map((e, i) => ({
        id: `e${i}`,
        source: e.u.toString(),
        target: e.v.toString()
    }));

    const result = {
        nodes: [...folderNodes, ...nodes],
        edges,
        lastScanned: Date.now()
    };

    const outputPath = path.resolve(rootDir, 'public/codebase_graph.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

    console.log(`✅ Codebase Graph Synced: ${nodes.length} files, ${folderNodes.length} folders, ${edges.length} edges.`);
}

sync();
