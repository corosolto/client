#!/usr/bin/env bash
# check-audios.sh — ouvir e julgar as vozes de personagem, UM PERSONAGEM POR VEZ.
#
# Retomavel de proposito: fecha quando quiser, roda de novo, continua de onde parou.
# Nao renomeia, nao move, nao apaga nada. So escreve teu veredito num CSV.
#
#   ./tools/check-audios.sh              julga a leva de 11/08 (32 personagens)
#   DESDE=2026-08-01 ./tools/check-audios.sh    outra janela de tempo
#   TODOS=1 ./tools/check-audios.sh      todos os personagens, sem filtro de data

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

BASE=${BASE:-public/audio/characters}
LOG=${LOG:-audio-check.csv}
PLAYER=${PLAYER:-afplay}
DESDE=${DESDE:-2026-08-11}
ATE=${ATE:-2026-08-12}

command -v "$PLAYER" >/dev/null 2>&1 || { echo "sem '$PLAYER' no PATH — defina PLAYER="; exit 1; }
[ -d "$BASE" ] || { echo "nao achei $BASE (rode de dentro do repo do jogo)"; exit 1; }
[ -f "$LOG" ] || echo "personagem,veredito,arquivos,quando" > "$LOG"

if [ "${TODOS:-0}" = "1" ]; then
  chars=$(ls "$BASE" 2>/dev/null | sort)
else
  chars=$(find "$BASE" -type f -name '*.mp3' -newermt "$DESDE 00:00" ! -newermt "$ATE 00:00" 2>/dev/null \
          | awk -F/ '{print $4}' | sort -u)
fi

[ -n "$chars" ] || { echo "nenhum personagem nessa janela."; exit 0; }

total=$(printf '%s\n' $chars | wc -l | tr -d ' ')
feitos=$(( $(wc -l < "$LOG") - 1 ))

echo
echo "  $total personagens na leva · $feitos ja julgados · faltam $((total-feitos))"
echo "  [enter]=ok   r=refazer   t=tocar de novo   s=pular   q=sair"
echo

n=0
for c in $chars; do
  n=$((n+1))
  grep -q "^$c," "$LOG" 2>/dev/null && continue

  mapfile -t files < <(find "$BASE/$c" -type f -name '*.mp3' 2>/dev/null | sort)
  [ ${#files[@]} -gt 0 ] || continue

  while :; do
    echo "  ── [$n/$total] $c — ${#files[@]} arquivos"
    for f in "${files[@]}"; do
      printf "     ▸ %s\n" "${f#$BASE/$c/}"
      "$PLAYER" "$f" 2>/dev/null
    done

    printf "     veredito? [enter=ok / r=refazer / t=tocar / s=pular / q=sair] "
    read -r ans || ans=q
    case "$ans" in
      t|T) echo; continue ;;
      r|R) v=refazer ;;
      s|S) echo "     (pulado — aparece de novo na proxima rodada)"; echo; break ;;
      q|Q) echo; echo "  parado em $c. rode de novo pra continuar daqui."; exit 0 ;;
      *)   v=ok ;;
    esac
    echo "$c,$v,${#files[@]},$(date +%Y-%m-%dT%H:%M:%S)" >> "$LOG"
    echo "     -> $v"; echo
    break
  done
done

echo
echo "  fim. veredito em $LOG"
echo "  refazer:  grep ',refazer,' $LOG | cut -d, -f1"
