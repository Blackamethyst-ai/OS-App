/**
 * Supabase Service
 *
 * Provides persistent cloud storage for voice sessions, transcripts,
 * and other data that needs to survive across browsers/devices.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    logger.warn('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY', undefined, 'Supabase');
}

export const supabase: SupabaseClient = createClient(
    supabaseUrl || '',
    supabaseKey || ''
);

// =============================================================================
// Voice Session Types
// =============================================================================

export interface VoiceSession {
    id: string;
    started_at: string;
    ended_at?: string;
    transcript_count: number;
    mode: 'realtime' | 'turn-based' | 'hybrid';
    metadata?: Record<string, unknown>;
}

export interface VoiceTranscript {
    id: string;
    session_id: string;
    role: 'user' | 'assistant';
    text: string;
    timestamp: string;
    complexity_score?: number;
    complexity_tier?: 'fast' | 'balanced' | 'deep';
    provider?: string;
    latency_ms?: number;
    metadata?: Record<string, unknown>;
}

// =============================================================================
// Voice Session Operations
// =============================================================================

export const voiceStorage = {
    /**
     * Check if Supabase is configured
     */
    isConfigured(): boolean {
        return !!(supabaseUrl && supabaseKey);
    },

    /**
     * Create a new voice session
     */
    async createSession(session: Omit<VoiceSession, 'transcript_count'>): Promise<VoiceSession | null> {
        if (!this.isConfigured()) return null;

        const { data, error } = await supabase
            .from('voice_sessions')
            .insert({
                ...session,
                transcript_count: 0
            })
            .select()
            .single();

        if (error) {
            logger.error('Failed to create session', error, 'Supabase');
            return null;
        }

        return data;
    },

    /**
     * End a voice session
     */
    async endSession(sessionId: string, transcriptCount: number): Promise<void> {
        if (!this.isConfigured()) return;

        const { error } = await supabase
            .from('voice_sessions')
            .update({
                ended_at: new Date().toISOString(),
                transcript_count: transcriptCount
            })
            .eq('id', sessionId);

        if (error) {
            logger.error('Failed to end session', error, 'Supabase');
        }
    },

    /**
     * Save a transcript
     */
    async saveTranscript(transcript: VoiceTranscript): Promise<VoiceTranscript | null> {
        if (!this.isConfigured()) return null;

        const { data, error } = await supabase
            .from('voice_transcripts')
            .insert(transcript)
            .select()
            .single();

        if (error) {
            logger.error('Failed to save transcript', error, 'Supabase');
            return null;
        }

        // Update session transcript count
        await supabase.rpc('increment_transcript_count', { session_id: transcript.session_id });

        return data;
    },

    /**
     * Get recent sessions
     */
    async getRecentSessions(limit: number = 10): Promise<VoiceSession[]> {
        if (!this.isConfigured()) return [];

        const { data, error } = await supabase
            .from('voice_sessions')
            .select('*')
            .order('started_at', { ascending: false })
            .limit(limit);

        if (error) {
            logger.error('Failed to get sessions', error, 'Supabase');
            return [];
        }

        return data || [];
    },

    /**
     * Get transcripts for a session
     */
    async getSessionTranscripts(sessionId: string): Promise<VoiceTranscript[]> {
        if (!this.isConfigured()) return [];

        const { data, error } = await supabase
            .from('voice_transcripts')
            .select('*')
            .eq('session_id', sessionId)
            .order('timestamp', { ascending: true });

        if (error) {
            logger.error('Failed to get transcripts', error, 'Supabase');
            return [];
        }

        return data || [];
    },

    /**
     * Search transcripts by text (uses full-text search)
     */
    async searchTranscripts(query: string, limit: number = 20): Promise<VoiceTranscript[]> {
        if (!this.isConfigured()) return [];

        // Use the generated tsvector column for full-text search
        const { data, error } = await supabase
            .from('voice_transcripts')
            .select('*')
            .textSearch('text_search', query, { type: 'websearch' })
            .order('timestamp', { ascending: false })
            .limit(limit);

        if (error) {
            logger.error('Failed to search transcripts', error, 'Supabase');
            return [];
        }

        return data || [];
    },

    /**
     * Get session statistics
     */
    async getStats(): Promise<{ totalSessions: number; totalTranscripts: number; avgTranscriptsPerSession: number }> {
        if (!this.isConfigured()) {
            return { totalSessions: 0, totalTranscripts: 0, avgTranscriptsPerSession: 0 };
        }

        const [sessionsResult, transcriptsResult] = await Promise.all([
            supabase.from('voice_sessions').select('id', { count: 'exact', head: true }),
            supabase.from('voice_transcripts').select('id', { count: 'exact', head: true })
        ]);

        const totalSessions = sessionsResult.count || 0;
        const totalTranscripts = transcriptsResult.count || 0;
        const avgTranscriptsPerSession = totalSessions > 0
            ? Math.round(totalTranscripts / totalSessions)
            : 0;

        return { totalSessions, totalTranscripts, avgTranscriptsPerSession };
    }
};

export default supabase;
