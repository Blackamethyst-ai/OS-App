# Legacy Services Archive

This directory contains deprecated services that are maintained for backward compatibility.

## unifiedActionRegistry.ts

**Status:** FULLY DEPRECATED
**Replacement:** `services/capabilities`
**Deprecation Date:** 2026-02-01

### Migration Status

| Function | Status | Replacement |
|----------|--------|-------------|
| `initializeUnifiedRegistry` | ✅ Deprecated | `initializeCapabilities()` |
| `executeAction` | ✅ Deprecated | `executeCapability()` |
| `getAction` | ✅ Deprecated | `getCapability()` |
| `getGeminiManifests` | ✅ Deprecated | `getGeminiManifests()` from capabilities |
| `generateVoiceContext` | ✅ Deprecated | `getVoiceCapabilityList()` |
| `routeQuery` | ✅ Deprecated | `routeQueryToCPB()` from capabilities |
| `executeQuery` | ✅ Deprecated | `executeQueryWithCPB()` from capabilities |

### Current Usage

**No files should import from unifiedActionRegistry anymore.**

All functionality has been migrated to `services/capabilities`:
- Phase 1: Core registry, execution, Gemini/voice integration
- Phase 2: CPB routing (`services/capabilities/cpb.ts`)

### Rollback Procedure

If issues arise after full migration, rollback with:

```bash
# Revert the capability migration commits
git log --oneline --grep="Capabilities"
git revert <commit-hash>

# Or restore specific file versions
git checkout main~2 -- services/unifiedActionRegistry.ts
npm install && npm run build
```

### File Removal Timeline

This file is scheduled for removal after confirming stability in production:
- **2026-02-15**: Monitor for any remaining usage
- **2026-03-01**: Safe deletion date

### CPB Routing in Capabilities

The new CPB routing functions in `services/capabilities/cpb.ts` provide:
- `routeQueryToCPB()` - Route queries to optimal CPB path
- `executeQueryWithCPB()` - Execute with status callbacks and DQ scoring
- `executeCapabilityWithCPB()` - Execute specific capability with CPB routing

All features from the legacy registry are now available via the Capabilities Registry.
