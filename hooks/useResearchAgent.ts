
import { useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { generateResearchPlan, executeResearchQuery, compileResearchContext, synthesizeResearchReport, generateHypotheses, promptSelectKey } from '../services/geminiService';
import { neuralVault } from '../services/persistenceService';
import { consensusEngine } from '../services/bicameralService';
import { FactChunk, AtomicTask, ScienceHypothesis } from '../types';

export const useResearchAgent = () => {
    const { research, updateResearchTask, addLog, setBicameralState } = useAppStore();
    const processingRef = useRef<Set<string>>(new Set());

    // Restore state from localStorage on boot for persistence
    useEffect(() => {
        const savedState = localStorage.getItem('structura_research_state');
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                if (useAppStore.getState().research.tasks.length === 0) {
                    parsed.tasks.forEach((t: any) => {
                        // Resuming interrupted tasks
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

    // Save state whenever tasks change for persistence
    useEffect(() => {
        localStorage.setItem('structura_research_state', JSON.stringify(research));
    }, [research]);

    useEffect(() => {
        const checkQueue = async () => {
            const activeTasks = research.tasks.filter(t => t.status === 'QUEUED' || t.status === 'RESUMING');
            
            for (const task of activeTasks) {
                if (processingRef.current.has(task.id)) continue;
                
                const isCancelled = () => {
                    const currentTask = useAppStore.getState().research.tasks.find(t => t.id === task.id);
                    return currentTask?.status === 'CANCELLED';
                };

                processingRef.current.add(task.id);

                const currentStatus = task.status;
                updateResearchAgentWorkflow(task, currentStatus === 'RESUMING');
            }
        };

        const updateResearchAgentWorkflow = async (task: any, isResuming: boolean) => {
            try {
                if (isResuming) {
                    addLog('INFO', `RESEARCH_AGENT: Resuming persistent investigation for "${task.query}"`);
                }

                updateResearchTask(task.id, { 
                    status: 'PLANNING', 
                    progress: Math.max(task.progress, 5), 
                    logs: [...task.logs, isResuming ? "RE-PLANNING: Optimizing vectors..." : "Generating Strategic Plan..."] 
                });

                // Simulated context snapshot recovery
                if (isResuming && task.contextSnapshot) {
                    addLog('SUCCESS', `RESEARCH_AGENT: Identity and context recovered for "${task.query}"`);
                }

                const subQueries = await generateResearchPlan(task.query);
                if (isCancelled(task.id)) throw new Error("Cancelled");

                // Update context snapshot for persistence
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
                    if (isCancelled(task.id)) throw new Error("Cancelled");
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

                // Hypothesis generation
                const facts = findings.map(f => f.fact);
                const hypotheses = await generateHypotheses(facts);
                updateResearchTask(task.id, { hypotheses });

                const compiledContext = await compileResearchContext(findings);
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

                const bicameralResult = await consensusEngine(synthesisTask, (status) => {
                     setBicameralState(prev => ({ swarmStatus: status }));
                });

                setBicameralState({ isSwarming: false });

                const finalReport = bicameralResult.output;
                updateResearchTask(task.id, { 
                    result: finalReport, 
                    status: 'COMPLETED', 
                    progress: 100, 
                    logs: [...task.logs, "Research mission accomplished."] 
                });
                
                addLog('SUCCESS', `RESEARCH_AGENT: Mission finalized for "${task.query}"`);

            } catch (e: any) {
                if (e.message !== "Cancelled") {
                    updateResearchTask(task.id, { status: 'FAILED', logs: [...task.logs, `FAULT: ${e.message}`] });
                }
                processingRef.current.delete(task.id);
            }
        };

        const isCancelled = (id: string) => {
            const currentTask = useAppStore.getState().research.tasks.find(t => t.id === id);
            return currentTask?.status === 'CANCELLED';
        };

        const interval = setInterval(checkQueue, 2000);
        return () => clearInterval(interval);
    }, [research.tasks]);
};
