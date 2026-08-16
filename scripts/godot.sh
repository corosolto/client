#!/bin/sh

set -eu

if [ -n "${GODOT_BIN:-}" ]; then
  exec "$GODOT_BIN" "$@"
fi

if command -v godot >/dev/null 2>&1; then
  exec godot "$@"
fi

MACOS_GODOT="/Applications/Godot.app/Contents/MacOS/Godot"
if [ -x "$MACOS_GODOT" ]; then
  exec "$MACOS_GODOT" "$@"
fi

echo "Godot 4.7.1 não encontrado. Defina GODOT_BIN ou instale /Applications/Godot.app." >&2
exit 127

