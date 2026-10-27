#!/usr/bin/env bash
# Resize + compress source artwork into web-ready WebP assets.
# Run once after regenerating artwork in assets/img/_src/.
set -euo pipefail

cd "$(dirname "$0")/.."

OUT=assets/img
SRC=assets/img/_src

mkdir -p "$OUT"

# name:max_width
declare -A WIDTHS=(
  [cyborg-hero]=1100
  [neural-core]=1200
  [scene-hackathon]=1600
  [scene-robotics]=1600
  [speaker-1]=680
  [speaker-2]=680
  [speaker-3]=680
  [speaker-4]=680
)

for name in "${!WIDTHS[@]}"; do
  src="$SRC/$name.png"
  [ -f "$src" ] || { echo "skip $name (no source)"; continue; }
  convert "$src" \
    -resize "${WIDTHS[$name]}x>" \
    -strip \
    -quality 82 \
    -define webp:method=6 \
    "$OUT/$name.webp"
  echo "✓ $name -> $(du -h "$OUT/$name.webp" | cut -f1)"
done
