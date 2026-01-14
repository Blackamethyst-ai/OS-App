# Adaptive Convergence Engine (ACE) Implementation Manual

## Overview

The Adaptive Convergence Engine (ACE) enhances the bicameral consensus system with:
- **Adaptive Thresholds**: Dynamic gap/round limits based on task complexity
- **Agent Auction**: DALA-inspired selection of relevant agents
- **DQ Scoring**: Decision Quality measurement (validity, specificity, correctness)
- **Pattern Learning**: IndexedDB storage for threshold optimization

Based on research from:
- arXiv:2511.15755 (MyAntFarm.ai DQ scoring)
- arXiv:2511.13193 (DALA auction-based coordination)
- arXiv:2508.17536 (Voting vs Debate mechanisms)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ADAPTIVE CONVERGENCE ENGINE              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Complexity   │  │ Agent Auction│  │ Voting Core      │  │
│  │ Estimator    │──│ (DALA-style) │──│ (Enhanced)       │  │
│  │              │  │              │  │                  │  │
│  │ • Token count│  │ • Bid based  │  │ • Adaptive gap   │  │
│  │ • Task type  │  │   on agent   │  │ • Early exit     │  │
│  │ • History    │  │   expertise  │  │ • Confidence     │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│           │                │                  │             │
│           ▼                ▼                  ▼             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              DQ SCORING LAYER                        │   │
│  │  validity (40%) + specificity (30%) + correctness    │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           CONVERGENCE MEMORY (IndexedDB)             │   │
│  │  • Past task → rounds mapping                        │   │
│  │  • Agent performance by domain                       │   │
│  │  • Threshold optimization data                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

| File | Purpose |
|------|---------|
| `services/adaptiveConsensus.ts` | Main ACE orchestrator |
| `services/complexityEstimator.ts` | Task complexity analysis |
| `services/agentAuction.ts` | DALA-style agent selection |
| `services/dqScoring.ts` | Decision Quality measurement |
| `services/convergenceMemory.ts` | Pattern learning & storage |
| `types/domain/convergence.ts` | Type definitions |

---

## Testing Instructions

### 1. Access the Application

Open browser to: **http://localhost:5175/**

### 2. Test Bicameral Engine with ACE

**Navigate:** Click "Bicameral" in the navigation or go to `/#/bicameral`

**Steps:**
1. Expand the controls panel (gear icon)
2. Verify **ACE Mode** toggle is ON (cyan/teal color)
3. Enter a goal in "Goal Manifest", e.g.:
   ```
   Analyze the market implications of quantum computing on cybersecurity
   ```
4. Click **"INITIALIZE CONSENSUS"**

**Expected Behavior:**
- Decomposition creates atomic tasks
- For each task, ACE metrics panel appears showing:
  - **Phase**: `estimating` → `auctioning` → `voting` → `scoring` → `complete`
  - **Complexity**: `simple` / `moderate` / `complex` / `expert`
  - **DQ Score**: Percentage with V/S/C breakdown
  - **Agents**: Number of participating agents from auction

**Verify Console Logs:**
```
[ACE] Complexity estimated: { taskType: 'moderate', suggestedRounds: 7 }
[ACE] Auction selected agents: ['dr_ira', 'mike', 'caleb']
[ACE] Consensus reached in 5 rounds, DQ: 0.78
```

### 3. Test Research Agent with ACE

**Navigate:** Click "Research" or go to `/#/research`

**Steps:**
1. Enter a research query:
   ```
   Latest developments in multi-agent orchestration systems
   ```
2. Submit the query
3. Watch the research workflow execute

**Expected Behavior:**
- Planning → Searching → Synthesizing → **SWARM_VERIFY** (ACE kicks in)
- Consensus uses adaptive thresholds
- Final report saved to Neural Vault with DQ metadata

### 4. Test Convergence Analytics Dashboard

**Navigate:** Click "Swarm Hub" then select **"ACE"** tab

**Expected Display:**
- **Total Patterns**: Number of convergence events recorded
- **Avg DQ Score**: Mean decision quality (green ≥70%, yellow ≥50%, red <50%)
- **Avg Rounds**: Mean rounds to reach consensus
- **Top Domains**: Which task domains are most common
- **Top Winning Agents**: Which HIVE agents win most often

**If Empty:**
- Shows "No Convergence Data" message
- Run tasks through Bicameral Engine first to populate

---

## Expected Outcomes

### Complexity-Based Thresholds

| Task Type | Suggested Rounds | Gap Threshold | Token Estimate |
|-----------|-----------------|---------------|----------------|
| Simple | 3 | 2 | <100 |
| Moderate | 7 | 3 | 100-500 |
| Complex | 12 | 4 | 500-2000 |
| Expert | 15 | 5 | >2000 |

### DQ Score Components

| Component | Weight | Measures |
|-----------|--------|----------|
| Validity | 40% | Is the output well-formed and sensible? |
| Specificity | 30% | Does it contain concrete identifiers/details? |
| Correctness | 30% | Does it align with task requirements? |

**Actionable Threshold:** DQ ≥ 0.5 (50%)

### Agent Auction Behavior

1. Each HIVE agent bids based on:
   - Domain expertise match
   - Cognitive weight alignment (skepticism, creativity, logic)
   - Historical performance in similar tasks

2. Top N agents selected (configurable, default 3-5)

3. Selected agents cycle through voting rounds

### Pattern Learning

After each successful consensus:
1. Pattern stored in IndexedDB with:
   - Task hash (for deduplication)
   - Rounds used, gap achieved
   - DQ score, winning agents
   - Timestamp

2. Future tasks query historical thresholds:
   - If ≥3 samples exist for domain+complexity, use learned thresholds
   - Otherwise, fall back to default estimates

---

## Configuration Options

```typescript
interface ACEConfig {
  adaptiveThresholds: boolean;  // Use complexity-based limits
  enableAuction: boolean;       // Run agent auction
  enableDQScoring: boolean;     // Calculate DQ scores
  enableLearning: boolean;      // Store patterns for learning
  minAgents: number;            // Minimum auction winners (default: 2)
  maxAgents: number;            // Maximum auction winners (default: 5)
  dqWeights: {                  // Customize DQ component weights
    validity: number;
    specificity: number;
    correctness: number;
  };
}
```

### Quick Consensus Mode

For simple tasks, use `quickConsensus()`:
```typescript
import { quickConsensus } from '../services/bicameralService';

const result = await quickConsensus(task);
// Skips auction, DQ scoring, and learning for speed
```

---

## Verification Checklist

### Functional Tests

- [ ] ACE toggle in Bicameral Engine works
- [ ] Complexity estimation displays correct task type
- [ ] Agent auction shows 2-5 participating agents
- [ ] DQ score appears after consensus
- [ ] Convergence analytics tab loads stats
- [ ] Refresh button updates stats

### Performance Tests

- [ ] Simple tasks complete in ≤5 rounds
- [ ] Moderate tasks complete in ≤10 rounds
- [ ] No infinite loops (MAX_ROUNDS enforced)
- [ ] IndexedDB storage persists across sessions

### Coherency Tests

- [ ] DQ scores correlate with output quality
- [ ] Higher complexity tasks use more rounds
- [ ] Auction selects domain-relevant agents
- [ ] Learned thresholds improve over time

---

## Troubleshooting

### "No Convergence Data" in ACE Tab
**Cause:** No tasks have been run with ACE enabled yet.
**Fix:** Run tasks through Bicameral Engine with ACE Mode ON.

### DQ Score Always Low (<50%)
**Cause:** Output may be too generic or off-topic.
**Fix:** Improve task instructions or check agent prompts.

### Auction Selecting Same Agents
**Cause:** Domain specialization working as intended.
**Fix:** This is expected for domain-specific tasks.

### IndexedDB Errors
**Cause:** Browser storage issues.
**Fix:** Clear browser data or check storage quota.

---

## API Reference

### adaptiveConsensusEngine

```typescript
async function adaptiveConsensusEngine(
  task: AtomicTask,
  onStatusUpdate: (status: ACEStatus) => void,
  config?: Partial<ACEConfig>
): Promise<ACEResult>
```

### estimateComplexity

```typescript
function estimateComplexity(task: AtomicTask): ComplexityProfile
// Returns: { taskType, tokenEstimate, suggestedRounds, suggestedGap, domain }
```

### scoreDQHeuristic / scoreDQWithLLM

```typescript
function scoreDQHeuristic(output: string, task: AtomicTask): DQScore
async function scoreDQWithLLM(output: string, task: AtomicTask): Promise<DQScore>
```

### convergenceMemory

```typescript
const convergenceMemory = {
  storePattern(pattern: ConvergencePattern): Promise<void>,
  getOptimalThresholds(domain: string, taskType: TaskComplexity): Promise<OptimalThresholds | null>,
  getStats(): Promise<ConvergenceStats>,
  clear(): Promise<void>
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-13 | Initial ACE implementation |

---

## References

1. **MyAntFarm.ai DQ Scoring** - arXiv:2511.15755
2. **DALA Auction Mechanism** - arXiv:2511.13193
3. **Voting vs Debate Analysis** - arXiv:2508.17536
4. **Agentic AI Foundation** - OpenAI, Anthropic, Google, Microsoft collaboration
