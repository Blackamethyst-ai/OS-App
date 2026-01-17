# Recursive Language Model (RLM) Service
## Technical Overview v1.0

**Author:** Dico Angelo
**Organization:** Metaventions AI
**Date:** January 17, 2026
**Version:** 1.0.0

---

## Abstract

This document presents the Recursive Language Model (RLM) service, an implementation of the inference-time scaling technique from arXiv:2512.24601 (Zhang, Kraska, Khattab - MIT CSAIL). RLM enables language models to process arbitrarily long contexts by treating them as an external environment that can be programmatically explored, decomposed, and recursively queried. This approach achieves up to 100x context extension beyond model window limits while maintaining or improving output quality at comparable cost.

**Keywords:** Long-context processing, recursive inference, context externalization, multi-agent orchestration

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Theoretical Foundation](#2-theoretical-foundation)
3. [Architecture](#3-architecture)
4. [Integration with ACE](#4-integration-with-ace)
5. [API Reference](#5-api-reference)
6. [Usage Examples](#6-usage-examples)
7. [References](#7-references)

---

## 1. Introduction

### 1.1 The Context Length Problem

Large Language Models have finite context windows (typically 8K-128K tokens). When processing documents, codebases, or multi-document queries that exceed these limits, traditional approaches include:

- **Truncation**: Lose information
- **Chunking + RAG**: Lose global coherence
- **Summarization**: Lose detail

RLM offers a fourth approach: **recursive decomposition with programmatic exploration**.

### 1.2 The Precision Bridge Pattern

RLM implements the same architectural pattern identified in Tesla's US20260017019A1 patent for mixed-precision computing:

| Stage | Tesla (Hardware) | RLM (Context) | ACE (Decisions) |
|-------|------------------|---------------|-----------------|
| **Compress** | log(θ) → 8-bit | context → variable | query → embedding |
| **Pre-compute** | LUT storage | REPL environment | cached patterns |
| **Explore** | 8-bit MACs | sub-LLM calls | agent swarm |
| **Accumulate** | exp-indexed | variable buffer | structured voting |
| **Reconstruct** | Taylor-Horner | final synthesis | Opus refinement |
| **Verify** | rotation matrix | FINAL() check | DQ scoring |

---

## 2. Theoretical Foundation

### 2.1 Context Externalization

Instead of tokenizing the entire context into the model's attention window, RLM:

1. Stores context as a Python variable in a REPL environment
2. Provides programmatic access functions (slicing, regex, search)
3. Allows the model to examine structure before processing
4. Enables selective deep-dives into relevant sections

### 2.2 Recursive Decomposition

The model autonomously learns segmentation strategies:

| Strategy | Use Case |
|----------|----------|
| **Peeking** | Sample initial structure (`context[:2000]`) |
| **Regex/Grep** | Find relevant chunks via pattern matching |
| **Uniform chunking** | Process information-dense documents |
| **Semantic partitioning** | Divide by logical boundaries |
| **Partition + Map** | Parallel sub-LLM calls for aggregation |

### 2.3 Sub-LLM Invocation

The `llm_query()` function spawns recursive LLM calls:

```python
result = llm_query("Summarize the key findings:", context=chunk)
```

These sub-calls use a smaller/cheaper model (e.g., gemini-2.0-flash) for cost efficiency while the root model orchestrates the exploration.

---

## 3. Architecture

### 3.1 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    RLM EXECUTION ENGINE                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐  │
│   │   CONTEXT   │     │    REPL     │     │   ROOT LM   │  │
│   │   STORE     │────▶│   ENGINE    │◀───▶│  (Gemini)   │  │
│   └─────────────┘     └──────┬──────┘     └─────────────┘  │
│                              │                              │
│                              ▼                              │
│                       ┌─────────────┐                       │
│                       │  SUB-LLM    │                       │
│                       │   CALLS     │                       │
│                       └─────────────┘                       │
│                              │                              │
│                              ▼                              │
│                       ┌─────────────┐                       │
│                       │  VARIABLE   │                       │
│                       │   BUFFER    │                       │
│                       └─────────────┘                       │
│                              │                              │
│                              ▼                              │
│                       ┌─────────────┐                       │
│                       │  DQ SCORE   │                       │
│                       │  + OUTPUT   │                       │
│                       └─────────────┘                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 REPL Environment

The sandboxed REPL provides:

| Function | Description |
|----------|-------------|
| `context` | Full input text as string |
| `context_length` | Character count |
| `llm_query(prompt, context?)` | Sub-LLM call |
| `llm_batch(prompts)` | Parallel sub-LLM calls |
| `store(key, value)` | Save intermediate result |
| `retrieve(key)` | Load saved result |
| `FINAL(answer)` | Return final answer |
| `FINAL_VAR(varname)` | Return stored variable |

### 3.3 Execution Flow

1. **Initialize**: Store context in REPL namespace
2. **Iterate**: Root LM generates Python code
3. **Execute**: REPL runs code, captures output
4. **Check**: If `FINAL()` called, return answer
5. **Loop**: Otherwise, append to history and continue
6. **Timeout**: After max iterations, return best available

---

## 4. Integration with ACE

RLM integrates with the Adaptive Convergence Engine for hybrid routing:

```typescript
import { rlmEnhancedQuery } from './recursiveLanguageModel';
import { adaptiveConsensusEngine } from './adaptiveConsensus';

// Auto-route based on context length
async function smartQuery(context: string, query: string) {
    if (context.length > 100000) {
        // Use RLM for long contexts
        return rlmEnhancedQuery(context, query);
    } else {
        // Use ACE for standard tasks
        return adaptiveConsensusEngine(taskFromQuery(query));
    }
}
```

### 4.1 DQ Scoring Integration

RLM outputs are scored using the same DQ framework as ACE:

- **Validity**: Is the answer technically sound?
- **Specificity**: Does it contain concrete details?
- **Correctness**: Does it address the query?

---

## 5. API Reference

### 5.1 Main Functions

```typescript
// Full RLM execution
async function recursiveLLMQuery(
    context: string,
    query: string,
    onStatusUpdate?: (status: RLMStatus) => void,
    config?: Partial<RLMConfig>
): Promise<RLMResult>

// Smart routing (RLM for long, direct for short)
async function rlmEnhancedQuery(
    context: string,
    query: string,
    onStatusUpdate?: (status: RLMStatus) => void,
    config?: Partial<RLMConfig>
): Promise<RLMResult>
```

### 5.2 Configuration

```typescript
interface RLMConfig {
    maxIterations: number;      // Default: 20
    maxOutputLength: number;    // Default: 500000
    rootModel: string;          // Default: 'gemini-2.0-flash'
    subModel: string;           // Default: 'gemini-2.0-flash'
    enableDQScoring: boolean;   // Default: true
    verbose: boolean;           // Default: true
    rootTemperature: number;    // Default: 0.7
    subTemperature: number;     // Default: 0.3
}
```

### 5.3 Result Object

```typescript
interface RLMResult {
    answer: string;
    iterations: number;
    subCalls: number;
    totalTokens: number;
    executionTime: number;
    dqScore?: DQScore;
    trajectory: TrajectoryStep[];
    cost?: {
        rootTokens: number;
        subTokens: number;
        estimatedCost: number;
    };
}
```

---

## 6. Usage Examples

### 6.1 Basic Usage

```typescript
import { recursiveLLMQuery } from './services/recursiveLanguageModel';

const longDocument = await fetchDocument(); // 500k+ chars
const result = await recursiveLLMQuery(
    longDocument,
    "What are the three main arguments presented?",
    (status) => console.log(`Iteration ${status.iteration}/${status.maxIterations}`)
);

console.log(result.answer);
console.log(`Completed in ${result.iterations} iterations, ${result.subCalls} sub-calls`);
```

### 6.2 With Custom Config

```typescript
const result = await recursiveLLMQuery(
    codebase,
    "Find all API endpoints and their authentication requirements",
    undefined,
    {
        maxIterations: 30,
        enableDQScoring: true,
        verbose: false
    }
);
```

---

## 7. References

### 7.1 Primary Sources

| Paper | arXiv | Contribution |
|-------|-------|--------------|
| Recursive Language Models | 2512.24601 | Core RLM methodology |
| Tesla Mixed-Precision Patent | US20260017019A1 | Precision Bridge pattern |
| MyAntFarm.ai DQ Scoring | 2511.15755 | Decision quality framework |
| Voting vs Debate | 2508.17536 | Consensus optimization |

### 7.2 Implementation References

- Official RLM repo: https://github.com/alexzhang13/rlm
- Minimal implementation: https://github.com/alexzhang13/rlm-minimal

### 7.3 Related Metaventions AI Documentation

- [ACE Technical Whitepaper](./ACE_TECHNICAL_WHITEPAPER.md)
- [ACE Implementation Manual](./ACE_IMPLEMENTATION_MANUAL.md)
- [HRPO Implementation](./HRPO_IMPLEMENTATION.md)

---

## Appendix A: The Unified Precision Bridge Framework

RLM is part of the broader Metaventions AI research on resource-constrained intelligence:

```
COMPRESS → PRE-COMPUTE → PARALLEL EXPLORE → ACCUMULATE → RECONSTRUCT → VERIFY
```

This pattern applies across:
- **Hardware precision** (Tesla: 8-bit → 32-bit)
- **Context length** (RLM: finite window → infinite context)
- **Decision quality** (ACE: cheap agents → expert output)

---

*Metaventions AI — Sovereign Intelligence Systems*
