# Security Guide

## API Key Rotation

The following keys were exposed in git history (commit 7808c46) and should be rotated:

### 1. Deepgram API Key

1. Go to https://console.deepgram.com
2. Navigate to API Keys
3. Create a new key with the same permissions
4. Delete the old key
5. Update `.env` with the new key:
   ```
   DEEPGRAM_API_KEY=your-new-key
   ```

### 2. Supabase Anon Key

1. Go to https://supabase.com/dashboard
2. Select your project (rqidgeittsjkpkykmdrz)
3. Go to Settings > API
4. Under "Project API keys", regenerate the anon key
5. Update `.env` with the new key:
   ```
   VITE_SUPABASE_ANON_KEY=your-new-key
   ```

**Note:** The Supabase URL does not need rotation as it's not a secret.

## Pre-commit Hook

A pre-commit hook is configured to detect secrets before commits:

- Location: `.husky/pre-commit`
- Script: `scripts/detect-secrets.sh`

The hook checks for:
- JWT tokens
- API keys (hex patterns)
- Direct `.env` file commits

To bypass (use sparingly): `git commit --no-verify`

## Git History Cleanup (Optional)

To remove secrets from git history entirely:

```bash
# Install git-filter-repo
brew install git-filter-repo

# Remove .env from history
git filter-repo --path .env --invert-paths

# Force push (coordinate with team)
git push origin --force --all
```

**Warning:** This rewrites history. Coordinate with collaborators first.

## Best Practices

1. Never commit `.env` files
2. Use `.env.example` for documentation
3. Store production secrets in a vault (1Password, AWS Secrets Manager)
4. Rotate keys regularly
5. Use environment-specific keys (dev/staging/prod)
