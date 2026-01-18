import { useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { 
    generateResearchPlan, executeResearchQuery, compileResearchContext, 
    synthesizeResearchReport, generateHypotheses, promptSelectKey,
    generateEmbedding 
} from '../services/geminiService';
import { neuralVault } from '../services/persistenceService';
import { adaptiveConsensusEngine, ACEStatus } from '../services/bicameralService';
import { rlmEnhancedQuery } from '../services/recursiveLanguageModel';
import { FactChunk, AtomicTask, ScienceHypothesis } from '../types';

export const useResearchAgent = () => {
    const { research, actions } = useAppStore();
    const { updateResearchTask, addLog, setBicameralState } = actions;
    const processingRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const savedState = localStorage.getItem('structura_research_state');
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                if (useAppStore.getState().research.tasks.length === 0) {
                    parsed.tasks.forEach((t: any) => {
                        if (['PLANNING', 'SEARCHING', 'SYNTHESIZING', 'SWARM_VERIFY'].includes(t.status)) {
                            t.status = 'RESUMING';
                            t.logs = [...t.logs, "RESUMING: Restoring context snapshot..."];
                        }
                    });
                    useAppStore.setState({ research: parsed });
                }
            } catch (e) {
                console.error("Failed to restore research state", e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('structura_research_state', JSON.stringify(research));
    }, [research]);

    useEffect(() => {
        const checkQueue = async () => {
            const activeTasks = research.tasks.filter(t => t.status === 'QUEUED' || t.status === 'RESUMING');
            
            for (const task of activeTasks) {
                if (processingRef.current.has(task.id)) continue;
                processingRef.current.add(task.id);
                updateResearchAgentWorkflow(task, task.status === 'RESUMING');
            }
        };

        const updateResearchAgentWorkflow = async (task: any, isResuming: boolean) => {
            try {
                const isCancelled = () => {
                    const currentTask = useAppStore.getState().research.tasks.find(t => t.id === task.id);
                    return currentTask?.status === 'CANCELLED';
                };

                if (isResuming) {
                    addLog('INFO', `RESEARCH_AGENT: Resuming persistent investigation for "${task.query}"`);
                }

                updateResearchTask(task.id, { 
                    status: 'PLANNING', 
                    progress: Math.max(task.progress, 5), 
                    logs: [...task.logs, isResuming ? "RE-PLANNING: Optimizing vectors..." : "Generating Strategic Plan..."] 
                });

                const subQueries = await generateResearchPlan(task.query);
                if (isCancelled()) throw new Error("Cancelled");

                updateResearchTask(task.id, { 
                    subQueries: subQueries && subQueries.length > 0 ? subQueries : [task.query], 
                    status: 'SEARCHING', 
                    progress: Math.max(task.progress, 15), 
                    logs: [...task.logs, "Target vectors identified."],
                    contextSnapshot: JSON.stringify({ subQueries, timestamp: Date.now() })
                });

                const findings: FactChunk[] = task.findings || [];
                const safeQueries = subQueries && subQueries.length > 0 ? subQueries : [task.query];
                
                let completed = 0;
                for (const q of safeQueries) {
                    if (isCancelled()) throw new Error("Cancelled");
                    updateResearchTask(task.id, { logs: [...task.logs, `Scanning: "${q}"...`] });
                    const resultFacts = await executeResearchQuery(q);
                    findings.push(...resultFacts);
                    completed++;
                    updateResearchTask(task.id, { 
                        findings: [...findings],
                        progress: 15 + (completed / safeQueries.length) * 50 
                    });
                }

                updateResearchTask(task.id, { 
                    status: 'SYNTHESIZING', 
                    progress: 70, 
                    logs: [...task.logs, "Synthesizing theoretical model..."] 
                });

                const facts = findings.map(f => f.fact);
                const hypotheses = await generateHypotheses(facts);
                updateResearchTask(task.id, { hypotheses });

                const compiledContext = await compileResearchContext(findings);

                // Use RLM for long-context synthesis (100k+ chars)
                if (compiledContext.length > 100000) {
                    updateResearchTask(task.id, {
                        status: 'SWARM_VERIFY',
                        progress: 80,
                        logs: [...task.logs, "RLM: Recursive decomposition for long context..."]
                    });

                    const rlmResult = await rlmEnhancedQuery(
                        compiledContext,
                        `Synthesize a comprehensive research report for: "${task.query}". Include key findings, patterns identified, and actionable insights.`,
                        (status) => {
                            updateResearchTask(task.id, {
                                logs: [...task.logs, `RLM: Iteration ${status.iteration}/${status.maxIterations}`]
                            });
                        }
                    );

                    const finalReport = rlmResult.answer;
                    const researchBlob = new Blob([finalReport], { type: 'text/markdown' });
                    const researchFile = new File([researchBlob], `RESEARCH_${task.id.slice(0,8)}.md`, { type: 'text/markdown' });

                    const artifactId = await neuralVault.saveArtifact(researchFile, {
                        classification: 'RESEARCH_FINDING',
                        ambiguityScore: 10,
                        entities: findings.slice(0, 3).map(f => f.fact.substring(0, 10)),
                        summary: `RLM-synthesized report for query: "${task.query}"`
                    });

                    const embedding = await generateEmbedding(finalReport.substring(0, 5000));
                    if (embedding.length > 0) {
                        await neuralVault.saveVector(artifactId, embedding, { query: task.query });
                    }

                    updateResearchTask(task.id, {
                        result: finalReport,
                        status: 'COMPLETED',
                        progress: 100,
                        logs: [...task.logs, `RLM: Completed in ${rlmResult.iterations} iterations, ${rlmResult.subCalls} sub-calls.`]
                    });

                    addLog('SUCCESS', `RESEARCH_AGENT: RLM synthesis complete for "${task.query}"`);
                    processingRef.current.delete(task.id);
                    return;
                }

                updateResearchTask(task.id, {
                    status: 'SWARM_VERIFY',
                    progress: 80,
                    logs: [...task.logs, "Verification sequence active."]
                });

                const synthesisTask: AtomicTask = {
                    id: `SYNTHESIS_${task.id}`,
                    description: `Synthesize research for: ${task.query}`,
                    isolated_input: compiledContext, 
                    instruction: "Create a structured Markdown report. Use facts provided.",
                    weight: 10,
                    status: 'IN_PROGRESS'
                };

                setBicameralState({
                    isSwarming: true,
                    goal: `[RESEARCH] ${task.query}`,
                    plan: [synthesisTask]
                });

                const bicameralResult = await adaptiveConsensusEngine(
                    synthesisTask,
                    (status: ACEStatus) => {
                        setBicameralState(prev => ({
                            swarmStatus: {
                                ...status,
                                consensusProgress: (status.currentGap / status.targetGap) * 100
                            }
                        }));
                    },
                    {
                        adaptiveThresholds: true,
                        enableAuction: true,
                        enableDQScoring: true,
                        enableLearning: true
                    }
                );

                setBicameralState({ isSwarming: false });

                const finalReport = bicameralResult.output;
                const researchBlob = new Blob([finalReport], { type: 'text/markdown' });
                const researchFile = new File([researchBlob], `RESEARCH_${task.id.slice(0,8)}.md`, { type: 'text/markdown' });
                
                const artifactId = await neuralVault.saveArtifact(researchFile, {
                    classification: 'RESEARCH_FINDING',
                    ambiguityScore: 10,
                    entities: findings.slice(0, 3).map(f => f.fact.substring(0, 10)),
                    summary: `Synthesized report for query: "${task.query}"`
                });

                const embedding = await generateEmbedding(finalReport.substring(0, 5000));
                if (embedding.length > 0) {
                    await neuralVault.saveVector(artifactId, embedding, { query: task.query });
                }

                updateResearchTask(task.id, { 
                    result: finalReport, 
                    status: 'COMPLETED', 
                    progress: 100, 
                    logs: [...task.logs, "Research mission accomplished and archived to Vault."] 
                });
                
                addLog('SUCCESS', `RESEARCH_AGENT: Mission finalized and indexed for "${task.query}"`);

            } catch (e: any) {
                if (e.message !== "Cancelled") {
                    updateResearchTask(task.id, { status: 'FAILED', logs: [...task.logs, `FAULT: ${e.message}`] });
                }
                processingRef.current.delete(task.id);
            }
        };

        const interval = setInterval(checkQueue, 2000);
        return () => clearInterval(interval);
    }, [research.tasks, updateResearchTask, addLog, setBicameralState]);
};