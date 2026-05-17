#!/usr/bin/env bash
# Compress + upload face anchor images for the Cinema Studio substrate.
#
# Usage:
#   face-anchors                      # processes all images in ~/Downloads
#   face-anchors path/to/img.png ...  # processes specific files
#
# Output:
#   ~/.claude/memory/face_anchors/<name>.webp     (compressed lossless WebP)
#   ~/.claude/memory/face_anchors/manifest.json   (canonical fal URL list)

set -euo pipefail

# ----- locate fal API key ----------------------------------------------------
FAL_KEY="${VITE_FAL_API_KEY:-}"
if [ -z "$FAL_KEY" ]; then
  ENV_FILE="$HOME/projects/apps/OS-App/.env.local"
  if [ -f "$ENV_FILE" ]; then
    FAL_KEY="$(grep -E '^VITE_FAL_API_KEY=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
  fi
fi
if [ -z "$FAL_KEY" ]; then
  echo "ERROR: no VITE_FAL_API_KEY found." >&2
  echo "  Set it in $HOME/projects/apps/OS-App/.env.local or export VITE_FAL_API_KEY=..." >&2
  exit 1
fi

# ----- tools check -----------------------------------------------------------
for tool in cwebp sips jq curl; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "ERROR: $tool not installed (brew install $tool)" >&2
    exit 1
  fi
done

# ----- paths -----------------------------------------------------------------
OUT_DIR="$HOME/.claude/memory/face_anchors"
MANIFEST="$OUT_DIR/manifest.json"
TMP_DIR="$(mktemp -d)"
mkdir -p "$OUT_DIR"
trap "rm -rf $TMP_DIR" EXIT

# ----- collect input files ---------------------------------------------------
INPUTS=()
if [ "$#" -gt 0 ]; then
  INPUTS=("$@")
else
  while IFS= read -r f; do
    INPUTS+=("$f")
  done < <(find "$HOME/Downloads" -maxdepth 1 -type f \
    \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" \
       -o -iname "*.heic" -o -iname "*.webp" \) \
    -mtime -1 2>/dev/null)
fi

if [ "${#INPUTS[@]}" -eq 0 ]; then
  echo "No images found. Either airdrop to ~/Downloads (last 24h) or pass file paths." >&2
  exit 1
fi

echo "Processing ${#INPUTS[@]} image(s)..."

# ----- main loop -------------------------------------------------------------
ENTRIES=()

for src in "${INPUTS[@]}"; do
  if [ ! -f "$src" ]; then
    echo "  skip: $src (not a file)" >&2
    continue
  fi
  base="$(basename "$src")"
  name="${base%.*}"
  ext="${base##*.}"
  ext_lower="$(echo "$ext" | tr '[:upper:]' '[:lower:]')"

  echo ""
  echo "▶ $base"

  # 1. Decode HEIC → PNG if needed
  if [ "$ext_lower" = "heic" ]; then
    sips -s format png "$src" --out "$TMP_DIR/${name}.png" >/dev/null 2>&1
    decoded="$TMP_DIR/${name}.png"
  else
    decoded="$src"
  fi

  # 2. Resize to 4K max dimension (sips preserves aspect)
  sips --resampleHeightWidthMax 3840 "$decoded" --out "$TMP_DIR/${name}_4k.png" >/dev/null 2>&1 || cp "$decoded" "$TMP_DIR/${name}_4k.png"

  # 3. Read final dimensions
  W=$(sips -g pixelWidth "$TMP_DIR/${name}_4k.png" | awk '/pixelWidth/ {print $2}')
  H=$(sips -g pixelHeight "$TMP_DIR/${name}_4k.png" | awk '/pixelHeight/ {print $2}')

  # 4. Lossless WebP encode
  out_webp="$OUT_DIR/${name}.webp"
  cwebp -lossless -q 100 -m 6 -mt "$TMP_DIR/${name}_4k.png" -o "$out_webp" >/dev/null 2>&1

  # 5. Stats
  src_bytes=$(stat -f%z "$src")
  webp_bytes=$(stat -f%z "$out_webp")
  pct=$(awk -v s="$src_bytes" -v w="$webp_bytes" 'BEGIN { printf "%.1f", (1 - w/s) * 100 }')
  echo "  ${W}x${H}  $((src_bytes / 1024))K → $((webp_bytes / 1024))K  (-${pct}%)"

  # 6. Upload to fal.media — initiate signed URL
  init_resp=$(curl -sS -X POST "https://rest.alpha.fal.ai/storage/upload/initiate" \
    -H "Authorization: Key $FAL_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"file_name\":\"${name}.webp\",\"content_type\":\"image/webp\"}")

  upload_url=$(echo "$init_resp" | jq -r '.upload_url // empty')
  file_url=$(echo "$init_resp" | jq -r '.file_url // empty')

  if [ -z "$upload_url" ] || [ -z "$file_url" ]; then
    echo "  ! upload initiate failed: $init_resp" >&2
    continue
  fi

  # 7. PUT bytes
  http_code=$(curl -sS -o /dev/null -w "%{http_code}" -X PUT "$upload_url" \
    -H "Content-Type: image/webp" \
    --data-binary "@$out_webp")

  if [ "$http_code" -lt 200 ] || [ "$http_code" -ge 300 ]; then
    echo "  ! upload PUT failed: HTTP $http_code" >&2
    continue
  fi

  echo "  ✓ $file_url"

  # 8. Append manifest entry as JSON object
  entry=$(jq -n \
    --arg name "$name" \
    --arg source "$src" \
    --arg local "$out_webp" \
    --arg url "$file_url" \
    --arg width "$W" \
    --arg height "$H" \
    --arg uploaded "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{name:$name, source:$source, local_path:$local, fal_url:$url, width:($width|tonumber), height:($height|tonumber), uploaded_at:$uploaded}')
  ENTRIES+=("$entry")
done

# ----- write manifest --------------------------------------------------------
# Merge with existing manifest (de-dupe by name).
existing="[]"
if [ -f "$MANIFEST" ]; then
  existing=$(cat "$MANIFEST")
fi

new_array=$(printf '%s\n' "${ENTRIES[@]}" | jq -s '.')
merged=$(jq -n --argjson old "$existing" --argjson new "$new_array" \
  '($old + $new) | unique_by(.name) | sort_by(.uploaded_at) | reverse')
echo "$merged" > "$MANIFEST"

echo ""
echo "✓ Manifest: $MANIFEST"
echo "  $(echo "$merged" | jq 'length') anchor(s) total"
