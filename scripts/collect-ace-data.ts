/**
 * ACE Data Collection Script
 *
 * Collects trial data for paper experiments.
 * Run: npx tsx scripts/collect-ace-data.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Trial data structure
interface TrialResult {
    trial_id: string;
    task: string;
    task_category: 'analysis' | 'research' | 'planning' | 'creative' | 'technical';
    condition: 'C1_BASELINE' | 'C2_ACE';
    complexity_detected: 'simple' | 'moderate' | 'complex' | 'expert' | null;
    rounds_used: number;
    gap_achieved: number;
    target_gap: number;
    agents_participating: string[];
    dq_score: {
        validity: number;
        specificity: number;
        correctness: number;
        overall: number;
    } | null;
    actionable: boolean;
    output_preview: string; // First 200 chars
    execution_time_ms: number;
    timestamp: string;
}

// Task bank for experiments
const TASK_BANK: Array<{ task: string; category: TrialResult['task_category'] }> = [
    // Analysis tasks
    { task: "Analyze quantum computing impact on cybersecurity", category: "analysis" },
    { task: "Analyze the market implications of AI regulation in 2026", category: "analysis" },
    { task: "Analyze the environmental impact of cryptocurrency mining", category: "analysis" },
    { task: "Analyze remote work trends and their effect on urban planning", category: "analysis" },
    { task: "Analyze the competitive landscape of electric vehicle manufacturers", category: "analysis" },

    // Research tasks
    { task: "Research recent advances in multi-agent orchestration systems", category: "research" },
    { task: "Research the current state of nuclear fusion energy development", category: "research" },
    { task: "Research breakthroughs in CRISPR gene editing therapy", category: "research" },
    { task: "Research developments in brain-computer interface technology", category: "research" },
    { task: "Research the evolution of large language model architectures", category: "research" },

    // Planning tasks
    { task: "Design an implementation plan for migrating to post-quantum cryptography", category: "planning" },
    { task: "Create a roadmap for launching a SaaS product in 6 months", category: "planning" },
    { task: "Plan a data center migration strategy with zero downtime", category: "planning" },
    { task: "Design a disaster recovery plan for a financial services company", category: "planning" },
    { task: "Plan an AI governance framework for enterprise adoption", category: "planning" },

    // Creative tasks
    { task: "Generate alternative approaches to reduce cloud infrastructure costs", category: "creative" },
    { task: "Brainstorm innovative features for a productivity app", category: "creative" },
    { task: "Propose creative solutions for urban traffic congestion", category: "creative" },
    { task: "Generate ideas for gamifying employee wellness programs", category: "creative" },
    { task: "Design creative onboarding experiences for new users", category: "creative" },

    // Technical tasks
    { task: "Debug and optimize a slow database query processing pipeline", category: "technical" },
    { task: "Design a scalable microservices architecture for e-commerce", category: "technical" },
    { task: "Implement a real-time fraud detection system", category: "technical" },
    { task: "Optimize a machine learning model for edge deployment", category: "technical" },
    { task: "Design an event-driven architecture for IoT data processing", category: "technical" },
];

// Storage
const DATA_DIR = path.join(process.cwd(), 'experiment-data');
const RESULTS_FILE = path.join(DATA_DIR, 'ace_trials.json');

function ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function loadResults(): TrialResult[] {
    if (fs.existsSync(RESULTS_FILE)) {
        return JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
    }
    return [];
}

function saveResults(results: TrialResult[]): void {
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
}

function generateTrialId(condition: string, index: number): string {
    return `${condition}_${Date.now()}_${index.toString().padStart(3, '0')}`;
}

// Manual entry helper (for now - UI integration later)
function createManualEntry(
    task: string,
    category: TrialResult['task_category'],
    condition: 'C1_BASELINE' | 'C2_ACE',
    data: Partial<TrialResult>
): TrialResult {
    const results = loadResults();
    const trial: TrialResult = {
        trial_id: generateTrialId(condition, results.length),
        task,
        task_category: category,
        condition,
        complexity_detected: data.complexity_detected || null,
        rounds_used: data.rounds_used || 0,
        gap_achieved: data.gap_achieved || 0,
        target_gap: data.target_gap || 3,
        agents_participating: data.agents_participating || [],
        dq_score: data.dq_score || null,
        actionable: data.dq_score ? data.dq_score.overall > 0.5 : false,
        output_preview: data.output_preview || '',
        execution_time_ms: data.execution_time_ms || 0,
        timestamp: new Date().toISOString(),
    };

    results.push(trial);
    saveResults(results);

    console.log(`✓ Saved trial: ${trial.trial_id}`);
    return trial;
}

// Statistics
function computeStats(): void {
    const results = loadResults();

    if (results.length === 0) {
        console.log('No trials recorded yet.');
        return;
    }

    const c1 = results.filter(r => r.condition === 'C1_BASELINE');
    const c2 = results.filter(r => r.condition === 'C2_ACE');

    console.log('\n=== ACE Experiment Statistics ===\n');
    console.log(`Total trials: ${results.length}`);
    console.log(`  C1 (Baseline): ${c1.length}`);
    console.log(`  C2 (ACE): ${c2.length}`);

    if (c1.length > 0) {
        const c1Rounds = c1.map(r => r.rounds_used);
        console.log(`\nC1 Baseline:`);
        console.log(`  Avg rounds: ${(c1Rounds.reduce((a, b) => a + b, 0) / c1.length).toFixed(1)}`);
    }

    if (c2.length > 0) {
        const c2Rounds = c2.map(r => r.rounds_used);
        const c2DQ = c2.filter(r => r.dq_score).map(r => r.dq_score!.overall);
        const c2V = c2.filter(r => r.dq_score).map(r => r.dq_score!.validity);
        const c2S = c2.filter(r => r.dq_score).map(r => r.dq_score!.specificity);
        const c2C = c2.filter(r => r.dq_score).map(r => r.dq_score!.correctness);
        const actionable = c2.filter(r => r.actionable).length;

        console.log(`\nC2 ACE:`);
        console.log(`  Avg rounds: ${(c2Rounds.reduce((a, b) => a + b, 0) / c2.length).toFixed(1)}`);
        if (c2DQ.length > 0) {
            console.log(`  Avg DQ: ${(c2DQ.reduce((a, b) => a + b, 0) / c2DQ.length * 100).toFixed(1)}%`);
            console.log(`    Validity: ${(c2V.reduce((a, b) => a + b, 0) / c2V.length * 100).toFixed(1)}%`);
            console.log(`    Specificity: ${(c2S.reduce((a, b) => a + b, 0) / c2S.length * 100).toFixed(1)}%`);
            console.log(`    Correctness: ${(c2C.reduce((a, b) => a + b, 0) / c2C.length * 100).toFixed(1)}%`);
        }
        console.log(`  Actionable: ${actionable}/${c2.length} (${(actionable/c2.length*100).toFixed(1)}%)`);

        // By complexity
        const byComplexity = c2.reduce((acc, r) => {
            const key = r.complexity_detected || 'unknown';
            if (!acc[key]) acc[key] = [];
            acc[key].push(r);
            return acc;
        }, {} as Record<string, TrialResult[]>);

        console.log(`\n  By Complexity:`);
        for (const [complexity, trials] of Object.entries(byComplexity)) {
            const avgRounds = trials.reduce((a, b) => a + b.rounds_used, 0) / trials.length;
            console.log(`    ${complexity}: ${trials.length} trials, avg ${avgRounds.toFixed(1)} rounds`);
        }
    }

    // Comparison
    if (c1.length > 0 && c2.length > 0) {
        const c1AvgRounds = c1.reduce((a, b) => a + b.rounds_used, 0) / c1.length;
        const c2AvgRounds = c2.reduce((a, b) => a + b.rounds_used, 0) / c2.length;
        const roundsReduction = ((c1AvgRounds - c2AvgRounds) / c1AvgRounds * 100);

        console.log(`\n=== Comparison ===`);
        console.log(`Rounds reduction: ${roundsReduction.toFixed(1)}%`);
    }
}

// CLI
const args = process.argv.slice(2);
const command = args[0];

ensureDataDir();

switch (command) {
    case 'stats':
        computeStats();
        break;
    case 'tasks':
        console.log('\n=== Task Bank ===\n');
        TASK_BANK.forEach((t, i) => {
            console.log(`${(i+1).toString().padStart(2)}. [${t.category}] ${t.task}`);
        });
        break;
    case 'add':
        // Interactive add - for now just show usage
        console.log('Usage: Import this module and call createManualEntry()');
        console.log('Or use the UI to run trials and export data.');
        break;
    default:
        console.log(`
ACE Data Collection Script

Commands:
  stats    Show current experiment statistics
  tasks    List all tasks in the task bank
  add      Add a manual trial entry (see usage)

Data stored in: ${DATA_DIR}
        `);
}

export { createManualEntry, computeStats, loadResults, TASK_BANK, TrialResult };
