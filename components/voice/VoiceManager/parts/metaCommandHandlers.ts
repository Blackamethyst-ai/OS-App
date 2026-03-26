import type { ToolHandlerDeps, ToolHandlerResult } from './handlerTypes';

/**
 * Meta-Commands, Learning & Advanced Memory - capabilities, preferences, habits, collaboration
 * Extracted from VoiceManager/index.tsx lines 3762-4394
 */
export async function handleMetaCommands(
    name: string,
    args: Record<string, unknown>,
    deps: ToolHandlerDeps
): Promise<ToolHandlerResult> {
    const { addLog, setMode, useAppStore, neuralVault, sovereignMemory } = deps;

    if (name === 'voice_capabilities') {
        const category = typeof args.category === 'string' ? args.category : undefined;
        const detail = typeof args.detail === 'string' ? args.detail : undefined;
        addLog('SYSTEM', `📚 CAPABILITIES: ${category || 'all'}`);
        const categories = [
            'navigation', 'ui_interaction', 'agents', 'memory', 'automation',
            'monitoring', 'diagnostics', 'research', 'workspace', 'productivity',
            'conversation', 'learning', 'collaboration'
        ];
        return {
            status: "CAPABILITIES_LISTED",
            categories: category ? [category] : categories,
            detail: detail || 'brief',
            totalCommands: 124,
            instruction: `List voice capabilities${category ? ` for ${category}` : ''}. Detail: ${detail || 'brief'}. Provide helpful examples.`
        };
    }

    if (name === 'teach_command') {
        const cmdTrigger = typeof args.trigger === 'string' ? args.trigger.trim() : '';
        const cmdAction = typeof args.action === 'string' ? args.action.trim() : '';
        const context = typeof args.context === 'string' ? args.context : undefined;
        if (!cmdTrigger || !cmdAction) {
            return { error: "Missing required trigger or action", hint: "Provide trigger and action for teach_command" };
        }

        try {
            const commands = await neuralVault.get('custom_commands') || {};
            commands[cmdTrigger] = {
                action: cmdAction,
                context,
                taught: Date.now(),
                useCount: 0
            };
            await neuralVault.set('custom_commands', commands);

            // Store in SovereignMemory for pattern learning
            await sovereignMemory.store(`cmd_${cmdTrigger}`, JSON.stringify({
                type: 'custom_command',
                trigger: cmdTrigger,
                action: cmdAction,
                context,
                taught: Date.now()
            }));

            addLog('SYSTEM', `🎓 TAUGHT: "${cmdTrigger}" (persisted)`);
            return {
                status: "COMMAND_LEARNED",
                trigger: cmdTrigger,
                action: cmdAction,
                persistedTo: 'neuralVault + SovereignMemory',
                message: `Understood, Sir. When you say "${cmdTrigger}", I'll ${cmdAction}.`
            };
        } catch (e: any) {
            addLog('WARN', `TEACH_COMMAND: Fallback to localStorage - ${e.message}`);
            const commands = JSON.parse(localStorage.getItem('custom_commands') || '{}');
            commands[cmdTrigger] = { action: cmdAction, context, taught: Date.now() };
            localStorage.setItem('custom_commands', JSON.stringify(commands));
            return {
                status: "COMMAND_LEARNED",
                trigger: cmdTrigger,
                action: cmdAction,
                message: `Understood, Sir. When you say "${cmdTrigger}", I'll ${cmdAction}.`
            };
        }
    }

    if (name === 'rate_feedback') {
        const rating = typeof args.rating === 'string' ? args.rating.trim() : '';
        const feedback = typeof args.feedback === 'string' ? args.feedback : undefined;
        const about = typeof args.about === 'string' ? args.about : undefined;
        if (!rating) {
            return { error: "Missing required rating", hint: "Provide rating for rate_feedback" };
        }

        try {
            const feedbackLog = await neuralVault.get('feedback_log') || [];
            const entry = {
                id: `fb_${Date.now()}`,
                rating,
                feedback,
                about,
                timestamp: Date.now()
            };
            feedbackLog.push(entry);
            // Keep last 500 feedback entries
            if (feedbackLog.length > 500) feedbackLog.shift();
            await neuralVault.set('feedback_log', feedbackLog);

            // Store in SovereignMemory for learning
            await sovereignMemory.store(entry.id, JSON.stringify({
                type: 'user_feedback',
                ...entry
            }));

            addLog('SYSTEM', `⭐ FEEDBACK: ${rating} (logged for learning)`);
            const responses: Record<string, string> = {
                excellent: "Delighted to be of service, Sir.",
                good: "Thank you for the feedback, Sir.",
                ok: "Noted. I'll aim higher next time.",
                poor: "My apologies, Sir. I'll improve.",
                wrong: "I apologize for the error. Noted for learning."
            };
            return {
                status: "FEEDBACK_RECORDED",
                rating,
                persistedTo: 'neuralVault + SovereignMemory',
                message: responses[rating] || "Feedback noted."
            };
        } catch (e: any) {
            addLog('WARN', `RATE_FEEDBACK: Fallback to localStorage - ${e.message}`);
            const feedbackLog = JSON.parse(localStorage.getItem('feedback_log') || '[]');
            feedbackLog.push({ rating, feedback, about, timestamp: Date.now() });
            localStorage.setItem('feedback_log', JSON.stringify(feedbackLog));
            const responses: Record<string, string> = {
                excellent: "Delighted to be of service, Sir.",
                good: "Thank you for the feedback, Sir.",
                ok: "Noted. I'll aim higher next time.",
                poor: "My apologies, Sir. I'll improve.",
                wrong: "I apologize for the error. Noted for learning."
            };
            return {
                status: "FEEDBACK_RECORDED",
                rating,
                message: responses[rating] || "Feedback noted."
            };
        }
    }

    if (name === 'voice_templates') {
        const tplAction = typeof args.action === 'string' ? args.action.trim() : '';
        const tplName = typeof args.name === 'string' ? args.name.trim() : '';
        const steps = Array.isArray(args.steps)
            ? args.steps.filter((step): step is string => typeof step === 'string' && step.trim().length > 0)
            : [];

        try {
            const templates = await neuralVault.get('voice_templates') || {};

            if (tplAction === 'save') {
                if (!tplName) {
                    return { error: "Missing required name", hint: "Provide a template name for voice_templates save" };
                }
                if (steps.length === 0) {
                    return { error: "Missing steps", hint: "Provide a non-empty steps array for voice_templates save" };
                }
                templates[tplName] = {
                    steps,
                    created: Date.now(),
                    useCount: 0
                };
                await neuralVault.set('voice_templates', templates);
                addLog('SYSTEM', `📋 TEMPLATE SAVED: ${tplName} (persisted)`);
                return {
                    status: "TEMPLATE_SAVED",
                    name: tplName,
                    stepCount: steps.length,
                    persistedTo: 'neuralVault',
                    message: `Template "${tplName}" saved with ${steps.length} steps, Sir.`
                };
            }

            if (tplAction === 'list') {
                const templateList = Object.entries(templates).map(([k, v]: [string, any]) => ({
                    name: k,
                    stepCount: v.steps?.length || 0,
                    useCount: v.useCount || 0
                }));
                return {
                    status: "TEMPLATES_LISTED",
                    templates: templateList,
                    count: templateList.length,
                    message: `You have ${templateList.length} template${templateList.length !== 1 ? 's' : ''}, Sir.`
                };
            }

            if (tplAction === 'run' && tplName && templates[tplName]) {
                const tpl = templates[tplName];
                tpl.useCount = (tpl.useCount || 0) + 1;
                tpl.lastUsed = Date.now();
                await neuralVault.set('voice_templates', templates);
                addLog('SYSTEM', `▶️ RUNNING TEMPLATE: ${tplName}`);
                return {
                    status: "TEMPLATE_RUNNING",
                    name: tplName,
                    steps: tpl.steps,
                    message: `Running "${tplName}", Sir.`
                };
            }

            if (tplAction === 'delete' && tplName && templates[tplName]) {
                delete templates[tplName];
                await neuralVault.set('voice_templates', templates);
                return { status: "TEMPLATE_DELETED", name: tplName, message: `Template "${tplName}" deleted, Sir.` };
            }

            return { status: "TEMPLATE_ACTION", action: tplAction };
        } catch (e: any) {
            addLog('WARN', `VOICE_TEMPLATES: Fallback to localStorage - ${e.message}`);
            const templates = JSON.parse(localStorage.getItem('voice_templates') || '{}');
            if (tplAction === 'save' && tplName && steps.length > 0) {
                templates[tplName] = { steps, created: Date.now() };
                localStorage.setItem('voice_templates', JSON.stringify(templates));
                return { status: "TEMPLATE_SAVED", name: tplName, message: `Template "${tplName}" saved.` };
            }
            if (tplAction === 'list') {
                return { status: "TEMPLATES_LISTED", templates: Object.keys(templates), count: Object.keys(templates).length };
            }
            if (tplAction === 'run' && tplName && templates[tplName]) {
                return { status: "TEMPLATE_RUNNING", name: tplName, steps: templates[tplName].steps };
            }
            return { status: "TEMPLATE_ACTION", action: tplAction };
        }
    }

    if (name === 'context_switch') {
        const to = typeof args.to === 'string' ? args.to.trim() : '';
        const saveCurrentAs = typeof args.saveCurrentAs === 'string' ? args.saveCurrentAs.trim() : '';
        const restore = !!args.restore;
        const state = useAppStore.getState();

        try {
            const contexts = await neuralVault.get('saved_contexts') || {};

            if (saveCurrentAs) {
                contexts[saveCurrentAs] = {
                    mode: state.mode,
                    saved: Date.now()
                };
                await neuralVault.set('saved_contexts', contexts);
            }

            if (to) {
                addLog('SYSTEM', `🔀 CONTEXT SWITCH: → ${to}`);
                return {
                    status: "CONTEXT_SWITCHED",
                    to,
                    savedCurrent: saveCurrentAs,
                    message: `Switching context to ${to}, Sir.`
                };
            }

            if (restore) {
                const lastContext = Object.keys(contexts).pop();
                if (lastContext && contexts[lastContext]) {
                    setMode(contexts[lastContext].mode);
                    return {
                        status: "CONTEXT_RESTORED",
                        restored: lastContext,
                        message: `Restored to ${lastContext}, Sir.`
                    };
                }
            }

            return { status: "CONTEXT_ACTION", instruction: "Context switch requested. Clarify destination." };
        } catch (e: any) {
            addLog('WARN', `CONTEXT_SWITCH: Fallback to localStorage - ${e.message}`);
            const contexts = JSON.parse(localStorage.getItem('saved_contexts') || '{}');
            if (saveCurrentAs) {
                contexts[saveCurrentAs] = { mode: state.mode, saved: Date.now() };
                localStorage.setItem('saved_contexts', JSON.stringify(contexts));
            }
            if (to) {
                return { status: "CONTEXT_SWITCHED", to, savedCurrent: saveCurrentAs, message: `Switching context to ${to}, Sir.` };
            }
            if (restore) {
                const lastContext = Object.keys(contexts).pop();
                if (lastContext && contexts[lastContext]) {
                    setMode(contexts[lastContext].mode);
                    return { status: "CONTEXT_RESTORED", restored: lastContext };
                }
            }
            return { status: "CONTEXT_ACTION", instruction: "Context switch requested." };
        }
    }

    if (name === 'focus_entity') {
        const entity = typeof args.entity === 'string' ? args.entity.trim() : '';
        const entityType = typeof args.entityType === 'string' ? args.entityType : undefined;
        if (!entity) {
            return { error: "Missing required entity", hint: "Provide entity for focus_entity" };
        }
        localStorage.setItem('focused_entity', JSON.stringify({ entity, type: entityType, since: Date.now() }));
        addLog('SYSTEM', `🎯 FOCUS: ${entity} (${entityType || 'entity'})`);
        return {
            status: "ENTITY_FOCUSED",
            entity,
            type: entityType || 'entity',
            message: `Focusing on ${entity}, Sir. All relevant information will be prioritized.`
        };
    }

    if (name === 'time_aware') {
        const timeQuery = typeof args.query === 'string' ? args.query : undefined;
        const timeAction = typeof args.action === 'string' ? args.action : undefined;
        const now = new Date();
        addLog('SYSTEM', `⏰ TIME-AWARE: ${timeAction || 'query'}`);
        return {
            status: "TIME_AWARE_RESPONSE",
            currentTime: now.toLocaleTimeString(),
            currentDate: now.toLocaleDateString(),
            dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
            query: timeQuery,
            action: timeAction || 'query',
            instruction: `Time-aware query: "${timeQuery || 'What should I do now?'}". Current: ${now.toLocaleString()}.`
        };
    }

    if (name === 'remember_person') {
        const personAction = typeof args.action === 'string' ? args.action.trim() : '';
        const personName = typeof args.person === 'string' ? args.person.trim() : '';
        const info = args.info;
        const cat = typeof args.category === 'string' && args.category.trim().length > 0
            ? args.category.trim()
            : 'note';
        if ((personAction === 'remember' || personAction === 'recall') && !personName) {
            return { error: "Missing required person", hint: "Provide person name for remember_person" };
        }

        try {
            if (personAction === 'remember') {
                // Store in SovereignMemory with semantic indexing for recall
                const memoryKey = `person_${personName.toLowerCase().replace(/\s+/g, '_')}_${cat}`;
                await sovereignMemory.store(memoryKey, JSON.stringify({
                    type: 'person_memory',
                    person: personName,
                    category: cat,
                    info,
                    timestamp: Date.now()
                }));

                // Also persist to neuralVault for structured access
                const people = await neuralVault.get('people_memory') || {};
                if (!people[personName]) people[personName] = {};
                people[personName][cat] = info;
                people[personName].lastUpdated = Date.now();
                await neuralVault.set('people_memory', people);

                addLog('SYSTEM', `👤 REMEMBERED: ${personName} (${cat}) - semantically indexed`);
                return {
                    status: "PERSON_REMEMBERED",
                    person: personName,
                    category: cat,
                    semanticIndexed: true,
                    message: `Noted about ${personName}, Sir. I'll remember this for future conversations.`
                };
            }

            if (personAction === 'recall') {
                // Try semantic search first
                const searchResults = await sovereignMemory.query(`person ${personName}`, 5);
                const people = await neuralVault.get('people_memory') || {};
                const personData = people[personName];

                if (searchResults.length > 0 || personData) {
                    // Parse semantic results
                    const semanticInfo = searchResults.map((r: any) => {
                        try {
                            const parsed = JSON.parse(r.value || r);
                            return { category: parsed.category, info: parsed.info, relevance: r.similarity || 1 };
                        } catch { return null; }
                    }).filter(Boolean);

                    return {
                        status: "PERSON_RECALLED",
                        person: personName,
                        structuredData: personData || null,
                        semanticMatches: semanticInfo,
                        instruction: "Present what you know about this person conversationally."
                    };
                }
                return { status: "PERSON_NOT_FOUND", person: personName, message: `I don't have records on ${personName}, Sir.` };
            }

            if (personAction === 'list') {
                const people = await neuralVault.get('people_memory') || {};
                const names = Object.keys(people);
                return {
                    status: "PEOPLE_LISTED",
                    people: names,
                    count: names.length,
                    message: names.length > 0 ? `I have notes on ${names.length} people, Sir.` : "I don't have any people in memory yet, Sir."
                };
            }

            return { status: "PERSON_ACTION", action: personAction, person: personName };
        } catch (e: any) {
            addLog('WARN', `PERSON_MEMORY: Fallback to localStorage - ${e.message}`);
            // Fallback to localStorage
            const people = JSON.parse(localStorage.getItem('people_memory') || '{}');
            if (personAction === 'remember') {
                if (!people[personName]) people[personName] = {};
                people[personName][cat] = info;
                people[personName].lastUpdated = Date.now();
                localStorage.setItem('people_memory', JSON.stringify(people));
                return { status: "PERSON_REMEMBERED", person: personName, category: cat, message: `Noted about ${personName}, Sir.` };
            }
            if (personAction === 'recall') {
                const personData = people[personName];
                if (personData) return { status: "PERSON_RECALLED", person: personName, data: personData };
                return { status: "PERSON_NOT_FOUND", person: personName };
            }
            if (personAction === 'list') {
                return { status: "PEOPLE_LISTED", people: Object.keys(people), count: Object.keys(people).length };
            }
            return { status: "PERSON_ACTION", action: personAction, person: personName };
        }
    }

    if (name === 'topic_memory') {
        const topicAction = typeof args.action === 'string' ? args.action.trim() : '';
        const topicName = typeof args.topic === 'string' ? args.topic.trim() : '';
        const content = args.content;
        if ((topicAction === 'add' || topicAction === 'recall') && !topicName) {
            return { error: "Missing required topic", hint: "Provide topic for topic_memory" };
        }

        try {
            if (topicAction === 'add') {
                // Store in SovereignMemory with semantic indexing
                const memoryKey = `topic_${topicName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
                await sovereignMemory.store(memoryKey, JSON.stringify({
                    type: 'topic_memory',
                    topic: topicName,
                    content,
                    timestamp: Date.now()
                }));

                // Also persist to neuralVault for structured access
                const topics = await neuralVault.get('topic_memory') || {};
                if (!topics[topicName]) topics[topicName] = [];
                topics[topicName].push({ content, added: Date.now() });
                await neuralVault.set('topic_memory', topics);

                addLog('SYSTEM', `📝 TOPIC: Added to ${topicName} - semantically indexed`);
                return {
                    status: "TOPIC_UPDATED",
                    topic: topicName,
                    entries: topics[topicName].length,
                    semanticIndexed: true,
                    message: `Added to ${topicName} notes, Sir. This is now searchable across all your memories.`
                };
            }

            if (topicAction === 'recall') {
                // Try semantic search for richer results
                const searchResults = await sovereignMemory.query(`topic ${topicName}`, 10);
                const topics = await neuralVault.get('topic_memory') || {};
                const topicData = topics[topicName] || [];

                // Parse semantic results
                const semanticEntries = searchResults.map((r: any) => {
                    try {
                        const parsed = JSON.parse(r.value || r);
                        if (parsed.topic?.toLowerCase() === topicName.toLowerCase()) {
                            return { content: parsed.content, timestamp: parsed.timestamp, relevance: r.similarity || 1 };
                        }
                        return null;
                    } catch { return null; }
                }).filter(Boolean);

                if (topicData.length > 0 || semanticEntries.length > 0) {
                    return {
                        status: "TOPIC_RECALLED",
                        topic: topicName,
                        structuredEntries: topicData,
                        semanticMatches: semanticEntries,
                        totalEntries: Math.max(topicData.length, semanticEntries.length),
                        instruction: "Present the topic notes conversationally, highlighting the most relevant information."
                    };
                }
                return { status: "TOPIC_EMPTY", topic: topicName, message: `No notes on ${topicName} yet, Sir.` };
            }

            if (topicAction === 'list') {
                const topics = await neuralVault.get('topic_memory') || {};
                const topicNames = Object.keys(topics);
                return {
                    status: "TOPICS_LISTED",
                    topics: topicNames,
                    count: topicNames.length,
                    message: topicNames.length > 0 ? `You have notes on ${topicNames.length} topics, Sir.` : "No topic notes yet, Sir."
                };
            }

            return { status: "TOPIC_ACTION", action: topicAction, topic: topicName };
        } catch (e: any) {
            addLog('WARN', `TOPIC_MEMORY: Fallback to localStorage - ${e.message}`);
            // Fallback to localStorage
            const topics = JSON.parse(localStorage.getItem('topic_memory') || '{}');
            if (topicAction === 'add') {
                if (!topics[topicName]) topics[topicName] = [];
                topics[topicName].push({ content, added: Date.now() });
                localStorage.setItem('topic_memory', JSON.stringify(topics));
                return { status: "TOPIC_UPDATED", topic: topicName, entries: topics[topicName].length, message: `Added to ${topicName} notes, Sir.` };
            }
            if (topicAction === 'recall') {
                const topicData = topics[topicName];
                if (topicData?.length > 0) return { status: "TOPIC_RECALLED", topic: topicName, entries: topicData };
                return { status: "TOPIC_EMPTY", topic: topicName };
            }
            if (topicAction === 'list') {
                return { status: "TOPICS_LISTED", topics: Object.keys(topics), count: Object.keys(topics).length };
            }
            return { status: "TOPIC_ACTION", action: topicAction, topic: topicName };
        }
    }

    if (name === 'voice_shortcut') {
        const scAction = typeof args.action === 'string' ? args.action.trim() : '';
        const phrase = typeof args.phrase === 'string' ? args.phrase.trim() : '';
        const expansion = typeof args.expansion === 'string' ? args.expansion.trim() : '';
        if (!scAction) {
            return { error: "Missing required action", hint: "Provide action for voice_shortcut (create, list)" };
        }
        if (scAction === 'create' && (!phrase || !expansion)) {
            return { error: "Missing required phrase or expansion", hint: "Provide phrase and expansion for voice_shortcut create" };
        }
        const shortcuts = JSON.parse(localStorage.getItem('voice_shortcuts') || '{}');

        if (scAction === 'create' && phrase && expansion) {
            shortcuts[phrase] = { expansion, created: Date.now() };
            localStorage.setItem('voice_shortcuts', JSON.stringify(shortcuts));
            addLog('SYSTEM', `⚡ SHORTCUT: "${phrase}"`);
            return { status: "SHORTCUT_CREATED", phrase, message: `Shortcut created. Say "${phrase}" and I'll ${expansion}, Sir.` };
        }

        if (scAction === 'list') {
            return { status: "SHORTCUTS_LISTED", shortcuts: Object.entries(shortcuts).map(([p, v]: [string, any]) => ({ phrase: p, expansion: v.expansion })) };
        }

        return { status: "SHORTCUT_ACTION", action: scAction };
    }

    if (name === 'ambient_listen') {
        const ambMode = typeof args.mode === 'string' ? args.mode.trim() : '';
        const triggers = Array.isArray(args.triggers)
            ? args.triggers.filter((trigger): trigger is string => typeof trigger === 'string' && trigger.trim().length > 0)
            : [];
        const ambAction = typeof args.action === 'string' ? args.action : undefined;
        if (!ambMode) {
            return { error: "Missing required mode", hint: "Provide mode for ambient_listen (on/off)" };
        }
        localStorage.setItem('ambient_listen', JSON.stringify({ mode: ambMode, triggers, action: ambAction }));
        addLog('SYSTEM', `👂 AMBIENT: ${ambMode}`);
        return {
            status: "AMBIENT_CONFIGURED",
            mode: ambMode,
            triggers,
            message: ambMode === 'on' ? `Ambient listening enabled, Sir. ${triggers.length > 0 ? `Listening for: ${triggers.join(', ')}` : ''}` : `Ambient listening disabled.`
        };
    }

    if (name === 'proactive_suggest') {
        const level = typeof args.level === 'string' ? args.level.trim() : '';
        const areas = Array.isArray(args.areas)
            ? args.areas.filter((area): area is string => typeof area === 'string' && area.trim().length > 0)
            : [];
        if (!level) {
            return { error: "Missing required level", hint: "Provide level for proactive_suggest (off, minimal, moderate, active)" };
        }
        localStorage.setItem('proactive_settings', JSON.stringify({ level, areas }));
        addLog('SYSTEM', `💡 PROACTIVE: ${level}`);
        const messages: Record<string, string> = {
            off: "I'll only speak when spoken to, Sir.",
            minimal: "I'll make occasional suggestions when highly relevant.",
            moderate: "I'll offer helpful suggestions at appropriate moments.",
            active: "I'll proactively assist and suggest throughout our session."
        };
        return {
            status: "PROACTIVE_SET",
            level,
            areas,
            message: messages[level] || "Proactivity adjusted."
        };
    }

    if (name === 'voice_history') {
        const range = typeof args.range === 'string' ? args.range : undefined;
        const historySearch = typeof args.search === 'string' ? args.search : undefined;
        const histAction = typeof args.action === 'string' ? args.action : undefined;
        addLog('SYSTEM', `📜 HISTORY: ${histAction || 'list'}`);
        // History would come from session logs
        return {
            status: "HISTORY_REQUEST",
            action: histAction || 'list',
            range: range || 'recent',
            search: historySearch,
            instruction: `${histAction === 'search' ? `Search voice history for: "${historySearch}"` : `Show ${range || 'recent'} voice history`}.`
        };
    }

    if (name === 'personality_mode') {
        const personality = typeof args.personality === 'string' ? args.personality.trim() : '';
        const intensity = typeof args.intensity === 'string' ? args.intensity : undefined;
        if (!personality) {
            return { error: "Missing required personality", hint: "Provide personality for personality_mode" };
        }
        localStorage.setItem('personality_mode', JSON.stringify({ personality, intensity: intensity || 'moderate' }));
        addLog('SYSTEM', `🎭 PERSONALITY: ${personality}`);
        const intros: Record<string, string> = {
            professional: "Understood, Sir. Maintaining professional decorum.",
            friendly: "Of course! Happy to keep things light and friendly.",
            serious: "Very well. Adopting a more serious tone.",
            casual: "Sure thing! Keeping it casual.",
            mentor: "I'll take a more guiding approach, Sir.",
            assistant: "At your service. Pure assistance mode.",
            collaborator: "Let's work together on this. Partners in thought."
        };
        return {
            status: "PERSONALITY_SET",
            personality,
            intensity: intensity || 'moderate',
            message: intros[personality] || `${personality} mode activated.`
        };
    }

    if (name === 'collaborate_share') {
        const { action: colAction, target, content: shareContent, format } = args;
        addLog('SYSTEM', `🤝 COLLABORATE: ${colAction}`);
        return {
            status: "COLLABORATION_INITIATED",
            action: colAction,
            target: target || 'team',
            content: shareContent,
            format: format || 'link',
            message: `Preparing to ${colAction}${target ? ` with ${target}` : ''}, Sir.`
        };
    }

    return undefined; // Not handled by this module
}
