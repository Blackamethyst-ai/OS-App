
import { buildGraph, sssp, dijkstraSSSP } from "./src/index.js";
import { performance } from "perf_hooks";

// --- Types ---
export interface PathRequest {
    sourceNodeId: number;
    graphData: { n: number; edges: { u: number; v: number; w: number }[] };
    strategy?: "auto" | "dijkstra" | "bmssp";
}

export interface PathResult {
    distances: Float64Array;
    methodUsed: string;
    executionTimeMs: number;
}

/**
 * The Hybrid Engine decides the optimal algorithm based on graph scale.
 */
export class GraphReasoningEngine {
    private readonly SCALE_THRESHOLD = 50000; // Nodes

    public computePaths(req: PathRequest): PathResult {
        const { sourceNodeId, graphData, strategy = "auto" } = req;

        // 1. Ingest Graph (CSR Build)
        // In a real app, this would be cached or pre-built.
        // For this demo, we include build time in the "engine" cost or separating it.
        // Let's separate it to measure pure algo speed, but here we build fast.
        const graph = buildGraph(graphData);

        let method = strategy;
        if (method === "auto") {
            method = graphData.n >= this.SCALE_THRESHOLD ? "bmssp" : "dijkstra";
        }

        const start = performance.now();
        let result: any;

        if (method === "bmssp") {
            result = sssp(graph, { source: sourceNodeId });
        } else {
            result = dijkstraSSSP(graph, { source: sourceNodeId });
        }

        const end = performance.now();

        return {
            distances: result.dist,
            methodUsed: method === "bmssp" ? "Deep Graph Reasoning (O(m log^2/3 n))" : "Standard Traversal (Dijkstra)",
            executionTimeMs: end - start,
        };
    }
}
