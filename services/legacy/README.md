# Legacy Services Archive

This directory contains deprecated services that are maintained for backward compatibility.

## unifiedActionRegistry.ts

**Status:** PARTIALLY DEPRECATED
**Replacement:** `services/capabilities`
**Target Deprecation Date:** 2026-03-01

### Migration Status

| Function | Status | Replacement |
|----------|--------|-------------|
| `initializeUnifiedRegistry` | ✅ Deprecated | `initializeCapabilities()` |
| `executeAction` | ✅ Deprecated | `executeCapability()` |
| `getAction` | ✅ Deprecated | `getCapability()` |
| `getGeminiManifests` | ✅ Deprecated | `getGeminiManifests()` from capabilities |
| `generateVoiceContext` | ✅ Deprecated | `getVoiceCapabilityList()` |
| `routeQuery` | ⚠️ Still in use | Pending migration |
| `executeQuery` | ⚠️ Still in use | Pending migration |

### Current Usage

The following files still import from unifiedActionRegistry:
- `components/voice/VoiceManager/index.tsx` - Uses `routeQuery` and `executeQuery` for CPB routing

### Rollback Procedure

If issues arise after full migration, rollback with:

```bash
# Revert the capability migration commits
git log --oneline --grep="Capabilities Registry Consolidation"
git revert <commit-hash>

# Or restore the full file from before migration
git checkout feature/capabilities-registry-consolidation~5 -- services/unifiedActionRegistry.ts
npm install && npm run build
```

### Why Keep This?

The `routeQuery` and `executeQuery` functions provide CPB (Cognitive Precision Bridge) routing with:
- Status callbacks for progress updates
- DQ (Decision Quality) scoring
- Multi-path execution (direct/rlm/ace/hybrid/cascade)

These features need to be added to the Capabilities Registry before full deprecation.

### Next Steps

1. Add CPB routing to capabilities/registry.ts
2. Add executeCapabilityWithCPB() function
3. Migrate VoiceManager's routeQuery/executeQuery calls
4. Move this file to legacy/ directory
5. Add ESLint ignore for legacy/
