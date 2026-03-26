import type { ToolHandlerDeps, ToolHandlerResult } from './handlerTypes';

/**
 * Productivity, Documents & Developer Tools - documents, code gen, daily briefs
 * Extracted from VoiceManager/index.tsx lines 4396-4945
 */
export async function handleProductivity(
    name: string,
    args: Record<string, unknown>,
    deps: ToolHandlerDeps
): Promise<ToolHandlerResult> {
    const { addLog, useAppStore, neuralVault, sovereignMemory, voice, dreamProtocol, faceDetectionService } = deps;

    if (name === 'document_ops') {
        const docAction = typeof args.action === 'string' ? args.action.trim() : '';
        const docType = typeof args.type === 'string' ? args.type : undefined;
        const docName = typeof args.name === 'string' ? args.name : undefined;
        const docContent = typeof args.content === 'string' ? args.content : undefined;
        if (!docAction) {
            return { error: "Missing required action", hint: "Provide action for document_ops" };
        }
        if (docAction === 'create' && !docName) {
            return { error: "Missing required name", hint: "Provide document name for document_ops create" };
        }
        addLog('SYSTEM', `📄 DOCUMENT: ${docAction} ${docType || 'document'}`);
        if (docAction === 'create') {
            const docs = JSON.parse(localStorage.getItem('voice_documents') || '[]');
            docs.push({ id: `doc_${Date.now()}`, type: docType, name: docName, content: docContent, created: Date.now() });
            localStorage.setItem('voice_documents', JSON.stringify(docs));
            return { status: "DOCUMENT_CREATED", type: docType, name: docName, message: `${docType || 'Document'} created, Sir.` };
        }
        return { status: "DOCUMENT_ACTION", action: docAction, type: docType };
    }

    if (name === 'meeting_mode') {
        const mtgAction = typeof args.action === 'string' ? args.action.trim() : '';
        const meetingName = typeof args.meetingName === 'string' ? args.meetingName : undefined;
        const mtgContent = typeof args.content === 'string' ? args.content : undefined;
        if (!mtgAction) {
            return { error: "Missing required action", hint: "Provide action for meeting_mode (start, note, action_item, end)" };
        }
        if ((mtgAction === 'note' || mtgAction === 'action_item') && !mtgContent) {
            return { error: "Missing required content", hint: `Provide content for meeting_mode ${mtgAction}` };
        }
        const meetings = JSON.parse(localStorage.getItem('meeting_state') || '{}');

        if (mtgAction === 'start') {
            meetings.current = { name: meetingName, started: Date.now(), notes: [], actionItems: [] };
            localStorage.setItem('meeting_state', JSON.stringify(meetings));
            addLog('SYSTEM', `🎙️ MEETING STARTED: ${meetingName || 'Untitled'}`);
            return { status: "MEETING_STARTED", name: meetingName, message: `Meeting started, Sir. I'll track notes and action items.` };
        }

        if (mtgAction === 'note' && meetings.current) {
            meetings.current.notes.push({ content: mtgContent, time: Date.now() });
            localStorage.setItem('meeting_state', JSON.stringify(meetings));
            return { status: "NOTE_ADDED", message: "Noted." };
        }

        if (mtgAction === 'action_item' && meetings.current) {
            meetings.current.actionItems.push({ content: mtgContent, time: Date.now() });
            localStorage.setItem('meeting_state', JSON.stringify(meetings));
            return { status: "ACTION_ITEM_ADDED", message: "Action item captured." };
        }

        if (mtgAction === 'end' && meetings.current) {
            const ended = { ...meetings.current, ended: Date.now() };
            if (!meetings.history) meetings.history = [];
            meetings.history.push(ended);
            meetings.current = null;
            localStorage.setItem('meeting_state', JSON.stringify(meetings));
            addLog('SYSTEM', `🎙️ MEETING ENDED`);
            return { status: "MEETING_ENDED", notes: ended.notes.length, actionItems: ended.actionItems.length, message: `Meeting concluded, Sir. ${ended.notes.length} notes, ${ended.actionItems.length} action items captured.` };
        }

        return { status: "MEETING_ACTION", action: mtgAction };
    }

    if (name === 'presentation_mode') {
        const presAction = typeof args.action === 'string' ? args.action.trim() : '';
        const parsedSlideNumber = typeof args.slideNumber === 'number' ? args.slideNumber : Number(args.slideNumber);
        const slideNumber = Number.isFinite(parsedSlideNumber) && parsedSlideNumber > 0
            ? Math.floor(parsedSlideNumber)
            : undefined;
        if (!presAction) {
            return { error: "Missing required action", hint: "Provide action for presentation_mode" };
        }
        if (presAction === 'goto' && !slideNumber) {
            return { error: "Invalid slideNumber", hint: "Provide a positive slideNumber for presentation_mode goto" };
        }
        const presState = JSON.parse(localStorage.getItem('presentation_state') || '{}');
        addLog('SYSTEM', `📊 PRESENTATION: ${presAction}`);

        if (presAction === 'start') {
            presState.active = true;
            presState.currentSlide = 1;
            presState.started = Date.now();
            localStorage.setItem('presentation_state', JSON.stringify(presState));
            return { status: "PRESENTATION_STARTED", message: "Presentation mode activated. Good luck, Sir." };
        }

        if (presAction === 'next') {
            presState.currentSlide = (presState.currentSlide || 1) + 1;
            localStorage.setItem('presentation_state', JSON.stringify(presState));
            return { status: "NEXT_SLIDE", slide: presState.currentSlide };
        }

        if (presAction === 'previous') {
            presState.currentSlide = Math.max(1, (presState.currentSlide || 1) - 1);
            localStorage.setItem('presentation_state', JSON.stringify(presState));
            return { status: "PREVIOUS_SLIDE", slide: presState.currentSlide };
        }

        if (presAction === 'goto') {
            presState.currentSlide = slideNumber;
            localStorage.setItem('presentation_state', JSON.stringify(presState));
            return { status: "GOTO_SLIDE", slide: slideNumber };
        }

        if (presAction === 'end') {
            presState.active = false;
            localStorage.setItem('presentation_state', JSON.stringify(presState));
            return { status: "PRESENTATION_ENDED", message: "Presentation concluded, Sir." };
        }

        return { status: "PRESENTATION_ACTION", action: presAction };
    }

    if (name === 'quick_note') {
        const noteAction = typeof args.action === 'string' ? args.action.trim() : '';
        const noteContent = typeof args.content === 'string' ? args.content : '';
        const tag = typeof args.tag === 'string' ? args.tag : undefined;
        if (!noteAction) {
            return { error: "Missing required action", hint: "Provide action for quick_note (add, list, search, clear)" };
        }
        if ((noteAction === 'add' || noteAction === 'search') && noteContent.trim().length === 0) {
            return { error: "Missing required content", hint: `Provide content for quick_note ${noteAction}` };
        }

        try {
            const quickNotes = await neuralVault.get('quick_notes') || [];

            if (noteAction === 'add') {
                const noteId = `note_${Date.now()}`;
                const newNote = {
                    id: noteId,
                    content: noteContent,
                    tag: tag || null,
                    timestamp: Date.now()
                };
                quickNotes.push(newNote);
                // Keep last 500 notes
                if (quickNotes.length > 500) quickNotes.shift();
                await neuralVault.set('quick_notes', quickNotes);

                // Store in SovereignMemory for semantic search
                await sovereignMemory.store(noteId, JSON.stringify({
                    type: 'quick_note',
                    ...newNote
                }));

                addLog('SYSTEM', `📝 QUICK NOTE: Added (semantically indexed)`);
                return {
                    status: "NOTE_ADDED",
                    id: noteId,
                    count: quickNotes.length,
                    semanticIndexed: true,
                    message: "Noted, Sir."
                };
            }

            if (noteAction === 'list') {
                return {
                    status: "NOTES_LISTED",
                    notes: quickNotes.slice(-10),
                    count: quickNotes.length,
                    message: `You have ${quickNotes.length} quick note${quickNotes.length !== 1 ? 's' : ''}, Sir.`
                };
            }

            if (noteAction === 'search' && noteContent) {
                // Semantic search for notes
                const searchResults = await sovereignMemory.search(noteContent, 5);
                const noteMatches = searchResults
                    .filter((r: any) => r.type === 'quick_note' || r.content?.includes('quick_note'))
                    .slice(0, 5);
                return {
                    status: "NOTES_SEARCH",
                    query: noteContent,
                    results: noteMatches,
                    count: noteMatches.length,
                    message: `Found ${noteMatches.length} matching note${noteMatches.length !== 1 ? 's' : ''}, Sir.`
                };
            }

            if (noteAction === 'clear') {
                await neuralVault.set('quick_notes', []);
                return { status: "NOTES_CLEARED", message: "Quick notes cleared, Sir." };
            }

            return { status: "NOTE_ACTION", action: noteAction };
        } catch (e: any) {
            addLog('WARN', `QUICK_NOTE: Fallback to localStorage - ${e.message}`);
            const quickNotes = JSON.parse(localStorage.getItem('quick_notes') || '[]');
            if (noteAction === 'add') {
                quickNotes.push({ content: noteContent, tag, timestamp: Date.now() });
                localStorage.setItem('quick_notes', JSON.stringify(quickNotes));
                return { status: "NOTE_ADDED", count: quickNotes.length, message: "Noted, Sir." };
            }
            if (noteAction === 'list') {
                return { status: "NOTES_LISTED", notes: quickNotes.slice(-10), count: quickNotes.length };
            }
            if (noteAction === 'clear') {
                localStorage.setItem('quick_notes', '[]');
                return { status: "NOTES_CLEARED", message: "Quick notes cleared, Sir." };
            }
            return { status: "NOTE_ACTION", action: noteAction };
        }
    }

    if (name === 'transcribe') {
        const transAction = typeof args.action === 'string' ? args.action.trim() : '';
        const transFormat = typeof args.format === 'string' ? args.format : undefined;
        if (!transAction) {
            return { error: "Missing required action", hint: "Provide action for transcribe (start, stop)" };
        }
        addLog('SYSTEM', `📜 TRANSCRIBE: ${transAction}`);
        if (transAction === 'start') {
            localStorage.setItem('transcription_active', 'true');
            return { status: "TRANSCRIPTION_STARTED", message: "Transcription active, Sir. I'm recording everything." };
        }
        if (transAction === 'stop') {
            localStorage.setItem('transcription_active', 'false');
            return { status: "TRANSCRIPTION_STOPPED", message: "Transcription stopped." };
        }
        return { status: "TRANSCRIPTION_ACTION", action: transAction, format: transFormat || 'text' };
    }

    if (name === 'dictate_to_doc') {
        const dictAction = typeof args.action === 'string' ? args.action.trim() : '';
        const dictTarget = typeof args.target === 'string' ? args.target : undefined;
        const formatting = typeof args.formatting === 'string' ? args.formatting : undefined;
        if (!dictAction) {
            return { error: "Missing required action", hint: "Provide action for dictate_to_doc (start, stop)" };
        }
        addLog('SYSTEM', `🎤 DICTATE: ${dictAction}`);
        if (dictAction === 'start') {
            localStorage.setItem('dictation_state', JSON.stringify({ active: true, target: dictTarget, formatting }));
            return { status: "DICTATION_STARTED", target: dictTarget, message: "Ready for dictation, Sir. Speak naturally." };
        }
        if (dictAction === 'stop') {
            localStorage.setItem('dictation_state', JSON.stringify({ active: false }));
            return { status: "DICTATION_STOPPED", message: "Dictation complete." };
        }
        return { status: "DICTATION_ACTION", action: dictAction };
    }

    if (name === 'screen_layout') {
        const layout = typeof args.layout === 'string' ? args.layout.trim() : '';
        const layoutTarget = typeof args.target === 'string' ? args.target : undefined;
        if (!layout) {
            return { error: "Missing required layout", hint: "Provide layout for screen_layout" };
        }
        addLog('SYSTEM', `🖥️ LAYOUT: ${layout}`);
        localStorage.setItem('screen_layout', JSON.stringify({ layout, target: layoutTarget }));
        const messages: Record<string, string> = {
            full: "Full screen mode.",
            split: "Split screen activated.",
            pip: "Picture-in-picture enabled.",
            minimize: "Minimized.",
            maximize: "Maximized.",
            sidebar: "Sidebar layout.",
            compact: "Compact view."
        };
        return { status: "LAYOUT_SET", layout, message: messages[layout] || `Layout set to ${layout}.` };
    }

    if (name === 'parallel_ops') {
        const operations = Array.isArray(args.operations)
            ? args.operations.filter((op): op is string => typeof op === 'string' && op.trim().length > 0)
            : [];
        if (operations.length === 0) {
            return { error: "Missing operations", hint: "Provide a non-empty operations array for parallel_ops" };
        }
        const reportProgress = !!args.reportProgress;
        addLog('SYSTEM', `⚡ PARALLEL: ${operations.length} operations`);
        return {
            status: "PARALLEL_INITIATED",
            operations,
            reportProgress,
            message: `Executing ${operations.length} operations in parallel, Sir.`,
            instruction: `Execute these operations simultaneously: ${operations.join(' AND ')}`
        };
    }

    if (name === 'interrupt_handle') {
        const { action: intAction, note: intNote } = args;
        const interruptStack = JSON.parse(localStorage.getItem('interrupt_stack') || '[]');
        addLog('SYSTEM', `⏸️ INTERRUPT: ${intAction}`);

        if (intAction === 'pause' || intAction === 'sidebar') {
            interruptStack.push({ note: intNote, context: 'current', timestamp: Date.now() });
            localStorage.setItem('interrupt_stack', JSON.stringify(interruptStack));
            return { status: "CONTEXT_PAUSED", stackSize: interruptStack.length, message: "Pausing current thread, Sir. Go ahead with your interruption." };
        }

        if (intAction === 'return' || intAction === 'pop') {
            const popped = interruptStack.pop();
            localStorage.setItem('interrupt_stack', JSON.stringify(interruptStack));
            return { status: "CONTEXT_RESTORED", restored: popped, message: "Returning to where we left off, Sir." };
        }

        return { status: "INTERRUPT_ACTION", action: intAction };
    }

    if (name === 'dev_commands') {
        const devCmd = typeof args.command === 'string' ? args.command.trim() : '';
        const devArgs = args.args;
        const watch = !!args.watch;
        if (!devCmd) {
            return { error: "Missing required command", hint: "Provide command for dev_commands" };
        }
        addLog('SYSTEM', `💻 DEV: ${devCmd}`);
        const cmdDescriptions: Record<string, string> = {
            test: "Running tests",
            build: "Building project",
            serve: "Starting development server",
            deploy: "Initiating deployment",
            logs: "Fetching logs",
            lint: "Running linter",
            format: "Formatting code",
            install: "Installing dependencies"
        };
        return {
            status: "DEV_COMMAND_INITIATED",
            command: devCmd,
            args: devArgs,
            watch,
            message: `${cmdDescriptions[devCmd] || devCmd}, Sir.${watch ? ' Watch mode enabled.' : ''}`
        };
    }

    if (name === 'git_voice') {
        const gitCmd = typeof args.command === 'string' ? args.command.trim() : '';
        const gitMsg = typeof args.message === 'string' ? args.message : undefined;
        const branch = typeof args.branch === 'string' ? args.branch : undefined;
        if (!gitCmd) {
            return { error: "Missing required command", hint: "Provide command for git_voice" };
        }
        addLog('SYSTEM', `🔀 GIT: ${gitCmd}`);
        const gitResponses: Record<string, string> = {
            status: "Checking git status.",
            commit: `Committing changes${gitMsg ? `: "${gitMsg}"` : ''}.`,
            push: `Pushing to ${branch || 'remote'}.`,
            pull: "Pulling latest changes.",
            branch: `Branch operation${branch ? ` on ${branch}` : ''}.`,
            checkout: `Checking out ${branch || 'branch'}.`,
            diff: "Showing differences.",
            log: "Retrieving commit history.",
            stash: "Stashing changes."
        };
        return {
            status: "GIT_COMMAND_INITIATED",
            command: gitCmd,
            message: gitResponses[gitCmd] || `Git ${gitCmd}.`
        };
    }

    if (name === 'build_run') {
        const buildAction = typeof args.action === 'string' ? args.action.trim() : '';
        const environment = typeof args.environment === 'string' ? args.environment : undefined;
        if (!buildAction) {
            return { error: "Missing required action", hint: "Provide action for build_run" };
        }
        addLog('SYSTEM', `🔨 BUILD: ${buildAction} (${environment || 'development'})`);
        return {
            status: "BUILD_ACTION_INITIATED",
            action: buildAction,
            environment: environment || 'development',
            message: buildAction === 'build' ? `Building for ${environment || 'development'}, Sir.` :
                     buildAction === 'run' ? `Starting ${environment || 'development'} server.` :
                     buildAction === 'build_run' ? `Building and running, Sir.` :
                     buildAction === 'stop' ? `Stopping server.` :
                     `Restarting ${environment || 'development'} server.`
        };
    }

    if (name === 'smart_context') {
        const depth = typeof args.depth === 'string' ? args.depth : undefined;
        const ctxFocus = typeof args.focus === 'string' ? args.focus : undefined;
        addLog('SYSTEM', `🧠 SMART CONTEXT: ${depth || 'surface'}`);
        const state = useAppStore.getState();
        return {
            status: "CONTEXT_ANALYZED",
            depth: depth || 'surface',
            focus: ctxFocus,
            currentView: {
                mode: state.mode,
                voiceActive: voice.isActive
            },
            instruction: `Analyze current screen/context at ${depth || 'surface'} level. ${ctxFocus ? `Focus on: ${ctxFocus}.` : ''} Provide intelligent insights.`
        };
    }

    if (name === 'pinned_items') {
        const pinAction = typeof args.action === 'string' ? args.action.trim() : '';
        const item = typeof args.item === 'string' ? args.item.trim() : '';
        const pinCategory = typeof args.category === 'string' ? args.category : undefined;
        if (!pinAction) {
            return { error: "Missing required action", hint: "Provide action for pinned_items (pin, unpin, list, clear)" };
        }
        if ((pinAction === 'pin' || pinAction === 'unpin') && !item) {
            return { error: "Missing required item", hint: `Provide item for pinned_items ${pinAction}` };
        }

        try {
            const pinned = await neuralVault.get('pinned_items') || [];

            if (pinAction === 'pin') {
                const pinId = `pin_${Date.now()}`;
                const newPin = {
                    id: pinId,
                    item,
                    category: pinCategory || 'general',
                    pinned: Date.now()
                };
                pinned.push(newPin);
                await neuralVault.set('pinned_items', pinned);

                // Store in SovereignMemory for quick recall
                await sovereignMemory.store(pinId, JSON.stringify({
                    type: 'pinned_item',
                    ...newPin
                }));

                addLog('SYSTEM', `📌 PINNED: ${item} (persisted)`);
                return {
                    status: "ITEM_PINNED",
                    id: pinId,
                    item,
                    category: pinCategory || 'general',
                    message: "Pinned for quick access, Sir."
                };
            }

            if (pinAction === 'list') {
                const byCategory: Record<string, any[]> = {};
                pinned.forEach((p: any) => {
                    const cat = p.category || 'general';
                    if (!byCategory[cat]) byCategory[cat] = [];
                    byCategory[cat].push(p);
                });
                return {
                    status: "PINNED_LISTED",
                    items: pinned,
                    byCategory,
                    count: pinned.length,
                    message: `You have ${pinned.length} pinned item${pinned.length !== 1 ? 's' : ''}, Sir.`
                };
            }

            if (pinAction === 'unpin') {
                const newPinned = pinned.filter((p: any) => p.item !== item);
                await neuralVault.set('pinned_items', newPinned);
                return { status: "ITEM_UNPINNED", item, message: "Unpinned, Sir." };
            }

            if (pinAction === 'clear') {
                await neuralVault.set('pinned_items', []);
                return { status: "PINS_CLEARED", message: "All pins cleared, Sir." };
            }

            return { status: "PIN_ACTION", action: pinAction };
        } catch (e: any) {
            addLog('WARN', `PINNED_ITEMS: Fallback to localStorage - ${e.message}`);
            const pinned = JSON.parse(localStorage.getItem('pinned_items') || '[]');
            if (pinAction === 'pin') {
                pinned.push({ item, category: pinCategory, pinned: Date.now() });
                localStorage.setItem('pinned_items', JSON.stringify(pinned));
                return { status: "ITEM_PINNED", item, message: "Pinned for quick access, Sir." };
            }
            if (pinAction === 'list') {
                return { status: "PINNED_LISTED", items: pinned, count: pinned.length };
            }
            if (pinAction === 'unpin') {
                const newPinned = pinned.filter((p: any) => p.item !== item);
                localStorage.setItem('pinned_items', JSON.stringify(newPinned));
                return { status: "ITEM_UNPINNED", item, message: "Unpinned." };
            }
            return { status: "PIN_ACTION", action: pinAction };
        }
    }

    if (name === 'daily_brief') {
        const briefType = typeof args.type === 'string' ? args.type : undefined;
        const include = Array.isArray(args.include)
            ? args.include.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
            : [];
        addLog('SYSTEM', `☀️ DAILY BRIEF: ${briefType || 'morning'}`);
        const state = useAppStore.getState();

        try {
            // Pull from real neuralVault data
            const goals = await neuralVault.get('tracked_goals') || [];
            const quickNotes = await neuralVault.get('quick_notes') || [];
            const monitors = await neuralVault.get('active_monitors') || [];
            const moods = await neuralVault.get('mood_log') || [];

            // Get dream protocol insights
            const dreamStatus = dreamProtocol.getStatus();
            const recentSessions = dreamProtocol.getPastSessions().slice(-3);

            // Get biometric summary
            const biometricSummary = faceDetectionService.isReady() ? {
                stressLevel: faceDetectionService.estimateStress().level,
                blinkRate: faceDetectionService.getBlinkRate()
            } : null;

            const activeGoals = goals.filter((g: any) => (g.progress || 0) < 100);
            const recentMoods = moods.slice(-5);
            const avgMoodEnergy = recentMoods.length > 0
                ? recentMoods.reduce((sum: number, m: any) => sum + (m.energy || 5), 0) / recentMoods.length
                : null;

            return {
                status: "BRIEF_READY",
                type: briefType || 'morning',
                include: include.length > 0 ? include : ['tasks', 'goals', 'calendar'],
                data: {
                    currentMode: state.mode,
                    activeGoals: activeGoals.length,
                    goalsSummary: activeGoals.slice(0, 3).map((g: any) => ({ goal: g.goal, progress: g.progress || 0 })),
                    pendingNotes: quickNotes.length,
                    activeMonitors: monitors.filter((m: any) => m.active).length,
                    recentMoodTrend: avgMoodEnergy ? (avgMoodEnergy > 6 ? 'positive' : avgMoodEnergy < 4 ? 'low' : 'neutral') : null,
                    biometrics: biometricSummary,
                    dreamInsights: recentSessions.reduce((acc: number, s: any) => acc + (s.insights?.length || 0), 0),
                    timestamp: new Date().toLocaleString()
                },
                instruction: `Generate a ${briefType || 'morning'} brief. Include: ${(include.length > 0 ? include : ['tasks', 'goals', 'reminders']).join(', ')}. Be concise but comprehensive. Use the data provided for accurate status.`
            };
        } catch (e: any) {
            addLog('WARN', `DAILY_BRIEF: Fallback to localStorage - ${e.message}`);
            const goals = JSON.parse(localStorage.getItem('tracked_goals') || '[]');
            const quickNotes = JSON.parse(localStorage.getItem('quick_notes') || '[]');
            return {
                status: "BRIEF_READY",
                type: briefType || 'morning',
                include: include.length > 0 ? include : ['tasks', 'goals', 'calendar'],
                data: {
                    currentMode: state.mode,
                    activeGoals: goals.filter((g: any) => g.progress < 100).length,
                    pendingNotes: quickNotes.length,
                    timestamp: new Date().toLocaleString()
                },
                instruction: `Generate a ${briefType || 'morning'} brief.`
            };
        }
    }

    return undefined; // Not handled by this module
}
