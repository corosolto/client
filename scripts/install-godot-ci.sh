#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
VERSION="4.7.1"
CACHE_DIR="$REPO_ROOT/.godot-ci"
TEMPLATE_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/godot/export_templates/${VERSION}.stable"
BASE_URL="https://github.com/godotengine/godot-builds/releases/download/${VERSION}-stable"

mkdir -p "$CACHE_DIR" "$TEMPLATE_DIR"
if [ ! -x "$CACHE_DIR/godot" ]; then
  curl -fsSL "$BASE_URL/Godot_v${VERSION}-stable_linux.x86_64.zip" -o "$CACHE_DIR/godot.zip"
  unzip -joq "$CACHE_DIR/godot.zip" -d "$CACHE_DIR/bin"
  mv "$CACHE_DIR"/bin/Godot_v*-stable_linux.x86_64 "$CACHE_DIR/godot"
  chmod +x "$CACHE_DIR/godot"
fi

if [ ! -f "$TEMPLATE_DIR/web_release.zip" ]; then
  curl -fsSL "$BASE_URL/Godot_v${VERSION}-stable_export_templates.tpz" -o "$CACHE_DIR/templates.tpz"
  unzip -joq "$CACHE_DIR/templates.tpz" 'templates/web_release.zip' -d "$TEMPLATE_DIR"
fi
