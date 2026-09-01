#!/usr/bin/env bash
# snapshot-lanes.sh — congela o trabalho nao commitado de cada lane.
#
# NAO toca no teu working tree, no index, no HEAD, nem em branch nenhum.
# Cria um commit paralelo (via index temporario) e o prende com uma tag.
# Rodar quantas vezes quiser. Nada e destrutivo.

set -uo pipefail

LANES=${LANES:-"$HOME/game $HOME/game2 $HOME/game3 $HOME/game4 $HOME/game-5"}
STAMP=$(date +%Y%m%d-%H%M%S)
TMPIDX=$(mktemp -u -t snapidx.XXXXXX)
REPORT=${REPORT:-"$HOME/game/_lanes-report.md"}

trap 'rm -f "$TMPIDX"' EXIT

{
echo "# Inventario das lanes — $STAMP"
echo
echo "| lane | versao | branch | nao commitado | snapshot | stashes | branches nao mergeadas |"
echo "|---|---|---|---|---|---|---|"
} > "$REPORT"

echo "snapshot $STAMP"
echo

for d in $LANES; do
  name=$(basename "$d")
  if [ ! -d "$d/.git" ]; then
    printf "  %-10s  sem repo git\n" "$name"
    echo "| $name | — | — | — | sem repo | — | — |" >> "$REPORT"
    continue
  fi

  # locks obsoletos (>60min) — causa classica de git travado
  find "$d/.git" -maxdepth 2 -name '*.lock' -mmin +60 -delete 2>/dev/null

  head=$(git -C "$d" rev-parse HEAD 2>/dev/null)
  if [ -z "$head" ]; then
    printf "  %-10s  repo sem commits\n" "$name"
    continue
  fi

  branch=$(git -C "$d" rev-parse --abbrev-ref HEAD 2>/dev/null)
  versao=$(node -p "require('$d/package.json').version" 2>/dev/null || echo "—")
  stashes=$(git -C "$d" stash list 2>/dev/null | wc -l | tr -d ' ')
  naomerg=$(git -C "$d" branch --no-merged main 2>/dev/null | wc -l | tr -d ' ')

  # captura o estado sujo num index temporario (inclui nao rastreados, respeita .gitignore)
  rm -f "$TMPIDX"
  if ! GIT_INDEX_FILE="$TMPIDX" git -C "$d" read-tree HEAD 2>/dev/null; then
    printf "  %-10s  falhou ao ler HEAD\n" "$name"; continue
  fi
  GIT_INDEX_FILE="$TMPIDX" git -C "$d" add -A 2>/dev/null
  tree=$(GIT_INDEX_FILE="$TMPIDX" git -C "$d" write-tree 2>/dev/null)
  headtree=$(git -C "$d" rev-parse "HEAD^{tree}" 2>/dev/null)

  if [ -z "$tree" ] || [ "$tree" = "$headtree" ]; then
    printf "  %-10s  limpo — nada a congelar\n" "$name"
    echo "| $name | \`$versao\` | $branch | 0 | limpo | $stashes | $naomerg |" >> "$REPORT"
    continue
  fi

  commit=$(git -C "$d" commit-tree "$tree" -p "$head" -m "snapshot($name): trabalho nao commitado em $STAMP" 2>/dev/null)
  tag="snapshot/$name-$STAMP"
  git -C "$d" tag "$tag" "$commit" 2>/dev/null
  n=$(git -C "$d" diff --name-only "$head" "$commit" 2>/dev/null | wc -l | tr -d ' ')

  printf "  %-10s  %4s arquivos congelados  ->  %s\n" "$name" "$n" "$tag"
  echo "| $name | \`$versao\` | $branch | $n | \`$tag\` | $stashes | $naomerg |" >> "$REPORT"
done

{
echo
echo "## Como recuperar"
echo '```bash'
echo "git -C ~/<lane> tag -l 'snapshot/*'          # listar"
echo "git -C ~/<lane> show --stat <tag>            # ver o que tem dentro"
echo "git -C ~/<lane> switch -c recuperado <tag>   # abrir num branch novo"
echo '```'
echo
echo "O working tree nao foi alterado. As tags apontam para commits paralelos;"
echo "enquanto a tag existir, o git nunca coleta esse trabalho."
} >> "$REPORT"

echo
echo "relatorio: $REPORT"
