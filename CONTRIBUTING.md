# Contributing to OS-App

Thank you for your interest in contributing to **OS-App** — the Sovereign AI Operating System by Metaventions AI!

## Ways to Contribute

### 1. Report Bugs
Use the [Bug Report template](https://github.com/Blackamethyst-ai/OS-App/issues/new?template=bug_report.yml) to report issues.

### 2. Suggest Features
Use the [Feature Request template](https://github.com/Blackamethyst-ai/OS-App/issues/new?template=feature_request.yml) to propose new features.

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

# Test locally
npm run dev
```

## Architecture Guidelines

- **Services** (`/services`) — API integrations, business logic
- **Components** — React components with clear responsibilities
- **Hooks** (`/hooks`) — Reusable stateful logic
- **Store** (`store.ts`) — Zustand global state

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
