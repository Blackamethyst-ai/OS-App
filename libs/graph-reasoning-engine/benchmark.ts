
import { buildGraph, sssp, dijkstraSSSP } from "./src/index";
import { performance } from "perf_hooks";

function generateRandomGraph(n: number, m: number) {
    const edges = [];
    // Ensure connectivity (tree backbone)
    for (let i = 1; i < n; i++) {
        const parent = Math.floor(Math.random() * i);
        edges.push({ u: parent, v: i, w: Math.floor(Math.random() * 100) + 1 });
    }

    // Add random edges
    while (edges.length < m) {
        const u = Math.floor(Math.random() * n);
        const v = Math.floor(Math.random() * n);
        if (u !== v) {
            edges.push({ u, v, w: Math.floor(Math.random() * 100) + 1 });
        }
    }

    return buildGraph({ n, edges });
}

async function runBenchmark() {
    const N = 100000;
    const M = 300000;
    console.log(`Generating graph with N=${N}, M=${M}...`);
    const graph = generateRandomGraph(N, M);

    console.log("Starting Benchmark...");

    // Warmup (JIT)
    // sssp(graph, { source: 0 });
    // dijkstraSSSP(graph, { source: 0 });

    // Dijkstra
    const startD = performance.now();
    const resD = dijkstraSSSP(graph, { source: 0 });
    const endD = performance.now();
    const timeD = endD - startD;
    console.log(`Dijkstra: ${timeD.toFixed(2)}ms`);

    // BM-SSSP
    const startB = performance.now();
    const resB = sssp(graph, { source: 0 });
    const endB = performance.now();
    const timeB = endB - startB;
    console.log(`BM-SSSP:  ${timeB.toFixed(2)}ms`);

    // Verification
    let mismatch = 0;
    for (let i = 0; i < N; i++) {
        const d1 = resD.dist[i];
        const d2 = resB.dist[i];
        if (d1 !== d2) {
            // Allow for tiny floating point diffs if needed, but integers should match
            if (d1 === Infinity && d2 === Infinity) continue;
            if (Math.abs(d1 - d2) > 1e-9) mismatch++;
        }
    }

    if (mismatch > 0) {
        console.log(`WARNING: Mismatch found in ${mismatch} nodes!`);
    } else {
        console.log("Verification: SUCCESS (results match)");
    }

    const speedup = timeD / timeB;
    console.log(`Speedup: ${speedup.toFixed(2)}x`);
}

runBenchmark();
