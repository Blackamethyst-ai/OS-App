-- 002_lock_voice_anon_rls.sql
-- Security fix applied directly to prod 2026-05-10 via Supabase MCP.
--
-- voice_sessions and voice_transcripts had anon SELECT and (for
-- voice_sessions) anon UPDATE policies that allowed any anonymous
-- caller with the public anon key to read all sessions/transcripts
-- and modify any session. The "Anon can create" INSERT policies have
-- rate-limit guards in their WITH CHECK clause and are kept; only the
-- guard-free SELECT/UPDATE policies are dropped.
--
-- Kept (intentional, with rate-limit guards or auth scope):
--   - "Anon can create voice sessions"     INSERT  (rate-limited <100/hr)
--   - "Anon can create voice transcripts"  INSERT  (rate-limited <1000/hr)
--   - "Users can ..." policies (authenticated, scoped to own rows)
--   - service_role bypasses RLS via role attribute (no explicit policy needed)
--
-- Dropped (unrestricted anon access):
--   - "Anon can read voice sessions"       SELECT
--   - "Anon can update voice sessions"     UPDATE
--   - "Anon can read voice transcripts"    SELECT
--
-- If a public read endpoint is needed later, add a policy with an
-- explicit WHERE (e.g., is_public = true) instead of `USING (true)`.
--
-- Idempotent: DROP IF EXISTS only.

DROP POLICY IF EXISTS "Anon can read voice sessions" ON voice_sessions;
DROP POLICY IF EXISTS "Anon can update voice sessions" ON voice_sessions;
DROP POLICY IF EXISTS "Anon can read voice transcripts" ON voice_transcripts;
