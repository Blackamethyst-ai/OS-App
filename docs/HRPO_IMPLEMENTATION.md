# Hop-grouped Response Processing (HRPO)
## Implementation Documentation v1.0

**Author:** Dico Angelo
**Organization:** The D-Ecosystem / Metaventions AI
**Date:** January 17, 2026
**Version:** 1.0.0

---

## Abstract

HRPO (Hop-grouped Response Processing) is Phase 3.5 of the Adaptive Convergence Engine (ACE). It clusters similar agent responses using Levenshtein-based similarity before selecting a winner, improving consensus quality for expert-level tasks without introducing API overhead.

**Key Properties:**
- Zero latency overhead (no API calls)
- Triggered only for expert tasks with sufficient votes
- Agglomerative clustering with configurable similarity threshold
- DQ-weighted tie-breaking

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Algorithm Details](#3-algorithm-details)
4. [Configuration](#4-configuration)
5. [Integration](#5-integration)
6. [File Structure](#6-file-structure)
7. [Testing](#7-testing)
8. [API Reference](#8-api-reference)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Overview

### 1.1 Problem Statement

In traditional voting consensus, similar answers compete against each other instead of combining forces. For example:

```
Answer A: "Use React hooks for state management"     → 2 votes
Answer B: "Use React hooks to manage state"          → 2 votes
Answer C: "Redux is the best approach"               → 3 votes
```

Without grouping, Answer C wins despite A+B being semantically equivalent and having 4 combined votes.

### 1.2 Solution

HRPO clusters semantically similar answers before winner selection:

```
Group 1: [Answer A, Answer B]  → 4 combined votes (WINNER)
Group 2: [Answer C]            → 3 votes
```

### 1.3 Design Principles

1. **Zero API Cost**: Uses Levenshtein distance (local computation only)
2. **Expert-Only**: Activated only for complex tasks where nuance matters
3. **Conservative Defaults**: High similarity threshold (0.6) prevents over-grouping
4. **Graceful Degradation**: Falls back to standard voting if conditions not met

---

## 2. Architecture

### 2.1 Position in ACE Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      ADAPTIVE CONVERGENCE ENGINE (ACE)                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Phase 1: ESTIMATING                                                    │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ Complexity analysis → taskType = 'expert' triggers HRPO eligibility││
│  └────────────────────────────────────────────────────────────────────┘│
│                              ▼                                          │
│  Phase 2: AUCTIONING                                                    │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ Agent selection (unchanged)                                        ││
│  └────────────────────────────────────────────────────────────────────┘│
│                              ▼                                          │
│  Phase 3: VOTING                                                        │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ Standard voting loop → builds votes, answerMap, agentContributions ││
│  └────────────────────────────────────────────────────────────────────┘│
│                              ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ ★ Phase 3.5: HOP GROUPING (NEW)                                    ││
│  │                                                                     ││
│  │   IF enableHopGrouping && taskType === 'expert' && votes >= 4:     ││
│  │   ┌──────────────────────────────────────────────────────────────┐ ││
│  │   │ 1. Cluster answers by Levenshtein similarity                 │ ││
│  │   │ 2. Calculate group voting strength (sum of member votes)     │ ││
│  │   │ 3. Score DQ for group representatives                        │ ││
│  │   │ 4. Select winning group (strength, then DQ)                  │ ││
│  │   │ 5. Override winner with group representative                 │ ││
│  │   └──────────────────────────────────────────────────────────────┘ ││
│  └────────────────────────────────────────────────────────────────────┘│
│                              ▼                                          │
│  Phase 4: SCORING                                                       │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ DQ scoring on final winner (may be from hop group)                 ││
│  └────────────────────────────────────────────────────────────────────┘│
│                              ▼                                          │
│  Phase 5: COMPLETE                                                      │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ Return ACEResult with hopGroupingResult attached                   ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
                    votes: Record<string, number>
                    answerMap: Record<string, string>
                    agentContributions: Record<string, string[]>
                              │
                              ▼
                    ┌─────────────────┐
                    │ performHopGrouping()    │
                    └─────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ Cluster 1 │   │ Cluster 2 │   │ Cluster N │
        │ votes: 5  │   │ votes: 3  │   │ votes: 2  │
        │ cohesion: │   │ cohesion: │   │ cohesion: │
        │ 0.85      │   │ 0.72      │   │ 1.00      │
        └──────────┘   └──────────┘   └──────────┘
              │
              ▼ (highest voting strength)
        ┌──────────────────────┐
        │ HopGroupingResult    │
        │ {                    │
        │   groups: [...],     │
        │   winningGroup: g1,  │
        │   method: 'leven..'  │
        │   duration: 12ms     │
        │ }                    │
        └──────────────────────┘
```

---

## 3. Algorithm Details

### 3.1 Levenshtein Similarity

The core similarity function computes normalized edit distance:

```typescript
function levenshteinSimilarity(a: string, b: string): number {
    // Normalize strings
    const normA = a.toLowerCase().replace(/\s+/g, ' ').trim();
    const normB = b.toLowerCase().replace(/\s+/g, ' ').trim();

    // Early exits
    if (normA === normB) return 1;
    if (normA.length === 0 || normB.length === 0) return 0;

    // Long string optimization (sample-based)
    if (Math.max(normA.length, normB.length) > 1000) {
        // Sample beginning, middle, end
        // ... (see implementation)
    }

    // Standard Levenshtein distance
    const distance = levenshteinDistance(normA, normB);
    const maxLen = Math.max(normA.length, normB.length);

    return 1 - (distance / maxLen);
}
```

**Similarity Scale:**
| Score | Interpretation |
|-------|---------------|
| 1.0 | Identical (after normalization) |
| 0.8-0.99 | Minor variations (typos, punctuation) |
| 0.6-0.79 | Same concept, different phrasing |
| 0.4-0.59 | Partial overlap |
| <0.4 | Different answers |

### 3.2 Agglomerative Clustering

HRPO uses bottom-up hierarchical clustering:

```
Initial State (each answer is its own cluster):
[A] [B] [C] [D] [E]

Step 1: Find most similar pair (A, B with sim=0.82)
[A,B] [C] [D] [E]

Step 2: Find next most similar (C, D with sim=0.71)
[A,B] [C,D] [E]

Step 3: Similarity drops below threshold (0.6)
STOP → Final clusters: [A,B] [C,D] [E]
```

**Termination Conditions:**
1. Number of clusters ≤ `maxGroups` (default: 5)
2. Highest inter-cluster similarity < `similarityThreshold` (default: 0.6)

### 3.3 Winner Selection

Groups are ranked by:
1. **Primary**: Voting strength (sum of member votes)
2. **Secondary**: DQ score of representative answer

```typescript
groups.sort((a, b) => {
    if (b.votingStrength !== a.votingStrength) {
        return b.votingStrength - a.votingStrength;
    }
    // Tie-breaker: DQ score
    return (b.dqScore?.score || 0) - (a.dqScore?.score || 0);
});

const winningGroup = groups[0];
```

### 3.4 Cohesion Calculation

Group cohesion measures internal consistency:

```typescript
function calculateCohesion(answers: string[]): number {
    if (answers.length <= 1) return 1;

    let totalSimilarity = 0;
    let pairs = 0;

    for (let i = 0; i < answers.length; i++) {
        for (let j = i + 1; j < answers.length; j++) {
            totalSimilarity += levenshteinSimilarity(answers[i], answers[j]);
            pairs++;
        }
    }

    return pairs > 0 ? totalSimilarity / pairs : 1;
}
```

---

## 4. Configuration

### 4.1 ACEConfig Extensions

```typescript
interface ACEConfig {
    // ... existing fields ...

    /** Enable hop grouping for expert tasks (HRPO) */
    enableHopGrouping: boolean;

    /** Minimum votes before hop grouping activates */
    hopMinVotes: number;

    /** Maximum number of hop groups to form */
    hopMaxGroups: number;

    /** Similarity threshold for grouping (0-1) */
    hopSimilarityThreshold: number;
}
```

### 4.2 Default Values

```typescript
const DEFAULT_ACE_CONFIG = {
    // ... existing defaults ...

    enableHopGrouping: true,      // Enabled by default
    hopMinVotes: 4,               // Need 4+ answers to cluster
    hopMaxGroups: 5,              // At most 5 final groups
    hopSimilarityThreshold: 0.6   // 60% similarity to merge
};
```

### 4.3 Trigger Conditions

HRPO activates when ALL conditions are met:

| Condition | Default | Rationale |
|-----------|---------|-----------|
| `enableHopGrouping === true` | true | Master toggle |
| `complexity.taskType === 'expert'` | N/A | Only worth overhead for complex tasks |
| `Object.keys(votes).length >= hopMinVotes` | 4 | Need enough answers to cluster meaningfully |

### 4.4 Disabling HRPO

**Global disable:**
```typescript
adaptiveConsensusEngine(task, onStatus, {
    enableHopGrouping: false
});
```

**Emergency rollback:**
Edit `types/domain/convergence.ts`:
```typescript
export const DEFAULT_ACE_CONFIG = {
    // ...
    enableHopGrouping: false,  // Disable without removing code
    // ...
};
```

---

## 5. Integration

### 5.1 adaptiveConsensus.ts Changes

**Import:**
```typescript
import { performHopGrouping } from './hopGrouping';
import { HopGroupingResult } from '../types/domain/convergence';
```

**Phase 3.5 Insertion (after convergence check):**
```typescript
// Check for convergence
if (currentGap >= TARGET_GAP) {
    const winnerKey = sortedCandidates[0][0];
    let winnerOutput = answerMap[winnerKey];
    let winningAgents = agentContributions[winnerKey] || [];

    // ================================================================
    // PHASE 3.5: Hop Grouping (expert tasks only)
    // ================================================================
    let hopGroupingResult: HopGroupingResult | undefined;

    if (fullConfig.enableHopGrouping &&
        complexity.taskType === 'expert' &&
        Object.keys(votes).length >= fullConfig.hopMinVotes) {

        hopGroupingResult = performHopGrouping(
            votes, answerMap, agentContributions, task,
            {
                maxGroups: fullConfig.hopMaxGroups,
                similarityThreshold: fullConfig.hopSimilarityThreshold,
                scoreDQ: fullConfig.enableDQScoring
            }
        );

        // Override winner with hop group representative
        if (hopGroupingResult.winningGroup) {
            winnerOutput = hopGroupingResult.winningGroup.representativeAnswer;
            winningAgents = hopGroupingResult.winningGroup.agentContributors;
            console.log(`[ACE] HRPO: ${hopGroupingResult.groups.length} groups formed`);
        }
    }

    // ... rest of convergence handling ...
}
```

**Return Object:**
```typescript
return {
    // ... existing fields ...
    hopGroupingResult  // Added
};
```

### 5.2 Type Extensions

**convergence.ts additions:**

```typescript
export interface HopGroup {
    id: string;
    representativeAnswer: string;
    memberAnswers: string[];
    agentContributors: string[];
    votingStrength: number;
    dqScore?: DQScore;
    cohesion: number;
}

export interface HopGroupingResult {
    groups: HopGroup[];
    winningGroup: HopGroup;
    method: 'levenshtein' | 'embedding' | 'llm';
    groupingDuration: number;
}

export interface ACEResult {
    // ... existing fields ...
    hopGroupingResult?: HopGroupingResult;
}

export interface ConvergencePattern {
    // ... existing fields ...
    hopGroupCount?: number;
    winningGroupCohesion?: number;
}
```

---

## 6. File Structure

```
services/
├── adaptiveConsensus.ts    # Main ACE orchestrator (updated +26 lines)
├── hopGrouping.ts          # NEW: HRPO clustering service (255 lines)
├── complexityEstimator.ts  # Task analysis (unchanged)
├── agentAuction.ts         # DALA-style selection (unchanged)
├── dqScoring.ts            # Quality measurement (unchanged)
└── convergenceMemory.ts    # Pattern storage (unchanged)

types/domain/
└── convergence.ts          # Type definitions (updated +42 lines)

docs/
├── ACE_TECHNICAL_WHITEPAPER.md  # Updated with Phase 3.5
├── ACE_IMPLEMENTATION_MANUAL.md # Updated with HRPO section
└── HRPO_IMPLEMENTATION.md       # NEW: This document
```

### 6.1 hopGrouping.ts Structure

```typescript
// ============================================================================
// LEVENSHTEIN SIMILARITY
// ============================================================================
function levenshteinDistance(a: string, b: string): number
export function levenshteinSimilarity(a: string, b: string): number

// ============================================================================
// AGGLOMERATIVE CLUSTERING
// ============================================================================
interface ClusterNode { ... }
function findClosestClusters(...): { i, j, similarity } | null
function mergeClusters(a: ClusterNode, b: ClusterNode): ClusterNode
function calculateCohesion(answers: string[]): number
export function groupAnswersByHop(votes, answerMap, agentContributions, options): ClusterNode[]

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================
export interface HopGroupingOptions { ... }
export function performHopGrouping(...): HopGroupingResult

// ============================================================================
// EXPORTS
// ============================================================================
export default { levenshteinSimilarity, groupAnswersByHop, performHopGrouping }
```

---

## 7. Testing

### 7.1 Build Verification

```bash
cd ~/OS-App && npm run build
```

Expected: Build succeeds with no new errors.

### 7.2 Type Check

```bash
cd ~/OS-App && npx tsc --noEmit
```

Expected: No new TypeScript errors from HRPO files.

### 7.3 Manual Testing

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate to Bicameral Engine:**
   - Go to `/#/bicameral`
   - Enable ACE Mode

3. **Submit expert-level task:**
   ```
   Design a comprehensive microservices architecture for a high-frequency
   trading platform with requirements for sub-millisecond latency,
   99.999% uptime, and real-time risk management across multiple asset
   classes including equities, derivatives, and cryptocurrencies.
   ```

4. **Verify HRPO activation:**
   - Open browser console
   - Look for: `[ACE] HRPO: N groups formed, winning group has X votes`

5. **Verify simple tasks skip HRPO:**
   - Submit: `What is 2+2?`
   - Should NOT see HRPO console message

### 7.4 Unit Test (if available)

```bash
npm run test:run -- hopGrouping
```

### 7.5 Expected Behavior Matrix

| Task Type | Votes | HRPO Active | Console Log |
|-----------|-------|-------------|-------------|
| simple | 3 | No | (none) |
| moderate | 5 | No | (none) |
| complex | 6 | No | (none) |
| expert | 3 | No | (none) |
| expert | 4 | Yes | `[ACE] HRPO: ...` |
| expert | 8 | Yes | `[ACE] HRPO: ...` |

---

## 8. API Reference

### 8.1 performHopGrouping

Main entry point for hop grouping.

```typescript
function performHopGrouping(
    votes: Record<string, number>,
    answerMap: Record<string, string>,
    agentContributions: Record<string, string[]>,
    task: AtomicTask,
    options: HopGroupingOptions
): HopGroupingResult

interface HopGroupingOptions {
    maxGroups: number;           // Max clusters to form
    similarityThreshold: number; // Min similarity to merge (0-1)
    scoreDQ: boolean;            // Whether to score group representatives
}

interface HopGroupingResult {
    groups: HopGroup[];          // All formed clusters
    winningGroup: HopGroup;      // Highest-ranked cluster
    method: 'levenshtein';       // Clustering method used
    groupingDuration: number;    // Execution time (ms)
}
```

### 8.2 levenshteinSimilarity

Compute normalized string similarity.

```typescript
function levenshteinSimilarity(a: string, b: string): number
// Returns: 0.0 (completely different) to 1.0 (identical)
```

### 8.3 groupAnswersByHop

Perform agglomerative clustering without DQ scoring.

```typescript
function groupAnswersByHop(
    votes: Record<string, number>,
    answerMap: Record<string, string>,
    agentContributions: Record<string, string[]>,
    options: { maxGroups: number; similarityThreshold: number }
): ClusterNode[]
```

---

## 9. Troubleshooting

### 9.1 HRPO Not Activating

**Symptom:** No `[ACE] HRPO:` console message for expert tasks.

**Checks:**
1. Is `enableHopGrouping: true` in config?
2. Is `complexity.taskType === 'expert'`? (Check console for complexity log)
3. Are there `>= hopMinVotes` (default 4) unique answers?

**Debug:**
```typescript
console.log('[ACE] HRPO check:', {
    enabled: fullConfig.enableHopGrouping,
    taskType: complexity.taskType,
    voteCount: Object.keys(votes).length,
    minRequired: fullConfig.hopMinVotes
});
```

### 9.2 Over-Grouping

**Symptom:** Dissimilar answers being grouped together.

**Fix:** Increase similarity threshold:
```typescript
adaptiveConsensusEngine(task, onStatus, {
    hopSimilarityThreshold: 0.75  // More conservative
});
```

### 9.3 Under-Grouping

**Symptom:** Obviously similar answers staying separate.

**Fix:** Decrease similarity threshold:
```typescript
adaptiveConsensusEngine(task, onStatus, {
    hopSimilarityThreshold: 0.5  // More aggressive
});
```

### 9.4 Performance Issues

**Symptom:** Slow grouping for many answers.

**Analysis:** Levenshtein is O(n*m) per pair, clustering is O(k^2) comparisons.

**Mitigation:** Already implemented:
- Long string sampling (>1000 chars)
- Early exit on identical strings
- Maximum group limit

### 9.5 Rollback Procedure

If HRPO causes issues in production:

1. **Immediate:** Set `enableHopGrouping: false` in call site
2. **Permanent:** Update `DEFAULT_ACE_CONFIG` in `convergence.ts`
3. **Full removal:** Revert files (see git history)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-17 | Initial HRPO implementation |

---

## References

1. **ACE Technical Whitepaper** - `docs/ACE_TECHNICAL_WHITEPAPER.md`
2. **MyAntFarm.ai DQ Scoring** - arXiv:2511.15755
3. **Levenshtein Distance** - Wagner-Fischer algorithm (1974)
4. **Agglomerative Clustering** - Hierarchical clustering literature

---

**Document Version:** 1.0.0
**Last Updated:** January 17, 2026
**License:** MIT
**Repository:** github.com/dicoangelo/OS-App
