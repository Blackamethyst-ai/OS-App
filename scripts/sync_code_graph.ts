
import { scanCodebase } from '../libs/codebase-scanner';
import { GraphReasoningEngine } from '../libs/graph-reasoning-engine/engine';
import * as fs from 'fs';
import * as path from 'path';

async function sync() {
    console.log("🔄 Syncing Codebase Graph...");
    const rootDir = process.cwd();
    const graphData = scanCodebase(rootDir);

    // We want to calculate "radius" and "risk" for each node to show in UI
    const engine = new GraphReasoningEngine();

    const nodes = Object.keys(graphData.meta.pathToId).map(filePath => {
        const id = graphData.meta.pathToId[filePath];
        const paths = engine.computePaths({ sourceNodeId: id, graphData: graphData });

        let radius = 0;
        if (paths.distances) {
            for (let i = 0; i < paths.distances.length; i++) {
                if (i !== id && paths.distances[i] !== Infinity) {
                    radius++;
                }
            }
        }

        let risk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
        if (radius >= 20) risk = 'HIGH';
        else if (radius >= 5) risk = 'MEDIUM';

        return {
            id: id.toString(),
            path: filePath,
            label: path.basename(filePath),
            type: filePath.endsWith('.tsx') || filePath.endsWith('.ts') ? 'file' : 'folder',
            radius,
            risk
        };
    });

    const edges = graphData.edges.map((e, i) => ({
        id: `e${i}`,
        source: e.u.toString(),
        target: e.v.toString()
    }));

    const result = {
        nodes,
        edges,
        lastScanned: Date.now()
    };

    // Save to public folder so the app can fetch it
    const outputPath = path.resolve(rootDir, 'public/codebase_graph.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

    console.log(`✅ Codebase Graph Synced: ${nodes.length} nodes, ${edges.length} edges.`);
    console.log(`📂 Data saved to: ${outputPath}`);
}

sync();
