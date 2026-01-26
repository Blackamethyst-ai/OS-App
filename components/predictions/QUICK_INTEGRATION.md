# Quick Integration Guide

## 5-Minute Integration

### Step 1: Import the Component

```tsx
import { PredictionPanel } from '@/components/predictions';
```

### Step 2: Add to Your View

```tsx
<PredictionPanel
  intent="implement authentication system"
  track={true}
  onStartTask={() => console.log('Starting task')}
/>
```

That's it! The component is fully self-contained and will:
- ✅ Fetch predictions from the Meta-Learning API
- ✅ Display quality predictions, error warnings, and optimal timing
- ✅ Show recommended research from ResearchGravity
- ✅ Handle loading and error states
- ✅ Provide action buttons for task execution

---

## Integration Points in OS-App

### 1. Dashboard (Right Column)

**File:** `/Users/dicoangelo/OS-App/components/core/Dashboard.tsx`

**Location:** After line 399 (after Biometric Anchor section)

**Add:**
```tsx
{/* Session Prediction Oracle */}
<div className="crystalline rounded-3xl p-5 shadow-xl">
  <div className="flex items-center gap-3 mb-4">
    <span className="text-lg">🔮</span>
    <span className="text-[10px] font-black font-mono text-white uppercase tracking-widest">
      Session Oracle
    </span>
  </div>

  <input
    type="text"
    value={currentIntent}
    onChange={(e) => setCurrentIntent(e.target.value)}
    placeholder="What are you working on?"
    className="w-full px-3 py-2 mb-4 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-mono placeholder-gray-500 focus:border-[#f1c21b] focus:outline-none"
  />

  {currentIntent.length >= 3 && (
    <PredictionPanel
      intent={currentIntent}
      track={true}
      showErrors={true}
      showTiming={true}
      showResearch={true}
    />
  )}
</div>
```

**Required State:**
```tsx
const [currentIntent, setCurrentIntent] = useState('');
```

**Required Import:**
```tsx
import { PredictionPanel } from '../predictions';
```

---

### 2. Agent Control Center

**File:** `/Users/dicoangelo/OS-App/components/agents/AgentControlCenter/index.tsx`

**Purpose:** Show predictions before spawning agents

**Add before spawn button:**
```tsx
{taskIntent && (
  <PredictionPanel
    intent={taskIntent}
    track={false}
    showErrors={true}
    showTiming={true}
    showResearch={false}
    onStartTask={() => spawnAgent(taskIntent)}
    onScheduleLater={() => queueTask(taskIntent)}
  />
)}
```

---

### 3. Command Palette

**File:** `/Users/dicoangelo/OS-App/components/CommandPalette.tsx`

**Purpose:** Quick prediction lookup via keyboard command

**Add command:**
```tsx
{
  id: 'predict',
  title: 'Predict Session Outcome',
  icon: '🔮',
  category: 'meta-learning',
  handler: () => {
    // Open modal with prediction panel
  }
}
```

---

### 4. Biometric Panel

**File:** `/Users/dicoangelo/OS-App/components/biometric/BiometricPanel.tsx`

**Purpose:** Show cognitive-aligned predictions

**Add after biometric data:**
```tsx
{/* Cognitive Predictions */}
<div className="mt-4">
  <PredictionPanel
    intent={currentTask}
    track={true}
    showTiming={true}
    className="biometric-prediction"
  />
</div>
```

---

## Standalone Usage (Outside OS-App)

The Meta-Learning Engine works completely standalone:

### CLI Usage
```bash
# Get prediction via CLI
curl -X POST http://localhost:3847/api/v2/predict/session \
  -H "Content-Type: application/json" \
  -d '{"intent": "implement authentication"}'
```

### Python Usage
```python
# In ResearchGravity scripts
import requests

response = requests.post(
    'http://localhost:3847/api/v2/predict/session',
    json={'intent': 'implement authentication'}
)

prediction = response.json()
print(f"Quality: {prediction['predicted_quality']}/5")
print(f"Success Rate: {prediction['success_probability']:.0%}")
```

### TypeScript Usage (Agent Core SDK)
```typescript
import { AgentCoreClient } from '@antigravity/agent-core-sdk';

const client = new AgentCoreClient();
const prediction = await client.predictSession({
  intent: 'implement authentication',
  track_prediction: true
});

console.log(`Quality: ${prediction.predicted_quality}/5`);
console.log(`Success: ${prediction.success_probability * 100}%`);
```

---

## Component Variants

### 1. Full Panel (All Features)
```tsx
<PredictionPanel
  intent="your task"
  track={true}
  showErrors={true}
  showTiming={true}
  showResearch={true}
  onStartTask={() => {}}
  onScheduleLater={() => {}}
  onSelectResearch={() => {}}
/>
```

### 2. Compact Badge Only
```tsx
<PredictionBadge
  quality={4.2}
  successRate={0.78}
  confidence={0.85}
  compact={true}
/>
```

### 3. Errors Only
```tsx
<ErrorWarningPanel
  errors={errorPatterns}
  maxDisplay={3}
  onDismiss={(errorType) => console.log('Dismissed:', errorType)}
/>
```

### 4. Timing Only
```tsx
<OptimalTimeIndicator
  optimalHour={20}
  isOptimalNow={true}
  reasoning="Peak cognitive state detected"
/>
```

### 5. Research Chips Only
```tsx
<ResearchChips
  research={recommendedPapers}
  maxDisplay={3}
  onSelect={(result) => console.log('Selected:', result)}
/>
```

### 6. Advanced Signal Breakdown
```tsx
<SignalBreakdown
  signals={{
    outcome_score: 0.85,
    cognitive_alignment: 0.72,
    research_availability: 0.68,
    error_probability: 0.15
  }}
  showWeights={true}
/>
```

---

## Custom Hooks

### useSessionPrediction
```tsx
import { useSessionPrediction } from '@antigravity/agent-core-sdk';

const { prediction, isLoading, error } = useSessionPrediction({
  intent: 'implement feature X',
  cognitiveState: { mode: 'peak', hour: 20, energy_level: 0.8 },
  track: true,
  debounceMs: 500
});

if (isLoading) return <div>Loading prediction...</div>;
if (error) return <div>Error: {error.message}</div>;

return <div>Quality: {prediction.predicted_quality}/5</div>;
```

### usePredictionWithContext
```tsx
import { usePredictionWithContext } from '@antigravity/agent-core-sdk';

const { data, isLoading, error } = usePredictionWithContext({
  intent: 'implement feature X',
  track: true,
  includeErrors: true,
  includeOptimalTime: true,
  debounceMs: 500
});

const { prediction, errors, optimalTime } = data;
```

---

## Styling

Components use their own CSS file that's automatically imported:
```
/components/predictions/styles/predictions.css
```

The CSS integrates with OS-App's design system:
- Uses existing color variables
- Matches glass morphism aesthetics
- Responsive breakpoints
- Dark theme compatible

**No additional styling needed!**

---

## API Endpoints

The components automatically connect to:

```
http://localhost:3847/api/v2/predict/session       # Session predictions
http://localhost:3847/api/v2/predict/errors        # Error predictions
http://localhost:3847/api/v2/predict/optimal-time  # Timing predictions
http://localhost:3847/api/v2/predict/accuracy      # Calibration metrics
```

Make sure the ResearchGravity API server is running:
```bash
cd ~/researchgravity
uvicorn api.server:app --reload --port 3847
```

---

## Error Handling

Components handle errors gracefully:

```tsx
<PredictionPanel
  intent="your task"
  track={true}
/>
```

If the API is down, shows:
```
⚠️ Failed to load predictions: Connection refused
```

If the intent is too short (< 3 chars), shows nothing (graceful degradation).

---

## Performance

- **Debounced input:** 500ms default (configurable)
- **Loading states:** Spinner while fetching
- **Caching:** API responses cached per intent
- **Lazy loading:** Components only render when needed
- **Bundle size:** ~50KB (gzipped: ~12KB)

---

## Next Steps

1. ✅ Choose an integration point (Dashboard, Agent Control Center, etc.)
2. ✅ Add import statement
3. ✅ Add component with intent prop
4. ✅ Test with ResearchGravity API running
5. ✅ Customize styling if needed

**That's it!** The Meta-Learning Engine is now enhancing your workflow with predictive intelligence.

---

## Support

- **Full Documentation:** `/Users/dicoangelo/researchgravity/META_LEARNING_QUICK_START.md`
- **Architecture Details:** `/Users/dicoangelo/researchgravity/META_LEARNING_ARCHITECTURE.md`
- **Component API:** `/Users/dicoangelo/OS-App/components/predictions/PHASE_7_COMPLETE.md`
- **Integration Examples:** `/Users/dicoangelo/OS-App/components/predictions/INTEGRATION_EXAMPLE.tsx`
