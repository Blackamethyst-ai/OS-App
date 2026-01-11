
import { GraphReasoningEngine } from "./engine.js";

// Mock Data Generator (Career Skills)
function generateSkillGraph(n: number, m: number) {
    const edges = [];
    // Main "Curriculum" backbone
    for (let i = 1; i < n; i++) {
        const parent = Math.floor(Math.random() * i);
        edges.push({ u: parent, v: i, w: Math.floor(Math.random() * 20) + 1 });
    }
    // Random "Cross-Training" links
    while (edges.length < m) {
        const u = Math.floor(Math.random() * n);
        const v = Math.floor(Math.random() * n);
        if (u !== v) {
            edges.push({ u, v, w: Math.floor(Math.random() * 50) + 1 });
        }
    }
    return { n, edges };
}

async function runCareerPathSimulation() {
    const engine = new GraphReasoningEngine();

    console.log("================================================");
    console.log("   CAREER INTELLIGENCE SYSTEM - CORE ENGINE     ");
    console.log("================================================");

    // Scenario 1: User exploring a small niche (Web3 specialized)
    const smallScale = 5000;
    console.log(`\n[SCENARIO 1] Small Niche Exploration (${smallScale} nodes)`);
    const graphSmall = generateSkillGraph(smallScale, smallScale * 3);

    const res1 = engine.computePaths({
        sourceNodeId: 0,
        graphData: graphSmall,
        strategy: "auto"
    });
    console.log(` > Method: ${res1.methodUsed}`);
    console.log(` > Time:   ${res1.executionTimeMs.toFixed(2)} ms`);

    // Scenario 2: Global Market Analysis (Full Tech Ecosystem)
    const hugeScale = 120000; // 120k nodes
    console.log(`\n[SCENARIO 2] Global Ecosystem Analysis (${hugeScale} nodes)`);
    console.log(" > Generating massive skill graph...");
    const graphHuge = generateSkillGraph(hugeScale, hugeScale * 3);

    console.log(" > Computing optimal career paths...");
    const res2 = engine.computePaths({
        sourceNodeId: 0,
        graphData: graphHuge,
        strategy: "auto"
    });
    console.log(` > Method: ${res2.methodUsed}`);
    console.log(` > Time:   ${res2.executionTimeMs.toFixed(2)} ms`);
    console.log(" > Status: REASONING COMPLETE. Paths optimized.");

    console.log("\n================================================");
}

runCareerPathSimulation();
