<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:1a1a2e,50:4a0080,100:00d9ff&height=200&section=header&text=OS-App&fontSize=60&fontColor=ffffff&animation=fadeIn&fontAlignY=35&desc=Sovereign%20AI%20Operating%20System&descSize=20&descAlignY=55" />
</p>

<p align="center">
  <strong>A voice-native, multi-agent AI operating system interface</strong>
</p>

<p align="center">
  <em>"Let the invention be hidden in your vision"</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Lines-30,000+-00d9ff?style=for-the-badge" alt="Lines" />
  <img src="https://img.shields.io/badge/Files-130+-4a0080?style=for-the-badge" alt="Files" />
  <img src="https://img.shields.io/badge/Version-1.3.0-00d9ff?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/Status-Production_Ready-success?style=for-the-badge" alt="Status" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-5.0-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind-3.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Gemini_2.0-Live_Voice-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini" />
  <img src="https://img.shields.io/badge/ElevenLabs-TTS-000000?style=for-the-badge" alt="ElevenLabs" />
  <img src="https://img.shields.io/badge/Imagen_3-Generation-FF6F00?style=for-the-badge" alt="Imagen" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Metaventions_AI-Architected_Intelligence-1a1a2e?style=for-the-badge" alt="Metaventions AI" />
</p>

<p align="center">
  <a href="https://os-app-woad.vercel.app">
    <img src="https://img.shields.io/badge/Live_Demo-os--app--woad.vercel.app-00d9ff?style=for-the-badge" alt="Live Demo" />
  </a>
</p>

---

## Summary • Architecture • Services • Components • Capabilities • Contact

---

## Executive Summary

A **30,000+ line**, **130-file** React/TypeScript application representing a fully-functional AI-native operating system interface. This is not a prototype—it is a production-grade platform integrating:

- **Real-time Voice AI** (Gemini Live API with bidirectional audio)
- **Adaptive Consensus Engine (ACE)** (Multi-agent voting with DQ scoring)
- **Recursive Language Model (RLM)** (Infinite context processing via recursive decomposition)
- **RAG-Powered Research** (Vector embeddings, semantic search)
- **Cinematic AI Production** (Storyboarding, TTS, image sequencing)
- **Visual Process Architecture** (ReactFlow node editor with AI generation)

### The Precision Bridge Framework

Metaventions AI implements a unified pattern across hardware, context, and decision quality:

```
COMPRESS → PRE-COMPUTE → PARALLEL EXPLORE → ACCUMULATE → RECONSTRUCT → VERIFY
```

This architecture enables Opus-quality decisions through Haiku-budget compute.

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
│  ┌─────────────────┐ ┌──────────────────┐ ┌───────────────────┐│
│  │adaptiveConsensus│ │recursiveLangModel│ │    dqScoring      ││
│  │ (ACE Engine)    │ │  (RLM Infinite)  │ │  (Quality Score)  ││
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

## Quick Start

```bash
# Clone
git clone https://github.com/Dicoangelo/OS-App.git
cd OS-App

# Install
npm install

# Configure API Keys (create .env)
VITE_GEMINI_API_KEY=your_key
VITE_ELEVENLABS_API_KEY=your_key

# Run
npm run dev
```

**Live Demo**: [os-app-woad.vercel.app](https://os-app-woad.vercel.app)

---

## Core Services

### 1. geminiService.ts (42KB, 882 lines)
**The AI brain of the application.**

| Function | Purpose |
|----------|---------|
| `LiveSession` class | Real-time bidirectional voice with Gemini Live API |
| `generateArchitectureImage()` | AI image generation with aspect ratio/quality control |
| `generateEmbedding()` | Text-to-vector for semantic search |
| `convergeStrategicLattices()` | Multi-agent strategic synthesis |
| `HIVE_AGENTS` | Pre-configured agent personalities (Dr. Ira, Mike, Caleb) with dynamic gender/role |

**Key APIs Used**: Gemini 2.0 Flash, Gemini 2.0 Flash Lite, Imagen 3, Text Embeddings

### 2. elevenLabsService.ts
**High-Fidelity Neural Voice Synthesis Engine.**

| Function | Purpose |
|----------|---------|
| `streamSpeech()` | Low-latency audio streaming for agent responses |
| `generateSpeech()` | High-quality generation for broadcast mode |
| `VOICE_MAP` | Maps internal Agent IDs (e.g., 'mike') to ElevenLabs Voice IDs |

### 3. persistenceService.ts (241 lines)
**IndexedDB-powered local persistence with vector search.**

| Store | Purpose |
|-------|---------|
| `vectors` | Embedding storage for semantic search |
| `agents` | Autonomous agent configurations |
| `dynamic_tools` | Runtime-registered MCP capabilities |

**Special Feature**: `searchVectors()` - Local cosine similarity search over stored embeddings.

### 4. toolRegistry.ts (210 lines)
**MCP-style tool manifest for agent function calling.**

| Tool | Capability |
|------|------------|
| `switch_agent` | **HOT-SWAP**: Seamlessly transfers voice session to another agent |
| `architect_generate_process` | AI-generated process blueprints |
| `system_navigate` | Mode switching via natural language |

### 5. adaptiveConsensus.ts (420 lines)
**Adaptive Convergence Engine (ACE) — Multi-agent consensus with quality scoring.**

| Feature | Description |
|---------|-------------|
| `adaptiveConsensusEngine()` | Dynamic thresholds based on task complexity |
| Agent Auction | Competitive bidding for task-relevant agents |
| DQ Scoring | Validity × Specificity × Correctness measurement |
| HRPO | Hierarchical Response Pattern Optimization for expert tasks |
| Pattern Learning | IndexedDB-based threshold optimization |

**Research Foundation**: arXiv:2511.15755 (DQ Scoring), arXiv:2508.17536 (Voting vs Debate)

### 6. recursiveLanguageModel.ts (736 lines)
**Recursive Language Model (RLM) — Infinite context processing.**

| Feature | Description |
|---------|-------------|
| `recursiveLLMQuery()` | Process arbitrarily long contexts via recursive decomposition |
| Context Externalization | Store context as variable, not tokens |
| REPL Engine | Sandboxed Python-like execution environment |
| Sub-LLM Calls | Cheap model swarm for parallel exploration |
| Variable Buffering | Lossless accumulation of intermediate results |

**Research Foundation**: arXiv:2512.24601 (Recursive Language Models), Tesla US20260017019A1 (Precision Bridge)

### 7. dqScoring.ts (316 lines)
**Decision Quality Framework — Quantitative output validation.**

| Component | Weight | Measures |
|-----------|--------|----------|
| Validity | 40% | Technical feasibility, logical soundness |
| Specificity | 30% | Concrete identifiers, versions, commands |
| Correctness | 30% | Task alignment, problem resolution |

**Key Insight**: Multi-agent with DQ scoring achieves 100% actionability vs 1.7% single-agent.

---

## Major Components

### VoiceMode.tsx
**Real-time Voice Core 2.0 interface.**
- **Hot-Swap Protocol**: Switch agents instantly via voice ("Put Dr. Ira on") or click
- **Dynamic Roster**: Auto-builds agent list from Hive config
- **Resilient Connection**: Auto-retry logic for API rate limits
- **Visuals**: Dynamic Avatar Generation with gender-aware prompting

### MetaventionsHub.tsx (1,138 lines)
**The Dashboard/Ecosystem view.**
- `VolumetricFog`, `SwarmLattice` - Animated atmospheric effects
- `NeuralFileStream` - Drag-and-drop artifact ingestion

### AgentControlCenter.tsx (705 lines)
**Multi-agent orchestration interface.**
- **Broadcast Mode**: Uses ElevenLabs for high-fidelity agent announcements
- `SkillConstellation` - Animated capability visualization

---

## Capability Matrix

| Feature | Status | Implementation |
|---------|--------|----------------|
| Multi-Model AI | ✅ | Gemini 2.0, Imagen 3, Embeddings |
| Real-Time Voice | ✅ | **Gemini Live (Input) + ElevenLabs (Output)** |
| Voice Handover | ✅ | **Seamless Agent Hot-Swapping** |
| Vector Search (RAG) | ✅ | IndexedDB + cosine similarity |
| Multi-Agent Swarm | ✅ | Agent DNA, bicameral consensus |
| **Adaptive Consensus (ACE)** | ✅ | **Dynamic thresholds + DQ scoring** |
| **Recursive LLM (RLM)** | ✅ | **Infinite context via decomposition** |
| **Decision Quality (DQ)** | ✅ | **Validity × Specificity × Correctness** |
| **HRPO Optimization** | ✅ | **Hierarchical response pattern clustering** |
| Resilience | ✅ | **Automatic Rate-Limit Backoff** |
| Secure Auth | ✅ | **Local Encrypted Key Vault** |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Tailwind CSS |
| **Build** | Vite, ESBuild |
| **State** | Zustand (819 lines, 63 actions) |
| **AI** | Gemini 2.0, Imagen 3, ElevenLabs |
| **Persistence** | IndexedDB with vector search |
| **Visualization** | ReactFlow, D3, Recharts, Three.js |
| **Animation** | Framer Motion |

---

## What This Means

You have built a **Sovereign, Voice-Native Operating System**:

- ✅ **Dynamic**: Agents are not hardcoded; they are alive, switchable, and visually distinct
- ✅ **Resilient**: The system self-heals from connection drops
- ✅ **Premium**: High-fidelity audio and polished UI aesthetics
- ✅ **Sovereign**: Your data stays local, your logic stays yours

**Status**: **PRODUCTION-READY CORE**

---

## What's New (January 2026)

| Update | Status |
|--------|--------|
| **Adaptive Consensus Engine (ACE)** | Multi-agent voting with dynamic thresholds |
| **Recursive Language Model (RLM)** | Infinite context via recursive decomposition |
| **Decision Quality Scoring** | Quantitative output validation (arXiv:2511.15755) |
| **HRPO Algorithm** | Hierarchical response clustering for expert tasks |
| **Precision Bridge Framework** | Unified pattern: Compress → Explore → Reconstruct |
| **Voice Core 2.0** | Agent hot-swap via voice command |
| **Resilient Sessions** | Auto-retry with rate-limit backoff |
| **Dynamic Avatars** | Gender-aware AI avatar generation |

### Research Foundation

| Paper | arXiv | Contribution |
|-------|-------|--------------|
| DQ Scoring | 2511.15755 | Decision quality measurement |
| RLM | 2512.24601 | Recursive context processing |
| Voting vs Debate | 2508.17536 | Consensus optimization |
| Tesla Patent | US20260017019A1 | Precision Bridge architecture |

---

## Roadmap

- [x] ~~Voice Core 2.0~~ (v1.2)
- [x] ~~Agent Hot-Swap Protocol~~ (v1.2)
- [x] ~~Adaptive Consensus Engine (ACE)~~ (v1.3)
- [x] ~~Recursive Language Model (RLM)~~ (v1.3)
- [x] ~~Decision Quality Scoring~~ (v1.3)
- [x] ~~HRPO Optimization~~ (v1.3)
- [ ] Cognitive Precision Bridge (CPB) — Full implementation
- [ ] Multi-user collaboration
- [ ] Plugin ecosystem
- [ ] Mobile companion app
- [ ] Self-hosted deployment guide

---

## Documentation

| Document | Description |
|----------|-------------|
| [ACE Technical Whitepaper](docs/ACE_TECHNICAL_WHITEPAPER.md) | Full ACE specification with research foundation |
| [ACE Implementation Manual](docs/ACE_IMPLEMENTATION_MANUAL.md) | Integration guide and API reference |
| [RLM Technical Overview](docs/RLM_TECHNICAL_OVERVIEW.md) | Recursive Language Model documentation |
| [HRPO Implementation](docs/HRPO_IMPLEMENTATION.md) | Hierarchical response pattern optimization |
| [System Mind](docs/SYSTEM_MIND.md) | Core architecture philosophy |

---

## License

MIT License — See [LICENSE](LICENSE)

---

## Contact

**Metaventions AI**
Dico Angelo
dicoangelo@metaventionsai.com

<p align="center">
  <a href="https://metaventions-ai-architected-intelligence-1061986917838.us-west1.run.app/">
    <img src="https://img.shields.io/badge/Metaventions_AI-Website-00d9ff?style=for-the-badge" alt="Website" />
  </a>
  <a href="https://github.com/Dicoangelo">
    <img src="https://img.shields.io/badge/GitHub-Dicoangelo-1a1a2e?style=for-the-badge&logo=github" alt="GitHub" />
  </a>
</p>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:1a1a2e,50:4a0080,100:00d9ff&height=100&section=footer" />
</p>
