
import { useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { generateResearchPlan, executeResearchQuery, compileResearchContext, synthesizeResearchReport } from '../services/geminiService';
import { neuralVault } from '../services/persistenceService';
import { consensusEngine } from '../services/bicameralService';
import { FactChunk, AtomicTask } from '../types';

export const useResearchAgent = () => {
    const { research, updateResearchTask, addLog, setBicameralState } = useAppStore();
    const processingRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const checkQueue = async () => {
            const queuedTasks = research.tasks.filter(t => t.status === 'QUEUED');
            
            for (const task of queuedTasks) {
                if (processingRef.current.has(task.id)) continue;
                
                // Helper to check cancellation status live from store
                const isCancelled = () => {
                    const currentTask = useAppStore.getState().research.tasks.find(t => t.id === task.id);
                    return currentTask?.status === 'CANCELLED';
                };

                processingRef.current.add(task.id);

                // --- START SEQUENCE ---
                updateResearchTask(task.id, { status: 'PLANNING', progress: 5, logs: [...task.logs, "Generating Strategic Plan..."] });
                addLog('INFO', `RESEARCH_AGENT: Planning analysis for "${task.query}"`);

                try {
                    if (isCancelled()) throw new Error("Cancelled");

                    // 1. PLAN
                    const subQueries = await generateResearchPlan(task.query);
                    
                    if (isCancelled()) throw new Error("Cancelled");

                    if (!Array.isArray(subQueries) || subQueries.length === 0) {
                        // Fallback plan if generation failed
                        const fallbackPlan = [task.query];
                        updateResearchTask(task.id, { 
                            subQueries: fallbackPlan, 
                            status: 'SEARCHING', 
                            progress: 15, 
                            logs: [...task.logs, `Plan Generation Degraded. Using fallback vector.`] 
                        });
                        // Execute fallback immediately in next loop block
                    } else {
                        updateResearchTask(task.id, { 
                            subQueries, 
                            status: 'SEARCHING', 
                            progress: 15, 
                            logs: [...task.logs, `Plan Generated: ${subQueries.length} Vectors defined.`] 
                        });
                    }

                    // Re-fetch strict check for iteration
                    const currentTaskState = useAppStore.getState().research.tasks.find(t => t.id === task.id);
                    const safeQueries = currentTaskState?.subQueries || [task.query];

                    // 2. EXECUTE (Sequential with intermediate updates)
                    const findings: FactChunk[] = [];
                    let completed = 0;
                    
                    for (const q of safeQueries) {
                        if (isCancelled()) throw new Error("Cancelled");

                        updateResearchTask(task.id, { 
                            logs: [...task.logs, `Investigating Vector: "${q}"...`] 
                        });
                        
                        // Execute Query
                        const resultFacts = await executeResearchQuery(q);
                        findings.push(...resultFacts);
                        completed++;
                        
                        // Update progress and findings live
                        // We fetch the latest task state to merge findings correctly if needed, 
                        // but here we maintain local 'findings' array and overwrite.
                        updateResearchTask(task.id, { 
                            findings: [...findings], // Live update of findings
                            progress: 15 + (completed / safeQueries.length) * 50 // 15 -> 65% range
                        });
                    }

                    if (isCancelled()) throw new Error("Cancelled");

                    // --- NEW STEP 3: CONTEXT COMPILATION (ADK) ---
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

                    // --- NEW STEP 4: BICAMERAL SYNTHESIS GATE (VERIFICATION) ---
                    // REQUISITION THE SWARM: Inject task into global Bicameral State to visualize battle
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
                         // Pass live swarm status to global state for UI visualization
                         setBicameralState(prev => ({ swarmStatus: status }));
                    });

                    // RELEASE THE SWARM
                    setBicameralState(prev => ({
                        isSwarming: false,
                        plan: prev.plan.map(t => ({ ...t, status: 'COMPLETED' }))
                    }));

                    if (isCancelled()) throw new Error("Cancelled");

                    const finalReport = bicameralResult.output;
                    const confidence = bicameralResult.confidence;
                    
                    // 5. ARCHIVE
                    const blob = new Blob([finalReport], { type: 'text/markdown' });
                    const file = new File([blob], `Verified Report - ${task.query}.md`, { type: 'text/markdown' });
                    
                    await neuralVault.saveArtifact(file, {
                        classification: 'VERIFIED_RESEARCH_REPORT',
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
                        // Reset Bicameral just in case
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

        const interval = setInterval(checkQueue, 1000); // Check queue every second
        return () => clearInterval(interval);
    }, [research.tasks]); // Re-run effect when tasks change
};
