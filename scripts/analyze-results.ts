/**
 * ACE Statistical Analysis Script
 *
 * Analyzes collected trial data and generates paper-ready statistics.
 * Run: npx tsx scripts/analyze-results.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadResults, TrialResult } from './collect-ace-data';

// Statistical utilities
function mean(arr: number[]): number {
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function stdDev(arr: number[]): number {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    const squaredDiffs = arr.map(x => Math.pow(x - m, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (arr.length - 1));
}

function median(arr: number[]): number {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function min(arr: number[]): number {
    return arr.length ? Math.min(...arr) : 0;
}

function max(arr: number[]): number {
    return arr.length ? Math.max(...arr) : 0;
}

// Cohen's d effect size
function cohensD(group1: number[], group2: number[]): number {
    const m1 = mean(group1);
    const m2 = mean(group2);
    const s1 = stdDev(group1);
    const s2 = stdDev(group2);

    // Pooled standard deviation
    const n1 = group1.length;
    const n2 = group2.length;
    const pooledStd = Math.sqrt(
        ((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / (n1 + n2 - 2)
    );

    return pooledStd ? (m1 - m2) / pooledStd : 0;
}

// Two-sample t-test (independent)
function tTest(group1: number[], group2: number[]): { t: number; p: number; significant: boolean } {
    const n1 = group1.length;
    const n2 = group2.length;
    const m1 = mean(group1);
    const m2 = mean(group2);
    const s1 = stdDev(group1);
    const s2 = stdDev(group2);

    if (n1 < 2 || n2 < 2) {
        return { t: 0, p: 1, significant: false };
    }

    // Welch's t-test
    const se = Math.sqrt((s1 * s1 / n1) + (s2 * s2 / n2));
    const t = se ? (m1 - m2) / se : 0;

    // Degrees of freedom (Welch-Satterthwaite)
    const v1 = s1 * s1 / n1;
    const v2 = s2 * s2 / n2;
    const df = Math.pow(v1 + v2, 2) / (
        Math.pow(v1, 2) / (n1 - 1) + Math.pow(v2, 2) / (n2 - 1)
    );

    // Approximate p-value using normal distribution for large samples
    // For small samples, this is an approximation
    const p = 2 * (1 - normalCDF(Math.abs(t)));

    return { t, p, significant: p < 0.05 };
}

// Normal CDF approximation
function normalCDF(x: number): number {
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
}

// Effect size interpretation
function interpretCohensD(d: number): string {
    const abs = Math.abs(d);
    if (abs < 0.2) return 'negligible';
    if (abs < 0.5) return 'small';
    if (abs < 0.8) return 'medium';
    return 'large';
}

// Generate paper-ready statistics
function generatePaperStats(): void {
    const results = loadResults();

    if (results.length === 0) {
        console.log('No trial data found. Run experiments first.');
        return;
    }

    const c1 = results.filter(r => r.condition === 'C1_BASELINE');
    const c2 = results.filter(r => r.condition === 'C2_ACE');

    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║           ACE PAPER STATISTICS - READY FOR PUBLICATION           ║');
    console.log('╠══════════════════════════════════════════════════════════════════╣');
    console.log(`║  Total Trials: ${results.length.toString().padStart(3)}                                              ║`);
    console.log(`║  C1 (Baseline): ${c1.length.toString().padStart(3)}  |  C2 (ACE): ${c2.length.toString().padStart(3)}                           ║`);
    console.log('╚══════════════════════════════════════════════════════════════════╝');

    // Rounds analysis
    console.log('\n┌─────────────────────────────────────────────────────────────────┐');
    console.log('│ TABLE 1: Convergence Rounds                                     │');
    console.log('├─────────────────────────────────────────────────────────────────┤');

    const c1Rounds = c1.map(r => r.rounds_used);
    const c2Rounds = c2.map(r => r.rounds_used);

    console.log('│ Condition    │   Mean   │   SD    │  Median │   Min  │   Max   │');
    console.log('├──────────────┼──────────┼─────────┼─────────┼────────┼─────────┤');

    if (c1.length > 0) {
        console.log(`│ C1 Baseline  │ ${mean(c1Rounds).toFixed(2).padStart(7)} │ ${stdDev(c1Rounds).toFixed(2).padStart(6)}  │ ${median(c1Rounds).toFixed(1).padStart(6)}  │ ${min(c1Rounds).toString().padStart(5)}  │ ${max(c1Rounds).toString().padStart(6)}  │`);
    }
    if (c2.length > 0) {
        console.log(`│ C2 ACE       │ ${mean(c2Rounds).toFixed(2).padStart(7)} │ ${stdDev(c2Rounds).toFixed(2).padStart(6)}  │ ${median(c2Rounds).toFixed(1).padStart(6)}  │ ${min(c2Rounds).toString().padStart(5)}  │ ${max(c2Rounds).toString().padStart(6)}  │`);
    }
    console.log('└──────────────┴──────────┴─────────┴─────────┴────────┴─────────┘');

    // Statistical test for rounds
    if (c1.length >= 2 && c2.length >= 2) {
        const roundsTest = tTest(c1Rounds, c2Rounds);
        const roundsEffect = cohensD(c1Rounds, c2Rounds);
        const reduction = ((mean(c1Rounds) - mean(c2Rounds)) / mean(c1Rounds) * 100);

        console.log(`\n  Rounds Reduction: ${reduction.toFixed(1)}%`);
        console.log(`  t-statistic: ${roundsTest.t.toFixed(3)}`);
        console.log(`  p-value: ${roundsTest.p.toFixed(4)} ${roundsTest.significant ? '**' : ''}`);
        console.log(`  Cohen's d: ${roundsEffect.toFixed(3)} (${interpretCohensD(roundsEffect)})`);
    }

    // DQ Score analysis (ACE only)
    const c2WithDQ = c2.filter(r => r.dq_score);

    if (c2WithDQ.length > 0) {
        console.log('\n┌─────────────────────────────────────────────────────────────────┐');
        console.log('│ TABLE 2: Decision Quality Scores (C2 ACE Only)                  │');
        console.log('├─────────────────────────────────────────────────────────────────┤');
        console.log('│ Component    │   Mean   │   SD    │  Median │   Min  │   Max   │');
        console.log('├──────────────┼──────────┼─────────┼─────────┼────────┼─────────┤');

        const validity = c2WithDQ.map(r => r.dq_score!.validity);
        const specificity = c2WithDQ.map(r => r.dq_score!.specificity);
        const correctness = c2WithDQ.map(r => r.dq_score!.correctness);
        const overall = c2WithDQ.map(r => r.dq_score!.overall);

        console.log(`│ Validity     │ ${(mean(validity)*100).toFixed(1).padStart(6)}% │ ${(stdDev(validity)*100).toFixed(1).padStart(5)}%  │ ${(median(validity)*100).toFixed(1).padStart(5)}% │ ${(min(validity)*100).toFixed(0).padStart(4)}%  │ ${(max(validity)*100).toFixed(0).padStart(5)}%  │`);
        console.log(`│ Specificity  │ ${(mean(specificity)*100).toFixed(1).padStart(6)}% │ ${(stdDev(specificity)*100).toFixed(1).padStart(5)}%  │ ${(median(specificity)*100).toFixed(1).padStart(5)}% │ ${(min(specificity)*100).toFixed(0).padStart(4)}%  │ ${(max(specificity)*100).toFixed(0).padStart(5)}%  │`);
        console.log(`│ Correctness  │ ${(mean(correctness)*100).toFixed(1).padStart(6)}% │ ${(stdDev(correctness)*100).toFixed(1).padStart(5)}%  │ ${(median(correctness)*100).toFixed(1).padStart(5)}% │ ${(min(correctness)*100).toFixed(0).padStart(4)}%  │ ${(max(correctness)*100).toFixed(0).padStart(5)}%  │`);
        console.log(`│ Overall DQ   │ ${(mean(overall)*100).toFixed(1).padStart(6)}% │ ${(stdDev(overall)*100).toFixed(1).padStart(5)}%  │ ${(median(overall)*100).toFixed(1).padStart(5)}% │ ${(min(overall)*100).toFixed(0).padStart(4)}%  │ ${(max(overall)*100).toFixed(0).padStart(5)}%  │`);
        console.log('└──────────────┴──────────┴─────────┴─────────┴────────┴─────────┘');

        const actionable = c2WithDQ.filter(r => r.actionable).length;
        console.log(`\n  Actionability Rate: ${actionable}/${c2WithDQ.length} (${(actionable/c2WithDQ.length*100).toFixed(1)}%)`);
    }

    // By complexity breakdown
    const complexities = ['simple', 'moderate', 'complex', 'expert'] as const;
    const c2ByComplexity = complexities.map(c => ({
        complexity: c,
        trials: c2.filter(r => r.complexity_detected === c)
    })).filter(c => c.trials.length > 0);

    if (c2ByComplexity.length > 0) {
        console.log('\n┌─────────────────────────────────────────────────────────────────┐');
        console.log('│ TABLE 3: Rounds by Complexity (C2 ACE)                          │');
        console.log('├─────────────────────────────────────────────────────────────────┤');
        console.log('│ Complexity   │    N    │   Mean   │   SD    │  Expected │ Diff  │');
        console.log('├──────────────┼─────────┼──────────┼─────────┼───────────┼───────┤');

        const expectedRounds: Record<string, number> = {
            simple: 3, moderate: 7, complex: 12, expert: 15
        };

        for (const { complexity, trials } of c2ByComplexity) {
            const rounds = trials.map(r => r.rounds_used);
            const expected = expectedRounds[complexity];
            const diff = mean(rounds) - expected;
            console.log(`│ ${complexity.padEnd(12)} │ ${trials.length.toString().padStart(6)}  │ ${mean(rounds).toFixed(2).padStart(7)} │ ${stdDev(rounds).toFixed(2).padStart(6)}  │ ${expected.toString().padStart(8)}  │ ${(diff >= 0 ? '+' : '') + diff.toFixed(1).padStart(4)}  │`);
        }
        console.log('└──────────────┴─────────┴──────────┴─────────┴───────────┴───────┘');
    }

    // Agent utilization
    const c2WithAgents = c2.filter(r => r.agents_participating.length > 0);
    if (c2WithAgents.length > 0) {
        const agentCounts = c2WithAgents.map(r => r.agents_participating.length);
        console.log('\n┌─────────────────────────────────────────────────────────────────┐');
        console.log('│ TABLE 4: Agent Utilization                                      │');
        console.log('├─────────────────────────────────────────────────────────────────┤');
        console.log(`│ C1 Baseline: 8 agents (fixed)                                   │`);
        console.log(`│ C2 ACE:      ${mean(agentCounts).toFixed(1)} agents (mean), ${min(agentCounts)}-${max(agentCounts)} range              │`);
        console.log(`│ Reduction:   ${((8 - mean(agentCounts)) / 8 * 100).toFixed(1)}%                                            │`);
        console.log('└─────────────────────────────────────────────────────────────────┘');

        // Agent win rates
        const agentWins: Record<string, number> = {};
        for (const trial of c2WithAgents) {
            for (const agent of trial.agents_participating) {
                agentWins[agent] = (agentWins[agent] || 0) + 1;
            }
        }

        const sortedAgents = Object.entries(agentWins)
            .sort((a, b) => b[1] - a[1]);

        if (sortedAgents.length > 0) {
            console.log('\n  Top Participating Agents:');
            sortedAgents.slice(0, 5).forEach(([agent, count], i) => {
                const pct = (count / c2WithAgents.length * 100).toFixed(1);
                console.log(`    ${i + 1}. ${agent}: ${count} trials (${pct}%)`);
            });
        }
    }

    // Paper-ready summary block
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                    COPY-PASTE FOR PAPER                          ║');
    console.log('╠══════════════════════════════════════════════════════════════════╣');

    if (c1.length > 0 && c2.length > 0) {
        const c1MeanRounds = mean(c1Rounds);
        const c2MeanRounds = mean(c2Rounds);
        const reduction = ((c1MeanRounds - c2MeanRounds) / c1MeanRounds * 100);

        console.log('║                                                                  ║');
        console.log(`║  "ACE achieved a ${reduction.toFixed(1)}% reduction in convergence rounds       ║`);
        console.log(`║   (M=${c2MeanRounds.toFixed(2)}, SD=${stdDev(c2Rounds).toFixed(2)}) compared to baseline                  ║`);
        console.log(`║   (M=${c1MeanRounds.toFixed(2)}, SD=${stdDev(c1Rounds).toFixed(2)}), t=${tTest(c1Rounds, c2Rounds).t.toFixed(2)}, p=${tTest(c1Rounds, c2Rounds).p.toFixed(3)},                  ║`);
        console.log(`║   Cohen's d=${cohensD(c1Rounds, c2Rounds).toFixed(2)} (${interpretCohensD(cohensD(c1Rounds, c2Rounds))})."                              ║`);
        console.log('║                                                                  ║');
    }

    if (c2WithDQ.length > 0) {
        const overall = c2WithDQ.map(r => r.dq_score!.overall);
        const actionable = c2WithDQ.filter(r => r.actionable).length;
        const actionablePct = (actionable / c2WithDQ.length * 100);

        console.log('║                                                                  ║');
        console.log(`║  "DQ scores averaged ${(mean(overall)*100).toFixed(1)}% (SD=${(stdDev(overall)*100).toFixed(1)}%), with             ║`);
        console.log(`║   ${actionablePct.toFixed(1)}% of outputs meeting the actionability threshold      ║`);
        console.log(`║   (DQ > 0.5)."                                                   ║`);
        console.log('║                                                                  ║');
    }

    console.log('╚══════════════════════════════════════════════════════════════════╝');
}

// Export to CSV for external analysis
function exportCSV(): void {
    const results = loadResults();

    if (results.length === 0) {
        console.log('No data to export.');
        return;
    }

    const headers = [
        'trial_id', 'task', 'category', 'condition', 'complexity',
        'rounds', 'gap_achieved', 'target_gap', 'agents_count',
        'dq_overall', 'dq_validity', 'dq_specificity', 'dq_correctness',
        'actionable', 'execution_ms', 'timestamp'
    ];

    const rows = results.map(r => [
        r.trial_id,
        `"${r.task.replace(/"/g, '""')}"`,
        r.task_category,
        r.condition,
        r.complexity_detected || '',
        r.rounds_used,
        r.gap_achieved,
        r.target_gap,
        r.agents_participating.length,
        r.dq_score?.overall || '',
        r.dq_score?.validity || '',
        r.dq_score?.specificity || '',
        r.dq_score?.correctness || '',
        r.actionable,
        r.execution_time_ms,
        r.timestamp
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const outputPath = path.join(process.cwd(), 'experiment-data', 'ace_trials.csv');
    fs.writeFileSync(outputPath, csv);

    console.log(`Exported ${results.length} trials to: ${outputPath}`);
}

// CLI
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
    case 'stats':
    case undefined:
        generatePaperStats();
        break;
    case 'csv':
        exportCSV();
        break;
    default:
        console.log(`
ACE Statistical Analysis Script

Commands:
  stats    Generate paper-ready statistics (default)
  csv      Export data to CSV for external analysis

Usage:
  npx tsx scripts/analyze-results.ts stats
  npx tsx scripts/analyze-results.ts csv
        `);
}

export { generatePaperStats, exportCSV, tTest, cohensD };
