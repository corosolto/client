#!/bin/bash
# Captura arma a arma, proporção a proporção, com até 3 tentativas (outras sessões matam o Chromium headless).
# Uso: captura-robusta.sh <dir-saida> <arma,arma,...> [aspectos]   (SO_ADS=1 repassado)
OUT=$1; ARMAS=$2; ASP=${3:-3x2,16x9}
for w in ${ARMAS//,/ }; do for a in ${ASP//,/ }; do
  for t in 1 2 3; do
    node artifacts/review-integrado/tools/capture-l1.mjs --porta=4661 --armas=$w --aspectos=$a --out=$OUT > "$OUT/.log-$w-$a" 2>&1
    j=$(ls -t "$OUT"/capture-*$w.json 2>/dev/null | head -1)
    if tail -1 "$OUT/.log-$w-$a" | grep -q '"failures":0'; then
      [ -n "$j" ] && mv "$j" "$OUT/capture-$w-$a.json"; echo "OK $w $a (tentativa $t)"; break; fi
    echo "FALHA $w $a tentativa $t: $(grep -m1 FALHA "$OUT/.log-$w-$a" | cut -c1-120)"
  done
done; done
