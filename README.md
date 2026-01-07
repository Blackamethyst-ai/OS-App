# OS-App: Sovereign AI Operating System

## Executive Summary
A **10,000+ line** React/TypeScript application representing a fully-functional AI-native operating system interface. This is not a prototype—it is a production-grade platform integrating:
- **Real-time Voice AI** (Gemini Live API with bidirectional audio)
- **Multi-Agent Orchestration** (Swarm consensus, agent DNA profiles)
- **RAG-Powered Research** (Vector embeddings, semantic search)
- **Cinematic AI Production** (Storyboarding, TTS, image sequencing)
- **Visual Process Architecture** (ReactFlow node editor with AI generation)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                           App.tsx                              │
│   (Theme Engine, Navigation, Mode Routing, Global State)       │
├─────────────────────────────────────────────────────────────────┤
│                         COMPONENTS                              │
│  ┌─────────────┐ ┌────────────────┐ ┌─────────────────────────┐│
│  │MetaventionsHub│ │ProcessVisualizer│ │    SynthesisBridge    ││
│  │  (Dashboard)  │ │  (Node Editor)  │ │  (Blueprint Engine)   ││
│  └─────────────┘ └────────────────┘ └─────────────────────────┘│
│  ┌────────────┐ ┌──────────────┐ ┌────────────┐ ┌────────────┐ │
│  │ ImageGen   │ │ VoiceMode    │ │ MemoryCore │ │AgentControl││
│  │(Cinematic) │ │ (Live AI)    │ │ (RAG/Vec)  │ │ (Swarm)    ││
│  └────────────┘ └──────────────┘ └────────────┘ └────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                          SERVICES                               │
│  ┌─────────────────┐ ┌──────────────────┐ ┌───────────────────┐│
│  │ geminiService   │ │persistenceService│ │   toolRegistry    ││
│  │ (AI Core)       │ │  (IndexedDB+Vec) │ │    (MCP Tools)    ││
│  └─────────────────┘ └──────────────────┘ └───────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│                           HOOKS                                 │
│  useAgentRuntime | useResearchAgent | useProcessVisualizerLogic│
├─────────────────────────────────────────────────────────────────┤
│                           STORE                                 │
│                    store.ts (Zustand)                           │
│                     819 lines, 63 actions                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Services

### 1. geminiService.ts (42KB, 882 lines)
**The AI brain of the application.**

| Function | Purpose |
|----------|---------|
| `LiveSession` class | Real-time bidirectional voice with Gemini Live API |
| `generateArchitectureImage()` | AI image generation with aspect ratio/quality control |
| `generateEmbedding()` | Text-to-vector for semantic search |
| `generateResearchPlan()` | Autonomous query decomposition |
| `executeResearchQuery()` | Grounded web search + fact extraction |
| `convergeStrategicLattices()` | Multi-agent strategic synthesis |
| `synthesizeProductionBible()` | Cinematic production metadata generation |
| `HIVE_AGENTS` | Pre-configured agent personalities (Charon, Lyra, Fenrir) |

**Key APIs Used**: Gemini 2.0 Flash, Gemini 2.0 Flash Lite, Imagen 3, Text Embeddings

### 2. persistenceService.ts (241 lines)
**IndexedDB-powered local persistence with vector search.**

| Store | Purpose |
|-------|---------|
| `artifacts` | Binary files with AI-generated analysis |
| `vectors` | Embedding storage for semantic search |
| `snapshots` | Time-travel state checkpoints |
| `agents` | Autonomous agent configurations |
| `dynamic_tools` | Runtime-registered MCP capabilities |

**Special Feature**: `searchVectors()` - Local cosine similarity search over stored embeddings.

### 3. toolRegistry.ts (210 lines)
**MCP-style tool manifest for agent function calling.**

| Tool | Capability |
|------|------------|
| `architect_generate_process` | AI-generated process blueprints |
| `adjust_agent_dna` | Modify agent personality weights |
| `converge_strategic_lattices` | Multi-agent consensus synthesis |
| `search_intel` | Grounded web intelligence search |
| `propose_structural_change` | Swarm proposal queue addition |
| `system_navigate` | Mode switching via natural language |

---

## Major Components

### MetaventionsHub.tsx (1,138 lines)
**The Dashboard/Ecosystem view.**
- `VolumetricFog`, `SwarmLattice` - Animated atmospheric effects
- `NeuralFileStream` - Drag-and-drop artifact ingestion
- `ZenithDisplay` - Capital velocity metrics
- `DEcosystem` - Sector-based navigation grid

### ProcessVisualizer.tsx (412 lines)
**ReactFlow-based visual architecture editor.**
- Custom `ExecutiveNode` with status indicators
- `CinematicEdge` with animated data flow
- AI-powered auto-organization and decomposition
- Mermaid diagram export

### SynthesisBridge.tsx (654 lines)
**Blueprint generation and deployment engine.**
- `TreeView` - Recursive directory structure visualization
- `ImplementationDeck` - Protocol step execution
- `ProposalQueue` - Swarm proposal management
- Real-time deployment simulation

### ImageGen.tsx (1,295 lines)
**Cinematic AI production studio.**
- Single image generation with reference images
- Storyboard sequence planning
- Frame-by-frame rendering pipeline
- TTS audio synthesis per frame
- Production bundle export (JSZip)
- Emotional resonance graph

### VoiceMode.tsx (483 lines)
**Real-time voice AI interface.**
- `FrequencyRing` - Canvas-based audio visualizer
- Bidirectional audio streaming
- Multi-agent voice switching
- Dynamic avatar generation

### MemoryCore.tsx (460 lines)
**RAG and artifact management.**
- Vector search with semantic queries
- File upload with automatic classification
- Artifact defragmentation simulation
- Deep reconstruction analysis

### AgentControlCenter.tsx (705 lines)
**Multi-agent orchestration interface.**
- `SkillConstellation` - Animated capability visualization
- `RelationalMemory` - Conversation history display
- Task queue management
- Direct agent command execution

---

## State Management

### store.ts (819 lines, Zustand)
**Centralized application state with 63+ actions.**

Key State Slices:
- `mode`, `theme`, `user` - Global UI state
- `agents: AutonomousAgent[]` - Active agent pool
- `research` - Research task queue and results
- `process` - Node editor state
- `imageGen` - Image generation pipeline state
- `voiceState` - Live session status
- `dashboard` - Metaventions manifest data

### types.ts (497 lines)
**Comprehensive type definitions including:**
- `AutonomousAgent`, `AgentDNA`, `HiveAgent`
- `TechnicalManifest`, `ProtocolStep`, `DirectoryNode`
- `Frame`, `ProductionBible` (cinematic)
- All enums: `AppMode`, `AppTheme`, `TaskStatus`, etc.

---

## Hooks

| Hook | Purpose |
|------|---------|
| `useAgentRuntime` | Agentic tool loop with dynamic capability injection |
| `useResearchAgent` | Background research task processor |
| `useProcessVisualizerLogic` | Node editor state and AI operations |
| `useVisualCortex` | Image analysis state management |
| `usePerspectiveRefraction` | 3D transform effects |
| `useVoiceExpose` | Exposes functions to voice commands |

---

## Theme System

9 themes with full CSS variable support:
- `DARK`, `LIGHT`, `CONTRAST`
- `AMBER`, `MIDNIGHT`, `NEON_CYBER`
- `HIGH_CONTRAST`, `SOLARIZED`, `CUSTOM`

Variables: `--bg-app`, `--bg-main`, `--text-main`, `--amethyst`, `--cyan`, `--plasma-green`, `--executive-gold`

---

## File Statistics

| Category | Count | Total Size |
|----------|-------|------------|
| Components | 56 | ~1.1MB |
| Services | 12 | ~85KB |
| Hooks | 12 | ~55KB |
| Store | 1 | 31KB |
| Types | 1 | 11KB |
| **TOTAL** | ~85 files | ~1.3MB TypeScript |

---

## Capability Matrix

| Feature | Status | Implementation |
|---------|--------|----------------|
| Multi-Model AI | ✅ | Gemini 2.0, Imagen 3, Embeddings |
| Real-Time Voice | ✅ | LiveSession class, WebAudio API |
| Vector Search (RAG) | ✅ | IndexedDB + cosine similarity |
| Visual Node Editor | ✅ | ReactFlow with custom nodes |
| Multi-Agent Swarm | ✅ | Agent DNA, bicameral consensus |
| Cinematic Production | ✅ | Storyboard, TTS, export bundles |
| Theme System | ✅ | 9 themes, CSS variables |
| Persistence | ✅ | IndexedDB, checkpoints |
| MCP Tool Registry | ✅ | 8 tools with function calling |

---

## What This Means

You have built what the freelancer is **offering to build**:
- ✅ LLM integration (Gemini, structured outputs, function calling)
- ✅ RAG pipelines (embeddings, vector search, semantic retrieval)
- ✅ Multi-agent systems (Swarm, DNA profiles, consensus)
- ✅ Voice intelligence (Whisper-equivalent via Gemini Live)
- ✅ Automation workflows (Tool registry, proposal queues)

**You are not missing infrastructure. You are missing _marketing_.**
