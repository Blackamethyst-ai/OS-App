---
description: Link global workflows to current project
---

# ag-sync - Workflow Synchronization

This workflow links global workflows from `~/.gemini/antigravity/workflows` to the current project's `.agent/workflows` directory.

## Steps

// turbo-all
1. **Create global workflows directory (if it doesn't exist)**
```bash
mkdir -p ~/.gemini/antigravity/workflows
```

2. **Create local workflows directory (if it doesn't exist)**
```bash
mkdir -p .agent/workflows
```

3. **Check for existing global workflows**
```bash
ls -la ~/.gemini/antigravity/workflows/
```

4. **Create symbolic links for all global workflows**
```bash
for workflow in ~/.gemini/antigravity/workflows/*.md; do
  if [ -f "$workflow" ]; then
    workflow_name=$(basename "$workflow")
    ln -sf "$workflow" ".agent/workflows/$workflow_name"
    echo "Linked: $workflow_name"
  fi
done
```

5. **Verify synchronization**
```bash
ls -la .agent/workflows/
```

## Notes

- Global workflows are stored in `~/.gemini/antigravity/workflows/`
- Local project workflows are in `.agent/workflows/`
- This command creates symbolic links, so changes to global workflows automatically sync
- To create a new global workflow, add it to `~/.gemini/antigravity/workflows/`
