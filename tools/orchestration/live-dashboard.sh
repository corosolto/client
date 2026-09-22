#!/bin/bash
# Gera ORCHESTRATION-LIVE.md — visibilidade em tempo real das lanes CORO SOLTO.
# Uso: tools/orchestration/live-dashboard.sh [worktrees-root] [saida]
# Rodado em loop pelo orquestrador; seguro rodar à mão a qualquer momento.

set -u
ROOT="${1:-/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees}"
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="${2:-$HERE/../../ORCHESTRATION-LIVE.md}"
NOW="$(date '+%Y-%m-%d %H:%M:%S')"

# estado dos PRs — uma chamada `gh pr view` por número único (cacheado por execução)
declare -A PR_CACHE
pr_state() {
  local n="$1" out=""
  [ -z "$n" ] && { echo "—"; return; }
  for w in ${n//;/ }; do
    if [ -z "${PR_CACHE[$w]:-}" ]; then
      j="$(gh pr view "$w" --json state,isDraft,mergeable 2>/dev/null || true)"
      if [ -n "$j" ]; then
        s="$(echo "$j" | /usr/bin/python3 -c 'import json,sys;p=json.load(sys.stdin);print(p["state"][:4])' 2>/dev/null)"
        m="$(echo "$j" | /usr/bin/python3 -c 'import json,sys;p=json.load(sys.stdin);print({"MERGEABLE":"ok","CONFLICTING":"conflito","UNKNOWN":"?"}.get(p["mergeable"],"?"))' 2>/dev/null)"
        d="$(echo "$j" | /usr/bin/python3 -c 'import json,sys;p=json.load(sys.stdin);print(" rascunho" if p["isDraft"] else "")' 2>/dev/null)"
        PR_CACHE[$w]="${s:-?}/${m:-?}${d:-}"
      else
        PR_CACHE[$w]="não existe"
      fi
    fi
    out="${out}#${w}=${PR_CACHE[$w]} "
  done
  echo "${out% }"
}

wt_state() { # worktree-dir -> "branch|HEAD|sujo|ahead/behind"
  local d="$1"
  [ ! -d "$d/.git" ] && [ ! -f "$d/.git" ] && echo "|—|—|—|sem worktree" && return
  local branch head dirty ab
  branch="$(git -C "$d" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
  head="$(git -C "$d" rev-parse --short HEAD 2>/dev/null || echo '?')"
  dirty="$(git -C "$d" status --porcelain 2>/dev/null | awk '{if($1=="??")u++; else m++} END{printf "%dM/%dU", m+0, u+0}')"
  ab="$(git -C "$d" status -sb 2>/dev/null | head -1 | grep -oE '\[.*\]' | tr -d '[]' || echo '')"
  [ -z "$ab" ] && ab="sync"
  echo "$branch|$head|$dirty|$ab"
}

wt_activity() { # minutos desde o arquivo não-git mais recente (ordena por mtime)
  local d="$1"
  [ -d "$d" ] || { echo "—"; return; }
  local best ts now
  best="$(find "$d" -type f \( -not -path "*/.git/*" -a -not -path "*/node_modules/*" -a -not -path "*/dist/*" -a -not -name ".DS_Store" \) -newermt "$(date -v-24H '+%Y-%m-%d %H:%M:%S')" -print0 2>/dev/null | xargs -0 stat -f '%m %N' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f1)"
  now="$(date '+%s')"
  if [ -n "$best" ]; then
    echo "$(( (now - best) / 60 ))min"
  else
    echo ">24h"
  fi
}

ledger_state() { # worktree ledger-relpath -> "idade | último título"
  local d="$1" rel="$2"
  local f="$d/$rel"
  if [ -f "$f" ]; then
    local ts now age
    ts="$(stat -f '%m' "$f")"; now="$(date '+%s')"; age=$(( (now - ts) / 60 ))
    local last
    last="$(grep -E '^#{1,3} ' "$f" | tail -1 | sed 's/^#* *//' | cut -c1-60)"
    echo "${age}min · ${last:-—}"
  else
    echo "sem ledger"
  fi
}

{
  echo "# ORQUESTRAÇÃO AO VIVO — CORO SOLTO"
  echo
  echo "> Atualizado: **$NOW** · refresh automático a cada 2 min · dono: GLM 5.3 (ZCode) orquestrador"
  echo "> Cores de estado: \`ok\` mergeável · \`conflito\` precisa de rebase · \`rascunho\` draft"
  echo "> \`M/U\` = arquivos modificados/não-rastreados · \`idade\` = minutos desde a última atividade de arquivo"
  echo
  echo "| Lane | Dono | Worktree | Branch@HEAD | Diff | PR | Ativ. | Ledger (último registro) |"
  echo "|---|---|---|---|---|---|---|---|"
  while IFS='|' read -r lane prompt owner wt pr ledger; do
    case "$lane" in \#*|"") continue;; esac
    if [ "$wt" = "somente-leitura" ] || [ ! -d "$ROOT/$wt" ]; then
      wtshow="— (só leitura)"
      bhp="—|—|—|$(pr_state "$pr")"; act="n/a"
      if [ -f "$HERE/../../$ledger" ]; then
        ts="$(stat -f '%m' "$HERE/../../$ledger")"; now="$(date '+%s')"
        led="$(( (now - ts) / 60 ))min · (relatório no pacote)"
      else led="pendente"
      fi
    else
      d="$ROOT/$wt"
      wtshow="$wt"
      IFS='|' read -r br hd dr ab <<< "$(wt_state "$d")"
      bhp="${br}@${hd}|${dr} ${ab}|$(pr_state "$pr")"
      act="$(wt_activity "$d")"
      led="$(ledger_state "$d" "$ledger")"
    fi
    echo "| [$lane]($prompt) | $owner | $wtshow | $bhp | $act | $led |"
  done < "$HERE/lanes.csv"
  echo
  echo "## Sessões vivas detectadas"
  echo
  echo '```'
  echo "Claude Code: $(ps aux | grep -c '[.]claude/local/node_modules/.bin/claude') processos"
  echo "ZCode/GLM:   $(ps aux | grep -c '[z]code-cli') processos"
  echo '```'
  echo
  echo "## Fila de execução (ordem dos viewmodels)"
  echo
  echo "1. **01 M4 (GLM, em andamento)** → checkpoint destrava **02 Precisão**"
  echo "2. 03 AWP → 04 Shotgun → 05 Curtas → 06 Rifles → 07 SMGs → 08 DMR → 09 LMG → 10 Controles"
  echo "3. **11 Integração** só após checkpoints de 01–10 (relação explícita com #464/#468/#509/#513/#534)"
  echo
} > "$OUT"

echo "dashboard escrito: $OUT ($(date '+%H:%M:%S'))"
