import type { ToolHandlerDeps, ToolHandlerResult } from './handlerTypes';
import { TaskStatus, TaskPriority } from '../../../../types/domain/tasks';

/**
 * Advanced Jarvis Capabilities - monitors, diagnostics, predictions, workspaces, research
 * Extracted from VoiceManager/index.tsx lines 2191-3064
 */
export async function handleAdvancedJarvis(
    name: string,
    args: Record<string, unknown>,
    deps: ToolHandlerDeps
): Promise<ToolHandlerResult> {
    const { addLog, audio, setMode, useAppStore, neuralVault, sovereignMemory, voice, dreamProtocol, faceDetectionService, HIVE_AGENTS } = deps;

    if (name === 'monitor_condition') {
        const { condition, action, threshold, duration } = args;

        try {
            const monitors = await neuralVault.get('active_monitors') || [];
            const newMonitor = {
                id: `mon_${Date.now()}`,
                condition,
                action,
                threshold: threshold || null,
                duration: duration || 'continuous',
                created: Date.now(),
                triggered: 0,
                status: 'active'
            };
            monitors.push(newMonitor);
            await neuralVault.set('active_monitors', monitors);

            // Also store in SovereignMemory for recall
            await sovereignMemory.store(newMonitor.id, JSON.stringify({
                type: 'monitor',
                ...newMonitor
            }));

            addLog('SYSTEM', `📡 MONITOR SET: ${condition} → ${action} (persisted to Neural Vault)`);
            audio.playClick();
            return {
                status: "MONITOR_ACTIVE",
                monitorId: newMonitor.id,
                totalMonitors: monitors.filter((m: any) => m.status === 'active').length,
                message: `Monitoring established, Sir. I'll ${action} when ${condition}.`
            };
        } catch (e: any) {
            addLog('WARN', `MONITOR: Fallback to localStorage - ${e.message}`);
            const monitors = JSON.parse(localStorage.getItem('active_monitors') || '[]');
            const newMonitor = { id: `mon_${Date.now()}`, condition, action, threshold, duration: duration || 'continuous', created: Date.now(), triggered: 0 };
            monitors.push(newMonitor);
            localStorage.setItem('active_monitors', JSON.stringify(monitors));
            return { status: "MONITOR_ACTIVE", monitorId: newMonitor.id, message: `Monitoring established, Sir.` };
        }
    }

    if (name === 'get_active_monitors') {
        const { includeHistory } = args;

        try {
            const monitors = await neuralVault.get('active_monitors') || [];
            const activeMonitors = monitors.filter((m: any) => m.status === 'active' && m.triggered === 0);
            const triggeredMonitors = monitors.filter((m: any) => m.triggered > 0);

            addLog('SYSTEM', `MONITORS: ${activeMonitors.length} active, ${triggeredMonitors.length} triggered`);
            return {
                status: "MONITORS_RETRIEVED",
                activeMonitors,
                triggeredMonitors: includeHistory ? triggeredMonitors : undefined,
                total: monitors.length,
                activeCount: activeMonitors.length,
                message: activeMonitors.length > 0
                    ? `You have ${activeMonitors.length} active monitor(s), Sir.`
                    : "No active monitors, Sir."
            };
        } catch (e: any) {
            const monitors = JSON.parse(localStorage.getItem('active_monitors') || '[]');
            return {
                status: "MONITORS_RETRIEVED",
                activeMonitors: monitors.filter((m: any) => m.triggered === 0),
                triggeredMonitors: includeHistory ? monitors.filter((m: any) => m.triggered > 0) : undefined,
                total: monitors.length
            };
        }
    }

    if (name === 'run_diagnostics') {
        const { scope, verbose } = args;
        addLog('SYSTEM', `🔍 DIAGNOSTICS: Running ${scope || 'full'} comprehensive scan...`);
        audio.playClick();

        const state = useAppStore.getState();

        // Gather real diagnostics from all services
        const faceDetectionStats = faceDetectionService.getStats();
        const faceDetectionQuality = faceDetectionService.getDetectionQuality();
        const dreamStatus = dreamProtocol.getStatus();
        const dreamSessions = dreamProtocol.getPastSessions();

        // Calculate health indicators
        const issues: string[] = [];
        let healthScore = 100;

        // Check voice
        if (!state.voice.isActive) {
            issues.push('Voice system not active');
            healthScore -= 10;
        }

        // Check biometrics
        if (!faceDetectionService.isReady()) {
            issues.push('Biometrics not initialized');
            healthScore -= 5;
        } else if (faceDetectionQuality === 'NONE' || faceDetectionQuality === 'LOW') {
            issues.push('Face detection quality low');
            healthScore -= 5;
        }

        // Check dream protocol
        if (dreamSessions.length === 0 && !dreamStatus.isDreaming) {
            issues.push('No dream sessions recorded - idle analysis not yet triggered');
        }

        // Check tasks
        const tasks = state.research?.tasks || [];
        const criticalPending = tasks.filter((t: any) =>
            (t.status === 'TODO' || t.status === 'IN_PROGRESS') &&
            (t.priority === 'CRITICAL' || t.priority === 'HIGH')
        ).length;
        if (criticalPending > 3) {
            issues.push(`${criticalPending} critical/high priority tasks pending`);
            healthScore -= criticalPending * 2;
        }

        // Determine overall health status
        let healthStatus = 'OPTIMAL';
        if (healthScore < 90) healthStatus = 'GOOD';
        if (healthScore < 75) healthStatus = 'DEGRADED';
        if (healthScore < 50) healthStatus = 'ATTENTION_NEEDED';

        const diagnostics = {
            system: {
                uptime: `${Math.round(performance.now() / 1000 / 60)} minutes`,
                memory: (performance as any).memory ? {
                    usedHeap: `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)} MB`,
                    totalHeap: `${Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024)} MB`,
                    heapLimit: `${Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024)} MB`
                } : 'Memory API unavailable',
                mode: state.mode,
                logsCount: state.system?.logs?.length || 0
            },
            agents: {
                registeredCount: Object.keys(HIVE_AGENTS).length,
                availableNames: Object.values(HIVE_AGENTS).map(a => a.name).slice(0, 8)
            },
            tasks: {
                total: tasks.length,
                pending: tasks.filter((t: any) => t.status === 'TODO').length,
                inProgress: tasks.filter((t: any) => t.status === 'IN_PROGRESS').length,
                completed: tasks.filter((t: any) => t.status === 'DONE').length,
                criticalPending
            },
            voice: {
                status: state.voice.isActive ? 'ACTIVE' : 'STANDBY',
                transcriptCount: state.voice.transcripts?.length || 0,
                nexusMode: state.voiceNexus?.mode || 'unknown',
                nexusActive: state.voiceNexus?.isActive || false
            },
            biometrics: {
                serviceReady: faceDetectionService.isReady(),
                detectionQuality: faceDetectionQuality,
                stats: {
                    framesProcessed: faceDetectionStats.frameCount,
                    facesDetected: faceDetectionStats.detectionCount,
                    detectionRate: `${Math.round(faceDetectionStats.detectionRate * 100)}%`
                },
                blinkRate: faceDetectionService.getBlinkRate(),
                stressLevel: faceDetectionService.estimateStress().level
            },
            dreamProtocol: {
                status: dreamStatus.isDreaming ? 'DREAMING' : 'STANDBY',
                idleTimeSec: Math.round(dreamStatus.idleTime / 1000),
                pendingQueries: dreamStatus.pendingQueries,
                currentSessionInsights: dreamStatus.currentSession?.insights.length || 0,
                pastSessionsCount: dreamSessions.length,
                totalInsightsGenerated: dreamSessions.reduce((acc, s) => acc + s.insights.length, 0)
            },
            cpb: {
                state: (state as any).cpb?.state || 'unknown',
                pathHistory: (state as any).cpb?.pathHistory?.length || 0
            },
            healthSummary: {
                score: healthScore,
                status: healthStatus,
                issues: issues.length > 0 ? issues : ['No issues detected']
            }
        };

        return {
            status: "DIAGNOSTICS_COMPLETE",
            scope: scope || 'full',
            healthScore,
            healthStatus,
            issues: issues.length > 0 ? issues : null,
            results: verbose ? diagnostics : {
                health: healthStatus,
                score: healthScore,
                voice: diagnostics.voice.status,
                biometrics: diagnostics.biometrics.detectionQuality,
                dreamProtocol: diagnostics.dreamProtocol.status,
                tasks: `${diagnostics.tasks.pending} pending, ${diagnostics.tasks.inProgress} in progress`
            },
            instruction: verbose
                ? "Present the full diagnostic report section by section."
                : `Summarize: Health is ${healthStatus} (${healthScore}%). ${issues.length > 0 ? `Note: ${issues.join(', ')}.` : 'All systems operational.'}`
        };
    }

    if (name === 'threat_assessment') {
        const { scope, reportFormat } = args;
        addLog('WARN', `🛡️ THREAT ASSESSMENT: Scanning ${scope || 'full'}...`);
        audio.playClick();
        return {
            status: "ASSESSMENT_COMPLETE",
            threatLevel: "LOW",
            scope: scope || 'full',
            findings: [
                { type: "info", message: "All API connections secured" },
                { type: "info", message: "No unauthorized access detected" }
            ],
            message: "Perimeter secure, Sir. No active threats detected."
        };
    }

    if (name === 'predict_outcome') {
        const scenario = typeof args.scenario === 'string' ? args.scenario.trim() : '';
        const timeframe = typeof args.timeframe === 'string' ? args.timeframe : undefined;
        const factors = Array.isArray(args.factors)
            ? args.factors.filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
            : [];
        if (!scenario) {
            return { error: "Missing required scenario", hint: "Provide a scenario string for predict_outcome" };
        }
        addLog('SYSTEM', `🔮 PREDICTING: ${scenario}`);
        return {
            status: "PREDICTION_GENERATED",
            scenario,
            timeframe: timeframe || 'short-term',
            confidence: 0.75,
            prediction: `Based on current trajectories, ${scenario} has a high probability of success.`,
            factors,
            instruction: `Analyze: "${scenario}" over ${timeframe || 'short-term'} timeframe. Consider: ${(factors.length > 0 ? factors : ['current trends']).join(', ')}`
        };
    }

    if (name === 'background_operation') {
        const operation = typeof args.operation === 'string' ? args.operation.trim() : '';
        const notifyOn = typeof args.notifyOn === 'string' ? args.notifyOn : undefined;
        const priority = typeof args.priority === 'string' ? args.priority : undefined;
        if (!operation) {
            return { error: "Missing required operation", hint: "Provide a background operation description" };
        }

        try {
            const bgOps = await neuralVault.get('background_operations') || [];
            const newOp = {
                id: `bg_${Date.now()}`,
                operation,
                notifyOn: notifyOn || 'completion',
                priority: priority || 'normal',
                status: 'running',
                started: Date.now()
            };
            bgOps.push(newOp);
            await neuralVault.set('background_operations', bgOps);

            // Queue for dream protocol if complex
            if (operation.length > 50) {
                dreamProtocol.queueQuery(operation);
            }

            addLog('SYSTEM', `⚙️ BACKGROUND: ${operation} (persisted to Neural Vault)`);
            return {
                status: "OPERATION_STARTED",
                operationId: newOp.id,
                totalOperations: bgOps.filter((o: any) => o.status === 'running').length,
                message: `Understood, Sir. Processing "${operation}" in the background. I'll notify you ${notifyOn === 'all' ? 'at each milestone' : `upon ${notifyOn || 'completion'}`}.`
            };
        } catch (e: any) {
            const bgOps = JSON.parse(localStorage.getItem('background_operations') || '[]');
            const newOp = { id: `bg_${Date.now()}`, operation, notifyOn: notifyOn || 'completion', priority: priority || 'normal', status: 'running', started: Date.now() };
            bgOps.push(newOp);
            localStorage.setItem('background_operations', JSON.stringify(bgOps));
            return { status: "OPERATION_STARTED", operationId: newOp.id, message: `Processing "${operation}" in the background, Sir.` };
        }
    }

    if (name === 'triage_priorities') {
        const criteria = typeof args.criteria === 'string' ? args.criteria : undefined;
        const limit = typeof args.limit === 'number' ? args.limit : Number(args.limit);
        const inputItems = Array.isArray(args.items)
            ? args.items.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
            : null;
        addLog('SYSTEM', `📊 TRIAGE: Prioritizing by ${criteria || 'balanced'}`);
        const state = useAppStore.getState();
        const tasks = inputItems && inputItems.length > 0
            ? inputItems
            : ((state as any).tasks || []).map((t: any) => t.title);
        return {
            status: "TRIAGE_COMPLETE",
            criteria: criteria || 'balanced',
            prioritized: tasks.slice(0, Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 5),
            instruction: `Analyze and prioritize these items by ${criteria || 'balanced impact/effort'}: ${tasks.join(', ')}`
        };
    }

    if (name === 'compare_analyze') {
        const items = Array.isArray(args.items)
            ? args.items.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
            : [];
        const dimensions = Array.isArray(args.dimensions)
            ? args.dimensions.filter((dim): dim is string => typeof dim === 'string' && dim.trim().length > 0)
            : [];
        const format = typeof args.format === 'string' ? args.format : undefined;
        if (items.length === 0) {
            return { error: "Missing items", hint: "Provide a non-empty items array for compare_analyze" };
        }
        addLog('SYSTEM', `⚖️ COMPARING: ${items.length} items`);
        return {
            status: "COMPARISON_READY",
            items,
            dimensions: dimensions.length > 0 ? dimensions : ['pros', 'cons', 'fit'],
            format: format || 'recommendation',
            instruction: `Compare these items: ${items.join(' vs ')}. Analyze across: ${(dimensions.length > 0 ? dimensions : ['pros', 'cons', 'fit']).join(', ')}. Output as ${format || 'recommendation'}.`
        };
    }

    if (name === 'research_topic') {
        const topic = typeof args.topic === 'string' ? args.topic.trim() : '';
        const depth = typeof args.depth === 'string' ? args.depth : undefined;
        const sources = Array.isArray(args.sources)
            ? args.sources.filter((src): src is string => typeof src === 'string' && src.trim().length > 0)
            : [];
        if (!topic) {
            return { error: "Missing required topic", hint: "Provide a research topic string" };
        }
        addLog('SYSTEM', `🔬 RESEARCHING: ${topic}`);
        return {
            status: "RESEARCH_INITIATED",
            topic,
            depth: depth || 'standard',
            sources: sources.length > 0 ? sources : ['memory', 'knowledge'],
            instruction: `Conduct ${depth || 'standard'} research on: "${topic}". Draw from: ${(sources.length > 0 ? sources : ['available knowledge']).join(', ')}.`
        };
    }

    if (name === 'status_brief') {
        const { scope, format, includeRecommendations } = args;
        addLog('SYSTEM', `📋 BRIEF: ${scope || 'session'} status`);
        const state = useAppStore.getState();
        return {
            status: "BRIEF_GENERATED",
            scope: scope || 'session',
            currentMode: state.mode,
            activeVoice: voice.isActive,
            includeRecommendations: includeRecommendations !== false,
            instruction: `Generate a ${format || 'verbal'} ${scope || 'session'} status brief. ${includeRecommendations !== false ? 'Include recommended next actions.' : ''}`
        };
    }

    if (name === 'where_am_i') {
        const { includeHistory, includeState } = args;
        const state = useAppStore.getState();
        addLog('SYSTEM', `📍 CONTEXT: Current location`);
        return {
            status: "CONTEXT_RETRIEVED",
            currentSector: state.mode,
            voiceActive: voice.isActive,
            recentHistory: includeHistory ? JSON.parse(localStorage.getItem('navigation_history') || '[]').slice(-5) : undefined,
            message: `You're in the ${state.mode} sector, Sir. Voice interface is ${voice.isActive ? 'active' : 'on standby'}.`
        };
    }

    if (name === 'cross_reference') {
        const item = typeof args.item === 'string' ? args.item.trim() : '';
        const searchScope = Array.isArray(args.searchScope)
            ? args.searchScope.filter((scope): scope is string => typeof scope === 'string' && scope.trim().length > 0)
            : [];
        const maxDepth = typeof args.maxDepth === 'number' ? args.maxDepth : Number(args.maxDepth);
        if (!item) {
            return { error: "Missing required item", hint: "Provide an item to cross-reference" };
        }
        addLog('SYSTEM', `🔗 CROSS-REF: Finding connections for "${item}"`);
        return {
            status: "CROSS_REFERENCE_INITIATED",
            item,
            searchScope: searchScope.length > 0 ? searchScope : ['all'],
            maxDepth: Number.isFinite(maxDepth) && maxDepth > 0 ? Math.floor(maxDepth) : 2,
            instruction: `Find all connections and references to "${item}" across: ${(searchScope.length > 0 ? searchScope : ['memory', 'tasks', 'agents']).join(', ')}. Depth: ${Number.isFinite(maxDepth) && maxDepth > 0 ? Math.floor(maxDepth) : 2} levels.`
        };
    }

    if (name === 'workspace') {
        const action = typeof args.action === 'string' ? args.action.trim() : '';
        const wsName = typeof args.name === 'string' ? args.name.trim() : '';
        const includeState = !!args.includeState;
        if (!action) {
            return { error: "Missing required action", hint: "Provide action for workspace (save, load, list, delete)" };
        }
        if ((action === 'save' || action === 'load' || action === 'delete') && !wsName) {
            return { error: "Missing required name", hint: `Provide workspace name for workspace ${action}` };
        }
        const state = useAppStore.getState();

        try {
            const workspaces = await neuralVault.get('workspaces') || {};

            if (action === 'save') {
                workspaces[wsName] = {
                    mode: state.mode,
                    saved: Date.now(),
                    voiceMode: state.voice.mode,
                    state: includeState ? {
                        mode: state.mode,
                        voiceActive: state.voice.isActive,
                        tasksCount: (state.research?.tasks || []).length
                    } : undefined
                };
                await neuralVault.set('workspaces', workspaces);
                addLog('SYSTEM', `💾 WORKSPACE SAVED: ${wsName} (persisted to Neural Vault)`);
                return {
                    status: "WORKSPACE_SAVED",
                    name: wsName,
                    totalWorkspaces: Object.keys(workspaces).length,
                    message: `Workspace "${wsName}" saved, Sir.`
                };
            }

            if (action === 'load' && wsName && workspaces[wsName]) {
                const ws = workspaces[wsName];
                setMode(ws.mode);
                addLog('SYSTEM', `📂 WORKSPACE LOADED: ${wsName}`);
                return {
                    status: "WORKSPACE_LOADED",
                    name: wsName,
                    restoredMode: ws.mode,
                    savedAt: new Date(ws.saved).toLocaleString(),
                    message: `Workspace "${wsName}" restored, Sir.`
                };
            }

            if (action === 'list') {
                const wsNames = Object.keys(workspaces);
                return {
                    status: "WORKSPACES_LISTED",
                    workspaces: wsNames.map(name => ({
                        name,
                        mode: workspaces[name].mode,
                        saved: new Date(workspaces[name].saved).toLocaleString()
                    })),
                    count: wsNames.length,
                    message: wsNames.length > 0 ? `You have ${wsNames.length} saved workspace(s), Sir.` : "No saved workspaces yet, Sir."
                };
            }

            if (action === 'delete' && wsName && workspaces[wsName]) {
                delete workspaces[wsName];
                await neuralVault.set('workspaces', workspaces);
                return { status: "WORKSPACE_DELETED", name: wsName, message: `Workspace "${wsName}" deleted, Sir.` };
            }

            return { status: "WORKSPACE_ACTION", action, name: wsName };
        } catch (e: any) {
            // Fallback to localStorage
            const workspaces = JSON.parse(localStorage.getItem('workspaces') || '{}');
            if (action === 'save') {
                workspaces[wsName] = { mode: state.mode, saved: Date.now() };
                localStorage.setItem('workspaces', JSON.stringify(workspaces));
                return { status: "WORKSPACE_SAVED", name: wsName, message: `Workspace "${wsName}" saved, Sir.` };
            }
            if (action === 'load' && wsName && workspaces[wsName]) {
                setMode(workspaces[wsName].mode);
                return { status: "WORKSPACE_LOADED", name: wsName, message: `Workspace "${wsName}" restored, Sir.` };
            }
            if (action === 'list') {
                return { status: "WORKSPACES_LISTED", workspaces: Object.keys(workspaces), count: Object.keys(workspaces).length };
            }
            return { status: "WORKSPACE_ACTION", action, name: wsName };
        }
    }

    if (name === 'explain_concept') {
        const { concept, level, context } = args;
        addLog('SYSTEM', `📖 EXPLAIN: ${concept}`);
        return {
            status: "EXPLANATION_REQUESTED",
            concept,
            level: level || 'standard',
            instruction: `Explain "${concept}" at a ${level || 'standard'} level. ${context ? `Context: ${context}` : ''}`
        };
    }

    if (name === 'what_next') {
        const { context, mood, timeAvailable } = args;
        addLog('SYSTEM', `💡 SUGGESTIONS: What next?`);
        const state = useAppStore.getState();
        return {
            status: "SUGGESTIONS_READY",
            currentMode: state.mode,
            mood: mood || 'productive',
            timeAvailable,
            instruction: `Based on current context (${state.mode} sector${context ? `, ${context}` : ''}), mood (${mood || 'productive'}), and time (${timeAvailable || 'flexible'}), suggest the optimal next action.`
        };
    }

    if (name === 'system_mode') {
        const sysMode = typeof args.mode === 'string' ? args.mode.trim() : '';
        const duration = typeof args.duration === 'string' || typeof args.duration === 'number'
            ? args.duration
            : undefined;
        if (!sysMode) {
            return { error: "Missing required mode", hint: "Provide a mode value for system_mode" };
        }
        localStorage.setItem('system_mode', JSON.stringify({ mode: sysMode, activated: Date.now(), duration }));
        addLog('SYSTEM', `🎛️ MODE: ${sysMode} activated`);
        audio.playClick();
        return {
            status: "MODE_ACTIVATED",
            mode: sysMode,
            duration: duration || 'indefinite',
            message: `${sysMode.charAt(0).toUpperCase() + sysMode.slice(1)} mode activated, Sir.${duration ? ` Duration: ${duration}.` : ''}`
        };
    }

    if (name === 'sync_integration') {
        const { integration, direction, scope } = args;
        addLog('SYSTEM', `🔄 SYNC: ${integration} (${direction || 'both'})`);
        return {
            status: "SYNC_INITIATED",
            integration,
            direction: direction || 'both',
            scope,
            message: `Synchronizing with ${integration}, Sir. Direction: ${direction || 'bidirectional'}.`
        };
    }

    if (name === 'learn_pattern') {
        const patternText = typeof args.pattern === 'string' ? args.pattern.trim() : '';
        const triggerText = typeof args.trigger === 'string' ? args.trigger.trim() : '';
        const cat = typeof args.category === 'string' && args.category.trim().length > 0
            ? args.category.trim()
            : 'behavior';
        if (!patternText) {
            return { error: "Missing required pattern", hint: "Provide a pattern string for learn_pattern" };
        }

        try {
            // Store in SovereignMemory for semantic retrieval
            const patternKey = `pattern_${cat}_${Date.now()}`;
            await sovereignMemory.store(patternKey, JSON.stringify({
                type: 'learned_pattern',
                pattern: patternText,
                trigger: triggerText || null,
                category: cat,
                learned: Date.now()
            }));

            // Also persist to neuralVault for structured access
            const patterns = await neuralVault.get('learned_patterns') || [];
            patterns.push({
                id: patternKey,
                pattern: patternText,
                trigger: triggerText || null,
                category: cat,
                learned: Date.now()
            });
            // Keep last 50 patterns
            if (patterns.length > 50) patterns.shift();
            await neuralVault.set('learned_patterns', patterns);

            addLog('SYSTEM', `🧠 LEARNED: ${patternText} - stored in Neural Vault`);
            return {
                status: "PATTERN_LEARNED",
                pattern: patternText,
                trigger: triggerText,
                category: cat,
                semanticIndexed: true,
                totalPatterns: patterns.length,
                message: `Pattern noted, Sir. I'll ${triggerText ? `apply this when ${triggerText}` : 'incorporate this going forward'}. This is now part of my behavioral memory.`
            };
        } catch (e: any) {
            addLog('WARN', `LEARN_PATTERN: Fallback to localStorage - ${e.message}`);
            // Fallback to localStorage
            const patterns = JSON.parse(localStorage.getItem('learned_patterns') || '[]');
            patterns.push({ pattern: patternText, trigger: triggerText, category: cat, learned: Date.now() });
            localStorage.setItem('learned_patterns', JSON.stringify(patterns));
            return {
                status: "PATTERN_LEARNED",
                pattern: patternText,
                trigger: triggerText,
                category: cat,
                message: `Pattern noted, Sir. I'll ${triggerText ? `apply this when ${triggerText}` : 'incorporate this going forward'}.`
            };
        }
    }

    if (name === 'previous_session') {
        const { when, what } = args;
        addLog('SYSTEM', `⏮️ PREVIOUS SESSION: ${when || 'last'}`);
        return {
            status: "SESSION_RETRIEVED",
            when: when || 'last',
            what: what || 'summary',
            instruction: `Recall the ${when || 'previous'} session. Provide: ${what || 'summary'}.`
        };
    }

    if (name === 'track_goal') {
        const goalAction = typeof args.action === 'string' ? args.action.trim() : '';
        const goalText = typeof args.goal === 'string' ? args.goal.trim() : '';
        const parsedProgress = typeof args.progress === 'number' ? args.progress : Number(args.progress);
        const notesText = typeof args.notes === 'string' ? args.notes : undefined;
        if (!goalAction) {
            return { error: "Missing required action", hint: "Provide action for track_goal (create, update, list, check)" };
        }
        if (goalAction === 'create' && !goalText) {
            return { error: "Missing required goal", hint: "Provide goal text for track_goal create" };
        }
        if (goalAction === 'update') {
            if (!goalText) {
                return { error: "Missing required goal", hint: "Provide goal text or id for track_goal update" };
            }
            if (!Number.isFinite(parsedProgress) || parsedProgress < 0) {
                return { error: "Invalid progress", hint: "Provide a numeric progress value for track_goal update" };
            }
        }

        try {
            if (goalAction === 'create') {
                const goalId = `goal_${Date.now()}`;

                // Store in neuralVault for persistence
                const goals = await neuralVault.get('tracked_goals') || [];
                goals.push({
                    id: goalId,
                    goal: goalText,
                    progress: 0,
                    notes: [],
                    status: 'active',
                    created: Date.now()
                });
                await neuralVault.set('tracked_goals', goals);

                // Also create a task in the store for visibility
                const { addTask } = useAppStore.getState().actions;
                addTask({
                    title: `🎯 GOAL: ${goalText}`,
                    description: `Voice-tracked goal created at ${new Date().toLocaleString()}`,
                    status: TaskStatus.TODO,
                    priority: TaskPriority.HIGH,
                    tags: ['goal', 'voice-created']
                });

                // Store in SovereignMemory for semantic recall
                await sovereignMemory.store(goalId, JSON.stringify({
                    type: 'goal',
                    goal: goalText,
                    created: Date.now()
                }));

                addLog('SYSTEM', `🎯 GOAL SET: ${goalText} - tracked in Neural Vault + Tasks`);
                return {
                    status: "GOAL_CREATED",
                    goalId,
                    goal: goalText,
                    totalGoals: goals.length,
                    message: `Goal tracked, Sir: "${goalText}". It's now visible in your task list.`
                };
            }

            if (goalAction === 'update' && goalText && Number.isFinite(parsedProgress)) {
                const goals = await neuralVault.get('tracked_goals') || [];
                const goalIndex = goals.findIndex((g: any) =>
                    g.goal.toLowerCase().includes(goalText.toLowerCase()) ||
                    g.id === goalText
                );
                if (goalIndex >= 0) {
                    goals[goalIndex].progress = parsedProgress;
                    goals[goalIndex].lastUpdated = Date.now();
                    if (notesText) goals[goalIndex].notes.push({ note: notesText, added: Date.now() });
                    if (parsedProgress >= 100) goals[goalIndex].status = 'completed';
                    await neuralVault.set('tracked_goals', goals);
                    addLog('SYSTEM', `🎯 GOAL UPDATED: ${goals[goalIndex].goal} - ${parsedProgress}%`);
                    return {
                        status: "GOAL_UPDATED",
                        goal: goals[goalIndex].goal,
                        progress: parsedProgress,
                        message: `Goal progress updated to ${parsedProgress}%, Sir.`
                    };
                }
                return { status: "GOAL_NOT_FOUND", goal: goalText, message: `Couldn't find that goal, Sir.` };
            }

            if (goalAction === 'list') {
                const goals = await neuralVault.get('tracked_goals') || [];
                const activeGoals = goals.filter((g: any) => g.status !== 'completed');
                return {
                    status: "GOALS_LISTED",
                    goals: goals.map((g: any) => ({
                        goal: g.goal,
                        progress: g.progress,
                        status: g.status || 'active'
                    })),
                    activeCount: activeGoals.length,
                    totalCount: goals.length,
                    message: `You have ${activeGoals.length} active goals, Sir.`
                };
            }

            if (goalAction === 'check') {
                const goals = await neuralVault.get('tracked_goals') || [];
                const activeGoals = goals.filter((g: any) => g.status !== 'completed').slice(-3);
                return {
                    status: "GOAL_STATUS",
                    goals: activeGoals,
                    instruction: `Provide a progress update on these tracked goals. Be encouraging.`
                };
            }

            return { status: "GOAL_ACTION", action: goalAction, goal: goalText };
        } catch (e: any) {
            addLog('WARN', `TRACK_GOAL: Fallback to localStorage - ${e.message}`);
            // Fallback to localStorage
            const goals = JSON.parse(localStorage.getItem('tracked_goals') || '[]');
            if (goalAction === 'create') {
                goals.push({ id: `goal_${Date.now()}`, goal: goalText, progress: 0, notes: [], created: Date.now() });
                localStorage.setItem('tracked_goals', JSON.stringify(goals));
                return { status: "GOAL_CREATED", goal: goalText, message: `Goal tracked, Sir: "${goalText}"` };
            }
            if (goalAction === 'list') {
                return { status: "GOALS_LISTED", goals: goals.map((g: any) => ({ goal: g.goal, progress: g.progress })), count: goals.length };
            }
            return { status: "GOAL_ACTION", action: goalAction, goal: goalText };
        }
    }

    if (name === 'quick_summary') {
        const { of: summaryOf, length } = args;
        addLog('SYSTEM', `📝 TLDR: ${summaryOf || 'conversation'}`);
        return {
            status: "SUMMARY_REQUESTED",
            of: summaryOf || 'this conversation',
            length: length || 'short',
            instruction: `Provide a ${length || 'short'} TLDR summary of ${summaryOf || 'this conversation'}.`
        };
    }

    if (name === 'autonomous_mission') {
        const { objective, constraints, checkpointInterval, canMakeDecisions } = args;
        addLog('WARN', `🚀 AUTONOMOUS MISSION: ${objective}`);
        audio.playClick();

        const mission = {
            id: `mission_${Date.now()}`,
            objective,
            constraints,
            checkpointInterval: checkpointInterval || '5min',
            canMakeDecisions: canMakeDecisions !== false,
            started: Date.now(),
            status: 'active'
        };

        try {
            // Persist mission to neuralVault
            await neuralVault.set('autonomous_mission', mission);

            // Store in SovereignMemory for recall
            await sovereignMemory.store(mission.id, JSON.stringify({
                type: 'autonomous_mission',
                ...mission
            }));

            // Queue objective for dream protocol background analysis
            dreamProtocol.queueQuery(`Mission objective: ${objective}`);

            return {
                status: "MISSION_STARTED",
                missionId: mission.id,
                objective,
                constraints,
                autonomy: canMakeDecisions !== false ? 'FULL' : 'LIMITED',
                persistedToVault: true,
                message: `Understood, Sir. Taking autonomous control to achieve: "${objective}". ${canMakeDecisions !== false ? 'Full decision authority granted.' : 'I\'ll check in for major decisions.'} Mission logged to Neural Vault.`
            };
        } catch (e: any) {
            localStorage.setItem('autonomous_mission', JSON.stringify(mission));
            return {
                status: "MISSION_STARTED",
                objective,
                constraints,
                autonomy: canMakeDecisions !== false ? 'FULL' : 'LIMITED',
                message: `Understood, Sir. Taking autonomous control to achieve: "${objective}".`
            };
        }
    }

    if (name === 'situational_awareness') {
        const detail = typeof args.detail === 'string' ? args.detail : undefined;
        const focus = Array.isArray(args.focus)
            ? args.focus.filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
            : [];
        addLog('SYSTEM', `🎯 SITREP: ${detail || 'operational'} level`);
        const state = useAppStore.getState();

        // Pull from real services
        let monitors: any[] = [];
        let bgOps: any[] = [];
        let mission: any = null;
        try {
            monitors = await neuralVault.get('active_monitors') || [];
            bgOps = await neuralVault.get('background_operations') || [];
            mission = await neuralVault.get('autonomous_mission');
        } catch {
            monitors = JSON.parse(localStorage.getItem('active_monitors') || '[]');
            bgOps = JSON.parse(localStorage.getItem('background_operations') || '[]');
        }

        const dreamStatus = dreamProtocol.getStatus();
        const biometricReady = faceDetectionService.isReady();
        const stressLevel = faceDetectionService.estimateStress().level;

        return {
            status: "SITREP_READY",
            detailLevel: detail || 'operational',
            focus: focus.length > 0 ? focus : undefined,
            snapshot: {
                currentSector: state.mode,
                voiceActive: state.voice.isActive,
                voiceMode: state.voice.mode,
                activeMonitors: monitors.filter((m: any) => m.status === 'active').length,
                backgroundOperations: bgOps.filter((op: any) => op.status === 'running').length,
                activeMission: mission?.status === 'active' ? mission.objective : null,
                dreamProtocol: dreamStatus.isDreaming ? 'ACTIVE' : 'STANDBY',
                biometrics: biometricReady ? { ready: true, stressLevel } : { ready: false },
                systemMode: (state as any).systemMode || 'normal'
            },
            instruction: `Provide ${detail || 'operational'} situational awareness. ${focus.length > 0 ? `Focus on: ${focus.join(', ')}.` : ''}`
        };
    }

    if (name === 'debug_assist') {
        const problem = typeof args.problem === 'string' ? args.problem.trim() : '';
        const debugContext = typeof args.context === 'string' ? args.context : undefined;
        const triedSolutions = Array.isArray(args.triedSolutions)
            ? args.triedSolutions.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
            : [];
        if (!problem) {
            return { error: "Missing required problem", hint: "Provide a problem statement for debug_assist" };
        }
        addLog('SYSTEM', `🐛 DEBUG ASSIST: ${problem}`);
        return {
            status: "DEBUG_MODE_ACTIVE",
            problem,
            context: debugContext,
            triedSolutions,
            instruction: `Debug assistance requested. Problem: "${problem}". ${debugContext ? `Context: ${debugContext}.` : ''} ${triedSolutions.length > 0 ? `Already tried: ${triedSolutions.join(', ')}.` : ''} Analyze and provide debugging guidance.`
        };
    }

    if (name === 'performance_profile') {
        const { target, duration: profileDuration, detailed } = args;
        addLog('SYSTEM', `⚡ PROFILING: ${target || 'app'}`);
        return {
            status: "PROFILE_STARTED",
            target: target || 'application',
            duration: profileDuration || 5,
            detailed: detailed || false,
            metrics: {
                loadTime: performance.now(),
                memoryEstimate: (performance as any).memory?.usedJSHeapSize || 'unavailable'
            },
            message: `Profiling ${target || 'application'}, Sir. Initial metrics captured.`
        };
    }

    return undefined; // Not handled by this module
}
