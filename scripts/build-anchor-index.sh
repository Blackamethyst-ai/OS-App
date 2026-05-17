#!/usr/bin/env bash
# Scan public/anchor-library and emit a JSON index for the Substrate UI.
# Run after symlinking or after running face-anchors.sh.

set -euo pipefail

cd "$(dirname "$0")/.."

LIB_DIR="public/anchor-library"
OUT="public/anchor-library-index.json"

if [ ! -d "$LIB_DIR" ] && [ ! -L "$LIB_DIR" ]; then
  echo "[]" > "$OUT"
  echo "Empty index written: $OUT"
  exit 0
fi

# Walk every category subdir, tag each entry with its category.
{
  echo "["
  first=true
  while IFS= read -r f; do
    name="$(basename "$f")"
    # Derive category from immediate parent folder under anchor-library/
    parent_path="$(dirname "$f")"
    category="$(basename "$parent_path")"
    if [ "$category" = "anchor-library" ]; then
      category="root"
    fi
    enc_name="$(printf '%s' "$name" | python3 -c "import sys,urllib.parse; print(urllib.parse.quote(sys.stdin.read().strip()))")"
    enc_cat="$(printf '%s' "$category" | python3 -c "import sys,urllib.parse; print(urllib.parse.quote(sys.stdin.read().strip()))")"
    mtime="$(stat -f %m "$f" 2>/dev/null || echo 0)"
    size="$(stat -f %z "$f" 2>/dev/null || echo 0)"
    if $first; then first=false; else echo ","; fi
    printf '  {"name":"%s","category":"%s","url":"/anchor-library/%s/%s","mtime":%s,"size":%s}' \
      "$name" "$category" "$enc_cat" "$enc_name" "$mtime" "$size"
  done < <(find -L "$LIB_DIR" -mindepth 1 -maxdepth 2 -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.webp" \) | sort)
  echo ""
  echo "]"
} > "$OUT"

count=$(grep -c '"url"' "$OUT" || true)
echo "✓ $OUT — $count entries"
