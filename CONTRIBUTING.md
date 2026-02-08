# Contributing to OS-App

Thank you for your interest in contributing to **OS-App** — the Sovereign AI Operating System by Metaventions AI!

## Ways to Contribute

### 1. Report Bugs
Use the [Bug Report template](https://github.com/Dicoangelo/OS-App/issues/new?template=bug_report.yml) to report issues.

### 2. Suggest Features
Use the [Feature Request template](https://github.com/Dicoangelo/OS-App/issues/new?template=feature_request.yml) to propose new features.

### 3. Submit Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Ensure code quality (see below)
5. Commit (`git commit -m 'Add amazing feature'`)
6. Push (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/OS-App.git
cd OS-App

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add your API keys to .env

# Start development server
npm run dev
```

## Code Quality

### TypeScript/React Standards

- Use TypeScript strict mode
- Follow existing component patterns
- Use Tailwind CSS for styling
- Keep components focused and composable
- Add types for all props and state

### Before Submitting

```bash
# Type checking
npm run build

# Lint check
npm run lint

# Run tests
npm run test:run

# Test locally
npm run dev
```

## Architecture Guidelines

### Core Directories

- **Services** (`/services`) — API integrations, business logic
- **Components** (`/components`) — React components with clear responsibilities
- **Hooks** (`/hooks`) — Reusable stateful logic
- **Store** (`store.ts`) — Zustand global state

### Organisms Framework (`/services/organisms`)

The biologically-inspired agent system uses three coordinated layers:

- **Genome** (`organisms/genome/`) — Agent skills as portable, composable `SkillGenome` objects. New skills should implement the `SkillGenome` interface from `genome/types.ts`.
- **Swarm** (`organisms/swarm/`) — Team coordination via Adaptive MoE, stigmergic signals, and ACE consensus.
- **Cognitive** (`organisms/cognitive/`) — Memory consolidation with wake/sleep cycles, SimpleMem pipeline, and Goldilocks replay.

When adding new organism features:
- All layers extend `AbstractOrganismLayer` from `OrganismLayer.ts`
- Dispatch operations via the `dispatch(task)` pattern
- Add corresponding tests in `organisms/__tests__/`

### Capabilities Registry (`/services/capabilities`)

All executable actions (voice commands, navigation, UI toggles) are registered through the unified capabilities system. See `services/capabilities/README.md`.

### Security (`/services/security`)

The prompt isolation layer protects against extraction attacks. Any LLM-facing inputs should be sanitized through `promptIsolation.ts`.

### Testing

Tests use Vitest with React Testing Library and happy-dom. The organisms layer alone has 149 tests across 12 files. Run the full suite with:

```bash
npm run test:run                      # All tests
npx vitest run services/organisms/    # Organism tests only
```

## Metaventions Quality Standards

All contributions should align with the Metaventions philosophy:

- **Signal density** — Every addition should move the project forward
- **Compounding potential** — Features should enable future innovation
- **Sovereignty** — User data stays with the user
- **Premium experience** — Polish matters

## Questions?

Contact: dicoangelo@metaventionsai.com

---

*"Let the invention be hidden in your vision"*
**Metaventions AI** — Architected Intelligence
