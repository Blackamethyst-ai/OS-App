
import { useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { generateResearchPlan, executeResearchQuery, compileResearchContext, synthesizeResearchReport } from '../services/geminiService';
import { neuralVault } from '../services/persistenceService';
import { consensusEngine } from '../services/bicameralService';
import { FactChunk, AtomicTask } from '../types';

export const useResearchAgent = () => {
    const { research, updateResearchTask, addLog, setBicameralState } = useAppStore();
    const processingRef = useRef<Set<string>>(new Set());

    // Restore state from localStorage on boot
    useEffect(() => {
        const savedState = localStorage.getItem('structura_research_state');
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                // Merge or restore tasks - for simplicity we just load them if store is empty
                if (useAppStore.getState().research.tasks.length === 0) {
                    parsed.tasks.forEach((t: any) => {
                        // Reset statuses that were in-progress to queued or failed
                        if (['PLANNING', 'SEARCHING', 'SYNTHESIZING', 'SWARM_VERIFY'].includes(t.status)) {
                            t.status = 'QUEUED';
                        }
                    });
                    useAppStore.setState({ research: parsed });
                }
            } catch (e) {
                console.error("Failed to restore research state", e);
            }
        }
    }, []);

    // Save state whenever tasks change
    useEffect(() => {
        localStorage.setItem('structura_research_state', JSON.stringify(research));
    }, [research]);

    useEffect(() => {
        const checkQueue = async () => {
            const queuedTasks = research.tasks.filter(t => t.status === 'QUEUED');
            
            for (const task of queuedTasks) {
                if (processingRef.current.has(task.id)) continue;
                
                const isCancelled = () => {
                    const currentTask = useAppStore.getState().research.tasks.find(t => t.id === task.id);
                    return currentTask?.status === 'CANCELLED';
                };

                processingRef.current.add(task.id);

                updateResearchTask(task.id, { status: 'PLANNING', progress: 5, logs: [...task.logs, "Generating Strategic Plan..."] });
                addLog('INFO', `RESEARCH_AGENT: Planning analysis for "${task.query}"`);

                try {
                    if (isCancelled()) throw new Error("Cancelled");

                    const subQueries = await generateResearchPlan(task.query);
                    
                    if (isCancelled()) throw new Error("Cancelled");

                    if (!Array.isArray(subQueries) || subQueries.length === 0) {
                        const fallbackPlan = [task.query];
                        updateResearchTask(task.id, { 
                            subQueries: fallbackPlan, 
                            status: 'SEARCHING', 
                            progress: 15, 
                            logs: [...task.logs, `Plan Generation Degraded. Using fallback vector.`] 
                        });
                    } else {
                        updateResearchTask(task.id, { 
                            subQueries, 
                            status: 'SEARCHING', 
                            progress: 15, 
                            logs: [...task.logs, `Plan Generated: ${subQueries.length} Vectors defined.`] 
                        });
                    }

                    const currentTaskState = useAppStore.getState().research.tasks.find(t => t.id === task.id);
                    const safeQueries = currentTaskState?.subQueries || [task.query];

                    const findings: FactChunk[] = [];
                    let completed = 0;
                    
                    for (const q of safeQueries) {
                        if (isCancelled()) throw new Error("Cancelled");

                        updateResearchTask(task.id, { 
                            logs: [...task.logs, `Investigating Vector: "${q}"...`] 
                        });
                        
                        const resultFacts = await executeResearchQuery(q);
                        findings.push(...resultFacts);
                        completed++;
                        
                        updateResearchTask(task.id, { 
                            findings: [...findings],
                            progress: 15 + (completed / safeQueries.length) * 50 
                        });
                    }

                    if (isCancelled()) throw new Error("Cancelled");

                    updateResearchTask(task.id, { 
                        status: 'SYNTHESIZING', 
                        progress: 70, 
                        logs: [...task.logs, `Context Optimization: Compiling ${findings.length} facts...`] 
                    });

                    const compiledContext = await compileResearchContext(findings);
                    
                    if (isCancelled()) throw new Error("Cancelled");

                    updateResearchTask(task.id, { 
                        status: 'SWARM_VERIFY', 
                        progress: 80, 
                        logs: [...task.logs, "Routing to Bicameral Synthesis Gate..."] 
                    });

                    const synthesisTask: AtomicTask = {
                        id: `SYNTHESIS_${task.id}`,
                        description: `Synthesize verified research report for: ${task.query}`,
                        isolated_input: compiledContext, 
                        instruction: "Execute a synthesis of the provided context into a final, structured, Markdown report. The primary goal is logical soundness and adherence to the source facts.",
                        weight: 10,
                        status: 'IN_PROGRESS'
                    };

                    setBicameralState({
                        isSwarming: true,
                        goal: `[RESEARCH PROTOCOL] ${task.query}`,
                        plan: [synthesisTask],
                        swarmStatus: {
                            taskId: synthesisTask.id,
                            votes: {},
                            killedAgents: 0,
                            currentGap: 0,
                            targetGap: 3,
                            totalAttempts: 0
                        }
                    });

                    addLog('WARN', 'BICAMERAL: External protocol override active. Research Agent has assumed control of the Swarm.');

                    const bicameralResult = await consensusEngine(synthesisTask, (status) => {
                         setBicameralState(prev => ({ swarmStatus: status }));
                    });

                    setBicameralState(prev => ({
                        isSwarming: false,
                        plan: prev.plan.map(t => ({ ...t, status: 'COMPLETED' }))
                    }));

                    if (isCancelled()) throw new Error("Cancelled");

                    const finalReport = bicameralResult.output;
                    const confidence = bicameralResult.confidence;
                    
                    const blob = new Blob([finalReport], { type: 'text/markdown' });
                    const file = new File([blob], `Verified Report - ${task.query}.md`, { type: 'text/markdown' });
                    
                    await neuralVault.saveArtifact(file, {
                        classification: 'RESEARCH_REPORT',
                        ambiguityScore: 100 - confidence, 
                        entities: [task.query, 'Verified', 'Bicameral'],
                        summary: `Bicameral-verified research report on ${task.query} (Conf: ${confidence}%)`
                    });

                    updateResearchTask(task.id, { 
                        result: finalReport, 
                        status: 'COMPLETED', 
                        progress: 100, 
                        logs: [...task.logs, `Report Verified (Confidence: ${confidence}%) & Archived.`] 
                    });
                    
                    addLog('SUCCESS', `RESEARCH_AGENT: Mission Complete & Verified for "${task.query}"`);

                } catch (e: any) {
                    if (e.message === "Cancelled") {
                        addLog('WARN', `RESEARCH_AGENT: Task "${task.query}" cancelled by operator.`);
                        setBicameralState({ isSwarming: false });
                    } else {
                        console.error(e);
                        updateResearchTask(task.id, { 
                            status: 'FAILED', 
                            logs: [...task.logs, `CRITICAL FAILURE: ${e.message}`] 
                        });
                        addLog('ERROR', `RESEARCH_AGENT: Failed "${task.query}" - ${e.message}`);
                    }
                } finally {
                    processingRef.current.delete(task.id);
                }
            }
        };

        const interval = setInterval(checkQueue, 1000);
        return () => clearInterval(interval);
    }, [research.tasks]);
};
