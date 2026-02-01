# Capabilities Registry

The unified capability registry for OS-App, consolidating all voice-controllable actions, navigation, and dynamic tools into a single source of truth.

## Quick Start

```typescript
import {
  initializeCapabilities,
  executeCapability,
  getCapability,
  searchCapabilities,
} from '@/services/capabilities';

// Initialize at app start (called in index.tsx)
await initializeCapabilities();

// Execute a capability
const result = await executeCapability('ui_toggle_theme', { theme: 'MIDNIGHT' });

// Find a capability
const cap = getCapability('navigate_sector');

// Search capabilities
const matches = searchCapabilities('dashboard');
```

## Architecture

```
services/capabilities/
├── index.ts           # Main exports and initialization
├── registry.ts        # Core registry (Map-based storage)
├── types.ts           # TypeScript types
├── providers/         # Capability sources
│   ├── tabs.ts        # Tab navigation (48 tabs)
│   ├── actions.ts     # Action handlers (57 actions)
│   ├── ui.ts          # UI controls (theme, voice toggle)
│   ├── dynamic.ts     # Runtime tools
│   └── sectors.ts     # Sector definitions
└── adapters/          # Integration adapters
    ├── voice.ts       # Voice command processing
    └── gemini.ts      # Gemini function calling
```

## Adding a New Capability

### 1. Create a Provider (or use existing)

```typescript
// services/capabilities/providers/myfeature.ts
import type { Capability, CapabilityHandler } from '../types';
import { registerCapabilities } from '../registry';

const myHandler: CapabilityHandler = async (args) => {
  // Implementation
  return { success: true, result: { data: args.value } };
};

const MY_CAPABILITIES: Capability[] = [
  {
    id: 'my_feature_action',
    kind: 'action',
    description: 'Does something useful',
    complexity: 'simple',
    executionPath: 'direct',
    source: 'component',
    sectors: [],  // Empty = global, or ['DASHBOARD', 'CODE_STUDIO']
    priority: 50,
    handler: myHandler,
    aliases: ['do thing', 'my action'],
    examples: ['do the thing', 'run my action'],
    schema: {
      type: 'object',
      properties: {
        value: { type: 'string' },
      },
      required: ['value'],
    },
  },
];

export function loadMyFeatureCapabilities(): void {
  registerCapabilities(MY_CAPABILITIES);
}
```

### 2. Register in Index

```typescript
// services/capabilities/index.ts - in initializeCapabilities()
try {
  const { loadMyFeatureCapabilities } = await import('./providers/myfeature');
  loadMyFeatureCapabilities();
} catch (error) {
  console.warn('[CapabilityRegistry] Failed to load my feature:', error);
}
```

### 3. Export (Optional)

```typescript
// services/capabilities/index.ts
export {
  loadMyFeatureCapabilities,
} from './providers/myfeature';
```

## Capability Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (snake_case) |
| `kind` | 'action' \| 'navigation' \| 'tool' \| 'tab' | Yes | Capability type |
| `description` | string | Yes | Human-readable description |
| `complexity` | 'simple' \| 'navigation' \| 'analysis' \| 'architecture' \| 'critical' | Yes | Execution complexity |
| `executionPath` | 'direct' \| 'rlm' \| 'ace' \| 'hybrid' \| 'cascade' \| 'auto' | Yes | CPB routing path |
| `source` | 'core' \| 'sovereign' \| 'dynamic' \| 'component' \| 'voice' \| 'tab' | Yes | Origin source |
| `sectors` | AppMode[] | Yes | Sectors where available (empty = global) |
| `priority` | number | Yes | Sort priority (0-100, higher = first) |
| `handler` | CapabilityHandler | Yes | Async execution function |
| `aliases` | string[] | No | Alternative names for search |
| `examples` | string[] | No | Example voice commands |
| `schema` | object | No | JSON Schema for Gemini function calling |

## Complexity → CPB Path Mapping

| Complexity | CPB Path | Use Case |
|------------|----------|----------|
| `simple` | direct | Immediate UI actions |
| `navigation` | direct | Tab/sector navigation |
| `analysis` | ace | Data analysis, reasoning |
| `architecture` | hybrid | Complex multi-step tasks |
| `critical` | cascade | High-stakes decisions |

## SystemMind Epoch Integration

The registry automatically syncs with SystemMind's epoch system:

```typescript
// On capability registration
registerCapability(cap);
// → Calls systemMind.registerAction()
// → Increments epoch
// → VoiceManager receives notification

// On capability unregistration
unregisterCapability(id);
// → Calls systemMind.unregisterAction()
// → Increments epoch
```

Subscribe to epoch changes:

```typescript
const unsub = useSystemMind.getState().subscribeToEpoch((event) => {
  console.log(`Epoch ${event.epoch}: ${event.reason}`);
});
```

## Voice Integration

```typescript
import { processVoiceCommand, getVoiceCapabilityList } from '@/services/capabilities';

// Process voice command
const result = await processVoiceCommand(
  { intent: 'switch to dark theme', confidence: 0.9, rawTranscript: '...' },
  { sector: 'DASHBOARD' }
);

// Get capability list for system prompt
const list = getVoiceCapabilityList('DASHBOARD');
```

## Gemini Function Calling

```typescript
import { getGeminiFunctionDeclarations, executeGeminiFunctionCall } from '@/services/capabilities';

// Get declarations for Gemini
const declarations = getGeminiFunctionDeclarations({ sector: 'DASHBOARD' });

// Execute function call from Gemini
const result = await executeGeminiFunctionCall({
  name: 'ui_toggle_theme',
  args: { theme: 'MIDNIGHT' },
});
```

## Migration from UnifiedActionRegistry

```typescript
// OLD (deprecated)
import { executeAction, getAction } from './unifiedActionRegistry';
const action = getAction('my_action');
await executeAction('my_action', args);

// NEW
import { executeCapability, getCapability } from './capabilities';
const cap = getCapability('my_action');
await executeCapability('my_action', args);
```

## CPB Routing

The Capabilities Registry includes CPB (Cognitive Precision Bridge) routing for complex queries.

```typescript
import {
  routeQueryToCPB,
  executeQueryWithCPB,
  executeCapabilityWithCPB,
} from '@/services/capabilities';

// Route a query to optimal CPB path
const routing = routeQueryToCPB('analyze this architecture', context);
console.log(`Path: ${routing.path}, Confidence: ${routing.confidence}`);

// Execute with CPB routing and status callbacks
const result = await executeQueryWithCPB(query, context, (status) => {
  console.log(`Phase: ${status.phase}, Progress: ${status.progress}%`);
});

// Execute specific capability with CPB routing
const result = await executeCapabilityWithCPB('analyze_code', { code }, onStatus);
```

### CPB Paths

| Path | Use Case |
|------|----------|
| `direct` | Simple queries, navigation |
| `rlm` | Long context requiring compression |
| `ace` | Multi-agent consensus |
| `hybrid` | RLM + ACE combined |
| `cascade` | Full verification pipeline |

## Testing

```bash
# Run capability tests
npm run test:run -- services/capabilities/__tests__

# Run specific test file
npm run test:run -- services/capabilities/__tests__/integration.test.ts
```

## Files Changed in Migration

| File | Change |
|------|--------|
| `VoiceManager/index.tsx` | Use capabilities instead of unified registry |
| `DynamicToolRegistry.ts` | Import from capabilities |
| `CommandPalette.tsx` | Use executeCapability for theme |
| `unifiedActionRegistry.ts` | Deprecated, pending full removal |

## Troubleshooting

### Capability not found

1. Check if provider is loaded in `initializeCapabilities()`
2. Verify capability ID matches exactly (case-sensitive)
3. Check if capability is registered: `getCapability('my_id')`

### Epoch not updating

1. Verify SystemMind store is imported correctly
2. Check if `registerAction` is being called in registry.ts
3. Ensure subscriber is registered before capability changes

### Voice command not working

1. Check if capability has `schema` defined (required for Gemini)
2. Verify `examples` or `aliases` include the phrase
3. Check sector filtering matches current mode
