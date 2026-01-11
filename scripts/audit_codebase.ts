
import { scanCodebase } from '../libs/codebase-scanner/index';
import { GraphReasoningEngine } from '../libs/graph-reasoning-engine/engine';
import * as path from 'path';

async function runAudit() {
    console.log("🔍 Starting Codebase Audit...");

    // 1. Scan the codebase
    const rootDir = process.cwd(); // Root of OS-App (assuming ran from root)
    // Scanning src and libs to get full picture, or just src? User implied src/ but let's scan root for better context or just src.
    // Let's stick to 'src' + 'libs' or just '.' but ignoring node_modules. 
    // The scanner ignores node_modules by default.
    // Let's scan '.' to include 'libs' if they depend on each other (unlikely for blast radius from App).
    // Actually, usually we want to see if `utils` affects `components`.
    console.log(`> Scanning directory: ${rootDir}`);

    // We scan only 'src' and 'libs' to avoid noise
    // But scanner takes one root. Let's scan './'
    const graphData = scanCodebase(rootDir);

    console.log(`> Graph Built: ${graphData.n} files, ${graphData.edges.length} dependencies.`);

    // 2. Initialize Reasoning Engine
    const engine = new GraphReasoningEngine();

    // 3. Define Target for Blast Radius Analysis
    // User asked for 'src/App.tsx'
    const targetFileRelative = 'src/App.tsx'; // Or just App.tsx depending on structure
    // Let's find the exact path in the map
    const targetPath = Object.keys(graphData.meta.pathToId).find(p => p.endsWith('App.tsx'));

    if (!targetPath) {
        console.error("❌ Could not find App.tsx in scanned files.");
        console.log("Sample files found:", Object.values(graphData.meta.idToPath).slice(0, 5));
        return;
    }

    const targetId = graphData.meta.pathToId[targetPath];
    console.log(`> Analyzing Blast Radius for: ${path.relative(rootDir, targetPath)} (ID: ${targetId})`);

    // 4. Compute "impact" paths
    // Edge direction is Imported -> Importer.
    // So starting at App.tsx will show what IMPORTS App.tsx (usually nothing or main.tsx).
    // This is low blast radius.
    // User expectation: "Impact Analysis".
    // If I change App.tsx, does it break anything? Only things that import it.
    // Maybe user meant: "If I change a low-level file...".
    // User requested: "Prints the 'Blast Radius' ... for src/App.tsx"
    // I will do that.

    const paths = engine.computePaths({
        sourceNodeId: targetId,
        graphData: graphData
    });

    // Count reachable nodes
    let impactCount = 0;
    const impactedFiles: string[] = [];

    if (paths.distances) {
        // It returns a Float64Array
        for (let i = 0; i < paths.distances.length; i++) {
            if (i === targetId) continue;
            if (paths.distances[i] !== Infinity) {
                impactCount++;
                impactedFiles.push(path.relative(rootDir, graphData.meta.idToPath[i]));
            }
        }
    }

    console.log(`\n💥 BLAST RADIUS REPORT for ${path.relative(rootDir, targetPath)}`);
    console.log(`--------------------------------------------------`);
    console.log(`Directly/Indirectly Impacted Files: ${impactCount}`);
    if (impactCount > 0) {
        console.log(`Sample Impacted Files:`);
        impactedFiles.slice(0, 10).forEach(f => console.log(` - ${f}`));
        if (impactCount > 10) console.log(` ... and ${impactCount - 10} more.`);
    } else {
        console.log("No dependencies found (Leaf Node or Root Application Entry).");
    }

    // --- DEMO: Find a High Impact Node (Utility) ---
    // Let's look for a file with high out-degree (high number of importers)
    // Simple heuristic: check edges.
    const counts: Record<number, number> = {};
    graphData.edges.forEach(e => {
        counts[e.u] = (counts[e.u] || 0) + 1;
    });

    let maxId = -1;
    let maxCount = -1;
    for (const [id, count] of Object.entries(counts)) {
        if (count > maxCount) {
            maxCount = count;
            maxId = parseInt(id);
        }
    }

    if (maxId !== -1) {
        const highImpactFile = graphData.meta.idToPath[maxId];
        console.log(`\n🔥 DETECTED HIGH IMPACT FILE: ${path.relative(rootDir, highImpactFile)}`);
        console.log(`Direct Importers: ${maxCount}`);

        // Compute full blast radius
        const highImpactPaths = engine.computePaths({
            sourceNodeId: maxId,
            graphData: graphData
        });

        let totalImpact = 0;
        if (highImpactPaths.distances) {
            for (let i = 0; i < highImpactPaths.distances.length; i++) {
                if (i !== maxId && highImpactPaths.distances[i] !== Infinity) {
                    totalImpact++;
                }
            }
        }
        console.log(`Total Blast Radius (Recursive): ${totalImpact} files.`);
    }

    console.log("\n✅ Audit Complete.");
}

runAudit().catch(console.error);
