/**
 * DREAM PROTOCOL - Autonomous Background Intelligence
 * 
 * When the user is idle, the OS "dreams" - running autonomous research,
 * pattern analysis, and insight generation. Results are compiled into
 * a morning briefing for the user.
 * 
 * This is the next evolution of AI-native computing: an OS that works
 * while you rest.
 */

import { useAppStore } from '../store';
import { generateText, performGlobalSearch, generateEmbedding } from './geminiService';
import { neuralVault } from './persistenceService';
import { powerService } from './powerService';

// Configuration
const IDLE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes of inactivity triggers dream mode
const DREAM_CYCLE_MS = 30 * 1000; // Run analysis every 30 seconds in dream mode
const MAX_DREAM_INSIGHTS = 10; // Cap insights per session

export interface DreamInsight {
    id: string;
    type: 'PATTERN' | 'RESEARCH' | 'OPTIMIZATION' | 'PREDICTION' | 'DISCOVERY';
    title: string;
    content: string;
    confidence: number;
    timestamp: number;
    relatedQueries: string[];
    actionable: boolean;
    suggestedAction?: string;
}

export interface DreamSession {
    id: string;
    startTime: number;
    endTime: number | null;
    insights: DreamInsight[];
    patternsAnalyzed: number;
    queriesProcessed: number;
    status: 'DREAMING' | 'COMPLETE' | 'INTERRUPTED';
}

class DreamProtocolService {
    private lastActivity: number = Date.now();
    private isDreaming: boolean = false;
    private dreamInterval: ReturnType<typeof setInterval> | null = null;
    private currentSession: DreamSession | null = null;
    private pendingQueries: string[] = [];
    private activityListeners: (() => void)[] = [];

    constructor() {
        this.init();
    }

    private init() {
        // Track user activity
        if (typeof window !== 'undefined') {
            const trackActivity = () => {
                this.lastActivity = Date.now();
                if (this.isDreaming) {
                    this.wakeUp();
                }
            };

            window.addEventListener('mousemove', trackActivity, { passive: true });
            window.addEventListener('keydown', trackActivity, { passive: true });
            window.addEventListener('click', trackActivity, { passive: true });
            window.addEventListener('scroll', trackActivity, { passive: true });
            window.addEventListener('touchstart', trackActivity, { passive: true });

            // Check for idle state periodically
            setInterval(() => {
                const idleTime = Date.now() - this.lastActivity;
                if (idleTime >= IDLE_THRESHOLD_MS && !this.isDreaming) {
                    this.enterDreamMode();
                }
            }, 10000); // Check every 10 seconds
        }
    }

    /**
     * Add a query to the dream queue for background processing
     */
    queueQuery(query: string) {
        if (!this.pendingQueries.includes(query)) {
            this.pendingQueries.push(query);
            console.log(`🌙 Dream Protocol: Queued "${query}" for deep analysis`);
        }
    }

    /**
     * Enter autonomous dream mode
     */
    private async enterDreamMode() {
        if (this.isDreaming) return;

        // Check if Dream Protocol is enabled in power settings
        if (!powerService.isEnabled('dreamProtocol')) {
            console.log('🌙 DREAM PROTOCOL: Disabled in power settings. Enable in Power Control Panel.');
            return;
        }

        this.isDreaming = true;
        const sessionId = `dream-${Date.now()}`;

        this.currentSession = {
            id: sessionId,
            startTime: Date.now(),
            endTime: null,
            insights: [],
            patternsAnalyzed: 0,
            queriesProcessed: 0,
            status: 'DREAMING'
        };

        console.log('🌙✨ DREAM PROTOCOL ACTIVATED - Autonomous cognition beginning...');

        useAppStore.getState().actions.addLog('SYSTEM', 'DREAM_PROTOCOL: Entering autonomous cognition mode...');

        // Start the dream cycle
        this.dreamInterval = setInterval(() => this.dreamCycle(), DREAM_CYCLE_MS);

        // Run first cycle immediately
        await this.dreamCycle();
    }

    /**
     * Single dream cycle - analyze patterns, process queries, generate insights
     */
    private async dreamCycle() {
        if (!this.isDreaming || !this.currentSession) return;
        if (this.currentSession.insights.length >= MAX_DREAM_INSIGHTS) {
            this.compileBriefing();
            return;
        }

        try {
            // Priority 1: Process queued queries
            if (this.pendingQueries.length > 0) {
                const query = this.pendingQueries.shift()!;
                await this.processQuery(query);
                this.currentSession.queriesProcessed++;
                powerService.recordUsage('dreamProtocol', 2000); // Approx tokens per query
            }

            // Priority 2: Analyze usage patterns
            await this.analyzePatterns();
            this.currentSession.patternsAnalyzed++;
            powerService.recordUsage('dreamProtocol', 1000); // Approx tokens per analysis

            // Priority 3: Generate predictive insights
            if (Math.random() > 0.5) {
                await this.generatePrediction();
                powerService.recordUsage('dreamProtocol', 1500); // Approx tokens per prediction
            }

        } catch (error) {
            console.error('Dream cycle error:', error);
        }
    }

    /**
     * Deep research on a queued query
     */
    private async processQuery(query: string) {
        try {
            const searchResults = await performGlobalSearch(query);

            // Extract content from search results array
            const resultSummary = Array.isArray(searchResults)
                ? searchResults.slice(0, 3).map((r: any) => r.title || r.description || '').join('\n')
                : String(searchResults).slice(0, 500);

            const insight: DreamInsight = {
                id: `insight-${Date.now()}`,
                type: 'RESEARCH',
                title: `Deep Analysis: ${query.slice(0, 50)}...`,
                content: resultSummary || 'Research completed. Results pending analysis.',
                confidence: 0.85,
                timestamp: Date.now(),
                relatedQueries: [query],
                actionable: true,
                suggestedAction: `Review findings and integrate into active project`
            };

            this.currentSession?.insights.push(insight);
            console.log(`🌙 Dream insight generated: ${insight.title}`);

        } catch (error) {
            console.log('Query processing failed:', error);
        }
    }

    /**
     * Analyze user patterns from logs and artifacts
     */
    private async analyzePatterns() {
        try {
            const store = useAppStore.getState();
            const recentLogs = store.system.logs.slice(-20);
            const recentTasks = store.research.tasks.slice(-5);

            if (recentLogs.length === 0) return;

            const logSummary = recentLogs.map(l => l.message).join('\n');

            const analysis = await generateText(
                `Analyze these system logs for patterns, opportunities, and potential optimizations. Be concise and actionable:

${logSummary}

Output format:
- Pattern identified
- Optimization opportunity
- Confidence (0-1)`,
                'gemini-2.0-flash',
                'You are an AI systems analyst identifying patterns in user behavior and system operations.'
            );

            const insight: DreamInsight = {
                id: `pattern-${Date.now()}`,
                type: 'PATTERN',
                title: 'Behavioral Pattern Detected',
                content: analysis,
                confidence: 0.75,
                timestamp: Date.now(),
                relatedQueries: [],
                actionable: true,
                suggestedAction: 'Review and apply optimization'
            };

            this.currentSession?.insights.push(insight);

        } catch (error) {
            // Silent fail - pattern analysis is non-critical
        }
    }

    /**
     * Generate predictive insights about next actions
     */
    private async generatePrediction() {
        try {
            const store = useAppStore.getState();
            const currentMode = store.mode;
            const recentLogs = store.system.logs.slice(-10).map(l => l.message).join('; ');

            const prediction = await generateText(
                `Based on current mode "${currentMode}" and recent activity: "${recentLogs}"
                
Predict the user's likely next 3 actions and why. Format as brief bullet points.`,
                'gemini-2.0-flash',
                'You are a predictive AI that anticipates user needs.'
            );

            const insight: DreamInsight = {
                id: `prediction-${Date.now()}`,
                type: 'PREDICTION',
                title: 'Next Action Prediction',
                content: prediction,
                confidence: 0.7,
                timestamp: Date.now(),
                relatedQueries: [],
                actionable: false
            };

            this.currentSession?.insights.push(insight);

        } catch (error) {
            // Silent fail
        }
    }

    /**
     * Wake up from dream mode
     */
    private wakeUp() {
        if (!this.isDreaming) return;

        console.log('🌅 DREAM PROTOCOL: User activity detected - waking up...');

        if (this.dreamInterval) {
            clearInterval(this.dreamInterval);
            this.dreamInterval = null;
        }

        if (this.currentSession) {
            this.currentSession.endTime = Date.now();
            this.currentSession.status = 'INTERRUPTED';
            this.saveDreamSession();
        }

        this.isDreaming = false;
        useAppStore.getState().actions.addLog('INFO', `DREAM_PROTOCOL: Woke with ${this.currentSession?.insights.length || 0} insights`);
    }

    /**
     * Compile insights into a morning briefing
     */
    private compileBriefing() {
        if (!this.currentSession) return;

        this.currentSession.endTime = Date.now();
        this.currentSession.status = 'COMPLETE';

        const briefing = this.generateBriefing(this.currentSession);
        this.saveDreamSession();

        // Notify user
        useAppStore.getState().actions.addLog('SUCCESS', `DREAM_PROTOCOL: Session complete. ${this.currentSession.insights.length} insights generated.`);

        if (this.dreamInterval) {
            clearInterval(this.dreamInterval);
            this.dreamInterval = null;
        }
        this.isDreaming = false;
    }

    /**
     * Generate formatted briefing from session
     */
    private generateBriefing(session: DreamSession): string {
        const duration = session.endTime
            ? Math.round((session.endTime - session.startTime) / 60000)
            : 0;

        let briefing = `# 🌙 DREAM PROTOCOL BRIEFING\n\n`;
        briefing += `**Session Duration:** ${duration} minutes\n`;
        briefing += `**Patterns Analyzed:** ${session.patternsAnalyzed}\n`;
        briefing += `**Queries Processed:** ${session.queriesProcessed}\n`;
        briefing += `**Insights Generated:** ${session.insights.length}\n\n`;
        briefing += `---\n\n`;

        session.insights.forEach((insight, i) => {
            briefing += `## ${i + 1}. ${insight.title}\n`;
            briefing += `**Type:** ${insight.type} | **Confidence:** ${Math.round(insight.confidence * 100)}%\n\n`;
            briefing += `${insight.content}\n\n`;
            if (insight.actionable && insight.suggestedAction) {
                briefing += `**→ Suggested Action:** ${insight.suggestedAction}\n\n`;
            }
            briefing += `---\n\n`;
        });

        return briefing;
    }

    /**
     * Save dream session to persistence
     */
    private async saveDreamSession() {
        if (!this.currentSession) return;

        try {
            const sessions = JSON.parse(localStorage.getItem('dream_sessions') || '[]');
            sessions.push(this.currentSession);
            // Keep last 10 sessions
            if (sessions.length > 10) sessions.shift();
            localStorage.setItem('dream_sessions', JSON.stringify(sessions));
        } catch (error) {
            console.error('Failed to save dream session:', error);
        }
    }

    /**
     * Get past dream sessions
     */
    getPastSessions(): DreamSession[] {
        try {
            return JSON.parse(localStorage.getItem('dream_sessions') || '[]');
        } catch {
            return [];
        }
    }

    /**
     * Get current dream status
     */
    getStatus() {
        return {
            isDreaming: this.isDreaming,
            currentSession: this.currentSession,
            pendingQueries: this.pendingQueries.length,
            lastActivity: this.lastActivity,
            idleTime: Date.now() - this.lastActivity
        };
    }

    /**
     * Manually trigger dream mode (for testing)
     */
    triggerDream() {
        this.lastActivity = Date.now() - IDLE_THRESHOLD_MS - 1000;
        this.enterDreamMode();
    }
}

// Singleton export
export const dreamProtocol = new DreamProtocolService();
