# Project Memory

- Connected to Antigravity Global Core
- Last Synced: Fri  9 Jan 2026 06:45:27 EST

## Completed Type Fixes (2026-01-26)

### ✅ VoiceNexus Orchestrator
- Added `get()`/`set()` KV methods to `NeuralVaultService` (uses profile store)
- All 8 type errors resolved

### ✅ SovereignMemory
- Added `search()` method as alias for `query()`

### ✅ Supabase Integration
- Created `voice_sessions` and `voice_transcripts` tables
- Full-text search with tsvector
- Session lifecycle wired in orchestrator
