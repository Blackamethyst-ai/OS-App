#!/bin/bash
# Secret detection pre-commit hook
# Prevents accidental commit of API keys and secrets

set -e

# Patterns to detect
PATTERNS=(
    # JWT tokens
    'eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*'
    # Generic API keys (32+ hex chars)
    '[a-f0-9]{32,}'
    # Supabase keys
    'sb_[a-zA-Z0-9_-]{20,}'
    # Deepgram keys
    '[a-f0-9]{40}'
    # AWS keys
    'AKIA[0-9A-Z]{16}'
    # Generic secret patterns
    '(api[_-]?key|apikey|secret|password|token)["\s]*[:=]["\s]*["\047][^"\047]{8,}'
)

# Files to check (staged files)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx|json|env|yaml|yml)$' || true)

if [ -z "$STAGED_FILES" ]; then
    exit 0
fi

FOUND_SECRETS=0

for file in $STAGED_FILES; do
    # Skip .env.example
    if [[ "$file" == *".env.example"* ]]; then
        continue
    fi

    # Skip node_modules
    if [[ "$file" == *"node_modules"* ]]; then
        continue
    fi

    # Check for JWT tokens specifically
    if grep -qE 'eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.' "$file" 2>/dev/null; then
        echo "ERROR: Possible JWT token found in $file"
        FOUND_SECRETS=1
    fi

    # Check for hardcoded Deepgram-style keys (40 hex chars)
    if grep -qE '[a-f0-9]{40}' "$file" 2>/dev/null; then
        # Exclude git commit hashes and known safe patterns
        if ! grep -qE '(commit|sha|hash|checksum).*[a-f0-9]{40}' "$file" 2>/dev/null; then
            echo "WARNING: Possible API key found in $file (40 hex chars)"
            FOUND_SECRETS=1
        fi
    fi

    # Check for .env being committed directly
    if [[ "$file" == ".env" ]]; then
        echo "ERROR: .env file should not be committed!"
        FOUND_SECRETS=1
    fi
done

if [ $FOUND_SECRETS -eq 1 ]; then
    echo ""
    echo "Secret detection failed. Please remove secrets before committing."
    echo "If this is a false positive, you can bypass with: git commit --no-verify"
    exit 1
fi

exit 0
