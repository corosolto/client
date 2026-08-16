#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
OUTPUT_DIR="$REPO_ROOT/build/web"

mkdir -p "$OUTPUT_DIR"
"$SCRIPT_DIR/godot.sh" \
  --headless \
  --path "$REPO_ROOT/godot" \
  --export-release Web "$OUTPUT_DIR/index.html"

# Samples stay outside the PCK so hosting can omit or replace the optional pack.
mkdir -p "$OUTPUT_DIR/audio"
cp -R "$REPO_ROOT/audio/." "$OUTPUT_DIR/audio/"
cp "$REPO_ROOT/og-image.png" "$OUTPUT_DIR/og-image.png"
cp "$REPO_ROOT/robots.txt" "$OUTPUT_DIR/robots.txt"
cp "$REPO_ROOT/sitemap.xml" "$OUTPUT_DIR/sitemap.xml"
cp "$REPO_ROOT/llms.txt" "$OUTPUT_DIR/llms.txt"
