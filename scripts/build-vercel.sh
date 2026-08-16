#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

# The audio package is optional. A failed private/release download must not
# prevent the procedural fallback build from being published.
if [ ! -f "$REPO_ROOT/audio/manifest.json" ]; then
  "$SCRIPT_DIR/fetch-audio.sh" || echo "Pacote de áudio indisponível; usando fallbacks."
fi

if ! "$SCRIPT_DIR/godot.sh" --version >/dev/null 2>&1; then
  "$SCRIPT_DIR/install-godot-ci.sh"
  export GODOT_BIN="$REPO_ROOT/.godot-ci/godot"
fi

exec "$SCRIPT_DIR/export-godot-web.sh"
