import type { ToolHandlerDeps, ToolHandlerResult } from './handlerTypes';

/**
 * Conversational Intelligence - delegation, emotional, ambient, multi-agent, profiling
 * Extracted from VoiceManager/index.tsx lines 3066-3760
 */
export async function handleConversational(
    name: string,
    args: Record<string, unknown>,
    deps: ToolHandlerDeps
): Promise<ToolHandlerResult> {
    const { addLog, audio, setMode, useAppStore, neuralVault, sovereignMemory, faceDetectionService, runAgentReasoning, HIVE_AGENTS } = deps;

    if (name === 'delegate_to_agent') {
        const agent = typeof args.agent === 'string' ? args.agent.trim() : '';
        const task = typeof args.task === 'string' ? args.task.trim() : '';
        const priority = typeof args.priority === 'string' ? args.priority : undefined;
        const waitForResponse = args.waitForResponse;
        if (!agent || !task) {
            return { error: "Missing required agent or task", hint: "Provide both agent and task for delegate_to_agent" };
        }
        addLog('SYSTEM', `🤝 DELEGATING TO ${agent}: "${task}"`);
        audio.playClick();

        try {
            // Actually run agent reasoning
            addLog('SYSTEM', `🧠 ${agent} is analyzing...`);
            const result = await runAgentReasoning(
                agent,
                task,
                `Priority: ${priority || 'normal'}. Current sector: ${useAppStore.getState().mode}`
            );

            // Store delegation record in neuralVault
            const delegationRecord = {
                id: `del_${Date.now()}`,
                agent: result.agentName,
                agentId: result.agentId,
                task,
                priority: priority || 'normal',
                status: 'completed',
                response: result.response,
                created: result.timestamp
            };

            try {
                const delegations = await neuralVault.get('delegations') || [];
                delegations.push(delegationRecord);
                // Keep last 50 delegations
                if (delegations.length > 50) delegations.shift();
                await neuralVault.set('delegations', delegations);

                // Also store in SovereignMemory for semantic recall
                await sovereignMemory.store(delegationRecord.id, JSON.stringify({
                    type: 'agent_delegation',
                    ...delegationRecord
                }));
            } catch {
                // Fallback to localStorage
                const delegations = JSON.parse(localStorage.getItem('delegations') || '[]');
                delegations.push(delegationRecord);
                localStorage.setItem('delegations', JSON.stringify(delegations));
            }

            addLog('SUCCESS', `✅ ${result.agentName} responded (delegation logged)`);
            audio.playClick();

            return {
                status: "DELEGATION_COMPLETE",
                agent: result.agentName,
                agentId: result.agentId,
                task,
                response: result.response,
                delegationId: delegationRecord.id,
                message: `${result.agentName}'s analysis: ${result.response}`
            };
        } catch (e: any) {
            addLog('ERROR', `Agent reasoning failed: ${e.message}`);
            return {
                status: "DELEGATION_FAILED",
                agent,
                task,
                error: e.message,
                message: `I apologize, Sir. ${agent} encountered an issue: ${e.message}`
            };
        }
    }

    if (name === 'voice_journal') {
        const entry = typeof args.entry === 'string' ? args.entry.trim() : '';
        const category = typeof args.category === 'string' ? args.category.trim() : '';
        const mood = typeof args.mood === 'string' ? args.mood.trim() : undefined;
        const isPrivate = !!args.private;
        if (!entry) {
            return { error: "Missing required entry", hint: "Provide an entry string for voice_journal" };
        }
        const entryId = `journal_${Date.now()}`;
        const cat = category || 'thought';

        // Store in SovereignMemory with semantic indexing
        try {
            await sovereignMemory.store(entryId, JSON.stringify({
                type: 'journal_entry',
                entry,
                category: cat,
                mood: mood || null,
                private: isPrivate || false,
                source: 'voice',
                timestamp: Date.now()
            }));

            // Also store in neuralVault for cross-session persistence
            const existingJournal = await neuralVault.get('voice_journal') || [];
            existingJournal.push({
                id: entryId,
                entry,
                category: cat,
                mood,
                private: isPrivate || false,
                timestamp: Date.now()
            });
            // Keep last 100 entries
            if (existingJournal.length > 100) existingJournal.shift();
            await neuralVault.set('voice_journal', existingJournal);

            addLog('SYSTEM', `📓 JOURNAL: ${cat} stored in Neural Vault with semantic indexing`);
            return {
                status: "JOURNAL_ENTRY_SAVED",
                category: cat,
                entryId,
                semanticIndexed: true,
                message: `Noted, Sir. ${cat === 'gratitude' ? 'That\'s a lovely thought.' : 'Your reflection has been recorded and semantically indexed.'}`
            };
        } catch (e: any) {
            addLog('WARN', `JOURNAL: Fallback to localStorage - ${e.message}`);
            // Fallback to localStorage
            const journal = JSON.parse(localStorage.getItem('voice_journal') || '[]');
            journal.push({ id: entryId, entry, category: cat, mood, private: isPrivate || false, timestamp: Date.now() });
            localStorage.setItem('voice_journal', JSON.stringify(journal));
            return {
                status: "JOURNAL_ENTRY_SAVED",
                category: cat,
                semanticIndexed: false,
                message: `Noted, Sir. Your reflection has been recorded.`
            };
        }
    }

    if (name === 'smart_query') {
        const query = typeof args.query === 'string' ? args.query.trim() : '';
        const timeframe = typeof args.timeframe === 'string' ? args.timeframe : undefined;
        const format = typeof args.format === 'string' ? args.format : undefined;
        if (!query) {
            return { error: "Missing required query", hint: "Provide a query for smart_query" };
        }
        addLog('SYSTEM', `📊 QUERY: ${query}`);
        return {
            status: "QUERY_PROCESSING",
            query,
            timeframe: timeframe || 'today',
            format: format || 'verbal',
            instruction: `Answer this query about user data/activity: "${query}". Timeframe: ${timeframe || 'today'}. Format: ${format || 'verbal'}.`
        };
    }

    if (name === 'set_scene') {
        const scene = typeof args.scene === 'string' ? args.scene.trim() : '';
        const duration = typeof args.duration === 'string' || typeof args.duration === 'number'
            ? args.duration
            : undefined;
        const music = args.music;
        if (!scene) {
            return { error: "Missing required scene", hint: "Provide a scene name for set_scene" };
        }
        localStorage.setItem('current_scene', JSON.stringify({ scene, activated: Date.now(), duration }));
        addLog('SYSTEM', `🎬 SCENE: ${scene}`);
        audio.playClick();
        const sceneMessages: Record<string, string> = {
            deep_work: "Deep work environment activated. Distractions minimized.",
            creative: "Creative mode engaged. Let inspiration flow.",
            meeting: "Meeting mode active. Recording enabled.",
            brainstorm: "Brainstorm space ready. All ideas welcome.",
            review: "Review mode set. Analytical focus engaged.",
            wind_down: "Winding down. Pace slowing.",
            energy: "Energy mode! Let's move fast.",
            calm: "Calm atmosphere established.",
            presentation: "Presentation mode. Looking sharp, Sir."
        };
        return {
            status: "SCENE_SET",
            scene,
            duration,
            suggestMusic: music,
            message: sceneMessages[scene as string] || `${scene} mode activated, Sir.`
        };
    }

    if (name === 'quick_command') {
        const command = typeof args.command === 'string' ? args.command.trim() : '';
        if (!command) {
            return { error: "Missing required command", hint: "Provide a command for quick_command" };
        }
        addLog('SYSTEM', `⚡ QUICK: ${command}`);
        const quickResponses: Record<string, any> = {
            status: { action: 'get_status', message: 'Checking status, Sir.' },
            help: { action: 'show_help', message: 'How may I assist you, Sir?' },
            back: { action: 'navigate_back', message: 'Going back.' },
            forward: { action: 'navigate_forward', message: 'Going forward.' },
            refresh: { action: 'refresh', message: 'Refreshing.' },
            clear: { action: 'clear', message: 'Cleared, Sir.' },
            save: { action: 'save', message: 'Saved.' },
            done: { action: 'complete', message: 'Marking complete.' },
            cancel: { action: 'cancel', message: 'Cancelled, Sir.' },
            confirm: { action: 'confirm', message: 'Confirmed.' },
            yes: { action: 'affirm', message: 'Proceeding.' },
            no: { action: 'decline', message: 'Understood, declining.' },
            more: { action: 'expand', message: 'Showing more.' },
            less: { action: 'collapse', message: 'Showing less.' },
            next: { action: 'next', message: 'Next item.' },
            previous: { action: 'previous', message: 'Previous item.' },
            stop: { action: 'stop', message: 'Stopping.' },
            go: { action: 'proceed', message: 'Proceeding.' },
            wait: { action: 'pause', message: 'Waiting, Sir.' },
            skip: { action: 'skip', message: 'Skipping.' }
        };
        return {
            status: "QUICK_COMMAND",
            ...(quickResponses[command] || { action: command, message: `${command} executed.` })
        };
    }

    if (name === 'annotate_item') {
        const target = typeof args.target === 'string' ? args.target.trim() : '';
        const annotation = typeof args.annotation === 'string' ? args.annotation : '';
        const type = typeof args.type === 'string' ? args.type.trim() : '';
        const annAction = typeof args.action === 'string' ? args.action.trim() : '';
        const annotationType = type || 'note';
        const targetItem = target || 'current';
        if (annAction !== 'list' && annAction !== 'clear' && annotation.trim().length === 0) {
            return { error: "Missing annotation", hint: "Provide annotation text for annotate_item" };
        }

        try {
            if (annAction === 'list') {
                // List annotations for target
                const allAnnotations = await neuralVault.get('voice_annotations') || [];
                const filtered = targetItem === 'all'
                    ? allAnnotations
                    : allAnnotations.filter((a: any) => a.target === targetItem || a.target === 'current');
                return {
                    status: "ANNOTATIONS_LIST",
                    annotations: filtered.slice(-20),
                    count: filtered.length,
                    message: `Found ${filtered.length} annotation${filtered.length !== 1 ? 's' : ''}, Sir.`
                };
            }

            if (annAction === 'clear') {
                // Clear annotations for target
                const allAnnotations = await neuralVault.get('voice_annotations') || [];
                const remaining = targetItem === 'all'
                    ? []
                    : allAnnotations.filter((a: any) => a.target !== targetItem);
                await neuralVault.set('voice_annotations', remaining);
                return {
                    status: "ANNOTATIONS_CLEARED",
                    clearedCount: allAnnotations.length - remaining.length,
                    message: `Annotations cleared, Sir.`
                };
            }

            // Default: add annotation
            const annotationId = `ann_${Date.now()}`;
            const annotations = await neuralVault.get('voice_annotations') || [];
            const newAnnotation = {
                id: annotationId,
                target: targetItem,
                annotation,
                type: annotationType,
                timestamp: Date.now()
            };
            annotations.push(newAnnotation);
            // Keep last 200 annotations
            if (annotations.length > 200) annotations.shift();
            await neuralVault.set('voice_annotations', annotations);

            // Store in SovereignMemory for semantic search
            await sovereignMemory.store(annotationId, JSON.stringify({
                ...newAnnotation,
                type: 'annotation'
            }));

            addLog('SYSTEM', `📌 ANNOTATED: ${annotationType} on ${targetItem}`);
            return {
                status: "ANNOTATION_ADDED",
                id: annotationId,
                target: targetItem,
                type: annotationType,
                persistedTo: 'neuralVault + SovereignMemory',
                message: `${annotationType === 'warning' ? '⚠️ Warning' : annotationType === 'idea' ? '💡 Idea' : '📝 Note'} added, Sir.`
            };
        } catch (e: any) {
            addLog('WARN', `ANNOTATE_ITEM: Fallback to localStorage - ${e.message}`);
            const annotations = JSON.parse(localStorage.getItem('voice_annotations') || '[]');
            annotations.push({
                id: `ann_${Date.now()}`,
                target: targetItem,
                annotation,
                type: annotationType,
                timestamp: Date.now()
            });
            localStorage.setItem('voice_annotations', JSON.stringify(annotations));
            return {
                status: "ANNOTATION_ADDED",
                target: targetItem,
                type: annotationType,
                message: `${annotationType === 'warning' ? '⚠️ Warning' : annotationType === 'idea' ? '💡 Idea' : '📝 Note'} added, Sir.`
            };
        }
    }

    if (name === 'mood_check') {
        const moodAction = typeof args.action === 'string' ? args.action.trim() : '';
        const mood = typeof args.mood === 'string' ? args.mood.trim() : '';
        const parsedEnergy = typeof args.energy === 'number' ? args.energy : Number(args.energy);
        const energy = Number.isFinite(parsedEnergy) ? parsedEnergy : undefined;

        // Get biometric data if available to enrich mood logging
        const biometricData = faceDetectionService.isReady() ? {
            detectedMood: (() => {
                const detection = faceDetectionService.getLastDetection();
                if (detection?.expressions) {
                    const sorted = Object.entries(detection.expressions).sort((a: any, b: any) => (b[1] as number) - (a[1] as number));
                    return (sorted[0]?.[1] as number) > 0.3 ? sorted[0][0] : null;
                }
                return null;
            })(),
            stressLevel: faceDetectionService.estimateStress().level,
            blinkRate: faceDetectionService.getBlinkRate()
        } : null;

        try {
            if (moodAction === 'log') {
                const moods = await neuralVault.get('mood_log') || [];
                const entry = {
                    id: `mood_${Date.now()}`,
                    mood: mood || biometricData?.detectedMood || 'unspecified',
                    energy: energy || null,
                    biometrics: biometricData,
                    timestamp: Date.now()
                };
                moods.push(entry);
                // Keep last 100 mood entries
                if (moods.length > 100) moods.shift();
                await neuralVault.set('mood_log', moods);

                // Also store in SovereignMemory for pattern analysis
                await sovereignMemory.store(entry.id, JSON.stringify({
                    type: 'mood_entry',
                    ...entry
                }));

                addLog('SYSTEM', `😊 MOOD: ${mood || biometricData?.detectedMood || 'logged'} (with biometrics: ${biometricData ? 'yes' : 'no'})`);

                // Generate contextual message
                let message = `Mood logged, Sir.`;
                if (typeof energy === 'number' && energy < 4) message += ' Perhaps a short break would help?';
                if (Number(biometricData?.stressLevel ?? 0) > 50) message += ' I notice elevated stress indicators - consider a brief respite.';
                if (biometricData?.detectedMood && mood && biometricData.detectedMood !== mood) {
                    message += ` (Interesting: biometrics suggest ${biometricData.detectedMood}.)`;
                }

                return {
                    status: "MOOD_LOGGED",
                    mood: mood || biometricData?.detectedMood,
                    energy,
                    biometricInsight: biometricData ? {
                        detectedMood: biometricData.detectedMood,
                        stressLevel: biometricData.stressLevel,
                        blinkRate: biometricData.blinkRate
                    } : null,
                    message
                };
            }

            if (moodAction === 'history') {
                const moods = await neuralVault.get('mood_log') || [];
                const recentMoods = moods.slice(-10);

                // Analyze patterns
                const moodCounts: Record<string, number> = {};
                recentMoods.forEach((m: any) => {
                    if (m.mood) moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1;
                });
                const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];

                return {
                    status: "MOOD_HISTORY",
                    entries: recentMoods,
                    count: moods.length,
                    pattern: dominantMood ? { mood: dominantMood[0], frequency: dominantMood[1] } : null,
                    instruction: "Summarize mood history conversationally, noting any patterns."
                };
            }

            // Default mood check with biometric awareness
            return {
                status: "MOOD_CHECK",
                currentBiometrics: biometricData,
                instruction: biometricData
                    ? `Perform a mood check. Biometrics suggest: ${biometricData.detectedMood || 'neutral'}, stress: ${biometricData.stressLevel}%. Ask how the user is actually feeling and provide supportive response.`
                    : `Perform a mood check. Ask how the user is feeling and provide supportive response.`
            };
        } catch (e: any) {
            addLog('WARN', `MOOD_CHECK: Fallback to localStorage - ${e.message}`);
            const moods = JSON.parse(localStorage.getItem('mood_log') || '[]');
            if (moodAction === 'log') {
                moods.push({ mood, energy, timestamp: Date.now() });
                localStorage.setItem('mood_log', JSON.stringify(moods));
                return { status: "MOOD_LOGGED", mood, energy, message: `Mood logged, Sir.` };
            }
            if (moodAction === 'history') {
                return { status: "MOOD_HISTORY", entries: moods.slice(-10), count: moods.length };
            }
            return { status: "MOOD_CHECK", instruction: `Perform a mood check.` };
        }
    }

    if (name === 'contextual_repeat') {
        const { what, modification } = args;
        addLog('SYSTEM', `🔄 REPEAT: ${what || 'last action'}`);
        return {
            status: "REPEAT_REQUESTED",
            what: what || 'last_action',
            modification,
            instruction: `Repeat the ${what || 'last action'}${modification ? ` with modification: ${modification}` : ''}.`
        };
    }

    if (name === 'chain_commands') {
        const commands = Array.isArray(args.commands)
            ? args.commands.filter((cmd): cmd is string => typeof cmd === 'string' && cmd.trim().length > 0)
            : [];
        if (commands.length === 0) {
            return { error: "Missing commands", hint: "Provide a non-empty commands array for chain_commands" };
        }
        const waitBetween = !!args.waitBetween;
        addLog('SYSTEM', `⛓️ CHAIN: ${commands.length} commands`);
        return {
            status: "CHAIN_INITIATED",
            commands,
            waitBetween,
            instruction: `Execute these commands in sequence${waitBetween ? ' (waiting for confirmation between each)' : ''}: ${commands.join(' → ')}`
        };
    }

    if (name === 'conditional_action') {
        const { condition, ifTrue, ifFalse } = args;
        addLog('SYSTEM', `❓ CONDITIONAL: if ${condition}`);
        return {
            status: "CONDITIONAL_PROCESSING",
            condition,
            ifTrue,
            ifFalse,
            instruction: `Evaluate condition: "${condition}". If true: ${ifTrue}. ${ifFalse ? `If false: ${ifFalse}.` : ''}`
        };
    }

    if (name === 'voice_bookmark') {
        const bmAction = typeof args.action === 'string' ? args.action.trim() : '';
        const bmName = typeof args.name === 'string' ? args.name.trim() : '';
        const description = typeof args.description === 'string' ? args.description : undefined;
        if (!bmAction) {
            return { error: "Missing required action", hint: "Provide action for voice_bookmark (create, list, go, delete)" };
        }
        if ((bmAction === 'go' || bmAction === 'delete') && !bmName) {
            return { error: "Missing required name", hint: `Provide bookmark name for voice_bookmark ${bmAction}` };
        }
        const state = useAppStore.getState();

        try {
            const bookmarks = await neuralVault.get('voice_bookmarks') || {};

            if (bmAction === 'create') {
                const bookmarkName = bmName || `bookmark_${Object.keys(bookmarks).length + 1}`;
                bookmarks[bookmarkName] = {
                    mode: state.mode,
                    description,
                    created: Date.now(),
                    useCount: 0
                };
                await neuralVault.set('voice_bookmarks', bookmarks);
                addLog('SYSTEM', `🔖 BOOKMARK: ${bookmarkName} persisted`);
                return {
                    status: "BOOKMARK_CREATED",
                    name: bookmarkName,
                    persistedTo: 'neuralVault',
                    message: `Bookmark saved, Sir.`
                };
            }

            if (bmAction === 'list') {
                const bookmarkList = Object.entries(bookmarks).map(([k, v]: [string, any]) => ({
                    name: k,
                    mode: v.mode,
                    description: v.description,
                    useCount: v.useCount || 0
                }));
                return {
                    status: "BOOKMARKS_LISTED",
                    bookmarks: bookmarkList,
                    count: bookmarkList.length,
                    message: `You have ${bookmarkList.length} bookmark${bookmarkList.length !== 1 ? 's' : ''}, Sir.`
                };
            }

            if (bmAction === 'go' && bmName && bookmarks[bmName]) {
                const bm = bookmarks[bmName];
                bm.useCount = (bm.useCount || 0) + 1;
                bm.lastUsed = Date.now();
                await neuralVault.set('voice_bookmarks', bookmarks);
                setMode(bm.mode);
                addLog('SYSTEM', `🔖 BOOKMARK: Going to ${bmName}`);
                return {
                    status: "BOOKMARK_NAVIGATED",
                    name: bmName,
                    mode: bm.mode,
                    message: `Returning to ${bmName}, Sir.`
                };
            }

            if (bmAction === 'delete' && bmName && bookmarks[bmName]) {
                delete bookmarks[bmName];
                await neuralVault.set('voice_bookmarks', bookmarks);
                return { status: "BOOKMARK_DELETED", name: bmName, message: `Bookmark "${bmName}" deleted, Sir.` };
            }

            return { status: "BOOKMARK_ACTION", action: bmAction };
        } catch (e: any) {
            addLog('WARN', `VOICE_BOOKMARK: Fallback to localStorage - ${e.message}`);
            const bookmarks = JSON.parse(localStorage.getItem('voice_bookmarks') || '{}');
            if (bmAction === 'create') {
                const bookmarkName = bmName || `bookmark_${Object.keys(bookmarks).length + 1}`;
                bookmarks[bookmarkName] = {
                    mode: state.mode,
                    description,
                    created: Date.now()
                };
                localStorage.setItem('voice_bookmarks', JSON.stringify(bookmarks));
                return { status: "BOOKMARK_CREATED", name: bookmarkName, message: `Bookmark saved, Sir.` };
            }
            if (bmAction === 'list') {
                return { status: "BOOKMARKS_LISTED", bookmarks: Object.keys(bookmarks), count: Object.keys(bookmarks).length };
            }
            if (bmAction === 'go' && bmName && bookmarks[bmName]) {
                setMode(bookmarks[bmName].mode);
                return { status: "BOOKMARK_NAVIGATED", name: bmName, message: `Returning to ${bmName}, Sir.` };
            }
            return { status: "BOOKMARK_ACTION", action: bmAction };
        }
    }

    if (name === 'smart_notify') {
        const notifyMode = typeof args.mode === 'string' ? args.mode.trim() : '';
        const filter = args.filter;
        const notifyDuration = args.duration;
        if (!notifyMode) {
            return { error: "Missing required mode", hint: "Provide mode for smart_notify (all, priority, urgent, none, custom)" };
        }
        localStorage.setItem('notification_settings', JSON.stringify({ mode: notifyMode, filter, until: notifyDuration }));
        addLog('SYSTEM', `🔔 NOTIFY: ${notifyMode}`);
        const modeMessages: Record<string, string> = {
            all: "All notifications enabled.",
            priority: "Only priority notifications will come through.",
            urgent: "Only urgent matters will interrupt, Sir.",
            none: "Do not disturb mode activated.",
            custom: "Custom notification filter applied."
        };
        return {
            status: "NOTIFICATIONS_SET",
            mode: notifyMode,
            message: modeMessages[notifyMode] || "Notification settings updated."
        };
    }

    if (name === 'conversation_mode') {
        const style = typeof args.style === 'string' ? args.style.trim() : '';
        const verbosity = typeof args.verbosity === 'string' ? args.verbosity : undefined;
        if (!style) {
            return { error: "Missing required style", hint: "Provide style for conversation_mode" };
        }
        localStorage.setItem('conversation_prefs', JSON.stringify({ style, verbosity }));
        addLog('SYSTEM', `💬 CONVERSATION: ${style}`);
        return {
            status: "CONVERSATION_MODE_SET",
            style,
            verbosity: verbosity || 'normal',
            message: `Understood, Sir. I'll be more ${style}.`,
            instruction: `Adjust response style to: ${style}. Verbosity: ${verbosity || 'normal'}.`
        };
    }

    if (name === 'quick_answer') {
        const question = typeof args.question === 'string' ? args.question.trim() : '';
        if (!question) {
            return { error: "Missing required question", hint: "Provide a question for quick_answer" };
        }
        addLog('SYSTEM', `❓ QUICK ANSWER: ${question}`);
        // Handle some quick answers directly
        if (question.toLowerCase().includes('time')) {
            return { status: "ANSWERED", answer: new Date().toLocaleTimeString(), question };
        }
        if (question.toLowerCase().includes('date') || question.toLowerCase().includes('day')) {
            return { status: "ANSWERED", answer: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), question };
        }
        return {
            status: "QUICK_ANSWER",
            question,
            instruction: `Provide a quick, direct answer to: "${question}"`
        };
    }

    if (name === 'interpret_intent') {
        const utterance = typeof args.utterance === 'string' ? args.utterance : undefined;
        const intentContext = typeof args.context === 'string' ? args.context : undefined;
        addLog('SYSTEM', `🎯 INTENT: Interpreting...`);
        return {
            status: "INTENT_ANALYSIS",
            utterance,
            context: intentContext,
            instruction: `Analyze and clarify intent. ${utterance ? `Utterance: "${utterance}".` : 'Clarify the last request.'} ${intentContext ? `Context: ${intentContext}` : ''}`
        };
    }

    if (name === 'confirm_understanding') {
        const about = typeof args.about === 'string' ? args.about : undefined;
        addLog('SYSTEM', `✅ CONFIRM: Understanding check`);
        return {
            status: "UNDERSTANDING_CONFIRMED",
            about,
            instruction: `Confirm understanding${about ? ` about: ${about}` : ''}. Summarize what was understood and ask if correct.`
        };
    }

    if (name === 'suggest_completion') {
        const partial = typeof args.partial === 'string' ? args.partial : undefined;
        const category = typeof args.category === 'string' ? args.category : undefined;
        addLog('SYSTEM', `💡 SUGGEST: Command completion`);
        return {
            status: "SUGGESTIONS_READY",
            partial,
            category,
            instruction: `Suggest voice commands${partial ? ` that match "${partial}"` : ''}${category ? ` in category: ${category}` : ''}. Provide 3-5 relevant commands.`
        };
    }

    if (name === 'voice_search') {
        const searchQuery = typeof args.query === 'string' ? args.query.trim() : '';
        const scope = typeof args.scope === 'string' ? args.scope : undefined;
        const parsedSearchLimit = typeof args.limit === 'number' ? args.limit : Number(args.limit);
        const searchLimit = Number.isFinite(parsedSearchLimit) && parsedSearchLimit > 0 ? Math.floor(parsedSearchLimit) : 10;
        if (!searchQuery) {
            return { error: "Missing required query", hint: "Provide a search query for voice_search" };
        }
        addLog('SYSTEM', `🔍 SEARCH: ${searchQuery}`);
        return {
            status: "SEARCH_INITIATED",
            query: searchQuery,
            scope: scope || 'all',
            limit: searchLimit,
            instruction: `Search for "${searchQuery}" across ${scope || 'all'} sources. Return top ${searchLimit} results.`
        };
    }

    if (name === 'narrate_actions') {
        const enabled = typeof args.enabled === 'boolean' ? args.enabled : undefined;
        const detail = typeof args.detail === 'string' ? args.detail : undefined;
        if (enabled === undefined) {
            return { error: "Missing required enabled", hint: "Provide enabled as true or false for narrate_actions" };
        }
        localStorage.setItem('narration_enabled', JSON.stringify({ enabled, detail: detail || 'normal' }));
        addLog('SYSTEM', `🎙️ NARRATION: ${enabled ? 'ON' : 'OFF'}`);
        return {
            status: "NARRATION_SET",
            enabled,
            detail: detail || 'normal',
            message: enabled ? `I'll narrate my actions, Sir.` : `Silent mode, Sir. Actions without commentary.`
        };
    }

    if (name === 'pause_resume') {
        const prAction = typeof args.action === 'string' ? args.action.trim().toLowerCase() : '';
        const prTarget = typeof args.target === 'string' ? args.target : undefined;
        if (!prAction) {
            return { error: "Missing required action", hint: "Provide action for pause_resume (pause, resume, toggle)" };
        }
        addLog('SYSTEM', `⏸️ ${prAction.toUpperCase()}: ${prTarget || 'operations'}`);
        return {
            status: prAction === 'pause' ? 'PAUSED' : prAction === 'resume' ? 'RESUMED' : 'TOGGLED',
            action: prAction,
            target: prTarget,
            message: prAction === 'pause' ? `Holding, Sir. Say "resume" when ready.` : `Continuing, Sir.`
        };
    }

    return undefined; // Not handled by this module
}
