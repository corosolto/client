#!/usr/bin/env bash
set -euo pipefail

task_file="${1:-}"
if [ -z "$task_file" ] || [ ! -f "$task_file" ]; then
  echo "uso: scripts/ci/run-fix-bot.sh <task-json>" >&2
  exit 2
fi

if [ -z "${FIX_BOT_COMMAND:-}" ]; then
  echo "FIX_BOT_COMMAND ausente; configure o comando do adapter no runner self-hosted." >&2
  exit 2
fi

export FIX_BOT_TASK_FILE="$task_file"
export FIX_BOT_REPO_ROOT="${GITHUB_WORKSPACE:-$(pwd)}"

echo "[fix-bot] task: $FIX_BOT_TASK_FILE"
echo "[fix-bot] repo: $FIX_BOT_REPO_ROOT"
echo "[fix-bot] command: ${FIX_BOT_COMMAND}"

exec /bin/bash -lc "$FIX_BOT_COMMAND"
