// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// --- Hoisted mocks ---
const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());

const supabaseClient = vi.hoisted(() => ({
  from: mockFrom,
  rpc: mockRpc,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => supabaseClient),
}));

vi.mock('../logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

/**
 * Build a thenable chain mock that supports all Supabase query patterns.
 * Every method returns the chain. The chain is thenable so `await chain.method()` works
 * when method() returns the chain itself.
 */
function buildChain(finalResult: { data?: any; error?: any; count?: number | null }) {
  const chain: any = {
    then(resolve: (v: any) => any, reject?: (e: any) => any) {
      return Promise.resolve(finalResult).then(resolve, reject);
    },
  };
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.textSearch = vi.fn().mockReturnValue(chain);
  return chain;
}

import { voiceStorage, supabase } from '../supabaseService';
import type { VoiceSession, VoiceTranscript } from '../supabaseService';

describe('supabaseService', () => {
  let origIsConfigured: typeof voiceStorage.isConfigured;

  beforeEach(() => {
    vi.clearAllMocks();
    origIsConfigured = voiceStorage.isConfigured;
  });

  afterEach(() => {
    voiceStorage.isConfigured = origIsConfigured;
  });

  describe('supabase client', () => {
    it('should export the client created by createClient', () => {
      expect(supabase).toBe(supabaseClient);
    });
  });

  describe('voiceStorage.isConfigured', () => {
    it('should return a boolean', () => {
      expect(typeof voiceStorage.isConfigured()).toBe('boolean');
    });
  });

  describe('voiceStorage.createSession', () => {
    it('should insert session and return data on success', async () => {
      const sessionData = {
        id: 'session-1',
        started_at: '2026-01-01T00:00:00Z',
        transcript_count: 0,
        mode: 'realtime' as const,
      };
      const chain = buildChain({ data: sessionData, error: null });
      mockFrom.mockReturnValue(chain);
      voiceStorage.isConfigured = () => true;

      const result = await voiceStorage.createSession({
        id: 'session-1',
        started_at: '2026-01-01T00:00:00Z',
        mode: 'realtime',
      });

      expect(mockFrom).toHaveBeenCalledWith('voice_sessions');
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'session-1', transcript_count: 0 })
      );
      expect(result).toEqual(sessionData);
    });

    it('should return null on error', async () => {
      const chain = buildChain({ data: null, error: { message: 'db error' } });
      mockFrom.mockReturnValue(chain);
      voiceStorage.isConfigured = () => true;

      const result = await voiceStorage.createSession({
        id: 'session-2',
        started_at: '2026-01-01T00:00:00Z',
        mode: 'turn-based',
      });
      expect(result).toBeNull();
    });

    it('should return null when not configured', async () => {
      voiceStorage.isConfigured = () => false;

      const result = await voiceStorage.createSession({
        id: 'session-3',
        started_at: '2026-01-01T00:00:00Z',
        mode: 'hybrid',
      });
      expect(result).toBeNull();
    });
  });

  describe('voiceStorage.endSession', () => {
    it('should update session with ended_at and transcript count', async () => {
      const chain = buildChain({ error: null });
      mockFrom.mockReturnValue(chain);
      voiceStorage.isConfigured = () => true;

      await voiceStorage.endSession('session-1', 5);

      expect(mockFrom).toHaveBeenCalledWith('voice_sessions');
      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({ transcript_count: 5 })
      );
      expect(chain.eq).toHaveBeenCalledWith('id', 'session-1');
    });

    it('should do nothing when not configured', async () => {
      voiceStorage.isConfigured = () => false;

      await voiceStorage.endSession('session-1', 5);
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe('voiceStorage.saveTranscript', () => {
    it('should insert transcript and call rpc to increment count', async () => {
      const transcript: VoiceTranscript = {
        id: 'tx-1',
        session_id: 'session-1',
        role: 'user',
        text: 'Hello',
        timestamp: '2026-01-01T00:00:00Z',
      };
      const chain = buildChain({ data: transcript, error: null });
      mockFrom.mockReturnValue(chain);
      mockRpc.mockResolvedValue({ data: null, error: null });
      voiceStorage.isConfigured = () => true;

      const result = await voiceStorage.saveTranscript(transcript);

      expect(result).toEqual(transcript);
      expect(mockRpc).toHaveBeenCalledWith('increment_transcript_count', { session_id: 'session-1' });
    });

    it('should return null on insert error', async () => {
      const chain = buildChain({ data: null, error: { message: 'insert error' } });
      mockFrom.mockReturnValue(chain);
      voiceStorage.isConfigured = () => true;

      const result = await voiceStorage.saveTranscript({
        id: 'tx-2',
        session_id: 'session-1',
        role: 'assistant',
        text: 'Hi there',
        timestamp: '2026-01-01T00:00:01Z',
      });
      expect(result).toBeNull();
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe('voiceStorage.getRecentSessions', () => {
    it('should return sessions ordered by started_at', async () => {
      const sessions = [{ id: 's1' }, { id: 's2' }];
      const chain = buildChain({ data: sessions, error: null });
      mockFrom.mockReturnValue(chain);
      voiceStorage.isConfigured = () => true;

      const result = await voiceStorage.getRecentSessions(5);

      expect(mockFrom).toHaveBeenCalledWith('voice_sessions');
      expect(chain.select).toHaveBeenCalledWith('*');
      expect(chain.order).toHaveBeenCalledWith('started_at', { ascending: false });
      expect(chain.limit).toHaveBeenCalledWith(5);
      expect(result).toEqual(sessions);
    });

    it('should return empty array on error', async () => {
      const chain = buildChain({ data: null, error: { message: 'error' } });
      mockFrom.mockReturnValue(chain);
      voiceStorage.isConfigured = () => true;

      const result = await voiceStorage.getRecentSessions();
      expect(result).toEqual([]);
    });
  });

  describe('voiceStorage.getSessionTranscripts', () => {
    it('should return transcripts for a given session', async () => {
      const transcripts = [{ id: 'tx-1', text: 'Hello' }];
      const chain = buildChain({ data: transcripts, error: null });
      mockFrom.mockReturnValue(chain);
      voiceStorage.isConfigured = () => true;

      const result = await voiceStorage.getSessionTranscripts('session-1');

      expect(chain.eq).toHaveBeenCalledWith('session_id', 'session-1');
      expect(result).toEqual(transcripts);
    });
  });

  describe('voiceStorage.searchTranscripts', () => {
    it('should search using textSearch and return results', async () => {
      const results = [{ id: 'tx-1', text: 'matching' }];
      const chain = buildChain({ data: results, error: null });
      mockFrom.mockReturnValue(chain);
      voiceStorage.isConfigured = () => true;

      const result = await voiceStorage.searchTranscripts('test query', 10);

      expect(chain.textSearch).toHaveBeenCalledWith('text_search', 'test query', { type: 'websearch' });
      expect(result).toEqual(results);
    });
  });

  describe('voiceStorage.getStats', () => {
    it('should return computed stats from session and transcript counts', async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        const result = callCount === 1
          ? { count: 10, error: null }
          : { count: 50, error: null };
        const statChain: any = {
          then(resolve: (v: any) => any, reject?: (e: any) => any) {
            return Promise.resolve(result).then(resolve, reject);
          },
        };
        statChain.select = vi.fn().mockReturnValue(statChain);
        return statChain;
      });
      voiceStorage.isConfigured = () => true;

      const result = await voiceStorage.getStats();

      expect(result).toEqual({
        totalSessions: 10,
        totalTranscripts: 50,
        avgTranscriptsPerSession: 5,
      });
    });

    it('should return zero avg when no sessions exist', async () => {
      mockFrom.mockImplementation(() => {
        const result = { count: 0, error: null };
        const statChain: any = {
          then(resolve: (v: any) => any, reject?: (e: any) => any) {
            return Promise.resolve(result).then(resolve, reject);
          },
        };
        statChain.select = vi.fn().mockReturnValue(statChain);
        return statChain;
      });
      voiceStorage.isConfigured = () => true;

      const result = await voiceStorage.getStats();
      expect(result.avgTranscriptsPerSession).toBe(0);
    });

    it('should return zero stats when not configured', async () => {
      voiceStorage.isConfigured = () => false;

      const result = await voiceStorage.getStats();
      expect(result).toEqual({
        totalSessions: 0,
        totalTranscripts: 0,
        avgTranscriptsPerSession: 0,
      });
    });
  });

  describe('type exports', () => {
    it('should allow constructing VoiceSession objects', () => {
      const session: VoiceSession = {
        id: 'test',
        started_at: '2026-01-01',
        transcript_count: 0,
        mode: 'hybrid',
      };
      expect(session.mode).toBe('hybrid');
    });

    it('should allow constructing VoiceTranscript with optional fields', () => {
      const transcript: VoiceTranscript = {
        id: 'tx-1',
        session_id: 'session-1',
        role: 'assistant',
        text: 'Hi',
        timestamp: '2026-01-01T00:00:00Z',
        complexity_score: 0.5,
        complexity_tier: 'balanced',
        provider: 'claude',
        latency_ms: 200,
      };
      expect(transcript.complexity_tier).toBe('balanced');
      expect(transcript.latency_ms).toBe(200);
    });
  });
});
